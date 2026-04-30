"""
feature_builder.py
==================
Transforms raw employee input into the EXACT same feature vector
used during training. This must stay in sync with train.py.
"""

import numpy as np
from typing import Any


# Salary mapping — must match LabelEncoder order from training
# LabelEncoder sorts alphabetically: high=0, low=1, medium=2
SALARY_MAP = {"high": 0, "low": 1, "medium": 2}

# Department mapping — alphabetical order from training dataset:
# IT=0, RandD=1, accounting=2, hr=3, management=4,
# marketing=5, product_mng=6, sales=7, support=8, technical=9
DEPARTMENT_MAP = {
    "IT": 0,
    "RandD": 1,
    "accounting": 2,
    "hr": 3,
    "management": 4,
    "marketing": 5,
    "product_mng": 6,
    "sales": 7,
    "support": 8,
    "technical": 9,
}


def build_features(employee: Any) -> np.ndarray:
    """
    Takes an EmployeeInput pydantic model and returns a numpy array
    with the 11 features in the exact order used during training.

    Feature order (must match FEATURE_COLUMNS in train.py):
        0  satisfaction_level
        1  last_evaluation
        2  number_project
        3  average_monthly_hours
        4  time_spend_company
        5  work_accident
        6  promotion_last_5years
        7  department_enc
        8  salary_enc
        9  overworked              (engineered)
        10 loyal_no_promotion      (engineered)
    """

    # Encode categorical fields
    dept_enc   = DEPARTMENT_MAP.get(employee.department, 7)   # default: sales
    salary_enc = SALARY_MAP.get(employee.salary, 1)           # default: low

    # Engineered features — same logic as train.py
    overworked          = int(employee.average_monthly_hours > 215 and employee.number_project > 5)
    loyal_no_promotion  = int(employee.time_spend_company > 4 and employee.promotion_last_5years == 0)

    features = np.array([[
        employee.satisfaction_level,
        employee.last_evaluation,
        employee.number_project,
        employee.average_monthly_hours,
        employee.time_spend_company,
        employee.work_accident,
        employee.promotion_last_5years,
        dept_enc,
        salary_enc,
        overworked,
        loyal_no_promotion,
    ]])

    return features


def risk_level(probability: float) -> str:
    """Convert raw probability to human-readable risk level."""
    if probability >= 0.65:
        return "high"
    elif probability >= 0.35:
        return "medium"
    else:
        return "low"
