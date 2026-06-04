-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- lab_tests: catalogue of available laboratory tests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
    id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    loinc_code  TEXT  UNIQUE,                 -- LOINC code (international standard)
    name        TEXT  NOT NULL,
    category    TEXT,                         -- chemistry, hematology, microbiology, etc.
    units       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- lab_orders: ordered laboratory tests (FHIR ServiceRequest equivalent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_fhir_id TEXT        NOT NULL,
    orderer_id      TEXT        NOT NULL,     -- practitioner FHIR ID
    lab_test_id     UUID        REFERENCES lab_tests(id),
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','in-progress','completed','cancelled')),
    priority        TEXT        NOT NULL DEFAULT 'routine'
                                CHECK (priority IN ('routine','urgent','stat')),
    ordered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_fhir_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status  ON lab_orders(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- lab_results: results for each ordered test (FHIR Observation equivalent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID        NOT NULL REFERENCES lab_orders(id),
    lab_test_id     UUID        REFERENCES lab_tests(id),
    value_numeric   NUMERIC,
    value_text      TEXT,
    value_coded     TEXT,                     -- SNOMED/LOINC answer code
    units           TEXT,
    reference_range TEXT,
    interpretation TEXT        CHECK (interpretation IN ('N','H','L','HH','LL','A')),
    status          TEXT        NOT NULL DEFAULT 'final'
                                CHECK (status IN ('preliminary','final','amended','cancelled')),
    resulted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resulted_by     TEXT                      -- lab technician identifier
);

CREATE INDEX IF NOT EXISTS idx_lab_results_order  ON lab_results(order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_status ON lab_results(status);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS lab_results;
DROP TABLE IF EXISTS lab_orders;
DROP TABLE IF EXISTS lab_tests;
-- +goose StatementEnd
