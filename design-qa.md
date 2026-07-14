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

# GitHub wall square-cell design QA

## Evidence

- Source visual truth: `/var/folders/yg/rt8w41_56d30cbn9r6gbggyw0000gn/T/codex-clipboard-70e38866-71c1-4041-a509-b42a152e2a1f.png`
- Browser-rendered implementation: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-square-cells-desktop-1976x1170.png`
- Full-view comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-square-cells-comparison-full.png`
- Focused wall comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-square-cells-comparison-focus.png`
- Mobile implementation: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-square-cells-mobile-390x844.png`
- Viewports: 1976 x 1170 desktop and 390 x 844 mobile CSS pixels.
- State: Spanish Code index, dark theme, GitHub snapshot fallback.

The source screenshot was normalized to 1976px wide for the full comparison because it includes macOS and browser chrome. The focused comparison aligns the GitHub activity regions and makes the requested cell geometry directly readable.

## Comparison history

### Initial finding

- P2: contribution cells stretched horizontally with the available content width while their height remained fixed at 11px. The source focus shows visibly rectangular cells, weakening the contribution-wall rhythm.

### Fix

- Defined one 11px cell-size token and one 3px gap token on the contribution chart.
- Applied the same fixed size to week columns, weekday rows, month columns, and legend cells.
- Changed the chart to intrinsic width so wide screens no longer deform the calendar.

### Post-fix evidence

- All 366 rendered contribution cells measure exactly 11 x 11px at desktop and mobile widths.
- The desktop document has no horizontal overflow.
- At 390px, the wall viewport is 358px wide and its 773px calendar scrolls within that region; the page itself does not overflow.
- Browser console: no warnings or errors.
- No remaining P0, P1, or P2 findings.

## Required fidelity surfaces

- Fonts and typography: unchanged.
- Spacing and layout rhythm: the calendar now uses a consistent square grid and aligned month labels.
- Colors and visual tokens: existing contribution-level colors are unchanged.
- Image and asset fidelity: no image or icon assets were introduced or replaced.
- Copy and content: labels, dates, project content, and contribution data are unchanged.

final result: passed

---

# Books status shelves design QA

## Evidence

- Source visual truth: `/Users/betancourt/.codex/generated_images/019f5da5-1b24-7791-a7e6-57416dc9fe84/exec-36df320a-a08b-42b5-9b75-139c2ea54e47.png`
- Browser-rendered English desktop: `/private/tmp/posts-books-option-2-desktop-final-v4.png`
- Browser-rendered Spanish desktop: `/private/tmp/posts-libros-option-2-desktop-final.png`
- Browser-rendered English mobile: `/private/tmp/posts-books-option-2-mobile-final-v4.png`
- Normalized full-view comparison: `/private/tmp/posts-books-option-2-comparison-final-v4.png`
- Viewports: 1440 x 1024 and 390 x 844 CSS pixels.
- State: dark theme, collapsed reading-status shelves, public English and Spanish routes.

The reference and implementation were opened together in the normalized comparison. A separate focused crop was not needed because both full-size captures were also inspected at original resolution, where titles, authors, status labels, progress segments, ratings, and review excerpts were legible.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation reuses the site's JetBrains Mono/IBM Plex Mono stack and preserves the reference hierarchy between headings, titles, authors, status labels, and opinion copy.
- Spacing and layout: all three shelves appear in the first desktop viewport. The two-column rows without opinions and three-column reviewed rows match the reference's scanning pattern without horizontal overflow.
- Colors and tokens: the implementation uses the existing black background, mint accent, muted text, and hairline separators in dark and light-theme-compatible variables.
- Image and asset fidelity: the change adds no replacement imagery or custom icon assets. The existing dynamic graph remains untouched as part of the surrounding site shell.
- Copy and content: labels are localized for English and Spanish. Opinion excerpts are rendered only from real `My review` or `Mi reseña` content, with the stored rating when available.
- Accessibility: shelf regions have headings, status rails expose progressbar semantics and text labels, disclosure controls are keyboard-native, and mobile summaries keep a 44 px touch target.
- Responsive behavior: the desktop grid collapses to two columns and then one column without clipping; the 390 px viewport has zero horizontal overflow.

## Primary interactions tested

- Open and close the `Now reading` disclosure; confirm the remaining seven current books appear and collapse again.
- Open `Cold Intimacies` from the shelf and confirm the book detail route loads, then return to `/books/`.
- Open `/es/libros/` and confirm `Leyendo ahora`, `Leídos`, `Por leer`, and `Mi opinión` render from the same data.
- Check browser warnings and errors after desktop, Spanish, interaction, and mobile passes.

## Comparison history

1. The first implementation rendered all 96 books at once, which pushed opinions and later shelves below the first viewport and made no-opinion progress tracks too close to titles.
2. The shelves gained native disclosure controls, review-first ordering inside `Read`, and a two-column layout for rows without opinions.
3. The description and excerpt density were tightened so all three shelf headings, five real opinions, and the first `Want to read` row are visible in the desktop viewport.
4. Disclosure controls moved into the shelf heading line on desktop while remaining full-height controls on mobile. The final comparison found no P0/P1/P2 mismatch.

## Follow-up polish

- P3: the reference uses a curated eight-book sample, while the implementation uses live library data and adds subtle `Show more` controls so all 96 books remain reachable.
- P3: the dynamic knowledge graph differs between screenshots because its simulation state is not deterministic; it was outside the changed Books surface.

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

---

# Code section design QA

## Source and implementation

- Source mockup: `/Users/betancourt/.codex/generated_images/019f5de2-d3cc-7703-8ff6-a969bfedcb61/exec-a24863db-e0ad-4c7a-b93b-f064b3c57469.png`
- Implementation capture: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-section-implementation-1536x1024-final.png`
- Full combined comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-section-comparison-final.png`
- Focused content comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-section-comparison-focus-final.png`
- Viewport: 1536 x 1024
- State: English Code index, dark theme, GitHub static fallback in local Hugo preview

## Comparison history

### Pass 1

- Desktop composition matched the source: fixed left navigation, compact Code introduction, six-column technology summary, full-width contribution calendar, and three-column project grid.
- Project titles, summaries, access labels, and technology lists remained legible without clipping.
- Intentional data differences: technology percentages are derived from the seven real projects and the contribution chart uses a real public GitHub snapshot rather than the illustrative values in the mockup.
- P2 responsive finding: the English mobile navigation toggle switched to Spanish labels after initialization.
- Fix: localized the JavaScript toggle labels through the existing Hugo language context.

### Final pass

- Full and focused side-by-side comparisons show no remaining P0, P1, or P2 visual mismatch.
- Desktop has no horizontal overflow at 1536 px. The project grid resolves to three equal columns and the technology strip to six equal columns.
- Mobile has no page-level horizontal overflow at 390 px. Technologies resolve to two columns, projects to one column, and the contribution chart scrolls inside its own region.
- English mobile navigation changes from `Show notebooks` to `Hide notebooks`, updates `aria-expanded`, and reveals the navigation list.
- Project links navigate to their existing detail pages.
- Browser console: no warnings or errors in the tested desktop or mobile states.

## Functional wall behavior

- The checked-in contribution snapshot is rendered immediately and remains available when the live request fails.
- In production, the browser requests the same-origin endpoint; the endpoint uses `GITHUB_TOKEN` server-side and returns normalized GitHub contribution data with cache headers.
- The token is not returned to the client.

final result: passed
