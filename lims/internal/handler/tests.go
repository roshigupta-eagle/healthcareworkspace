package handler

import (
"log/slog"
"net/http"

"healthcareworkspace/lims/internal/store"
)

// TestsHandler handles lab test catalogue.
type TestsHandler struct{ st *store.Store }

// NewTestsHandler creates a TestsHandler.
func NewTestsHandler(st *store.Store) *TestsHandler { return &TestsHandler{st: st} }

// List returns the full lab test catalogue.
func (h *TestsHandler) List(w http.ResponseWriter, r *http.Request) {
tests, err := h.st.ListTests(r.Context())
if err != nil {
slog.Error("list tests", "error", err)
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list tests"})
return
}
if tests == nil { tests = []store.LabTest{} }
writeJSON(w, http.StatusOK, tests)
}