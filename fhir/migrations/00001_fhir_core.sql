-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- fhir_resources: primary store for all FHIR R4 resources
-- The full resource JSON lives in `data` (jsonb).
-- A GIN index on `data` supports containment (@>) and jsonpath queries.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fhir_resources (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT        NOT NULL,
    fhir_id       TEXT        NOT NULL,
    version_id    BIGINT      NOT NULL DEFAULT 1,
    last_updated  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted    BOOLEAN     NOT NULL DEFAULT false,
    data          JSONB       NOT NULL
);

-- uniqueness: one current row per (type, fhir_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fhir_resources_type_id
    ON fhir_resources (resource_type, fhir_id);

-- fast lookup by type
CREATE INDEX IF NOT EXISTS idx_fhir_resources_type
    ON fhir_resources (resource_type);

-- last_updated for _lastUpdated search param
CREATE INDEX IF NOT EXISTS idx_fhir_resources_last_updated
    ON fhir_resources (last_updated DESC);

-- GIN index on full resource JSON (containment + jsonpath queries)
CREATE INDEX IF NOT EXISTS idx_fhir_resources_data_gin
    ON fhir_resources USING GIN (data);

-- ─────────────────────────────────────────────────────────────────────────────
-- fhir_history: append-only version log (every write appended here)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fhir_history (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT        NOT NULL,
    fhir_id       TEXT        NOT NULL,
    version_id    BIGINT      NOT NULL,
    last_updated  TIMESTAMPTZ NOT NULL DEFAULT now(),
    operation     TEXT        NOT NULL CHECK (operation IN ('create','update','delete')),
    data          JSONB       -- NULL for delete operations
);

CREATE INDEX IF NOT EXISTS idx_fhir_history_resource
    ON fhir_history (resource_type, fhir_id, version_id DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- fhir_search_params: extracted search parameter values for fast querying.
-- One row per (resource, param, value). Supports token, string, date, reference.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fhir_search_params (
    id            BIGSERIAL   PRIMARY KEY,
    resource_type TEXT        NOT NULL,
    fhir_id       TEXT        NOT NULL,
    param_name    TEXT        NOT NULL,       -- e.g. "identifier", "name", "birthdate"
    param_type    TEXT        NOT NULL,       -- token | string | date | reference | uri
    value_string  TEXT,                       -- string / token code / reference URL
    value_system  TEXT,                       -- token system
    value_date    TIMESTAMPTZ,                -- date/datetime params
    value_number  NUMERIC                     -- quantity / number params
);

CREATE INDEX IF NOT EXISTS idx_fsp_resource_param
    ON fhir_search_params (resource_type, param_name, value_string);

CREATE INDEX IF NOT EXISTS idx_fsp_token
    ON fhir_search_params (resource_type, param_name, value_system, value_string);

CREATE INDEX IF NOT EXISTS idx_fsp_date
    ON fhir_search_params (resource_type, param_name, value_date);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS fhir_search_params;
DROP TABLE IF EXISTS fhir_history;
DROP TABLE IF EXISTS fhir_resources;
-- +goose StatementEnd
