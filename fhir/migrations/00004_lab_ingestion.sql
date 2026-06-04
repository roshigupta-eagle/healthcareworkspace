-- +goose Up
-- ─────────────────────────────────────────────────────────────────────────────
-- Lab Result Ingestion Schema
-- Receives HL7 v2 ORU^R01 and FHIR DiagnosticReport from external labs
-- (LifeLabs, Dynacare, instruments, OLIS / Ontario provincial system).
-- ─────────────────────────────────────────────────────────────────────────────

-- Every inbound message is recorded here before processing.
-- Immutable once inserted — status transitions tracked here.
CREATE TABLE lab_ingestion_log (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL DEFAULT 'default' REFERENCES tenants(id),

    -- Source metadata
    source_system    TEXT        NOT NULL,   -- LIFELABS | DYNACARE | OLIS | INSTRUMENT | FHIR_PUSH | UNKNOWN
    source_facility  TEXT,                   -- sending facility name from MSH-4
    message_type     TEXT        NOT NULL,   -- HL7V2_ORU_R01 | FHIR_DIAGNOSTICREPORT | FHIR_BUNDLE
    message_id       TEXT,                   -- MSH-10 control ID (HL7) or Bundle.id (FHIR)
    accession_number TEXT,                   -- OBR-3 filler order number — deduplication key

    -- Patient matching
    raw_ohip_number  TEXT,                   -- PID-19 (Ontario HCN)
    raw_mrn          TEXT,                   -- PID-3 internal MRN
    raw_patient_name TEXT,                   -- PID-5 family^given
    raw_dob          TEXT,                   -- PID-7 YYYYMMDD
    matched_patient_id TEXT,                 -- FHIR Patient.id once matched

    -- Processing state
    status           TEXT        NOT NULL DEFAULT 'RECEIVED',
    -- RECEIVED | PARSING | PARSED | MATCHING | MATCHED | NORMALIZING
    -- NORMALIZED | STORED | FAILED | DUPLICATE | MANUAL_REVIEW

    error_message    TEXT,
    retry_count      INT         NOT NULL DEFAULT 0,

    -- Derived FHIR output
    diagnostic_report_id TEXT,              -- FHIR DiagnosticReport.id after storage
    observation_ids      TEXT[],            -- FHIR Observation ids

    -- Raw payload (stored for replay / audit)
    raw_payload      TEXT        NOT NULL,
    parsed_json      JSONB,                 -- parsed intermediate structure

    -- Timing
    received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate ingestion of same accession from same source
CREATE UNIQUE INDEX lab_ingestion_accession_uidx
    ON lab_ingestion_log (tenant_id, source_system, accession_number)
    WHERE accession_number IS NOT NULL AND status NOT IN ('FAILED');

-- Indexes for queue polling and patient lookup
CREATE INDEX lab_ingestion_status_idx    ON lab_ingestion_log (tenant_id, status, received_at);
CREATE INDEX lab_ingestion_patient_idx   ON lab_ingestion_log (tenant_id, matched_patient_id);
CREATE INDEX lab_ingestion_ohip_idx      ON lab_ingestion_log (tenant_id, raw_ohip_number);

-- Source system configuration — which systems are trusted, how to map fields
CREATE TABLE lab_source_profiles (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL DEFAULT 'default' REFERENCES tenants(id),
    source_system    TEXT        NOT NULL,
    display_name     TEXT        NOT NULL,
    message_format   TEXT        NOT NULL DEFAULT 'HL7V2',  -- HL7V2 | FHIR
    hl7_sending_app  TEXT,                   -- MSH-3 pattern to match
    hl7_sending_fac  TEXT,                   -- MSH-4 pattern to match
    -- Patient matching priority: OHIP | MRN | NAME_DOB
    match_strategy   TEXT        NOT NULL DEFAULT 'OHIP,MRN,NAME_DOB',
    is_active        BOOLEAN     NOT NULL DEFAULT true,
    notes            TEXT,
    UNIQUE (tenant_id, source_system)
);

-- Seed known Ontario lab sources
INSERT INTO lab_source_profiles
    (tenant_id, source_system, display_name, message_format, hl7_sending_app, hl7_sending_fac, match_strategy)
VALUES
    ('default', 'LIFELABS',   'LifeLabs',                                  'HL7V2', 'LIFELABS',   'LIFELABS',   'OHIP,MRN,NAME_DOB'),
    ('default', 'DYNACARE',   'Dynacare',                                  'HL7V2', 'DYNACARE',   'DYNACARE',   'OHIP,MRN,NAME_DOB'),
    ('default', 'OLIS',       'Ontario Lab Info System (eHealth Ontario)',  'HL7V2', 'OLIS',       'MOHLTC',     'OHIP,MRN,NAME_DOB'),
    ('default', 'INSTRUMENT', 'Direct Instrument Interface',               'HL7V2', NULL,         NULL,         'MRN,NAME_DOB'),
    ('default', 'FHIR_PUSH',  'FHIR R4 Push (any)',                        'FHIR',  NULL,         NULL,         'OHIP,MRN,NAME_DOB');

-- +goose Down
DROP TABLE IF EXISTS lab_source_profiles;
DROP TABLE IF EXISTS lab_ingestion_log;
