// Package postgres persists the operational CallSession aggregate. Every read
// applies the authorization-derived CallScope in SQL before rows are returned;
// it never loads a tenant-wide result and filters it in application memory.
package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
)

type Repository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) FindByIdempotency(ctx context.Context, scope authorization.CallScope, actorID, key string) (*application.IdempotencyRecord, error) {
	if err := r.ready(scope); err != nil {
		return nil, err
	}
	where, args := scopeWhere(scope, "c", 5)
	query := `SELECT i.tenant_id, i.organization_id, i.actor_id, i.idempotency_key,
        i.request_fingerprint, i.call_session_id, i.created_at
        FROM telehealth_idempotency_key i
        JOIN telehealth_call_session c ON c.id = i.call_session_id
        WHERE i.tenant_id = $1 AND i.organization_id = $2 AND i.actor_id = $3 AND i.idempotency_key = $4
        AND ` + where
	args = append([]any{scope.TenantID, scope.OrganizationID, actorID, key}, args...)
	var record application.IdempotencyRecord
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&record.TenantID, &record.OrganizationID, &record.ActorID, &record.Key,
		&record.Fingerprint, &record.CallID, &record.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (r *Repository) Create(ctx context.Context, record application.CreateRecord) error {
	if r == nil || r.pool == nil {
		return errors.New("postgres call repository is not configured")
	}
	if record.Session == nil || !record.Scope.Allows(record.Session) ||
		record.Idempotency.TenantID != record.Session.TenantID ||
		record.Idempotency.OrganizationID != record.Session.OrganizationID {
		return application.ErrNotFound
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `INSERT INTO telehealth_call_session (
        id, tenant_id, organization_id, patient_id, appointment_id, encounter_id, conversation_id,
        call_type, call_state, provider, provider_room_id, initiated_by_actor_id, version, created_at,
        ringing_at, accepted_at, connecting_at, connected_at, ended_at, end_reason
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )`,
		record.Session.ID, record.Session.TenantID, record.Session.OrganizationID,
		nullableString(record.Session.PatientID), nullableString(record.Session.AppointmentID), nullableString(record.Session.EncounterID), nullableString(record.Session.ConversationID),
		string(record.Session.CallType), string(record.Session.State), nullableString(record.Session.Provider), nullableString(record.Session.ProviderRoomID),
		record.Session.InitiatedBy, record.Session.Version, record.Session.CreatedAt, record.Session.RingingAt,
		record.Session.AcceptedAt, record.Session.ConnectingAt, record.Session.ConnectedAt, record.Session.EndedAt, nullableString(record.Session.EndReason),
	); err != nil {
		return writeError(err)
	}
	for _, participant := range record.Session.Participants {
		if _, err := tx.Exec(ctx, `INSERT INTO telehealth_call_participant (
            id, call_session_id, subject_id, participant_type, participant_role, participant_state,
            media_identity, joined_at, left_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			participant.ID, record.Session.ID, participant.SubjectID, string(participant.Type), string(participant.Role), string(participant.State),
			nullableString(participant.MediaIdentity), participant.JoinedAt, participant.LeftAt,
		); err != nil {
			return writeError(err)
		}
	}
	if err := insertHistory(ctx, tx, record.Session, record.History); err != nil {
		return writeError(err)
	}
	if err := insertOutbox(ctx, tx, record.Session, record.Outbox); err != nil {
		return writeError(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO telehealth_idempotency_key (
        tenant_id, organization_id, actor_id, idempotency_key, request_fingerprint, call_session_id, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		record.Idempotency.TenantID, record.Idempotency.OrganizationID, record.Idempotency.ActorID,
		record.Idempotency.Key, record.Idempotency.Fingerprint, record.Idempotency.CallID, record.Idempotency.CreatedAt,
	); err != nil {
		return writeError(err)
	}
	return tx.Commit(ctx)
}

func (r *Repository) Get(ctx context.Context, scope authorization.CallScope, callID string) (*domain.CallSession, error) {
	if err := r.ready(scope); err != nil {
		return nil, err
	}
	return get(ctx, r.pool, scope, callID)
}

func (r *Repository) List(ctx context.Context, options application.ListOptions) (application.CallPage, error) {
	if err := r.ready(options.Scope); err != nil {
		return application.CallPage{}, err
	}
	limit := options.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	where, args := scopeWhere(options.Scope, "c", 1)
	query := `SELECT ` + callColumns("c") + ` FROM telehealth_call_session c WHERE ` + where +
		fmt.Sprintf(` ORDER BY c.created_at DESC, c.id DESC LIMIT $%d`, len(args)+1)
	args = append(args, limit)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return application.CallPage{}, err
	}
	defer rows.Close()
	page := application.CallPage{Items: make([]*domain.CallSession, 0)}
	for rows.Next() {
		session, err := scanCall(rows)
		if err != nil {
			return application.CallPage{}, err
		}
		participants, err := loadParticipants(ctx, r.pool, session.ID)
		if err != nil {
			return application.CallPage{}, err
		}
		session.Participants = participants
		page.Items = append(page.Items, session)
	}
	if err := rows.Err(); err != nil {
		return application.CallPage{}, err
	}
	return page, nil
}

func (r *Repository) ListHistory(ctx context.Context, options application.HistoryOptions) (application.CallHistoryPage, error) {
	if err := r.ready(options.Scope); err != nil {
		return application.CallHistoryPage{}, err
	}
	limit := options.Limit
	if limit <= 0 || limit > 250 {
		limit = 100
	}
	where, args := scopeWhere(options.Scope, "c", 2)
	query := `SELECT h.id, h.call_session_id, h.from_state, h.to_state, h.reason_code, h.source, h.actor_id, h.occurred_at
        FROM telehealth_call_state_history h
        JOIN telehealth_call_session c ON c.id = h.call_session_id
        WHERE h.call_session_id = $1 AND ` + where +
		fmt.Sprintf(` ORDER BY h.occurred_at ASC, h.id ASC LIMIT $%d`, len(args)+2)
	args = append([]any{options.CallID}, args...)
	args = append(args, limit)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return application.CallHistoryPage{}, err
	}
	defer rows.Close()
	page := application.CallHistoryPage{Items: make([]domain.StateTransition, 0)}
	for rows.Next() {
		transition, err := scanHistory(rows)
		if err != nil {
			return application.CallHistoryPage{}, err
		}
		page.Items = append(page.Items, transition)
	}
	if err := rows.Err(); err != nil {
		return application.CallHistoryPage{}, err
	}
	return page, nil
}

func (r *Repository) Transition(ctx context.Context, record application.TransitionRecord) error {
	if r == nil || r.pool == nil {
		return errors.New("postgres call repository is not configured")
	}
	if record.Session == nil || !record.Scope.Allows(record.Session) {
		return application.ErrNotFound
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	args := []any{
		string(record.Session.State), nullableString(record.Session.Provider), nullableString(record.Session.ProviderRoomID), record.Session.Version,
		record.Session.RingingAt, record.Session.AcceptedAt, record.Session.ConnectingAt, record.Session.ConnectedAt,
		record.Session.EndedAt, nullableString(record.Session.EndReason), record.Session.ID, record.ExpectedVersion,
	}
	where, scopeArgs := scopeWhere(record.Scope, "c", len(args)+1)
	query := `UPDATE telehealth_call_session AS c SET
        call_state = $1, provider = $2, provider_room_id = $3, version = $4,
        ringing_at = $5, accepted_at = $6, connecting_at = $7, connected_at = $8,
        ended_at = $9, end_reason = $10, updated_at = now()
        WHERE c.id = $11 AND c.version = $12 AND ` + where
	args = append(args, scopeArgs...)
	commandTag, err := tx.Exec(ctx, query, args...)
	if err != nil {
		return writeError(err)
	}
	if commandTag.RowsAffected() != 1 {
		return application.ErrConcurrency
	}
	if err := insertHistory(ctx, tx, record.Session, record.History); err != nil {
		return writeError(err)
	}
	if err := insertOutbox(ctx, tx, record.Session, record.Outbox); err != nil {
		return writeError(err)
	}
	return tx.Commit(ctx)
}

func (r *Repository) ready(scope authorization.CallScope) error {
	if r == nil || r.pool == nil {
		return errors.New("postgres call repository is not configured")
	}
	if strings.TrimSpace(scope.TenantID) == "" || strings.TrimSpace(scope.OrganizationID) == "" ||
		(!scope.OrganizationWide && len(scope.PatientIDs) == 0 && len(scope.ParticipantSubjectIDs) == 0) {
		return application.ErrNotFound
	}
	return nil
}

type queryer interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func get(ctx context.Context, q queryer, scope authorization.CallScope, callID string) (*domain.CallSession, error) {
	where, args := scopeWhere(scope, "c", 2)
	query := `SELECT ` + callColumns("c") + ` FROM telehealth_call_session c WHERE c.id = $1 AND ` + where
	args = append([]any{callID}, args...)
	session, err := scanCall(q.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, application.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	participants, err := loadParticipants(ctx, q, session.ID)
	if err != nil {
		return nil, err
	}
	session.Participants = participants
	return session, nil
}

func scopeWhere(scope authorization.CallScope, alias string, firstArg int) (string, []any) {
	clauses := []string{
		fmt.Sprintf("%s.tenant_id = $%d", alias, firstArg),
		fmt.Sprintf("%s.organization_id = $%d", alias, firstArg+1),
	}
	args := []any{scope.TenantID, scope.OrganizationID}
	if scope.OrganizationWide {
		return strings.Join(clauses, " AND "), args
	}
	access := make([]string, 0, 2)
	nextArg := firstArg + len(args)
	if len(scope.PatientIDs) > 0 {
		access = append(access, fmt.Sprintf("%s.patient_id = ANY($%d::text[])", alias, nextArg))
		args = append(args, scope.PatientIDs)
		nextArg++
	}
	if len(scope.ParticipantSubjectIDs) > 0 {
		access = append(access, fmt.Sprintf(`EXISTS (
            SELECT 1 FROM telehealth_call_participant scope_participant
            WHERE scope_participant.call_session_id = %s.id
              AND scope_participant.subject_id = ANY($%d::text[])
        )`, alias, nextArg))
		args = append(args, scope.ParticipantSubjectIDs)
	}
	return strings.Join(append(clauses, "("+strings.Join(access, " OR ")+")"), " AND "), args
}

func callColumns(alias string) string {
	return alias + `.id, ` + alias + `.tenant_id, ` + alias + `.organization_id, ` +
		alias + `.patient_id, ` + alias + `.appointment_id, ` + alias + `.encounter_id, ` + alias + `.conversation_id, ` +
		alias + `.call_type, ` + alias + `.call_state, ` + alias + `.provider, ` + alias + `.provider_room_id, ` +
		alias + `.initiated_by_actor_id, ` + alias + `.version, ` + alias + `.created_at, ` + alias + `.ringing_at, ` +
		alias + `.accepted_at, ` + alias + `.connecting_at, ` + alias + `.connected_at, ` + alias + `.ended_at, ` + alias + `.end_reason`
}

func scanCall(row pgx.Row) (*domain.CallSession, error) {
	var session domain.CallSession
	var patientID, appointmentID, encounterID, conversationID, provider, providerRoomID, endReason *string
	var callType, state string
	var ringingAt, acceptedAt, connectingAt, connectedAt, endedAt *time.Time
	err := row.Scan(
		&session.ID, &session.TenantID, &session.OrganizationID,
		&patientID, &appointmentID, &encounterID, &conversationID,
		&callType, &state, &provider, &providerRoomID,
		&session.InitiatedBy, &session.Version, &session.CreatedAt,
		&ringingAt, &acceptedAt, &connectingAt, &connectedAt, &endedAt, &endReason,
	)
	if err != nil {
		return nil, err
	}
	session.PatientID = stringValue(patientID)
	session.AppointmentID = stringValue(appointmentID)
	session.EncounterID = stringValue(encounterID)
	session.ConversationID = stringValue(conversationID)
	session.CallType = domain.CallType(callType)
	session.State = domain.CallState(state)
	session.Provider = stringValue(provider)
	session.ProviderRoomID = stringValue(providerRoomID)
	session.RingingAt = ringingAt
	session.AcceptedAt = acceptedAt
	session.ConnectingAt = connectingAt
	session.ConnectedAt = connectedAt
	session.EndedAt = endedAt
	session.EndReason = stringValue(endReason)
	return &session, nil
}

func loadParticipants(ctx context.Context, q queryer, callID string) ([]domain.CallParticipant, error) {
	rows, err := q.Query(ctx, `SELECT id, subject_id, participant_type, participant_role, participant_state,
        media_identity, joined_at, left_at
        FROM telehealth_call_participant WHERE call_session_id = $1 ORDER BY id`, callID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	participants := make([]domain.CallParticipant, 0)
	for rows.Next() {
		var participant domain.CallParticipant
		var participantType, role, state string
		var mediaIdentity *string
		var joinedAt, leftAt *time.Time
		if err := rows.Scan(&participant.ID, &participant.SubjectID, &participantType, &role, &state, &mediaIdentity, &joinedAt, &leftAt); err != nil {
			return nil, err
		}
		participant.Type = domain.ParticipantType(participantType)
		participant.Role = domain.ParticipantRole(role)
		participant.State = domain.ParticipantState(state)
		participant.MediaIdentity = stringValue(mediaIdentity)
		participant.JoinedAt = joinedAt
		participant.LeftAt = leftAt
		participants = append(participants, participant)
	}
	return participants, rows.Err()
}

func scanHistory(row pgx.Row) (domain.StateTransition, error) {
	var transition domain.StateTransition
	var fromState, reasonCode, actorID *string
	var toState, source string
	err := row.Scan(
		&transition.ID, &transition.CallSessionID, &fromState, &toState, &reasonCode, &source, &actorID, &transition.OccurredAt,
	)
	if err != nil {
		return domain.StateTransition{}, err
	}
	if fromState != nil {
		from := domain.CallState(*fromState)
		transition.FromState = &from
	}
	transition.ToState = domain.CallState(toState)
	transition.ReasonCode = stringValue(reasonCode)
	transition.Source = source
	transition.ActorID = stringValue(actorID)
	return transition, nil
}

func insertHistory(ctx context.Context, tx pgx.Tx, session *domain.CallSession, history domain.StateTransition) error {
	return execOne(ctx, tx, `INSERT INTO telehealth_call_state_history (
        id, tenant_id, organization_id, call_session_id, from_state, to_state, reason_code, source, actor_id, occurred_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		history.ID, session.TenantID, session.OrganizationID, session.ID, stateValue(history.FromState), string(history.ToState),
		nullableString(history.ReasonCode), history.Source, nullableString(history.ActorID), history.OccurredAt,
	)
}

func insertOutbox(ctx context.Context, tx pgx.Tx, session *domain.CallSession, event domain.OutboxEvent) error {
	if event.TenantID != session.TenantID || event.OrganizationID != session.OrganizationID || event.AggregateID != session.ID {
		return application.ErrConcurrency
	}
	payload, err := json.Marshal(event.Data)
	if err != nil {
		return err
	}
	return execOne(ctx, tx, `INSERT INTO communication_outbox_event (
        id, tenant_id, organization_id, aggregate_type, aggregate_id, event_type, event_version,
        occurred_at, correlation_id, causation_id, payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
		event.ID, event.TenantID, event.OrganizationID, event.AggregateType, event.AggregateID, event.EventType, event.Version,
		event.OccurredAt, nullableString(event.CorrelationID), nullableString(event.CausationID), string(payload),
	)
}

func execOne(ctx context.Context, tx pgx.Tx, sql string, args ...any) error {
	_, err := tx.Exec(ctx, sql, args...)
	return err
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func stateValue(value *domain.CallState) any {
	if value == nil {
		return nil
	}
	return string(*value)
}

func writeError(err error) error {
	var databaseError *pgconn.PgError
	if errors.As(err, &databaseError) && databaseError.Code == "23505" && strings.Contains(databaseError.ConstraintName, "idempotency") {
		return application.ErrIdempotencyExists
	}
	return err
}
