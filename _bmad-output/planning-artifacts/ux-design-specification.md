---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - 'User-provided: Laboratory Results Comparator detailed requirements'
  - 'docs/project-context.md'
---

# UX Design Specification healthcareworkspace

**Author:** Eagle
**Date:** 2026-08-19

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Create a trustworthy longitudinal laboratory review workspace that reduces the cognitive work of opening multiple reports without turning derived comparison into diagnosis. A clinician should be able to see the current result, the source interpretation, the applicable historical reference interval, the comparable history, the amount and direction of change, the reason for any highlight, and the original report from one coherent surface.

The experience must make three layers unmistakable:
- What the laboratory reported.
- What Roshi calculated.
- What the clinician decides.

### Target Users

**Physician / authorized clinician:** Primary user. Works under time pressure and needs a fast summary of decision-relevant changes, with source and explanation details one interaction away.

**Laboratory technician / technologist:** Needs technical identity, specimen, method, units, accession, source flags, result lifecycle, mapping status, and data-quality warnings. Can propose issues but should not activate clinical rules without authorization.

**Laboratory manager / clinical approver:** Needs governed mapping, reference-range, comparator-rule, approval, effective-date, supersession, and audit workflows.

**External hospital or laboratory user:** Needs clearly attributed source organization, original reference interval, received-via metadata, and safe cross-laboratory comparison.

**Nurse / care team member:** May need critical and changed-result queues plus acknowledgement state, with less configuration detail than laboratory users.

Patient-facing plain-language explanations are a later experience and are not the primary comparator workspace.

### Key Design Challenges

- Show multiple reports and parameters without creating a dense, error-prone spreadsheet.
- Keep source interpretation and Roshi status visible as separate dimensions.
- Communicate critical, significant, improving, worsening, stable, and non-comparable states with text and icons as well as colour.
- Prevent users from assuming that similar names imply equivalent tests.
- Preserve historical reference ranges and expose method, specimen, unit, and laboratory changes.
- Support numeric and qualitative results without forcing both through the same delta model.
- Make `Changes Only` useful without silently hiding the rest of the record.
- Present different units and scales without misleading shared axes.
- Make every highlight explainable and every value traceable to its source.
- Handle loading, partial, missing, corrected, cancelled, and unavailable data calmly.

### Design Opportunities

- Use a layered workspace: compact clinical summary first, expandable provenance and technical detail second.
- Make each significant state an actionable explanation surface with `Why highlighted?`, source interpretation, rule version, and calculation inputs.
- Use aligned per-parameter mini-trends with source and reference-change markers rather than a misleading combined chart.
- Use role-aware density: clinician mode prioritizes attention; laboratory mode exposes technical metadata; governance mode exposes configuration history.
- Build a reusable comparison table and result-detail pattern that can later support chemistry, hematology, qualitative results, and specialized microbiology.
- Preserve the existing EHR language of calm healthcare surfaces, search-first lists, compact density, skeleton loading, keyboard focus, and deterministic clinical decision support.

## Core User Experience

### Defining Experience

The defining action is:

1. Choose the patient's reports to compare.
2. Choose one or more parameters.
3. Review a synchronized table and trend view.
4. Open an explanation or source report when a result needs attention.

The system should automatically show only observations that are approved as comparable. It must explain excluded observations instead of silently merging or discarding them. The clinician should not need to remember prior values, reference ranges, laboratory names, or unit conversions.

The persistent core loop is `select -> compare -> understand -> verify source -> decide`.

### Platform Strategy

- Primary platform: authenticated browser-based EHR workspace.
- Primary use: desktop and laptop with mouse and keyboard in time-constrained clinical workflows.
- Secondary use: tablet with touch-friendly controls and stacked panels.
- Mobile phone: readable review and alert access, but not the primary dense comparison authoring surface.
- No offline clinical comparison in the initial release; stale or unavailable data must be labelled.
- The selected patient, report set, parameter set, view mode, date range, and filter state should be URL-addressable for safe navigation and reproducible review.
- Critical and amended-result updates may arrive through the existing notification/SSE path, but a comparison must identify when its data has changed and require a deliberate refresh or review.
- The UI must support reduced motion, forced colors, high contrast, keyboard navigation, and screen readers.

### Effortless Interactions

- Select `Last 3`, `Last 5`, `Date range`, or individual reports without losing context.
- Search parameters by display name, code, specimen, category, or source name.
- Automatically group approved equivalents and show a clear reason for non-comparable results.
- Keep the selected report columns and selected parameters stable while switching between Table, Trend, Changes Only, and Original Reports.
- Display the source interpretation and source reference range beside the Roshi comparator status without requiring a detail view.
- Make `Why highlighted?`, `Reference details`, and `View original report` one-step actions.
- Preserve filters reversibly: `Changes Only` always exposes a visible `Show all results` action.
- Keep original and normalized units available together whenever conversion is allowed.
- Use skeletons for loading, explicit partial states for missing observations, and calm retry actions for failures.

### Critical Success Moments

- A physician can answer current value, source interpretation, applicable range, prior value, delta, significance, rationale, source laboratory, and original report from one workspace.
- A technician can verify that the observations were mapped by code/specimen/method/unit rather than by name alone.
- A user is stopped from interpreting a comparison when the data is not directly comparable.
- A critical source interpretation is visually and textually distinct from a Roshi significant-change classification.
- A corrected or amended result replaces the active value while keeping the prior version visible and auditable.
- A user can recover from missing reference intervals, unavailable source systems, or stale data without assuming that a blank means normal.
- Every clinically meaningful action has a visible confirmation and an audit trail.

### Experience Principles

- Source before summary: show what the laboratory reported before showing derived interpretation.
- Attention, not alarm: reserve red for source-critical or approved critical states; never use colour for mathematical magnitude alone.
- Explain every highlight: a status without its inputs, rule, and rationale is incomplete.
- Never silently compare: uncertainty and non-comparability must be visible at the point of use.
- Progressive disclosure: keep the clinician view scannable while making technical provenance available without leaving the workflow.
- Reversible focus: filtering and changes-only modes must never destroy access to the full record.
- Role-aware depth: change density and technical detail by role without changing the underlying source facts.
- Keyboard and text first: every visual interaction has a semantic control and a readable text equivalent.

## Desired Emotional Response

### Primary Emotional Goals

The comparator should make clinicians feel calm, oriented, and in control while reviewing complex or potentially urgent laboratory history. It should create confidence in the information without creating false certainty about the clinical meaning.

The core emotional promise is: "I can see what changed, why it was highlighted, and where it came from."

### Emotional Journey Mapping

**Entry:** Oriented. The patient, purpose, selected report count, and safety boundary are immediately clear.

**Selection:** In control. Users can choose reports and parameters without losing their place or wondering what the system selected for them.

**Loading:** Informed, not anxious. Skeletons and status text show what is loading; the UI never presents blanks as normal results.

**Comparison:** Confident. The table separates source facts from derived status and makes meaningful changes easy to scan.

**Critical result:** Alert but composed. Critical information is prominent, textual, actionable, and connected to acknowledgement and source verification.

**Non-comparable result:** Safely uncertain. The interface explains why it cannot compare instead of quietly inventing a trend.

**Explanation:** Trusting. The user can inspect inputs, rule version, reference interval, source laboratory, and original report.

**Completion:** Accomplished and responsible. The clinician can acknowledge, create follow-up, export, or return to the chart with a clear record of what happened.

**Return visit:** Familiar and efficient. Prior selections, role-appropriate density, and consistent terminology reduce relearning.

### Micro-Emotions

- Confidence rather than confusion.
- Trust rather than skepticism.
- Calm urgency rather than panic.
- Control rather than helplessness.
- Recognition rather than cognitive overload.
- Relief when a highlighted result is explained.
- Respect for uncertainty when comparison is unsafe.
- Accomplishment rather than administrative friction.

### Design Implications

- Show provenance and source interpretation near the value so trust does not depend on hidden detail.
- Use restrained motion, stable layout, and predictable focus behavior; avoid attention-seeking animation.
- Make red rare and meaningful; pair every clinical state with text and an icon or directional symbol.
- Use explicit labels such as `Source interpretation`, `Roshi comparator`, `Not directly comparable`, and `Reference changed`.
- Treat missing data, stale data, and failed services as honest states with recovery actions.
- Let users inspect explanations without forcing a modal interruption for ordinary details.
- Use confirmation and audit feedback for acknowledgement, export, review, and governance actions.
- Keep AI language cautious and factual; never use confidence theater or diagnostic language.
- Make the original report a nearby escape hatch whenever the synthesized view feels insufficient.

### Emotional Design Principles

- Calm is a safety feature.
- Transparency is more reassuring than decoration.
- A visible limit is better than a confident guess.
- Attention must be proportional to clinical source significance.
- Every automated statement should expose its evidence boundary.
- The interface should reduce cognitive load without reducing clinical context.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Existing Lab Results Intelligence prototype**

What it does well:
- Uses a calm three-column clinical workspace.
- Keeps patient context visible.
- Offers search, filters, trend range controls, result details, source metadata, and review actions.
- Uses deterministic decision support language and a visible non-diagnosis limitation.

What it teaches us:
- Preserve the visual language and information scent.
- Move clinical calculations and data loading behind the UI rather than expanding the mock-data model.
- Replace the lightweight one-result compare modal with a real multi-report selection flow.
- Keep the patient banner, source metadata, and clinical actions as reusable patterns.

**Enterprise EHR UX guide**

What it does well:
- Favors dense but scannable clinical surfaces.
- Recommends search-first navigation, compact density, skeleton loading, keyboard shortcuts, visible status chips, and predictable motion.
- Treats audit, FHIR contracts, reliability, and accessibility as parallel product concerns.

What it teaches us:
- Make attention states scannable in under one glance.
- Use stable layout and progressive disclosure rather than decorative dashboard cards.
- Design the comparator as a repeated clinical work surface, not a marketing-style feature page.

**Mature clinical result viewers and analytical data tables**

Transferable conventions include:
- Pinned parameter labels and date/report headers.
- Direct display of value, unit, reference, source flag, and status.
- Trend graphs synchronized with the selected table row.
- Reversible filters and clear counts.
- Detail views that expose provenance without losing the parent context.
- Text alternatives for charts and keyboard-accessible point navigation.

### Transferable UX Patterns

**Navigation patterns:**

- Patient-context entry from the chart, with the selected result carried into the comparator.
- URL-addressable report/parameter selections so a review can be reopened and shared within authorization boundaries.
- Stable tabs or segmented controls for `Table`, `Trend`, `Changes Only`, and `Original Reports`.
- Breadcrumb/back navigation that returns to the patient record without losing the review context.

**Selection patterns:**

- Report picker with `Select all`, `Last 3`, `Last 5`, date range, and clear actions.
- Parameter picker grouped by category with search and counts.
- Separate warning section for mapped-but-not-comparable observations.
- Selection summary that states exactly how many reports and parameters are included.

**Comparison patterns:**

- Two visible status dimensions: source laboratory status and Roshi comparator status.
- Sticky parameter column and horizontally scrollable report columns on wide screens, with a stacked readable alternative on narrow screens.
- Per-cell source reference range and source organization indicator.
- Changes-only list as a reversible view, not a destructive filter.
- Row-level `Why highlighted?`, `Reference details`, and `Original report` actions.

**Trend patterns:**

- One aligned mini-trend per parameter when units or scales differ.
- Reference-range band tied to each observation or effective interval.
- Markers for laboratory, method, unit, and reference changes.
- Hover, focus, and touch details that remain visible long enough to inspect.
- A text table below or beside every chart.

**Visual patterns:**

- Teal for primary navigation and neutral clinical controls.
- Red reserved for source-critical or formally approved critical states.
- Amber for approved significant change or abnormality, with explicit text.
- Green for improvement/resolution only when the rule defines it.
- Neutral styling for mathematical change without clinical significance.
- Soft borders and stable spacing; no color-only or decorative status treatment.

### Anti-Patterns to Avoid

- Treating similar display names as proof of equivalence.
- Showing a single combined axis for parameters with different units.
- Hiding the full history permanently behind `Changes Only`.
- Using red for a large percentage delta when the source laboratory did not identify a critical state.
- Allowing AI-style language to imply diagnosis, causality, or prescribing instructions.
- Presenting a normalized unit without the original result and unit.
- Replacing historical reference ranges with the current range.
- Using hover-only tooltips with no keyboard or touch equivalent.
- Overloading a clinician with laboratory governance fields before they ask for them.
- Using cards within cards or decorative dashboard styling that competes with the comparison task.
- Showing blanks, loading gaps, or missing ranges as if they were normal results.
- Letting a source-report link lead to a different or broken route.

### Design Inspiration Strategy

**What to Adopt:**

- Dense, scannable clinical tables with pinned context and explicit statuses.
- Search-first selection with reusable presets for common report histories.
- Synchronized table/trend/detail interaction.
- Progressive disclosure from clinician summary to technical provenance.
- Stable, calm loading and error states.
- Text equivalents and keyboard access for every important chart and status.

**What to Adapt:**

- Convert the current single-result prototype into a multi-report, multi-parameter workspace.
- Adapt analytical dashboard filters to clinical language: `Critical`, `Major change`, `Newly abnormal`, `Returned to range`, `Not directly comparable`.
- Adapt source badges to distinguish `In-house`, `OLIS`, `External hospital`, and `Unknown source`.
- Adapt responsive behavior so desktop is dense and tablet/mobile is sequential without losing source or safety information.
- Adapt alert patterns to require acknowledgement and source verification rather than just opening a detail card.

**What to Avoid:**

- Generic AI dashboard styling that makes derived text look more authoritative than source data.
- Irreversible filtering, hidden provenance, and unexplained scores.
- Decorative motion or color that increases urgency without clinical evidence.
- Proprietary visual copying; use transferable interaction principles and the existing design system instead.

## Design System Foundation

### 1.1 Design System Choice

Extend the existing custom, tokenized healthcare design system built on Tailwind CSS v4 and reusable React primitives. Do not introduce MUI, Ant Design, Chakra, or a second visual component library for the comparator.

This is a custom system with an established primitive base:
- Existing buttons, badges, cards, tables, typography, spacing, focus, and clinical status primitives.
- New comparator-specific composites built from those primitives.
- Semantic clinical tokens rather than hard-coded color decisions inside components.

### Rationale for Selection

- The EHR already has a coherent calm clinical language and reusable design primitives.
- Clinicians need dense data surfaces, status pairs, tables, trends, warnings, and provenance rather than generic enterprise widgets.
- A parallel component library would create inconsistent focus, spacing, semantics, and theming.
- The existing system can support WCAG 2.2 AA, AODA, reduced motion, forced colors, compact density, and EN/FR without replacing the stack.
- A tokenized extension preserves speed while allowing the comparator to feel intentional and distinct from the current prototype.

### Implementation Approach

**Semantic tokens:**

- `clinical.source.normal`, `clinical.source.abnormal`, `clinical.source.critical`.
- `clinical.comparator.stable`, `clinical.comparator.majorChange`, `clinical.comparator.improving`, `clinical.comparator.worsening`, `clinical.comparator.notComparable`.
- `clinical.surface`, `clinical.surfaceMuted`, `clinical.border`, `clinical.focus`.
- Separate foreground, background, border, icon, and forced-color mappings.
- Never use color as the sole state signal; every status has text and an icon/direction symbol.

**New comparator composites:**

- `ReportSelectionPanel`
- `ParameterSelectionPanel`
- `ComparisonToolbar`
- `ComparisonTable`
- `ComparisonRow`
- `SourceStatusPair`
- `ReferenceChangeNotice`
- `ComparabilityWarning`
- `TrendMiniChart`
- `TrendTextSummary`
- `ExplanationPanel`
- `ProvenancePanel`
- `ReviewActionBar`

**Density and display modes:**

- Default: readable clinician review.
- Compact: high-volume laboratory review with stable row heights and pinned context.
- Touch: larger targets and stacked panels for tablet.
- High contrast/forced colors: preserve all labels, borders, and focus indicators.
- Reduced motion: disable lift, animated chart transitions, and pulsing except where required for a critical notification and provided with text.

**Accessibility implementation:**

- Native buttons, links, inputs, tables, and headings before custom roles.
- Use table captions, row/column headers, `aria-describedby` for explanations, and live regions for refresh/error status.
- Charts provide an accessible text summary and keyboard-focusable points or a linked data table.
- Focus indicators remain visible and are not covered by sticky bars.
- Minimum pointer target size follows WCAG 2.2 AA.
- Validate at 200 percent text resize and 320 CSS pixel reflow where the workflow permits; provide an intentional accessible table mode for necessary two-dimensional comparison.
- All status chips contain visible text; color and icon supplement text.

### Customization Strategy

- Preserve the established EHR palette but define a dedicated comparator semantic layer so source-critical red cannot be confused with comparator amber.
- Use restrained teal primary actions, neutral data surfaces, soft blue information notices, amber approved change states, red source-critical states, and green rule-defined improvement/resolution.
- Keep typography and spacing aligned with the existing design system; do not introduce decorative gradients or oversized marketing layouts.
- Use progressive disclosure for technical metadata: clinician summary first, source/rule/provenance detail on demand.
- Provide EN/FR message keys for all comparator labels, warning codes, source names, and explanation templates.
- Keep clinical copy factual and cautious; no diagnosis, treatment command, or causal claim from comparator output.
- Document every new primitive/composite with usage, accessibility contract, states, and test examples.

## 2. Core User Experience

### 2.1 Defining Experience

**Select to Explain**

A clinician selects a set of laboratory reports and parameters, and the workspace immediately produces a trustworthy longitudinal comparison. Every highlighted row answers four questions in place:

1. What did the laboratory report?
2. What changed across comparable observations?
3. Why did Roshi highlight it?
4. Where can I verify the source?

The distinctive value is not automated diagnosis. It is the reduction of manual report-opening and memory work while preserving the evidence needed for clinical judgment.

### 2.2 User Mental Model

Users currently think in reports and dates: open report, find the analyte, remember the value, open the previous report, repeat, and mentally account for different laboratories and ranges. They expect a table or timeline where the same parameter lines up across dates.

The comparator should preserve that familiar mental model while adding safe structure:

- Reports are the columns or source events.
- Parameters are the rows or selected tracks.
- Source laboratory interpretation is a fact attached to each result.
- Roshi status is a separate relationship between results.
- A warning means the system has identified a limitation, not a normal result.
- The original report remains the definitive verification surface.

Likely confusion points are similar names, different specimens, changed methods, mixed units, missing reference intervals, amended results, and a red or amber state whose origin is unclear. The UI addresses these with explicit identity, source, comparability, and status labels.

### 2.3 Success Criteria

**User success:**

- The user can select reports using presets or a date range and see the selection count.
- The user can select individual parameters and see which observations are included, excluded, or not comparable.
- The comparison table distinguishes source interpretation from comparator status in every clinically relevant row.
- The user can identify current value, previous comparable value, absolute/percentage change, reference at each date, source laboratory, and original report without leaving the workspace.
- Every major change has a `Why highlighted?` explanation with inputs and rule version.
- `Changes Only` reduces scanning effort but exposes `Show all results` at all times.
- A critical source result is not visually conflated with a merely large mathematical delta.
- Corrected/amended results are active in the comparison while prior versions remain discoverable.
- Keyboard-only users can complete the full flow and inspect chart data through the accessible table/text alternative.

**Experience quality:**

- Selection feedback is immediate and does not reset unrelated choices.
- Loading preserves already displayed clinical data.
- Warnings are calm, specific, and actionable.
- The user never has to infer whether a blank means missing, pending, not comparable, or normal.
- Returning from an original report preserves the comparison context.

### 2.4 Novel UX Patterns

The individual controls are established patterns: multi-select lists, filter chips, sortable tables, charts, status badges, disclosures, and source links. The novel combination is the dual-status comparison row:

- Source status: what the laboratory reported.
- Comparator status: what the approved rule derived.
- Evidence affordance: why the derived state exists.
- Provenance affordance: where the source can be verified.

This pattern should be taught through labels and a first-use inline explanation, not a separate tutorial. The unique twist is safe synthesis: the workspace makes longitudinal change easier to see while refusing to collapse uncertainty into a diagnosis.

### 2.5 Experience Mechanics

**1. Initiation:**

- Entry from the patient Laboratory Results surface or a critical/changed-result alert.
- The selected patient and optional selected result are carried into the canonical comparator route.
- The header states patient, purpose, and AI/safety boundary.
- The page loads report metadata first and shows a clear loading state for observations and evaluations.

**2. Report selection:**

- The user sees chronological eligible reports with date, source organization, status, and report type.
- Presets provide `Last 3`, `Last 5`, `Select all`, `Date range`, and `Clear`.
- A configurable maximum applies to detailed table view; longer histories remain available in trend view.
- Cancelled, entered-in-error, and superseded versions are labelled and excluded from active comparison by default, with an accessible history option.

**3. Parameter selection:**

- The system groups candidates by approved parameter identity and category.
- Search matches display, code, specimen, category, and source terms.
- `Select abnormal`, `Select changed`, and `Select critical` are convenience actions, never hidden selection rules.
- An exclusions/warnings section explains unmapped, method-different, specimen-different, qualitative/numeric, and incompatible-unit observations.
- The user confirms the selected parameter count before entering comparison.

**4. Comparison feedback:**

- The workspace opens in Table view with selected reports as columns and parameters as rows.
- Each result cell shows original value, original unit, source interpretation, source reference range, date, and source indicator.
- A separate comparator column or row summary shows stable, major change, newly abnormal, improving, worsening, returned to range, or not comparable.
- The system displays a projection revision and generated time when freshness matters.
- Partial data remains visible with explicit missing/pending labels.

**5. Explanation interaction:**

- Selecting a row or `Why highlighted?` opens an adjacent explanation panel on desktop and a sequential section on smaller screens.
- The panel lists current/previous source observations, absolute/percentage delta, range transition, source statuses, source organizations, mapping/rule versions, and rationale facts.
- It states whether the highlight came from the laboratory, an approved comparator rule, or both.
- It never states a diagnosis or treatment instruction.

**6. Trend interaction:**

- Trend view shows one aligned mini-trend per selected parameter when units/scales differ.
- Each point supports mouse, keyboard, and touch inspection.
- Reference bands are tied to the relevant observation/range period.
- Method, unit, laboratory, and reference changes appear as text markers.
- A synchronized accessible data table remains available.

**7. Completion:**

- The user can acknowledge/review, open the original report, create follow-up work, message the patient through existing workflows, or export where authorized.
- A success status confirms the action and identifies the audit event context without exposing technical internals.
- Returning to the patient chart preserves the selected source context.

**8. Error and recovery mechanics:**

- Missing data: show `Not provided by source laboratory`.
- Unmapped data: show `Not mapped; comparison limited`.
- Incompatible data: show `Not directly comparable` with the reason.
- Stale projection: show the source revision and `Refresh`.
- Source unavailable: preserve cached permitted data and label it stale; do not present it as current.
- Failed evaluation: keep source values visible, suppress derived status, and provide retry.

## Visual Design Foundation

### Color System

The visual language is calm, clinical, and information-dense rather than decorative. Use the existing EHR semantic token layer and extend it for comparator-specific states.

**Surfaces and structure:**

- Page background: pale blue-gray/mint `#F3FAFB`.
- Main workspace: white `#FFFFFF`.
- Muted surface: `#F6F9FB`.
- Border: blue-gray `#D8E5EF`.
- Strong border/focus: teal `#0F766E`.
- Primary text: deep navy/slate `#121A2D`.
- Secondary text: slate `#5F6E83`.

**Semantic statuses:**

- Source normal: emerald text/background with explicit `Normal` or `Within range`.
- Source abnormal: amber text/background with explicit `High`, `Low`, or `Abnormal`.
- Source critical: rose/red text/background with explicit `Critical high` or `Critical low`.
- Comparator stable: neutral slate with explicit `Stable`.
- Comparator significant change: amber with `Major increase`, `Major decrease`, or `Significant change`.
- Comparator improvement/resolution: emerald with `Improving`, `Returned to range`, or `Resolved`.
- Non-comparable: slate/blue information treatment with `Not directly comparable`.
- Information/safety notice: soft blue `#EAF4FF` with strong blue text.
- Review/governance: restrained violet only for workflow state, never for clinical severity.

**Rules:**

- Red is reserved for source-critical or formally approved critical states.
- A large mathematical delta never receives red by itself.
- Every state combines color, visible text, and an icon/directional symbol.
- All foreground/background and border combinations are checked for WCAG 2.2 AA contrast.
- Forced-colors mode must preserve semantic text and borders even when authored colors are suppressed.
- Do not use gradients, glow, or decorative color to imply clinical importance.

### Typography System

Use the existing design-system typography tokens. Where the token system does not yet provide a branded family, use a readable clinical sans such as Source Sans 3 with a system fallback, and IBM Plex Mono for tabular numeric values.

**Hierarchy:**

- Page title: 28-32px, bold, line-height 1.2.
- Workspace heading: 20-24px, semibold, line-height 1.25.
- Section heading: 16-18px, semibold, line-height 1.35.
- Body: 14-16px, regular, line-height 1.5.
- Dense table: 13-14px, line-height 1.4.
- Metadata/helper: 12-13px, line-height 1.4.
- Clinical values: tabular numerals, strong weight, no decorative italic.
- Status labels: 12-13px, semibold, sentence case; avoid unexplained abbreviations.

**Typography behavior:**

- Do not scale type with viewport width.
- Keep letter spacing at zero unless a token explicitly requires otherwise.
- Preserve readable line length in explanation panels.
- Use text labels for source/comparator distinctions; do not rely on font weight alone.
- Support 200 percent text resizing without clipped values or hidden controls.

### Spacing & Layout Foundation

Use a 4px base unit with an 8px primary rhythm.

**Shell and grid:**

- Desktop workspace max width: 1440-1600px.
- Outer page padding: 16px mobile, 24px tablet, 32px desktop.
- Desktop structure: report/parameter selection rail, primary comparison workspace, contextual explanation/provenance rail.
- Comparison table uses stable column widths, sticky parameter/source context, and horizontal scrolling only for the inherently two-dimensional table mode.
- Desktop cards/panels use an 8px radius; the outer workspace shell may use a larger 24px radius where the existing EHR shell already establishes that language.
- Panel gaps: 16-24px.
- Control gaps: 8-12px.
- Dense table row height: stable 52-64px depending on metadata.
- Touch controls: minimum 44px target and clear spacing.

**Responsive order:**

1. Patient context and comparator safety notice.
2. Report and parameter selection summary.
3. Comparison table or selected-result summary.
4. Trend view.
5. Explanation and provenance.
6. Warnings and source details.
7. Review and follow-up actions.

On mobile, preserve the same information order without forcing a three-column layout. The full table has an accessible stacked or row-detail mode.

**Motion:**

- Use short, calm transitions for selection and panel expansion.
- Disable non-essential motion under reduced-motion preferences.
- Never animate values in a way that suggests a clinical trend before data is loaded.
- Critical notifications use text and an action state; no flashing or pulsing as the sole signal.

### Accessibility Considerations

- Target WCAG 2.2 AA and Ontario AODA expectations.
- Use landmarks for header, selection, comparison, explanation, and action regions.
- Provide a skip link to the comparison workspace.
- Use native semantic controls and real table headers.
- Ensure the report/parameter selection flow is fully keyboard operable with visible focus.
- Announce result refresh, warnings, errors, and review confirmations through accessible status messages.
- Give charts a concise accessible summary plus a complete data table.
- Keep source interpretation, comparator status, and non-comparable reasons in text.
- Keep sticky headers and bottom action bars from obscuring focused content.
- Test keyboard, screen reader, forced colors, high contrast, reduced motion, 200 percent zoom, and narrow viewport reflow.
- Provide EN/FR translation keys for every user-visible comparator state and explanation phrase.
