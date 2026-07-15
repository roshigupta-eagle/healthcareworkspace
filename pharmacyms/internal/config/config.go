package config

import "os"

type Config struct {
Port          string
DatabaseURL   string
Env           string
AllowedOrigin string
}

func Load() *Config {
return &Config{
Port:          getEnv("PORT", "8084"),
DatabaseURL:   getEnv("DATABASE_URL", ""),
Env:           getEnv("ENV", "development"),
AllowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:3000"),
}
}

func getEnv(key, fallback string) string {
if v := os.Getenv(key); v != "" { return v }
return fallback
}