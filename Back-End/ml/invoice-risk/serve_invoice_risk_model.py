import json
from pathlib import Path
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).parent
MODEL_PATH = ROOT / "invoice_risk_model.json"

app = FastAPI(title="Invoice Late Payment Risk Model", version="1.0.0")
model = json.loads(MODEL_PATH.read_text(encoding="utf-8")) if MODEL_PATH.exists() else None


class InvoiceRiskInput(BaseModel):
    invoiceId: str
    invoiceNumber: str
    clientId: str
    clientName: str
    dueDate: str
    status: str
    totalAmount: float
    daysToDue: float
    clientLateRatio90d: float
    clientInvoiceCount90d: float
    businessLateRatio30d: float
    month: float
    weekday: float
    isMonthEnd: float


class RiskPredictRequest(BaseModel):
    invoices: List[InvoiceRiskInput]


class InvoiceRiskPrediction(BaseModel):
    invoiceId: str
    invoiceNumber: str
    clientId: str
    clientName: str
    dueDate: str
    status: str
    totalAmount: float
    riskScore: float
    riskLevel: str


class RiskPredictResponse(BaseModel):
    predictions: List[InvoiceRiskPrediction]


def sigmoid(z: float) -> float:
    if z >= 0:
        ez = pow(2.718281828, -z)
        return 1.0 / (1.0 + ez)
    ez = pow(2.718281828, z)
    return ez / (1.0 + ez)


@app.get("/health")
def health():
    return {"ok": True, "modelLoaded": model is not None}


@app.post("/predict-risk", response_model=RiskPredictResponse)
def predict_risk(payload: RiskPredictRequest):
    if not payload.invoices:
        return RiskPredictResponse(predictions=[])

    preds: List[InvoiceRiskPrediction] = []

    if model is None:
        for inv in payload.invoices:
            # Heuristic-only fallback if model artifact is missing.
            score = 0.3
            if inv.status == "overdue":
                score += 0.5
            if inv.daysToDue < 0:
                score += min(0.25, abs(inv.daysToDue) / 90.0)
            score += 0.2 * inv.clientLateRatio90d
            score = max(0.0, min(1.0, score))
            level = "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"
            preds.append(
                InvoiceRiskPrediction(
                    invoiceId=inv.invoiceId,
                    invoiceNumber=inv.invoiceNumber,
                    clientId=inv.clientId,
                    clientName=inv.clientName,
                    dueDate=inv.dueDate,
                    status=inv.status,
                    totalAmount=inv.totalAmount,
                    riskScore=round(score, 4),
                    riskLevel=level,
                )
            )
        return RiskPredictResponse(predictions=preds)

    means = model.get("means", [])
    stds = model.get("stds", [])
    weights = model.get("weights", [])
    bias = float(model.get("bias", 0.0))
    thresholds = model.get("thresholds", {"high": 0.7, "medium": 0.4})

    for inv in payload.invoices:
        features = [
            float(inv.totalAmount),
            float(inv.daysToDue),
            float(inv.clientLateRatio90d),
            float(inv.clientInvoiceCount90d),
            float(inv.businessLateRatio30d),
            float(inv.month),
            float(inv.weekday),
            float(inv.isMonthEnd),
        ]

        x = [
            (features[j] - float(means[j])) / (float(stds[j]) if float(stds[j]) != 0 else 1.0)
            for j in range(len(features))
        ]
        z = sum(float(weights[j]) * x[j] for j in range(len(x))) + bias
        score = sigmoid(z)

        level = (
            "high"
            if score >= float(thresholds.get("high", 0.7))
            else "medium"
            if score >= float(thresholds.get("medium", 0.4))
            else "low"
        )

        preds.append(
            InvoiceRiskPrediction(
                invoiceId=inv.invoiceId,
                invoiceNumber=inv.invoiceNumber,
                clientId=inv.clientId,
                clientName=inv.clientName,
                dueDate=inv.dueDate,
                status=inv.status,
                totalAmount=float(inv.totalAmount),
                riskScore=round(float(score), 4),
                riskLevel=level,
            )
        )

    preds.sort(key=lambda x: x.riskScore, reverse=True)
    return RiskPredictResponse(predictions=preds)
