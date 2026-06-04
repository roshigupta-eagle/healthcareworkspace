-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- medications: master medication/drug catalogue
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medications (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    din          TEXT        UNIQUE,           -- Health Canada Drug Identification Number
    name         TEXT        NOT NULL,
    generic_name TEXT,
    form         TEXT,                         -- tablet, capsule, liquid, etc.
    strength     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- prescriptions: patient prescriptions (FHIR MedicationRequest equivalent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_fhir_id TEXT        NOT NULL,
    prescriber_id   TEXT        NOT NULL,
    medication_id   UUID        REFERENCES medications(id),
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','completed','cancelled','on-hold')),
    dosage_text     TEXT,
    quantity        NUMERIC,
    refills         INTEGER     NOT NULL DEFAULT 0,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_fhir_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status  ON prescriptions(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- dispenses: each time a prescription is filled
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispenses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID        NOT NULL REFERENCES prescriptions(id),
    dispensed_by    TEXT        NOT NULL,      -- pharmacist identifier
    dispensed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    quantity        NUMERIC     NOT NULL,
    lot_number      TEXT,
    expiry_date     DATE
);

CREATE INDEX IF NOT EXISTS idx_dispenses_prescription ON dispenses(prescription_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS dispenses;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS medications;
-- +goose StatementEnd
