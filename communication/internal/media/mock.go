package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"healthcareworkspace/communication/internal/domain"
)

// Mock is an explicit development-only provider. It creates opaque sessions;
// the control-plane test lifecycle is advanced by the server, not by the UI.
type Mock struct{}

func (Mock) Name() string { return "mock" }

func (Mock) Start(ctx context.Context, request StartRequest) (Session, error) {
	if err := ctx.Err(); err != nil {
		return Session{}, err
	}
	if strings.TrimSpace(request.CallID) == "" {
		return Session{}, domain.NewProblem(domain.CodeValidationFailed, 422, "A call identifier is required to start media.", false, nil)
	}
	return Session{Provider: "mock", RoomID: mockRoomID(request.CallID)}, nil
}

func (Mock) Answer(context.Context, Session) error { return nil }
func (Mock) Hangup(context.Context, Session) error { return nil }
func (Mock) Hold(context.Context, Session) error   { return nil }
func (Mock) Resume(context.Context, Session) error { return nil }
func (Mock) Transfer(context.Context, Session, TransferRequest) error {
	return nil
}
func (Mock) AddParticipant(context.Context, Session, string) error { return nil }
func (Mock) RemoveParticipant(context.Context, Session, string) error {
	return nil
}
func (Mock) StartRecording(context.Context, Session, string) error { return nil }
func (Mock) StopRecording(context.Context, Session) error          { return nil }

func mockRoomID(callID string) string {
	sum := sha256.Sum256([]byte(callID))
	return "mock-" + hex.EncodeToString(sum[:12])
}
