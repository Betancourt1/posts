---
title: "Vinos América Data API: Database Integration and Custom GPTs"
date: 2024-11-20
draft: false
tags: ["fastapi","python","sap-hana","gpt-integration","private"]
---

## Context

Before the global development of the Model Context Protocol (MCP) ecosystem, there was a need to connect language models (specifically OpenAI's Custom GPTs via Actions) quickly, securely, and directly with the company's transactional system to enable real-time queries.

To solve this need, **Vinos América Data API** was designed and built, a robust REST interface that translates the AI's natural language requests into secure, high-performance SQL queries against the **SAP HANA** enterprise database.

> [!NOTE]
> **Confidentiality and Intellectual Property Note:**
> Being an internal transactional API connected directly to the core SAP ERP, the endpoint code, queries, and credentials are strictly private (not open-source) due to IT security policies.

---

## Objective

Provide a high-performance, easily integrated data interface for autonomous virtual assistants, ensuring:
1. **Rigorous Input Validation:** Avoid query failures or SQL injections by forcing the AI to provide specific structured formats for SKUs and warehouse keys.
2. **Dynamic Report Generation:** Consolidate raw datasets from SAP HANA and structure them via Pandas into formatted spreadsheets (XLSX) ready to download.
3. **Performance and Payload Control:** Avoid bandwidth or memory saturation by interrupting extremely massive requests (size limits and timeouts).

---

## Technical Solution and Integration

The API was developed with **FastAPI** due to its high execution speed and automatic generation of the **OpenAPI Schema** (JSON/YAML) specification, an indispensable requirement to map "Actions" within the OpenAI platform.

### Connectors and Main Endpoints:

* **Direct Connection:** SAP's native **`hdbcli`** Python client was implemented to guarantee direct, low-latency connections with SAP HANA.
* **Data Processing:** The **Pandas** library is in charge of receiving database cursors, mapping data types, and formatting the resulting Excel file before sending.

#### 1. Stock Query (`/existencias` - GET)
Allows the AI to know the physical and available stock of products in specific warehouses:
* **Parameters:** `id_producto` (list of SKUs) and `almacen` (list of warehouses).
* **Validation Schema:** SKUs are validated under strict regular expressions (must be numeric, 4 to 6 digits). Warehouse keys must meet an exact pattern (4 letters followed by 4 numbers).

#### 2. Segmented Sales (`/desplazamientos` - GET)
Allows extracting the historical sales data in a dynamically filtered and segmented date range (by customer, warehouse, document type, etc.):
* **Parameters:** `fechamin` and `fechamax` (YYYY-MM-DD format), and `segmento` (authorized filters).
* **Limit Validation:** Restriction of historical minimum date (not before June 3, 2024) to avoid saturation from massive queries.

### Error Management and Infrastructure:

A specific middleware was implemented to control the service status during AI interactions:
* **Error 413 (Payload Too Large):** If the generated Excel report from the query exceeds **8 MB**, the server cancels the delivery and responds with a friendly message so the AI refines the user's filters, preventing bottlenecks.
* **Error 504 (Gateway Timeout):** Controlled connection interruption if the HANA query exceeds web processing timeout limits.

---

## Results and Impact

* **First Steps in Conversational AI:** Enabled the management and commercial team for the first time to ask complex questions in natural language (e.g., *"What are the stocks of product X in warehouse Y?"*) and get reports immediately without Business Intelligence intervention.
* **Architectural Foundation:** Format validations, timeout control, and XLSX report size limits set the technical precedent and conceptual foundation that later evolved into the company's orchestrated **Model Context Protocol (MCP)** server ecosystem.
