---
title: "MiBici: replaying a month of bike trips"
date: 2026-07-22
draft: false
featured: true
tags: ["open-source","react","canvas","data-visualization","geospatial"]
short_title: "Bicicletas GDL"
summary: "Replay 323,648 bike trips across Guadalajara in June 2026."
project_map: "https://mibici.fbetancourt.work/"
project_repository: "https://github.com/Betancourt1/mibici_junio_2026"
project_writing: "https://github.com/Betancourt1/tesis/blob/adbcab8f64112d78163cfd116399a67ecf8dbb6f/Latex/Tesis/main.pdf"
technologies: ["React", "Vite", "Canvas 2D", "Cloudflare Workers"]
---

Choose a day in June 2026 and press play. Each moving bicycle represents a recorded MiBici trip in Guadalajara. Try following one across the map: its departure and arrival come from the trip record, while the streets it takes between them are an estimate.

## Which trips made it onto the map?

MiBici recorded **355,303 trips** that month. To draw a trip, I needed coordinates for both stations. For **31,655 trips**, at least one station had placeholder coordinates of `(0, 0)`. I kept those trips in the monthly count and left them out of the animation. That leaves **323,648 trips** you can follow on the map.

[Explore the original MiBici data](https://mibici.net/es/datos-abiertos/)

## How does a bicycle move between two stations?

The records give me the stations and times, but no GPS trace. I reuse an inferred street route for trips with the same origin and destination. Halfway through a recorded trip, the bicycle appears halfway along that route. Its direction comes from the street segment it is crossing.

The two functions behind this are short enough to read together. `prepareTrip` measures the segments. `pointAlong` takes the fraction of the trip that has elapsed and finds the corresponding position and angle. [Read the interpolation code](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/map/mercator.js#L17).

## How can you replay a whole day?

Selecting a date loads that day's hourly files. Once they're in memory, you can pause or change the playback speed without downloading the day again. At `1800×`, one second on screen covers half an hour in Guadalajara. React handles the clock and controls, and Canvas draws the moving bicycles over the map tiles.

[See how a day is loaded](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/App.jsx#L108-L115) · [Read the map renderer](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/map/MapSurface.jsx)

## Related reading

[Guadalajara's public transport network](https://github.com/Betancourt1/tesis/blob/adbcab8f64112d78163cfd116399a67ecf8dbb6f/Latex/Tesis/main.pdf) looks at the same city from another angle. In my thesis I used a graph of stops and connections to study what happens to the network when a connection fails.

Map tiles by CARTO, with map data from OpenStreetMap contributors.
