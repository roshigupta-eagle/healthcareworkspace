package handler

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
)

type CallHandler struct {
	service        *application.Service
	providerName   string
	onMediaStarted func(context.Context, authorization.Actor, string, string)
	logger         *slog.Logger
}

type CallHandlerOptions struct {
	Service        *application.Service
	ProviderName   string
	OnMediaStarted func(context.Context, authorization.Actor, string, string)
	Logger         *slog.Logger
}

func NewCallHandler(options CallHandlerOptions) *CallHandler {
	logger := options.Logger
	if logger == nil {
		logger = slog.Default()
	}
	return &CallHandler{service: options.Service, providerName: options.ProviderName, onMediaStarted: options.OnMediaStarted, logger: logger}
}

// RequireServiceAuthentication protects the private BFF-to-control-plane
// boundary. The browser never receives this credential.
func RequireServiceAuthentication(token string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			if strings.TrimSpace(token) == "" {
				writeCallProblem(w, http.StatusServiceUnavailable, "CALL_SERVICE_AUTH_NOT_CONFIGURED", "The call service authentication is not configured.", false, correlationID(request), "")
				return
			}
			provided := strings.TrimSpace(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer "))
			if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
				writeCallProblem(w, http.StatusUnauthorized, "UNAUTHENTICATED", "A trusted service credential is required to access call control.", false, correlationID(request), "")
				return
			}
			next.ServeHTTP(w, request)
		})
	}
}

type createCallBody struct {
	PatientID      string                `json:"patientId"`
	AppointmentID  string                `json:"appointmentId"`
	EncounterID    string                `json:"encounterId"`
	ConversationID string                `json:"conversationId"`
	CallType       string                `json:"callType"`
	Participants   []callParticipantBody `json:"participants"`
	IdempotencyKey string                `json:"idempotencyKey"`
}

type callParticipantBody struct {
	ID        string `json:"id"`
	SubjectID string `json:"subjectId"`
	Type      string `json:"type"`
	Role      string `json:"role"`
	State     string `json:"state"`
}

type callEnvelope struct {
	Data any `json:"data"`
	Meta struct {
		CorrelationID string `json:"correlationId"`
	} `json:"meta"`
}

func (h *CallHandler) Create(w http.ResponseWriter, request *http.Request) {
	correlation := correlationID(request)
	actor, err := actorFromRequest(request)
	if err != nil {
		writeCallError(w, err, correlation, "")
		return
	}
	if h == nil || h.service == nil {
		writeCallProblem(w, http.StatusServiceUnavailable, "CALL_SERVICE_UNAVAILABLE", "The call control service is unavailable.", true, correlation, "")
		return
	}
	body, err := decodeCreateCall(request)
	if err != nil {
		writeCallError(w, err, correlation, "")
		return
	}
	create, err := h.service.CreateCall(request.Context(), actor, body)
	if err != nil {
		writeCallError(w, err, correlation, "")
		return
	}
	h.logger.Info("call provider request initiated", "correlationId", correlation, "callId", create.Session.ID, "provider", h.providerName)
	session, err := h.service.StartMedia(request.Context(), actor, create.Session.ID, correlation)
	if err != nil {
		h.logCallError(correlation, create.Session.ID, err)
		writeCallError(w, err, correlation, create.Session.ID)
		return
	}
	if h.onMediaStarted != nil {
		h.onMediaStarted(context.WithoutCancel(request.Context()), actor, session.ID, correlation)
	}
	h.logger.Info("call provider response received", "correlationId", correlation, "callId", session.ID, "providerCallId", session.ProviderRoomID, "provider", session.Provider, "state", session.State)
	status := http.StatusCreated
	if create.Replayed {
		status = http.StatusOK
	}
	writeCallSuccess(w, status, map[string]any{"call": session, "replayed": create.Replayed}, correlation)
}

func (h *CallHandler) Get(w http.ResponseWriter, request *http.Request) {
	correlation := correlationID(request)
	actor, err := actorFromRequest(request)
	if err != nil {
		writeCallError(w, err, correlation, "")
		return
	}
	callID := strings.TrimSpace(chi.URLParam(request, "callID"))
	if callID == "" {
		writeCallProblem(w, http.StatusBadRequest, "VALIDATION_FAILED", "A call identifier is required.", false, correlation, "")
		return
	}
	session, err := h.service.GetCall(request.Context(), actor, callID)
	if err != nil {
		writeCallError(w, err, correlation, callID)
		return
	}
	writeCallSuccess(w, http.StatusOK, map[string]any{"call": session}, correlation)
}

func (h *CallHandler) End(w http.ResponseWriter, request *http.Request) {
	correlation := correlationID(request)
	actor, err := actorFromRequest(request)
	if err != nil {
		writeCallError(w, err, correlation, "")
		return
	}
	callID := strings.TrimSpace(chi.URLParam(request, "callID"))
	if callID == "" {
		writeCallProblem(w, http.StatusBadRequest, "VALIDATION_FAILED", "A call identifier is required.", false, correlation, "")
		return
	}
	session, err := h.service.EndMedia(request.Context(), actor, callID, correlation)
	if err != nil {
		h.logCallError(correlation, callID, err)
		writeCallError(w, err, correlation, callID)
		return
	}
	h.logger.Info("call completed", "correlationId", correlation, "callId", session.ID, "providerCallId", session.ProviderRoomID, "state", session.State)
	writeCallSuccess(w, http.StatusOK, map[string]any{"call": session}, correlation)
}

func decodeCreateCall(request *http.Request) (application.CreateCallRequest, error) {
	decoder := json.NewDecoder(io.LimitReader(request.Body, 64*1024))
	decoder.DisallowUnknownFields()
	var body createCallBody
	if err := decoder.Decode(&body); err != nil {
		return application.CreateCallRequest{}, domain.NewProblem(domain.CodeValidationFailed, http.StatusBadRequest, "The call request must be valid JSON.", false, nil)
	}
	callType := domain.CallType(strings.ToLower(strings.TrimSpace(body.CallType)))
	if callType == "" {
		callType = domain.CallTypeAudio
	}
	participants := make([]domain.CallParticipant, 0, len(body.Participants))
	for _, participant := range body.Participants {
		participants = append(participants, domain.CallParticipant{
			ID: strings.TrimSpace(participant.ID), SubjectID: strings.TrimSpace(participant.SubjectID),
			Type:  domain.ParticipantType(strings.ToLower(strings.TrimSpace(participant.Type))),
			Role:  domain.ParticipantRole(strings.ToLower(strings.TrimSpace(participant.Role))),
			State: domain.ParticipantState(strings.ToLower(strings.TrimSpace(participant.State))),
		})
	}
	return application.CreateCallRequest{
		PatientID: strings.TrimSpace(body.PatientID), AppointmentID: strings.TrimSpace(body.AppointmentID), EncounterID: strings.TrimSpace(body.EncounterID),
		ConversationID: strings.TrimSpace(body.ConversationID), CallType: callType, Participants: participants,
		IdempotencyKey: strings.TrimSpace(body.IdempotencyKey), CorrelationID: correlationID(request),
	}, nil
}

func actorFromRequest(request *http.Request) (authorization.Actor, error) {
	actor := authorization.Actor{
		ID:             strings.TrimSpace(request.Header.Get("X-Communication-Actor-Id")),
		TenantID:       strings.TrimSpace(request.Header.Get("X-Communication-Tenant-Id")),
		OrganizationID: strings.TrimSpace(request.Header.Get("X-Communication-Organization-Id")),
	}
	for _, role := range strings.Split(request.Header.Get("X-Communication-Actor-Roles"), ",") {
		if value := strings.TrimSpace(role); value != "" {
			actor.Roles = append(actor.Roles, value)
		}
	}
	if !actor.Valid() {
		return authorization.Actor{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, http.StatusUnauthorized, "A trusted actor context is required.", false, nil)
	}
	return actor, nil
}

func correlationID(request *http.Request) string {
	if correlation := strings.TrimSpace(request.Header.Get("X-Correlation-ID")); correlation != "" && len(correlation) <= 128 {
		return correlation
	}
	if requestID := middleware.GetReqID(request.Context()); requestID != "" {
		return requestID
	}
	return "call-request"
}

func (h *CallHandler) logCallError(correlationID, callID string, err error) {
	code := "INTERNAL_ERROR"
	if problem, ok := domain.AsProblem(err); ok {
		code = string(problem.Code)
	}
	h.logger.Error("call provider request failed", "correlationId", correlationID, "callId", callID, "provider", h.providerName, "errorCategory", code)
}

func writeCallSuccess(w http.ResponseWriter, status int, data any, correlationID string) {
	response := callEnvelope{Data: data}
	response.Meta.CorrelationID = correlationID
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Correlation-ID", correlationID)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(response)
}

func writeCallError(w http.ResponseWriter, err error, correlationID, callID string) {
	if problem, ok := domain.AsProblem(err); ok {
		writeCallProblem(w, problem.Status, string(problem.Code), problem.Detail, problem.Retryable, correlationID, callID)
		return
	}
	writeCallProblem(w, http.StatusInternalServerError, "CALL_SERVICE_FAILURE", "The call service encountered an unexpected error.", true, correlationID, callID)
}

func writeCallProblem(w http.ResponseWriter, status int, code, detail string, retryable bool, correlationID, callID string) {
	response := map[string]any{
		"type":          "https://roshi.health/problems/" + strings.ToLower(strings.ReplaceAll(code, "_", "-")),
		"title":         strings.ReplaceAll(strings.ToLower(code), "_", " "),
		"status":        status,
		"code":          code,
		"detail":        detail,
		"retryable":     retryable,
		"correlationId": correlationID,
	}
	if callID != "" {
		response["callId"] = callID
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Correlation-ID", correlationID)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(response)
}
