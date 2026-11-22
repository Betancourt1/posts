const sources = [...document.querySelectorAll(".post-body [data-mermaid]")];

document.querySelectorAll(".post-body table, .article table").forEach((table) => {
  const scroller = document.createElement("div");
  scroller.className = "table-scroll";
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", "Horizontally scrollable table");
  table.before(scroller);
  scroller.append(table);
});

if (sources.length) {
  try {
    const { default: mermaid } = await import("/vendor/mermaid/mermaid.esm.min.mjs");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "neutral",
      fontFamily: "system-ui, sans-serif",
      // Use one legible paper surface in both site themes.
      themeVariables: { background: "#f6f5f1" },
    });
    for (const [index, source] of sources.entries()) {
      const figure = document.createElement("figure");
      figure.className = "technical-diagram";
      const output = document.createElement("div");
      output.className = "technical-diagram-image";
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Diagram source";
      details.append(summary);
      source.before(figure);
      details.append(source);
      figure.append(output, details);
      try {
        const { svg } = await mermaid.render(`technical-diagram-${index}`, source.textContent, output);
        output.innerHTML = svg;
        const diagram = output.querySelector("svg");
        if (diagram && !diagram.getAttribute("aria-labelledby")) {
          diagram.setAttribute("role", "img");
          diagram.setAttribute("aria-label", "Diagram");
        }
      } catch {
        output.remove();
        details.open = true;
        summary.textContent = "Diagram unavailable; view source";
      }
    }
  } catch {
    // If the optional module cannot load, the original code remains readable.
  }
}
