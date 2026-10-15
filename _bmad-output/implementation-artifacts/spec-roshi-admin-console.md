---
title: Roshi Admin Console
type: feature
created: 2026-10-11
status: in-review
baseline_commit: 484507c221c960dbddd53bac6faccd14e295176d
---

# Roshi Admin Console

<frozen-after-approval reason='human-owned intent'>

## Intent

The EHR has protected user and audit pages but no distinct administrative workspace. Administrators cannot quickly see operational priorities without entering clinical workspaces.

Build a separate, role-guarded Admin Console with exactly ten primary destinations, a responsive shell, and progressive-detail pages. Reuse canonical EHR data and show unavailable telemetry as Unknown or Unavailable, never as healthy or fabricated.

## Constraints

Always keep clinical, patient, and admin navigation separate; retain server-side authorization; audit persisted privileged actions; and preserve tenant and organization boundaries at the API layer.

Never create a parallel clinical source of truth, expose secrets, rely on hidden UI for security, claim FHIR conformance, hard-code healthy state or production counts, or grant clinical authority through an administrative role.

## I/O and Edge Cases

| Scenario | Input | Expected behavior |
|---|---|---|
| Authorized administrator | Admin session or non-production preview | Display only permitted console destinations and verified data. |
| Unauthorized request | Non-admin user or manipulated URL | Middleware and route checks deny the route and protected response. |
| Unavailable dependency | Missing health signal or failed source | Keep the console usable and label that individual signal Unknown or Unavailable. |
| Supported privileged mutation | User approval, rejection, or role change | Refresh only after backend confirmation and audit outcome. |

</frozen-after-approval>

## Code Map

- ehr/src/app/admin/page.tsx: current entry point; becomes dashboard composition.
- ehr/src/app/admin/users and ehr/src/app/admin/audit: existing workflows retained inside the shell.
- ehr/src/app/api/admin/users/route.ts and ehr/src/app/api/audit/route.ts: current administrative API boundary.
- ehr/src/middleware.ts: server-side admin route enforcement.
- ehr/src/design-system: shared shell, card, accessibility, and token primitives.

## Execution

- [x] Add a shared AdminConsoleShell with responsive sidebar, workspace switcher, command search, profile controls, and exactly ten permission-filtered primary destinations.
- [x] Replace the admin home with Action Center, verified KPI/read-model cards, health summary, recent activity, quick actions, stale states, and no fabricated health.
- [x] Add Patients, Operations, Telehealth, Clinical Configuration, Integrations, Security, Analytics, and Settings routes using focused tabs, drawers, empty states, and supported actions.
- [x] Integrate existing Users and Audit workflows into the shell.

## Acceptance Criteria

- Given an admin opens the console, the Action Center precedes KPIs and unavailable services are not labeled healthy.
- Given any admin page, exactly ten approved destinations form the primary navigation.
- Given a non-admin requests an admin route or API, server enforcement prevents access.
- Given existing users or audit events, their current workflows remain usable inside the new shell.
- Given keyboard-only or narrow-viewport use, navigation, focus, drawers, and tables remain operable.

## Verification

- Run focused admin lint and unit tests, then an EHR production build.
- Manually check /admin with the development administrator and a 375px viewport.
- Baseline warning: the current full lint suite has pre-existing workspace errors; the full unit suite has one unrelated health-record fixture failure.
