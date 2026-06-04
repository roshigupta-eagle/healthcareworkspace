package cardiology

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"healthcareworkspace/fhir/internal/fhirsearch"
	"healthcareworkspace/fhir/internal/fhirstore"
	"healthcareworkspace/fhir/internal/tenant"
)

// Simulator seeds a cardiologist practice with realistic FHIR resources
// and drives visit state-machine transitions for demonstration purposes.
type Simulator struct {
	db       *pgxpool.Pool
	store    *Store
	fhir     *fhirstore.Store
	searcher *fhirsearch.Searcher
}

// NewSimulator creates a Simulator.
func NewSimulator(db *pgxpool.Pool, cs *Store, fs *fhirstore.Store, searcher *fhirsearch.Searcher) *Simulator {
	return &Simulator{db: db, store: cs, fhir: fs, searcher: searcher}
}

// SeedResult summarises what was created.
type SeedResult struct {
	Practitioners []string `json:"practitioners"`
	Patients      []string `json:"patients"`
	Locations     []string `json:"locations"`
	Visits        []string `json:"visits"`
}

// ─── Practice Staff ───────────────────────────────────────────────────────────

type practitionerSeed struct {
	Family    string
	Given     string
	Role      string // used in PractitionerRole / notes
	Qualifier string // MD, RN, etc.
}

var practitionerSeeds = []practitionerSeed{
	{"Chen", "Sarah", "Cardiologist", "MD"},
	{"Torres", "Michael", "Cardiologist", "MD"},
	{"Rodriguez", "Amy", "Nurse", "RN"},
	{"Kim", "James", "Nurse", "RN"},
	{"Santos", "Maria", "Receptionist", ""},
	{"Park", "David", "Receptionist", ""},
	{"Chang", "Lisa", "ECG Technician", ""},
	{"Wilson", "Tom", "Sonographer", "RDCS"},
	{"Green", "Rachel", "Billing Specialist", ""},
}

// ─── Test Patients ────────────────────────────────────────────────────────────

type patientSeed struct {
	Family         string
	Given          string
	BirthDate      string
	Gender         string
	ChiefComplaint string
	VisitType      VisitType
	Priority       Priority
	InitialState   VisitState
}

var patientSeeds = []patientSeed{
	{
		"Smith", "John", "1959-03-12", "male",
		"Chest pain on exertion, worsening over 2 weeks",
		VisitUrgent, PriorityUrgent,
		StateInWaitingRoom,
	},
	{
		"Johnson", "Mary", "1952-07-24", "female",
		"Follow-up post-MI, medication review",
		VisitFollowUp, PriorityNormal,
		StateNursingAssessment,
	},
	{
		"Davis", "Robert", "1966-11-05", "male",
		"Scheduled echocardiogram — known dilated cardiomyopathy",
		VisitProcedure, PriorityNormal,
		StateProcedureQueued,
	},
	{
		"Chen", "Susan", "1979-04-30", "female",
		"Palpitations, rule out SVT — referred by PCP Dr. Patel",
		VisitNewPatient, PriorityNormal,
		StateReferralReceived,
	},
	{
		"Brown", "William", "1944-09-18", "male",
		"New-onset atrial fibrillation, referred from ED",
		VisitUrgent, PriorityHigh,
		StatePhysicianWithPatient,
	},
}

// ─── Room → FHIR Location mapping ────────────────────────────────────────────

type roomLocationSeed struct {
	RoomID      string
	Name        string
	Description string
	PhysType    string // physical type code
}

var roomLocationSeeds = []roomLocationSeed{
	{"waiting-room", "Waiting Room", "Main patient waiting area", "wa"},
	{"checkin-1", "Check-In Station 1", "Front desk check-in station 1", "ro"},
	{"checkin-2", "Check-In Station 2", "Front desk check-in station 2", "ro"},
	{"exam-1", "Exam Room 1", "Standard examination room", "ro"},
	{"exam-2", "Exam Room 2", "Standard examination room", "ro"},
	{"exam-3", "Exam Room 3", "Standard examination room", "ro"},
	{"ecg-room", "ECG / EKG Room", "12-lead ECG recording room", "ro"},
	{"echo-lab", "Echocardiography Lab", "Transthoracic and stress echo", "ro"},
	{"stress-test-lab", "Stress Test Lab", "Treadmill and pharmacological stress testing", "ro"},
	{"holter-room", "Holter Monitor Room", "Ambulatory ECG setup and return", "ro"},
	{"consult-room", "Consultation Room", "Private consultation and results discussion", "ro"},
	{"blood-draw", "Blood Draw Station", "Phlebotomy", "ro"},
	{"checkout-desk", "Checkout Desk", "Patient checkout and scheduling", "ro"},
	{"billing-office", "Billing Office", "Insurance and billing enquiries", "ro"},
}

// ─── SeedPractice ─────────────────────────────────────────────────────────────

// SeedPractice creates all background FHIR resources and test visits.
func (s *Simulator) SeedPractice(ctx context.Context) (*SeedResult, error) {
	tid := tenant.FromContext(ctx)
	ctx = tenant.WithTenant(ctx, tid)

	result := &SeedResult{}

	// 1. Practitioners
	practIDs := make(map[string]string) // "Family Given" → fhirID
	for _, p := range practitionerSeeds {
		res, err := s.fhir.Create(ctx, "Practitioner", mustMarshal(map[string]interface{}{
			"resourceType": "Practitioner",
			"name": []map[string]interface{}{
				{"use": "official", "family": p.Family, "given": []string{p.Given}},
			},
			"qualification": []map[string]interface{}{
				{"code": map[string]interface{}{
					"text": p.Qualifier,
				}},
			},
		}))
		if err != nil {
			return nil, fmt.Errorf("create practitioner %s %s: %w", p.Given, p.Family, err)
		}
		key := p.Family + " " + p.Given
		practIDs[key] = extractFHIRID(res.Data)
		result.Practitioners = append(result.Practitioners, practIDs[key])
		if err := s.searcher.Index(ctx, "Practitioner", practIDs[key], res.Data); err != nil {
			return nil, err
		}
	}

	// 2. Locations (one per room)
	for _, rl := range roomLocationSeeds {
		res, err := s.fhir.Create(ctx, "Location", mustMarshal(map[string]interface{}{
			"resourceType": "Location",
			"status":       "active",
			"name":         rl.Name,
			"description":  rl.Description,
			"mode":         "instance",
			"physicalType": map[string]interface{}{
				"coding": []map[string]interface{}{
					{"system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
						"code": rl.PhysType},
				},
			},
		}))
		if err != nil {
			return nil, fmt.Errorf("create location %s: %w", rl.Name, err)
		}
		locID := extractFHIRID(res.Data)
		result.Locations = append(result.Locations, locID)
		if err := s.store.SetLocationID(ctx, rl.RoomID, locID); err != nil {
			return nil, err
		}
		if err := s.searcher.Index(ctx, "Location", locID, res.Data); err != nil {
			return nil, err
		}
	}

	// 3. Patients + Appointments + Encounters → seed visits
	cardioID := practIDs["Chen Sarah"]
	cardioID2 := practIDs["Torres Michael"]
	_ = cardioID2 // used for second physician

	for i, p := range patientSeeds {
		// Patient FHIR resource
		patRes, err := s.fhir.Create(ctx, "Patient", mustMarshal(map[string]interface{}{
			"resourceType": "Patient",
			"active":       true,
			"name": []map[string]interface{}{
				{"use": "official", "family": p.Family, "given": []string{p.Given}},
			},
			"gender":    p.Gender,
			"birthDate": p.BirthDate,
		}))
		if err != nil {
			return nil, fmt.Errorf("create patient %s: %w", p.Family, err)
		}
		patID := extractFHIRID(patRes.Data)
		result.Patients = append(result.Patients, patID)
		if err := s.searcher.Index(ctx, "Patient", patID, patRes.Data); err != nil {
			return nil, err
		}

		// Appointment
		physicianRef := cardioID
		if i%2 == 1 {
			physicianRef = cardioID2
		}
		apptRes, err := s.fhir.Create(ctx, "Appointment", mustMarshal(map[string]interface{}{
			"resourceType": "Appointment",
			"status":       "booked",
			"serviceType": []map[string]interface{}{
				{"coding": []map[string]interface{}{
					{"system": "http://snomed.info/sct", "code": "394579002", "display": "Cardiology"},
				}},
			},
			"start":       "2026-05-31T08:00:00-04:00",
			"end":         "2026-05-31T08:45:00-04:00",
			"description": p.ChiefComplaint,
			"participant": []map[string]interface{}{
				{"actor": map[string]interface{}{"reference": "Patient/" + patID},
					"status": "accepted"},
				{"actor": map[string]interface{}{"reference": "Practitioner/" + physicianRef},
					"status": "accepted"},
			},
		}))
		if err != nil {
			return nil, fmt.Errorf("create appointment: %w", err)
		}
		apptID := extractFHIRID(apptRes.Data)
		if err := s.searcher.Index(ctx, "Appointment", apptID, apptRes.Data); err != nil {
			return nil, err
		}

		// Encounter FHIR resource
		encRes, err := s.fhir.Create(ctx, "Encounter", mustMarshal(map[string]interface{}{
			"resourceType": "Encounter",
			"status":       "in-progress",
			"class": map[string]interface{}{
				"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
				"code":   "AMB", "display": "ambulatory",
			},
			"type": []map[string]interface{}{
				{"coding": []map[string]interface{}{
					{"system": "http://snomed.info/sct",
						"code": "11429006", "display": "Consultation"},
				}},
			},
			"subject": map[string]interface{}{"reference": "Patient/" + patID},
			"appointment": []map[string]interface{}{
				{"reference": "Appointment/" + apptID},
			},
			"reasonCode": []map[string]interface{}{
				{"text": p.ChiefComplaint},
			},
		}))
		if err != nil {
			return nil, fmt.Errorf("create encounter: %w", err)
		}
		encFHIRID := extractFHIRID(encRes.Data)
		if err := s.searcher.Index(ctx, "Encounter", encFHIRID, encRes.Data); err != nil {
			return nil, err
		}

		// Cardiology visit state — start at target state
		encID := encFHIRID
		visitRow, err := s.store.CreateVisit(ctx, CreateVisitRequest{
			PatientID:      patID,
			AppointmentID:  apptID,
			VisitType:      p.VisitType,
			Priority:       p.Priority,
			ChiefComplaint: p.ChiefComplaint,
		})
		if err != nil {
			return nil, fmt.Errorf("create visit state: %w", err)
		}
		// We created the visit (which generates its own encounter_id UUID).
		// Override it to use the FHIR Encounter ID so they stay in sync.
		// Easiest: update the newly created row to use the FHIR encounter id.
		if _, err := s.db.Exec(ctx,
			`UPDATE cardiology_visit_state SET encounter_id=$1 WHERE id=$2`,
			encID, visitRow.ID,
		); err != nil {
			return nil, fmt.Errorf("link encounter: %w", err)
		}

		// Fast-forward to target state via SYSTEM transitions
		if err := s.fastForward(ctx, encID, p.InitialState, physicianRef); err != nil {
			return nil, fmt.Errorf("fast-forward %s: %w", p.Family, err)
		}

		result.Visits = append(result.Visits, encID)
	}

	return result, nil
}

// fastForward drives a visit from its creation state to targetState
// using SYSTEM actor events.
func (s *Simulator) fastForward(ctx context.Context, encounterID string, target VisitState, physicianID string) error {
	// Walk the state machine via autoAdvance events until we reach target
	stateOrder := []VisitState{
		StateReferralReceived,
		StateAppointmentScheduled,
		StateAppointmentConfirmed,
		StatePatientArrived,
		StateCheckingIn,
		StateCheckedIn,
		StateInWaitingRoom,
		StateNursingAssessment,
		StateInExamRoom,
		StatePhysicianPending,
		StatePhysicianWithPatient,
		StateOrdersPlaced,
		StateProcedureQueued,
		StateInProcedure,
		StateProcedureComplete,
		StateResultsPending,
		StateResultsReady,
		StateResultsReview,
		StateConsultationComplete,
		StateCheckingOut,
		StateCheckoutComplete,
		StateBillingPending,
		StateDischarged,
	}

	for _, s2 := range stateOrder {
		if s2 == target {
			break
		}
		visit, err := s.store.GetVisit(ctx, encounterID)
		if err != nil {
			return err
		}
		if visit.CurrentState == target {
			break
		}

		evt, ok := AutoAdvanceEvent(visit.CurrentState)
		if !ok {
			break // requires human input — stop here
		}

		t, err := LookupTransition(visit.CurrentState, evt)
		if err != nil {
			break
		}

		payload := map[string]interface{}{}
		roomID := ""
		switch t.To {
		case StateInWaitingRoom:
			roomID = "waiting-room"
		case StateNursingAssessment:
			roomID = "waiting-room"
		case StateInExamRoom:
			roomID = "exam-1"
		case StatePhysicianPending, StatePhysicianWithPatient:
			roomID = "exam-1"
			payload["physician"] = physicianID
		case StateProcedureQueued, StateInProcedure:
			roomID = "ecg-room"
		}

		_, err = s.store.ApplyTransition(ctx, encounterID, t, TransitionRequest{
			Event:     evt,
			ActorID:   "system",
			ActorRole: RoleSystem,
			RoomID:    roomID,
			Notes:     "Simulation fast-forward",
			Payload:   payload,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

// ─── AdvanceAll ────────────────────────────────────────────────────────────────

// AdvanceAll moves every non-terminal visit one step forward using SYSTEM actor.
// Returns the list of encounter IDs that were advanced.
func (s *Simulator) AdvanceAll(ctx context.Context) ([]string, error) {
	visits, err := s.store.ListVisits(ctx, "")
	if err != nil {
		return nil, err
	}

	terminal := map[VisitState]bool{
		StateDischarged: true,
		StateCancelled:  true,
		StateNoShow:     true,
	}

	var advanced []string
	for _, v := range visits {
		if terminal[v.CurrentState] {
			continue
		}
		evt, ok := AutoAdvanceEvent(v.CurrentState)
		if !ok {
			continue // human step — skip
		}
		t, err := LookupTransition(v.CurrentState, evt)
		if err != nil {
			continue
		}

		roomID := ""
		switch t.To {
		case StateInWaitingRoom:
			roomID = "waiting-room"
		case StateInExamRoom:
			roomID = "exam-1"
		case StateInProcedure:
			roomID = "ecg-room"
		}

		_, err = s.store.ApplyTransition(ctx, v.EncounterID, t, TransitionRequest{
			Event:     evt,
			ActorID:   "system",
			ActorRole: RoleSystem,
			RoomID:    roomID,
			Notes:     "Simulation auto-advance",
		})
		if err != nil {
			continue // best-effort
		}
		advanced = append(advanced, v.EncounterID)
	}
	return advanced, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func mustMarshal(v interface{}) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func extractFHIRID(data json.RawMessage) string {
	var obj struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &obj); err != nil || obj.ID == "" {
		return uuid.New().String()
	}
	return obj.ID
}
