-- +goose Up
-- +goose StatementBegin

-- CallSession remains the durable operational control-plane aggregate. It is
-- intentionally not a FHIR resource and references are opaque local IDs.
CREATE TABLE IF NOT EXISTS telehealth_call_session (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    patient_id TEXT,
    appointment_id TEXT,
    encounter_id TEXT,
    conversation_id TEXT,
    call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video', 'group_audio', 'group_video')),
    call_state TEXT NOT NULL CHECK (call_state IN ('CREATED', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'RECONNECTING', 'COMPLETED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED')),
    provider TEXT,
    provider_room_id TEXT,
    initiated_by_actor_id TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    ringing_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    connecting_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telehealth_call_session_tenant_org_created
    ON telehealth_call_session (tenant_id, organization_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_telehealth_call_session_tenant_org_patient
    ON telehealth_call_session (tenant_id, organization_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telehealth_call_session_tenant_org_appointment
    ON telehealth_call_session (tenant_id, organization_id, appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telehealth_call_session_tenant_org_encounter
    ON telehealth_call_session (tenant_id, organization_id, encounter_id) WHERE encounter_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_telehealth_call_provider_room
    ON telehealth_call_session (tenant_id, organization_id, provider, provider_room_id)
    WHERE provider IS NOT NULL AND provider_room_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS telehealth_call_participant (
    id UUID PRIMARY KEY,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('patient', 'practitioner', 'nurse', 'specialist', 'caregiver', 'interpreter', 'related_person', 'observer')),
    participant_role TEXT NOT NULL CHECK (participant_role IN ('host', 'moderator', 'participant', 'observer', 'invitee')),
    participant_state TEXT NOT NULL CHECK (participant_state IN ('invited', 'ringing', 'accepted', 'joining', 'joined', 'left', 'removed', 'declined', 'missed')),
    media_identity TEXT,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    UNIQUE (call_session_id, subject_id),
    UNIQUE (call_session_id, id)
);
CREATE INDEX IF NOT EXISTS idx_telehealth_call_participant_call
    ON telehealth_call_participant (call_session_id, participant_state);

CREATE TABLE IF NOT EXISTS telehealth_call_state_history (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE CASCADE,
    participant_id UUID,
    from_state TEXT CHECK (from_state IS NULL OR from_state IN ('CREATED', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'RECONNECTING', 'COMPLETED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED')),
    to_state TEXT NOT NULL CHECK (to_state IN ('CREATED', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE', 'RECONNECTING', 'COMPLETED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED')),
    reason_code TEXT,
    source TEXT NOT NULL,
    actor_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT fk_telehealth_history_participant_same_call
        FOREIGN KEY (call_session_id, participant_id)
        REFERENCES telehealth_call_participant (call_session_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_telehealth_call_state_history_call_time
    ON telehealth_call_state_history (tenant_id, organization_id, call_session_id, occurred_at, id);

CREATE TABLE IF NOT EXISTS telehealth_waiting_room (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE CASCADE,
    participant_id UUID,
    waiting_state TEXT NOT NULL CHECK (waiting_state IN ('waiting', 'admitted', 'removed', 'expired')),
    admitted_by_actor_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    admitted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    CONSTRAINT fk_telehealth_waiting_room_participant_same_call
        FOREIGN KEY (call_session_id, participant_id)
        REFERENCES telehealth_call_participant (call_session_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_telehealth_waiting_room_active
    ON telehealth_waiting_room (tenant_id, organization_id, call_session_id, waiting_state);

CREATE TABLE IF NOT EXISTS telehealth_device_registration (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    push_subscription_reference TEXT,
    device_state TEXT NOT NULL CHECK (device_state IN ('active', 'inactive', 'revoked')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, organization_id, actor_id, device_id)
);

CREATE TABLE IF NOT EXISTS telehealth_consent_reference (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE CASCADE,
    consent_state TEXT NOT NULL,
    consent_reference TEXT,
    policy_version TEXT NOT NULL,
    decided_by_actor_id TEXT,
    decided_at TIMESTAMPTZ NOT NULL,
    UNIQUE (call_session_id, policy_version)
);

CREATE TABLE IF NOT EXISTS telehealth_call_quality_summary (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE CASCADE,
    participant_id UUID,
    quality_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_telehealth_quality_participant_same_call
        FOREIGN KEY (call_session_id, participant_id)
        REFERENCES telehealth_call_participant (call_session_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_telehealth_quality_per_participant
    ON telehealth_call_quality_summary (call_session_id, participant_id)
    WHERE participant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_telehealth_quality_aggregate
    ON telehealth_call_quality_summary (call_session_id)
    WHERE participant_id IS NULL;

CREATE TABLE IF NOT EXISTS communication_outbox_event (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    correlation_id TEXT,
    causation_id TEXT,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    publish_attempts INTEGER NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    lease_expires_at TIMESTAMPTZ,
    last_error TEXT,
    dead_lettered_at TIMESTAMPTZ,
    dead_letter_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_communication_outbox_ready
    ON communication_outbox_event (available_at, created_at)
    WHERE published_at IS NULL AND dead_lettered_at IS NULL;

CREATE TABLE IF NOT EXISTS telehealth_idempotency_key (
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL,
    call_session_id UUID NOT NULL REFERENCES telehealth_call_session(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, organization_id, actor_id, idempotency_key)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS telehealth_idempotency_key;
DROP TABLE IF EXISTS communication_outbox_event;
DROP TABLE IF EXISTS telehealth_call_quality_summary;
DROP TABLE IF EXISTS telehealth_consent_reference;
DROP TABLE IF EXISTS telehealth_device_registration;
DROP TABLE IF EXISTS telehealth_waiting_room;
DROP TABLE IF EXISTS telehealth_call_state_history;
DROP TABLE IF EXISTS telehealth_call_participant;
DROP TABLE IF EXISTS telehealth_call_session;
-- +goose StatementEnd
