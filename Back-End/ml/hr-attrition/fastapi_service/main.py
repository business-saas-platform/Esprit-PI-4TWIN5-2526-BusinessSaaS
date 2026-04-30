"""
main.py — HR Attrition FastAPI Service
=======================================
Endpoints:
    GET  /health          → service status
    POST /predict         → single employee risk prediction
    POST /predict/batch   → multiple employees at once

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from services.predictor import predictor

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="HR Attrition Risk API",
    description="Predicts employee attrition risk using a trained RandomForest model.",
    version="1.0.0",
)

# Allow NestJS backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Input schema — matches training features exactly
# ─────────────────────────────────────────────
class EmployeeInput(BaseModel):
    # Employee identifier (not used in ML, just passed through)
    employee_id:            Optional[str]  = Field(None,  description="Employee UUID from your DB")
    name:                   Optional[str]  = Field(None,  description="Employee name")

    # ML features
    satisfaction_level:     float = Field(..., ge=0.0, le=1.0,  description="0.0 to 1.0")
    last_evaluation:        float = Field(..., ge=0.0, le=1.0,  description="0.0 to 1.0")
    number_project:         int   = Field(..., ge=1,   le=20,   description="Number of projects")
    average_monthly_hours:  int   = Field(..., ge=80,  le=400,  description="Avg hours/month")
    time_spend_company:     int   = Field(..., ge=1,   le=40,   description="Years at company")
    work_accident:          int   = Field(..., ge=0,   le=1,    description="0 or 1")
    promotion_last_5years:  int   = Field(..., ge=0,   le=1,    description="0 or 1")
    department:             str   = Field(..., description="IT|RandD|accounting|hr|management|marketing|product_mng|sales|support|technical")
    salary:                 str   = Field(..., description="low|medium|high")

    class Config:
        json_schema_extra = {
            "example": {
                "employee_id": "uuid-123",
                "name": "Alice Martin",
                "satisfaction_level": 0.38,
                "last_evaluation": 0.53,
                "number_project": 2,
                "average_monthly_hours": 157,
                "time_spend_company": 3,
                "work_accident": 0,
                "promotion_last_5years": 0,
                "department": "sales",
                "salary": "low",
            }
        }


# ─────────────────────────────────────────────
# Output schema
# ─────────────────────────────────────────────
class PredictionResult(BaseModel):
    employee_id:  Optional[str]
    name:         Optional[str]
    risk:         float   # 0.0 → 1.0
    level:        str     # low | medium | high
    will_leave:   bool


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    """Quick check that the service and model are loaded."""
    return {"status": "ok", "model": "hr_attrition_model.pkl"}


@app.post("/predict", response_model=PredictionResult)
def predict(employee: EmployeeInput):
    """
    Predict attrition risk for a single employee.

    Returns probability (0–1), level (low/medium/high), and boolean prediction.
    """
    try:
        result = predictor.predict(employee)
        return PredictionResult(
            employee_id = employee.employee_id,
            name        = employee.name,
            risk        = result["risk"],
            level       = result["level"],
            will_leave  = result["will_leave"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=List[PredictionResult])
def predict_batch(employees: List[EmployeeInput]):
    """
    Predict attrition risk for a list of employees.
    Called by NestJS to score the entire team at once.
    """
    if len(employees) > 500:
        raise HTTPException(status_code=400, detail="Max 500 employees per batch request.")

    results = []
    for emp in employees:
        try:
            result = predictor.predict(emp)
            results.append(PredictionResult(
                employee_id = emp.employee_id,
                name        = emp.name,
                risk        = result["risk"],
                level       = result["level"],
                will_leave  = result["will_leave"],
            ))
        except Exception as e:
            # Don't fail the whole batch — return error entry
            results.append(PredictionResult(
                employee_id = emp.employee_id,
                name        = emp.name,
                risk        = 0.0,
                level       = "unknown",
                will_leave  = False,
            ))

    return results
