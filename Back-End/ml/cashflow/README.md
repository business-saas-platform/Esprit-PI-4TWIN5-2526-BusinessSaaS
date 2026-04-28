# Cash Flow Forecasting ML (Multi-Tenant)

This folder uses a single, clean ML pipeline based on a richer multi-tenant dataset.

## Pipeline files

- Dataset generator: `generate_synthetic_multitenant_dataset.py`
- Training script: `train_cashflow_model.py`
- Model server: `serve_cashflow_model.py`
- Dataset schema: `DATASET_SCHEMA.md`

Main artifacts:

- `dataset_multitenant.csv`
- `cashflow_model.json`
- `cashflow_model_meta.json`

## 1) Setup environment

```bash
cd Back-End/ml/cashflow
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Generate dataset + train model

```bash
python generate_synthetic_multitenant_dataset.py
python train_cashflow_model.py
```

## 3) Start model server

```bash
uvicorn serve_cashflow_model:app --host 127.0.0.1 --port 8000
```

Health check:

- `GET http://127.0.0.1:8000/health`

Prediction endpoint:

- `POST http://127.0.0.1:8000/predict`

## 4) Backend integration

Set environment variable in backend runtime:

```bash
ML_SERVICE_URL=http://127.0.0.1:8000
```

Then call:

- `GET /api/ai-insights/cash-flow/forecast?horizon=30`

If ML is unreachable, backend safely falls back to baseline forecasting.

## 5) Moving to real data

Replace `dataset_multitenant.csv` with exported tenant-level real history using the schema documented in `DATASET_SCHEMA.md`, then retrain.
