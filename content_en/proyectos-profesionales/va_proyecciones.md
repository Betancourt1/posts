---
title: "VA Proyecciones: Demand Forecasting Statistical Library"
date: 2026-02-12
draft: false
tags: ["python", "time-series", "forecasting", "statsforecast", "private"]
---

## Context

In the inventory planning and distribution workflows of Vinos América, there was a requirement to accurately automate the demand forecasting of thousands of combinations of `product_id` + `warehouse_id`.

To solve this challenge in a robust and industrialized way, **`VA_Proyecciones`** was designed and implemented, an internal modular Python library specializing in demand classification, statistical modeling, and backtesting of time series.

> [!NOTE]
> **Confidentiality and Intellectual Property Note:**
> Being a predictive analytics library at the core of the company's business, the source code and connection variables are not public (not open-source) in order to protect formulas and the organization's competitive advantages in distribution.

---

## Objective

Develop a highly decoupled analytical tool under the philosophy that **statistical logic lives in the library** and **data orchestration lives outside** (for example, managed through Dagster).

The system automates the entire forecasting cycle of a time series:
1. **Demand Classification:** Automatically detect if a series is regular or intermittent (with a high presence of zeros).
2. **Temporal Backtesting:** Evaluate multiple candidate models competing against each other for each series.
3. **Winner Selection:** Select the best model based on an asymmetric error metric (`AsymmetricLoss`).
4. **Unified Output Schema:** Return a detailed forecast with confidence intervals and analytical metadata ready to persist in Supabase or the analytical DWH.

---

## Technical Design and Modeling

The library is internally structured to maintain modularity and scalability:

```
demand_forecast/
├── modelos/
│   ├── croston.py           # Croston and TSB (Intermittent) models
│   ├── holtwinters.py       # Holt-Winters / ETS (Regular seasonal) models
│   └── arima.py             # autoARIMA (Regular non-seasonal) models
│
├── selectores/
│   ├── metadata.py          # Zero ratios and classification
│   └── selector_de_modelo.py # Backtesting and AsymmetricLoss calculation
│
├── evaluacion/
│   └── backtest.py          # Sliding time windows
│
└── proyeccion/
    └── generar.py           # Main entry point API
```

### Automatic Classification and Model Selection:

* **Intermittent Series (high `zeros_ratio` and `cv_interarrival` > 0.5):** Traditional linear models are discarded, and specialized variants like **Croston** or **TSB** (*Teunter-Syntetos-Babai*) are selected to predict the magnitude and time between demands precisely.
* **Regular Series with Seasonality:** A **Holt-Winters (ETS)** model is trained to capture periodic seasonal patterns.
* **Regular Series without Clear Seasonality:** **autoARIMA** is used to adjust optimal autoregressive parameters.

### High-Level API Consumption

External orchestrators invoke the library in a straightforward way by passing a pandas DataFrame and the desired horizon:

```python
from VA_Proyecciones.proyeccion.generar import pronosticar_serie

resultado = pronosticar_serie(
    serie_id="sku_8824__almacen_gdl1",
    data=df_historico,      # DataFrame with columns ["fecha", "cantidad"]
    horizon=8,              # Months to forecast
    freq="M",               # Monthly frequency
)
```

The returned output is a governed JSON schema that includes the exact step-by-step forecast (`y_hat`), the upper and lower confidence limits (`upper`, `lower`), the validation error metric obtained during the backtest, and diagnostic metadata on the performance of the competing models.

---

## Results and Benefits

* **Model Industrialization:** Provision of a centralized and scalable statistical engine that can be invoked massively by analytical orchestrators or HTTP services (such as FastAPI APIs).
* **Inventory Precision:** Error reduction by using asymmetric models and Croston for low-rotation products reduced stockouts in primary warehouses and optimized safety stock.
* **Full Traceability:** Each projection saved in the analytical database has the exact metadata of the model that won, what error it obtained in validation, and which other models competed, guaranteeing the scientific auditing of forecasts.
