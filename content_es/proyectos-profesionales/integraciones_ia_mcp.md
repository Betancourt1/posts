---
title: "Integraciones de IA con Model Context Protocol (MCP)"
date: 2026-05-14
draft: false
tags:
  - mcp
  - artificial-intelligence
  - technology
  - data-warehouse
  - architecture
  - private
short_title: "Integraciones de IA con MCP"
summary: "Herramientas de IA gobernadas que conectan modelos de lenguaje con
  datos empresariales."
technologies: [ "Python", "SQL", "FastAPI", "MCP", "Docker", "PostgreSQL" ]
---

## Contexto

Para potenciar la toma de decisiones y habilitar a asistentes de IA avanzados (como Claude o ChatGPT) con la capacidad de consultar y analizar información en tiempo real, se diseñó e implementó un ecosistema de microservicios basado en **Model Context Protocol (MCP)**. 

Este ecosistema actúa como un puente seguro, gobernado y de alto rendimiento entre los modelos de lenguaje (LLMs) y el **Data Warehouse (DWH) corporativo** en Vinos América.

> [!NOTE]
> **Nota de Confidencialidad y Propiedad Intelectual:**
> Al tratarse de un desarrollo empresarial privado y estratégico, el código fuente, las credenciales, y la base de código/esquemas del **Data Warehouse (DWH)** no están disponibles de forma pública (no son de código abierto / open-source) para resguardar la seguridad de la información y las reglas operativas de la organización.


---

## Objetivo

Establecer un canal de comunicación gobernado que permita a agentes autónomos de IA consultar datos analíticos de forma segura. El sistema debía cumplir con:
1. **Gobernanza y Auditoría:** Registrar cada consulta hecha por los modelos, incluyendo el contexto del usuario y los tokens consumidos.
2. **Modularidad por Dominio:** Servidores MCP desacoplados por área de negocio para limitar los privilegios y simplificar el mantenimiento.
3. **Optimización de Delivery:** Capacidad para alternar de forma automática entre respuestas *inline* (JSON rápido para preguntas puntuales) y generación/descarga de reportes estructurados en formato *attachment* (Excel/XLSX dinámico) cuando el volumen de datos supere ciertos límites (hasta un tope duro de 200,000 filas).

---

## Solución e Integración Técnica

El proyecto se estructuró como un ecosistema multi-servidor orquestado en contenedores Docker y expuesto mediante servidores gRPC y HTTP. Cada servidor encapsula un dominio de negocio específico:

| Servidor MCP | Herramientas Clave (Tools) | Tipo de Salida | Propósito de Negocio |
|---|---|---|---|
| **`finance-mcp`** | `get_trial_balance`, `get_account_movements`, `get_supplier_aging`, `get_cash_position` | JSON / XLSX | Análisis de balanza de comprobación, antigüedad de saldos y flujos de caja. |
| **`commercial-mcp`** | `get_sales_kpis`, `get_customer_360`, `find_discount_anomalies`, `get_price_explanation` | JSON / XLSX | Análisis de KPIs de ventas, detección de anomalías en descuentos y perfiles 360 de clientes. |
| **`logistics-mcp`** | `get_inventory_position`, `compare_erp_wms_stock`, `get_movement_trace`, `get_stockout_risk` | JSON / XLSX | Visibilidad del stock actual, control de inventario en tránsito y prevención de quiebres de stock. |
| **`bi-mcp`** | `run_metric_query`, `search_metric`, `explain_metric_formula` | JSON / Inline | Interfaz de lenguaje natural para consultar el catálogo de métricas gobernadas y fórmulas de la compañía. |
| **`data-engineering-mcp`** | `list_pipeline_runs`, `get_model_lineage`, `get_table_profile`, `run_readonly_sql` | JSON / Inline | Herramientas operativas de lectura para auditoría técnica de pipelines, linaje de datos y perfiles de tablas. |

### Arquitectura y Capas de Código del Data Warehouse (DWH)

Este ecosistema no solo expone herramientas de análisis para los modelos de lenguaje, sino que también integra de manera nativa la base de código de las capas de datos del **Data Warehouse (DWH)**, estructurada bajo una arquitectura medallion (medallón) auditable y gobernada:

* **Capa `core/` (Datos Normalizados):** Contiene el código, esquemas y definiciones DDL para las tablas normalizadas y auditables de la empresa (Finanzas, Ventas, Logística, BI) y el esquema común `audit_logs` para control de accesos.
* **Capa `marts/` (Vistas de Consulta y Exportación):** Define las vistas gobernadas estructuradas específicamente para consumo ágil de los modelos de IA y exportación directa de datos (`marts_fin_*`, `marts_com_*`, `marts_log_*`), integrando un registro centralizado de contratos de exportación autorizados para garantizar el control y seguridad de la información procesada.

### Contrato de "Delivery" Dinámico

Se implementó un contrato de datos robusto en donde las herramientas analíticas consumen un parámetro de configuración común:

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

* **`mode: "auto"`**: El servidor calcula el volumen de datos. Si el resultado es menor al umbral (`max_inline_rows`), se entrega texto plano al modelo de manera inmediata. Si supera el umbral, genera en background un archivo Excel con estilos avanzados, metadatos y lo adjunta como descarga, enviándole al modelo una previsualización resumida del set para que no "pierda la vista" del contenido.

---

## Resultados y Logros

* **Democratización de Datos con IA:** Los líderes de área y analistas ahora pueden chatear con la IA para obtener desde reportes sencillos de ventas diarias hasta análisis complejos de conciliación de inventario (comparando ERP vs WMS) en segundos.
* **Gobernanza Garantizada:** Todo flujo de información está auditado bajo un esquema centralizado en la base de datos de auditoría (`audit_logs`), asegurando visibilidad total sobre qué modelos están consumiendo qué datos.
* **Estabilidad Operativa:** Gracias al límite duro de 200,000 filas y a la paginación interna, se evitó la saturación de contexto de los LLMs y la caída por falta de memoria de los servidores del DWH.
