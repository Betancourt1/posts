---
title: "TermDraft: A Local-First Markdown Editor for the Terminal"
date: 2026-07-22
draft: false
tags: ["open-source","rust","terminal","markdown","local-first"]
short_title: "TermDraft"
summary: "A local-first, keyboard-first Markdown editor that runs entirely in the terminal."
technologies: ["Rust", "Ratatui", "Crossterm", "Markdown"]
---

## Context

Most writing applications require moving between an editor, a file browser, and a rendered preview. **TermDraft** brings those parts together in a terminal interface while keeping every document as an ordinary Markdown or text file.

The project is designed for people who already organize their work in folders and want a focused writing environment without a cloud account, proprietary file format, or background service.

> [!TIP]
> **Open Source Project:**
> TermDraft is available under the MIT license at [Betancourt1/TermDraft](https://github.com/Betancourt1/TermDraft).

---

## Objective

Build a reliable terminal writing workbench with three priorities:

1. **Local-first files:** Edit existing `.md`, `.markdown`, and `.txt` files in place.
2. **Keyboard-first workflow:** Combine modal editing, tabs, workspace navigation, search, file management, and themes in one compact interface.
3. **Safe writing:** Protect unfinished work through atomic saves, external-conflict checks, crash journals, recovery tools, and session restoration.

---

## Technical Design

TermDraft is a native Rust application built with **Ratatui** and **Crossterm**. Its interface supports a hybrid view that renders inactive Markdown while keeping the current line editable as exact source, plus a split layout with source and semantic preview side by side.

The application works directly with the filesystem and preserves the original text format. It includes fuzzy file finding, workspace search, find and replace, document outlines, multiple tabs with independent undo histories, and common file operations constrained to the active workspace.

---

## Results

* A fast terminal editor that does not require Python or a graphical runtime.
* Direct editing of portable Markdown and text files with no content migration.
* Light and dark themes, mouse support, resizable panes, and horizontal navigation for wide tables.
* Native builds distributed through GitHub Releases and Homebrew.

---

## Repository and Access

* **Source code and documentation:** [github.com/Betancourt1/TermDraft](https://github.com/Betancourt1/TermDraft)
* **Install with Homebrew:**

  ```bash
  brew install Betancourt1/tap/termdraft
  termdraft ~/Documents/notes
  ```
