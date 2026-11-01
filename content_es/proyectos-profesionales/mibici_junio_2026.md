---
title: "MiBici: un mes de viajes en bicicleta"
date: 2026-07-22
draft: false
featured: true
tags:
  - open-source
  - react
  - canvas
  - data-visualization
  - geospatial
short_title: "Bicicletas GDL"
summary: "Reproduce 323,648 viajes en bicicleta por Guadalajara durante junio de 2026."
project_map: "https://mibici.fbetancourt.work/"
project_repository: "https://github.com/Betancourt1/mibici_junio_2026"
project_writing: "https://github.com/Betancourt1/tesis/blob/adbcab8f64112d78163cfd116399a67ecf8dbb6f/Latex/Tesis/main.pdf"
technologies: [ "React", "Vite", "Canvas 2D", "Cloudflare Workers" ]
---

Elige un día de junio de 2026 y empieza la reproducción. Cada bicicleta que se mueve en el mapa representa un viaje registrado por MiBici en Guadalajara. Sigue una durante unos segundos: la salida y la llegada vienen del registro del viaje, mientras que las calles por las que pasa son una estimación.

## ¿Qué viajes aparecen en el mapa?

MiBici registró **355,303 viajes** ese mes. Para dibujar un viaje necesitaba las coordenadas de ambas estaciones. En **31,655 viajes**, al menos una estación tenía `(0, 0)` como coordenadas provisionales. Conservé esos viajes en el total del mes y los dejé fuera de la animación. Así quedaron **323,648 viajes** que puedes seguir en el mapa.

[Consultar los datos abiertos de MiBici](https://mibici.net/es/datos-abiertos/)

## ¿Cómo se mueve una bicicleta entre dos estaciones?

Los registros indican las estaciones y los horarios, pero no incluyen un recorrido GPS. Para los viajes con el mismo origen y destino reutilizo una ruta estimada sobre la red de calles. Cuando ha transcurrido la mitad del tiempo registrado, la bicicleta aparece a mitad de esa ruta. El tramo de calle que atraviesa determina hacia dónde apunta.

Las dos funciones que hacen este cálculo se pueden leer juntas. `prepareTrip` mide los tramos. `pointAlong` toma la fracción del tiempo transcurrido y calcula la posición y el ángulo de la bicicleta. [Leer el código de interpolación](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/map/mercator.js#L17).

## ¿Cómo se reproduce un día completo?

Al elegir una fecha, la aplicación carga los archivos horarios de ese día. Una vez en memoria, puedes pausar o cambiar de velocidad sin volver a descargarlos. A `1800×`, un segundo en pantalla equivale a media hora en Guadalajara. React gestiona el reloj y el panel de reproducción. Canvas dibuja las bicicletas sobre el mapa.

[Ver cómo se carga un día](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/App.jsx#L108-L115) · [Ver cómo se dibuja el mapa](https://github.com/Betancourt1/mibici_junio_2026/blob/df35c491492d48b33d00da6c86d3d151fc9f9379/src/map/MapSurface.jsx)

## Lectura relacionada

[La red de transporte público de Guadalajara](https://github.com/Betancourt1/tesis/blob/adbcab8f64112d78163cfd116399a67ecf8dbb6f/Latex/Tesis/main.pdf) mira la misma ciudad desde otro ángulo. En mi tesis utilicé un grafo de paradas y conexiones para estudiar qué le sucede a la red cuando falla una conexión.

Cartografía de CARTO con datos de los colaboradores de OpenStreetMap.
