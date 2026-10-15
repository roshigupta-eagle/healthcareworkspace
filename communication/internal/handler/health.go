package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/communication/internal/config"
)

type healthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Media   string `json:"media"`
}

// Liveness remains available even when dependencies are unavailable, so an
// orchestrator can distinguish a running process from a ready control plane.
func Liveness(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		mediaStatus := "unavailable"
		if cfg != nil {
			switch cfg.Media.Mode {
			case "mock":
				mediaStatus = "mock"
			case "live":
				mediaStatus = cfg.Media.Provider
			}
		}
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok", Service: "communication", Media: mediaStatus})
	}
}

// Readiness fails closed until a PostgreSQL pool is connected and responsive.
// Explicit mock mode is the one exception: it uses the in-memory repository
// for local-only call lifecycle testing and is therefore ready without SQL.
func Readiness(cfg *config.Config, pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, request *http.Request) {
		if cfg != nil && cfg.Media.Mode == "mock" && pool == nil {
			writeJSON(w, http.StatusOK, healthResponse{Status: "ready", Service: "communication", Media: "mock"})
			return
		}
		if pool == nil {
			writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "not-ready", Service: "communication", Media: "unavailable"})
			return
		}
		ctx, cancel := context.WithTimeout(request.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "not-ready", Service: "communication", Media: "unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, healthResponse{Status: "ready", Service: "communication", Media: "unavailable"})
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
