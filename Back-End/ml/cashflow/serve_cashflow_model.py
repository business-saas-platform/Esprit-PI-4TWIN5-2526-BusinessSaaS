from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).parent
MODEL_PATH = ROOT / "cashflow_model.json"

app = FastAPI(title="Cash Flow Forecast Model", version="1.0.0")
model = json.loads(MODEL_PATH.read_text(encoding="utf-8")) if MODEL_PATH.exists() else None


class NetPoint(BaseModel):
    date: str
    netCashFlow: float
    inflowPaid: float = 0.0
    outflowApproved: float = 0.0
    paidInvoiceCount: float = 0.0
    approvedExpenseCount: float = 0.0
    unpaidDue7d: float = 0.0
    unpaidDue30d: float = 0.0
    avgInvoiceAmount30d: float = 0.0
    avgExpenseAmount30d: float = 0.0
    isMonthEnd: float = 0.0
    isQuarterEnd: float = 0.0


class PredictRequest(BaseModel):
    history: List[NetPoint]
    horizon: int


class PredictPoint(BaseModel):
    date: str
    predictedNet: float


class PredictResponse(BaseModel):
    predictions: List[PredictPoint]


def fallback_forecast(history: List[NetPoint], horizon: int) -> List[PredictPoint]:
    series = [p.netCashFlow for p in history]
    if not series:
        series = [0.0] * 14

    start = datetime.utcnow().date()
    out: List[PredictPoint] = []

    for i in range(horizon):
        window = series[-14:]
        base = float(sum(window) / len(window)) if window else 0.0
        week_ago = series[-7] if len(series) >= 7 else base
        pred = 0.7 * base + 0.3 * week_ago

        d = start + timedelta(days=i + 1)
        out.append(PredictPoint(date=d.isoformat(), predictedNet=round(float(pred), 2)))
        series.append(float(pred))

    return out


@app.get("/health")
def health():
    return {"ok": True, "modelLoaded": model is not None}


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    horizon = 30 if payload.horizon not in (30, 60, 90) else payload.horizon

    if model is None or len(payload.history) < 14:
        return PredictResponse(predictions=fallback_forecast(payload.history, horizon))

    history = sorted(payload.history, key=lambda x: x.date)
    series = [p.netCashFlow for p in history]
    inflow_series = [p.inflowPaid for p in history]
    outflow_series = [p.outflowApproved for p in history]
    paid_count_series = [p.paidInvoiceCount for p in history]
    expense_count_series = [p.approvedExpenseCount for p in history]
    due7_series = [p.unpaidDue7d for p in history]
    due30_series = [p.unpaidDue30d for p in history]
    avg_inv_series = [p.avgInvoiceAmount30d for p in history]
    avg_exp_series = [p.avgExpenseAmount30d for p in history]

    out: List[PredictPoint] = []
    start = datetime.utcnow().date()

    for i in range(horizon):
        lag_1 = series[-1]
        lag_7 = series[-7] if len(series) >= 7 else lag_1
        rolling_mean_7 = float(sum(series[-7:]) / 7) if len(series) >= 7 else float(sum(series) / len(series))
        d = start + timedelta(days=i + 1)

        inflow_paid = inflow_series[-1] if inflow_series else 0.0
        outflow_approved = outflow_series[-1] if outflow_series else 0.0
        paid_invoice_count = paid_count_series[-1] if paid_count_series else 0.0
        approved_expense_count = expense_count_series[-1] if expense_count_series else 0.0
        unpaid_due_7d = due7_series[-1] if due7_series else 0.0
        unpaid_due_30d = due30_series[-1] if due30_series else 0.0
        avg_invoice_amount_30d = avg_inv_series[-1] if avg_inv_series else 0.0
        avg_expense_amount_30d = avg_exp_series[-1] if avg_exp_series else 0.0
        is_month_end = 1.0 if (d + timedelta(days=1)).month != d.month else 0.0
        is_quarter_end = 1.0 if is_month_end and d.month in (3, 6, 9, 12) else 0.0

        raw_features = [
            lag_1,
            lag_7,
            rolling_mean_7,
            inflow_paid,
            outflow_approved,
            paid_invoice_count,
            approved_expense_count,
            unpaid_due_7d,
            unpaid_due_30d,
            avg_invoice_amount_30d,
            avg_expense_amount_30d,
            float(d.weekday()),
            float(d.month),
            is_month_end,
            is_quarter_end,
        ]
        means = model.get("means", [0, 0, 0, 0, 0])
        stds = model.get("stds", [1, 1, 1, 1, 1])
        w = model.get("weights", [0, 0, 0, 0, 0])
        b = float(model.get("bias", 0.0))

        x = [
            (raw_features[j] - float(means[j])) / (float(stds[j]) if float(stds[j]) != 0 else 1.0)
            for j in range(len(raw_features))
        ]
        pred = sum(float(w[j]) * x[j] for j in range(len(x))) + b

        out.append(PredictPoint(date=d.isoformat(), predictedNet=round(pred, 2)))
        series.append(pred)
        inflow_series.append(inflow_paid)
        outflow_series.append(outflow_approved)
        paid_count_series.append(paid_invoice_count)
        expense_count_series.append(approved_expense_count)
        due7_series.append(unpaid_due_7d)
        due30_series.append(unpaid_due_30d)
        avg_inv_series.append(avg_invoice_amount_30d)
        avg_exp_series.append(avg_expense_amount_30d)

    return PredictResponse(predictions=out)
