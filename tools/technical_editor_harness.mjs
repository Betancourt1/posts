#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { selectEditorView as selectView, startHarnessServer } from './editor_harness.mjs';

const savedRequests = [];
const { server, origin } = await startHarnessServer(savedRequests, { blockEditor: false });
let browser;
const evidence = process.env.TECHNICAL_EDITOR_EVIDENCE || '/tmp/posts-technical-editor';
await mkdir(evidence, { recursive: true });
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  for (const lang of ['en', 'es']) for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/post-editor?notebook=content_${lang}/posts&theme=${mobile ? 'light' : 'dark'}`);
      await page.waitForFunction(() => !document.querySelector('#save').disabled);
      assert.equal(await page.locator('#saved-pill').isVisible(), true);
      assert.equal(await page.locator('#saved-pill').textContent(), 'Sin guardar', 'a new untouched document is not saved');
      assert.equal(await page.locator('#publication-visibility').textContent(), 'Sin publicar');
      assert.equal(await page.locator('#view-switch').isVisible(), !mobile);
      assert.equal(await page.locator('#view-markdown').isVisible(), !mobile);
      assert.equal(await page.locator('#view-preview').isVisible(), !mobile);
      assert.equal(await page.locator('#view-menu-button').isVisible(), mobile);
      assert.equal(await page.locator('#mobile-view-markdown').count(), 0, 'the formatbar no longer duplicates the view toggle');
      assert.equal(await page.locator('#technical-preview-open').count(), 0, 'preview is selected through the view control');
      assert.equal(await page.locator('#toolbar-technical').textContent(), 'Insertar');
      assert.equal(await page.locator('#toolbar-technical svg').count(), 1);
      assert.equal(await page.locator('.formatbar').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      let blankPreviewRequests = 0;
      await page.route('**/api/preview', route => { blankPreviewRequests++; return route.continue(); });
      await selectView(page, 'preview');
      assert.equal(await page.locator('#preview-pane').isVisible(), true);
      assert.equal(await page.locator('#preview-status').textContent(), 'Escribe un título o contenido para ver la vista previa.');
      assert.equal(await page.locator('#preview-frame').isVisible(), false);
      assert.equal(await page.locator('.paper').isVisible(), false, 'full preview hides the editor paper');
      assert.equal(await page.locator('.formatbar').isVisible(), false, 'full preview hides the formatbar');
      assert.equal(blankPreviewRequests, 0, 'blank preview does not make a request');
      await selectView(page, 'render');
      assert.equal(await page.locator('#preview-pane').isVisible(), false);
      assert.equal(await page.locator('.paper').isVisible(), true);
      await page.unroute('**/api/preview');
      await page.locator('#title').fill('Technical editor test');
      const body = page.locator('#body');
      let checkedNarrowLayouts = false;
      const openTools = async () => {
        await page.locator('#toolbar-technical').click();
        assert.equal(await page.locator('#technical-tools').isVisible(), true);
        assert.equal(await page.locator('#toolbar-technical').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#technical-tools .technical-insert-actions button').count(), 12);
        assert.equal(await page.locator('#technical-tools button:not(:has(svg))').count(), 0);
        assert.equal(await page.locator('#technical-tools button:not([aria-label])').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator('#insert-more').isVisible(), true);
        assert.equal(await page.locator('#technical-tools .technical-insert-actions button:visible').count(), 5);
        assert.equal(await page.locator('#technical-tools .technical-insert-actions').evaluate(el =>
          Array.from(el.querySelectorAll('button')).every(button =>
            button.textContent.trim() === '' && button.title && button.title === button.getAttribute('aria-label')
          )), true, 'icon-only insert actions retain tooltips and accessible names');
        {
          assert.equal(await page.locator('#insert-more').getAttribute('aria-expanded'), 'false');
          assert.equal(await page.locator('#technical-tools').evaluate(el => {
            const hiddenAction = el.querySelector('#insert-extra button');
            hiddenAction.focus();
            return hiddenAction.getClientRects().length === 0 && document.activeElement !== hiddenAction;
          }), true, 'collapsed actions are absent from keyboard focus');
        }
        if (mobile && !checkedNarrowLayouts) {
          for (const width of [320, 390, 768]) {
            await page.setViewportSize({ width, height: width === 320 ? 480 : 844 });
            const inspectGeometry = () => page.locator('#technical-tools').evaluate(el => {
              const visibleButtons = Array.from(el.querySelectorAll('button')).filter(button => button.getClientRects().length);
              const options = [el.querySelector('#insert-more'), el.querySelector('select'), el.querySelector('summary')].map(item => item.getBoundingClientRect());
              return {
                toolbarHeight: el.closest('.formatbar').getBoundingClientRect().height,
                chooserHeight: el.getBoundingClientRect().height,
                availableHeight: innerHeight - document.querySelector('.topbar').getBoundingClientRect().height,
                viewportHeight: innerHeight,
                minButtonSize: Math.min(...visibleButtons.map(button => Math.min(button.getBoundingClientRect().width, button.getBoundingClientRect().height))),
                optionsFit: options.every(rect => rect.left >= 0 && rect.right <= innerWidth && rect.height >= 44),
                iconsFit: visibleButtons.filter(button => button.closest('.technical-insert-actions')).every(button =>
                  button.getBoundingClientRect().width === 44 && button.scrollWidth <= button.clientWidth
                ),
                fitsViewport: document.documentElement.scrollWidth <= innerWidth && el.scrollWidth <= el.clientWidth,
              };
            });
            const geometry = await inspectGeometry();
            if (width === 320) await page.screenshot({ path: `${evidence}/${lang}-320-buttons.png` });
            assert.ok(geometry.toolbarHeight < geometry.availableHeight - 64 && geometry.chooserHeight <= geometry.viewportHeight * 0.45 + 1, `${width}px insert buttons leave room for the editor: ${JSON.stringify(geometry)}`);
            assert.ok(geometry.minButtonSize >= 44, `${width}px insert buttons have 44px touch targets`);
            assert.equal(geometry.optionsFit, true, `${width}px More, language, and guide controls fit`);
            assert.equal(geometry.iconsFit, true, `${width}px insert actions are compact without clipping`);
            assert.equal(geometry.fitsViewport, true, `${width}px layout has no horizontal overflow`);
            const documentScroll = await page.evaluate(() => scrollY);
            await page.locator('#insert-more').click();
            assert.equal(await page.locator('#insert-more').getAttribute('aria-expanded'), 'true');
            assert.equal(await page.locator('#insert-extra button:visible').count(), 7);
            const expanded = await inspectGeometry();
            assert.equal(await page.evaluate(() => scrollY), documentScroll, 'expanding choices only scrolls the chooser');
            assert.equal(await page.locator('#insert-color-title').evaluate(el => {
              const rect = el.getBoundingClientRect();
              const panel = document.querySelector('#technical-tools').getBoundingClientRect();
              return rect.top >= panel.top && rect.bottom <= panel.bottom;
            }), true, 'expanding options brings the first labeled group into view');
            assert.ok(expanded.toolbarHeight < expanded.availableHeight - 64 && expanded.chooserHeight <= expanded.viewportHeight * 0.45 + 1 && expanded.minButtonSize >= 44 && expanded.optionsFit && expanded.iconsFit && expanded.fitsViewport, `${width}px expanded buttons fit: ${JSON.stringify(expanded)}`);
            if (width === 320) await page.screenshot({ path: `${evidence}/${lang}-320-all-buttons.png` });
            await page.locator('#insert-more').click();
            assert.equal(await page.locator('#insert-extra button:visible').count(), 0);
          }
          await page.setViewportSize({ width: 390, height: 844 });
          checkedNarrowLayouts = true;
        }
      };
      await openTools();
      await page.locator('#technical-tools summary').click();
      await page.locator('#technical-tools ul li').last().scrollIntoViewIfNeeded();
      const guideBounds = await page.locator('#technical-tools').boundingBox();
      assert.ok(guideBounds && guideBounds.x >= 0 && guideBounds.y >= 0 && guideBounds.x + guideBounds.width <= (mobile ? 390 : 1280), 'quick guide fits the viewport');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#technical-tools').isVisible(), false);
      const kinds = ['inline-math', 'display-math', 'code', 'mermaid', 'image', 'video', 'interactive'];
      for (const markdown of [false, true]) {
        if (markdown) {
          await selectView(page, 'markdown');
          await page.waitForFunction(() => document.activeElement === document.querySelector('#markdown-canvas'));
        }
        const target = page.locator(markdown ? '#markdown-canvas' : '#body');
        for (const kind of kinds) {
          const prefix = markdown ? '# Technical editor test\n\n' : '';
          const original = prefix + 'Before SELECTED after';
          await target.fill(original);
          await target.evaluate(el => { const at = el.value.indexOf('SELECTED'); el.focus(); el.setSelectionRange(at, at + 8); });
          await openTools();
          if (kind === 'code') await page.locator('#technical-code-language').selectOption('sql');
          if (!(await page.locator(`[data-technical-insert="${kind}"]`).isVisible())) await page.locator('#insert-more').click();
          await page.locator(`[data-technical-insert="${kind}"]`).click();
          assert.equal(await page.locator('#technical-tools').isVisible(), false);
          assert.equal(await page.locator('#toolbar-technical').getAttribute('aria-expanded'), 'false');
          assert.equal(await target.evaluate(el => document.activeElement === el), true);
          const text = await target.inputValue();
          assert.ok(text.startsWith(prefix + 'Before '), `${kind} preserves prefix`);
          assert.ok(text.endsWith(' after'), `${kind} preserves suffix: ${JSON.stringify(text)}`);
          assert.ok(text.includes('SELECTED'), `${kind} uses selection`);
          if (kind === 'code') assert.ok(text.includes('```sql\nSELECTED\n```'));
          if (kind === 'inline-math') assert.ok(text.includes('$SELECTED$'));
          if (kind === 'display-math') assert.ok(text.includes('$$\nSELECTED\n$$'));
          if (kind === 'interactive') assert.ok(text.includes('"src":"SELECTED"'));
          await page.locator('[data-format="undo"]').click();
          assert.equal(await target.inputValue(), original, `${kind} ${markdown ? 'Markdown' : 'body'} undo`);
          if (!markdown) {
            await page.locator('[data-format="redo"]').click();
            assert.equal(await target.inputValue(), text, `${kind} body redo`);
          }
        }
        // Without a selection, samples come from the shared locale-aware insert templates.
        for (const [kind, expected] of [
          ['image', lang === 'en' ? '![Describe the diagram](/visuals/diagram.svg)' : '![Describe el diagrama](/visuals/diagram.svg)'],
          ['code', '```python\ndef square(x):\n    return x ** 2\n```'],
          ['code-js', lang === 'en' ? '```javascript\nYour code here\n```' : '```javascript\nTu código aquí\n```'],
        ]) {
          const prefix = markdown ? '# Technical editor test\n\n' : '';
          await target.fill(prefix + 'Before');
          await target.evaluate(el => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
          await openTools();
          if (kind.startsWith('code')) await page.locator('#technical-code-language').selectOption(kind === 'code' ? 'python' : 'javascript');
          const button = page.locator(`[data-technical-insert="${kind.startsWith('code') ? 'code' : kind}"]`);
          if (!(await button.isVisible())) await page.locator('#insert-more').click();
          await button.click();
          assert.equal(await target.inputValue(), `${prefix}Before\n\n${expected}\n\n`, `${kind} ${lang} sample template`);
        }
        for (const insertion of ['note', 'color', 'upload']) {
          const prefix = markdown ? '# Technical editor test\n\n' : '';
          const original = prefix + 'Before SELECTED after';
          await target.fill(original);
          await target.evaluate(el => { const at = el.value.indexOf('SELECTED'); el.focus(); el.setSelectionRange(at, at + 8); });
          await openTools();
          if (insertion === 'note') {
            await page.locator('#toolbar-sidenote').click();
            assert.ok((await target.inputValue()).startsWith(prefix + 'Before SELECTED[^note-1] after'));
          } else if (insertion === 'color') {
            await page.locator('#insert-more').click();
            await page.locator('[data-sidenote-tone="green"]').click();
            assert.equal(await target.inputValue(), prefix + 'Before {{green|SELECTED}} after');
          } else {
            await page.route('**/api/upload-image', route => route.fulfill({
              contentType: 'application/json', body: JSON.stringify({ url: '/fixture.png', markdown: '![Sample](/fixture.png)' }),
            }));
            const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#toolbar-image').click()]);
            await chooser.setFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
            await page.waitForFunction(() => (document.querySelector('#markdown-canvas').hidden ? document.querySelector('#body') : document.querySelector('#markdown-canvas')).value.includes('![Sample]'));
            assert.equal(await target.inputValue(), prefix + 'Before \n\n![Sample](/fixture.png)\n after');
            await page.unroute('**/api/upload-image');
          }
          assert.equal(await page.locator('#technical-tools').isVisible(), false);
          if (!markdown) {
            await page.locator('[data-format="undo"]').click();
            assert.equal(await target.inputValue(), original, `${insertion} body undo`);
          }
        }
      }
      // Generate a real unsaved preview from Markdown mode, without any save endpoint.
      const markdown = '# Technical editor test\n\nInline $x^2$.\n\n$$\n\\sum_{i=1}^n i\n$$\n\n```python\ndef square(x):\n    return x ** 2\n```\n\n```mermaid\nflowchart LR\nA[Input] --> B[Output]\n```';
      await page.locator('#markdown-canvas').fill(markdown);
      await openTools();
      await page.screenshot({ path: `${evidence}/${lang}-${mobile ? 'mobile' : 'desktop'}-buttons.png` });
      await page.locator('#insert-more').click();
      await page.screenshot({ path: `${evidence}/${lang}-${mobile ? 'mobile' : 'desktop'}-all-buttons.png` });
      await page.keyboard.press('Escape');
      const before = savedRequests.length;
      await selectView(page, 'preview');
      const frame = page.frameLocator('#preview-frame');
      await frame.locator('.katex-display').waitFor();
      await frame.locator('.technical-diagram-image > svg').waitFor();
      assert.equal(await frame.locator('html').getAttribute('lang'), lang);
      assert.equal(await frame.locator('html').getAttribute('data-theme'), mobile ? 'light' : 'dark');
      assert.ok(await frame.locator('.hljs-keyword').count());
      assert.equal(await frame.locator('h1').textContent(), 'Technical editor test');
      assert.equal(savedRequests.length, before, 'preview does not save or synchronize');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#technical-preview').isVisible(), false, 'document preview is inline, not the block modal');
      await page.screenshot({ path: `${evidence}/${lang}-${mobile ? 'mobile' : 'desktop'}-preview.png` });
      // The HTML tab shows the rendered body as inert text.
      await page.locator('#preview-html').click();
      assert.equal(await page.locator('#preview-html').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#preview-html-source').isVisible(), true);
      assert.equal(await page.locator('#preview-frame').isVisible(), false);
      const htmlSource = await page.locator('#preview-html-source code').textContent();
      assert.ok(htmlSource.includes('katex'), 'HTML source contains rendered math markup');
      assert.ok(!htmlSource.includes('<h1'), 'HTML source is the post body, not the whole page');
      assert.equal(await page.locator('#preview-html-source code *').count(), 0, 'rendered HTML is displayed as text only');
      await page.locator('#preview-rendered').click();
      assert.equal(await page.locator('#preview-frame').isVisible(), true);
      assert.equal(await page.locator('#preview-html-source').isVisible(), false);
      await selectView(page, 'markdown');
      assert.equal(await page.locator('#preview-pane').isVisible(), false);
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      await openTools();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#technical-tools').hidden);
      // Preview errors stay in the dialog, and the unsaved source remains intact.
      await page.route('**/api/preview', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture unavailable' }) }));
      await selectView(page, 'preview');
      await page.waitForFunction(() => document.querySelector('#preview-status').textContent.includes('Fixture unavailable'));
      assert.equal(await page.locator('#preview-retry').isVisible(), true);
      await page.unroute('**/api/preview');
      await page.locator('#preview-retry').click();
      await frame.locator('h1').waitFor();
      assert.equal(await page.locator('#preview-retry').isVisible(), false);
      assert.equal(await frame.locator('h1').textContent(), 'Technical editor test');
      // Ctrl/Cmd+Alt+P cycles preview -> render; select Markdown to verify the source.
      await page.keyboard.press('Control+Alt+KeyP');
      await page.waitForFunction(() => document.querySelector('#preview-pane').hidden);
      assert.equal(await page.locator('.paper').isVisible(), true);
      await selectView(page, 'markdown');
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      if (!mobile) {
        await page.keyboard.press('Control+Alt+KeyP');
        await page.waitForFunction(() => !document.querySelector('#preview-pane').hidden);
        assert.equal(await page.locator('#view-preview').getAttribute('aria-pressed'), 'true');
        await frame.locator('h1').waitFor();
        await selectView(page, 'markdown');
        assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      }
      // A reload offers the unsaved technical draft and restores it exactly.
      await page.waitForFunction(() => Object.keys(localStorage).some(k => k.startsWith('authorWritingDraftV1')));
      await page.waitForTimeout(400);
      await page.reload();
      await page.locator('#draft-restore-accept').click();
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      assert.deepEqual(errors, []);
      console.log(`PASS ${lang} ${mobile ? '390x844 light' : '1280x900 dark'}: technical + note/color/upload insertions in both modes, selection, undo/redo, inline preview + HTML source, errors, view shortcut, draft restore, no saves`);
    } finally { await context.close(); }
  }
  assert.equal(savedRequests.length, 0);
  console.log(`Screenshots: ${evidence}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
