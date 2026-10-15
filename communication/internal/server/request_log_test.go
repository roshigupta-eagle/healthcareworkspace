package server

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestRedactedRequestLoggerDoesNotLogPathOrQueryIdentifiers(t *testing.T) {
	var output bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&output, nil))
	router := chi.NewRouter()
	router.Use(RedactedRequestLogger(logger))
	router.Get("/calls/{callID}", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodGet, "/calls/call-secret?patientId=patient-secret", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	logLine := output.String()
	if strings.Contains(logLine, "call-secret") || strings.Contains(logLine, "patient-secret") {
		t.Fatalf("log contains a raw identifier: %s", logLine)
	}
	if !strings.Contains(logLine, "/calls/{callID}") {
		t.Fatalf("log does not contain the matched route template: %s", logLine)
	}
}
