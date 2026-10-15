package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
	"healthcareworkspace/communication/internal/media"
	"healthcareworkspace/communication/internal/persistence/memory"
)

func testCallHandler(provider media.Provider) *CallHandler {
	service := application.New(application.Dependencies{
		Repository: memory.New(), Authorizer: authorization.TrustedBFF{}, Media: provider,
		Now: func() time.Time { return time.Date(2026, 9, 23, 12, 0, 0, 0, time.UTC) },
	})
	return NewCallHandler(CallHandlerOptions{Service: service, ProviderName: provider.Name()})
}

func testCallRouter(handler *CallHandler) http.Handler {
	router := chi.NewRouter()
	router.Use(RequireServiceAuthentication("test-service-token"))
	router.Post("/v1/calls", handler.Create)
	router.Get("/v1/calls/{callID}", handler.Get)
	router.Post("/v1/calls/{callID}/end", handler.End)
	return router
}

func newCallRequest(method, target string, body any) *http.Request {
	payload, _ := json.Marshal(body)
	request := httptest.NewRequest(method, target, bytes.NewReader(payload))
	request.Header.Set("Authorization", "Bearer test-service-token")
	request.Header.Set("X-Communication-Actor-Id", "actor-a")
	request.Header.Set("X-Communication-Tenant-Id", "tenant-a")
	request.Header.Set("X-Communication-Organization-Id", "organization-a")
	request.Header.Set("X-Correlation-ID", "corr-call-test")
	return request
}

func validCreateBody() map[string]any {
	return map[string]any{
		"patientId": "patient-a", "conversationId": "conversation-a", "callType": "audio", "idempotencyKey": "call-key-a",
		"participants": []map[string]string{
			{"id": "participant-a", "subjectId": "actor-a", "type": "practitioner", "role": "host", "state": "invited"},
			{"id": "participant-b", "subjectId": "patient-a", "type": "patient", "role": "participant", "state": "invited"},
		},
	}
}

func TestCreateCallStartsConfiguredMockProvider(t *testing.T) {
	router := testCallRouter(testCallHandler(media.Mock{}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, newCallRequest(http.MethodPost, "/v1/calls", validCreateBody()))
	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusCreated, response.Body.String())
	}
	var payload struct {
		Data struct {
			Call domain.CallSession `json:"call"`
		} `json:"data"`
		Meta struct {
			CorrelationID string `json:"correlationId"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response JSON = %v", err)
	}
	if payload.Data.Call.State != domain.CallStateRinging || payload.Data.Call.Provider != "mock" || payload.Data.Call.ProviderRoomID == "" || payload.Meta.CorrelationID != "corr-call-test" {
		t.Fatalf("response = %#v, want ringing mock call with correlation", payload)
	}
}

func TestCreateCallMapsUnavailableProviderTo503AndKeepsCorrelation(t *testing.T) {
	router := testCallRouter(testCallHandler(media.Unavailable{}))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, newCallRequest(http.MethodPost, "/v1/calls", validCreateBody()))
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusServiceUnavailable, response.Body.String())
	}
	if response.Header().Get("X-Correlation-ID") != "corr-call-test" || !bytes.Contains(response.Body.Bytes(), []byte(`"code":"MEDIA_PROVIDER_UNAVAILABLE"`)) {
		t.Fatalf("response = %s, want redacted 503 problem with correlation", response.Body.String())
	}
}

func TestCreateCallRejectsInvalidBodyAndMissingServiceCredential(t *testing.T) {
	router := testCallRouter(testCallHandler(media.Mock{}))
	missingCredential := httptest.NewRequest(http.MethodPost, "/v1/calls", nil)
	missingCredential.Header.Set("X-Correlation-ID", "corr-no-auth")
	unauthenticated := httptest.NewRecorder()
	router.ServeHTTP(unauthenticated, missingCredential)
	if unauthenticated.Code != http.StatusUnauthorized {
		t.Fatalf("missing credential status = %d, want %d", unauthenticated.Code, http.StatusUnauthorized)
	}

	invalid := newCallRequest(http.MethodPost, "/v1/calls", map[string]any{"idempotencyKey": "key"})
	invalidResponse := httptest.NewRecorder()
	router.ServeHTTP(invalidResponse, invalid)
	if invalidResponse.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid status = %d, want %d: %s", invalidResponse.Code, http.StatusUnprocessableEntity, invalidResponse.Body.String())
	}
}
