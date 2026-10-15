# Task Source Mapping

| Source | Work projection | Open source route |
| --- | --- | --- |
| Observation / lab result | Result Review | Patient labs with selected result |
| ClinicalNote / DoctorNote | Note Signature | Patient doctor notes |
| DocumentReference | Document Review | Patient documents |
| Condition / HealthConcern | Follow-up or clinical task | Patient conditions / concerns |
| No linked resource | Canonical Clinical Task | Patient task context |

`validateTaskSources` verifies that a selected source belongs to the Patient before creation. `sourceHref` derives navigation from Patient.id and resource ID; display labels are never used as identifiers.

If source data is unavailable, the task remains visible and the UI should report the source limitation rather than silently changing task state.
