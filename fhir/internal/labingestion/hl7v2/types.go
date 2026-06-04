package hl7v2

// HL7Message is the top-level result of parsing one ORU^R01 message.
type HL7Message struct {
	// MSH fields
	SendingApplication string
	SendingFacility    string
	ReceivingApp       string
	DateTimeOfMessage  string // YYYYMMDDHHMMSS
	MessageControlID   string // deduplication key from MSH-10
	HL7Version         string // e.g. "2.3" or "2.5"

	// PID segment
	Patient HL7Patient

	// PV1 segment (optional)
	Visit *HL7Visit

	// One or more result groups (ORC+OBR+OBX*)
	ResultGroups []HL7ResultGroup
}

// HL7Patient holds fields from the PID segment.
type HL7Patient struct {
	// PID-3: internal identifiers (MRN, etc.)
	InternalIDs []HL7Identifier
	// PID-5: patient name
	FamilyName string
	GivenName  string
	// PID-7: date of birth YYYYMMDD
	DateOfBirth string
	// PID-8: gender (M/F/O/U)
	Gender string
	// PID-11: address
	StreetAddress string
	City          string
	Province      string
	PostalCode    string
	// PID-13: phone
	PhoneHome string
	// PID-18: account number
	AccountNumber string
	// PID-19: Ontario Health Card Number (OHIP number)
	OHIPNumber string
}

// HL7Identifier is one entry from a CX composite (e.g. PID-3).
type HL7Identifier struct {
	ID                 string
	AssigningAuthority string
	IDType             string // MR = medical record, PI = patient internal, etc.
}

// HL7Visit holds selected PV1 fields.
type HL7Visit struct {
	PatientClass     string // I=Inpatient, O=Outpatient, E=Emergency
	AssignedLocation string
	AttendingDoctor  string
	VisitNumber      string
}

// HL7ResultGroup corresponds to one ORC/OBR block with its OBX lines.
type HL7ResultGroup struct {
	// ORC fields
	OrderControl   string // NW=New, CA=Cancel, RE=Observations to follow
	FillerOrderNum string // ORC-3 / OBR-3 — accession number
	PlacerOrderNum string // ORC-2 / OBR-2

	// OBR fields
	SetID              string
	UniversalServiceID HL7CodedValue // OBR-4: test ordered (LOINC preferred)
	RequestedDateTime  string        // OBR-6
	SpecimenReceived   string        // OBR-14
	ResultStatus       string        // OBR-25: F=Final, P=Preliminary, C=Corrected, X=Cancelled
	ResultDateTime     string        // OBR-22
	OrderingProvider   string        // OBR-16
	SpecimenSource     string        // OBR-15

	// OBX lines
	Observations []HL7Observation

	// NTE lines for this OBR (report-level notes)
	Notes []string
}

// HL7Observation corresponds to one OBX segment.
type HL7Observation struct {
	SetID               string
	ValueType           string        // NM=numeric, ST=string, TX=text, CWE=coded, SN=structured numeric
	ObservationID       HL7CodedValue // OBX-3: LOINC or local code
	SubID               string        // OBX-4: sub-id for panels
	Value               string        // OBX-5: observation value (raw)
	Units               HL7CodedValue // OBX-6: UCUM units
	ReferenceRange      string        // OBX-7: normal range
	AbnormalFlags       string        // OBX-8: H=High, L=Low, A=Abnormal, AA=CriticalAbnormal, N=Normal
	ResultStatus        string        // OBX-11: F/P/C/X
	ObservationDateTime string        // OBX-14: YYYYMMDDHHMMSS
	Notes               []string      // NTE lines after this OBX
}

// HL7CodedValue is an HL7 CWE/CE composite: code^text^codeSystem.
type HL7CodedValue struct {
	Code      string
	Text      string
	System    string // e.g. LN (LOINC), SCT (SNOMED), L (local)
	AltCode   string
	AltText   string
	AltSystem string
}
