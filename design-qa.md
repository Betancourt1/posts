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
