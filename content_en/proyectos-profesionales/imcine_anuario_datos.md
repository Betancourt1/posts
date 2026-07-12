---
title: "IMCINE CineMX Yearbook: Open and Historical Dataset"
date: 2026-01-27
draft: false
tags: ["open-source","python","scraping","mexican-cinema","dataset"]
---

## Context

The CineMX Yearbook of the Mexican Institute of Cinematography (IMCINE) constituted one of the most valuable public resources to audit, study, and research the state of cinema in Mexico. In late September 2025, I carried out an exhaustive data extraction (*web scraping*) process of the site in order to analyze thematic trends in Mexican films.

On January 27, 2026, the official online platform that allowed interactive query of these historical files was unexpectedly taken down. In order to prevent the loss of this historical information and encourage cultural and public data analysis, I decided to consolidate and open everything extracted through a public repository on GitHub.

> [!TIP]
> **Open Source Project:**
> Unlike other corporate projects, **this project is 100% open-source**. Its source code and structured datasets ready to consume are publicly hosted at [Betancourt1/imcine_datos_abiertos](https://github.com/Betancourt1/imcine_datos_abiertos).

---

## Objective

Develop a reproducible pipeline in Python that transforms the unstructured local snapshot extracted from the IMCINE portal into a standardized, clean, and multi-format (CSV, JSON, NDJSON) dataset easily accessible to researchers, journalists, or programmers.

The project prioritizes:
1. **Historical Preservation:** Safeguard the data of films published from 2007 to 2024.
2. **Provenance and Transparency:** Maintain copies of the original source files in HTML/MHTML grouped by year to allow external audits and verify the fidelity of the transformed data.
3. **Reproducible Pipeline:** Allow the reconstruction of the dataset with a single command using modular scripts.

---

## Project Structure

The repository is organized in a clear and self-contained way:

```
imcine_datos_abiertos/
├── data/
│   ├── raw/                  # Faithful copies of the snapshot extracted in UTF-8
│   └── processed/            # Resulting datasets (CSV, JSON, NDJSON)
│
├── html_summaries/           # Visual MHTML summaries of the yearbook by year (2007-2024)
├── docs/                     # Dataset metadata and detailed data dictionary
├── scripts/                  # Python scripts in charge of processing
├── build_dataset.py          # Main consolidation and cleaning pipeline
│
├── peliculas.xlsx            # Export in spreadsheet format for direct use
└── LICENSE                   # Creative Commons BY 4.0 free-use license
```

---

## Dataset Construction and Pipeline

Processing is completely transparent and reproducible. It requires a basic Python 3 environment and is run via:

```bash
python scripts/build_dataset.py
```

The pipeline reads individual files, performs text normalization, missing value imputation, and key field restructuring (such as genre, directors, actors, and budget), generating as output:
* **`peliculas.json`**: Complete nested structure ideal for document storage.
* **`peliculas.csv`**: Flat format perfect for quick analysis in pandas or BI tools.
* **`peliculas.ndjson`**: Line-delimited JSON format for streaming processing of large files.
* **`dataset_stats.json`**: Automatic report of quality metrics and dataset processing volume.

---

## Repository and Access

* **Cinematographic Preservation:** Safeguard historical national production data when the official source is no longer deployed online.
* **Open License:** Released in its entirety under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license, allowing its free distribution, remixing, and commercial use as long as the project authorship is credited.
* **GitHub Repository:** You can check the pipeline, processing scripts, and download structured datasets directly from the public repository:
  [github.com/Betancourt1/imcine_datos_abiertos](https://github.com/Betancourt1/imcine_datos_abiertos)
