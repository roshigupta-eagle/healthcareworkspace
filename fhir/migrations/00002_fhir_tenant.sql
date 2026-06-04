-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- tenants: SaaS tenant registry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    plan        TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free','starter','professional','enterprise')),
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, name, plan) VALUES ('default', 'Default Tenant', 'enterprise')
    ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- api_keys: per-tenant service-to-service authentication
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash    TEXT        NOT NULL UNIQUE,   -- SHA-256 hex of the raw key
    name        TEXT        NOT NULL,
    role        TEXT        NOT NULL DEFAULT 'service'
                            CHECK (role IN ('service','admin','read-only')),
    is_active   BOOLEAN     NOT NULL DEFAULT true,
    last_used   TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Add tenant_id to all FHIR storage tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fhir_resources
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES tenants(id);

ALTER TABLE fhir_history
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES tenants(id);

ALTER TABLE fhir_search_params
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default'
    REFERENCES tenants(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Replace old unique index with tenant-scoped one
-- ─────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS fhir_resources_type_fhir_id_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS fhir_resources_tenant_type_id_uidx
    ON fhir_resources (tenant_id, resource_type, fhir_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance indexes for tenant-scoped access patterns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS fhir_resources_tenant_type_idx
    ON fhir_resources (tenant_id, resource_type, last_updated DESC)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS fhir_history_tenant_idx
    ON fhir_history (tenant_id, resource_type, fhir_id, version_id DESC);

CREATE INDEX IF NOT EXISTS fhir_search_params_tenant_type_name_idx
    ON fhir_search_params (tenant_id, resource_type, param_name, value_string);

CREATE INDEX IF NOT EXISTS fhir_search_params_tenant_token_idx
    ON fhir_search_params (tenant_id, resource_type, param_name, value_system, value_string)
    WHERE value_system IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS fhir_search_params_tenant_token_idx;
DROP INDEX IF EXISTS fhir_search_params_tenant_type_name_idx;
DROP INDEX IF EXISTS fhir_history_tenant_idx;
DROP INDEX IF EXISTS fhir_resources_tenant_type_idx;
DROP INDEX IF EXISTS fhir_resources_tenant_type_id_uidx;
ALTER TABLE fhir_search_params DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE fhir_history       DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE fhir_resources     DROP COLUMN IF EXISTS tenant_id;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS tenants;
-- +goose StatementEnd
