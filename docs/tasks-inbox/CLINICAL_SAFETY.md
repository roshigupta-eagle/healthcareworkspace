# Clinical Safety

## Non-collapsed states
- Result interpretation: normal, abnormal, critical.
- Result lifecycle: preliminary, final, amended, corrected.
- Review: unreviewed or reviewed.
- Acknowledgement: unacknowledged or acknowledged.
- Task workflow: To Do, In Progress, Pending, Completed.
- Resolution: follow-up, contact, order, or other governed outcome.

Opening a source does not mark it reviewed. Completing a task does not automatically acknowledge or resolve a clinical result. The completion API calls `canCompleteTask` and blocks source-linked work until required source workflows are complete.

## Wrong-patient protection
Patient access, source ownership, and source relationship validation are enforced server-side. The client only renders authorized projections and uses Patient.id/resource IDs for navigation.

## Unsafe operations
Bulk clinical completion, automatic acknowledgement, automatic source review, medication changes, and order placement are not exposed as casual task-board actions.
