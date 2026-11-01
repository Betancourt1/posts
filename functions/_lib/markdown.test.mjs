import assert from "node:assert/strict";
import test from "node:test";
import { formatMarkdown, parseScalar, splitMarkdown } from "./markdown.js";

test("inline arrays keep commas, brackets and escaped quotes inside quoted items", () => {
  assert.deepEqual(parseScalar('["323,648 trips", "a [b] c", "say \\"hi\\", twice"]'), [
    "323,648 trips",
    "a [b] c",
    'say "hi", twice',
  ]);
  assert.deepEqual(parseScalar("['it''s, fine', 'plain']"), ["it's, fine", "plain"]);
});

test("inline arrays keep the legacy behavior for unquoted, spaced and malformed items", () => {
  assert.deepEqual(parseScalar("[ a , b,c ]"), ["a", "b", "c"]);
  assert.deepEqual(parseScalar('[ "React", "Vite", ]'), ["React", "Vite"]);
  assert.deepEqual(parseScalar(`["open, still open', "x"]`), ["open", "still open", "x"]);
  assert.deepEqual(parseScalar("[]"), []);
});

test("quoted scalars decode escapes written by formatMarkdown", () => {
  assert.equal(parseScalar('"a \\"b\\" \\\\ c"'), 'a "b" \\ c');
  assert.equal(parseScalar('"bad \\q escape"'), 'bad \\q escape');
  assert.equal(parseScalar("'it''s'"), "it's");
  assert.equal(parseScalar('"'), '"');
});

test("front matter with commas, accents and dashes survives repeated saves", () => {
  const frontMatter = {
    title: "Título",
    highlights: ["355,303 trips, 323,648 drawn", 'He said "go", then left', "1800× – half an hour", "ñandú"],
    period: "2025–2026",
    role: "Design and development",
    order: 2,
  };
  const once = formatMarkdown(frontMatter, "Body.");
  const first = splitMarkdown(once);
  assert.deepEqual(first.frontMatter.highlights, frontMatter.highlights);
  assert.equal(first.frontMatter.period, "2025–2026");
  assert.equal(formatMarkdown(first.frontMatter, first.body), once);
  assert.match(once, /^order: 2$/m);
  assert.equal(first.frontMatter.order, "2");
});

test("block lists of plain strings are read instead of erased", () => {
  const { frontMatter } = splitMarkdown([
    "---",
    "title: T",
    "highlights:",
    "  - First, with comma",
    '  - "Second: quoted"',
    "  - https://example.org/x",
    "aliases:",
    "  - /old/",
    "---",
    "Body",
  ].join("\n"));
  assert.deepEqual(frontMatter.highlights, ["First, with comma", "Second: quoted", "https://example.org/x"]);
  assert.deepEqual(frontMatter.aliases, ["/old/"]);
});

test("a block list whose first item is a URL or a time is a list of strings", () => {
  const read = (first) => splitMarkdown(["---", "links:", `  - ${first}`, "  - second", "---"].join("\n")).frontMatter.links;
  assert.deepEqual(read("https://x.org/a"), ["https://x.org/a", "second"]);
  assert.deepEqual(read("10:30 start"), ["10:30 start", "second"]);
});

test("order is written as a bare integer only when YAML would read the same integer", () => {
  const order = (value) => formatMarkdown({ order: value }, "").split("\n")[1];
  assert.deepEqual([2, "2", "-1", "0"].map(order), ["order: 2", "order: 2", "order: -1", "order: 0"]);
  assert.deepEqual(["007", "1.5", "x"].map(order), ['order: "007"', 'order: "1.5"', 'order: "x"']);
});

test("block lists of objects are still read as objects", () => {
  const { frontMatter } = splitMarkdown([
    "---",
    "project_links:",
    "  - type: code",
    '    label: "Repo"',
    "    href: \"https://example.org/\"",
    "  - type: demo",
    '    label: "Demo"',
    "---",
  ].join("\n"));
  assert.deepEqual(frontMatter.project_links, [
    { type: "code", label: "Repo", href: "https://example.org/" },
    { type: "demo", label: "Demo" },
  ]);
});

test("a byte-order mark does not hide the front matter", () => {
  assert.equal(splitMarkdown("\uFEFF---\ntitle: T\n---\nBody").frontMatter.title, "T");
});
