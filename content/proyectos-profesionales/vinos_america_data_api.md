---
title: "Vinos América Data API: Integración de Base de Datos y Custom GPTs"
date: 2024-11-20
draft: false
tags: ["fastapi", "python", "sap-hana", "gpt-integration", "privado"]
---

## Contexto

Antes del desarrollo global del ecosistema de Model Context Protocol (MCP), existía la necesidad de conectar de manera ágil, segura y directa a los modelos de lenguaje (específicamente a los Custom GPTs de OpenAI mediante Actions) con el sistema transaccional de la empresa para habilitar consultas en tiempo real.

Para solucionar esta necesidad, se diseñó y construyó **Vinos América Data API**, una interfaz REST robusta que traduce las peticiones en lenguaje natural de la IA en consultas SQL seguras y de alto rendimiento contra la base de datos empresarial **SAP HANA**.

> [!NOTE]
> **Nota de Confidencialidad y Propiedad Intelectual:**
> Al tratarse de una API transaccional interna conectada directamente al núcleo ERP de SAP, el código de los endpoints, queries y credenciales son de acceso estrictamente privado (no es open-source) por políticas de seguridad informática.

---

## Objetivo

Proveer una interfaz de datos de alto rendimiento y fácil integración para asistentes virtuales autónomos, garantizando:
1. **Validación Rigurosa de Entrada:** Evitar fallos de consulta o inyecciones SQL forzando a la IA a proveer formatos estructurados específicos en SKUs y claves de almacén.
2. **Generación de Reportes Dinámicos:** Consolidar sets de datos crudos procedentes de SAP HANA y estructurarlos mediante Pandas en hojas de cálculo formateadas (XLSX) listas para descargar.
3. **Control de Desempeño y Pesos:** Evitar la saturación de ancho de banda o de memoria interrumpiendo peticiones extremadamente masivas (limites de tamaño y tiempos de espera).

---

## Solución Técnica e Integración

La API fue desarrollada con **FastAPI** debido a su alta velocidad de ejecución y a la generación automática de la especificación **OpenAPI Schema** (JSON/YAML), requisito indispensable para mapear las "Actions" dentro de la plataforma de OpenAI.

### Conectores y Endpoints Principales:

* **Conexión Directa:** Se implementó el cliente nativo de Python **`hdbcli`** de SAP para garantizar conexiones directas de baja latencia con SAP HANA.
* **Procesamiento de Datos:** La librería **Pandas** se encarga de recibir los cursores de base de datos, mapear tipos de datos y formatear el Excel resultante antes del envío.

#### 1. Consulta de Existencias (`/existencias` - GET)
Permite a la IA conocer el stock físico y disponible de productos en almacenes específicos:
* **Parámetros:** `id_producto` (lista de SKUs) y `almacen` (lista de almacenes).
* **Esquema de Validación:** Los SKUs son validados bajo expresiones regulares estrictas (deben ser numéricos de 4 a 6 dígitos). Las claves de almacén deben cumplir con un patrón exacto (4 letras seguidas de 4 números).

#### 2. Ventas Segmentadas (`/desplazamientos` - GET)
Permite extraer el histórico de ventas en un rango de fechas filtrado y segmentado de forma dinámica (por cliente, almacén, tipo de documento, etc.):
* **Parámetros:** `fechamin` y `fechamax` (formato YYYY-MM-DD), y `segmento` (filtros autorizados).
* **Validación de Límites:** Restricción de fecha mínima histórica (no anterior al 3 de junio de 2024) para evitar la saturación por consultas masivas.

### Gestión de Errores e Infraestructura:

Se implementó un middleware específico para controlar el estado del servicio ante la interacción de la IA:
* **Error 413 (Payload Too Large):** Si el reporte Excel generado a partir de la consulta supera los **8 MB**, el servidor cancela la entrega y responde con un mensaje amigable para que la IA refine los filtros del usuario, previniendo cuellos de botella.
* **Error 504 (Gateway Timeout):** Interrupción controlada de la conexión si la consulta en HANA excede los tiempos límite de procesamiento web.

---

## Resultados e Impacto

* **Primeros Pasos en IA Conversacional:** Habilitó por primera vez al equipo directivo y comercial para realizar preguntas complejas en lenguaje natural (ej. *"¿Cuáles son las existencias del producto X en el almacén Y?"*) y obtener reportes de inmediato sin requerir de la intervención del área de Business Intelligence.
* **Base Arquitectónica:** Las validaciones de formato, el control de timeouts y los límites de tamaño en reportes XLSX sentaron el precedente técnico y la base conceptual que posteriormente evolucionó en el ecosistema orquestado de servidores **Model Context Protocol (MCP)** de la empresa.
