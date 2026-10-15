# Roshi Communication Platform - Low-Level Design

**Status:** Legacy target-state diagram reference
**Canonical LLD:** [LLD.md](LLD.md)

The diagrams below describe the target production architecture only. For current EHR-local code ownership, the extraction boundary, API contracts, FHIR mapping controls, and production gates, use the canonical LLD. The adjacent DOCX is a historical export and must be regenerated before it is used as a current specification.

## Target-state PlantUML diagrams

### 08_data_model.puml
```plantuml
@startuml
hide methods
class Conversation {
  +id: UUID
  +tenantId: UUID
  +organizationId: UUID
  +patientId: FHIR Reference
  +topic: string
  +status: enum
  +version: bigint
}
class ConversationParticipant {
  +conversationId: UUID
  +participantType: enum
  +participantId: UUID
  +role: enum
  +status: enum
}
class Message {
  +id: UUID
  +conversationId: UUID
  +patientId: FHIR Reference
  +senderParticipantId: UUID
  +type: TEXT|AUDIO|FILE|SYSTEM
  +bodyRef: string
  +createdAt: timestamp
}
class MessageRecipientState {
  +messageId: UUID
  +participantId: UUID
  +state: UNREAD|READ|ACK|RESPONDED
}
class CallSession {
  +id: UUID
  +conversationId: UUID
  +patientId: FHIR Reference
  +mediaRoomId: opaque string
  +state: enum
  +startedAt: timestamp
  +endedAt: timestamp
}
class CallParticipant {
  +callSessionId: UUID
  +participantId: UUID
  +mediaIdentity: opaque string
  +joinState: enum
}
class Attachment {
  +id: UUID
  +patientId: FHIR Reference
  +objectKey: string
  +mimeType: string
  +scanState: enum
}
class ClinicalLink {
  +conversationId: UUID
  +resourceType: string
  +resourceId: string
  +relationship: string
}
class OutboxEvent {
  +id: UUID
  +aggregateType: string
  +aggregateId: UUID
  +eventType: string
  +state: enum
}
Conversation "1" -- "*" ConversationParticipant
Conversation "1" -- "*" Message
Message "1" -- "*" MessageRecipientState
Conversation "1" -- "*" CallSession
CallSession "1" -- "*" CallParticipant
Message "*" -- "*" Attachment
Conversation "1" -- "*" ClinicalLink
Conversation "1" -- "*" OutboxEvent
@enduml
```

### 05_message_sequence.puml
```plantuml
@startuml
actor Clinician
participant "Roshi Web" as UI
participant "Communication API" as API
participant "Authorization" as AZ
database PostgreSQL as DB
participant "Outbox Worker" as W
queue "Event Backbone" as BUS
participant "Realtime Gateway" as RT
participant "Notification Service" as NS
actor Patient
Clinician -> UI : Send message
UI -> API : POST /conversations/{id}/messages\nIdempotency-Key
API -> AZ : authorize(user, patient, conversation)
AZ --> API : allow
API -> DB : BEGIN\ninsert Message + OutboxEvent\nCOMMIT
API --> UI : 202 Accepted + messageId
W -> DB : claim pending outbox
W -> BUS : MessageCreated
W -> DB : mark outbox processed
BUS -> RT : MessageCreated
RT -> Patient : realtime event if online
BUS -> NS : NotificationRequested
NS -> Patient : privacy-safe push if offline
@enduml
```

### 06_call_sequence.puml
```plantuml
@startuml
actor Doctor
participant "Roshi Web" as DW
participant "Communication API" as API
participant "Authorization" as AZ
database PostgreSQL as DB
participant "Call Orchestrator" as CO
participant "LiveKit" as LK
participant "Realtime Gateway" as RT
actor Patient
Doctor -> DW : Call Patient
DW -> API : POST /calls
API -> AZ : authorize doctor + Patient.id + conversation
AZ --> API : allow
API -> DB : create CallSession(CONNECTING)
API -> CO : create media session
CO -> LK : create room / issue scoped tokens
CO --> API : opaque room + participant grants
API -> RT : call.incoming(patientPortalUserId)
RT -> Patient : incoming call
Patient -> API : POST /calls/{id}/accept
API -> AZ : authorize participant
AZ --> API : allow
API -> CO : issue patient token
CO --> Patient : short-lived LiveKit token
Doctor -> LK : join room
Patient -> LK : join room
LK --> Doctor : remote audio/video
LK --> Patient : remote audio/video
LK -> API : signed webhook participant_joined
API -> DB : state=ACTIVE, timestamps
@enduml
```

### 09_call_state_machine.puml
```plantuml
@startuml
[*] --> CREATED
CREATED --> CONNECTING : create media session
CONNECTING --> RINGING : incoming event delivered
RINGING --> ACTIVE : recipient accepts + media joins
RINGING --> DECLINED : recipient declines
RINGING --> MISSED : ring timeout
CONNECTING --> FAILED : setup timeout/fatal error
ACTIVE --> ON_HOLD : hold (if supported)
ON_HOLD --> ACTIVE : resume
ACTIVE --> RECONNECTING : network/media disconnect
RECONNECTING --> ACTIVE : recovered
RECONNECTING --> FAILED : recovery timeout
ACTIVE --> COMPLETED : end call
ACTIVE --> FAILED : unrecoverable failure
DECLINED --> [*]
MISSED --> [*]
FAILED --> [*]
COMPLETED --> [*]
@enduml
```

### 15_fhir_integration.puml
```plantuml
@startuml
rectangle "Roshi Communication Domain" {
  [Conversation]
  [Message]
  [CallSession]
  [ClinicalLink]
}
rectangle "FHIR / Clinical Domain" {
  [Patient]
  [Encounter]
  [Appointment]
  [Task]
  [ServiceRequest]
  [Observation]
  [DiagnosticReport]
  [MedicationRequest]
  [MedicationDispense]
  [DocumentReference]
  [CareTeam]
  [PractitionerRole]
  [AuditEvent]
  [Provenance]
}
[Conversation] --> [Patient] : canonical subject
[ClinicalLink] --> [Encounter]
[ClinicalLink] --> [Appointment]
[ClinicalLink] --> [Task]
[ClinicalLink] --> [ServiceRequest]
[ClinicalLink] --> [Observation]
[ClinicalLink] --> [DiagnosticReport]
[ClinicalLink] --> [MedicationRequest]
[ClinicalLink] --> [MedicationDispense]
[Message] --> [DocumentReference] : attachments when governed
[Conversation] --> [CareTeam]
[Conversation] --> [PractitionerRole]
[Message] --> [AuditEvent]
[CallSession] --> [AuditEvent]
[Message] --> [Provenance] : when clinical record generated
@enduml
```

### 12_ai_authorization_flow.puml
```plantuml
@startuml
actor Clinician
participant "Roshi AI UI" as UI
participant "AI Context Service" as AI
participant "Authorization" as AZ
database "Communication DB" as DB
participant "FHIR Services" as FHIR
participant "Retrieval Index" as IDX
participant "LLM Provider / Model" as LLM
Clinician -> UI : Summarize Sarah / Surgery
UI -> AI : request(userId, tenantId, patientId, conversationId)
AI -> AZ : authorize all scopes
AZ --> AI : allowedResourceIds
AI -> DB : load authorized conversation/messages
AI -> FHIR : load explicit authorized clinical links
AI -> IDX : query WITH tenant/patient/conversation filters
IDX --> AI : authorized chunks only
AI -> LLM : minimum necessary grounded context
LLM --> AI : draft summary
AI --> UI : AI-generated + sources + review required
@enduml
```
