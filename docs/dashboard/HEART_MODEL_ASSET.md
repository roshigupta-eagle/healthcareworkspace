# Heart anatomy reference asset

The Patient Focus Heart viewer uses `ehr/public/models/hubmap/VH_M_Heart.glb` as a **generic educational reference object**. It is never patient-specific, is not derived from the selected patient's imaging, and is not intended for diagnostic interpretation.

## Source and attribution

- **Asset:** `VH_M_Heart.glb` (Visible Human Male Heart)
- **Library/version:** [HuBMAP CCF 3D Reference Object Library](https://hubmapconsortium.github.io/ccf/pages/ccf-3d-reference-library.html), v1.2
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Required citation:** Browne, K., Schlehlein, H., Herr II, B. W., Quardokus, E., Bueckle, A., & Börner, K. (2022). *HuBMAP CCF 3D Reference Object Library*.
- **Downloaded source:** `https://raw.githubusercontent.com/hubmapconsortium/ccf-releases/main/v1.2/models/VH_M_Heart.glb`

## Asset inspection and implementation scope

The checked GLB contains named left/right atria, left/right ventricles, valves, papillary muscles, and interventricular septum (approximately 164,119 triangles). It does **not** contain separate great-vessel, coronary-artery, or coronary-vein meshes.

The viewer renders the licensed chamber mesh as the primary heart anatomy. Its educational great-vessel and coronary-artery paths are explicitly generic overlays with named anatomical anchors; they are not a claim that those meshes came from the HuBMAP file or from the selected patient's data. Coronary-vein and conduction-system controls are intentionally not exposed because the licensed asset does not separately model them.

## Changes and performance handling

- No geometry topology, donor data, or anatomical labels in the downloaded source were changed.
- Runtime-only changes apply centred scale/orientation, restrained PBR material calibration with subtle deterministic vertex-color variation, selection highlighting, and a controlled internal/exploded presentation.
- The 4.1 MB GLB is lazy-loaded through React Three Fiber, cached by the loader, and shown with a loading state; a labelled 2D fallback remains available when WebGL is unavailable or loading fails.
- This implementation has no patient imaging, FHIR-derived segmentation, or simulated findings. A patient-specific cardiac model requires authorized imaging and validated segmentation in a future, separately governed workflow.
