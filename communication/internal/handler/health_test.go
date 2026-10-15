package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"healthcareworkspace/communication/internal/config"
)

func TestLivenessIsAvailableWithoutDatabase(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()
	Liveness(nil).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("liveness status = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), `"media":"unavailable"`) {
		t.Fatalf("liveness body = %s", response.Body.String())
	}
}

func TestReadinessFailsClosedWithoutDatabase(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()
	Readiness(nil, nil).ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("readiness status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}

func TestReadinessAcceptsExplicitMockModeWithoutDatabase(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()
	Readiness(&config.Config{Media: config.MediaConfig{Mode: "mock"}}, nil).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("readiness status = %d, want %d", response.Code, http.StatusOK)
	}
}
