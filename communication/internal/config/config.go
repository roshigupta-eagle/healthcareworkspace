// Package config loads typed, non-secret service configuration.
package config

import (
	"fmt"
	"net"
	"net/netip"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type MediaConfig struct {
	Mode               string
	Enabled            bool
	Provider           string
	BaseURL            string
	APIKey             string
	APISecret          string
	MockOutcome        string
	MockStepDelay      time.Duration
	AllowEphemeralLive bool
}

type Config struct {
	Port                      string
	DatabaseURL               string
	Env                       string
	CommunicationServiceToken string
	Media                     MediaConfig
}

func Load() (*Config, error) {
	legacyMediaEnabled, err := boolEnv("MEDIA_ENABLED", false)
	if err != nil {
		return nil, err
	}
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("CALL_PROVIDER_MODE")))
	if mode == "" {
		if legacyMediaEnabled {
			mode = "live"
		} else {
			mode = "disabled"
		}
	}
	provider := strings.ToLower(strings.TrimSpace(firstEnv("CALL_PROVIDER", "MEDIA_PROVIDER")))
	cfg := &Config{
		Port:                      env("PORT", "8083"),
		DatabaseURL:               strings.TrimSpace(os.Getenv("DATABASE_URL")),
		Env:                       strings.ToLower(strings.TrimSpace(env("ENV", "development"))),
		CommunicationServiceToken: strings.TrimSpace(os.Getenv("COMMUNICATION_SERVICE_AUTH_TOKEN")),
		Media: MediaConfig{
			Mode:               mode,
			Enabled:            mode == "mock" || mode == "live",
			Provider:           provider,
			BaseURL:            strings.TrimSpace(os.Getenv("CALL_PROVIDER_BASE_URL")),
			APIKey:             strings.TrimSpace(os.Getenv("CALL_PROVIDER_API_KEY")),
			APISecret:          strings.TrimSpace(os.Getenv("CALL_PROVIDER_API_SECRET")),
			AllowEphemeralLive: strings.EqualFold(strings.TrimSpace(os.Getenv("CALL_ALLOW_EPHEMERAL_LIVE")), "true"),
		},
	}
	if err := validateCallProvider(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func validateCallProvider(cfg *Config) error {
	switch cfg.Media.Mode {
	case "disabled":
		if cfg.Env == "production" {
			return fmt.Errorf("CALL_PROVIDER_MODE=live is required when ENV=production")
		}
		return nil
	case "mock":
		if cfg.Env == "production" {
			return fmt.Errorf("CALL_PROVIDER_MODE=mock is not allowed when ENV=production")
		}
		if cfg.CommunicationServiceToken == "" {
			return fmt.Errorf("COMMUNICATION_SERVICE_AUTH_TOKEN is required when CALL_PROVIDER_MODE=mock")
		}
		if cfg.Media.Provider == "" {
			cfg.Media.Provider = "mock"
		}
		if cfg.Media.Provider != "mock" {
			return fmt.Errorf("CALL_PROVIDER must be mock when CALL_PROVIDER_MODE=mock")
		}
		cfg.Media.MockOutcome = strings.ToLower(strings.TrimSpace(env("CALL_MOCK_OUTCOME", "completed")))
		if cfg.Media.MockOutcome != "completed" && cfg.Media.MockOutcome != "failed" {
			return fmt.Errorf("CALL_MOCK_OUTCOME must be completed or failed when CALL_PROVIDER_MODE=mock")
		}
		delay, err := millisecondsEnv("CALL_MOCK_STEP_DELAY_MS", 350)
		if err != nil {
			return err
		}
		cfg.Media.MockStepDelay = delay
		return nil
	case "live":
		if cfg.Media.Provider == "" {
			return fmt.Errorf("CALL_PROVIDER is required when CALL_PROVIDER_MODE=live")
		}
		if cfg.Media.Provider != "livekit" {
			return fmt.Errorf("CALL_PROVIDER=%q is not supported; configure livekit", cfg.Media.Provider)
		}
		if cfg.DatabaseURL == "" && !(cfg.Env != "production" && cfg.Media.AllowEphemeralLive) {
			return fmt.Errorf("DATABASE_URL is required when CALL_PROVIDER_MODE=live unless CALL_ALLOW_EPHEMERAL_LIVE=true outside production")
		}
		if cfg.CommunicationServiceToken == "" {
			return fmt.Errorf("COMMUNICATION_SERVICE_AUTH_TOKEN is required when CALL_PROVIDER_MODE=live")
		}
		if cfg.Media.BaseURL == "" || cfg.Media.APIKey == "" || cfg.Media.APISecret == "" {
			return fmt.Errorf("CALL_PROVIDER_BASE_URL, CALL_PROVIDER_API_KEY, and CALL_PROVIDER_API_SECRET are required when CALL_PROVIDER_MODE=live")
		}
		parsed, err := url.ParseRequestURI(cfg.Media.BaseURL)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			return fmt.Errorf("CALL_PROVIDER_BASE_URL must be an absolute HTTP(S) URL")
		}
		if cfg.Env == "production" && parsed.Scheme != "https" {
			return fmt.Errorf("CALL_PROVIDER_BASE_URL must use HTTPS when ENV=production")
		}
		if cfg.Env == "production" {
			if err := validateProductionLiveKitHost(parsed.Hostname(), net.LookupIP); err != nil {
				return err
			}
		}
		return nil
	default:
		return fmt.Errorf("CALL_PROVIDER_MODE must be disabled, mock, or live")
	}
}

func validateProductionLiveKitHost(host string, lookup func(string) ([]net.IP, error)) error {
	host = strings.TrimRight(strings.ToLower(strings.TrimSpace(host)), ".")
	if isLocalLiveKitHostname(host) {
		return fmt.Errorf("CALL_PROVIDER_BASE_URL must not target a local LiveKit host when ENV=production")
	}
	if address, err := netip.ParseAddr(host); err == nil {
		if isPrivateOrLocalAddress(address) {
			return fmt.Errorf("CALL_PROVIDER_BASE_URL must not target a private or local LiveKit address when ENV=production")
		}
		return nil
	}
	if lookup == nil {
		return fmt.Errorf("CALL_PROVIDER_BASE_URL host validation is not configured")
	}
	addresses, err := lookup(host)
	if err != nil || len(addresses) == 0 {
		return fmt.Errorf("CALL_PROVIDER_BASE_URL host must resolve to a public LiveKit address when ENV=production")
	}
	for _, rawAddress := range addresses {
		address, ok := netip.AddrFromSlice(rawAddress)
		if !ok || isPrivateOrLocalAddress(address) {
			return fmt.Errorf("CALL_PROVIDER_BASE_URL must not resolve to a private or local LiveKit address when ENV=production")
		}
	}
	return nil
}

func isLocalLiveKitHostname(host string) bool {
	return host == "localhost" || host == "localhost.localdomain" || host == "local" ||
		strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".localdomain")
}

func isPrivateOrLocalAddress(address netip.Addr) bool {
	address = address.Unmap()
	carrierGradeNAT := netip.MustParsePrefix("100.64.0.0/10")
	return !address.IsValid() || address.IsLoopback() || address.IsUnspecified() || address.IsPrivate() ||
		address.IsLinkLocalUnicast() || address.IsMulticast() || carrierGradeNAT.Contains(address)
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func boolEnv(key string, fallback bool) (bool, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s must be true or false: %w", key, err)
	}
	return parsed, nil
}

func millisecondsEnv(key string, fallback int) (time.Duration, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return time.Duration(fallback) * time.Millisecond, nil
	}
	milliseconds, err := strconv.Atoi(value)
	if err != nil || milliseconds < 10 || milliseconds > 60_000 {
		return 0, fmt.Errorf("%s must be an integer from 10 through 60000 milliseconds", key)
	}
	return time.Duration(milliseconds) * time.Millisecond, nil
}
