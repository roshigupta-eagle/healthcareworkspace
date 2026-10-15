// Package server composes the communication control plane.
package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/config"
	"healthcareworkspace/communication/internal/domain"
	"healthcareworkspace/communication/internal/handler"
	"healthcareworkspace/communication/internal/media"
	"healthcareworkspace/communication/internal/persistence/memory"
	"healthcareworkspace/communication/internal/persistence/postgres"
)

func New(cfg *config.Config, pool *pgxpool.Pool) (http.Handler, error) {
	if cfg == nil {
		return nil, fmt.Errorf("communication configuration is required")
	}
	provider, err := configuredProvider(cfg)
	if err != nil {
		return nil, err
	}
	var repository application.Repository
	if pool == nil {
		repository = memory.New()
	} else {
		repository = postgres.New(pool)
	}
	service := application.New(application.Dependencies{Repository: repository, Authorizer: authorization.TrustedBFF{}, Media: provider})
	callHandler := handler.NewCallHandler(handler.CallHandlerOptions{Service: service, ProviderName: provider.Name(), OnMediaStarted: mockLifecycle(cfg, service), Logger: slog.Default()})
	var tokenIssuer media.TokenIssuer
	if candidate, ok := provider.(media.TokenIssuer); ok {
		tokenIssuer = candidate
	}
	joinHandler := handler.NewJoinHandler(service, tokenIssuer, cfg.Env != "production" && cfg.Media.AllowEphemeralLive)

	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(RedactedRequestLogger(slog.Default()))
	router.Use(middleware.Recoverer)
	router.Use(middleware.CleanPath)
	router.Use(middleware.StripSlashes)
	router.Use(middleware.Timeout(30 * time.Second))
	router.Use(middleware.Compress(5))
	router.Get("/healthz", handler.Liveness(cfg))
	router.Get("/readyz", handler.Readiness(cfg, pool))
	router.Route("/v1", func(api chi.Router) {
		api.Use(handler.RequireServiceAuthentication(cfg.CommunicationServiceToken))
		api.Post("/calls", callHandler.Create)
		api.Get("/calls/{callID}", callHandler.Get)
		api.Post("/calls/{callID}/end", callHandler.End)
		api.Post("/calls/{callID}/join", joinHandler.Join)
	})
	return router, nil
}

func configuredProvider(cfg *config.Config) (media.Provider, error) {
	switch cfg.Media.Mode {
	case "mock":
		return media.Mock{}, nil
	case "live":
		return media.NewLiveKit(cfg.Media.BaseURL, cfg.Media.APIKey, cfg.Media.APISecret)
	default:
		return media.Unavailable{ProviderName: cfg.Media.Provider}, nil
	}
}

func mockLifecycle(cfg *config.Config, service *application.Service) func(context.Context, authorization.Actor, string, string) {
	if cfg.Media.Mode != "mock" || service == nil {
		return nil
	}
	return func(_ context.Context, actor authorization.Actor, callID, correlationID string) {
		go func() {
			states := []domain.CallState{domain.CallStateAccepted, domain.CallStateConnecting, domain.CallStateActive, domain.CallStateCompleted}
			if cfg.Media.MockOutcome == "failed" {
				states = []domain.CallState{domain.CallStateFailed}
			}
			for _, state := range states {
				timer := time.NewTimer(cfg.Media.MockStepDelay)
				<-timer.C
				_, err := service.ApplyTransition(context.Background(), actor, callID, domain.TransitionInput{ToState: state, ReasonCode: "mock_" + strings.ToLower(string(state)), Source: "mock_provider", ActorID: actor.ID}, correlationID)
				if err != nil {
					slog.Default().Warn("mock call lifecycle stopped", "correlationId", correlationID, "callId", callID, "state", state)
					return
				}
			}
		}()
	}
}
