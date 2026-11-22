// Shared by the CodeMirror block editor bundle and the textarea fallback script.
// Keep this module data-only so the fallback can embed it with JSON.stringify.
const FENCE = "```";

export const INSERT_TEMPLATES = Object.freeze({
  "inline-math": {
    inline: true,
    pattern: "$%s$",
    sample: "x^2 + y^2 = z^2",
  },
  "display-math": {
    pattern: "$$\n%s\n$$",
    sample: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
  },
  code: {
    pattern: FENCE + "%l\n%s\n" + FENCE,
    sample: "Your code here",
    languageSamples: { python: "def square(x):\n    return x ** 2" },
  },
  mermaid: {
    pattern: FENCE + "mermaid\n%s\n" + FENCE,
    sample: "flowchart LR\n  accTitle: Data flow\n  A[Input] --> B[Model] --> C[Output]",
  },
  image: {
    pattern: "![Describe the diagram](%s)",
    sample: "/visuals/diagram.svg",
  },
  video: {
    pattern: "![Describe the animation](%s)",
    sample: "/visuals/animation.webm",
  },
  interactive: {
    json: true,
    pattern: FENCE + 'interactive\n{"src":"%s","title":"Explore the model","height":480}\n' + FENCE,
    sample: "/visuals/model.html",
  },
});

export function insertTemplateText(kind, options = {}) {
  const template = INSERT_TEMPLATES[kind];
  if (!template) return "";
  const language = options.language || "python";
  let content = options.selected || (template.languageSamples && template.languageSamples[language]) || template.sample;
  if (template.json) content = JSON.stringify(content).slice(1, -1);
  return template.pattern.replace("%l", () => language).replace("%s", () => content);
}
