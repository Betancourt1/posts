---
title: "Mathematical Dependency Interface: Modelador 3D de Dependencias para Lean 4"
date: 2026-05-30
draft: false
tags: ["open-source","three-js","javascript","lean4","visualización-de-datos"]
short_title: "Mathematical Dependency Interface"
summary: "Un explorador 3D rápido de dependencias de Lean 4 y mathlib."
technologies: ["Python", "Lean 4", "JavaScript", "Three.js"]
---

## Contexto

En el ámbito del desarrollo de pruebas matemáticas formales y el uso de asistentes de demostración, **Lean 4** y su librería matemática estándar, **`mathlib4`**, desempeñan un papel central. Sin embargo, la complejidad estructural y el inmenso volumen de declaraciones interconectadas hacen que comprender las relaciones de dependencia entre teoremas, lemas y definiciones sea una tarea titánica.

Para abordar este desafío y facilitar la investigación matemática y el aprendizaje, se concibió el **Mathematical Dependency Interface**, una interfaz interactiva en 3D de alto rendimiento que permite mapear, filtrar y explorar visualmente las dependencias lógicas y teóricas de `mathlib4`.

> [!TIP]
> **Proyecto de Código Abierto y Demostración Interactiva:**
> Este proyecto es de código abierto y cuenta con una demo en vivo. Explora el mapa matemático 3D interactivo en [Visualizador Interactivo 3D](https://betancourt1.github.io/mathematics_map/#mode=overview&depth=2).
> Su código fuente, diseño arquitectónico y herramientas de procesamiento de grafos están alojados públicamente en [Betancourt1/mathematics_map](https://github.com/Betancourt1/mathematics_map).

---

## Objetivo

Desarrollar una plataforma de exploración web ligera y de alta velocidad que evite la sobrecarga visual y computacional de mostrar toda la librería de forma masiva. Para ello, se implementó un sistema de carga progresiva, filtrado dinámico por áreas de conocimiento y renderizado de subgrafos localizados.

El sistema se enfoca en tres pilares:
1. **Precisión Matemática e Identidad Visual:** Utilizar un diseño minimalista funcional (libre de distracciones visuales o gradientes excesivos) con fuentes monoespaciadas y geometrías puras que representen tipos específicos de declaraciones (cubos para Teoremas, tetraedros para Lemas y esferas para Definiciones).
2. **Exploración Multimodal:** Ofrecer múltiples perspectivas de análisis: una vista macrocósmica de clusters principales (Álgebra, Análisis, Topología, Lógica y Geometría), un modo de inspección focalizado en un nodo y sus vecinos inmediatos, y la visualización de rutas críticas de dependencias lógicas desde los axiomas iniciales hasta el teorema objetivo.
3. **Pipeline de Ingesta Eficiente:** Diseñar scripts robustos en JavaScript (Node.js) y Python para extraer la metadata de las declaraciones directo del índice oficial de `doc-gen4` de `mathlib4` y computar sus coordenadas espaciales tridimensionales de forma offline.

---

## Diseño Técnico y Estructura

El sistema adopta un enfoque desacoplado, donde el procesamiento topológico del grafo y la asignación de coordenadas se realiza en scripts de compilación, mientras que la renderización y la interacción se ejecutan completamente en el cliente (navegador) usando vanilla JavaScript y **Three.js**.

La arquitectura del repositorio es la siguiente:

```
mathematics_map/
├── public/                      # Raíz de la aplicación web (desplegable estática)
│   ├── index.html               # Contenedor HTML de la SPA (Single Page Application)
│   ├── styles.css               # Sistema de diseño con CSS nativo y JetBrains Mono
│   ├── app.js                   # Lógica e interactividad del visor en Three.js
│   └── data/                    # Dataset JSON procesado (con coordenadas y dependencias)
│
└── scripts/                     # Automatizaciones y procesamiento de datos
    ├── fetch-mathlib-docgen4-map.mjs # Ingesta y filtrado de declaraciones de doc-gen4
    ├── build-public-3d-map.mjs       # Cálculo de clusters y distribución espacial 3D
    └── render-graph-stills.py        # Generación de renders offline premium en 4K (PyGame/Pillow)
```

### Flujo de Datos e Ingesta

El pipeline procesa los datos en dos etapas principales:
1. **Extracción y Filtrado:** El script `fetch-mathlib-docgen4-map.mjs` descarga el mapa estructurado del portal de la comunidad Lean y genera un subgrafo manejable aplicando límites paramétricos por categoría o grado de nodos para mantener la legibilidad científica.
2. **Layout Tridimensional:** El script `build-public-3d-map.mjs` ejecuta algoritmos de ordenamiento topológico y distribución en anillos concéntricos para posicionar de manera intuitiva los nodos en un espacio cósmico de 3D, facilitando el análisis visual de clusters de conocimiento.

---

## Resultados y Beneficios

* **Exploración Lógica Interactiva:** Permite a estudiantes e investigadores rastrear visualmente qué teoremas fundamentales apoyan los teoremas más avanzados y abstractos de Lean 4, facilitando la comprensión y auditoría del conocimiento formalizado.
* **Alto Rendimiento en Web:** El procesamiento offline del layout de coordenadas reduce de forma drástica el costo de renderizado inicial en el navegador, logrando mantener tasas sólidas de 60 FPS en el canvas 3D interactivo.
* **Diseño Centrado en el Usuario (Logic-First):** La integración de un Heads-Up Display (HUD) minimalista proporciona metadatos clave de cada declaración y fragmentos de código, mientras que la interfaz tabular inferior ofrece una alternativa estructurada para la búsqueda de información precisa.

---

## Repositorio y Acceso

* **Visualizador en Vivo (Demo Interactiva):** Explora las dependencias en 3D directamente desde tu navegador con el modo general preconfigurado:
  [betancourt1.github.io/mathematics_map](https://betancourt1.github.io/mathematics_map/#mode=overview&depth=2)
* **Repositorio Oficial en GitHub:** Puedes acceder a los scripts del pipeline de datos, el código del cliente interactivo en 3D y las instrucciones de inicialización locales directamente en:
  [github.com/Betancourt1/mathematics_map](https://github.com/Betancourt1/mathematics_map)
