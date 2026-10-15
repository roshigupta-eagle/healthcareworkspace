# FHIR Mapping

The configured Roshi FHIR release remains the source of truth for interoperability. The local task store maps the clinical task model to FHIR Task through `mapToFhirTask` in `ehr/src/lib/tasksStore.ts`.

Relevant concepts:
- Task.id -> canonical task identity
- Task.status / businessStatus -> workflow state
- Task.priority -> clinical work priority
- Task.for -> Patient.id
- Task.focus / basedOn -> linked source resource IDs where supported
- Task.requester -> creator/requester
- Task.owner -> assignee or queue
- Task.authoredOn / lastModified -> activity timestamps
- Task.executionPeriod -> due/execution context where configured

The UI does not display a FHIR compliance claim. Profile validation and live external FHIR conformance remain deployment responsibilities because no external validator/server is configured in this workspace.
