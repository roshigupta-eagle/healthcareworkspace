package cardiology

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/tenant"
)

// Store handles all DB operations for cardiology tables.
type Store struct {
	db *pgxpool.Pool
}

// NewStore creates a Store backed by the given pool.
func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// ─── Visits ──────────────────────────────────────────────────────────────────

// CreateVisit inserts a new visit state row and returns it.
func (s *Store) CreateVisit(ctx context.Context, req CreateVisitRequest) (*VisitStateRow, error) {
	tid := tenant.FromContext(ctx)
	encID := uuid.New().String()
	priority := req.Priority
	if priority == "" {
		priority = PriorityNormal
	}
	var initState VisitState
	if req.ReferralID != "" {
		initState = StateReferralReceived
	} else {
		initState = StateAppointmentConfirmed
	}

	var appointmentID, referralID, chiefComplaint *string
	if req.AppointmentID != "" {
		appointmentID = &req.AppointmentID
	}
	if req.ReferralID != "" {
		referralID = &req.ReferralID
	}
	if req.ChiefComplaint != "" {
		chiefComplaint = &req.ChiefComplaint
	}

	row := &VisitStateRow{}
	err := s.db.QueryRow(ctx, `
		INSERT INTO cardiology_visit_state
			(tenant_id, encounter_id, patient_id, appointment_id, referral_id,
			 current_state, visit_type, priority, chief_complaint)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, tenant_id, encounter_id, patient_id, appointment_id, referral_id,
		          current_state, previous_state, visit_type, priority,
		          assigned_physician_id, assigned_nurse_id, current_room_id, chief_complaint,
		          arrived_at, state_entered_at, discharged_at, metadata, created_at, updated_at`,
		tid, encID, req.PatientID, appointmentID, referralID,
		string(initState), string(req.VisitType), string(priority), chiefComplaint,
	).Scan(
		&row.ID, &row.TenantID, &row.EncounterID, &row.PatientID,
		&row.AppointmentID, &row.ReferralID,
		&row.CurrentState, &row.PreviousState, &row.VisitType, &row.Priority,
		&row.AssignedPhysicianID, &row.AssignedNurseID, &row.CurrentRoomID, &row.ChiefComplaint,
		&row.ArrivedAt, &row.StateEnteredAt, &row.DischargedAt,
		&row.Metadata, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create visit: %w", err)
	}
	return row, nil
}

// GetVisit returns the current state for a single encounter.
func (s *Store) GetVisit(ctx context.Context, encounterID string) (*VisitStateRow, error) {
	tid := tenant.FromContext(ctx)
	row := &VisitStateRow{}
	err := s.db.QueryRow(ctx, `
		SELECT id, tenant_id, encounter_id, patient_id, appointment_id, referral_id,
		       current_state, previous_state, visit_type, priority,
		       assigned_physician_id, assigned_nurse_id, current_room_id, chief_complaint,
		       arrived_at, state_entered_at, discharged_at, metadata, created_at, updated_at
		FROM   cardiology_visit_state
		WHERE  tenant_id=$1 AND encounter_id=$2`,
		tid, encounterID,
	).Scan(
		&row.ID, &row.TenantID, &row.EncounterID, &row.PatientID,
		&row.AppointmentID, &row.ReferralID,
		&row.CurrentState, &row.PreviousState, &row.VisitType, &row.Priority,
		&row.AssignedPhysicianID, &row.AssignedNurseID, &row.CurrentRoomID, &row.ChiefComplaint,
		&row.ArrivedAt, &row.StateEnteredAt, &row.DischargedAt,
		&row.Metadata, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("visit not found: %s", encounterID)
		}
		return nil, fmt.Errorf("get visit: %w", err)
	}
	return row, nil
}

// ListVisits returns all visits for the tenant, optionally filtered by state.
func (s *Store) ListVisits(ctx context.Context, state string) ([]VisitStateRow, error) {
	tid := tenant.FromContext(ctx)
	q := `
		SELECT id, tenant_id, encounter_id, patient_id, appointment_id, referral_id,
		       current_state, previous_state, visit_type, priority,
		       assigned_physician_id, assigned_nurse_id, current_room_id, chief_complaint,
		       arrived_at, state_entered_at, discharged_at, metadata, created_at, updated_at
		FROM   cardiology_visit_state
		WHERE  tenant_id=$1 AND ($2='' OR current_state=$2)
		ORDER BY
		    CASE priority
		        WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1
		        WHEN 'NORMAL' THEN 2 ELSE 3
		    END,
		    state_entered_at ASC`

	rows, err := s.db.Query(ctx, q, tid, state)
	if err != nil {
		return nil, fmt.Errorf("list visits: %w", err)
	}
	defer rows.Close()
	return scanVisitRows(rows)
}

// ApplyTransition atomically updates the visit state and appends an event.
// Returns the updated visit row.
func (s *Store) ApplyTransition(
	ctx context.Context,
	encounterID string,
	t Transition,
	req TransitionRequest,
) (*VisitStateRow, error) {
	tid := tenant.FromContext(ctx)

	var roomID *string
	if req.RoomID != "" {
		roomID = &req.RoomID
	}
	var notes *string
	if req.Notes != "" {
		notes = &req.Notes
	}
	var actorID *string
	if req.ActorID != "" {
		actorID = &req.ActorID
	}
	actorRole := req.ActorRole

	payloadBytes, _ := json.Marshal(req.Payload)

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Set arrived_at on first physical arrival
	arrivedUpdate := ""
	if t.To == StatePatientArrived || t.To == StateCheckingIn {
		arrivedUpdate = ", arrived_at = COALESCE(arrived_at, now())"
	}
	// Set discharged_at when fully done
	dischargedUpdate := ""
	if t.To == StateDischarged || t.To == StateCancelled || t.To == StateNoShow {
		dischargedUpdate = ", discharged_at = now()"
	}

	// Physician / nurse assignment carried in payload
	physicianUpdate := ""
	nurseUpdate := ""
	if t.Event == EvtPhysicianAssigned || t.Event == EvtPhysicianEntered {
		physicianUpdate = ", assigned_physician_id = $6"
	}
	if t.Event == EvtNursingStarted || t.Event == EvtPatientRoomed {
		nurseUpdate = ", assigned_nurse_id = $6"
	}
	_ = physicianUpdate
	_ = nurseUpdate

	updSQL := fmt.Sprintf(`
		UPDATE cardiology_visit_state
		SET    previous_state    = current_state,
		       current_state     = $1,
		       current_room_id   = COALESCE($2, current_room_id),
		       state_entered_at  = now(),
		       updated_at        = now()
		       %s %s
		WHERE  tenant_id = $3 AND encounter_id = $4
		RETURNING id, tenant_id, encounter_id, patient_id, appointment_id, referral_id,
		          current_state, previous_state, visit_type, priority,
		          assigned_physician_id, assigned_nurse_id, current_room_id, chief_complaint,
		          arrived_at, state_entered_at, discharged_at, metadata, created_at, updated_at`,
		arrivedUpdate, dischargedUpdate)

	row := &VisitStateRow{}
	err = tx.QueryRow(ctx, updSQL, string(t.To), roomID, tid, encounterID).Scan(
		&row.ID, &row.TenantID, &row.EncounterID, &row.PatientID,
		&row.AppointmentID, &row.ReferralID,
		&row.CurrentState, &row.PreviousState, &row.VisitType, &row.Priority,
		&row.AssignedPhysicianID, &row.AssignedNurseID, &row.CurrentRoomID, &row.ChiefComplaint,
		&row.ArrivedAt, &row.StateEnteredAt, &row.DischargedAt,
		&row.Metadata, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update visit state: %w", err)
	}

	fromState := t.From
	_, err = tx.Exec(ctx, `
		INSERT INTO cardiology_events
			(tenant_id, encounter_id, patient_id, event_type, from_state, to_state,
			 actor_id, actor_role, room_id, notes, payload)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		tid, encounterID, row.PatientID,
		string(req.Event), string(fromState), string(t.To),
		actorID, string(actorRole), roomID, notes, payloadBytes,
	)
	if err != nil {
		return nil, fmt.Errorf("append event: %w", err)
	}

	// Auto-create queue item when the transition mandates it
	if t.AutoEnqueue != "" {
		title := buildQueueTitle(t.AutoEnqueue, row)
		_, err = tx.Exec(ctx, `
			INSERT INTO cardiology_queue_items
				(tenant_id, queue_name, encounter_id, patient_id, appointment_id,
				 title, priority)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			tid, string(t.AutoEnqueue), encounterID, row.PatientID,
			row.AppointmentID, title, priorityToInt(row.Priority),
		)
		if err != nil {
			return nil, fmt.Errorf("enqueue item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit transition: %w", err)
	}
	return row, nil
}

// ─── Events ───────────────────────────────────────────────────────────────────

// GetEvents returns the full event history for an encounter, oldest first.
func (s *Store) GetEvents(ctx context.Context, encounterID string) ([]EventRow, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT id, tenant_id, sequence_no, encounter_id, patient_id,
		       event_type, from_state, to_state,
		       actor_id, actor_role, room_id, notes, payload, occurred_at
		FROM   cardiology_events
		WHERE  tenant_id=$1 AND encounter_id=$2
		ORDER  BY sequence_no ASC`,
		tid, encounterID,
	)
	if err != nil {
		return nil, fmt.Errorf("get events: %w", err)
	}
	defer rows.Close()
	return scanEventRows(rows)
}

// RecentEvents returns the most recent n events across all encounters.
func (s *Store) RecentEvents(ctx context.Context, n int) ([]EventRow, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT id, tenant_id, sequence_no, encounter_id, patient_id,
		       event_type, from_state, to_state,
		       actor_id, actor_role, room_id, notes, payload, occurred_at
		FROM   cardiology_events
		WHERE  tenant_id=$1
		ORDER  BY sequence_no DESC
		LIMIT  $2`,
		tid, n,
	)
	if err != nil {
		return nil, fmt.Errorf("recent events: %w", err)
	}
	defer rows.Close()
	return scanEventRows(rows)
}

// ─── Queues ───────────────────────────────────────────────────────────────────

// EnqueueItem inserts a new work-queue item.
func (s *Store) EnqueueItem(ctx context.Context, item *QueueItem) (string, error) {
	tid := tenant.FromContext(ctx)
	id := uuid.New().String()
	payloadBytes := item.Payload
	if payloadBytes == nil {
		payloadBytes = []byte("{}")
	}
	_, err := s.db.Exec(ctx, `
		INSERT INTO cardiology_queue_items
			(id, tenant_id, queue_name, encounter_id, patient_id, appointment_id,
			 title, description, priority, payload)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, tid, string(item.QueueName), item.EncounterID, item.PatientID,
		item.AppointmentID, item.Title, item.Description,
		item.Priority, payloadBytes,
	)
	if err != nil {
		return "", fmt.Errorf("enqueue item: %w", err)
	}
	return id, nil
}

// GetQueueItems returns items for a queue, optionally filtered by status.
func (s *Store) GetQueueItems(ctx context.Context, queueName, status string) ([]QueueItem, error) {
	tid := tenant.FromContext(ctx)
	if status == "" {
		status = "PENDING"
	}
	rows, err := s.db.Query(ctx, `
		SELECT id, tenant_id, queue_name, encounter_id, patient_id, appointment_id,
		       title, description, priority, status,
		       assigned_to_id, due_at, started_at, completed_at,
		       payload, created_at, updated_at
		FROM   cardiology_queue_items
		WHERE  tenant_id=$1
		  AND  ($2='' OR queue_name=$2)
		  AND  ($3='' OR status=$3)
		ORDER  BY priority ASC, created_at ASC`,
		tid, queueName, status,
	)
	if err != nil {
		return nil, fmt.Errorf("get queue items: %w", err)
	}
	defer rows.Close()
	return scanQueueRows(rows)
}

// ClaimQueueItem marks an item IN_PROGRESS and assigns it to an actor.
func (s *Store) ClaimQueueItem(ctx context.Context, itemID, assignedToID string) error {
	tid := tenant.FromContext(ctx)
	tag, err := s.db.Exec(ctx, `
		UPDATE cardiology_queue_items
		SET    status='IN_PROGRESS', assigned_to_id=$1, started_at=now(), updated_at=now()
		WHERE  tenant_id=$2 AND id=$3 AND status='PENDING'`,
		assignedToID, tid, itemID,
	)
	if err != nil {
		return fmt.Errorf("claim queue item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("queue item %s not found or already claimed", itemID)
	}
	return nil
}

// CompleteQueueItem marks an item COMPLETED.
func (s *Store) CompleteQueueItem(ctx context.Context, itemID string) error {
	tid := tenant.FromContext(ctx)
	tag, err := s.db.Exec(ctx, `
		UPDATE cardiology_queue_items
		SET    status='COMPLETED', completed_at=now(), updated_at=now()
		WHERE  tenant_id=$1 AND id=$2`,
		tid, itemID,
	)
	if err != nil {
		return fmt.Errorf("complete queue item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("queue item %s not found", itemID)
	}
	return nil
}

// QueueSummaries returns pending/in-progress counts for every queue.
func (s *Store) QueueSummaries(ctx context.Context) ([]QueueSummary, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT queue_name,
		       COUNT(*) FILTER (WHERE status='PENDING')     AS pending,
		       COUNT(*) FILTER (WHERE status='IN_PROGRESS') AS in_progress
		FROM   cardiology_queue_items
		WHERE  tenant_id=$1 AND status IN ('PENDING','IN_PROGRESS')
		GROUP  BY queue_name
		ORDER  BY queue_name`,
		tid,
	)
	if err != nil {
		return nil, fmt.Errorf("queue summaries: %w", err)
	}
	defer rows.Close()

	var out []QueueSummary
	for rows.Next() {
		var qs QueueSummary
		var name string
		if err := rows.Scan(&name, &qs.Pending, &qs.InProgress); err != nil {
			return nil, err
		}
		qs.Name = QueueName(name)
		out = append(out, qs)
	}
	return out, rows.Err()
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

// GetRooms returns all active rooms with current occupants.
func (s *Store) GetRooms(ctx context.Context) ([]Room, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT id, tenant_id, name, room_type, capacity, fhir_location_id, is_active
		FROM   cardiology_rooms
		WHERE  tenant_id=$1 AND is_active=true
		ORDER  BY room_type, id`,
		tid,
	)
	if err != nil {
		return nil, fmt.Errorf("get rooms: %w", err)
	}
	defer rows.Close()

	var rooms []Room
	for rows.Next() {
		var r Room
		if err := rows.Scan(&r.ID, &r.TenantID, &r.Name, &r.RoomType,
			&r.Capacity, &r.FHIRLocationID, &r.IsActive); err != nil {
			return nil, err
		}
		rooms = append(rooms, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Attach current occupants
	occRows, err := s.db.Query(ctx, `
		SELECT current_room_id, encounter_id, patient_id, current_state
		FROM   cardiology_visit_state
		WHERE  tenant_id=$1 AND current_room_id IS NOT NULL AND discharged_at IS NULL`,
		tid,
	)
	if err != nil {
		return nil, fmt.Errorf("get occupants: %w", err)
	}
	defer occRows.Close()

	occByRoom := make(map[string][]RoomOccupant)
	for occRows.Next() {
		var roomID, encID, patID, stateStr string
		if err := occRows.Scan(&roomID, &encID, &patID, &stateStr); err != nil {
			return nil, err
		}
		occByRoom[roomID] = append(occByRoom[roomID], RoomOccupant{
			EncounterID:  encID,
			PatientID:    patID,
			CurrentState: VisitState(stateStr),
		})
	}
	if err := occRows.Err(); err != nil {
		return nil, err
	}

	for i := range rooms {
		rooms[i].Occupants = occByRoom[rooms[i].ID]
	}
	return rooms, nil
}

// SetLocationID updates a room's fhir_location_id after seeding.
func (s *Store) SetLocationID(ctx context.Context, roomID, locationID string) error {
	tid := tenant.FromContext(ctx)
	_, err := s.db.Exec(ctx,
		`UPDATE cardiology_rooms SET fhir_location_id=$1 WHERE tenant_id=$2 AND id=$3`,
		locationID, tid, roomID,
	)
	return err
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

// VisitStateCounts returns a map of state → count for active visits today.
func (s *Store) VisitStateCounts(ctx context.Context) (map[string]int, int, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT current_state, COUNT(*)
		FROM   cardiology_visit_state
		WHERE  tenant_id=$1 AND (discharged_at IS NULL OR discharged_at::date = CURRENT_DATE)
		GROUP  BY current_state`,
		tid,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("visit state counts: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	total := 0
	for rows.Next() {
		var state string
		var cnt int
		if err := rows.Scan(&state, &cnt); err != nil {
			return nil, 0, err
		}
		counts[state] = cnt
		total += cnt
	}
	return counts, total, rows.Err()
}

// ─── Reset (simulation only) ──────────────────────────────────────────────────

// ResetSimulation deletes all cardiology rows for the tenant (queue, events, visits).
func (s *Store) ResetSimulation(ctx context.Context) error {
	tid := tenant.FromContext(ctx)
	for _, tbl := range []string{
		"cardiology_queue_items",
		"cardiology_events",
		"cardiology_visit_state",
	} {
		if _, err := s.db.Exec(ctx,
			"DELETE FROM "+tbl+" WHERE tenant_id=$1", tid); err != nil {
			return fmt.Errorf("reset %s: %w", tbl, err)
		}
	}
	return nil
}

// ─── Row scanners ─────────────────────────────────────────────────────────────

func scanVisitRows(rows pgx.Rows) ([]VisitStateRow, error) {
	var out []VisitStateRow
	for rows.Next() {
		var r VisitStateRow
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.EncounterID, &r.PatientID,
			&r.AppointmentID, &r.ReferralID,
			&r.CurrentState, &r.PreviousState, &r.VisitType, &r.Priority,
			&r.AssignedPhysicianID, &r.AssignedNurseID, &r.CurrentRoomID, &r.ChiefComplaint,
			&r.ArrivedAt, &r.StateEnteredAt, &r.DischargedAt,
			&r.Metadata, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func scanEventRows(rows pgx.Rows) ([]EventRow, error) {
	var out []EventRow
	for rows.Next() {
		var e EventRow
		var fromState, toState, evtType, actorRole *string
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.SequenceNo, &e.EncounterID, &e.PatientID,
			&evtType, &fromState, &toState,
			&e.ActorID, &actorRole, &e.RoomID, &e.Notes, &e.Payload, &e.OccurredAt,
		); err != nil {
			return nil, err
		}
		if evtType != nil {
			e.EventType = EventType(*evtType)
		}
		if fromState != nil {
			fs := VisitState(*fromState)
			e.FromState = &fs
		}
		if toState != nil {
			e.ToState = VisitState(*toState)
		}
		if actorRole != nil {
			ar := ActorRole(*actorRole)
			e.ActorRole = &ar
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func scanQueueRows(rows pgx.Rows) ([]QueueItem, error) {
	var out []QueueItem
	for rows.Next() {
		var q QueueItem
		var queueName string
		if err := rows.Scan(
			&q.ID, &q.TenantID, &queueName,
			&q.EncounterID, &q.PatientID, &q.AppointmentID,
			&q.Title, &q.Description, &q.Priority, &q.Status,
			&q.AssignedToID, &q.DueAt, &q.StartedAt, &q.CompletedAt,
			&q.Payload, &q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, err
		}
		q.QueueName = QueueName(queueName)
		out = append(out, q)
	}
	return out, rows.Err()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func buildQueueTitle(q QueueName, v *VisitStateRow) string {
	titles := map[QueueName]string{
		QueueReferralReview: "Triage referral",
		QueueScheduling:     "Schedule appointment",
		QueueCheckIn:        "Check-in patient",
		QueueNursing:        "Nursing assessment",
		QueuePhysician:      "Physician consult",
		QueueECG:            "Perform ECG",
		QueueEcho:           "Perform echocardiogram",
		QueueStressTest:     "Perform stress test",
		QueueHolter:         "Setup Holter monitor",
		QueueResultsReview:  "Review results",
		QueueCheckout:       "Patient checkout",
		QueueBilling:        "Process billing claim",
		QueueFollowUp:       "Schedule follow-up",
	}
	title := titles[q]
	if title == "" {
		title = string(q)
	}
	return fmt.Sprintf("%s — patient %s", title, v.PatientID)
}

func priorityToInt(p Priority) int {
	switch p {
	case PriorityUrgent:
		return 0
	case PriorityHigh:
		return 25
	case PriorityNormal:
		return 50
	case PriorityLow:
		return 75
	}
	return 50
}

// now is a helper so tests can override time.
var now = func() time.Time { return time.Now().UTC() }
