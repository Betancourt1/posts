---
title: "Mathematical Dependency Interface: 3D Dependency Viewer for Lean 4"
date: 2026-05-30
draft: false
tags: ["open-source", "three-js", "javascript", "lean4", "graph-visualization"]
---

## Context

In the domain of formal mathematical proofs and interactive theorem proving, **Lean 4** and its standard mathematical library, **`mathlib4`**, represent a cornerstone for the mathematical community. However, the structural complexity and massive scale of interconnected mathematical declarations make understanding the web of dependencies between theorems, lemmas, and definitions a highly challenging task.

To address this challenge and assist mathematical research and learning, the **Mathematical Dependency Interface** was created—a lightweight, high-performance web-based 3D visualization tool designed to map, filter, and intuitively explore the logical dependencies within `mathlib4`.

> [!TIP]
> **Open Source Project:**
> This project is open source. Its source code, architectural design, and graph processing tools are publicly hosted at [Betancourt1/mathematics_map](https://github.com/Betancourt1/mathematics_map).

---

## Objective

Build a fast and lightweight web-based interface that avoids the computational and visual noise of rendering the entire mathematical library at once. This is achieved by incorporating progressive loading, dynamic filtering by mathematical disciplines, and localized neighborhood subgraphs.

The project focuses on three main principles:
1. **Academic Precision & Minimalist Design:** Adhering to a "logic-first" design system (zero gradients or unnecessary visual clutter) with monospaced typography (JetBrains Mono) and strict geometric primitives (Cubes for Theorems, Tetrahedrons for Lemmas, and Spheres for Definitions) in solid high-contrast colors.
2. **Multi-Mode Navigation:** Enabling researchers to inspect the graph from multiple angles: a macro-level cosmic cluster view (Algebra, Analysis, Topology, Logic, Geometry), a localized view centered on a specific declaration and its immediate neighbors, and a pathfinding view showing the entire chain from fundamental rules to the target theorem.
3. **Efficient Offline Data Processing:** Designing robust scripts in JavaScript (Node.js) and Python to extract declaration metadata directly from the official `doc-gen4` index and calculate three-dimensional coordinates offline.

---

## Technical Design and Structure

The system uses a decoupled architecture where heavy topological calculations and coordinate layouts are computed offline, leaving rendering and interaction to be handled client-side using vanilla HTML5, CSS, and **Three.js**.

The repository is organized as follows:

```
mathematics_map/
├── public/                      # Web application root (deployable static site)
│   ├── index.html               # Main Single-Page HTML shell
│   ├── styles.css               # Vanilla CSS design system with JetBrains Mono
│   ├── app.js                   # Interactive Three.js frontend application logic
│   └── data/                    # Compiled JSON dataset (coordinates and connections)
│
└── scripts/                     # Data pipeline and automation tools
    ├── fetch-mathlib-docgen4-map.mjs # Ingestion and filtering of Lean declarations
    ├── build-public-3d-map.mjs       # Ring-based 3D coordinate layout generator
    └── render-graph-stills.py        # Python PyGame/Pillow offline still generator
```

### Ingestion & Layout Pipeline

The data preparation operates in two stages:
1. **Extraction & Filtering:** The script `fetch-mathlib-docgen4-map.mjs` retrieves the raw declaration map from the Lean community portal and applies strict parametric limits to create a clean, scientifically readable subgraph.
2. **3D Layout Generation:** The script `build-public-3d-map.mjs` performs topological sorting and organizes nodes in concentric rings within a 3D space, mapping out distinct clusters of mathematical fields.

---

## Results and Benefits

* **Interactive Logical Exploration:** Enables students and researchers to visually trace the exact foundations that support complex and abstract Lean 4 theorems, assisting in the understanding and audit of formalized mathematics.
* **High-Performance Web Client:** Offline layout computation significantly reduces browser rendering bottlenecks, ensuring a smooth, responsive 60 FPS interactive experience inside the 3D WebGL canvas.
* **User-Centric (Logic-First) Layout:** An integrated collapsible Heads-Up Display (HUD) provides fast metadata lookup and code snippet views, while a resizable bottom data drawer offers a structured, tabular layout for precise database searches.

---

## Repository and Access

* **Official GitHub Repository:** You can view the data pipeline scripts, the frontend client source code, and run instructions on:
  [github.com/Betancourt1/mathematics_map](https://github.com/Betancourt1/mathematics_map)
