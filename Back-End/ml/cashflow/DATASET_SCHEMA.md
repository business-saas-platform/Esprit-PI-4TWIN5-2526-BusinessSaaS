# Cash Flow ML Dataset Schema

One row per tenant per day.

## Required columns

- `tenant_id` (string): tenant/business identifier
- `date` (YYYY-MM-DD): daily grain key
- `inflow_paid` (float): sum of paid invoice inflow for the day
- `outflow_approved` (float): sum of approved expense outflow for the day
- `net_cash_flow` (float): target = inflow_paid - outflow_approved
- `paid_invoice_count` (int): number of paid invoices on that day
- `approved_expense_count` (int): number of approved expenses on that day
- `unpaid_due_7d` (float): unpaid invoice amount due within next 7 days
- `unpaid_due_30d` (float): unpaid invoice amount due within next 30 days
- `avg_invoice_amount_30d` (float): rolling average invoice amount over previous 30 days
- `avg_expense_amount_30d` (float): rolling average expense amount over previous 30 days
- `day_of_week` (int): 0=Monday ... 6=Sunday
- `month` (int): 1..12
- `is_month_end` (0/1)
- `is_quarter_end` (0/1)

## Notes

- Keep one currency per training set or normalize to a base currency.
- Fill missing days with zeros.
- Use strict time-based train/test split.
- Never mix data across tenants during inference features.
