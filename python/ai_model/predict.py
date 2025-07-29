import joblib
import pandas as pd
import sys
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'loan_model.pkl')
ENCODERS_PATH = os.path.join(BASE_DIR, 'label_encoders.pkl')
COLUMNS_PATH = os.path.join(BASE_DIR, 'model_columns.pkl')
DATA_STATS_PATH = os.path.join(BASE_DIR, 'data_stats.pkl')

try:
    model = joblib.load(MODEL_PATH)
    label_encoders = joblib.load(ENCODERS_PATH)
    model_columns = joblib.load(COLUMNS_PATH)
    data_stats = joblib.load(DATA_STATS_PATH)
except FileNotFoundError:
    print(json.dumps({"error": "Model files not found."}))
    sys.exit(1)

try:
    credit_score = float(sys.argv[1])
    annual_income = float(sys.argv[2])
    loan_amount = float(sys.argv[3])

    # --- Anomaly Detection ---
    anomaly_detected = False
    anomaly_reason = ""
    income_stats = data_stats['ApplicantIncome']
    threshold = 3.5
    if annual_income > (income_stats['mean'] + threshold * income_stats['std']):
        anomaly_detected = True
        anomaly_reason = "Applicant Income is exceptionally high."

    # --- Prepare DataFrame for Prediction ---
    loan_to_income_ratio = loan_amount / (annual_income + 1)
    
    input_df = pd.DataFrame({
        'Credit_History': [1.0 if credit_score > 600 else 0.0],
        'LoanAmount': [loan_amount],
        'ApplicantIncome': [annual_income],
        'Married': ['Yes'], 'Education': ['Graduate'], 'Property_Area': ['Urban'],
        'Loan_to_Income_Ratio': [loan_to_income_ratio]
    })
    for column in ['Married', 'Education', 'Property_Area']:
        input_df[column] = label_encoders[column].transform(input_df[column])
    input_df = input_df[model_columns]

    # --- Make Prediction ---
    prediction_encoded = model.predict(input_df)[0]
    risk_class_label = label_encoders['Risk_Class'].inverse_transform([prediction_encoded])[0]

    suggestion = None
    if risk_class_label in ['High Risk', 'Sub-prime'] and credit_score > 600:
        # Rule: Suggest a loan that puts the DTI at a safe 45%
        safe_loan_amount = annual_income * 0.45
        
        # Round to a clean number (nearest $500)
        safe_amount_rounded = max(1000, round(safe_loan_amount / 500) * 500)
        
        # Only show the suggestion if it's meaningfully smaller than what they asked for
        if safe_amount_rounded < loan_amount * 0.95:
            suggestion = { "suggested_amount": int(safe_amount_rounded) }

    # --- XAI Logic ---
    importances = model.feature_importances_
    importance_dict = dict(zip(model_columns, importances))
    most_important_feature = max(importance_dict, key=importance_dict.get).replace('_', ' ')

    result = {
        "riskClass": risk_class_label,
        "explanation": f"The decision was primarily based on the applicant's {most_important_feature}.",
        "suggestion": suggestion,
        "anomaly": { "detected": anomaly_detected, "reason": anomaly_reason }
    }
    print(json.dumps(result))

except Exception as e:
    error_result = {"error": "Prediction failed.", "details": str(e)}
    print(json.dumps(error_result))
    sys.exit(1)