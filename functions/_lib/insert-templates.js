// Shared by the CodeMirror block editor bundle and the textarea fallback script.
// Keep this module data-only so the fallback can embed it with JSON.stringify.
const FENCE = "```";

export const INSERT_TEMPLATES = Object.freeze({
  "inline-math": {
    inline: true,
    pattern: "$%s$",
    sample: { en: "x^2 + y^2 = z^2", es: "x^2 + y^2 = z^2" },
  },
  "display-math": {
    pattern: "$$\n%s\n$$",
    sample: { en: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}", es: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" },
  },
  code: {
    pattern: FENCE + "%l\n%s\n" + FENCE,
    sample: { en: "Your code here", es: "Tu código aquí" },
    languageSamples: { python: "def square(x):\n    return x ** 2" },
  },
  mermaid: {
    pattern: FENCE + "mermaid\n%s\n" + FENCE,
    sample: {
      en: "flowchart LR\n  accTitle: Data flow\n  A[Input] --> B[Model] --> C[Output]",
      es: "flowchart LR\n  accTitle: Flujo de datos\n  A[Entrada] --> B[Modelo] --> C[Salida]",
    },
  },
  image: {
    pattern: { en: "![Describe the diagram](%s)", es: "![Describe el diagrama](%s)" },
    sample: { en: "/visuals/diagram.svg", es: "/visuals/diagram.svg" },
  },
  video: {
    pattern: { en: "![Describe the animation](%s)", es: "![Describe la animación](%s)" },
    sample: { en: "/visuals/animation.webm", es: "/visuals/animation.webm" },
  },
  interactive: {
    json: true,
    pattern: {
      en: FENCE + 'interactive\n{"src":"%s","title":"Explore the model","height":480}\n' + FENCE,
      es: FENCE + 'interactive\n{"src":"%s","title":"Explora el modelo","height":480}\n' + FENCE,
    },
    sample: { en: "/visuals/model.html", es: "/visuals/model.html" },
  },
});

export function insertTemplateText(kind, options = {}) {
  const template = INSERT_TEMPLATES[kind];
  if (!template) return "";
  const lang = options.lang === "es" ? "es" : "en";
  const language = options.language || "python";
  const pattern = typeof template.pattern === "string" ? template.pattern : template.pattern[lang];
  let content = options.selected || (template.languageSamples && template.languageSamples[language]) || template.sample[lang];
  if (template.json) content = JSON.stringify(content).slice(1, -1);
  return pattern.replace("%l", () => language).replace("%s", () => content);
}
