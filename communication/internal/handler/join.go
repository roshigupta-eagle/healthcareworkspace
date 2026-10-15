package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/domain"
	"healthcareworkspace/communication/internal/media"
)

// JoinHandler issues short-lived provider credentials only after the trusted
// BFF actor has been authorized to view the CallSession.
type JoinHandler struct {
	service             *application.Service
	issuer              media.TokenIssuer
	allowLocalDemoGuest bool
}

func NewJoinHandler(service *application.Service, issuer media.TokenIssuer, allowLocalDemoGuest bool) *JoinHandler {
	return &JoinHandler{service: service, issuer: issuer, allowLocalDemoGuest: allowLocalDemoGuest}
}

func (h *JoinHandler) Join(w http.ResponseWriter, request *http.Request) {
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
	if h == nil || h.service == nil || h.issuer == nil {
		writeCallProblem(w, http.StatusServiceUnavailable, "MEDIA_TOKEN_UNAVAILABLE", "The local media token service is unavailable.", true, correlation, callID)
		return
	}
	session, err := h.service.GetCall(request.Context(), actor, callID)
	if err != nil {
		writeCallError(w, err, correlation, callID)
		return
	}
	if session.Provider != "livekit" || strings.TrimSpace(session.ProviderRoomID) == "" {
		writeCallProblem(w, http.StatusConflict, "MEDIA_JOIN_NOT_AVAILABLE", "This call does not have a LiveKit media session.", false, correlation, callID)
		return
	}
	participant, ok := joinParticipant(session, actor.ID, request.URL.Query().Get("localGuest") == "true", h.allowLocalDemoGuest)
	if !ok {
		writeCallProblem(w, http.StatusForbidden, "MEDIA_JOIN_FORBIDDEN", "You are not authorized to join this media session.", false, correlation, callID)
		return
	}
	grant, err := h.issuer.IssueJoinToken(request.Context(), media.JoinTokenRequest{
		RoomID: session.ProviderRoomID, Identity: opaqueMediaIdentity(session.ID, participant.ID), CanPublish: true, CanSubscribe: true, TTL: 5 * time.Minute,
	})
	if err != nil {
		writeCallError(w, err, correlation, callID)
		return
	}
	writeCallSuccess(w, http.StatusOK, map[string]any{"join": map[string]any{
		"serverUrl": grant.ServerURL, "token": grant.Token, "roomName": session.ProviderRoomID, "identity": opaqueMediaIdentity(session.ID, participant.ID), "expiresAt": grant.ExpiresAt,
	}}, correlation)
}

func joinParticipant(session *domain.CallSession, actorID string, localGuest, allowLocalDemoGuest bool) (domain.CallParticipant, bool) {
	if session == nil {
		return domain.CallParticipant{}, false
	}
	if localGuest {
		if !allowLocalDemoGuest {
			return domain.CallParticipant{}, false
		}
		for _, participant := range session.Participants {
			if participant.SubjectID != actorID && participantMayJoinMedia(participant) {
				return participant, true
			}
		}
		return domain.CallParticipant{}, false
	}
	for _, participant := range session.Participants {
		if participant.SubjectID == actorID && participantMayJoinMedia(participant) {
			return participant, true
		}
	}
	return domain.CallParticipant{}, false
}

func participantMayJoinMedia(participant domain.CallParticipant) bool {
	switch participant.State {
	case domain.ParticipantStateAccepted, domain.ParticipantStateJoining, domain.ParticipantStateJoined:
		return true
	default:
		return false
	}
}

func opaqueMediaIdentity(callID, participantID string) string {
	sum := sha256.Sum256([]byte(callID + ":" + participantID))
	return "participant-" + hex.EncodeToString(sum[:16])
}
