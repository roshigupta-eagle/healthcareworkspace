package labingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/fhirsearch"
	"healthcareworkspace/fhir/internal/fhirstore"
	"healthcareworkspace/fhir/internal/labingestion/hl7v2"
	"healthcareworkspace/fhir/internal/tenant"
)

// Store orchestrates the full ingestion pipeline:
// receive → parse → match patient → normalise → persist FHIR → update log.
type Store struct {
	db       *pgxpool.Pool
	fhir     *fhirstore.Store
	searcher *fhirsearch.Searcher
	norm     *Normalizer
}

// NewStore creates an ingestion Store.
func NewStore(db *pgxpool.Pool, fhir *fhirstore.Store, searcher *fhirsearch.Searcher) *Store {
	return &Store{
		db:       db,
		fhir:     fhir,
		searcher: searcher,
		norm:     NewNormalizer(),
	}
}

// ─── Ingest HL7 v2 ───────────────────────────────────────────────────────────

// IngestHL7v2 processes a raw HL7 v2 ORU^R01 message end-to-end.
// Returns the log record ID and the HL7 ACK string to send back to the caller.
func (s *Store) IngestHL7v2(ctx context.Context, rawMsg string, sourceHint SourceSystem) (string, string, error) {
	tid := tenant.FromContext(ctx)

	// 1. Parse
	msg, parseErr := hl7v2.ParseORU(rawMsg)

	// 2. Determine source system from MSH or hint
	source := sourceHint
	if source == "" || source == SourceUnknown {
		source = detectSource(msg)
	}

	// 3. Write initial log record
	rec := &IngestionRecord{
		TenantID:    tid,
		SourceSystem: source,
		MessageType: FormatHL7v2,
		RawPayload:  rawMsg,
		Status:      StatusReceived,
	}
	if msg != nil {
		rec.MessageID = ptr(msg.MessageControlID)
		rec.SourceFacility = ptr(msg.SendingFacility)
		if msg.Patient.OHIPNumber != "" {
			rec.RawOHIPNumber = ptr(msg.Patient.OHIPNumber)
		}
		// First MRN from PID-3 with type MR
		for _, id := range msg.Patient.InternalIDs {
			if strings.ToUpper(id.IDType) == "MR" || id.IDType == "" {
				rec.RawMRN = ptr(id.ID)
				break
			}
		}
		name := strings.TrimSpace(msg.Patient.FamilyName + "^" + msg.Patient.GivenName)
		if name != "^" && name != "" {
			rec.RawPatientName = ptr(name)
		}
		if msg.Patient.DateOfBirth != "" {
			rec.RawDOB = ptr(msg.Patient.DateOfBirth)
		}
		if len(msg.ResultGroups) > 0 {
			rec.AccessionNumber = ptr(msg.ResultGroups[0].FillerOrderNum)
		}
	}

	if parseErr != nil {
		rec.Status = StatusFailed
		errMsg := parseErr.Error()
		rec.ErrorMessage = &errMsg
		id, _ := s.writeLog(ctx, rec)
		ack := "MSA|AE|||Parse error: " + parseErr.Error()
		return id, ack, parseErr
	}

	// 4. Deduplication check
	if rec.AccessionNumber != nil && *rec.AccessionNumber != "" {
		dup, _ := s.findByAccession(ctx, string(source), *rec.AccessionNumber)
		if dup != "" {
			rec.Status = StatusDuplicate
			rec.ErrorMessage = ptr("Duplicate accession: " + *rec.AccessionNumber)
			id, _ := s.writeLog(ctx, rec)
			ack := hl7v2.BuildACK(msg, hl7v2.AckAA, "Duplicate — already stored as "+dup)
			return id, ack, nil
		}
	}

	rec.Status = StatusParsed
	logID, err := s.writeLog(ctx, rec)
	if err != nil {
		return "", hl7v2.BuildACK(msg, hl7v2.AckAE, "Internal error: "+err.Error()), err
	}

	// 5. Match patient
	patientID, matchErr := s.matchPatient(ctx, msg)
	if matchErr != nil || patientID == "" {
		_ = s.updateLogStatus(ctx, logID, StatusManualReview, ptr("No patient match: "+fmt.Sprint(matchErr)), nil)
		ack := hl7v2.BuildACK(msg, hl7v2.AckAA, "Accepted — awaiting manual patient match")
		return logID, ack, nil
	}
	_ = s.updateLogStatus(ctx, logID, StatusMatched, nil, ptr(patientID))

	// 6. Normalise to FHIR
	normalized, normErr := s.norm.FromHL7(msg, patientID)
	if normErr != nil {
		_ = s.updateLogStatus(ctx, logID, StatusFailed, ptr(normErr.Error()), nil)
		ack := hl7v2.BuildACK(msg, hl7v2.AckAE, "Normalisation error: "+normErr.Error())
		return logID, ack, normErr
	}

	// 7. Persist FHIR resources
	drIDs, obsIDs, storeErr := s.persistFHIR(ctx, normalized)
	if storeErr != nil {
		_ = s.updateLogStatus(ctx, logID, StatusFailed, ptr(storeErr.Error()), nil)
		ack := hl7v2.BuildACK(msg, hl7v2.AckAE, "Storage error: "+storeErr.Error())
		return logID, ack, storeErr
	}

	drID := ""
	if len(drIDs) > 0 {
		drID = drIDs[0]
	}
	_ = s.finalizeLog(ctx, logID, patientID, drID, obsIDs)

	ack := hl7v2.BuildACK(msg, hl7v2.AckAA, "")
	return logID, ack, nil
}

// ─── Ingest FHIR ─────────────────────────────────────────────────────────────

// IngestFHIR processes a FHIR DiagnosticReport or Bundle payload.
func (s *Store) IngestFHIR(ctx context.Context, rawJSON []byte) (string, error) {
	tid := tenant.FromContext(ctx)

	rec := &IngestionRecord{
		TenantID:    tid,
		SourceSystem: SourceFHIRPush,
		MessageType: FormatFHIR,
		RawPayload:  string(rawJSON),
		Status:      StatusReceived,
	}

	normalized, err := s.norm.FromFHIR(rawJSON)
	if err != nil {
		rec.Status = StatusFailed
		rec.ErrorMessage = ptr(err.Error())
		id, _ := s.writeLog(ctx, rec)
		return id, err
	}

	if normalized.AccessionNumber != "" {
		rec.AccessionNumber = ptr(normalized.AccessionNumber)
		dup, _ := s.findByAccession(ctx, string(SourceFHIRPush), normalized.AccessionNumber)
		if dup != "" {
			rec.Status = StatusDuplicate
			rec.ErrorMessage = ptr("Duplicate accession: " + normalized.AccessionNumber)
			id, _ := s.writeLog(ctx, rec)
			return id, nil
		}
	}

	// Extract patient reference from first DiagnosticReport
	patientID := extractPatientFromFHIR(normalized.DiagnosticReports)
	if patientID != "" {
		rec.MatchedPatientID = ptr(patientID)
		rec.Status = StatusMatched
	} else {
		rec.Status = StatusManualReview
		rec.ErrorMessage = ptr("No patient reference in DiagnosticReport")
	}

	logID, err := s.writeLog(ctx, rec)
	if err != nil {
		return "", err
	}

	if patientID == "" {
		return logID, nil
	}

	drIDs, obsIDs, storeErr := s.persistFHIR(ctx, normalized)
	if storeErr != nil {
		_ = s.updateLogStatus(ctx, logID, StatusFailed, ptr(storeErr.Error()), nil)
		return logID, storeErr
	}

	drID := ""
	if len(drIDs) > 0 {
		drID = drIDs[0]
	}
	_ = s.finalizeLog(ctx, logID, patientID, drID, obsIDs)
	return logID, nil
}

// ─── Patient matching ─────────────────────────────────────────────────────────

// matchPatient tries to identify a FHIR Patient.id from HL7 identifiers.
// Priority: OHIP number → MRN → Family name + DOB.
func (s *Store) matchPatient(ctx context.Context, msg *hl7v2.HL7Message) (string, error) {
	// Strategy 1: OHIP number (PID-19) — search identifier system
	if ohip := strings.TrimSpace(msg.Patient.OHIPNumber); ohip != "" {
		id, err := s.searchPatientByIdentifier(ctx, "http://ontario.ca/fhir/sid/hcn", ohip)
		if err == nil && id != "" {
			return id, nil
		}
		// Also try without system (some local systems don't tag the system)
		id, err = s.searchPatientByIdentifier(ctx, "", ohip)
		if err == nil && id != "" {
			return id, nil
		}
	}

	// Strategy 2: MRN from PID-3
	for _, pid := range msg.Patient.InternalIDs {
		if pid.ID == "" {
			continue
		}
		id, err := s.searchPatientByIdentifier(ctx, "", pid.ID)
		if err == nil && id != "" {
			return id, nil
		}
	}

	// Strategy 3: Family name + date of birth
	if msg.Patient.FamilyName != "" && msg.Patient.DateOfBirth != "" {
		id, err := s.searchPatientByNameDOB(ctx, msg.Patient.FamilyName, msg.Patient.DateOfBirth)
		if err == nil && id != "" {
			return id, nil
		}
	}

	return "", fmt.Errorf("no patient match found for %s %s (OHIP:%s)",
		msg.Patient.FamilyName, msg.Patient.GivenName, msg.Patient.OHIPNumber)
}

func (s *Store) searchPatientByIdentifier(ctx context.Context, system, value string) (string, error) {
	tid := tenant.FromContext(ctx)
	var query string
	var args []interface{}
	if system != "" {
		query = `SELECT DISTINCT r.fhir_id FROM fhir_resources r
			JOIN fhir_search_params sp ON sp.tenant_id=r.tenant_id AND sp.resource_type=r.resource_type AND sp.fhir_id=r.fhir_id
			WHERE r.tenant_id=$1 AND r.resource_type='Patient' AND r.is_deleted=false
			  AND sp.param_name='identifier' AND sp.value_system=$2 AND sp.value_string=$3 LIMIT 1`
		args = []interface{}{tid, system, value}
	} else {
		query = `SELECT DISTINCT r.fhir_id FROM fhir_resources r
			JOIN fhir_search_params sp ON sp.tenant_id=r.tenant_id AND sp.resource_type=r.resource_type AND sp.fhir_id=r.fhir_id
			WHERE r.tenant_id=$1 AND r.resource_type='Patient' AND r.is_deleted=false
			  AND sp.param_name='identifier' AND sp.value_string=$2 LIMIT 1`
		args = []interface{}{tid, value}
	}
	var fhirID string
	err := s.db.QueryRow(ctx, query, args...).Scan(&fhirID)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return fhirID, err
}

func (s *Store) searchPatientByNameDOB(ctx context.Context, family, dob string) (string, error) {
	tid := tenant.FromContext(ctx)
	// Convert HL7 YYYYMMDD → ISO date for comparison
	var isoDOB string
	if len(dob) == 8 {
		isoDOB = dob[:4] + "-" + dob[4:6] + "-" + dob[6:8]
	} else {
		isoDOB = dob
	}

	var fhirID string
	err := s.db.QueryRow(ctx, `
		SELECT DISTINCT r.fhir_id
		FROM   fhir_resources r
		JOIN   fhir_search_params sp_name ON sp_name.tenant_id=r.tenant_id
		       AND sp_name.resource_type=r.resource_type AND sp_name.fhir_id=r.fhir_id
		       AND sp_name.param_name='family'
		WHERE  r.tenant_id=$1 AND r.resource_type='Patient' AND r.is_deleted=false
		  AND  LOWER(sp_name.value_string) = LOWER($2)
		  AND  (r.data->>'birthDate') = $3
		LIMIT 1`,
		tid, family, isoDOB,
	).Scan(&fhirID)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return fhirID, err
}

// ─── FHIR resource persistence ────────────────────────────────────────────────

func (s *Store) persistFHIR(ctx context.Context, result *NormalizedResult) ([]string, []string, error) {
	var drIDs []string
	var obsIDs []string

	// Store observations first (DiagnosticReport may reference them)
	for _, obsJSON := range result.Observations {
		res, err := s.fhir.Create(ctx, "Observation", obsJSON)
		if err != nil {
			return nil, nil, fmt.Errorf("store observation: %w", err)
		}
		obsIDs = append(obsIDs, extractID(res.Data))
		_ = s.searcher.Index(ctx, "Observation", extractID(res.Data), res.Data)
	}

	for _, drJSON := range result.DiagnosticReports {
		res, err := s.fhir.Create(ctx, "DiagnosticReport", drJSON)
		if err != nil {
			return nil, nil, fmt.Errorf("store diagnosticreport: %w", err)
		}
		drIDs = append(drIDs, extractID(res.Data))
		_ = s.searcher.Index(ctx, "DiagnosticReport", extractID(res.Data), res.Data)
	}

	return drIDs, obsIDs, nil
}

// ─── Log operations ───────────────────────────────────────────────────────────

func (s *Store) writeLog(ctx context.Context, rec *IngestionRecord) (string, error) {
	tid := tenant.FromContext(ctx)
	id := uuid.New().String()
	_, err := s.db.Exec(ctx, `
		INSERT INTO lab_ingestion_log
			(id, tenant_id, source_system, source_facility, message_type, message_id,
			 accession_number, raw_ohip_number, raw_mrn, raw_patient_name, raw_dob,
			 matched_patient_id, status, error_message, raw_payload)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		id, tid,
		string(rec.SourceSystem), rec.SourceFacility, string(rec.MessageType),
		rec.MessageID, rec.AccessionNumber,
		rec.RawOHIPNumber, rec.RawMRN, rec.RawPatientName, rec.RawDOB,
		rec.MatchedPatientID,
		string(rec.Status), rec.ErrorMessage,
		rec.RawPayload,
	)
	return id, err
}

func (s *Store) updateLogStatus(ctx context.Context, logID string, status IngestionStatus, errMsg *string, patientID *string) error {
	_, err := s.db.Exec(ctx, `
		UPDATE lab_ingestion_log
		SET status=$1, error_message=COALESCE($2,error_message),
		    matched_patient_id=COALESCE($3,matched_patient_id),
		    updated_at=now()
		WHERE id=$4`,
		string(status), errMsg, patientID, logID,
	)
	return err
}

func (s *Store) finalizeLog(ctx context.Context, logID, patientID, drID string, obsIDs []string) error {
	now := time.Now().UTC()
	_, err := s.db.Exec(ctx, `
		UPDATE lab_ingestion_log
		SET status=$1, matched_patient_id=$2,
		    diagnostic_report_id=$3, observation_ids=$4,
		    processed_at=$5, updated_at=now()
		WHERE id=$6`,
		string(StatusStored), patientID, drID,
		obsIDs,
		now, logID,
	)
	return err
}

func (s *Store) findByAccession(ctx context.Context, source, accession string) (string, error) {
	tid := tenant.FromContext(ctx)
	var id string
	err := s.db.QueryRow(ctx, `
		SELECT id FROM lab_ingestion_log
		WHERE  tenant_id=$1 AND source_system=$2 AND accession_number=$3
		  AND  status NOT IN ('FAILED')
		LIMIT 1`,
		tid, source, accession,
	).Scan(&id)
	if err == pgx.ErrNoRows {
		return "", nil
	}
	return id, err
}

// ─── Queue / List operations ──────────────────────────────────────────────────

// GetRecord returns a single ingestion log record.
func (s *Store) GetRecord(ctx context.Context, id string) (*IngestionRecord, error) {
	tid := tenant.FromContext(ctx)
	row := s.db.QueryRow(ctx, `
		SELECT id, tenant_id, source_system, source_facility, message_type, message_id,
		       accession_number, raw_ohip_number, raw_mrn, raw_patient_name, raw_dob,
		       matched_patient_id, status, error_message, retry_count,
		       diagnostic_report_id, observation_ids,
		       raw_payload, parsed_json, received_at, processed_at, created_at, updated_at
		FROM   lab_ingestion_log
		WHERE  tenant_id=$1 AND id=$2`,
		tid, id,
	)
	return scanRecord(row)
}

// ListRecords returns ingestion log records filtered by status.
func (s *Store) ListRecords(ctx context.Context, status, source string, limit int) ([]IngestionRecord, error) {
	tid := tenant.FromContext(ctx)
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.Query(ctx, `
		SELECT id, tenant_id, source_system, source_facility, message_type, message_id,
		       accession_number, raw_ohip_number, raw_mrn, raw_patient_name, raw_dob,
		       matched_patient_id, status, error_message, retry_count,
		       diagnostic_report_id, observation_ids,
		       raw_payload, parsed_json, received_at, processed_at, created_at, updated_at
		FROM   lab_ingestion_log
		WHERE  tenant_id=$1
		  AND  ($2='' OR status=$2)
		  AND  ($3='' OR source_system=$3)
		ORDER  BY received_at DESC
		LIMIT  $4`,
		tid, status, source, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRecords(rows)
}

// GetSummary returns counts by status and source.
func (s *Store) GetSummary(ctx context.Context) (*IngestionSummary, error) {
	tid := tenant.FromContext(ctx)
	rows, err := s.db.Query(ctx, `
		SELECT status, source_system, COUNT(*)
		FROM   lab_ingestion_log
		WHERE  tenant_id=$1
		GROUP  BY status, source_system`,
		tid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sum := &IngestionSummary{
		ByStatus: make(map[string]int),
		BySource: make(map[string]int),
	}
	for rows.Next() {
		var status, source string
		var cnt int
		if err := rows.Scan(&status, &source, &cnt); err != nil {
			return nil, err
		}
		sum.ByStatus[status] += cnt
		sum.BySource[source] += cnt
		sum.Total += cnt
	}

	recent, err := s.ListRecords(ctx, "", "", 20)
	if err == nil {
		sum.RecentRecords = recent
	}
	return sum, rows.Err()
}

// ManualMatch sets the matched patient on a MANUAL_REVIEW record and re-runs FHIR storage.
func (s *Store) ManualMatch(ctx context.Context, logID, patientID string) error {
	rec, err := s.GetRecord(ctx, logID)
	if err != nil {
		return fmt.Errorf("get record: %w", err)
	}
	if rec.Status != StatusManualReview {
		return fmt.Errorf("record %s is in status %s, expected MANUAL_REVIEW", logID, rec.Status)
	}

	// Re-parse and normalise with the provided patient ID
	msg, parseErr := hl7v2.ParseORU(rec.RawPayload)
	if parseErr != nil {
		return fmt.Errorf("re-parse failed: %w", parseErr)
	}
	normalized, normErr := NewNormalizer().FromHL7(msg, patientID)
	if normErr != nil {
		return fmt.Errorf("normalise failed: %w", normErr)
	}
	drIDs, obsIDs, storeErr := s.persistFHIR(ctx, normalized)
	if storeErr != nil {
		return fmt.Errorf("store FHIR failed: %w", storeErr)
	}
	drID := ""
	if len(drIDs) > 0 {
		drID = drIDs[0]
	}
	return s.finalizeLog(ctx, logID, patientID, drID, obsIDs)
}

// RetryFailed re-processes a FAILED record from scratch.
func (s *Store) RetryFailed(ctx context.Context, logID string) error {
	rec, err := s.GetRecord(ctx, logID)
	if err != nil {
		return err
	}
	if rec.Status != StatusFailed {
		return fmt.Errorf("record %s is %s, not FAILED", logID, rec.Status)
	}
	// Increment retry count
	_, _ = s.db.Exec(ctx,
		`UPDATE lab_ingestion_log SET retry_count=retry_count+1, status='RECEIVED', error_message=NULL, updated_at=now() WHERE id=$1`,
		logID,
	)
	// Re-ingest
	_, _, err = s.IngestHL7v2(ctx, rec.RawPayload, rec.SourceSystem)
	return err
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func detectSource(msg *hl7v2.HL7Message) SourceSystem {
	if msg == nil {
		return SourceUnknown
	}
	fa := strings.ToUpper(msg.SendingFacility)
	ap := strings.ToUpper(msg.SendingApplication)
	switch {
	case strings.Contains(fa, "LIFELABS") || strings.Contains(ap, "LIFELABS"):
		return SourceLifeLabs
	case strings.Contains(fa, "DYNACARE") || strings.Contains(ap, "DYNACARE"):
		return SourceDynacare
	case strings.Contains(fa, "MOHLTC") || strings.Contains(fa, "OLIS") || strings.Contains(ap, "OLIS"):
		return SourceOLIS
	default:
		return SourceInstrument
	}
}

func extractPatientFromFHIR(reports []json.RawMessage) string {
	for _, raw := range reports {
		var dr map[string]json.RawMessage
		if err := json.Unmarshal(raw, &dr); err != nil {
			continue
		}
		subjectRaw, ok := dr["subject"]
		if !ok {
			continue
		}
		var sub struct {
			Reference string `json:"reference"`
		}
		if err := json.Unmarshal(subjectRaw, &sub); err != nil {
			continue
		}
		if strings.HasPrefix(sub.Reference, "Patient/") {
			return strings.TrimPrefix(sub.Reference, "Patient/")
		}
	}
	return ""
}

func extractID(data json.RawMessage) string {
	var obj struct{ ID string `json:"id"` }
	_ = json.Unmarshal(data, &obj)
	return obj.ID
}

func ptr[T any](v T) *T { return &v }

// ─── Row scanners ─────────────────────────────────────────────────────────────

func scanRecord(row pgx.Row) (*IngestionRecord, error) {
	r := &IngestionRecord{}
	var src, msgType, status string
	var parsedJSON []byte
	err := row.Scan(
		&r.ID, &r.TenantID, &src, &r.SourceFacility, &msgType, &r.MessageID,
		&r.AccessionNumber, &r.RawOHIPNumber, &r.RawMRN, &r.RawPatientName, &r.RawDOB,
		&r.MatchedPatientID, &status, &r.ErrorMessage, &r.RetryCount,
		&r.DiagnosticReportID, &r.ObservationIDs,
		&r.RawPayload, &parsedJSON, &r.ReceivedAt, &r.ProcessedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	r.SourceSystem = SourceSystem(src)
	r.MessageType = MessageFormat(msgType)
	r.Status = IngestionStatus(status)
	r.ParsedJSON = parsedJSON
	return r, nil
}

func scanRecords(rows pgx.Rows) ([]IngestionRecord, error) {
	var out []IngestionRecord
	for rows.Next() {
		r := &IngestionRecord{}
		var src, msgType, status string
		var parsedJSON []byte
		if err := rows.Scan(
			&r.ID, &r.TenantID, &src, &r.SourceFacility, &msgType, &r.MessageID,
			&r.AccessionNumber, &r.RawOHIPNumber, &r.RawMRN, &r.RawPatientName, &r.RawDOB,
			&r.MatchedPatientID, &status, &r.ErrorMessage, &r.RetryCount,
			&r.DiagnosticReportID, &r.ObservationIDs,
			&r.RawPayload, &parsedJSON, &r.ReceivedAt, &r.ProcessedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		r.SourceSystem = SourceSystem(src)
		r.MessageType = MessageFormat(msgType)
		r.Status = IngestionStatus(status)
		r.ParsedJSON = parsedJSON
		out = append(out, *r)
	}
	return out, rows.Err()
}
