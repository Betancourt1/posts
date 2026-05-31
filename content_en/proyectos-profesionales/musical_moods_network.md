---
title: "Musical Moods: Musical Sentiment Network Analysis"
date: 2022-03-30
draft: false
tags: ["open-source", "data-science", "network-analysis", "graphs", "visualization"]
---

## Context

Music has an innate ability to evoke complex emotional states. Studying how these emotions interact and overlap in large song catalogs is a highly interesting task for music recommendation systems.

In order to model and mathematically and visually understand the relationship between different moods, I developed **Musical Moods Network**, an interactive data science project that models the emotions of the **MuSe (Multimodal Music Sentiment Analysis)** dataset as a complex network of undirected graphs.

> [!TIP]
> **Open Source Project:**
> This project is open source. Its code, configurations, and the final structured interactive file are publicly hosted at [Betancourt1/MusicalMoodsNTWRK](https://github.com/Betancourt1/MusicalMoodsNTWRK).

---

## Objective

Build a complex network of musical emotions to:
1. **Map Emotional Similarity:** Identify which moods (e.g., melancholy, happy, energetic, gloomy) frequently overlap or coexist in music.
2. **Calculate Centrality Metrics:** Mathematically determine which emotions act as "bridges" of affective transition between different genres and states.
3. **Interactive Visualization:** Develop a self-contained network map renderable in standard web technologies (HTML5, CSS, and SVG) that allows fluid and dynamic exploration of the dataset.

---

## Technical Design and Modeling

The project was structured from a graph model processing the sentiment metadata of the MuSe dataset:

* **Nodes:** Represent specific moods and emotions present in the sample songs.
* **Edges:** Represent the similarity and emotional correlation between these moods. The strength and distance of the edges reflect how similar the emotional signatures of the associated audios are.
* **Centrality:** The **Betweenness Centrality** of each node was calculated to color and resize the emotions. Emotions with higher Betweenness Centrality act as key structural connectors that allow gradual transitions between distant emotional zones (for example, transitions between states of extreme excitement/energy and states of deep calm).

```
                      [ Happy ]
                          | (Similarity)
     [ Optimistic ] --- [ Energetic ] --- [ Aggressive ]
                          |
                    [ Melancholy ] (Bridge Emotion)
                          |
                        [ Sad ]
```

### Browser-based Visualization and Interactivity:

To enable a friendly and dynamic exploration of the network, the **Sigma.js** rendering engine was integrated, adapting the interactive visualization architecture of the *InteractiveVis* project from the Oxford Internet Institute:
* **`data.json`**: Contains the structured definition of the graph (nodes with spatial coordinates based on force-directed layout algorithms, edge weights, and centrality metrics).
* **`config.json`**: Configures the aesthetic and interaction properties of the canvas (curve drawing, text label thresholds, navigation, and real-time node search).
* **Portable Deployment:** The web visualization was designed to be completely self-contained, allowing offline rendering in multiple browsers and devices without requiring complex backend services.

---

## Repository and Access

* **Metrics Exploration:** You can check how betweenness centralities are calculated, the graph topology, and access the source code and interactive configuration file directly:
  [github.com/Betancourt1/MusicalMoodsNTWRK](https://github.com/Betancourt1/MusicalMoodsNTWRK)
* **Code License:** The project is freely available under the MIT open-source license for use, modification, or academic purposes.
* **Results:** Provision of an interactive map of affective psychology demonstrating the practical application of graph theory to large behavioral and artistic databases.
