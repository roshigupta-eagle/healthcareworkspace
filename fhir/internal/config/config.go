package config

import "os"

// Config holds all runtime configuration resolved from environment variables.
type Config struct {
	Port        string
	DatabaseURL string
	Env         string
	JWTSecret   string // HS256 secret for JWT verification; empty = dev bypass
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8081"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		Env:         getEnv("ENV", "development"),
		JWTSecret:   getEnv("JWT_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
