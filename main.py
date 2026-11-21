from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import xgboost as xgb
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ml_model = {}

FRIENDLY_NAMES = {
    "person_age": "Applicant Age",
    "person_income": "Annual Income",
    "person_emp_length": "Employment Stability",
    "loan_amnt": "Requested Loan Amount",
    "loan_int_rate": "Loan Interest Rate",
    "loan_percent_income": "Debt-to-Income Ratio",
    "cb_person_cred_hist_length": "Credit History Length",
    "person_home_ownership": "Home Ownership",
    "loan_intent": "Loan Purpose",
    "loan_grade": "Credit Grade",
    "cb_person_default_on_file": "Prior Default Record"
}

def clean_feature_name(col: str) -> str:
    cleaned = col.replace("num__", "").replace("cat__", "")
    for k, v in FRIENDLY_NAMES.items():
        if cleaned.startswith(k):
            sub = cleaned[len(k):].strip("_")
            return f"{v} ({sub})" if sub else v
    return cleaned.replace("_", " ").title()

@asynccontextmanager
async def lifespan(app: FastAPI):
    calibrated_model = joblib.load("credit_risk_model.pkl")
    ml_model["model"] = calibrated_model
    ml_model["threshold"] = float(joblib.load("best_threshold.pkl"))
    
    # Extract pipeline for native SHAP explanations
    base_pipeline = calibrated_model.calibrated_classifiers_[0].estimator
    ml_model["preprocessor"] = base_pipeline.named_steps["preprocessor"]
    ml_model["classifier"] = base_pipeline.named_steps["classifier"]
    yield
    ml_model.clear()

app = FastAPI(
    title="Credit Risk Assessment with SHAP",
    description="Underwriting intelligence service powered by Calibrated XGBoost and Tree SHAP.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoanApplication(BaseModel):
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int

@app.post("/predict")
def predict(data: LoanApplication):
    # Support both pydantic v1 & v2
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    input_df = pd.DataFrame([payload])

    # Calibrated probability
    probability = float(ml_model["model"].predict_proba(input_df)[:, 1][0])
    threshold = ml_model["threshold"]
    prediction = int(probability >= threshold)

    # Risk Tier categorization
    if probability < 0.15:
        tier = "Prime (Tier A+)"
        rec = "Auto-Approve: Prime low-risk profile with exceptional debt coverage."
    elif probability < 0.35:
        tier = "Near Prime (Tier A)"
        rec = "Approve: Healthy balance of credit history and income stability."
    elif probability < threshold:
        tier = "Moderate Risk (Tier B)"
        rec = "Conditional Approval: Recommend secondary underwriting or asset verification."
    else:
        tier = "High Default Risk (Tier C / Subprime)"
        rec = "Decline Application: Predicted risk profile exceeds institutional tolerance."

    # Compute SHAP feature contributions using native tree explainer
    shap_factors = []
    try:
        preprocessor = ml_model["preprocessor"]
        classifier = ml_model["classifier"]
        transformed = preprocessor.transform(input_df)
        feature_names = preprocessor.get_feature_names_out()
        dmat = xgb.DMatrix(transformed, feature_names=list(feature_names))
        contribs = classifier.get_booster().predict(dmat, pred_contribs=True)[0]

        for name, val in zip(feature_names, contribs[:-1]):
            val_float = float(val)
            if abs(val_float) > 0.01:
                shap_factors.append({
                    "feature": clean_feature_name(name),
                    "impact": round(val_float, 4),
                    "direction": "risk_increase" if val_float > 0 else "risk_decrease"
                })
        shap_factors.sort(key=lambda x: abs(x["impact"]), reverse=True)
    except Exception as e:
        shap_factors = []

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk",
        "risk_tier": tier,
        "recommendation": rec,
        "shap_factors": shap_factors
    }

app.mount("/", StaticFiles(directory="static", html=True), name="static")
