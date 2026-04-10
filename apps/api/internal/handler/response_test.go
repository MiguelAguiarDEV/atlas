package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestRespondJSON(t *testing.T) {
	w := httptest.NewRecorder()
	respondJSON(w, 200, map[string]string{"key": "value"})

	if w.Code != 200 {
		t.Errorf("status = %d, want 200", w.Code)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("content-type = %q, want application/json", ct)
	}

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != nil {
		t.Error("expected nil error")
	}
	if resp.Meta != nil {
		t.Error("expected nil meta")
	}
}

func TestRespondList(t *testing.T) {
	w := httptest.NewRecorder()
	respondList(w, 200, []string{"a", "b"}, 10, 50, 0)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Fatal("expected non-nil meta")
	}
	if resp.Meta.Total != 10 {
		t.Errorf("meta.total = %d, want 10", resp.Meta.Total)
	}
	if resp.Meta.Limit != 50 {
		t.Errorf("meta.limit = %d, want 50", resp.Meta.Limit)
	}
	if resp.Meta.Offset != 0 {
		t.Errorf("meta.offset = %d, want 0", resp.Meta.Offset)
	}
}

func TestRespondError(t *testing.T) {
	w := httptest.NewRecorder()
	respondError(w, 400, "bad request")

	if w.Code != 400 {
		t.Errorf("status = %d, want 400", w.Code)
	}

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error == nil {
		t.Fatal("expected non-nil error")
	}
	if *resp.Error != "bad request" {
		t.Errorf("error = %q, want bad request", *resp.Error)
	}
	if resp.Data != nil {
		t.Error("expected nil data on error")
	}
}

func TestRespondJSON_NilData(t *testing.T) {
	w := httptest.NewRecorder()
	respondJSON(w, 200, nil)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Data != nil {
		t.Error("expected nil data")
	}
}

func TestRespondList_EmptySlice(t *testing.T) {
	w := httptest.NewRecorder()
	respondList(w, 200, []string{}, 0, 50, 0)

	var resp Response
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Meta == nil {
		t.Fatal("expected non-nil meta")
	}
	if resp.Meta.Total != 0 {
		t.Errorf("meta.total = %d, want 0", resp.Meta.Total)
	}
}
