---
title: "Orquestación de Pipelines de Datos con Dagster"
date: 2026-05-18
draft: false
tags: ["dagster","ingeniería-de-datos","docker","arquitectura","privado"]
---

## Contexto

El crecimiento de la infraestructura analítica y la necesidad de integrar datos de múltiples orígenes transaccionales complejos (como ERPs sobre **SAP HANA** y sistemas de almacenamiento y logística en **SQL Server / Intralog**) requerían un sistema centralizado, auditable y resiliente. 

Para resolver esto, se migró el antiguo modelo de tareas cron y scripts aislados a una arquitectura de datos orquestada completamente con **Dagster** en Vinos América, estructurada a través de microservicios gRPC independientes coordinados por contenedores Docker.

> [!NOTE]
> **Nota de Confidencialidad y Propiedad Intelectual:**
> Este proyecto forma parte del núcleo de infraestructura de datos de la empresa. Debido a políticas de confidencialidad, las cadenas de conexión, configuraciones de red internas y el código de los pipelines de datos son privados (no open-source).

---

## Objetivo

Diseñar una arquitectura de orquestación moderna, basada en el paradigma de **Software-Defined Assets (SDA)**, que garantice:
1. **Aislamiento de Dependencias:** Evitar conflictos entre librerías (por ejemplo, modelos de Machine Learning vs. conectores JDBC tradicionales) aislando cada repositorio de código en su propio servidor gRPC.
2. **Monitoreo Proactivo:** Detección en tiempo real de fallos de ingesta o anomalías en la calidad de los datos, con notificaciones ricas e inmediatas enviadas a Slack.
3. **Escalabilidad y Mantenibilidad:** Facilitar que múltiples desarrolladores añadan flujos de trabajo sin riesgo de desestabilizar el planificador principal.

---

## Arquitectura de la Solución (Multi-gRPC)

La plataforma se despliega como un stack orquestado mediante Docker Compose, compuesto por una base de datos central de metadatos, la consola web (Dagster UI), el programador global (Dagster Daemon) y un conjunto de **servidores gRPC desacoplados** que contienen la lógica de negocio y las definiciones de los pipelines:

```
               +--------------------------------------+
               |             Dagster UI               |
               |       (Consola de Control)           |
               +------------------+-------------------+
                                  |
                                  v
+------------------+   +------------------+   +-------------------+
|  Dagster Daemon  |-->|  Metadata DB     |<--| etl_grpc_server   | (Repo: etl_repository)
| (Schedules/Sens) |   |    (Postgres)    |   | ml_grpc_server    | (Repo: ml_repository)
+------------------+   +------------------+   | providers_grpc    | (Repo: providers_repository)
                                              | misc_grpc_server  | (Repo: misc_repository)
                                              | alerts_grpc_server| (Repo: alerts_repository)
                                              +-------------------+
```

### Detalle de los Servidores gRPC de Dominio:

1. **`etl_grpc_server` (Puerto 4000):** Encargado del repositorio `etl_repository`. Gestiona el grueso de la ingesta de datos, transformaciones de agregación y sincronización de catálogos desde las bases transaccionales primarias al DWH.
2. **`ml_grpc_server` (Puerto 4001):** Repositorio `ml_repository`. Contiene entornos optimizados para Python científico, encargándose del entrenamiento recurrente de modelos de previsión y ejecución de inferencias analíticas.
3. **`providers_grpc_server` (Puerto 4002):** Repositorio `providers_repository`. Diseñado específicamente para ingestas complejas de archivos planos y APIs de terceros proveedores y distribuidores externos.
4. **`misc_grpc_server` (Puerto 4003):** Repositorio `misc_repository` para flujos generales de administración, mantenimiento y limpieza periódica del DWH.
5. **`alerts_grpc_server` (Puerto 4004):** Repositorio `alerts_repository`. Es el centinela del sistema. Ejecuta queries de control sobre SAP HANA y SQL Server, y notifica instantáneamente mediante *Slack Webhooks* dedicados según la severidad y el dominio (ej. canales específicos para errores técnicos, discrepancias en series de tiempo y alertas de procesos logísticos).

---

## Resultados y Beneficios Obtenidos

* **Estabilidad del Sistema:** Al aislar los dominios en servidores gRPC independientes, un error de sintaxis o de dependencias en un módulo (por ejemplo, al actualizar una librería en ML) jamás interrumpe la ejecución del resto de los ETLs ni tira la interfaz web.
* **Trazabilidad y Linaje de Datos:** La implementación de *Software-Defined Assets* permitió a la organización contar con un mapa visual claro de cómo fluyen los datos, facilitando la auditoría de métricas y la identificación de cuellos de botella.
* **Autocorrección y Alertas Tempranas:** La automatización de sensores y alertas en Slack redujo el tiempo de resolución de incidencias en los sistemas transaccionales, alertando al equipo técnico sobre inconsistencias de origen incluso antes de que los usuarios finales abrieran los tableros de Power BI.
