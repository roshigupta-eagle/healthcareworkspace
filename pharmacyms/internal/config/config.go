package config

import "os"

type Config struct {
Port                string
DatabaseURL         string
Env                 string
AllowedOrigin       string
ServiceJWTSecret    string
InternalServiceToken string
ServiceJWKSURL      string
}

func Load() *Config {
return &Config{
Port:                 getEnv("PORT", "8084"),
DatabaseURL:          getEnv("DATABASE_URL", ""),
Env:                  getEnv("ENV", "development"),
AllowedOrigin:        getEnv("ALLOWED_ORIGIN", "http://localhost:3000"),
ServiceJWTSecret:     getEnv("SERVICE_JWT_SECRET", ""),
InternalServiceToken: getEnv("INTERNAL_SERVICE_TOKEN", ""),
ServiceJWKSURL:       getEnv("SERVICE_JWKS_URL", ""),
}
}

func getEnv(key, fallback string) string {
if v := os.Getenv(key); v != "" {
return v
}
return fallback
}
