---
title: 'High-fidelity generic heart anatomy viewer'
type: 'feature'
created: '2026-09-01'
status: 'in-progress'
baseline_commit: '484507c221c960dbddd53bac6faccd14e295176d'
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Patient Focus Heart view currently renders a low-poly abstract blob with wireframe edges. It does not provide a credible clinical anatomy experience or the requested focused interaction controls at the existing dashboard deep link.

**Approach:** Replace only the generic heart branch of the existing React Three Fiber scene with a smooth, detailed procedural adult-heart visualization. Provide non-diagnostic anatomical display controls, selection feedback, labels, a transparent cutaway, and optional educational blood-flow animation while preserving the existing generic-model disclosure and authorized patient snapshot workflow.

## Boundaries & Constraints

**Always:** Keep the target route and existing organ viewer navigation working; retain the generic anatomical model disclosure; use the installed Three.js/React Three Fiber stack; respect reduced-motion preferences; provide keyboard-accessible, 44px controls and a WebGL fallback; make no clinical inference or patient-specific claim.

**Ask First:** Adding a validated/licensed heart mesh or patient imaging/DICOM-derived model, adding a new package, changing FHIR/terminology mappings, changing patient snapshot APIs, or showing patient-specific clinical overlays.

**Never:** Render low-poly geometry, wireframe anatomy, fabricated diagnoses/measurements/findings, or embedded patient data in model assets. Do not claim the procedural model is exhaustive or diagnostic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Heart deep link | `organ=heart` and WebGL available | Generic heart scene starts in an LAO-oriented view with anatomy controls | Existing canvas boundary exposes retry and 2D fallback |
| Reduced motion / no WebGL | Browser preference or unavailable context | Static accessible fallback remains available; flow does not animate | Viewer remains navigable and disclosure remains visible |
| Anatomical selection | Pointer or control selects a structure | Only that structure highlights and its plain-language detail is announced | Unknown selection clears safely |
| Display options | Labels, cutaway, vessels, flow, or explode toggled | Rendering changes locally without requesting or changing patient data | Flow is pausable and never affects clinical data |

</frozen-after-approval>

## Code Map

- `ehr/src/components/command-center/organ-explorer/HeartAnatomy.tsx` — dedicated client-side smooth heart scene and educational anatomy metadata.
- `ehr/src/components/command-center/organ-explorer/OrganCanvas.tsx` — 3D canvas controls, lighting, camera preset, and heart display-state bridge.
- `ehr/src/components/command-center/organ-explorer/OrganMesh.tsx` — replaces only the generic heart blob with the dedicated scene.
- `ehr/src/components/command-center/organ-explorer/OrganExplorer.tsx` — non-diagnostic controls, selection detail, and accessible text alternative.
- `ehr/src/components/command-center/organ-explorer/Viewer2DFallback.tsx` — recognizable heart fallback when WebGL is unavailable.
- `ehr/src/components/command-center/command-center.css` — clinical dark viewer, toolbar, selected-detail, focus, and responsive styling.
- `ehr/src/lib/organRegistry.ts` — LAO-oriented default camera metadata for the heart entry.
- `ehr/src/__tests__/heartAnatomy.test.ts` — validates anatomy metadata and safe display defaults.

## Tasks & Acceptance

**Execution:**
- [ ] Add a dedicated, smooth, procedural heart scene with separate myocardium, chambers, major vessels, coronary vessels, optional cutaway internals, and restrained holographic light treatment.
- [ ] Flow local UI state from the existing explorer to canvas/model; add label, vessel, conduction, cutaway, exploded, blood-flow, pause, and reduced-motion controls.
- [ ] Preserve generic-model language, existing patient data overlays, navigation, panning/zooming, and graceful 2D fallback.
- [ ] Add focused unit coverage for anatomy descriptions and safe generic defaults.

**Acceptance Criteria:**
- Given the supplied patient-focus URL with `organ=heart`, when the viewer loads, then it presents a smooth generic adult-heart anatomical model rather than a wireframe/polygonal blob.
- Given a user toggles a display option or selects a structure, when the action is made, then the viewer updates locally and presents an accessible plain-language description without displaying a fabricated patient finding.
- Given reduced motion is requested or WebGL fails, when the route loads, then a usable static fallback and the generic-model disclosure remain available.
- Given any non-heart organ is selected, when its viewer loads, then its existing presentation remains unchanged.

## Design Notes

The visual boundary is deliberately isolated inside the existing organ viewer feature. The scene uses high-segment geometry, physical materials, controlled rim illumination, and separate selectable structures rather than an external asset; a regulated or exhaustive anatomy model would require a validated/licensed source and clinical review.

## Verification

**Commands:**
- `npm --prefix ehr run lint` — expected: no new heart-viewer diagnostics (repository has existing unrelated lint failures).
- `npm --prefix ehr run test:unit` — expected: heart tests pass; report any unrelated baseline failure separately.
- `npm --prefix ehr run build` — expected: the dashboard client bundle compiles.
