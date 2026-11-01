import assert from "node:assert/strict";
import test from "node:test";
import { applyProjectFields, projectFields, projectMeta, projectOrder, sortProjects } from "./project-links.js";

const link = { type: "code", label: "Repo", href: "https://example.org/" };

test("projectMeta normalizes hand-written front matter", () => {
  const meta = projectMeta({
    role: "  Lead\n developer ", period: 2026, org: { not: "text" }, status: " Live ",
    highlights: ["a", "", "b", "c", "d", "e"], technologies: "Python, SQL", order: "3",
    featured: true, project_links: [link, { type: "x", label: "Bad", href: "/y/" }],
  });
  assert.deepEqual(meta, {
    role: "Lead developer", period: "2026", org: "", status: "live",
    highlights: ["a", "b", "c", "d"], technologies: ["Python", "SQL"],
    links: [link], order: 3, featured: true,
  });
});

test("projectMeta tolerates missing or malformed values", () => {
  assert.deepEqual(projectMeta(), {
    role: "", period: "", org: "", status: "", highlights: [], technologies: [], links: [], order: null, featured: false,
  });
  const meta = projectMeta({ project_links: "https://example.org/", status: "<script>", order: "abc", highlights: 5 });
  assert.deepEqual([meta.links, meta.status, meta.order, meta.highlights], [[], "", null, []]);
});

test("private status comes from an explicit value first, then from the private tag", () => {
  assert.equal(projectMeta({ tags: ["python", "Private"] }).status, "private");
  assert.equal(projectMeta({ tags: "python, private" }).status, "private");
  assert.equal(projectMeta({ tags: ["private"], status: "archived" }).status, "archived");
  assert.equal(projectMeta({ tags: ["python"] }).status, "");
});

test("projectOrder accepts integers and integer strings only", () => {
  assert.deepEqual([1, "2", " -3 ", 1.5, "1.5", "", null, "abc"].map(projectOrder), [1, 2, -3, null, null, null, null, null]);
});

test("sortProjects orders by `order`, keeping ties and unordered entries in place", () => {
  const entry = (name, order) => ({ name, frontMatter: order === undefined ? {} : { order } });
  const sorted = sortProjects([entry("a"), entry("b", 2), entry("c"), entry("d", 1), entry("e", "2")]);
  assert.deepEqual(sorted.map((item) => item.name), ["d", "b", "e", "a", "c"]);
});

test("projectFields keeps only valid optional values and never throws on them", () => {
  assert.deepEqual(projectFields({ project_links: [link] }), { project_links: [link], featured: false });
  assert.deepEqual(projectFields({
    project_links: [], featured: true, role: " Dev ", period: "2025–2026", org: "", status: "Private",
    highlights: ["x\ny", " ", "b", "c", "d", "e"], order: "7",
  }), {
    project_links: [], featured: true, role: "Dev", period: "2025–2026", status: "private",
    highlights: ["x y", "b", "c", "d"], order: 7,
  });
  assert.deepEqual(projectFields({ status: "nonsense", order: "abc", highlights: "" }), { project_links: [], featured: false });
});

test("a single highlights string is one item, while technologies still accept a comma list", () => {
  assert.deepEqual(projectMeta({ highlights: "323,648 trips replayed" }).highlights, ["323,648 trips replayed"]);
  assert.deepEqual(projectFields({ highlights: "323,648 trips replayed" }).highlights, ["323,648 trips replayed"]);
  assert.deepEqual(projectMeta({ technologies: "Python, SQL" }).technologies, ["Python", "SQL"]);
});

test("applyProjectFields removes emptied or invalid optional fields and keeps unrelated keys", () => {
  const frontMatter = {
    title: "T", technologies: ["Python"], role: "", status: "Nope", order: "abc", org: "Acme",
    highlights: ["x"], project_links: [link],
  };
  assert.equal(applyProjectFields(frontMatter), frontMatter);
  assert.deepEqual(frontMatter, {
    title: "T", technologies: ["Python"], org: "Acme", highlights: ["x"], project_links: [link], featured: false,
  });
});

test("projectFields still rejects invalid resources", () => {
  assert.throws(() => projectFields({ project_links: [{ type: "code", label: "x", href: "javascript:alert(1)" }] }));
  assert.throws(() => projectFields({ project_links: "nope" }));
});
