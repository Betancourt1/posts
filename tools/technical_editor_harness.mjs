#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startHarnessServer } from './editor_harness.mjs';

const savedRequests = [];
const { server, origin } = await startHarnessServer(savedRequests);
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
      assert.equal(await page.locator('#view-markdown').isVisible(), !mobile);
      assert.equal(await page.locator('#mobile-view-markdown').isVisible(), mobile);
      assert.equal(await page.locator('#technical-preview-open').isVisible(), true);
      assert.equal(await page.locator('#toolbar-technical').textContent(), 'Insertar');
      assert.equal(await page.locator('.formatbar').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.locator('#title').fill('Technical editor test');
      const body = page.locator('#body');
      const openTools = async () => {
        await page.locator('#toolbar-technical').click();
        assert.equal(await page.locator('#technical-tools').evaluate(e => e.open), true);
      };
      const kinds = ['inline-math', 'display-math', 'code', 'mermaid', 'image', 'video', 'interactive'];
      for (const markdown of [false, true]) {
        if (markdown) {
          await page.locator(mobile ? '#mobile-view-markdown' : '#view-markdown').click();
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
          await page.locator(`[data-technical-insert="${kind}"]`).click();
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
            if (!(await page.locator('[data-sidenote-tone="green"]').isVisible())) await page.getByText('Color del texto', { exact: true }).click();
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
          assert.equal(await page.locator('#technical-tools').evaluate(el => el.open), false);
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
      await page.screenshot({ path: `${evidence}/${lang}-${mobile ? 'mobile' : 'desktop'}-menu.png` });
      await page.keyboard.press('Escape');
      const before = savedRequests.length;
      await page.locator('#technical-preview-open').click();
      const frame = page.frameLocator('#technical-preview-frame');
      await frame.locator('.katex-display').waitFor();
      await frame.locator('.technical-diagram-image > svg').waitFor();
      assert.equal(await frame.locator('html').getAttribute('lang'), lang);
      assert.equal(await frame.locator('html').getAttribute('data-theme'), mobile ? 'light' : 'dark');
      assert.ok(await frame.locator('.hljs-keyword').count());
      assert.equal(await frame.locator('h1').textContent(), 'Technical editor test');
      assert.equal(savedRequests.length, before, 'preview does not save or synchronize');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `${evidence}/${lang}-${mobile ? 'mobile' : 'desktop'}-preview.png` });
      await page.locator('[data-close-technical="technical-preview"]').click();
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      await page.waitForFunction(() => !document.documentElement.classList.contains('sheet-open'));
      await openTools();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#technical-tools').open);
      // Preview errors stay in the dialog, and the unsaved source remains intact.
      await page.route('**/api/preview', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture unavailable' }) }));
      await page.locator('#technical-preview-open').click();
      await page.waitForFunction(() => document.querySelector('#technical-preview-status').textContent.includes('Fixture unavailable'));
      await page.locator('[data-close-technical="technical-preview"]').click();
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      await page.unroute('**/api/preview');
      // A reload offers the unsaved technical draft and restores it exactly.
      await page.waitForFunction(() => Object.keys(localStorage).some(k => k.startsWith('authorWritingDraftV1')));
      await page.waitForTimeout(400);
      await page.reload();
      await page.locator('#draft-restore-accept').click();
      assert.equal(await page.locator('#markdown-canvas').inputValue(), markdown);
      assert.deepEqual(errors, []);
      console.log(`PASS ${lang} ${mobile ? '390x844 light' : '1280x900 dark'}: technical + note/color/upload insertions in both modes, selection, undo/redo, preview, errors, draft restore, no saves`);
    } finally { await context.close(); }
  }
  assert.equal(savedRequests.length, 0);
  console.log(`Screenshots: ${evidence}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
