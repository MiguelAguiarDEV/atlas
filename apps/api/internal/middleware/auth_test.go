package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testToken = "s3cret-token-abcdef0123456789"

func newTestServer(token string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/tasks", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`ok`))
	})
	mux.HandleFunc("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"service":"atlas","status":"ok"}`))
	})
	return BearerAuth(token)(mux)
}

func doRequest(t *testing.T, h http.Handler, method, path, authHeader string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func TestBearerAuth_ValidToken(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/api/v1/tasks", "Bearer "+testToken)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestBearerAuth_MissingHeader(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/api/v1/tasks", "")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	if got := resp.Header.Get("WWW-Authenticate"); !strings.Contains(got, "Bearer") {
		t.Fatalf("expected WWW-Authenticate Bearer, got %q", got)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "missing bearer token") {
		t.Fatalf("expected missing token error, got %q", string(body))
	}
}

func TestBearerAuth_WrongScheme(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/api/v1/tasks", "Basic dXNlcjpwYXNz")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestBearerAuth_WrongToken(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/api/v1/tasks", "Bearer nope")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "invalid bearer token") {
		t.Fatalf("expected invalid token error, got %q", string(body))
	}
}

func TestBearerAuth_HealthBypass(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/health", "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected health to bypass auth (200), got %d", resp.StatusCode)
	}
}

func TestBearerAuth_StatusBypass(t *testing.T) {
	h := newTestServer(testToken)
	resp := doRequest(t, h, http.MethodGet, "/api/v1/status", "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status to bypass auth (200), got %d", resp.StatusCode)
	}
}

// TestBearerAuth_OptInGate mirrors the main.go wiring: when no token is
// configured, the middleware is not registered and all requests pass through.
// When a token is set, requests without a valid bearer are rejected.
func TestBearerAuth_OptInGate(t *testing.T) {
	handler := func(token string) http.Handler {
		mux := http.NewServeMux()
		mux.HandleFunc("/api/v1/tasks", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
		var h http.Handler = mux
		if token != "" {
			h = BearerAuth(token)(mux)
		}
		return h
	}

	// Auth DISABLED (empty token): request without header is accepted.
	resp := doRequest(t, handler(""), http.MethodGet, "/api/v1/tasks", "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 when auth disabled, got %d", resp.StatusCode)
	}

	// Auth ENABLED: same request without header is rejected.
	resp = doRequest(t, handler(testToken), http.MethodGet, "/api/v1/tasks", "")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 when auth enabled + no header, got %d", resp.StatusCode)
	}

	// Auth ENABLED: with correct bearer, accepted.
	resp = doRequest(t, handler(testToken), http.MethodGet, "/api/v1/tasks", "Bearer "+testToken)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 when auth enabled + correct token, got %d", resp.StatusCode)
	}
}

func TestBearerAuth_ConstantTimeCompareDifferentLengths(t *testing.T) {
	h := newTestServer(testToken)
	// Shorter token — constant-time compare should reject without panicking.
	resp := doRequest(t, h, http.MethodGet, "/api/v1/tasks", "Bearer short")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for short token, got %d", resp.StatusCode)
	}
	// Longer token
	resp = doRequest(t, h, http.MethodGet, "/api/v1/tasks", "Bearer "+testToken+"-extra-suffix")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for long token, got %d", resp.StatusCode)
	}
}
