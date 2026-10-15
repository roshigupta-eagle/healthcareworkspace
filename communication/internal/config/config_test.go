package config

import (
	"errors"
	"net"
	"testing"
)

func TestLoadUsesSafeProviderFreeDefaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("ENV", "")
	t.Setenv("MEDIA_ENABLED", "")
	t.Setenv("MEDIA_PROVIDER", "")
	t.Setenv("CALL_PROVIDER_MODE", "")
	t.Setenv("CALL_PROVIDER", "")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8083" || cfg.Env != "development" || cfg.Media.Mode != "disabled" || cfg.Media.Enabled || cfg.Media.Provider != "" {
		t.Fatalf("Load() = %#v, want provider-free defaults", cfg)
	}
}

func TestLoadRejectsEnabledMediaWithoutNamedProvider(t *testing.T) {
	t.Setenv("MEDIA_ENABLED", "true")
	t.Setenv("MEDIA_PROVIDER", "")
	t.Setenv("CALL_PROVIDER_MODE", "")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted enabled media without a provider")
	}
}

func TestLoadRejectsInvalidMediaFlag(t *testing.T) {
	t.Setenv("MEDIA_ENABLED", "sometimes")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted an invalid MEDIA_ENABLED value")
	}
}

func TestLoadAcceptsExplicitDevelopmentMockMode(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("CALL_PROVIDER_MODE", "mock")
	t.Setenv("CALL_PROVIDER", "")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "local-test-token")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if !cfg.Media.Enabled || cfg.Media.Mode != "mock" || cfg.Media.Provider != "mock" {
		t.Fatalf("Load() = %#v, want enabled mock provider", cfg.Media)
	}
	if cfg.Media.MockOutcome != "completed" || cfg.Media.MockStepDelay <= 0 {
		t.Fatalf("Load() = %#v, want default mock lifecycle settings", cfg.Media)
	}
}

func TestLoadRejectsMockModeInProduction(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("CALL_PROVIDER_MODE", "mock")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "test-token")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted mock mode in production")
	}
}

func TestLoadRejectsIncompleteLiveProviderConfiguration(t *testing.T) {
	t.Setenv("CALL_PROVIDER_MODE", "live")
	t.Setenv("CALL_PROVIDER", "livekit")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "test-token")
	t.Setenv("CALL_PROVIDER_BASE_URL", "")
	t.Setenv("CALL_PROVIDER_API_KEY", "")
	t.Setenv("CALL_PROVIDER_API_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted incomplete live provider configuration")
	}
}

func TestLoadRejectsInvalidMockLifecycleConfiguration(t *testing.T) {
	t.Setenv("CALL_PROVIDER_MODE", "mock")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "local-test-token")
	t.Setenv("CALL_MOCK_OUTCOME", "unknown")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted an invalid mock outcome")
	}

	t.Setenv("CALL_MOCK_OUTCOME", "completed")
	t.Setenv("CALL_MOCK_STEP_DELAY_MS", "0")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted an invalid mock step delay")
	}
}

func TestLoadAcceptsExplicitEphemeralLiveModeOnlyOutsideProduction(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("CALL_PROVIDER_MODE", "live")
	t.Setenv("CALL_PROVIDER", "livekit")
	t.Setenv("CALL_ALLOW_EPHEMERAL_LIVE", "true")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "local-test-token")
	t.Setenv("CALL_PROVIDER_BASE_URL", "http://127.0.0.1:7880")
	t.Setenv("CALL_PROVIDER_API_KEY", "devkey")
	t.Setenv("CALL_PROVIDER_API_SECRET", "secret")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if !cfg.Media.AllowEphemeralLive {
		t.Fatal("Load() did not preserve explicit ephemeral live opt-in")
	}

	t.Setenv("ENV", "production")
	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted ephemeral live mode in production")
	}
}

func TestLoadRejectsPrivateProductionLiveKitEndpoint(t *testing.T) {
	t.Setenv("ENV", "production")
	t.Setenv("CALL_PROVIDER_MODE", "live")
	t.Setenv("CALL_PROVIDER", "livekit")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("COMMUNICATION_SERVICE_AUTH_TOKEN", "test-token")
	t.Setenv("CALL_PROVIDER_BASE_URL", "https://127.0.0.1:7880")
	t.Setenv("CALL_PROVIDER_API_KEY", "test-key")
	t.Setenv("CALL_PROVIDER_API_SECRET", "test-secret")
	t.Setenv("CALL_ALLOW_EPHEMERAL_LIVE", "false")

	if _, err := Load(); err == nil {
		t.Fatal("Load() unexpectedly accepted a loopback LiveKit endpoint in production")
	}
}

func TestValidateProductionLiveKitHostRejectsLocalAndPrivateTargets(t *testing.T) {
	tests := []struct {
		name    string
		host    string
		ips     []net.IP
		lookup  error
		wantErr bool
	}{
		{name: "localhost hostname", host: "localhost", wantErr: true},
		{name: "loopback IPv4", host: "127.0.0.1", wantErr: true},
		{name: "loopback IPv6", host: "::1", wantErr: true},
		{name: "private DNS", host: "livekit.example", ips: []net.IP{net.ParseIP("10.0.0.7")}, wantErr: true},
		{name: "link local DNS", host: "livekit.example", ips: []net.IP{net.ParseIP("169.254.12.7")}, wantErr: true},
		{name: "unresolvable host", host: "livekit.example", lookup: errors.New("not found"), wantErr: true},
		{name: "public DNS", host: "livekit.example", ips: []net.IP{net.ParseIP("198.51.100.20")}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateProductionLiveKitHost(test.host, func(string) ([]net.IP, error) {
				return test.ips, test.lookup
			})
			if (err != nil) != test.wantErr {
				t.Fatalf("validateProductionLiveKitHost(%q) error = %v, wantErr %t", test.host, err, test.wantErr)
			}
		})
	}
}
