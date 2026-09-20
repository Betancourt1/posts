import assert from "node:assert/strict";
import test from "node:test";
import { projectSource, renderMarkdown, renderMarkdownSummary } from "../src/lib/content-projector.mjs";

test("renders inline and display math with accessible MathML in both locales", () => {
  for (const lang of ["en", "es"]) {
    const { documents: [document] } = projectSource({
      path: `content_${lang}/posts/2026/septiembre/technical.md`,
      rawMarkdown: "---\ntitle: Math\ntechnical: true\n---\nInline $x^2$ formula.\n\n$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$",
    });
    assert.match(document.bodyHtml, /class="katex"/);
    assert.match(document.bodyHtml, /class="katex-display"/);
    assert.match(document.bodyHtml, /<math xmlns=/);
    assert.match(document.bodyText, /x\^2/);
    assert.equal(document.lang, lang);
  }
  assert.match(renderMarkdownSummary("Result $x^2$"), /class="katex"/);
});

test("keeps currency, escaped math and code literal and survives invalid math", () => {
  const { bodyHtml } = renderMarkdown("Costs $5 and $10. Escaped \\$x\\$. Code `$x$`.\n\n```python\nprice = '$x$'\n```\n\n$\\unknowncommand{x}$");
  assert.match(bodyHtml, /Costs \$5 and \$10/);
  assert.match(bodyHtml, /Escaped \$x\$/);
  assert.match(bodyHtml, /<code>\$x\$<\/code>/);
  assert.match(bodyHtml, /hljs-string[^>]*>.*\$x\$/);
  assert.match(bodyHtml, /\\unknowncommand/);
  assert.match(bodyHtml, /mathcolor="#cc0000"/);
});

test("highlights named languages and escapes unknown languages and malicious code", () => {
  const { bodyHtml } = renderMarkdown('```python\ndef square(x):\n    return x ** 2\n```\n\n```unknown\n<script>alert("x")</script>\n```');
  assert.match(bodyHtml, /hljs-keyword/);
  assert.match(bodyHtml, /data-language="python"/);
  assert.match(bodyHtml, /&lt;script&gt;/);
  assert.doesNotMatch(bodyHtml, /<script>/);
  assert.match(renderMarkdown("```js\nconst note = '{{green|literal}}';\n```").bodyHtml, /\{\{green\|literal\}\}/);
});

test("keeps Mermaid source escaped for progressive browser rendering", () => {
  const { bodyHtml } = renderMarkdown('```mermaid\nflowchart LR\nA[Input] --> B[Output]\n```');
  assert.match(bodyHtml, /data-mermaid/);
  assert.match(bodyHtml, /A\[Input\] --&gt; B\[Output\]/);
  assert.doesNotMatch(bodyHtml, /<iframe/);
});

test("supports controlled video and exported SVG without enabling raw HTML", () => {
  const { bodyHtml } = renderMarkdown('![Layer animation](/visuals/layers.webm)\n\n![Layers](/uploads/layers.svg)\n\n<script>alert(1)</script>');
  assert.match(bodyHtml, /<video[^>]*controls playsinline preload="metadata"/);
  assert.match(bodyHtml, /aria-label="Layer animation"/);
  assert.match(bodyHtml, /<img src="\/uploads\/layers.svg"/);
  assert.doesNotMatch(bodyHtml, /autoplay|<script>/);
  assert.match(bodyHtml, /raw HTML omitted/);
  assert.doesNotMatch(renderMarkdown('![bad](javascript:alert)').bodyHtml, /<video|<img/);
});

test("embeds titled interactive documents with a restricted sandbox", () => {
  for (const src of ["/visuals/layers.html", "https://visuals.example/layers.html"]) {
    const { bodyHtml } = renderMarkdown(`\`\`\`interactive\n${JSON.stringify({ src, title: 'Layers "explorer"', height: 420 })}\n\`\`\``);
    assert.match(bodyHtml, /<iframe/);
    assert.match(bodyHtml, /sandbox="allow-scripts"/);
    assert.match(bodyHtml, /title="Layers &quot;explorer&quot;"/);
    assert.match(bodyHtml, /height="420" loading="lazy"/);
    assert.doesNotMatch(bodyHtml, /allow-same-origin|allow-top-navigation/);
  }
});

test("invalid interactive definitions fall back to readable code", () => {
  for (const source of ["{broken", "null", ...[
    { src: "javascript:alert(1)", title: "Bad" },
    { src: "data:text/html,bad", title: "Bad" },
    { src: "/admin/", title: "Bad" },
    { src: "/visuals/../../admin/", title: "Bad" },
    { src: "//example.com", title: "Bad" },
    { src: "/visuals/layers.html" },
    { src: "/visuals/layers.html", title: "Layers", height: 9999 },
  ].map(JSON.stringify)]) {
    const { bodyHtml } = renderMarkdown(`\`\`\`interactive\n${source}\n\`\`\``);
    assert.doesNotMatch(bodyHtml, /<iframe/);
    assert.match(bodyHtml, /technical-code/);
  }
});
