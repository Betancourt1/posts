---
title: "Musical Moods: Análisis de Redes de Sentimiento Musical"
date: 2022-03-30
draft: false
tags: ["open-source","ciencia-de-datos","grafos","visualización-de-datos"]
short_title: "Musical Moods Network"
summary: "Un grafo interactivo de relaciones entre emociones musicales."
technologies: ["Python", "JavaScript", "Sigma.js", "Graphs"]
---

## Contexto

La música tiene una capacidad innata para evocar estados emocionales complejos. Estudiar cómo interactúan y se solapan estas emociones en grandes catálogos de canciones es una tarea sumamente interesante para los sistemas de recomendación musical. 

Con el fin de modelar y comprender de forma matemática y visual la relación entre los diferentes estados de ánimo, desarrollé **Musical Moods Network**, un proyecto interactivo de ciencia de datos que modela las emociones del dataset **MuSe (Multimodal Music Sentiment Analysis)** como una red compleja de grafos no orientados.

> [!TIP]
> **Proyecto Open Source:**
> Este proyecto es de código abierto. Su código, configuraciones y el archivo final interactivo estructurado se encuentran alojados públicamente en [Betancourt1/MusicalMoodsNTWRK](https://github.com/Betancourt1/MusicalMoodsNTWRK).

---

## Objetivo

Construir una red compleja de emociones musicales para:
1. **Mapear la Similitud Emocional:** Identificar qué estados de ánimo (ej. melancólico, alegre, enérgico, sombrío) se solapan o coexisten frecuentemente en la música.
2. **Calcular Métricas de Centralidad:** Determinar matemáticamente qué emociones actúan como "puentes" de transición afectiva entre diferentes géneros y estados.
3. **Visualización Interactiva:** Desarrollar un mapa de red auto-contenido renderizable en tecnologías web estándar (HTML5, CSS y SVG) que permita explorar el dataset de manera fluida y dinámica.

---

## Diseño Técnico y Modelado

El proyecto se estructuró a partir de una modelación de grafos procesando los metadatos de sentimiento del dataset MuSe:

* **Los Nodos:** Representan estados de ánimo y emociones específicas presentes en las canciones de la muestra.
* **Las Aristas (Edges):** Representan la similitud y correlación emocional entre dichos estados de ánimo. La fuerza y distancia de las aristas reflejan qué tan similares son las firmas emocionales de los audios asociados.
* **Centralidad:** Se calculó la **Betweenness Centrality (Centralidad de Intermediación)** de cada nodo para colorear y redimensionar las emociones. Las emociones con mayor Betweenness Centrality actúan como conectores estructurales clave que permiten transicionar gradualmente entre zonas emocionales distantes (por ejemplo, transiciones entre estados de extrema excitación/energía y estados de profunda calma).

```
                      [ Alegre ]
                          | (Similitud)
     [ Optimista ] --- [ Enérgico ] --- [ Agresivo ]
                          |
                   [ Melancólico ] (Emoción Puente)
                          |
                       [ Triste ]
```

### Visualización e Interactividad en el Navegador:

Para habilitar una exploración amigable y dinámica de la red, se integró el motor de renderizado **Sigma.js** adaptando la arquitectura de visualización interactiva del proyecto *InteractiveVis* del Oxford Internet Institute:
* **`data.json`**: Contiene la definición estructurada del grafo (nodos con coordenadas espaciales basadas en algoritmos de distribución por fuerza, peso de enlaces y métricas de centralidad).
* **`config.json`**: Configura las propiedades estéticas y de interacción del canvas (dibujo por curvas, umbrales de etiquetas de texto, navegación y buscador de nodos en tiempo real).
* **Despliegue Portable:** La visualización web se diseñó para ser completamente auto-contenida, permitiendo su renderizado offline en múltiples navegadores y dispositivos sin requerir servicios de backend complejos.

---

## Repositorio y Acceso

* **Exploración de Métricas:** Puedes consultar cómo se calculan las centralidades de intermediación, la topología del grafo y acceder directamente al código fuente y archivo de configuración interactiva:
  [github.com/Betancourt1/MusicalMoodsNTWRK](https://github.com/Betancourt1/MusicalMoodsNTWRK)
* **Licencia de Código:** El proyecto está disponible libremente bajo la licencia open-source MIT para su uso, modificación o fines académicos.
* **Resultados:** Habilitación de un mapa interactivo de psicología afectiva que demuestra la aplicación práctica de la teoría de grafos en grandes bases de datos de análisis conductual y de comportamiento artístico.
