# Are.na image publishing design QA

## Evidence

- Source visual truth: `/Users/betancourt/.codex/generated_images/019f49fe-dd58-7be0-89c4-05b1560269ae/exec-1df8d38f-8f67-45f8-8039-5af4d319abb1.png`
- Browser-rendered implementation: `/Users/betancourt/.codex/visualizations/2026/07/10/019f49fe-dd58-7be0-89c4-05b1560269ae/image-editor-arena-enabled.png`
- Focused side-by-side comparison: `/Users/betancourt/.codex/visualizations/2026/07/10/019f49fe-dd58-7be0-89c4-05b1560269ae/arena-panel-comparison.png`
- Real Are.na Image block: `/Users/betancourt/.codex/visualizations/2026/07/10/019f49fe-dd58-7be0-89c4-05b1560269ae/arena-image-block-47750123.png`
- Viewport: 442 x 987 CSS pixels.
- State: mobile photography editor, properties open, Are.na panel expanded, image mirroring enabled, channel `Desde mi blog`, draft publication.

The source is a desktop properties panel and the implementation evidence is its responsive photography-editor counterpart. The focused comparison normalizes the Are.na component height; it is used for hierarchy, copy, controls, tokens, and spacing rather than false pixel-level desktop/mobile equivalence.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation keeps the product's compact sans/monospace hierarchy, uppercase section label, strong channel title, and muted explanatory copy. The mobile weight and wrapping remain readable.
- Spacing and layout rhythm: the control order matches the mockup: enabled state, channel, explanation, synchronization state, then save actions. Dividers and vertical gaps preserve the existing image editor's denser mobile rhythm.
- Colors and tokens: black surfaces, muted gray copy, mint selection/status color, and amber unsaved state use the existing editor tokens and match the source intent.
- Image quality and asset fidelity: the editor uses the real blog image with an uncropped, sharp preview. The real Are.na block shows the copied 4096 x 3072 image; no placeholder or code-drawn asset replaces it.
- Copy and content: image mode explicitly says that every file becomes an `Image` block with alt text and caption and that no link block is created. Draft state clearly says the images will be copied on publish.
- Controls and accessibility: the toggle has a semantic label, the channel is a labelled select, the status is readable without relying only on color, and controls remain reachable at the mobile viewport.

Focused-region evidence was required because the Are.na text and controls were too small to judge in the full editor screenshot. The combined comparison is the focused evidence listed above.

## Primary interactions tested

- Open the mobile properties sheet and scroll to Are.na.
- Expand the Are.na panel without another control intercepting the click.
- Enable `Copiar imágenes a Are.na` and verify the selected `Desde mi blog` channel.
- Verify draft feedback changes to `al publicar` and marks the post unsaved.
- Query the local status endpoint for the mapped gallery and receive two `synced` Image blocks.
- Open the real Are.na block and confirm the image, title, source link, author, dimensions, and channel connection.
- Browser console errors checked: none.

## Comparison history

1. First mobile pass: P1 — the fixed save actions were positioned inside a transformed bottom sheet and intercepted the Are.na configuration row, so the panel could not be expanded.
2. Fix: changed the sheet actions to normal document flow and reduced obsolete bottom padding.
3. Post-fix evidence: the Are.na row became reachable, expanded to show its toggle, channel, image-specific explanation, and state, and the save/publish actions remained visible below it. No P0, P1, or P2 findings remained.

## Follow-up polish

- P3: the source mockup has a more verbose two-dot synchronization timeline. The responsive image editor intentionally compresses that information into the row summary and explanatory state to avoid crowding the mobile sheet.

final result: passed
