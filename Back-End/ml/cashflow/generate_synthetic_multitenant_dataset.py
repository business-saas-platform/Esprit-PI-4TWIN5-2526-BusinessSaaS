import csv
import math
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import List

ROOT = Path(__file__).parent
OUT_PATH = ROOT / "dataset_multitenant.csv"


@dataclass
class TenantProfile:
    tenant_id: str
    base_inflow: float
    base_outflow: float
    weekly_volatility: float
    seasonal_amp: float
    growth_monthly: float


def month_end(d: date) -> bool:
    return (d + timedelta(days=1)).month != d.month


def quarter_end(d: date) -> bool:
    return month_end(d) and d.month in (3, 6, 9, 12)


def build_profiles(n: int) -> List[TenantProfile]:
    profiles: List[TenantProfile] = []
    for i in range(n):
        base_inflow = random.uniform(300, 2500)
        base_outflow = base_inflow * random.uniform(0.5, 0.95)
        profiles.append(
            TenantProfile(
                tenant_id=f"tenant_{i+1:03d}",
                base_inflow=base_inflow,
                base_outflow=base_outflow,
                weekly_volatility=random.uniform(0.05, 0.25),
                seasonal_amp=random.uniform(0.03, 0.18),
                growth_monthly=random.uniform(-0.01, 0.03),
            )
        )
    return profiles


def generate() -> None:
    random.seed(42)

    tenant_count = 80
    history_days = 730  # 2 years
    start = date.today() - timedelta(days=history_days - 1)

    profiles = build_profiles(tenant_count)

    headers = [
        "tenant_id",
        "date",
        "inflow_paid",
        "outflow_approved",
        "net_cash_flow",
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
    ]

    with OUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

        for p in profiles:
            inflow_history: List[float] = []
            outflow_history: List[float] = []

            for i in range(history_days):
                d = start + timedelta(days=i)
                dow = d.weekday()
                month = d.month

                growth_factor = (1.0 + p.growth_monthly) ** (i / 30.0)
                weekly_factor = 1.0 + 0.08 * math.sin((2 * math.pi * dow) / 7.0)
                seasonal_factor = 1.0 + p.seasonal_amp * math.sin((2 * math.pi * month) / 12.0)

                inflow_noise = random.gauss(0, p.weekly_volatility)
                outflow_noise = random.gauss(0, p.weekly_volatility * 0.9)

                inflow = p.base_inflow * growth_factor * weekly_factor * seasonal_factor * (1.0 + inflow_noise)
                outflow = p.base_outflow * growth_factor * (2.0 - weekly_factor) * (1.0 + outflow_noise)

                # End-of-month effects
                if month_end(d):
                    inflow *= random.uniform(1.05, 1.25)
                    outflow *= random.uniform(1.00, 1.15)

                if quarter_end(d):
                    inflow *= random.uniform(1.04, 1.18)

                inflow = max(0.0, inflow)
                outflow = max(0.0, outflow)

                paid_invoice_count = max(0, int(round(inflow / random.uniform(120, 320))))
                approved_expense_count = max(0, int(round(outflow / random.uniform(80, 260))))

                unpaid_due_7d = max(0.0, inflow * random.uniform(0.05, 0.25))
                unpaid_due_30d = max(unpaid_due_7d, inflow * random.uniform(0.1, 0.5))

                inflow_history.append(inflow)
                outflow_history.append(outflow)

                win = 30
                inflow_window = inflow_history[-win:]
                outflow_window = outflow_history[-win:]
                avg_invoice_amount_30d = (sum(inflow_window) / len(inflow_window)) / max(paid_invoice_count, 1)
                avg_expense_amount_30d = (sum(outflow_window) / len(outflow_window)) / max(approved_expense_count, 1)

                net = inflow - outflow

                writer.writerow(
                    {
                        "tenant_id": p.tenant_id,
                        "date": d.isoformat(),
                        "inflow_paid": round(inflow, 2),
                        "outflow_approved": round(outflow, 2),
                        "net_cash_flow": round(net, 2),
                        "paid_invoice_count": paid_invoice_count,
                        "approved_expense_count": approved_expense_count,
                        "unpaid_due_7d": round(unpaid_due_7d, 2),
                        "unpaid_due_30d": round(unpaid_due_30d, 2),
                        "avg_invoice_amount_30d": round(avg_invoice_amount_30d, 2),
                        "avg_expense_amount_30d": round(avg_expense_amount_30d, 2),
                        "day_of_week": dow,
                        "month": month,
                        "is_month_end": int(month_end(d)),
                        "is_quarter_end": int(quarter_end(d)),
                    }
                )

    print(f"Saved synthetic multi-tenant dataset to {OUT_PATH}")


if __name__ == "__main__":
    generate()
