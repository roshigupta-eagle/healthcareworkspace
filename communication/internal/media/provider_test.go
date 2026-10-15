package media

import (
	"context"
	"errors"
	"testing"

	"github.com/livekit/protocol/livekit"

	"healthcareworkspace/communication/internal/domain"
)

type fakeLiveKitRooms struct {
	createRequest *livekit.CreateRoomRequest
	createRoom    *livekit.Room
	createError   error
	deleteRequest *livekit.DeleteRoomRequest
	deleteError   error
}

func (f *fakeLiveKitRooms) CreateRoom(_ context.Context, request *livekit.CreateRoomRequest) (*livekit.Room, error) {
	f.createRequest = request
	return f.createRoom, f.createError
}

func (f *fakeLiveKitRooms) DeleteRoom(_ context.Context, request *livekit.DeleteRoomRequest) (*livekit.DeleteRoomResponse, error) {
	f.deleteRequest = request
	return &livekit.DeleteRoomResponse{}, f.deleteError
}

func TestMockStartCreatesDeterministicOpaqueSession(t *testing.T) {
	provider := Mock{}
	first, err := provider.Start(context.Background(), StartRequest{CallID: "call-one"})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	second, err := provider.Start(context.Background(), StartRequest{CallID: "call-one"})
	if err != nil {
		t.Fatalf("second Start() error = %v", err)
	}
	if first.Provider != "mock" || first.RoomID == "" || first.RoomID != second.RoomID || first.RoomID == "call-one" {
		t.Fatalf("Start() = %#v and %#v, want deterministic opaque mock sessions", first, second)
	}
}

func TestLiveKitStartCreatesOpaqueRoomWithoutMetadata(t *testing.T) {
	client := &fakeLiveKitRooms{createRoom: &livekit.Room{Name: "call-opaque-room"}}
	provider := newLiveKit(client)

	session, err := provider.Start(context.Background(), StartRequest{CallID: "call-one"})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if session != (Session{Provider: "livekit", RoomID: "call-opaque-room"}) {
		t.Fatalf("Start() = %#v", session)
	}
	if client.createRequest == nil || client.createRequest.Name == "" || client.createRequest.Metadata != "" || client.createRequest.EmptyTimeout != liveKitRoomEmptyTimeoutSeconds {
		t.Fatalf("CreateRoom request = %#v, want opaque room with no metadata", client.createRequest)
	}
}

func TestLiveKitMapsProviderTimeoutAndAuthenticationFailures(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		code   domain.ProblemCode
		status int
	}{
		{name: "timeout", err: context.DeadlineExceeded, code: domain.CodeMediaProviderTimeout, status: 504},
		{name: "credentials", err: errors.New("unauthorized provider request"), code: domain.CodeMediaProviderAuth, status: 502},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			provider := newLiveKit(&fakeLiveKitRooms{createError: test.err})
			_, err := provider.Start(context.Background(), StartRequest{CallID: "call-one"})
			problem, ok := domain.AsProblem(err)
			if !ok || problem.Code != test.code || problem.Status != test.status {
				t.Fatalf("Start() error = %#v, want %s (%d)", err, test.code, test.status)
			}
		})
	}
}
