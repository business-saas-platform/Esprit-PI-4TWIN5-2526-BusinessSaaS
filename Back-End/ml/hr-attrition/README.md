# HR Attrition ML — Phase 1

## What this does
Trains a **RandomForestClassifier** on the Kaggle HR Analytics dataset to predict
whether an employee is at risk of leaving (attrition).

## Setup

### 1. Download the dataset
Go to: https://www.kaggle.com/datasets/liujiaqi/hr-comma-sepcsv  
Download `HR_comma_sep.csv` and place it in:
```
ml/hr-attrition/data/HR_comma_sep.csv
```

### 2. Create a Python virtual environment
```bash
cd Back-End/ml/hr-attrition
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Train the model
```bash
python train.py
```

## Output files (in `models/`)
| File | Description |
|------|-------------|
| `hr_attrition_model.pkl` | Trained RandomForest model |
| `feature_columns.pkl` | Exact feature list (used by FastAPI) |
| `le_department.pkl` | Department label encoder |
| `le_salary.pkl` | Salary label encoder |
| `confusion_matrix.png` | Visual evaluation |
| `feature_importances.png` | Which features matter most |

## Dataset columns used
| Column | Type | Description |
|--------|------|-------------|
| satisfaction_level | float 0–1 | Employee satisfaction score |
| last_evaluation | float 0–1 | Last performance review score |
| number_project | int | Number of projects assigned |
| average_montly_hours | int | Avg hours worked per month |
| time_spend_company | int | Years at company |
| Work_accident | 0/1 | Had a work accident |
| promotion_last_5years | 0/1 | Promoted in last 5 years |
| Department | string | Department name |
| salary | low/medium/high | Salary level |
| left | 0/1 | **TARGET** — did employee leave? |

## Engineered features
| Feature | Logic |
|---------|-------|
| `overworked` | hours > 215 AND projects > 5 |
| `loyal_no_promotion` | years > 4 AND never promoted |
