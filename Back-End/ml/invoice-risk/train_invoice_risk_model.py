import csv
import json
import math
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).parent
DATA_PATH = ROOT / "dataset_invoice_risk.csv"
MODEL_PATH = ROOT / "invoice_risk_model.json"
META_PATH = ROOT / "invoice_risk_model_meta.json"

FEATURES = [
    "invoice_amount",
    "days_to_due",
    "client_late_ratio_90d",
    "client_invoice_count_90d",
    "business_late_ratio_30d",
    "month",
    "weekday",
    "is_month_end",
]


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def parse_dataset(path: Path) -> Tuple[List[List[float]], List[int]]:
    X: List[List[float]] = []
    y: List[int] = []

    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            X.append([float(row[k]) for k in FEATURES])
            y.append(int(row["label_late"]))

    return X, y


def zscore_fit(X: List[List[float]]) -> Tuple[List[float], List[float]]:
    cols = len(X[0])
    means: List[float] = []
    stds: List[float] = []

    for j in range(cols):
        col = [r[j] for r in X]
        m = mean(col)
        var = mean([(v - m) ** 2 for v in col])
        s = var ** 0.5
        means.append(m)
        stds.append(s if s > 1e-9 else 1.0)

    return means, stds


def zscore_apply(X: List[List[float]], means: List[float], stds: List[float]) -> List[List[float]]:
    return [[(row[j] - means[j]) / stds[j] for j in range(len(row))] for row in X]


def sigmoid(z: float) -> float:
    if z >= 0:
        ez = pow(2.718281828, -z)
        return 1.0 / (1.0 + ez)
    ez = pow(2.718281828, z)
    return ez / (1.0 + ez)


def train_logistic_regression(
    X: List[List[float]], y: List[int], lr: float = 0.03, epochs: int = 650, l2: float = 1e-4
) -> Tuple[List[float], float]:
    n = len(X)
    d = len(X[0])
    w = [0.0] * d
    b = 0.0

    pos = sum(y)
    neg = max(1, n - pos)
    # Mild class balancing.
    w_pos = n / (2.0 * max(1, pos))
    w_neg = n / (2.0 * neg)

    for _ in range(epochs):
        grad_w = [0.0] * d
        grad_b = 0.0

        for i in range(n):
            z = sum(w[j] * X[i][j] for j in range(d)) + b
            p = sigmoid(z)
            err = p - y[i]
            weight = w_pos if y[i] == 1 else w_neg
            grad_b += weight * err
            for j in range(d):
                grad_w[j] += weight * err * X[i][j]

        grad_b /= n
        for j in range(d):
            grad_w[j] = (grad_w[j] / n) + 2.0 * l2 * w[j]

        b -= lr * grad_b
        for j in range(d):
            w[j] -= lr * grad_w[j]

    return w, b


def predict_proba(X: List[List[float]], w: List[float], b: float) -> List[float]:
    out: List[float] = []
    for row in X:
        z = sum(w[j] * row[j] for j in range(len(row))) + b
        out.append(sigmoid(z))
    return out


def accuracy(y_true: List[int], y_prob: List[float], th: float = 0.5) -> float:
    if not y_true:
        return 0.0
    ok = 0
    for yt, yp in zip(y_true, y_prob):
        pred = 1 if yp >= th else 0
        if pred == yt:
            ok += 1
    return ok / len(y_true)


def logloss(y_true: List[int], y_prob: List[float]) -> float:
    eps = 1e-9
    s = 0.0
    for yt, yp in zip(y_true, y_prob):
        p = min(max(yp, eps), 1 - eps)
        s += -(yt * math.log(p) + (1 - yt) * math.log(1 - p))
    return s / len(y_true)


def main() -> None:
    if not DATA_PATH.exists():
        raise RuntimeError(
            f"Dataset not found: {DATA_PATH}. Run generate_synthetic_invoice_risk_dataset.py first."
        )

    X, y = parse_dataset(DATA_PATH)
    if len(X) < 100:
        raise RuntimeError("Not enough rows to train invoice risk model.")

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    means, stds = zscore_fit(X_train)
    X_train_scaled = zscore_apply(X_train, means, stds)
    X_test_scaled = zscore_apply(X_test, means, stds)

    w, b = train_logistic_regression(X_train_scaled, y_train)
    y_prob = predict_proba(X_test_scaled, w, b)

    model = {
        "model": "logistic_regression_gd",
        "features": FEATURES,
        "weights": w,
        "bias": b,
        "means": means,
        "stds": stds,
        "thresholds": {"high": 0.7, "medium": 0.4},
    }

    MODEL_PATH.write_text(json.dumps(model, indent=2), encoding="utf-8")

    metrics = {
        "accuracy": accuracy(y_test, y_prob),
        "logloss": logloss(y_test, y_prob),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "positive_rate_test": (sum(y_test) / len(y_test)) if y_test else 0,
    }
    META_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved metadata to {META_PATH}")
    print(f"Validation Accuracy: {metrics['accuracy']:.3f}")
    print(f"Validation LogLoss: {metrics['logloss']:.3f}")


if __name__ == "__main__":
    main()
