---
title: "IMCINE Anuario CineMX: Dataset Abierto e Histórico"
date: 2026-01-27
draft: false
tags: ["open-source", "python", "scraping", "cine-mexicano", "dataset"]
---

## Contexto

El Anuario CineMX del Instituto Mexicano de Cinematografía (IMCINE) constituía uno de los recursos públicos más valiosos para auditar, estudiar e investigar el estado del cine en México. A finales de septiembre de 2025, realicé un proceso de raspado de datos (*web scraping*) exhaustivo del sitio con el fin de analizar tendencias temáticas en las películas mexicanas.

El 27 de enero de 2026, la plataforma en línea oficial que permitía la consulta interactiva de estas fichas históricas fue retirada de internet de forma imprevista. Con el fin de evitar la pérdida de esta información histórica y fomentar el análisis cultural y de datos públicos, decidí consolidar y abrir todo lo extraído mediante un repositorio público en GitHub.

> [!TIP]
> **Proyecto Open Source:**
> A diferencia de otros proyectos corporativos, **este proyecto es 100% de código abierto**. Su código fuente y los datasets estructurados listos para consumir se encuentran alojados públicamente en [Betancourt1/imcine_datos_abiertos](https://github.com/Betancourt1/imcine_datos_abiertos).

---

## Objetivo

Desarrollar un pipeline reproducible en Python que transforme el snapshot local desestructurado extraído del portal de IMCINE en un conjunto de datos estandarizado, limpio y multiformato (CSV, JSON, NDJSON) de fácil acceso para investigadores, periodistas o programadores.

El proyecto prioriza:
1. **Preservación Histórica:** Resguardar la data de películas publicadas desde el 2007 hasta el 2024.
2. **Procedencia y Transparencia:** Mantener copias de los ficheros fuente originales en HTML/MHTML agrupados por año para permitir auditorías externas y verificar la fidelidad de los datos transformados.
3. **Pipeline Reproducible:** Permitir la reconstrucción del dataset con un único comando mediante scripts modulares.

---

## Estructura del Proyecto

El repositorio está organizado de forma clara y autocontenida:

```
imcine_datos_abiertos/
├── data/
│   ├── raw/                  # Copias fieles del snapshot extraído en UTF-8
│   └── processed/            # Sets de datos resultantes (CSV, JSON, NDJSON)
│
├── html_summaries/           # Resúmenes visuales MHTML del anuario por año (2007-2024)
├── docs/                     # Metadatos del dataset y diccionario de datos detallado
├── scripts/                  # Scripts en Python encargados del procesamiento
│   └── build_dataset.py      # Pipeline principal de consolidación y limpieza
│
├── peliculas.xlsx            # Exportación en formato de hoja de cálculo para uso directo
└── LICENSE                   # Licencia de uso libre Creative Commons BY 4.0
```

---

## Construcción del Dataset y Pipeline

El procesamiento es completamente transparente y reproducible. Requiere un entorno básico de Python 3 y se ejecuta mediante:

```bash
python scripts/build_dataset.py
```

El pipeline lee las fichas individuales, realiza tareas de normalización de textos, imputación de valores faltantes y reestructuración de campos clave (como género, directores, actores y presupuesto), generando como salida:
* **`peliculas.json`**: Estructura anidada completa ideal para almacenamiento documental.
* **`peliculas.csv`**: Formato plano perfecto para análisis rápido en pandas o herramientas de BI.
* **`peliculas.ndjson`**: Formato de JSON delimitado por saltos de línea para procesamiento en streaming de grandes archivos.
* **`dataset_stats.json`**: Reporte automático de métricas de calidad y volumen del procesamiento del dataset.

---

## Resultados y Acceso

* **Preservación Cinematográfica:** Salvaguarda de los datos históricos de producción nacional cuando la fuente oficial ya no está desplegada en línea.
* **Licencia Abierta:** Liberado en su totalidad bajo la licencia **Creative Commons Attribution 4.0 International (CC BY 4.0)**, permitiendo su libre distribución, remezcla y uso comercial siempre que se reconozca la autoría del proyecto.
* **Acceso Público:** Cualquiera puede consultar la estructura del pipeline, sugerir mejoras, o descargar los datos procesados visitando el repositorio en GitHub.
