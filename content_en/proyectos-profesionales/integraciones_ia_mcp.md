---
title: "AI Integrations with Model Context Protocol (MCP)"
date: 2026-05-14
draft: false
tags: ["mcp","artificial-intelligence","technology","data-warehouse","architecture","private"]
---

## Context

To boost decision-making and empower advanced AI assistants (like Claude or ChatGPT) with the ability to query and analyze information in real time, a microservices ecosystem based on the **Model Context Protocol (MCP)** was designed and implemented.

This ecosystem acts as a secure, governed, and high-performance bridge between Large Language Models (LLMs) and the **corporate Data Warehouse (DWH)** at Vinos América.

> [!NOTE]
> **Confidentiality and Intellectual Property Note:**
> Being a private and strategic enterprise development, the source code, credentials, and the Data Warehouse (DWH) codebase/schemas are not publicly available (not open-source) to protect information security and organization operational rules.

---

## Objective

Establish a governed communication channel that allows autonomous AI agents to query analytical data securely. The system had to meet:
1. **Governance and Auditability:** Record every query made by the models, including user context and tokens consumed.
2. **Domain Modularization:** Decoupled MCP servers by business area to limit privileges and simplify maintenance.
3. **Delivery Optimization:** Ability to automatically toggle between *inline* responses (quick JSON for specific questions) and structured report generation/download in *attachment* format (dynamic Excel/XLSX) when the data volume exceeds certain limits (up to a hard cap of 200,000 rows).

---

## Solution and Technical Integration

The project was structured as a multi-server ecosystem orchestrated in Docker containers and exposed via gRPC and HTTP servers. Each server encapsulates a specific business domain:

| MCP Server | Key Tools | Output Type | Business Purpose |
|---|---|---|---|
| **`finance-mcp`** | `get_trial_balance`, `get_account_movements`, `get_supplier_aging`, `get_cash_position` | JSON / XLSX | Trial balance, supplier aging, and cash flow analysis. |
| **`commercial-mcp`** | `get_sales_kpis`, `get_customer_360`, `find_discount_anomalies`, `get_price_explanation` | JSON / XLSX | Sales KPIs analysis, discount anomaly detection, and 360 customer profiles. |
| **`logistics-mcp`** | `get_inventory_position`, `compare_erp_wms_stock`, `get_movement_trace`, `get_stockout_risk` | JSON / XLSX | Current stock visibility, stock-in-transit control, and stockout risk prevention. |
| **`bi-mcp`** | `run_metric_query`, `search_metric`, `explain_metric_formula` | JSON / Inline | Natural language interface to query the company's catalog of governed metrics and formulas. |
| **`data-engineering-mcp`** | `list_pipeline_runs`, `get_model_lineage`, `get_table_profile`, `run_readonly_sql` | JSON / Inline | Read-only operational tools for technical pipeline auditing, data lineage, and table profiling. |

### Data Warehouse (DWH) Codebase Layers and Architecture

This ecosystem not only exposes analysis tools for language models, but also natively integrates the codebase of the **Data Warehouse (DWH)** data layers, structured under an auditable and governed medallion architecture:

* **`core/` Layer (Normalized Data):** Contains the code, schemas, and DDL definitions for the company's normalized and auditable tables (Finance, Sales, Logistics, BI) and the common `audit_logs` schema for access control.
* **`marts/` Layer (Query and Export Views):** Defines governed views structured specifically for agile consumption by AI models and direct data exports (`marts_fin_*`, `marts_com_*`, `marts_log_*`), integrating a centralized registry of authorized export contracts to ensure control and security of the processed information.

### Dynamic "Delivery" Contract

A robust data contract was implemented in which the analytical tools consume a common configuration parameter:

```json
{
  "delivery": {
    "mode": "auto",
    "format": "xlsx",
    "max_inline_rows": 500,
    "xlsx_threshold_rows": 1000
  }
}
```

* **`mode: "auto"`**: The server calculates the data volume. If the result is less than the threshold (`max_inline_rows`), plain text is delivered immediately to the model. If it exceeds the threshold, it generates an Excel file in the background with advanced styles and metadata, attaches it as a download, and sends a summarized preview to the model so it doesn't "lose sight" of the content.

---

## Results and Achievements

* **Data Democratization with AI:** Department leaders and analysts can now chat with the AI to get anything from simple daily sales reports to complex inventory reconciliation analyses (comparing ERP vs. WMS) in seconds.
* **Guaranteed Governance:** All information flows are audited under a centralized schema in the audit database (`audit_logs`), ensuring full visibility into which models are consuming what data.
* **Operational Stability:** Thanks to the hard limit of 200,000 rows and internal paging, LLM context saturation and DWH server out-of-memory crashes were completely avoided.
