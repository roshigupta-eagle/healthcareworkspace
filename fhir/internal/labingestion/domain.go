// Package labingestion receives, parses, normalises, and stores laboratory
// results from external sources: LifeLabs, Dynacare, direct instrument
// interfaces, and the Ontario provincial OLIS system.
//
// All inbound formats are normalised to FHIR R4 DiagnosticReport + Observation
// resources stored in the shared fhirstore.
package labingestion

import "time"

// ─── Source Systems ───────────────────────────────────────────────────────────

// SourceSystem identifies the origin of an inbound lab message.
type SourceSystem string

const (
	SourceLifeLabs   SourceSystem = "LIFELABS"   // LifeLabs Ontario/BC
	SourceDynacare   SourceSystem = "DYNACARE"   // Dynacare / Dynacare Laboratories
	SourceOLIS       SourceSystem = "OLIS"       // Ontario Lab Information System (eHealth Ontario)
	SourceInstrument SourceSystem = "INSTRUMENT" // Direct instrument (Roche, Abbott, Siemens, etc.)
	SourceFHIRPush   SourceSystem = "FHIR_PUSH"  // Any FHIR-capable sender
	SourceUnknown    SourceSystem = "UNKNOWN"
)

// MessageFormat is the wire format of the inbound message.
type MessageFormat string

const (
	FormatHL7v2 MessageFormat = "HL7V2"            // HL7 v2.x pipe-delimited
	FormatFHIR  MessageFormat = "FHIR_DIAGNOSTICREPORT" // FHIR R4 DiagnosticReport (JSON)
	FormatFHIRBundle MessageFormat = "FHIR_BUNDLE" // FHIR R4 Bundle with DiagnosticReport
)

// ─── Ingestion Status ─────────────────────────────────────────────────────────

// IngestionStatus tracks where a message is in the pipeline.
type IngestionStatus string

const (
	StatusReceived    IngestionStatus = "RECEIVED"      // Raw message stored
	StatusParsing     IngestionStatus = "PARSING"       // Actively parsing
	StatusParsed      IngestionStatus = "PARSED"        // Parsed to intermediate structure
	StatusMatching    IngestionStatus = "MATCHING"      // Running patient matching
	StatusMatched     IngestionStatus = "MATCHED"       // Patient found
	StatusNormalizing IngestionStatus = "NORMALIZING"   // Building FHIR resources
	StatusStored      IngestionStatus = "STORED"        // FHIR resources persisted
	StatusDuplicate   IngestionStatus = "DUPLICATE"     // Same accession already stored
	StatusFailed      IngestionStatus = "FAILED"        // Unrecoverable error
	StatusManualReview IngestionStatus = "MANUAL_REVIEW" // Needs human intervention (no match)
)

// ─── Match Strategy ───────────────────────────────────────────────────────────

// MatchStrategy determines how a patient is identified from inbound identifiers.
type MatchStrategy string

const (
	MatchByOHIP    MatchStrategy = "OHIP"     // Ontario Health Card Number (PID-19)
	MatchByMRN     MatchStrategy = "MRN"      // Internal medical record number (PID-3)
	MatchByNameDOB MatchStrategy = "NAME_DOB" // Family name + date of birth
)

// ─── Source Profile ───────────────────────────────────────────────────────────

// SourceProfile describes how to identify and process messages from one source.
type SourceProfile struct {
	SourceSystem    SourceSystem
	DisplayName     string
	MessageFormat   MessageFormat
	HL7SendingApp   string // MSH-3 pattern (empty = match all)
	HL7SendingFac   string // MSH-4 pattern (empty = match all)
	MatchStrategies []MatchStrategy
	IsActive        bool
}

// ─── Ingestion Log Row ────────────────────────────────────────────────────────

// IngestionRecord mirrors the lab_ingestion_log table row.
type IngestionRecord struct {
	ID                  string
	TenantID            string
	SourceSystem        SourceSystem
	SourceFacility      *string
	MessageType         MessageFormat
	MessageID           *string
	AccessionNumber     *string
	RawOHIPNumber       *string
	RawMRN              *string
	RawPatientName      *string
	RawDOB              *string
	MatchedPatientID    *string
	Status              IngestionStatus
	ErrorMessage        *string
	RetryCount          int
	DiagnosticReportID  *string
	ObservationIDs      []string
	RawPayload          string
	ParsedJSON          []byte
	ReceivedAt          time.Time
	ProcessedAt         *time.Time
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// ─── HTTP Request/Response DTOs ───────────────────────────────────────────────

// IngestHL7v2Request is the body for POST /lab/ingest/hl7v2.
// The raw HL7 v2 message is sent as plain text in the body.
// Source system is identified from MSH-3/MSH-4 or the X-Lab-Source header.

// IngestFHIRRequest holds a FHIR DiagnosticReport or Bundle (JSON).

// ManualMatchRequest resolves a MANUAL_REVIEW record to a patient.
type ManualMatchRequest struct {
	PatientID string `json:"patientId"` // FHIR Patient.id
}

// RetryRequest re-queues a FAILED record.
type RetryRequest struct {
	Notes string `json:"notes,omitempty"`
}

// IngestionSummary is the response for GET /lab/queue.
type IngestionSummary struct {
	Total         int            `json:"total"`
	ByStatus      map[string]int `json:"byStatus"`
	BySource      map[string]int `json:"bySource"`
	RecentRecords []IngestionRecord `json:"recentRecords"`
}

// ─── LOINC / UCUM helpers ────────────────────────────────────────────────────

// FHIRSystem maps HL7 coding system abbreviations to FHIR system URIs.
var FHIRSystem = map[string]string{
	"LN":    "http://loinc.org",
	"LOINC": "http://loinc.org",
	"SCT":   "http://snomed.info/sct",
	"NCI":   "http://ncimeta.nci.nih.gov",
	"L":     "http://terminology.local/lab-codes",
	"":      "http://terminology.local/lab-codes",
}

// UCUMSystem is the FHIR URI for UCUM.
const UCUMSystem = "http://unitsofmeasure.org"

// InterpretationSystem is the FHIR URI for HL7 observation interpretation codes.
const InterpretationSystem = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation"

// ObservationInterpretation maps HL7 v2 abnormal flags to FHIR interpretation codes.
var ObservationInterpretation = map[string]struct{ Code, Display string }{
	"H":  {"H", "High"},
	"HH": {"HH", "Critical high"},
	"L":  {"L", "Low"},
	"LL": {"LL", "Critical low"},
	"A":  {"A", "Abnormal"},
	"AA": {"AA", "Critical abnormal"},
	"N":  {"N", "Normal"},
	"U":  {"U", "Significant change up"},
	"D":  {"D", "Significant change down"},
	"R":  {"R", "Resistant"},
	"S":  {"S", "Susceptible"},
	"I":  {"I", "Intermediate"},
}

// ResultStatusToFHIR maps OBR-25 / OBX-11 to FHIR DiagnosticReport.status.
var ResultStatusToFHIR = map[string]string{
	"F": "final",
	"P": "preliminary",
	"C": "corrected",
	"A": "partial",
	"R": "registered",
	"X": "cancelled",
	"":  "unknown",
}
