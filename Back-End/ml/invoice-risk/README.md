# Invoice Late-Payment Risk ML

This model predicts late-payment risk for open invoices.

## Files

- Dataset generator: `generate_synthetic_invoice_risk_dataset.py`
- Training script: `train_invoice_risk_model.py`
- Model server: `serve_invoice_risk_model.py`

Artifacts:

- `dataset_invoice_risk.csv`
- `invoice_risk_model.json`
- `invoice_risk_model_meta.json`

## Setup

```bash
cd Back-End/ml/invoice-risk
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Train

```bash
python generate_synthetic_invoice_risk_dataset.py
python train_invoice_risk_model.py
```

## Run server

```bash
uvicorn serve_invoice_risk_model:app --host 127.0.0.1 --port 8001
```

Health:

- `GET http://127.0.0.1:8001/health`

Predict:

- `POST http://127.0.0.1:8001/predict-risk`
