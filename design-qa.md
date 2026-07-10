# Notebook publishing and photography design QA

## Evidence

- Source visual truth — notebook context: `/Users/betancourt/.codex/generated_images/019f4ab8-591c-7a70-8d71-b826ac1f8f50/exec-eedc22c7-9620-47df-9b13-83ac107379bb.png`
- Source visual truth — photography editor: `/Users/betancourt/.codex/generated_images/019f4ab8-591c-7a70-8d71-b826ac1f8f50/exec-d7c3e8f2-3fcb-4b09-9d36-19c6da1ffdd9.png`
- Browser-rendered Notebook: `/private/tmp/posts-fotografia-qa.png`
- Side-by-side comparison: `/private/tmp/posts-notebook-comparison.png`
- Viewports checked: 1440 x 1024 and 390 x 844 CSS pixels.

The source and browser screenshot were inspected together in the side-by-side comparison. The implementation keeps the existing site shell and separates editing into its author route, so the comparison treats the central Notebook, navigation, previews, button hierarchy, typography, and color tokens as the shared surface.

## Findings

No actionable P0, P1, or P2 visual differences remain.

- Typography and color: the implementation preserves the black background, compact monospace hierarchy, mint accent, muted metadata, and grayscale compatibility used by the references.
- Notebook layout: the title, description, navigation, two-column photography grid, dates, captions, and secondary archive column retain the source hierarchy without introducing a new card system.
- Actions: the unlabeled icon cluster was replaced by compact labelled controls. Destructive deletion moved into `Más`, while creation and editing stay visible.
- Photography previews: every current card resolves to a lightweight thumbnail without a full-resolution `srcset`. The browser reported 310–640 px natural sizes for the list.
- Individual photography: the detail route resolves directly to the original asset. The browser reported the tested photo at 4096 x 3072 with no preview `srcset`.
- Publication state: both author editors expose the three states from the reference — saved in GitHub, deploying, and available publicly — and only report public success after checking the route.
- Responsive navigation: the mobile Notebook menu retains its expanded state when moving from Fotografía to Escritos.
- Accessibility: action labels are present in visible text and accessible names; publication feedback does not rely only on color.

## Primary interactions tested

- Open `/es/fotografia/` in desktop and mobile viewports.
- Confirm five preview images load completely and no card advertises the HD original through `srcset`.
- Open an individual photograph and confirm the HD original is the selected resource.
- Expand the Notebook navigation on mobile, navigate to a second Notebook, and confirm it remains expanded.
- Inspect the final browser console for application errors.
- Run direct template assertions for publication, visibility, preview conversion, and Notebook-to-channel controls.

## Comparison history

1. Initial implementation still exposed icon-only actions and allowed responsive `srcset` to select HD images on the Notebook list.
2. The action cluster gained visible labels and a `Más` menu; list cards now use preview-only sources.
3. The detail route was changed to request the original directly, making the preview-to-HD transition explicit.
4. Final side-by-side review found no blocking visual or interaction mismatch on the shared Notebook surface.

## Follow-up polish

- P3: the reference presents publication as an in-context drawer; this implementation uses the existing dedicated author editor and carries over the same states and controls. This avoids duplicating editor state inside the public Hugo page.

final result: passed

---

# Compact mobile editor header design QA

## Evidence

- Source visual truth: `/Users/betancourt/.codex/generated_images/019f4cd9-f066-7b23-9398-bb8271b87b9e/exec-4e979492-dc97-4db3-93f0-c335a9f7f667.png`
- Browser-rendered implementation: `/tmp/editor-compact-390.png`
- Normalized full-view comparison: `/tmp/editor-design-comparison.png`
- Focused header comparison: `/tmp/editor-header-comparison.png`
- Viewport: 390 x 844 CSS pixels.
- State: dark and grayscale author editor, editing `content_es/fotografia/zmg.md`.

The generated mockup and browser implementation were normalized to the editor viewport and inspected together. A focused comparison was required because the approved change is concentrated in the persistent mobile header.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation keeps the existing sans-serif mobile editor type, compact `betancourt` identity, hidden preview label, and visible `Guardar` hierarchy from the mockup.
- Spacing and layout rhythm: the header is one 68 px row; close, identity/status, preview, properties, and save fit without horizontal overflow. The bottom toolbar remains fixed to the viewport edge.
- Colors and visual tokens: the pure-black surface, white/gray icons, muted state dot, transparent icon buttons, and outlined save action match the approved dark mockup.
- Image and icon fidelity: the implementation reuses the repository's existing SVG icon system, including the same preview eye already used by the image editor. No new raster asset or substitute icon was required.
- Copy and content: `Abrir sitio` is accessible but visually icon-only on mobile; Markdown remains in the lower toolbar; Are.na remains available inside Propiedades.
- Intentional difference: the mockup uses an empty canvas, while the implementation shows the loaded `ZMG` title and summary because object hydration is required behavior.

## Primary interactions tested

- Open the exact ZMG edit route at 390 x 844.
- Open and close Propiedades; confirm the Are.na controls remain present.
- Toggle Markdown from the lower toolbar and confirm the Markdown canvas becomes active.
- Confirm the top Markdown and Are.na controls are hidden on mobile.
- Force a missing-object error and confirm Reintentar replaces Vista previa without adding width or a second row.
- Check the browser console for warnings and errors.

## Comparison history

1. The first browser capture matched the approved single-row hierarchy and required no P0/P1/P2 visual correction.
2. Interaction checks confirmed the removed top-level actions remain available in their approved destinations.
3. Error-state testing exposed Vista previa and Reintentar in the same slot; the hidden-state specificity was corrected and the post-fix browser check confirmed only Reintentar remains.

## Follow-up polish

- P3: the enabled save button is brighter than the disabled-looking save state in the generated mockup. This is intentional state feedback and preserves usability.

final result: passed
