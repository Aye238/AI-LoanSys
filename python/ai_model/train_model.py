import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import argparse
from pymongo import MongoClient

def get_data_from_db():
    print("Connecting to MongoDB to fetch user-corrected data...")
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client['Ai_Loan_App']
        collection = db['loanmodels']
        data = list(collection.find())
        df = pd.DataFrame(data)
        client.close()
        
        if df.empty: return None
        
        df['Loan_Status'] = df['finalDecision'].apply(lambda x: 1 if x == 'Auto-Approved' else 0)
        df.rename(columns={'annualIncome': 'ApplicantIncome', 'loanAmount': 'LoanAmount'}, inplace=True)
        df['Credit_History'] = df['creditScore'].apply(lambda x: 1.0 if x > 600 else 0.0)
        
        print(f"Fetched and processed {len(df)} records from the database.")
        return df

    except Exception as e:
        print(f"Error fetching from MongoDB: {e}")
        return None

def assign_risk_class(row):
    debt_to_income_ratio = row['LoanAmount'] / (row['ApplicantIncome'] + 1)
    
    if row['Loan_Status'] == 0 or row['Credit_History'] != 1.0:
        return 'High Risk'
    if debt_to_income_ratio > 0.55:
        return 'Sub-prime'
    if debt_to_income_ratio < 0.30 and row['ApplicantIncome'] > 60000:
        return 'Prime'
    return 'Standard'

parser = argparse.ArgumentParser(description='Train AI models.')
parser.add_argument('--retrain', action='store_true', help='Augments CSV data with data from MongoDB.')
args = parser.parse_args()

print("Loading base data from loan_dataset.csv...")
try:
    df_base = pd.read_csv('python/ai_model/loan_dataset.csv')
except FileNotFoundError:
    print("FATAL ERROR: loan_dataset.csv not found. Cannot train.")
    exit()

if args.retrain:
    df_new = get_data_from_db()
    if df_new is not None and not df_new.empty:
        common_columns = ['ApplicantIncome', 'LoanAmount', 'Credit_History', 'Loan_Status']
        df_new_filtered = df_new[common_columns]
        df_final = pd.concat([df_base, df_new_filtered], ignore_index=True)
        print("Successfully combined CSV data with new database records.")
    else:
        df_final = df_base
else:
    print("Training from static loan_dataset.csv only.")
    df_final = df_base

df = df_final.copy()
df['Loan_Status'] = df['Loan_Status'].apply(lambda x: 1 if (x == 'Y' or x == 1) else 0)

if df['ApplicantIncome'].median() < 20000:
    df['ApplicantIncome'] = df['ApplicantIncome'] * 12
if df['LoanAmount'].median() < 1000:
    df['LoanAmount'] = df['LoanAmount'] * 1000

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'loan_model.pkl')
ENCODERS_PATH = os.path.join(BASE_DIR, 'label_encoders.pkl')
COLUMNS_PATH = os.path.join(BASE_DIR, 'model_columns.pkl')
DATA_STATS_PATH = os.path.join(BASE_DIR, 'data_stats.pkl')
SUGGESTION_MODEL_PATH = os.path.join(BASE_DIR, 'suggestion_model.pkl')

for col in ['Gender', 'Married', 'Dependents', 'Self_Employed', 'Credit_History', 'Education', 'Property_Area', 'LoanAmount', 'Loan_Amount_Term']:
    if col in df.columns:
        df[col].fillna(df[col].mode()[0], inplace=True)

df['Loan_to_Income_Ratio'] = df['LoanAmount'] / (df['ApplicantIncome'] + 1)

label_encoders = {}
for column in ['Gender', 'Married', 'Dependents', 'Education', 'Self_Employed', 'Property_Area']:
    if column in df.columns:
        le = LabelEncoder()
        df[column] = le.fit_transform(df[column].astype(str))
        label_encoders[column] = le

df['Risk_Class'] = df.apply(assign_risk_class, axis=1)
le_risk = LabelEncoder()
df['Risk_Class_Encoded'] = le_risk.fit_transform(df['Risk_Class'])
label_encoders['Risk_Class'] = le_risk
print("Data preprocessing and risk class creation complete.")
print("Risk Class Distribution:\n", df['Risk_Class'].value_counts())

features = ['Credit_History', 'LoanAmount', 'ApplicantIncome', 'Married', 'Education', 'Property_Area', 'Loan_to_Income_Ratio']
X_main = df[features]
y_main = df['Risk_Class_Encoded']
main_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
main_model.fit(X_main, y_main)
print("\nMain classification model trained.")

approved_df = df[(df['Loan_Status'] == 1) & (df['Credit_History'] == 1.0)]
if not approved_df.empty:
    X_sugg = approved_df[['ApplicantIncome']]
    y_sugg = approved_df['LoanAmount']
    suggestion_model = LinearRegression()
    suggestion_model.fit(X_sugg, y_sugg)
    joblib.dump(suggestion_model, SUGGESTION_MODEL_PATH)
    print("Suggestion model trained and saved.")
else:
    print("Warning: Not enough approved loans with good credit to train the suggestion model.")

stats = df[['ApplicantIncome', 'LoanAmount']].describe()
data_stats = {
    'ApplicantIncome': {'mean': stats.loc['mean', 'ApplicantIncome'], 'std': stats.loc['std', 'ApplicantIncome']},
    'LoanAmount': {'mean': stats.loc['mean', 'LoanAmount'], 'std': stats.loc['std', 'LoanAmount']}
}
joblib.dump(data_stats, DATA_STATS_PATH)
print("Data statistics saved.")

joblib.dump(main_model, MODEL_PATH)
joblib.dump(label_encoders, ENCODERS_PATH)
joblib.dump(features, COLUMNS_PATH)
print("All models and primary files saved successfully!")