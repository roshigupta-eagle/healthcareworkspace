# AI Agent Guide — Repository Instructions

This file gives concise, high-value instructions for AI coding agents working in this repository. Keep changes small, run the project's checks, and prefer linking to existing documentation rather than copying it.

Quick commands
- `\.venv\Scripts\Activate.ps1` — activate the workspace Python virtual environment (Windows PowerShell).
- `npm --prefix ehr run dev` — start the EHR Next.js dev server.
- `npm --prefix ehr run lint` — run linter for the EHR project.
- `npm --prefix ehr run test:unit` — run unit tests for the EHR project.
- `npm --prefix ehr run test:e2e` — run end-to-end tests (Playwright).
- `.\scripts\start-all.ps1` — start all local dev services (PowerShell).
- `.\scripts\port-forward.ps1 start` — start kubectl port-forwards per config.

Agent behavior rules (short)
- **Link, don't embed:** Link to existing docs for details; avoid copying large documents.
- **Minimal, reviewable changes:** Propose focused patches that are easy to review.
- **Run checks before patching:** Always run `npm --prefix ehr run lint` and `npm --prefix ehr run test:unit` before submitting edits.
- **Preserve local AGENTS.md files:** If a subfolder has its own AGENTS.md (for example `ehr/AGENTS.md`), preserve its content and add cross-links instead of overwriting.
- **Plan with the TODO tool:** Use the `manage_todo_list` tool to create and track the work plan for multi-step changes.
- **Coordinate on FHIR/terminology:** If your change touches FHIR or terminology, notify the FHIR SME (`.github/agents/Alex.agent.md`) and Terminology Advisor (`.github/agents/Morgan.agent.md`). See project context.

Key files & links
- **Project context:** [docs/project-context.md](docs/project-context.md)
- **EHR app README:** [ehr/README.md](ehr/README.md)
- **EHR package.json (scripts):** [ehr/package.json](ehr/package.json)
- **Per-folder agent instructions:** [ehr/AGENTS.md](ehr/AGENTS.md)
- **Dev scripts:** [scripts/start-all.ps1](scripts/start-all.ps1), [scripts/port-forward.ps1](scripts/port-forward.ps1)
- **BMAD configuration:** [_bmad/config.toml](_bmad/config.toml)
- **SDLC & templates:** [docs/sdlc/workflow-phases.md](docs/sdlc/workflow-phases.md)
- **Agent descriptors:** [.github/agents/Amelia.agent.md](.github/agents/Amelia.agent.md), [.github/agents/Alex.agent.md](.github/agents/Alex.agent.md)

Agent checklist for code changes
1. Create a short todo using `manage_todo_list` describing steps and expected outputs.
2. Run `npm --prefix ehr run lint` and `npm --prefix ehr run test:unit` locally.
3. Apply a focused patch using the repository `apply_patch` workflow (one logical change per patch).
4. Re-run tests and lint; update documentation links if needed.
5. Propose the PR with a concise description and test evidence.

Suggested next customizations
- `/create-agent dev-runner` — Agent that can start local dev services (`scripts/start-all.ps1`) and collect logs for debugging.
- `/create-skill run-tests` — Skill that runs unit + e2e tests, summarizes failures, and suggests fixes for common failures.
- `/create-instruction frontend` — Frontend-specific AGENTS.md that captures `ehr/` conventions, linting, and test flow.

If you want, I can now create the root `AGENTS.md` (this file), and then propose the first customization as a separate skill. What would you like next?
