# Roshi Communication Platform - Solution Architecture

**Status:** Legacy target-state diagram reference
**Canonical architecture:** [HLD.md](HLD.md) and [LLD.md](LLD.md)

The diagrams below illustrate the desired production architecture. They do not describe the active EHR-local Communication Hub, which currently runs in the Next.js EHR process with file-backed development state, in-process SSE, unavailable external providers, and no wired FHIR communication mapper. The adjacent DOCX is a historical export and must be regenerated before it is used as a current specification.

## Target-state PlantUML diagrams

### 03_logical_architecture.puml
```plantuml
@startuml
skinparam componentStyle rectangle
package "Experience" {
  [Clinician Web App] as CWA
  [Patient Portal] as PP
  [Mobile Apps - future] as MA
}
package "Roshi Communication Domain" {
  [Communication API / BFF] as API
  [Conversation Service] as CONV
  [Message Service] as MSG
  [Call Orchestrator] as CALL
  [Participant & Authorization Service] as AUTHZ
  [Notification Service] as NOTIF
  [Attachment / Voice Note Service] as ATT
  [AI Context Service] as AI
  [Audit / Provenance Service] as AUD
  [Realtime Gateway] as RT
}
database "PostgreSQL HA" as PG
queue "Event Backbone\n(existing bus preferred; NATS JetStream reference)" as BUS
rectangle "Redis HA\nPresence / ephemeral state" as REDIS
cloud "S3-compatible Object Storage" as OBJ
rectangle "Self-hosted LiveKit" as LK
rectangle "TURN\nLiveKit TURN or Coturn" as TURN
component "FHIR / Clinical Services" as FHIR
cloud "Web Push / APNs / FCM" as PUSH
component "Optional Matrix / external messaging adapter" as MATRIX

CWA --> API
PP --> API
MA --> API
CWA --> RT
PP --> RT
API --> AUTHZ
API --> CONV
API --> MSG
API --> CALL
API --> ATT
CONV --> PG
MSG --> PG
CALL --> PG
ATT --> OBJ
MSG --> BUS
CALL --> BUS
BUS --> RT
BUS --> NOTIF
NOTIF --> PUSH
RT --> REDIS
CALL --> LK
LK --> TURN
API --> FHIR
AI --> PG
AI --> FHIR
AI --> AUTHZ
AUD --> PG
BUS --> AUD
API --> MATRIX : optional future
@enduml
```

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

### 11_security_trust_boundaries.puml
```plantuml
@startuml
skinparam componentStyle rectangle
rectangle "Untrusted / User Device" {
  [Clinician Browser]
  [Patient Browser]
}
rectangle "Roshi Trusted Application Zone" {
  [WAF/API Gateway]
  [AuthN/AuthZ]
  [Communication API]
  [Realtime Gateway]
  [Notification Service]
  [AI Context Service]
}
rectangle "Sensitive Data Zone" {
  database "PostgreSQL"
  cloud "Object Storage"
  [FHIR Services]
  [Audit Store]
}
rectangle "Media Zone" {
  [LiveKit]
  [TURN]
}
cloud "External Push Providers" as PUSH
[Clinician Browser] --> [WAF/API Gateway] : TLS
[Patient Browser] --> [WAF/API Gateway] : TLS
[WAF/API Gateway] --> [AuthN/AuthZ]
[Communication API] --> PostgreSQL
[Communication API] --> [FHIR Services]
[Notification Service] --> PUSH : minimum data
[Communication API] --> [LiveKit] : server API / signed grants
[Clinician Browser] --> [LiveKit] : short-lived scoped token
[Patient Browser] --> [LiveKit] : short-lived scoped token
[LiveKit] --> [TURN]
[AI Context Service] --> [AuthN/AuthZ] : authorize before retrieval
[AI Context Service] --> PostgreSQL
[AI Context Service] --> [FHIR Services]
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

### 04_deployment_topology.puml
```plantuml
@startuml
node "Canadian Region / Approved Data Residency" {
  node "Edge" {
    [WAF / API LB]
    [Media LB / DNS]
  }
  node "Application Kubernetes Cluster" {
    [Communication API xN]
    [Realtime Gateway xN]
    [Workers xN]
    [Notification Service xN]
    [AI Context Service xN]
  }
  node "Dedicated Media Node Pool" {
    [LiveKit Node A]
    [LiveKit Node B]
    [LiveKit Node C]
  }
  node "TURN Failure Domain A" { [TURN A] }
  node "TURN Failure Domain B" { [TURN B] }
  database "PostgreSQL HA" as PG
  database "Redis HA" as REDIS
  queue "Event Backbone HA" as BUS
  cloud "Object Storage" as OBJ
  node "Observability" {
    [Metrics]
    [Logs]
    [Tracing]
    [Synthetic Call Tests]
  }
}
[WAF / API LB] --> [Communication API xN]
[WAF / API LB] --> [Realtime Gateway xN]
[Communication API xN] --> PG
[Communication API xN] --> BUS
[Realtime Gateway xN] --> REDIS
[Workers xN] --> BUS
[Workers xN] --> PG
[Workers xN] --> OBJ
[Media LB / DNS] --> [LiveKit Node A]
[Media LB / DNS] --> [LiveKit Node B]
[Media LB / DNS] --> [LiveKit Node C]
[LiveKit Node A] --> REDIS
[LiveKit Node B] --> REDIS
[LiveKit Node C] --> REDIS
[LiveKit Node A] --> [TURN A]
[LiveKit Node B] --> [TURN B]
@enduml
```
