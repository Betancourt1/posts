---
title: "Data Pipeline Orchestration with Dagster"
date: 2026-05-18
draft: false
tags: ["dagster","data-engineering","docker","architecture","private"]
---

## Context

The growth of analytical infrastructure and the need to integrate data from multiple complex transactional sources (such as ERPs on **SAP HANA** and storage and logistics systems on **SQL Server / Intralog**) required a centralized, auditable, and resilient system.

To solve this, the old model of cron tasks and isolated scripts was migrated to a data architecture fully orchestrated with **Dagster** at Vinos América, structured through independent gRPC microservices coordinated by Docker containers.

> [!NOTE]
> **Confidentiality and Intellectual Property Note:**
> This project forms part of the core data infrastructure of the company. Due to confidentiality policies, connection strings, internal network configurations, and data pipeline code are private (not open-source).

---

## Objective

Design a modern orchestration architecture based on the **Software-Defined Assets (SDA)** paradigm that guarantees:
1. **Dependency Isolation:** Avoid library conflicts (for example, Machine Learning models vs. traditional JDBC connectors) by isolating each code repository on its own gRPC server.
2. **Proactive Monitoring:** Real-time detection of ingestion failures or data quality anomalies, with rich and immediate notifications sent to Slack.
3. **Scalability and Maintainability:** Facilitate multiple developers adding workflows without the risk of destabilizing the main scheduler.

---

## Solution Architecture (Multi-gRPC)

The platform is deployed as a stack orchestrated via Docker Compose, consisting of a central metadata database, the web console (Dagster UI), the global scheduler (Dagster Daemon), and a set of **decoupled gRPC servers** that contain the business logic and pipeline definitions:

```
               +--------------------------------------+
               |             Dagster UI               |
               |         (Control Console)            |
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

### Domain gRPC Server Details:

1. **`etl_grpc_server` (Port 4000):** In charge of the `etl_repository`. Manages the bulk of data ingestion, aggregation transformations, and catalog synchronization from primary transactional databases to the DWH.
2. **`ml_grpc_server` (Port 4001):** `ml_repository` repository. Contains environments optimized for scientific Python, in charge of recurrent training of forecasting models and execution of analytical inferences.
3. **`providers_grpc_server` (Port 4002):** `providers_repository` repository. Specifically designed for complex ingestions of flat files and third-party APIs from external providers and distributors.
4. **`misc_grpc_server` (Port 4003):** `misc_repository` repository for general administration, maintenance, and periodic DWH cleaning workflows.
5. **`alerts_grpc_server` (Port 4004):** `alerts_repository` repository. It is the sentinel of the system. Runs control queries on SAP HANA and SQL Server, and instantly notifies via dedicated *Slack Webhooks* depending on severity and domain (e.g. specific channels for technical errors, time series discrepancies, and logistics process alerts).

---

## Results and Benefits Obtained

* **System Stability:** By isolating domains in independent gRPC servers, a syntax or dependency error in a module (for example, when updating a library in ML) never interrupts the execution of the rest of the ETLs nor brings down the web interface.
* **Data Traceability and Lineage:** The implementation of *Software-Defined Assets* allowed the organization to have a clear visual map of how data flows, facilitating the auditing of metrics and the identification of bottlenecks.
* **Self-correction and Early Alerts:** The automation of sensors and Slack alerts reduced incident resolution time in transactional systems, alerting the technical team about source inconsistencies even before end-users opened Power BI dashboards.
