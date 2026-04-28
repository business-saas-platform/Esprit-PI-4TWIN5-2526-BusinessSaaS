import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).parent
DATA_PATH = ROOT / "dataset_multitenant.csv"
MODEL_PATH = ROOT / "cashflow_model.json"
META_PATH = ROOT / "cashflow_model_meta.json"


@dataclass
class Row:
    tenant_id: str
    date: datetime
    inflow_paid: float
    outflow_approved: float
    net_cash_flow: float
    paid_invoice_count: float
    approved_expense_count: float
    unpaid_due_7d: float
    unpaid_due_30d: float
    avg_invoice_amount_30d: float
    avg_expense_amount_30d: float
    day_of_week: float
    month: float
    is_month_end: float
    is_quarter_end: float


def parse_rows(path: Path) -> List[Row]:
    rows: List[Row] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(
                Row(
                    tenant_id=str(r["tenant_id"]),
                    date=datetime.strptime(r["date"], "%Y-%m-%d"),
                    inflow_paid=float(r["inflow_paid"]),
                    outflow_approved=float(r["outflow_approved"]),
                    net_cash_flow=float(r["net_cash_flow"]),
                    paid_invoice_count=float(r["paid_invoice_count"]),
                    approved_expense_count=float(r["approved_expense_count"]),
                    unpaid_due_7d=float(r["unpaid_due_7d"]),
                    unpaid_due_30d=float(r["unpaid_due_30d"]),
                    avg_invoice_amount_30d=float(r["avg_invoice_amount_30d"]),
                    avg_expense_amount_30d=float(r["avg_expense_amount_30d"]),
                    day_of_week=float(r["day_of_week"]),
                    month=float(r["month"]),
                    is_month_end=float(r["is_month_end"]),
                    is_quarter_end=float(r["is_quarter_end"]),
                )
            )
    rows.sort(key=lambda x: (x.tenant_id, x.date))
    return rows


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def build_dataset(rows: List[Row]) -> Tuple[List[List[float]], List[float]]:
    X: List[List[float]] = []
    y: List[float] = []

    by_tenant: Dict[str, List[Row]] = {}
    for r in rows:
        by_tenant.setdefault(r.tenant_id, []).append(r)

    for tenant_rows in by_tenant.values():
        series = [r.net_cash_flow for r in tenant_rows]
        for i in range(7, len(tenant_rows)):
            lag_1 = series[i - 1]
            lag_7 = series[i - 7]
            rolling_mean_7 = mean(series[i - 7 : i])
            r = tenant_rows[i]

            X.append(
                [
                    lag_1,
                    lag_7,
                    rolling_mean_7,
                    r.inflow_paid,
                    r.outflow_approved,
                    r.paid_invoice_count,
                    r.approved_expense_count,
                    r.unpaid_due_7d,
                    r.unpaid_due_30d,
                    r.avg_invoice_amount_30d,
                    r.avg_expense_amount_30d,
                    r.day_of_week,
                    r.month,
                    r.is_month_end,
                    r.is_quarter_end,
                ]
            )
            y.append(series[i])

    return X, y


def zscore_fit(X: List[List[float]]) -> Tuple[List[float], List[float]]:
    cols = len(X[0])
    means: List[float] = []
    stds: List[float] = []

    for j in range(cols):
        col = [row[j] for row in X]
        m = mean(col)
        var = mean([(v - m) ** 2 for v in col])
        s = var ** 0.5
        means.append(m)
        stds.append(s if s > 1e-9 else 1.0)

    return means, stds


def zscore_apply(X: List[List[float]], means: List[float], stds: List[float]) -> List[List[float]]:
    out: List[List[float]] = []
    for row in X:
        out.append([(row[j] - means[j]) / stds[j] for j in range(len(row))])
    return out


def train_linear_regression(
    X: List[List[float]],
    y: List[float],
    lr: float = 0.03,
    epochs: int = 2500,
    l2: float = 1e-4,
) -> Tuple[List[float], float]:
    n = len(X)
    d = len(X[0])
    w = [0.0] * d
    b = 0.0

    for _ in range(epochs):
        grad_w = [0.0] * d
        grad_b = 0.0

        for i in range(n):
            pred = sum(w[j] * X[i][j] for j in range(d)) + b
            err = pred - y[i]
            grad_b += err
            for j in range(d):
                grad_w[j] += err * X[i][j]

        grad_b = (2.0 / n) * grad_b
        for j in range(d):
            grad_w[j] = (2.0 / n) * grad_w[j] + 2.0 * l2 * w[j]

        b -= lr * grad_b
        for j in range(d):
            w[j] -= lr * grad_w[j]

    return w, b


def mae(y_true: List[float], y_pred: List[float]) -> float:
    if not y_true:
        return 0.0
    return sum(abs(a - b) for a, b in zip(y_true, y_pred)) / len(y_true)


def predict(X: List[List[float]], w: List[float], b: float) -> List[float]:
    out: List[float] = []
    for row in X:
        out.append(sum(w[j] * row[j] for j in range(len(row))) + b)
    return out


def main() -> None:
    if not DATA_PATH.exists():
        raise RuntimeError(
            f"Dataset not found: {DATA_PATH}. Run generate_synthetic_multitenant_dataset.py first."
        )

    rows = parse_rows(DATA_PATH)
    X, y = build_dataset(rows)

    if len(X) < 20:
        raise RuntimeError("Not enough rows to train. Add more history in dataset_multitenant.csv")

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    means, stds = zscore_fit(X_train)
    X_train_scaled = zscore_apply(X_train, means, stds)
    X_test_scaled = zscore_apply(X_test, means, stds)

    w, b = train_linear_regression(X_train_scaled, y_train)
    preds = predict(X_test_scaled, w, b)
    score_mae = mae(y_test, preds)

    model = {
        "model": "linear_regression_gd",
        "features": [
            "lag_1",
            "lag_7",
            "rolling_mean_7",
            "inflow_paid",
            "outflow_approved",
            "paid_invoice_count",
            "approved_expense_count",
            "unpaid_due_7d",
            "unpaid_due_30d",
            "avg_invoice_amount_30d",
            "avg_expense_amount_30d",
            "day_of_week",
            "month",
            "is_month_end",
            "is_quarter_end",
        ],
        "weights": w,
        "bias": b,
        "means": means,
        "stds": stds,
    }

    MODEL_PATH.write_text(json.dumps(model, indent=2), encoding="utf-8")
    META_PATH.write_text(
        json.dumps(
            {
                "model": model["model"],
                "features": model["features"],
                "mae": score_mae,
                "train_rows": len(X_train),
                "test_rows": len(X_test),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved metadata to {META_PATH}")
    print(f"Validation MAE: {score_mae:.2f}")


if __name__ == "__main__":
    main()
