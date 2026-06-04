# Synthetic FHIR R4 sample payloads

These examples are intentionally synthetic. Replace profile URLs, identifier systems, codes, and required elements with the applicable IG requirements before using them in tests. Do not include comments inside JSON payloads sent to a FHIR server.

## 1. Minimal Patient with business identifiers

```json
{
  "resourceType": "Patient",
  "id": "patient-example-1",
  "meta": {
    "profile": [
      "http://example.org/fhir/StructureDefinition/example-patient"
    ]
  },
  "identifier": [
    {
      "system": "http://example.org/fhir/sid/patient-id",
      "value": "SYNTH-PAT-001"
    }
  ],
  "name": [
    {
      "use": "official",
      "family": "Example",
      "given": ["Alex"]
    }
  ],
  "gender": "unknown",
  "birthDate": "1980-01-01"
}
```

## 2. MedicationRequest linked to Patient and PractitionerRole

```json
{
  "resourceType": "MedicationRequest",
  "id": "medrx-example-1",
  "meta": {
    "profile": [
      "http://example.org/fhir/StructureDefinition/example-medicationrequest"
    ]
  },
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://example.org/fhir/CodeSystem/example-drug-codes",
        "code": "EXAMPLE-DRUG-10MG",
        "display": "Example drug 10 mg tablet"
      }
    ],
    "text": "Example drug 10 mg tablet"
  },
  "subject": {
    "reference": "Patient/patient-example-1"
  },
  "requester": {
    "reference": "PractitionerRole/prescriber-role-example-1"
  },
  "authoredOn": "2026-01-15",
  "dosageInstruction": [
    {
      "text": "Take one tablet by mouth once daily."
    }
  ]
}
```

## 3. Transaction Bundle using UUID fullUrls

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:11111111-1111-1111-1111-111111111111",
      "resource": {
        "resourceType": "Patient",
        "identifier": [
          {
            "system": "http://example.org/fhir/sid/patient-id",
            "value": "SYNTH-PAT-002"
          }
        ],
        "name": [
          {
            "family": "Sample",
            "given": ["Jordan"]
          }
        ],
        "gender": "unknown",
        "birthDate": "1975-05-05"
      },
      "request": {
        "method": "POST",
        "url": "Patient"
      }
    },
    {
      "fullUrl": "urn:uuid:22222222-2222-2222-2222-222222222222",
      "resource": {
        "resourceType": "MedicationRequest",
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {
          "text": "Example medication"
        },
        "subject": {
          "reference": "urn:uuid:11111111-1111-1111-1111-111111111111"
        }
      },
      "request": {
        "method": "POST",
        "url": "MedicationRequest"
      }
    }
  ]
}
```

## 4. Document Bundle skeleton for patient summary

```json
{
  "resourceType": "Bundle",
  "type": "document",
  "identifier": {
    "system": "http://example.org/fhir/sid/document-id",
    "value": "SYNTH-DOC-001"
  },
  "timestamp": "2026-01-15T12:00:00Z",
  "entry": [
    {
      "fullUrl": "urn:uuid:composition-0001",
      "resource": {
        "resourceType": "Composition",
        "id": "composition-example-1",
        "status": "final",
        "type": {
          "text": "Patient summary"
        },
        "subject": {
          "reference": "urn:uuid:patient-0001"
        },
        "date": "2026-01-15T12:00:00Z",
        "author": [
          {
            "reference": "urn:uuid:practitioner-0001"
          }
        ],
        "title": "Synthetic Patient Summary",
        "section": [
          {
            "title": "Allergies and Intolerances",
            "entry": [
              {
                "reference": "urn:uuid:allergy-0001"
              }
            ]
          }
        ]
      }
    },
    {
      "fullUrl": "urn:uuid:patient-0001",
      "resource": {
        "resourceType": "Patient",
        "id": "patient-example-doc",
        "name": [
          {
            "family": "Document",
            "given": ["Case"]
          }
        ],
        "gender": "unknown",
        "birthDate": "1990-01-01"
      }
    },
    {
      "fullUrl": "urn:uuid:practitioner-0001",
      "resource": {
        "resourceType": "Practitioner",
        "id": "practitioner-example-doc",
        "name": [
          {
            "family": "Clinician",
            "given": ["Sam"]
          }
        ]
      }
    },
    {
      "fullUrl": "urn:uuid:allergy-0001",
      "resource": {
        "resourceType": "AllergyIntolerance",
        "id": "allergy-example-doc",
        "clinicalStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              "code": "active"
            }
          ]
        },
        "code": {
          "text": "Synthetic allergy example"
        },
        "patient": {
          "reference": "urn:uuid:patient-0001"
        }
      }
    }
  ]
}
```

## 5. Referral/eConsult workflow skeleton

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:referral-request-0001",
      "resource": {
        "resourceType": "ServiceRequest",
        "status": "active",
        "intent": "order",
        "code": {
          "text": "Synthetic referral request"
        },
        "subject": {
          "reference": "Patient/patient-example-1"
        },
        "requester": {
          "reference": "PractitionerRole/requester-role-example-1"
        }
      },
      "request": {
        "method": "POST",
        "url": "ServiceRequest"
      }
    },
    {
      "fullUrl": "urn:uuid:referral-task-0001",
      "resource": {
        "resourceType": "Task",
        "status": "requested",
        "intent": "order",
        "focus": {
          "reference": "urn:uuid:referral-request-0001"
        },
        "for": {
          "reference": "Patient/patient-example-1"
        },
        "owner": {
          "reference": "Organization/receiving-organization-example-1"
        }
      },
      "request": {
        "method": "POST",
        "url": "Task"
      }
    }
  ]
}
```
