# Quotes central-only mosaic design QA

## Evidence

- Selected mockup: `/Users/betancourt/.codex/visualizations/2026/07/15/019f645d-18d4-7fb2-8bcf-ec480578a3e4/quotes-central-only-mockup.png`
- Desktop implementation: `/private/tmp/quotes-central-final-interaction.png`
- Mobile implementation: `/private/tmp/quotes-central-mobile.png`
- Full combined comparison: `/private/tmp/quotes-central-final-comparison.png`
- Focused central comparison: `/private/tmp/quotes-central-final-focus-comparison.png`
- Viewports: `1224 x 768` desktop and `500 x 845` mobile window captures.
- State: Spanish Citas author index, dark theme, recent order, built Astro Worker preview.

The reference and implementation were inspected together in both combined comparison images. The full comparison treats the header, Notebook navigation, graph, archive rail, footer, and terminal control as locked surfaces; the focused comparison judges only the central quote area.

## Findings

No actionable P0, P1, or P2 visual difference remains.

- Locked shell: the centered `betancourt` title, subtitle, search, settings, left Notebook menu, right graph and archives, footer, and terminal control continue to use the shared site components. No quote-specific selector changes those regions.
- Central-only change: `Citas`, its description, inline ordering controls, and the quote mosaic are contained inside the existing content column.
- Density: the first band now follows the same four-card rhythm as the selected mockup. The length-aware 12-column packer gives short quotes narrow blocks and longer passages wider blocks without inheriting a row's tallest height.
- Completeness: every runtime quote body is rendered directly, with authored line breaks preserved and no line clamp, ellipsis, fixed card height, or overflow clipping.
- Typography: quote length selects display, large, regular, or compact text while metadata stays visually subordinate. The implementation keeps the site's existing monospace family, mint accent, and hairline borders.
- Interactions: recent, oldest, and random ordering all update the selected state. Returning to recent after random restores a deterministic order.
- Responsive behavior: at the mobile capture width, the shared Notebook menu collapses normally and the quote mosaic becomes one column. Opening and closing the Notebook menu does not alter quote content.
- Intentional data differences: the mockup uses an illustrative ordering. The implementation displays the current D1 quote texts, authors, sources, tags, and archive totals.

## Comparison history

1. The prior implementation replaced the global shell with a quote-specific header and side rails; those overrides were removed so the shared shell is restored.
2. The first central-only pass still forced a `5 / 4 / 3` hero band and oversized its first quote, producing only three cards across the opening row.
3. The final pass derives every span from quote length, producing the denser four-card opening band visible in the selected mockup.
4. Browser interaction QA found that random order could leak into same-date recent ordering; a stable source sequence now resolves ties.

final result: passed

---

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

- P3: the reference presents publication as an in-context drawer; this implementation uses the existing dedicated author editor and carries over the same states and controls. This avoids duplicating editor state inside the public page.

final result: passed

---

# Quotes Length-Aware Mosaic Design QA

## Source and implementation

- Source mockup: `/var/folders/yg/rt8w41_56d30cbn9r6gbggyw0000gn/T/codex-clipboard-375ed3a4-0620-436c-823b-a836a59b718c.png`
- Desktop implementation: `/private/tmp/quotes-mosaic-desktop-final.png`
- Mobile implementation: `/private/tmp/quotes-mosaic-mobile-final.png`
- Full combined comparison: `/private/tmp/quotes-mosaic-reference-vs-final.png`
- Focused mosaic comparison: `/private/tmp/quotes-mosaic-focused-reference-vs-final.png`
- Viewports: `1586 x 992` desktop and `390 x 844` mobile
- State: Spanish public Citas index, dark theme, newest-first order

The reference and implementation were inspected together at the same desktop viewport. The focused comparison excludes the archive rail so the quote widths, font hierarchy, border rhythm, and natural-height packing can be judged directly.

## Findings

No actionable P0, P1, or P2 differences remain.

- Structure: the implementation matches the compact 50 px header, 12 rem order rail, edge-to-edge mint mosaic, and 15.75 rem archive rail from the source.
- Packing: all 74 real quote records render immediately. The first two three-card bands use complementary `5 / 4 / 3` spans, then the skyline packer assigns length-aware spans without propagating the tallest card height across a row.
- Completeness: automated browser measurements found zero clipped quote bodies, zero card overlaps, and zero horizontal overflow. Quote text keeps authored line breaks through `white-space: pre-line`.
- Typography: a featured quote can reach 1.3 rem, ordinary short quotes use 1 rem, long desktop passages use a 0.76–0.82 rem compact scale, and compact mobile text rises to 0.88 rem.
- Interactions: newest, oldest, and random ordering update the pressed state and repack the same 74 records. The mobile menu opens and closes without introducing horizontal overflow.
- Intentional data differences: the source uses illustrative quotations and archive counts; the implementation preserves current D1 quote text, authors, sources, tags, and archive totals. Natural-height packing leaves small skyline pockets where real quote lengths differ, without recreating row-height waste.
- Browser console: no warnings or errors in the final desktop state.

## Comparison history

1. The first implementation retained the large centered site header and narrow three-column shell; it was replaced with the selected compact top navigation and two-rail full-width layout.
2. The initial pack showed only five cards and used a disclosure button; the final version renders the complete 74-record archive immediately.
3. A 12-column fixed-span pass left the opening row one track short; complementary `5 / 4 / 3` spans now fill the first two bands before natural-height packing continues.
4. Mobile QA found a 50 px header overflow and misleading notebook toggle copy. The menu was relabeled and the compact header spacing was tightened; both closed and open states now report zero overflow.

## Validation checklist

- [x] Compare source and rendered desktop together at `1586 x 992`.
- [x] Compare the focused order-rail and mosaic region together.
- [x] Render all 74 quote records with no clipping.
- [x] Verify newest, oldest, and random ordering.
- [x] Verify no card overlap or horizontal overflow.
- [x] Verify the `390 x 844` single-column mobile fallback and menu states.
- [x] Check browser warnings and errors.

final result: passed

---

# Quotes Typographic Mosaic Design QA

- Source visual truth: `/var/folders/yg/rt8w41_56d30cbn9r6gbggyw0000gn/T/codex-clipboard-196256d5-4e74-41bd-b1b3-b2f08d9a404b.png`
- Desktop implementation: `/tmp/quotes-mosaic-refined.png`
- Mobile implementation: `/tmp/quotes-mosaic-mobile-chrome.png`
- Full desktop comparison: `/tmp/quotes-mosaic-comparison.png`
- Focused quote-grid comparison: `/tmp/quotes-mosaic-focus-comparison.png`
- Viewports: `1487 x 1058` desktop and `390 x 844` mobile
- State: Spanish quotes index, dark theme, intensity order, curated five-quote view

## Findings

No actionable P0, P1, or P2 differences remain.

- The desktop composition follows the selected 12-column typographic mosaic: `4 / 5 / 3` tracks on the first row and `4 / 8` tracks on the second.
- Quote type scales by text length. Short quotations receive display type while longer passages step down through large, regular, and compact sizes.
- Long passages use medium or wide grid spans and render in full. The previous line clamp and source ellipsis were removed.
- The normalized repository quotes remain the content source. Their exact copy and wrapping intentionally differ from the illustrative text generated in the mockup.
- The existing `ver índice completo` disclosure remains available even though it is absent from the mockup, preserving access to all 52 quote records.
- At 390 px, the mosaic becomes one 358 px column with no page-level horizontal overflow. All five curated quotes remain complete and readable.
- The terminal was closed for the mobile evidence capture so the fixed terminal panel did not obscure the content.

## Comparison History

1. First desktop pass placed the second row at `y = 685` and the footer at `y = 1031`, making the quote area taller than the source.
2. The text scale in the two narrow first-row slots and the grid row gap were tightened.
3. The final pass places the second row at `y = 621` and the footer at `y = 1005`, within a few pixels of the selected mockup.

## Interaction and Console Checks

- Author sorting places Alan Moore first; restoring intensity order restores the curated mosaic.
- Expanding the index reveals all 52 quote records, including 19 wide records; collapsing restores the selected five.
- The toggle updates `aria-expanded` in both states.
- Browser console: no warnings or errors in the tested desktop and mobile states.

final result: passed

---

# Quotes editorial index design QA

## Evidence

- Source visual truth: `/var/folders/yg/rt8w41_56d30cbn9r6gbggyw0000gn/T/codex-clipboard-70aef374-1197-461d-ba61-9231d43cc4b8.png`
- Browser-rendered desktop: `/tmp/quotes-final-desktop.png`
- Full-view side-by-side comparison: `/tmp/quotes-final-comparison.png`
- Browser-rendered mobile: `/tmp/quotes-final-mobile.png`
- Viewports: `1487 x 1058` desktop and `390 x 844` mobile CSS pixels.
- State: Spanish quotes index, dark theme, intensity order, five-card selection.

The reference and implementation were inspected together at the same desktop viewport. The implementation uses the normalized repository content, so quote lengths, source names, tags, archive counts, and dates intentionally differ from the visual mockup's sample data.

## Findings

No actionable P0, P1, or P2 visual differences remain.

- Layout and spacing: the left navigation divider, main grid, archive divider, header controls, and footer align with the reference. The final footer begins at `1007px` versus approximately `1001px` in the source.
- Typography and color: the existing Jersey wordmark, monospace body hierarchy, black background, mint accent, muted metadata, and hairline dividers are preserved.
- Content: the opening selection uses real normalized passages from Michael Polanyi, bell hooks, Virginia Woolf, Mark Fisher, and Luis Hermosilla. Long passages and source titles are excerpted visually in the index but remain complete in the linked quote page.
- Controls: intensity, recent, and author sorting all reorder the same 52 normalized quote records. The full-index disclosure expands and collapses without replacing the page.
- Responsive behavior: the grid becomes one column at `390px`; the page and body both measured `390px` wide with no horizontal overflow.
- Accessibility: sorting uses a labelled native select, the index disclosure exposes `aria-expanded`, quote excerpts remain links to their full pages, and focus styles use the site accent.
- Browser diagnostics: no console warnings or errors were reported after the desktop, interaction, and mobile checks.

## Comparison history

1. The first pass inherited wider navigation and header measurements and selected the five shortest records automatically.
2. The shell was measured against the reference and corrected to the target dividers, search width, header height, content origin, and three-column proportions.
3. The initial grid was replaced by the intended editorial author sequence using the real normalized records.
4. Long real passages were clamped as index excerpts, bringing the second row, disclosure, and footer into the reference's first-viewport composition.
5. The final side-by-side comparison and interaction pass found no blocking visual, behavioral, or responsive mismatch.

final result: passed

---

# 24-month GitHub wall design QA

## Source and implementation

- Source state: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-square-cells-desktop-1976x1170.png`
- Desktop implementation: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-24-months-desktop-1976x1170.png`
- Mobile implementation: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-24-months-mobile-390x844.png`
- Full combined comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-24-months-comparison-full.png`
- Focused combined comparison: `/Users/betancourt/.codex/visualizations/2026/07/13/019f5de2-d3cc-7703-8ff6-a969bfedcb61/code-wall-24-months-comparison-focus.png`
- Viewports: `1976 x 1170` desktop and `390 x 844` mobile.
- State: Spanish Code index, dark theme, checked-in GitHub fallback data.

## Comparison history

1. The square-cell version used only 12 months, leaving about half of the desktop activity section empty.
2. The wall was expanded to 24 months and reduced to 10px cells with 2px gaps, preserving perfect squares while using the available width.
3. The fallback was rebuilt from 730 days of public GitHub activity. Production now requests two adjacent yearly GraphQL ranges and merges them chronologically.
4. The final desktop comparison shows 24 month labels across 105 week columns. The mobile wall remains horizontally scrollable inside its section.

## Final checks

- No page-level horizontal overflow at either tested viewport.
- No undersized interactive controls reported by the responsive audit.
- Fonts, contribution colors, project content, and surrounding layout remain unchanged.
- The local preview emits the expected 404 for the production-only contribution endpoint and displays the checked-in fallback without visual failure.
- No remaining P0, P1, or P2 visual findings.

final result: passed

---

# Photography Justified Packing Design QA

- Source visual truth: `/var/folders/yg/rt8w41_56d30cbn9r6gbggyw0000gn/T/codex-clipboard-03961d8f-04c3-44c5-b346-b2f4cc630b92.png`
- Desktop implementation: `/private/tmp/posts-photography-justified-qa/screenshots/photography-desktop.png`
- Mobile implementation: `/private/tmp/posts-photography-justified-qa/screenshots/photography-mobile.png`
- Same-size implementation state: `/private/tmp/posts-photography-justified-qa/screenshots/photography-source-state.png`
- Full-view comparison: `/private/tmp/posts-photography-justified-comparison-full.png`
- Focused gallery comparison: `/private/tmp/posts-photography-justified-comparison-focus.png`
- Viewports: `1536 x 1024` desktop, `390 x 844` mobile, and `2048 x 1280` comparison state
- State: Spanish photography index, dark theme, default navigation state

## Findings

No actionable P0, P1, or P2 issue remains.

- Spacing and layout rhythm: The rejected CSS Grid version inherited each row height from its tallest card, creating large empty regions. The replacement calculates justified rows from the real image ratios and fills every completed row to the container edge. Measured residual space is at most `0.03px` across desktop and mobile rows.
- Image quality and asset fidelity: All 11 thumbnails keep their original aspect ratio with `object-fit: contain`. The largest measured natural-versus-rendered ratio difference is `0.0001`, so no image is cropped or visibly distorted.
- Variable sizing: The desktop gallery resolves to rows of 3, 4, and 4 images; mobile resolves to 2, 2, 2, 3, and 2. Widths vary from each image's intrinsic shape rather than fixed card spans.
- Fonts and typography: Existing monospaced metadata, titles, line clamping, and hierarchy remain unchanged.
- Colors and visual tokens: The black surface, mint links, muted metadata, and existing image outlines remain unchanged.
- Copy and content: Titles, dates, summaries, image counts, links, graph, and archives continue to use the existing repository content.
- Responsive behavior: A live resize repacks the gallery from 3 desktop rows to 5 mobile rows. Automated checks found no page-level horizontal overflow, undersized mobile controls, or browser console errors.
- Interaction: The first image card still navigates to `/es/fotografia/ninfas/` after the responsive repack.

## Comparison History

1. P1 source finding: the no-crop CSS Grid preserved complete images but created unacceptable vertical voids around portrait and wide cards.
2. Fix: replaced fixed tracks and manual spans with a justified-row packing pass that chooses row breaks from the full set of aspect ratios and exactly distributes each row across the available width.
3. Post-fix evidence: the focused comparison shows the same photo set in three dense desktop rows, with no large gaps and no cropping. Browser measurements confirm the visual result numerically.

## Implementation Checklist

- [x] Preserve every photograph's complete composition.
- [x] Keep visibly different image widths.
- [x] Eliminate large unused grid regions.
- [x] Repack automatically when the content column changes width.
- [x] Preserve existing links, metadata, graph, and archive sidebar.
- [x] Verify desktop, mobile, navigation, console output, and horizontal overflow.

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
- State: English Code index, dark theme, GitHub fallback in local preview

## Comparison history

### Pass 1

- Desktop composition matched the source: fixed left navigation, compact Code introduction, six-column technology summary, full-width contribution calendar, and three-column project grid.
- Project titles, summaries, access labels, and technology lists remained legible without clipping.
- Intentional data differences: technology percentages are derived from the seven real projects and the contribution chart uses a real public GitHub snapshot rather than the illustrative values in the mockup.
- P2 responsive finding: the English mobile navigation toggle switched to Spanish labels after initialization.
- Fix: localized the JavaScript toggle labels through the existing language context.

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

---

# Photography Mosaic Design QA — Initial Crop Pass

- Source visual truth: `/Users/betancourt/.codex/generated_images/019f5e2c-dc6f-7d61-9503-ba4bc3ca2888/exec-d1102b70-2ec3-4582-b0d9-5b3670b08dc1.png`
- Implementation screenshot: `/private/tmp/posts-photography-mosaic-final-v2-qa/screenshots/photography-source.png`
- Responsive screenshot: `/private/tmp/posts-photography-mosaic-final-v2-qa/screenshots/photography-mobile.png`
- Full-view comparison: `/private/tmp/posts-photography-mosaic-comparison-v2.png`
- Focused grid comparison: `/private/tmp/posts-photography-mosaic-grid-comparison.png`
- Viewport: `1536 x 1024` desktop, `390 x 844` mobile
- State: Spanish photography index, dark theme, default navigation state

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: The implementation preserves the site's display wordmark and monospaced hierarchy. Photo metadata and titles match the mockup's compact scale.
- Spacing and layout rhythm: The lead panorama, portrait center image, right-hand stack, smaller butterfly, and narrow city image reproduce the mockup's variable-size rhythm. The implementation keeps larger real-photo crops where the source mockup invented additional archive items.
- Colors and visual tokens: Black, off-white, muted gray, and mint tokens match the source and the existing site.
- Image quality and asset fidelity: The implementation uses the real photography assets and responsive `object-fit: cover` crops. The Violeta portrait crop is tighter than the generated mockup because the real source is landscape; preserving the real image is the intentional constraint.
- Copy and content: Titles, dates, image counts, description, navigation, graph, and archive content come from repository content rather than mock data.
- Responsive behavior: At 390 px, the lead photo spans both columns and supporting photos form a two-column gallery. Automated checks found no horizontal overflow, undersized controls, or console errors.

## Comparison History

1. Initial implementation: the butterfly used the same width as the lead image, and the city photo started on the following row.
2. Fix: reduced the butterfly to one grid track and moved the city photo into a narrow two-row track beside it.
3. Post-fix evidence: the final full-view and focused comparisons show the intended large-to-small hierarchy with no remaining P0/P1/P2 mismatch.

## Follow-up

- Superseded by the no-crop implementation documented below after direct user feedback.

## Implementation Checklist

- [x] Preserve existing photography content and links.
- [x] Match the selected variable-size desktop mosaic.
- [x] Preserve graph and archive sidebar.
- [x] Provide a responsive mobile hierarchy.
- [x] Verify console output and horizontal overflow.

final result: passed

---

# Photography No-Crop Follow-up QA — Rejected Grid Pass

- User feedback: the selected varied-size mosaic cropped parts of some photographs.
- Desktop capture: `/private/tmp/posts-photography-no-crop-qa/screenshots/photography-source.png`
- Mobile capture: `/private/tmp/posts-photography-no-crop-qa/screenshots/photography-mobile.png`
- Viewports: `1536 x 1024` desktop and `390 x 844` mobile
- State: Spanish photography index, dark theme, default navigation state
- Outcome: Superseded by the justified packing implementation after the user rejected the large empty regions.

## Findings

No actionable P0, P1, or P2 issue remains.

- The fixed row heights and portrait-shaped crop slots were removed.
- Every image now renders with `height: auto` and `object-fit: contain`.
- Automated browser measurements confirmed that all 11 rendered aspect ratios match their source aspect ratios, including landscape, portrait, and square images.
- The first, sixth, and tenth cards still span two grid columns, preserving the requested variation in image size without cropping.
- The hover zoom was removed so the full composition remains visible during pointer interaction.
- Responsive checks found no horizontal overflow, undersized mobile controls, or browser console errors.

## Implementation Checklist

- [x] Preserve the varied-size mosaic.
- [x] Show every photograph in full.
- [x] Preserve existing photography content and links.
- [x] Verify desktop and mobile behavior.
- [x] Verify all rendered aspect ratios against the source images.

final result: passed

---

# Graph visual QA

**Source visual truth**

- Original: `/tmp/codex-clipboard-lq35hL.png` (`390 × 489` px).
- Normalized graph crop: `tmp/visual-qa/graph-monochrome-final/reference-canvas.png` (`386 × 481` px).

**Implementation evidence**

- Browser capture: `tmp/visual-qa/graph-monochrome-final/screenshots/graph-graph.png` (`386 × 798` px).
- Normalized graph crop: `tmp/visual-qa/graph-monochrome-final/implementation-canvas.png` (`386 × 481` px).
- Side-by-side comparison: `tmp/visual-qa/graph-monochrome-final/reference-vs-implementation.png` (`772 × 481` px).
- Browser viewport: `386 × 798` CSS px, device scale factor `1`.
- Implementation graph before normalization: `350 × 463` CSS px, cropped from the maximized graph and resized to the reference canvas size.
- State: dark theme, graph maximized, labels in their default hidden state, simulation settled for 1.6 seconds.

**Findings**

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the reference has no graph labels, and the implementation also hides labels by default. The label typography remains available for hover, search, and the existing label toggle.
- Spacing and layout rhythm: the normalized canvas fills the same frame. The real D1 graph is denser around its central hub than the reference because its topology comes from the repository's current tag co-occurrences.
- Colors and visual tokens: the implementation uses white nodes and links on `#000000`. Background samples at `(10,10)`, `(200,20)`, and `(370,450)` all returned `gray(0)`.
- Image quality and asset fidelity: both nodes and links are drawn directly at browser density by the existing canvas renderer; there are no raster assets or placeholders to compare.
- Copy and content: no app-specific copy appears inside the default graph canvas, matching the reference.
- Interaction and runtime: the maximize control was exercised, the graph payload loaded from `/api/graph`, the viewport had no horizontal overflow or undersized controls, and the browser capture recorded no console errors.

**Comparison history**

1. The first graph-only capture showed smaller high-frequency nodes and dimmer links than the source. These were P2 fidelity differences.
2. The node scale was changed to `1.75 + min(30, (count - 1)^0.8 × 1.7)`, and inactive weighted-link opacity was raised while retaining `link.weight` in both opacity and width calculations.
3. The final side-by-side comparison shows large hubs at the source's scale, visible small nodes, fine white weighted links, no default labels, and the requested pure-black background.

**Follow-up polish**

- P3: the implementation's central cluster is more connected than the reference. This is accepted because it reflects the real D1 tag graph rather than a visual defect.
- The reference itself uses a dark charcoal canvas, but the implementation intentionally uses pure black because that was an explicit requirement.

**Implementation checklist**

- [x] Pure-black graph background in dark and light themes.
- [x] White nodes with a wider frequency-driven size range.
- [x] White links whose opacity and width remain driven by edge weight.
- [x] Labels hidden by default and preserved for interaction.
- [x] Root tests, graph test, Astro diagnostics, production build, and browser capture completed.

final result: passed

---

# Centered Search Command Strip QA

**Source visual truth**

- Selected option 1: `/root/.codex/generated_images/01a050c2-69d6-76b0-9d5f-0dd2784a463f/exec-31118589-9af9-45d2-a6fe-8d972f58729f.png` (`1586 × 992` px).

**Implementation evidence**

- Desktop capture: `/tmp/search-option1-implementation.png` (`1586 × 992` px).
- Keyboard-focus capture: `/tmp/search-option1-focus.png` (`1586 × 992` px).
- Mobile capture: `/tmp/search-option1-mobile.png` (`390 × 844` px).
- Full-view comparison: `/tmp/search-option1-comparison.png` (`3172 × 992` px).
- Resting and focused search comparison: `/tmp/search-option1-focus-comparison.png` (`900 × 200` px).
- State: English home route, dark theme, resting and keyboard-focused Search states; Spanish label and scrolled desktop state verified separately.

**Findings**

- No actionable P0, P1, or P2 differences remain in the selected search treatment.
- The command strip is centered at `320px`, transparent, and uses one bottom rule with a restrained turquoise divider after the existing search icon.
- The label is lowercase and localized as `search the archive` / `buscar en el archivo`; `Ctrl K` remains plain, unboxed text aligned to the right.
- Hover changes the baseline and icon to turquoise. Keyboard focus adds a visible one-pixel turquoise outline without changing the resting surface.
- At `390 × 844`, only the shortcut hint is hidden and the trigger retains a `44px` touch target.
- The Search trigger scrolls with the document. The language, typography, grayscale, and theme controls remain fixed at `y = 22px`, while the archive sidebar begins at `y = 78px`.
- Click, Escape, and Ctrl+K modal behavior passed. English and Spanish routes rendered without browser console errors.

**Deliberate non-search differences from the generated option**

- The implementation preserves the live D1-backed graph, current content, existing navigation, and responsive page geometry. The generated reference varies the graph's stochastic node arrangement and slightly enlarges some surrounding content; these areas were explicitly outside the search-only scope.
- The implementation keeps the accepted compact `320px` search width to align with the existing header scale.

**Implementation checklist**

- [x] Match selected option 1's command-strip treatment.
- [x] Preserve fixed upper-right controls and archive clearance.
- [x] Preserve modal behavior and Ctrl+K.
- [x] Verify English, Spanish, desktop, mobile, hover, focus, and scroll states.
- [x] Compare the full page and focused Search region against the selected source.

final result: passed
