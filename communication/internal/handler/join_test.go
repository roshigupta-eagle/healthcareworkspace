package handler

import (
	"bytes"
	"context"
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

type liveTestProvider struct{}

func (liveTestProvider) Name() string { return "livekit" }
func (liveTestProvider) Start(context.Context, media.StartRequest) (media.Session, error) {
	return media.Session{Provider: "livekit", RoomID: "opaque-room"}, nil
}
func (liveTestProvider) Answer(context.Context, media.Session) error { return nil }
func (liveTestProvider) Hangup(context.Context, media.Session) error { return nil }
func (liveTestProvider) Hold(context.Context, media.Session) error   { return nil }
func (liveTestProvider) Resume(context.Context, media.Session) error { return nil }
func (liveTestProvider) Transfer(context.Context, media.Session, media.TransferRequest) error {
	return nil
}
func (liveTestProvider) AddParticipant(context.Context, media.Session, string) error    { return nil }
func (liveTestProvider) RemoveParticipant(context.Context, media.Session, string) error { return nil }
func (liveTestProvider) StartRecording(context.Context, media.Session, string) error    { return nil }
func (liveTestProvider) StopRecording(context.Context, media.Session) error             { return nil }

type testTokenIssuer struct{}

func (testTokenIssuer) IssueJoinToken(_ context.Context, request media.JoinTokenRequest) (media.JoinGrant, error) {
	return media.JoinGrant{ServerURL: "ws://127.0.0.1:7880", Token: "test-token", ExpiresAt: time.Now().UTC().Add(request.TTL)}, nil
}

func TestJoinIssuesScopedGrantForAuthorizedParticipant(t *testing.T) {
	service := application.New(application.Dependencies{Repository: memory.New(), Authorizer: authorization.TrustedBFF{}, Media: liveTestProvider{}})
	actor := authorization.Actor{ID: "actor-a", TenantID: "tenant-a", OrganizationID: "organization-a", Roles: []string{"DOCTOR"}}
	created, err := service.CreateCall(context.Background(), actor, application.CreateCallRequest{
		PatientID: "patient-a", ConversationID: "conversation-a", CallType: domain.CallTypeAudio, IdempotencyKey: "join-call-a",
		Participants: []domain.CallParticipant{{ID: "participant-a", SubjectID: "actor-a", Type: domain.ParticipantPractitioner, Role: domain.ParticipantRoleHost, State: domain.ParticipantStateAccepted}, {ID: "participant-b", SubjectID: "patient-a", Type: domain.ParticipantPatient, Role: domain.ParticipantRoleMember, State: domain.ParticipantStateInvited}},
	})
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}
	session, err := service.StartMedia(context.Background(), actor, created.Session.ID, "corr-join")
	if err != nil {
		t.Fatalf("StartMedia() error = %v", err)
	}

	router := chi.NewRouter()
	router.Use(RequireServiceAuthentication("test-service-token"))
	router.Post("/v1/calls/{callID}/join", NewJoinHandler(service, testTokenIssuer{}, false).Join)
	request := newCallRequest(http.MethodPost, "/v1/calls/"+session.ID+"/join", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", response.Code, response.Body.String())
	}
	var payload struct {
		Data struct {
			Join struct {
				ServerURL string `json:"serverUrl"`
				Token     string `json:"token"`
				RoomName  string `json:"roomName"`
				Identity  string `json:"identity"`
			} `json:"join"`
		} `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response JSON = %v", err)
	}
	if payload.Data.Join.ServerURL == "" || payload.Data.Join.Token != "test-token" || payload.Data.Join.RoomName != "opaque-room" || payload.Data.Join.Identity == "" {
		t.Fatalf("join response = %#v, want scoped media grant", payload.Data.Join)
	}
}

func TestJoinRejectsInvitedParticipant(t *testing.T) {
	service := application.New(application.Dependencies{Repository: memory.New(), Authorizer: authorization.TrustedBFF{}, Media: liveTestProvider{}})
	actor := authorization.Actor{ID: "actor-a", TenantID: "tenant-a", OrganizationID: "organization-a", Roles: []string{"DOCTOR"}}
	created, err := service.CreateCall(context.Background(), actor, application.CreateCallRequest{
		PatientID: "patient-a", ConversationID: "conversation-a", CallType: domain.CallTypeAudio, IdempotencyKey: "join-call-invited",
		Participants: []domain.CallParticipant{{ID: "participant-a", SubjectID: "actor-a", Type: domain.ParticipantPractitioner, Role: domain.ParticipantRoleHost, State: domain.ParticipantStateInvited}, {ID: "participant-b", SubjectID: "patient-a", Type: domain.ParticipantPatient, Role: domain.ParticipantRoleMember, State: domain.ParticipantStateInvited}},
	})
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}
	session, err := service.StartMedia(context.Background(), actor, created.Session.ID, "corr-join-invited")
	if err != nil {
		t.Fatalf("StartMedia() error = %v", err)
	}

	router := chi.NewRouter()
	router.Use(RequireServiceAuthentication("test-service-token"))
	router.Post("/v1/calls/{callID}/join", NewJoinHandler(service, testTokenIssuer{}, false).Join)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, newCallRequest(http.MethodPost, "/v1/calls/"+session.ID+"/join", nil))
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403: %s", response.Code, response.Body.String())
	}
	if !bytes.Contains(response.Body.Bytes(), []byte(`"code":"MEDIA_JOIN_FORBIDDEN"`)) {
		t.Fatalf("response = %s, want denied media join problem", response.Body.String())
	}
}

func TestJoinParticipantAllowsOnlyAcceptedJoinStates(t *testing.T) {
	session := &domain.CallSession{Participants: []domain.CallParticipant{{ID: "participant-a", SubjectID: "actor-a"}}}
	for _, test := range []struct {
		state domain.ParticipantState
		want  bool
	}{
		{state: domain.ParticipantStateInvited, want: false},
		{state: domain.ParticipantStateRinging, want: false},
		{state: domain.ParticipantStateAccepted, want: true},
		{state: domain.ParticipantStateJoining, want: true},
		{state: domain.ParticipantStateJoined, want: true},
		{state: domain.ParticipantStateLeft, want: false},
	} {
		t.Run(string(test.state), func(t *testing.T) {
			session.Participants[0].State = test.state
			_, ok := joinParticipant(session, "actor-a", false, false)
			if ok != test.want {
				t.Fatalf("joinParticipant(%q) = %t, want %t", test.state, ok, test.want)
			}
		})
	}
}

func TestJoinRejectsCallWithoutLiveKitRoom(t *testing.T) {
	handler := testCallHandler(media.Mock{})
	router := testCallRouter(handler)
	created := httptest.NewRecorder()
	router.ServeHTTP(created, newCallRequest(http.MethodPost, "/v1/calls", validCreateBody()))
	if created.Code != http.StatusCreated {
		t.Fatalf("create status = %d, want 201", created.Code)
	}
	var callPayload struct {
		Data struct {
			Call domain.CallSession `json:"call"`
		} `json:"data"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &callPayload); err != nil {
		t.Fatalf("create response JSON = %v", err)
	}
	joinRouter := chi.NewRouter()
	joinRouter.Use(RequireServiceAuthentication("test-service-token"))
	joinRouter.Post("/v1/calls/{callID}/join", NewJoinHandler(handler.service, testTokenIssuer{}, false).Join)
	response := httptest.NewRecorder()
	joinRouter.ServeHTTP(response, newCallRequest(http.MethodPost, "/v1/calls/"+callPayload.Data.Call.ID+"/join", nil))
	if response.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409: %s", response.Code, response.Body.String())
	}
}
