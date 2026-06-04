-- +goose Up
-- ─────────────────────────────────────────────────────────────────────────────
-- Cardiology Practice Simulation Schema
-- Rooms, visit state machine, domain event log, and work queues.
-- ─────────────────────────────────────────────────────────────────────────────

-- Physical rooms / stations within the practice
CREATE TABLE cardiology_rooms (
    id               TEXT NOT NULL,
    tenant_id        TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(id),
    name             TEXT NOT NULL,
    room_type        TEXT NOT NULL,   -- WAITING, CHECK_IN, EXAM, ECG, ECHO,
                                      -- STRESS_TEST, HOLTER, CONSULT, LAB,
                                      -- CHECKOUT, BILLING
    capacity         INT  NOT NULL DEFAULT 1,
    fhir_location_id TEXT,            -- FHIR Location.id once seeded
    is_active        BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (tenant_id, id)
);

-- One row per active/recent patient visit — the authoritative state
CREATE TABLE cardiology_visit_state (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(id),
    encounter_id          TEXT NOT NULL,          -- FHIR Encounter logical id
    patient_id            TEXT NOT NULL,          -- FHIR Patient logical id
    appointment_id        TEXT,                   -- FHIR Appointment logical id
    referral_id           TEXT,                   -- FHIR ServiceRequest logical id (referral)
    current_state         TEXT NOT NULL,
    previous_state        TEXT,
    visit_type            TEXT NOT NULL DEFAULT 'NEW_PATIENT',
    priority              TEXT NOT NULL DEFAULT 'NORMAL',
    assigned_physician_id TEXT,                   -- FHIR Practitioner logical id
    assigned_nurse_id     TEXT,                   -- FHIR Practitioner logical id
    current_room_id       TEXT,                   -- cardiology_rooms.id
    chief_complaint       TEXT,
    arrived_at            TIMESTAMPTZ,
    state_entered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    discharged_at         TIMESTAMPTZ,
    metadata              JSONB NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, encounter_id)
);

-- Immutable domain event log — append-only, never updated
CREATE TABLE cardiology_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(id),
    sequence_no  BIGSERIAL NOT NULL,              -- global ordering within tenant
    encounter_id TEXT NOT NULL,
    patient_id   TEXT NOT NULL,
    event_type   TEXT NOT NULL,
    from_state   TEXT,
    to_state     TEXT NOT NULL,
    actor_id     TEXT,                            -- FHIR Practitioner / Patient id
    actor_role   TEXT,
    room_id      TEXT,
    notes        TEXT,
    payload      JSONB NOT NULL DEFAULT '{}',
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Work-queue items — one item per unit of work for a staff member
CREATE TABLE cardiology_queue_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      TEXT NOT NULL DEFAULT 'default' REFERENCES tenants(id),
    queue_name     TEXT NOT NULL,
    encounter_id   TEXT,
    patient_id     TEXT NOT NULL,
    appointment_id TEXT,
    title          TEXT NOT NULL,
    description    TEXT,
    priority       INT  NOT NULL DEFAULT 50,      -- 0=highest, 100=lowest
    status         TEXT NOT NULL DEFAULT 'PENDING',
    assigned_to_id TEXT,
    due_at         TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    payload        JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX cvs_tenant_state_idx    ON cardiology_visit_state  (tenant_id, current_state);
CREATE INDEX cvs_patient_idx         ON cardiology_visit_state  (tenant_id, patient_id);
CREATE INDEX ce_encounter_seq_idx    ON cardiology_events       (tenant_id, encounter_id, sequence_no);
CREATE INDEX ce_tenant_seq_idx       ON cardiology_events       (tenant_id, sequence_no);
CREATE INDEX cq_queue_status_idx     ON cardiology_queue_items  (tenant_id, queue_name, status, priority);
CREATE INDEX cq_encounter_idx        ON cardiology_queue_items  (tenant_id, encounter_id);

-- ── Seed rooms (default tenant) ──────────────────────────────────────────────
INSERT INTO cardiology_rooms (id, tenant_id, name, room_type, capacity) VALUES
    ('waiting-room',    'default', 'Waiting Room',            'WAITING',      20),
    ('checkin-1',       'default', 'Check-In Station 1',      'CHECK_IN',      1),
    ('checkin-2',       'default', 'Check-In Station 2',      'CHECK_IN',      1),
    ('exam-1',          'default', 'Exam Room 1',             'EXAM',          1),
    ('exam-2',          'default', 'Exam Room 2',             'EXAM',          1),
    ('exam-3',          'default', 'Exam Room 3',             'EXAM',          1),
    ('ecg-room',        'default', 'ECG / EKG Room',          'ECG',           2),
    ('echo-lab',        'default', 'Echocardiography Lab',    'ECHO',          1),
    ('stress-test-lab', 'default', 'Stress Test Lab',         'STRESS_TEST',   1),
    ('holter-room',     'default', 'Holter Monitor Room',     'HOLTER',        2),
    ('consult-room',    'default', 'Consultation Room',       'CONSULT',       1),
    ('blood-draw',      'default', 'Blood Draw Station',      'LAB',           2),
    ('checkout-desk',   'default', 'Checkout Desk',           'CHECKOUT',      2),
    ('billing-office',  'default', 'Billing Office',          'BILLING',       2);

-- +goose Down
DROP TABLE IF EXISTS cardiology_queue_items;
DROP TABLE IF EXISTS cardiology_events;
DROP TABLE IF EXISTS cardiology_visit_state;
DROP TABLE IF EXISTS cardiology_rooms;
