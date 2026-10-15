# Organ View Registry

Single source of truth for the Clinical Anatomy Explorer. Implemented in
[ehr/src/lib/organRegistry.ts](../../ehr/src/lib/organRegistry.ts). Every organ-switching
behavior (arrows, keyboard, anatomy selector, data panel, overlays, 3D highlight/camera focus)
reads from this table — no per-organ `if (organ === 'lungs')` branching is allowed outside
this file and [OrganMesh.tsx](../../ehr/src/components/command-center/organ-explorer/OrganMesh.tsx)
(the unified body-scene renderer).

All SNOMED CT body-structure codes below are the well-known top-level concepts for each organ
system and are used only as a coarse `bodySite` label; they are **not** asserted as coming
from a coded FHIR `BodyStructure` resource (none exists in this system yet — see
`DATA_SOURCE_MAP.md`).

## Unified digital-twin scene (not isolated per-organ meshes)
The 3D viewer renders **one persistent body** (`BodyShell`, a Lathe-revolved head/torso profile
+ limbs, male/female/neutral proportions via `resolveBodyPresentation()`) plus every organ mesh
positioned at its registry-declared `focusPosition`. Selecting an organ highlights that mesh
(bright, emissive) and dims every other organ + the shell (ghosted, ~0.1–0.2 opacity); the
camera animates to `focusPosition` at `focusRadius` distance. Whole Body and Skin keep the shell
opaque and clothed (modest garment bands) with no internal organs rendered at all.

| # | organCode | Display name | Organ system | SNOMED body structure | 3D shape family |
|---|-----------|--------------|---------------|------------------------|----------------------|
| 1 | `whole-body` | Whole Body | Whole body | 38266002 (Entire body) | Body shell (opaque, clothed) |
| 2 | `heart` | Heart | Cardiovascular | 80891009 (Heart) | Deformed blob + aorta tube + apex cone |
| 3 | `lungs` | Lungs | Respiratory | 39607008 (Lung) | Paired lobed blobs + trachea tube |
| 4 | `brain` | Brain | Neurological | 12738006 (Brain) | Deformed blob (wrinkled hemispheres) |
| 5 | `kidneys` | Kidneys | Urinary | 64033007 (Kidney) | Paired partial-torus "bean" arcs |
| 6 | `liver` | Liver | Hepatobiliary | 10200004 (Liver) | Large asymmetric deformed blob |
| 7 | `stomach` | Stomach | Gastrointestinal | 69695003 (Stomach) | Deformed blob |
| 8 | `small-intestine` | Small Intestine | Gastrointestinal | 30315005 | Coiled tube (TubeGeometry spiral) |
| 9 | `large-intestine` | Large Intestine / Colon | Gastrointestinal | 71854001 | Coiled tube, wider/fewer turns |
| 10 | `pancreas` | Pancreas | Endocrine/Exocrine | 15776009 | Deformed blob (elongated) |
| 11 | `thyroid` | Thyroid | Endocrine | 69748006 | Deformed blob (butterfly lobes) |
| 12 | `spleen` | Spleen / Hematology | Hematologic | 78961009 | Deformed blob |
| 13 | `musculoskeletal` | Musculoskeletal / Spine | Musculoskeletal | 71341001 (Bone) | Vertebrae stack + rib/pelvis rings |
| 14 | `skin` | Skin / Wound | Integumentary | 39937001 (Skin) | Body shell (opaque, clothed, close camera) |
| 15 | `eyes-ent` | Eyes / ENT | Sensory | 81745001 (Eye) | Paired small deformed blobs |
| 16 | `reproductive-urologic` | Reproductive / Urologic | Reproductive/Urologic | 113331007 | Schematic sex-specific internal organs (privacy-gated) |

Cycle order above is the left/right arrow, keyboard, and anatomy-selector order (single array
in the registry — `nextOrganCode()`/`previousOrganCode()` wrap at the ends).

## Body presentation (male / female / neutral)
`resolveBodyPresentation(patient.gender, override)` picks the shoulder/hip proportions and,
for `reproductive-urologic` only, which schematic internal organs render (uterus+ovaries vs.
prostate+testes vs. a neutral marker). The clinician-facing toggle (shown only for Whole Body)
is an explicit **visual preference override** — it never mutates the Patient record. The
exterior body is always modestly clothed (opaque garment bands over chest and pelvis); internal
reproductive anatomy is schematic and only rendered in the internal (ghosted) view for that one
organ, never on the clothed exterior.

## Per-entry schema (see LLD for full TypeScript)
- `geometry` — deterministic parametric mesh spec (lobe count, aspect ratio, bump depth, color,
  accessory meshes, and — for `coil` shapes — `coilTurns`/`coilRadius`). Bespoke shape families
  (`blob`, `pairedBlob`, `beanPair`, `coil`, `spine`) keep the renderer generic; no organ needs a
  hand-authored one-off component.
- `focusPosition` / `focusRadius` - the organ's anatomical position inside the unified scene and
  the camera distance used when it's selected (replaces the old per-organ isolated camera).
- `learningGuide` - an optional, registry-declared generic educational reference. The UI uses the
  descriptor rather than branching on an organ code; it never receives patient snapshot data or
  represents patient imaging, findings, diagnoses, or recommendations.
- `keywordMatchers` - centralized, reviewed keyword list used only as a fallback when a
  record has no coded LOINC/relational link (see `DATA_SOURCE_MAP.md` policy).
- `observationLoincCodes` — preferred, coded lab-matching path (exact LOINC code set).
- `vitalKeys` — direct (non-heuristic) association of `Patient.vitals` categories, e.g. `heart`
  → `['bloodPressure','heartRate']`, `lungs` → `['oxygenSaturation']`, `whole-body` →
  `['weight','bmi','temperature']`.
- `overlayMetrics` — the 2–4 mini status cards shown beside the model (e.g., heart:
  Blood Pressure, Heart Rate, LDL*; *shown only if real data exists, otherwise omitted — never
  a placeholder value).
- `emptyStateText` — organ-specific copy for "No organ-specific results are available."
- `sensitiveData` — `reproductive-urologic` only; gates on the existing clinical-workspace role
  check (see LLD Permission Rules).

## Anatomy selector & position indicator
In addition to the arrows and carousel dots, `OrganExplorer` renders a searchable "Anatomy
View" dropdown (lists all 16 organs with their organ system) and a `"{index} of {count}"`
position indicator, both driven by the same `ORGAN_REGISTRY` array — no duplicated organ list.

## Model mode labelling (mandatory, see spec §17)
Because this system has no `ImagingStudy`/segmentation pipeline today, every organ currently
renders with `modelMode: 'generic'` and the persistent label:

> **Generic anatomical model — not generated from this patient's imaging.**

The registry, snapshot type (`modelMode`) and `OrganExplorer` UI are already wired for
`patient-imaging` and `segmentation` modes so that plugging in a real `ImagingStudy`/DICOM
source later is additive, not a rewrite.
