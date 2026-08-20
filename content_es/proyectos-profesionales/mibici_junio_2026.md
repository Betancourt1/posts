---
title: "Bicicletas GDL: Visualización de Viajes MiBici de Junio de 2026"
date: 2026-07-22
draft: false
tags: ["open-source","react","canvas","data-visualization","geospatial"]
short_title: "Bicicletas GDL"
summary: "Una reproducción cartográfica interactiva de 323,648 viajes de MiBici registrados durante junio de 2026."
technologies: ["React", "Vite", "Canvas 2D", "Cloudflare Workers"]
---

## Contexto

MiBici publica registros de viajes con estaciones de origen y destino, horarios y atributos básicos de las personas usuarias, pero no incluye la ruta GPS seguida por cada bicicleta. **Bicicletas GDL** transforma el dataset abierto de junio de 2026 en una reproducción diaria e interactiva del movimiento ciclista en el Área Metropolitana de Guadalajara.

> [!TIP]
> **Proyecto de Código Abierto:**
> La aplicación, los datos procesados y la configuración de despliegue están disponibles en [Betancourt1/mibici_junio_2026](https://github.com/Betancourt1/mibici_junio_2026).

---

## Objetivo

Hacer explorable un mes de datos de movilidad como movimiento y no como una tabla estática:

1. Reproducir cualquiera de los 30 días sobre una línea de tiempo continua de 24 horas.
2. Mostrar la dirección y el recorrido reciente de cada viaje activo sin saturar el mapa.
3. Permitir la interacción desde escritorio y teléfono mediante controles responsivos, desplazamiento, zoom con rueda o gesto de pinza y detalles seleccionables de cada viaje.

---

## Datos y Método

La fuente contiene **355,303 viajes**. De ellos, **323,648** tienen coordenadas utilizables en ambas estaciones y pueden renderizarse. Los 31,655 viajes restantes se conservan en el total estadístico, pero se excluyen de la animación porque sus registros oficiales de estación utilizan coordenadas provisionales `(0,0)`.

Como el dataset no contiene trazas GPS, cada ruta intermedia se infiere sobre la red vial a partir de su origen y destino. Los viajes que comparten el mismo par de estaciones reutilizan la geometría. La posición y orientación se interpolan con la hora de inicio, la duración y el tiempo actual de la simulación, por lo que el mapa presenta una aproximación informada y no el recorrido exacto de la persona usuaria.

---

## Diseño Técnico

La interfaz utiliza **React** para el estado y los controles, **Canvas 2D** para renderizar una alta densidad de viajes y sus recorridos continuos de los cinco minutos recientes, y teselas de CARTO basadas en OpenStreetMap. Los archivos de datos por hora se cargan bajo demanda para el día seleccionado.

La línea de tiempo combina barras de viajes activos con series por género y permite velocidades desde tiempo real hasta `1800×`. El mapa ofrece temas claro y oscuro, controles responsivos, manipulación directa y detalles de origen, destino y edad aproximada.

---

## Resultados

* Cobertura interactiva de los 30 días de junio de 2026.
* 323,648 viajes cartografiados y 43,706 pares de estaciones origen-destino resueltos.
* Un renderer en Canvas adecuado para viajes simultáneos, indicadores de dirección y recorridos recientes con desvanecimiento suave.
* Una aplicación responsiva en React empaquetada como recursos estáticos para Cloudflare Workers.

---

## Repositorio y Acceso

* **Código fuente y documentación técnica:** [github.com/Betancourt1/mibici_junio_2026](https://github.com/Betancourt1/mibici_junio_2026)
* **Fuente de datos:** [Datos Abiertos de MiBici](https://mibici.net/es/datos-abiertos/)
* **Atribución del mapa:** © colaboradores de OpenStreetMap, © CARTO
