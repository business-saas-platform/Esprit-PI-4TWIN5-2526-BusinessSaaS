"""
HR Attrition Risk — Training Script
====================================
Dataset: Kaggle "HR Analytics Employee Attrition"
Target : 'left' column (1 = employee left, 0 = stayed)

Run:
    python train.py

Output:
    models/hr_attrition_model.pkl   ← trained RandomForest
    models/feature_columns.pkl      ← exact feature list used at training
"""

import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.preprocessing import LabelEncoder

# ─────────────────────────────────────────────
# 0. Paths
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "data", "HR_comma_sep.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# 1. Load dataset
# ─────────────────────────────────────────────
print("📂 Loading dataset...")
df = pd.read_csv(DATA_PATH)

print(f"   Shape: {df.shape}")
print(f"   Columns: {list(df.columns)}")
print(f"   Missing values:\n{df.isnull().sum()}\n")

# ─────────────────────────────────────────────
# 2. Clean & rename columns
#    The Kaggle dataset uses these exact names:
#    satisfaction_level, last_evaluation, number_project,
#    average_montly_hours, time_spend_company, Work_accident,
#    left, promotion_last_5years, Department, salary
# ─────────────────────────────────────────────
print("🧹 Cleaning data...")

# Drop duplicates
df = df.drop_duplicates()

# Rename for consistency (lowercase, no spaces)
df = df.rename(columns={
    "average_montly_hours":  "average_monthly_hours",   # fix kaggle typo
    "Work_accident":         "work_accident",
    "sales":                 "department",              # kaggle uses 'sales' for dept
    "Department":            "department",              # some versions use 'Department'
})

print(f"   After dedup shape: {df.shape}")

# ─────────────────────────────────────────────
# 3. Feature Engineering
#    Add two derived features that improve accuracy
# ─────────────────────────────────────────────
print("⚙️  Engineering features...")

# overworked: employee works > 215 hours/month AND has > 5 projects
df["overworked"] = (
    (df["average_monthly_hours"] > 215) & (df["number_project"] > 5)
).astype(int)

# loyal: employee stayed > 4 years AND was never promoted
df["loyal_no_promotion"] = (
    (df["time_spend_company"] > 4) & (df["promotion_last_5years"] == 0)
).astype(int)

# ─────────────────────────────────────────────
# 4. Encode categorical columns
# ─────────────────────────────────────────────
print("🔢 Encoding categorical columns...")

le_dept   = LabelEncoder()
le_salary = LabelEncoder()

df["department_enc"] = le_dept.fit_transform(df["department"])
df["salary_enc"]     = le_salary.fit_transform(df["salary"])   # low=0, medium=1, high=2

# Save encoders so FastAPI can use the same mapping
joblib.dump(le_dept,   os.path.join(MODEL_DIR, "le_department.pkl"))
joblib.dump(le_salary, os.path.join(MODEL_DIR, "le_salary.pkl"))

print(f"   Department classes : {list(le_dept.classes_)}")
print(f"   Salary classes     : {list(le_salary.classes_)}")

# ─────────────────────────────────────────────
# 5. Select features & target
# ─────────────────────────────────────────────
FEATURE_COLUMNS = [
    "satisfaction_level",
    "last_evaluation",
    "number_project",
    "average_monthly_hours",
    "time_spend_company",
    "work_accident",
    "promotion_last_5years",
    "department_enc",
    "salary_enc",
    "overworked",
    "loyal_no_promotion",
]

X = df[FEATURE_COLUMNS]
y = df["left"]

print(f"\n📊 Class distribution (left=1 means employee left):")
print(y.value_counts())
print(f"   Attrition rate: {y.mean()*100:.1f}%\n")

# ─────────────────────────────────────────────
# 6. Train / Test split
# ─────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"   Train size: {len(X_train)} | Test size: {len(X_test)}")

# ─────────────────────────────────────────────
# 7. Train RandomForestClassifier
# ─────────────────────────────────────────────
print("\n🌲 Training RandomForestClassifier...")

model = RandomForestClassifier(
    n_estimators=200,       # 200 trees — good balance of speed vs accuracy
    max_depth=15,           # prevent overfitting
    min_samples_split=5,
    class_weight="balanced",  # handles class imbalance automatically
    random_state=42,
    n_jobs=-1,              # use all CPU cores
)

model.fit(X_train, y_train)
print("   ✅ Training complete!")

# ─────────────────────────────────────────────
# 8. Evaluate
# ─────────────────────────────────────────────
print("\n📈 Evaluation on test set:")

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]  # probability of leaving

accuracy = accuracy_score(y_test, y_pred)
print(f"   Accuracy : {accuracy*100:.2f}%")
print(f"\n   Classification Report:\n{classification_report(y_test, y_pred)}")

# Confusion matrix plot
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(6, 4))
sns.heatmap(
    cm, annot=True, fmt="d", cmap="Blues",
    xticklabels=["Stayed", "Left"],
    yticklabels=["Stayed", "Left"],
)
plt.title(f"Confusion Matrix (Accuracy: {accuracy*100:.1f}%)")
plt.ylabel("Actual")
plt.xlabel("Predicted")
cm_path = os.path.join(MODEL_DIR, "confusion_matrix.png")
plt.savefig(cm_path, bbox_inches="tight")
print(f"\n   Confusion matrix saved → {cm_path}")

# Feature importance plot
importances = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS)
importances = importances.sort_values(ascending=True)

plt.figure(figsize=(8, 5))
importances.plot(kind="barh", color="steelblue")
plt.title("Feature Importances")
plt.xlabel("Importance Score")
plt.tight_layout()
fi_path = os.path.join(MODEL_DIR, "feature_importances.png")
plt.savefig(fi_path, bbox_inches="tight")
print(f"   Feature importances saved → {fi_path}")

# ─────────────────────────────────────────────
# 9. Save model + feature list
# ─────────────────────────────────────────────
model_path    = os.path.join(MODEL_DIR, "hr_attrition_model.pkl")
features_path = os.path.join(MODEL_DIR, "feature_columns.pkl")

joblib.dump(model,           model_path)
joblib.dump(FEATURE_COLUMNS, features_path)

print(f"\n💾 Model saved          → {model_path}")
print(f"💾 Feature list saved   → {features_path}")
print("\n✅ Phase 1 complete! You can now move to Phase 2 (FastAPI).")
