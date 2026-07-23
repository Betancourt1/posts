---
title: "TermDraft: Editor Local-First de Markdown para la Terminal"
date: 2026-07-22
draft: false
tags: ["open-source","rust","terminal","markdown","local-first"]
short_title: "TermDraft"
summary: "Un editor local-first y keyboard-first de Markdown que funciona por completo en la terminal."
technologies: ["Rust", "Ratatui", "Crossterm", "Markdown"]
---

## Contexto

La mayoría de las aplicaciones de escritura obligan a cambiar entre un editor, un explorador de archivos y una vista renderizada. **TermDraft** reúne esas partes en una interfaz de terminal y conserva cada documento como un archivo común de Markdown o texto.

El proyecto está pensado para personas que ya organizan su trabajo en carpetas y quieren un entorno de escritura enfocado, sin una cuenta en la nube, un formato propietario o un servicio en segundo plano.

> [!TIP]
> **Proyecto de Código Abierto:**
> TermDraft está disponible bajo la licencia MIT en [Betancourt1/TermDraft](https://github.com/Betancourt1/TermDraft).

---

## Objetivo

Construir un entorno confiable de escritura en la terminal con tres prioridades:

1. **Archivos local-first:** Editar archivos `.md`, `.markdown` y `.txt` existentes directamente.
2. **Flujo keyboard-first:** Integrar edición modal, pestañas, navegación del workspace, búsqueda, administración de archivos y temas en una interfaz compacta.
3. **Escritura segura:** Proteger el trabajo sin terminar mediante guardado atómico, detección de conflictos externos, diarios de recuperación y restauración de sesiones.

---

## Diseño Técnico

TermDraft es una aplicación nativa en Rust construida con **Ratatui** y **Crossterm**. Su interfaz incluye una vista híbrida que renderiza el Markdown inactivo mientras mantiene la línea actual como código fuente exacto, además de una disposición dividida con el código y la vista semántica lado a lado.

La aplicación trabaja directamente con el sistema de archivos y conserva el formato original del texto. Incluye búsqueda difusa de archivos, búsqueda en el workspace, búsqueda y reemplazo, esquema de encabezados, múltiples pestañas con historiales de deshacer independientes y operaciones comunes limitadas al workspace activo.

---

## Resultados

* Un editor rápido de terminal que no requiere Python ni un entorno gráfico.
* Edición directa de archivos portables de Markdown y texto sin migrar contenido.
* Temas claros y oscuros, soporte para mouse, paneles redimensionables y navegación horizontal en tablas anchas.
* Builds nativos distribuidos mediante GitHub Releases y Homebrew.

---

## Repositorio y Acceso

* **Código fuente y documentación:** [github.com/Betancourt1/TermDraft](https://github.com/Betancourt1/TermDraft)
* **Instalación con Homebrew:**

  ```bash
  brew install Betancourt1/tap/termdraft
  termdraft ~/Documents/notas
  ```
