package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"

	"healthcareworkspace/communication/internal/config"
)

func main() {
	_ = godotenv.Load()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid communication configuration", "error", err)
		os.Exit(1)
	}
	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required for migrations")
		os.Exit(1)
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("open migration database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	if err := goose.SetDialect("postgres"); err != nil {
		slog.Error("set goose dialect", "error", err)
		os.Exit(1)
	}
	migrations := filepath.Join("migrations")
	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	switch command {
	case "up":
		err = goose.Up(db, migrations)
	case "down":
		err = goose.Down(db, migrations)
	case "status":
		err = goose.Status(db, migrations)
	default:
		err = fmt.Errorf("unsupported goose command %q; use up, down, or status", command)
	}
	if err != nil {
		slog.Error("communication migration failed", "command", command, "error", err)
		os.Exit(1)
	}
	slog.Info("communication migration completed", "command", command)
}
