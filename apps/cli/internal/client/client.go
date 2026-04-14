// Package client is a thin HTTP wrapper around the atlas API.
//
// Responsibilities:
//   - Build URLs against a base (e.g. http://host:4000 + /api/v1/tasks).
//   - Attach Authorization: Bearer <token> when a token is configured.
//   - Respect a context deadline per request.
//   - Unwrap the API's {data, error, meta} envelope.
//   - Map HTTP status / network errors to the typed CLI error hierarchy.
//   - Optionally log one verbose line per request to stderr (never the token).
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	clierr "github.com/MiguelAguiarDEV/atlas/apps/cli/internal/errors"
)

// APIBase is the API version prefix (joined to the base URL).
const APIBase = "/api/v1"

// Envelope mirrors apps/api/internal/handler.Response.
type Envelope struct {
	Data  json.RawMessage `json:"data"`
	Error *string         `json:"error"`
	Meta  *Meta           `json:"meta,omitempty"`
}

// Meta holds pagination metadata.
type Meta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// Client is a thin HTTP wrapper around the atlas API.
type Client struct {
	base    string
	token   string
	http    *http.Client
	verbose bool
	out     io.Writer // verbose log sink (default: os.Stderr)
}

// Options configures Client.
type Options struct {
	Base    string        // required, e.g. "http://100.71.66.54:4000"
	Token   string        // optional
	Timeout time.Duration // default 10s
	Verbose bool
	Out     io.Writer // default os.Stderr
}

// New builds a Client from Options.
func New(opts Options) *Client {
	if opts.Timeout == 0 {
		opts.Timeout = 10 * time.Second
	}
	out := opts.Out
	if out == nil {
		out = os.Stderr
	}
	return &Client{
		base:    strings.TrimRight(opts.Base, "/"),
		token:   opts.Token,
		http:    &http.Client{Timeout: opts.Timeout},
		verbose: opts.Verbose,
		out:     out,
	}
}

// BuildURL joins the base, API prefix, and path, and appends query params.
// path is expected with or without a leading slash and without the /api/v1 prefix.
func (c *Client) BuildURL(path string, query url.Values) string {
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	u := c.base + APIBase + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	return u
}

// Do issues the request, parses the envelope, and returns raw data + meta.
// body may be nil or any JSON-encodable value.
func (c *Client) Do(ctx context.Context, method, urlStr string, body any) (json.RawMessage, *Meta, error) {
	var reqBody io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return nil, nil, &clierr.UserErr{Msg: "failed to marshal request body: " + err.Error()}
		}
		reqBody = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, reqBody)
	if err != nil {
		return nil, nil, &clierr.UserErr{Msg: "failed to build request: " + err.Error()}
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	start := time.Now()
	resp, err := c.http.Do(req)
	dur := time.Since(start)

	if err != nil {
		// Network-level failure (dial, timeout, refused, DNS).
		if c.verbose {
			fmt.Fprintf(c.out, "[atlas] %s %s -> network error (%v)\n", method, urlStr, dur.Round(time.Millisecond))
		}
		return nil, nil, classifyNetErr(err)
	}
	defer resp.Body.Close()

	if c.verbose {
		fmt.Fprintf(c.out, "[atlas] %s %s -> %d (%v)\n", method, urlStr, resp.StatusCode, dur.Round(time.Millisecond))
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, &clierr.NetErr{Err: err}
	}

	// Happy path: try to decode the envelope.
	var env Envelope
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &env); err != nil {
			// Server returned non-JSON. Map by status.
			return nil, nil, mapStatus(resp.StatusCode, strings.TrimSpace(string(raw)))
		}
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return env.Data, env.Meta, nil
	}

	msg := ""
	if env.Error != nil {
		msg = *env.Error
	}
	if msg == "" {
		msg = http.StatusText(resp.StatusCode)
	}
	return nil, env.Meta, mapStatus(resp.StatusCode, msg)
}

// mapStatus converts an HTTP status + message to a typed CLI error.
func mapStatus(status int, msg string) error {
	switch {
	case status >= 500:
		return &clierr.ServerErr{Msg: msg, Status: status}
	case status >= 400:
		return &clierr.UserErr{Msg: msg, Status: status}
	default:
		return &clierr.UserErr{Msg: fmt.Sprintf("unexpected status %d: %s", status, msg), Status: status}
	}
}

// classifyNetErr maps a stdlib http.Do error into NetErr/UserErr.
func classifyNetErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return &clierr.NetErr{Err: fmt.Errorf("timeout: %w", err)}
	}
	if errors.Is(err, context.Canceled) {
		return &clierr.NetErr{Err: err}
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return &clierr.NetErr{Err: err}
	}
	// url.Error wrapping a connect/dns failure still counts as net error.
	var ue *url.Error
	if errors.As(err, &ue) {
		return &clierr.NetErr{Err: err}
	}
	return &clierr.NetErr{Err: err}
}

// Unmarshal is a convenience wrapper: decode raw JSON into v.
func Unmarshal(raw json.RawMessage, v any) error {
	if len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, v); err != nil {
		return &clierr.UserErr{Msg: "failed to decode response: " + err.Error()}
	}
	return nil
}
