// Package middleware provides HTTP middleware for the atlas API.
package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// BearerAuth returns a middleware that validates a static bearer token against
// the Authorization header. Health checks (/health) and the status endpoint
// (/api/v1/status) are bypassed so liveness probes continue to work without
// credentials.
//
// Comparison is constant-time to avoid timing side channels.
func BearerAuth(requiredToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for health + status (liveness probes).
			if strings.HasPrefix(r.URL.Path, "/health") || strings.HasPrefix(r.URL.Path, "/api/v1/status") {
				next.ServeHTTP(w, r)
				return
			}

			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				respondUnauthorized(w, "missing bearer token")
				return
			}

			token := strings.TrimPrefix(h, "Bearer ")
			if subtle.ConstantTimeCompare([]byte(token), []byte(requiredToken)) != 1 {
				respondUnauthorized(w, "invalid bearer token")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func respondUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="atlas"`)
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"data":null,"error":"` + msg + `"}`))
}
