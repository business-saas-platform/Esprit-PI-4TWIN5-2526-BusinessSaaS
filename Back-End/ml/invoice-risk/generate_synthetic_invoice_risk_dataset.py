import csv
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).parent
DATA_PATH = ROOT / "dataset_invoice_risk.csv"


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def main() -> None:
    random.seed(42)

    rows = []
    tenants = [f"tenant-{i:02d}" for i in range(1, 9)]
    start = date(2024, 1, 1)

    for tenant_idx, tenant_id in enumerate(tenants):
        client_count = random.randint(24, 45)
        clients = [f"{tenant_id}-client-{i:03d}" for i in range(1, client_count + 1)]

        # Each client has a base risk profile.
        client_risk = {cid: random.uniform(0.05, 0.55) for cid in clients}

        for day_idx in range(365):
            d = start + timedelta(days=day_idx)

            # Weekends produce fewer invoices.
            weekday_factor = 0.5 if d.weekday() >= 5 else 1.0
            seasonality = 1.2 if d.month in (3, 6, 9, 12) else 1.0
            invoice_count = int(random.randint(1, 5) * weekday_factor * seasonality)

            if invoice_count <= 0:
                continue

            business_late_ratio_30d = clamp(0.12 + 0.02 * (tenant_idx % 4) + random.uniform(-0.05, 0.05), 0.01, 0.8)

            for _ in range(invoice_count):
                cid = random.choice(clients)
                amount = round(random.uniform(120, 14000), 2)
                days_to_due = random.randint(7, 60)
                month = d.month
                weekday = d.weekday()
                is_month_end = 1 if (d + timedelta(days=1)).month != d.month else 0

                hist_count = random.randint(1, 50)
                client_late_ratio_90d = clamp(client_risk[cid] + random.uniform(-0.12, 0.12), 0.0, 1.0)

                # Synthetic latent score for late payment behavior.
                raw_score = (
                    -1.8
                    + 2.9 * client_late_ratio_90d
                    + 0.9 * business_late_ratio_30d
                    + 0.35 * (1 if days_to_due <= 14 else 0)
                    + 0.22 * (1 if amount >= 5000 else 0)
                    + 0.18 * is_month_end
                    + 0.12 * (1 if month in (1, 8, 12) else 0)
                    + random.uniform(-0.4, 0.4)
                )
                prob_late = 1.0 / (1.0 + pow(2.718281828, -raw_score))
                label_late = 1 if random.random() < prob_late else 0

                rows.append(
                    {
                        "tenant_id": tenant_id,
                        "client_id": cid,
                        "invoice_amount": amount,
                        "days_to_due": days_to_due,
                        "client_late_ratio_90d": round(client_late_ratio_90d, 6),
                        "client_invoice_count_90d": hist_count,
                        "business_late_ratio_30d": round(business_late_ratio_30d, 6),
                        "month": month,
                        "weekday": weekday,
                        "is_month_end": is_month_end,
                        "label_late": label_late,
                    }
                )

    with DATA_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "tenant_id",
                "client_id",
                "invoice_amount",
                "days_to_due",
                "client_late_ratio_90d",
                "client_invoice_count_90d",
                "business_late_ratio_30d",
                "month",
                "weekday",
                "is_month_end",
                "label_late",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} rows at {DATA_PATH}")


if __name__ == "__main__":
    main()
