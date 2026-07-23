---
title: "Bicicletas GDL: MiBici Trip Visualization for June 2026"
date: 2026-07-22
draft: false
tags: ["open-source","react","canvas","data-visualization","geospatial"]
short_title: "Bicicletas GDL"
summary: "An interactive map replay of 323,648 MiBici trips recorded during June 2026."
technologies: ["React", "Vite", "Canvas 2D", "Cloudflare Workers"]
---

## Context

MiBici publishes trip records with origin and destination stations, timestamps, and basic rider attributes, but not the GPS path followed by each bicycle. **Bicicletas GDL** turns the June 2026 open dataset into an interactive daily replay of bicycle movement across the Guadalajara metropolitan area.

> [!TIP]
> **Open Source Project:**
> The application, processing output, and deployment configuration are available at [Betancourt1/mibici_junio_2026](https://github.com/Betancourt1/mibici_junio_2026).

---

## Objective

Make a month of mobility data explorable as movement rather than as a static table:

1. Reproduce any of the 30 days on a continuous 24-hour timeline.
2. Show the direction and recent path of each active trip without overwhelming the map.
3. Support desktop and phone interaction with responsive playback controls, panning, wheel zoom, pinch zoom, and selectable rider details.

---

## Data and Method

The source contains **355,303 trips**. Of those, **323,648** have usable coordinates for both stations and can be rendered. The remaining 31,655 trips are retained in the statistical total but excluded from the animation because their official station records use `(0,0)` placeholder coordinates.

Because the dataset does not contain GPS traces, each intermediate route is inferred over the street network from its origin and destination. Trips that share a station pair reuse the same geometry. Position and orientation are interpolated from the trip start time, duration, and current simulation time, so the map presents an informed approximation rather than the rider's exact route.

---

## Technical Design

The interface uses **React** for state and controls, **Canvas 2D** for dense animated riders and their continuous five-minute trails, and CARTO map tiles based on OpenStreetMap. Hourly data files are loaded on demand for the selected day.

The timeline combines active-trip bars with gender series and supports speeds from real time to `1800×`. The map provides light and dark themes, responsive controls, direct manipulation, and rider details for origin, destination, and approximate age.

---

## Results

* Interactive coverage of all 30 days in June 2026.
* 323,648 mapped trips and 43,706 resolved origin-destination station pairs.
* A Canvas renderer suitable for simultaneous moving riders, direction markers, and softly fading recent trails.
* A responsive React application packaged as static assets for Cloudflare Workers.

---

## Repository and Access

* **Source code and technical documentation:** [github.com/Betancourt1/mibici_junio_2026](https://github.com/Betancourt1/mibici_junio_2026)
* **Data source:** [MiBici Open Data](https://mibici.net/es/datos-abiertos/)
* **Map attribution:** © OpenStreetMap contributors, © CARTO
