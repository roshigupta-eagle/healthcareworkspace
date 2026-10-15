package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"healthcareworkspace/communication/internal/config"
	"healthcareworkspace/communication/internal/db"
	"healthcareworkspace/communication/internal/server"
)

func main() {
	_ = godotenv.Load()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid communication configuration", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		if cfg.Media.Mode == "live" && !cfg.Media.AllowEphemeralLive {
			slog.Error("live call provider requires a durable database", "error", err)
			os.Exit(1)
		}
		slog.Warn("database unavailable; using local ephemeral call store", "error", err, "ephemeralLive", cfg.Media.AllowEphemeralLive)
		pool = nil
	} else {
		defer pool.Close()
		slog.Info("database connected")
	}

	serviceHandler, err := server.New(cfg, pool)
	if err != nil {
		slog.Error("invalid communication service wiring", "error", err)
		os.Exit(1)
	}

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      serviceHandler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	go func() {
		slog.Info("communication service starting", "port", cfg.Port, "env", cfg.Env, "mediaEnabled", cfg.Media.Enabled)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("communication server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced communication server shutdown", "error", err)
	}
}
