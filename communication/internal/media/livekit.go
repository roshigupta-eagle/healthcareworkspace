package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"

	"healthcareworkspace/communication/internal/domain"
)

const (
	liveKitRoomEmptyTimeoutSeconds = 300
	liveKitJoinTokenTTL            = 5 * time.Minute
)

type liveKitRoomService interface {
	CreateRoom(context.Context, *livekit.CreateRoomRequest) (*livekit.Room, error)
	DeleteRoom(context.Context, *livekit.DeleteRoomRequest) (*livekit.DeleteRoomResponse, error)
}

// LiveKit is the configured media adapter. Roshi remains authoritative for
// CallSession state; LiveKit owns only the opaque room and WebRTC transport.
type LiveKit struct {
	client    liveKitRoomService
	apiKey    string
	apiSecret string
	serverURL string
}

func NewLiveKit(baseURL, apiKey, apiSecret string) (*LiveKit, error) {
	if strings.TrimSpace(baseURL) == "" || strings.TrimSpace(apiKey) == "" || strings.TrimSpace(apiSecret) == "" {
		return nil, domain.NewProblem(domain.CodeValidationFailed, 500, "LiveKit provider configuration is incomplete.", false, nil)
	}
	serverURL, err := liveKitWebSocketURL(baseURL)
	if err != nil {
		return nil, domain.NewProblem(domain.CodeValidationFailed, 500, "LiveKit provider URL is invalid.", false, err)
	}
	return &LiveKit{client: lksdk.NewRoomServiceClient(baseURL, apiKey, apiSecret), apiKey: apiKey, apiSecret: apiSecret, serverURL: serverURL}, nil
}

func newLiveKit(client liveKitRoomService) *LiveKit {
	return &LiveKit{client: client, apiKey: "test-key", apiSecret: "test-secret", serverURL: "ws://127.0.0.1:7880"}
}

func (*LiveKit) Name() string { return "livekit" }

func (p *LiveKit) Start(ctx context.Context, request StartRequest) (Session, error) {
	if err := ctx.Err(); err != nil {
		return Session{}, mapLiveKitError(err)
	}
	if p == nil || p.client == nil {
		return Session{}, domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "The LiveKit provider client is unavailable.", true, nil)
	}
	if strings.TrimSpace(request.CallID) == "" {
		return Session{}, domain.NewProblem(domain.CodeValidationFailed, 422, "A call identifier is required to start media.", false, nil)
	}
	roomID := liveKitRoomID(request.CallID)
	room, err := p.client.CreateRoom(ctx, &livekit.CreateRoomRequest{Name: roomID, EmptyTimeout: liveKitRoomEmptyTimeoutSeconds})
	if err != nil {
		return Session{}, mapLiveKitError(err)
	}
	if room == nil || strings.TrimSpace(room.Name) == "" {
		return Session{}, domain.NewProblem(domain.CodeMediaProviderFailure, 502, "The media provider did not return a usable opaque media session.", true, nil)
	}
	return Session{Provider: p.Name(), RoomID: room.Name}, nil
}

// IssueJoinToken mints a short-lived, room-scoped browser token. The caller
// supplies opaque values only after Roshi authorization has succeeded.
func (p *LiveKit) IssueJoinToken(ctx context.Context, request JoinTokenRequest) (JoinGrant, error) {
	if err := ctx.Err(); err != nil {
		return JoinGrant{}, mapLiveKitError(err)
	}
	if p == nil || strings.TrimSpace(p.apiKey) == "" || strings.TrimSpace(p.apiSecret) == "" || strings.TrimSpace(p.serverURL) == "" {
		return JoinGrant{}, domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "The LiveKit token service is unavailable.", true, nil)
	}
	if strings.TrimSpace(request.RoomID) == "" || strings.TrimSpace(request.Identity) == "" {
		return JoinGrant{}, domain.NewProblem(domain.CodeValidationFailed, 422, "A room and participant identity are required for a media grant.", false, nil)
	}
	ttl := request.TTL
	if ttl <= 0 || ttl > liveKitJoinTokenTTL {
		ttl = liveKitJoinTokenTTL
	}
	canPublish := request.CanPublish
	canSubscribe := request.CanSubscribe
	jwt, err := auth.NewAccessToken(p.apiKey, p.apiSecret).
		SetIdentity(request.Identity).
		SetValidFor(ttl).
		AddGrant(&auth.VideoGrant{RoomJoin: true, Room: request.RoomID, CanPublish: &canPublish, CanSubscribe: &canSubscribe}).
		ToJWT()
	if err != nil {
		return JoinGrant{}, domain.NewProblem(domain.CodeMediaProviderFailure, 502, "The media provider could not issue a join credential.", true, err)
	}
	return JoinGrant{ServerURL: p.serverURL, Token: jwt, ExpiresAt: time.Now().UTC().Add(ttl)}, nil
}

func (p *LiveKit) Answer(context.Context, Session) error { return unsupportedLiveKitAction() }

func (p *LiveKit) Hangup(ctx context.Context, session Session) error {
	if err := ctx.Err(); err != nil {
		return mapLiveKitError(err)
	}
	if p == nil || p.client == nil {
		return domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "The LiveKit provider client is unavailable.", true, nil)
	}
	if strings.TrimSpace(session.RoomID) == "" {
		return domain.NewProblem(domain.CodeValidationFailed, 422, "A media room is required to end a call.", false, nil)
	}
	if _, err := p.client.DeleteRoom(ctx, &livekit.DeleteRoomRequest{Room: session.RoomID}); err != nil {
		return mapLiveKitError(err)
	}
	return nil
}

func (p *LiveKit) Hold(context.Context, Session) error   { return unsupportedLiveKitAction() }
func (p *LiveKit) Resume(context.Context, Session) error { return unsupportedLiveKitAction() }
func (p *LiveKit) Transfer(context.Context, Session, TransferRequest) error {
	return unsupportedLiveKitAction()
}
func (p *LiveKit) AddParticipant(context.Context, Session, string) error {
	return unsupportedLiveKitAction()
}
func (p *LiveKit) RemoveParticipant(context.Context, Session, string) error {
	return unsupportedLiveKitAction()
}
func (p *LiveKit) StartRecording(context.Context, Session, string) error {
	return unsupportedLiveKitAction()
}
func (p *LiveKit) StopRecording(context.Context, Session) error { return unsupportedLiveKitAction() }

func liveKitRoomID(callID string) string {
	sum := sha256.Sum256([]byte(callID))
	return "call-" + hex.EncodeToString(sum[:16])
}

func liveKitWebSocketURL(baseURL string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Host == "" {
		return "", err
	}
	switch parsed.Scheme {
	case "http":
		parsed.Scheme = "ws"
	case "https":
		parsed.Scheme = "wss"
	default:
		return "", errors.New("unsupported LiveKit URL scheme")
	}
	parsed.Path = ""
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return parsed.String(), nil
}

func mapLiveKitError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return domain.NewProblem(domain.CodeMediaProviderTimeout, 504, "The media provider timed out while creating the call session.", true, err)
	}
	var networkError net.Error
	if errors.As(err, &networkError) && networkError.Timeout() {
		return domain.NewProblem(domain.CodeMediaProviderTimeout, 504, "The media provider timed out while creating the call session.", true, err)
	}
	message := strings.ToLower(err.Error())
	if strings.Contains(message, "unauthenticated") || strings.Contains(message, "unauthorized") || strings.Contains(message, "forbidden") {
		return domain.NewProblem(domain.CodeMediaProviderAuth, 502, "The media provider rejected the server-side provider credentials.", false, err)
	}
	if strings.Contains(message, "connection refused") || strings.Contains(message, "no such host") || strings.Contains(message, "unavailable") {
		return domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "The media provider is unavailable.", true, err)
	}
	return domain.NewProblem(domain.CodeMediaProviderFailure, 502, "The media provider could not create the call session.", true, err)
}

func unsupportedLiveKitAction() error {
	return domain.NewProblem(domain.CodeMediaProviderFailure, 501, "This media-provider action is not configured for LiveKit.", false, nil)
}
