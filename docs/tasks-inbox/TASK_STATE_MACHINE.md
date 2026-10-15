# Task State Machine

## Canonical statuses
The current task model supports `draft`, `requested`, `received`, `accepted`, `ready`, `in-progress`, `on-hold`, `failed`, `rejected`, `completed`, `cancelled`, and `entered-in-error`.

## Human-facing stages
- To Do: requested, received, accepted, ready, open, overdue
- In Progress: in-progress
- Pending: blocked or on-hold
- Completed: completed

The stage mapping is centralized in `stageFor` for presentation. It does not rewrite canonical status semantics.

## Safe transitions
- To Do -> In Progress: `start`
- To Do -> Pending: `hold`
- In Progress -> Pending: `hold`
- Pending -> In Progress: `resume`
- Open work -> Completed: `complete`, only when `canCompleteTask` allows it
- Completed/cancelled/failed/entered-in-error are terminal for generic work actions.

Drag/drop calls the same guarded mutation endpoint as buttons. Derived result, note, and document review items cannot be completed as generic tasks; their source workflow must be used.
