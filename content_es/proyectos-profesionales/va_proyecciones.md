---
title: "VA Proyecciones: Librería Estadística de Pronóstico de Demanda"
date: 2026-02-12
draft: false
tags: ["python","series-de-tiempo","pronóstico","statsforecast","privado"]
---

## Contexto

En los flujos de planificación de inventario y distribución de Vinos América, se requería automatizar de manera precisa el pronóstico de demanda de miles de combinaciones de `producto_id` + `almacen_id`. 

Para resolver este desafío de forma robusta e industrializada, se diseñó e implementó **`VA_Proyecciones`**, una librería modular interna en Python especializada en la clasificación de demanda, modelación estadística y backtesting de series de tiempo.

> [!NOTE]
> **Nota de Confidencialidad y Propiedad Intelectual:**
> Al tratarse de una librería de analítica predictiva del núcleo de negocio de la empresa, el código fuente y las variables de conexión no son públicos (no es open-source) con el fin de proteger las fórmulas y ventajas competitivas de distribución de la organización.

---

## Objetivo

Desarrollar una herramienta analítica altamente desacoplada bajo la filosofía de que **la lógica estadística vive en la librería** y **la orquestación de datos vive fuera** (por ejemplo, gestionada mediante Dagster). 

El sistema automatiza todo el ciclo de predicción de una serie de tiempo:
1. **Clasificación de Demanda:** Detectar automáticamente si una serie es regular o intermitente (con alta presencia de ceros).
2. **Backtesting Temporal:** Evaluar múltiples modelos candidatos compitiendo entre sí para cada serie.
3. **Selección del Ganador:** Seleccionar el mejor modelo basado en una métrica de error asimétrica (`LossAsimetrica`).
4. **Esquema de Salida Unificado:** Devolver un pronóstico detallado con intervalos de confianza y metadatos analíticos listo para persistir en Supabase o el DWH analítico.

---

## Diseño Técnico y Modelado

La librería se encuentra estructurada internamente para mantener la modularidad y escalabilidad:

```
demand_forecast/
├── modelos/
│   ├── croston.py           # Modelos de Croston y TSB (Intermitentes)
│   ├── holtwinters.py       # Holt-Winters / ETS (Regulares estacionales)
│   └── arima.py             # autoARIMA (Regulares no estacionales)
│
├── selectores/
│   ├── metadata.py          # Clasificación y ratios de ceros
│   └── selector_de_modelo.py # Backtesting y cálculo de LossAsimetrica
│
├── evaluacion/
│   └── backtest.py          # Ventanas temporales deslizantes
│
└── proyeccion/
    └── generar.py           # API principal de entrada
```

### Clasificación y Selección Automática de Modelos:

* **Series Intermitentes (`zeros_ratio` alto y `cv_interarrival` > 0.5):** Se descartan los modelos lineales tradicionales y se seleccionan variantes especializadas como **Croston** o **TSB** (*Teunter-Syntetos-Babai*) para predecir la magnitud y el tiempo entre demandas de forma precisa.
* **Series Regulares con Estacionalidad:** Se entrena un modelo **Holt-Winters (ETS)** para capturar patrones estacionales periódicos.
* **Series Regulares sin Estacionalidad Clara:** Se utiliza **autoARIMA** para ajustar parámetros autorregresivos óptimos.

### Consumo de la API de Alto Nivel

Los orquestadores externos invocan la librería de forma sencilla pasándole un DataFrame de pandas y el horizonte deseado:

```python
from VA_Proyecciones.proyeccion.generar import pronosticar_serie

resultado = pronosticar_serie(
    serie_id="sku_8824__almacen_gdl1",
    data=df_historico,      # DataFrame con columnas ["fecha", "cantidad"]
    horizon=8,              # Meses a pronosticar
    freq="M",               # Frecuencia mensual
)
```

El output devuelto es un esquema gobernado en JSON que incluye el pronóstico exacto paso a paso (`y_hat`), los límites de confianza superiores e inferiores (`upper`, `lower`), la métrica de error de validación obtenida durante el backtest, y metadatos de diagnóstico sobre el rendimiento de los modelos competidores.

---

## Resultados y Beneficios

* **Industrialización de Modelos:** Habilitación de un motor estadístico centralizado y escalable que puede ser invocado de forma masiva por orquestadores analíticos o servicios HTTP (como APIs de FastAPI).
* **Precisión en Inventarios:** La reducción del error al utilizar modelos asimétricos y Croston para productos de baja rotación redujo el quiebre de stock en almacenes principales y optimizó el stock de seguridad.
* **Trazabilidad Total:** Cada proyección guardada en la base de datos analítica cuenta con el metadato exacto del modelo que ganó, qué error obtuvo en validación y qué otros modelos compitieron, garantizando la auditoría científica de los pronósticos.
