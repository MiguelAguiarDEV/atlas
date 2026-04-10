package handler

import (
	"encoding/json"
	"net/http"
)

// Response is the unified API response envelope.
type Response struct {
	Data  interface{} `json:"data"`
	Error *string     `json:"error"`
	Meta  *Meta       `json:"meta,omitempty"`
}

// Meta holds pagination metadata.
type Meta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// respondJSON writes a JSON response with the given status code.
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := Response{Data: data}
	json.NewEncoder(w).Encode(resp)
}

// respondList writes a JSON response with pagination metadata.
func respondList(w http.ResponseWriter, status int, data interface{}, total, limit, offset int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := Response{
		Data: data,
		Meta: &Meta{Total: total, Limit: limit, Offset: offset},
	}
	json.NewEncoder(w).Encode(resp)
}

// respondError writes a JSON error response.
func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := Response{Data: nil, Error: &message}
	json.NewEncoder(w).Encode(resp)
}
