# AI LoanSys: Intelligent Loan Risk Analysis & Management System

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.x-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.x-F7931E?style=for-the-badge&logo=scikitlearn)](https://scikit-learn.org/)

**AI LoanSys** is a full-stack web application that automates loan risk assessment using a Python-based machine learning pipeline. It combines a secure role-based access control (RBAC) system with a human-in-the-loop AI workflow, enabling instant, data-driven loan decisions that improve over time through admin feedback.

## Project Overview

AI LoanSys streamlines the loan application process by providing instant risk assessments and actionable suggestions, mimicking real-world banking systems with a focus on transparency and continuous improvement. Guests can register, users can apply for loans, and admins can oversee operations, override AI decisions, and retrain the model in real-time. Key differentiators include explainable AI (XAI), anomaly detection, and a live retraining console powered by Socket.IO, making it a robust MLOps-ready platform.

## ✨ Key Features

### 👤 User-Facing Features
- **Secure Authentication**: Supports local registration/login (username/password) and Google OAuth 2.0, powered by Passport.js and bcrypt.js for secure password hashing.
- **Interactive Loan Application**: A user-friendly form (`form.ejs`) with validation and interactive tooltips guides users through entering details like income, loan amount, and credit history.
- **Instant Results**: Upon submission, users receive a clear, styled results page (`result.ejs`) showing approval/rejection status, risk class (Prime, Standard, Sub-prime, High Risk), and the reason behind the AI’s decision.
- **AI Co-Pilot Suggestions**: For rejected applications with good credit, a LinearRegression model suggests a more suitable loan amount to increase approval chances.

### 👑 Admin Features
- **Smart Diagnostic Dashboard**: The admin dashboard (`dashboard.ejs`) displays key metrics (total applications, approval rate) and Chart.js visualizations (e.g., risk distribution). It checks AI model health, prompting initial training or warning about corrupted `.pkl` files.
- **Application History**: Admins can view a paginated, searchable list of all loan applications (`history.ejs`) with filtering options and expand details to override AI decisions.
- **Manual Override**: Admins can correct AI predictions, feeding data back into the retraining loop to improve model accuracy.
- **Full User Management**: A dedicated panel (`admin_users.ejs`) allows admins to view, create, edit roles (user ↔ admin), link/unlink Google accounts, and delete users.
- **Pending User Approval**: New Google sign-ups are stored in a pending queue (`PendingUserModel.js`), requiring admin approval for access, ensuring platform governance.
- **Live AI Retraining Console**: Admins can trigger initial or retraining of the AI model via a real-time console (`retrain_live.ejs`), streaming Python script output using Socket.IO.

### 🤖 AI Pipeline
- **Hybrid Data Source**: Combines a static dataset (`loan_dataset.csv`) with admin-corrected data from MongoDB for retraining (`train_model.py --retrain`).
- **Feature Engineering**: Creates a `Loan-to-Annual-Income-Ratio` feature (loan amount / annual income) to enhance model accuracy.
- **Dual-Model System**: Uses a RandomForestClassifier for risk classification (Prime, Standard, Sub-prime, High Risk) and a LinearRegression model for co-pilot suggestions.
- **Explainable AI (XAI)**: Provides reasons for decisions by analyzing feature importance (e.g., credit history, loan-to-income ratio).
- **Anomaly Detection**: Flags applications with extreme outliers (e.g., unusually high loan amounts) for mandatory manual review.
- **Model Persistence**: Saves models, encoders, and stats as `.pkl` files (`loan_model.pkl`, `suggestion_model.pkl`, `label_encoders.pkl`, `data_stats.pkl`, `model_columns.pkl`) for efficient predictions.
- **AI Retraining Workflow**: Admin overrides are stored in MongoDB’s `loans` collection. During retraining, `train_model.py --retrain` fetches this data, combines it with the base dataset, and updates the models, ensuring continuous improvement.

### 🧠 Under the Hood: The AI Decision Logic
The AI LoanSys model is not a black box. It operates on a clear, hierarchical set of rules and features engineered to mimic real-world financial assessment. Here is a step-by-step breakdown of how a decision is made.

1. **Key Input Metrics**  
   The model makes its primary assessment based on three key financial indicators provided by the user and three hard-coded assumptions for this simplified model:  
   - **Credit Score**: The applicant's credit score.  
   - **Annual Income**: The applicant's gross annual income.  
   - **Loan Amount**: The total amount requested.  
   - **(Assumed) Marital Status**: Married  
   - **(Assumed) Education Level**: Graduate  
   - **(Assumed) Property Area**: Urban  
   *Note*: Marital Status, Education Level, and Property Area are hard-coded as constants (Married, Graduate, Urban) to simplify the model and are not collected via the user form.

2. **Core Feature Engineering: The Loan-to-Annual-Income-Ratio**  
   The single most powerful predictor is not just the loan amount or income alone, but their relationship. The system engineers a new feature:  
   `Loan-to-Annual-Income-Ratio` = LoanAmount / AnnualIncome  
   This ratio is the core of the risk assessment. A low ratio (e.g., `0.5`) indicates a safe loan, while a high ratio (e.g., `3.0`) indicates significant risk.

3. **The Decision-Making Funnel**  
   The AI follows a clear, multi-step process to classify an application:  
   - **Hard Rejection Rules (High Risk)**: An application is immediately classified as High Risk if either of these conditions are met:  
     - The Credit Score is below `600`.  
     - The application was historically rejected (this applies during retraining).  
   - **Ratio-Based Risk Assessment**: If the hard rejection rules are passed, the AI then uses the `Loan-to-Annual-Income-Ratio` to determine the final risk class:  
     - **Prime**: The ratio is very low (`< 0.5`), and the applicant's income is high. These are the safest loans.  
     - **Standard**: The ratio is moderate (`< 2.0`). These are considered good, standard-risk loans.  
     - **Sub-prime**: The ratio is high (`>= 2.0`). Even with a good credit score, a loan this large compared to income is considered risky and is automatically rejected, but becomes eligible for a suggestion.  
     Sub-prime and High Risk classifications result in automatic rejection, with Sub-prime loans eligible for co-pilot suggestions if credit score > `600`.

4. **The AI Co-Pilot Suggestion Logic**  
   The suggestion model is a separate, simpler LinearRegression model that only runs under specific conditions to provide helpful feedback:  
   - **Condition**: The application must be classified as Sub-prime or High Risk AND the applicant's Credit Score must be above `600`.  
   - **Logic**: The model answers the question: "For an applicant with this annual income, what is a historically safe loan amount?"  
   - **Result**: It calculates a new, lower loan amount and presents it to the user, giving them an actionable path toward a potential future approval.  
   This layered approach ensures that decisions are not only fast and data-driven but also transparent and logical, with clear guardrails and helpful feedback loops.

## 🧪 Use Cases and Benefits
AI LoanSys is ideal for:
- **Financial Institutions**: Automates loan risk assessment, reducing manual review time by up to 70% while maintaining accuracy through human oversight.
- **FinTech Startups**: Provides a scalable, secure platform for loan processing with explainable AI, enhancing customer trust.
- **Data-Driven Lending**: The AI co-pilot and anomaly detection ensure fair, informed decisions, minimizing risk and improving approval rates.

**Benefits**:
- **Efficiency**: Instant predictions with minimal latency.
- **Transparency**: XAI explains every decision, building trust.
- **Adaptability**: Human-in-the-loop retraining keeps the model relevant to changing financial trends.
- **Security**: Enterprise-grade authentication and data protection.

## 🛠️ Technology Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| **Backend**    | Node.js, Express.js, EJS                                   |
| **Frontend**   | HTML5, CSS3, Client-Side JavaScript                        |
| **Database**   | MongoDB with Mongoose ODM                                  |
| **AI/ML**      | Python, scikit-learn, Pandas, Joblib                       |
| **Authentication** | Passport.js (Local, Google OAuth 2.0), bcrypt.js, express-session |
| **Real-time**  | Socket.IO                                                  |
| **DevOps**     | Git, GitHub, npm, pip, requirements.txt, package.json      |

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Python](https://www.python.org/downloads/) (v3.9 or later)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) (running locally or via a cloud provider like MongoDB Atlas)
- `pip` (Python package installer)
- Google Cloud Platform account for OAuth 2.0 credentials ([Google Cloud Console](https://console.cloud.google.com/))
- `nodemon` for development (install via `npm install -g nodemon` or as a dev dependency: `npm install -D nodemon`)

### Installation & Setup
1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/ai-loan-app.git
   cd ai-loan-app
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory with the following:
   ```env
   MONGO_URI=mongodb://localhost:27017/Ai_Loan_App
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   SESSION_SECRET=your-long-random-session-secret
   PORT=3000
   ```

3. **Install Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install

   # Set up and activate a Python virtual environment in a 'python/venv' folder
   # On Linux/macOS:
   python3 -m venv python/venv
   source python/venv/bin/activate

   # On Windows Command Prompt:
   python -m venv python/venv
   .\python\venv\Scripts\activate

   # Install Python dependencies into the activated environment
   pip install -r requirements.txt
   ```

### Running the Application
1. **Start the Server**
   The server automatically creates a default admin account if none exists.
   ```bash
   # For production
   npm start

   # For development with auto-restarts
   npm run dev
   ```
   To use `npm run dev`, add the following to `package.json`:
   ```json
   "scripts": {
     "start": "node app.js",
     "dev": "nodemon app.js"
   }
   ```
   Then install `nodemon` as a dev dependency: `npm install -D nodemon`.

2. **Access the Application**
   Navigate to `http://localhost:3000` (or the port specified in `.env`). The default port is 3000.

3. **First-Time Admin Login & AI Training**
   1. After starting the server, navigate to `http://localhost:3000`.
   2. The application will automatically create a default admin account if the database is empty. Log in with the credentials:
      - **Username**: `admin`
      - **Password**: `password`
   3. Upon your first login, the admin dashboard (`dashboard.ejs`) will detect that the AI has not been trained. It will prompt you to **"Train Initial AI Model"**.
   4. Click this button to open the live console (`retrain_live.ejs`) and start the training process. Once it completes, the application is fully operational and ready to accept loan applications.

**Note**: Activate the Python virtual environment (`source python/venv/bin/activate` or `.\python\venv\Scripts\activate`) in each new terminal session before running Python scripts.

## 📂 Project Structure
AI LoanSys follows a Model-View-Controller (MVC) architecture for clean separation of concerns:
```
AI-LoanSys/
├── app.js                     # Main Express server
├── auth/                      # Authentication logic (Passport.js, middleware)
│   ├── aiStatusMiddleware.js  # Checks AI model health
│   ├── authMiddleware.js      # Route protection (ensureAuth, ensureAdmin)
│   └── passport-config.js     # Local and Google OAuth strategies
├── config/                    # Database configuration
│   └── db.js                 # MongoDB connection setup
├── controllers/               # Application logic
│   ├── authController.js      # Handles login, registration, OAuth
│   └── loanController.js      # Manages loan submissions and predictions
├── models/                    # Mongoose schemas
│   ├── LoanModel.js           # Loan application data
│   ├── PendingUserModel.js    # Pending Google sign-ups
│   └── UserModel.js           # User data and roles
├── public/                    # Static assets
│   ├── css/                  # Styles for pages (dashboard.css, form.css, etc.)
│   └── js/main.js            # Client-side JavaScript
├── python/                    # AI pipeline
│   ├── ai_model/             # Scripts, dataset, and model artifacts
│   │   ├── train_model.py    # Trains AI models
│   │   ├── predict.py        # Generates predictions
│   │   ├── loan_dataset.csv  # Base dataset
│   │   └── *.pkl             # Model and encoder artifacts
│   └── venv/                 # Python virtual environment (ignored by Git)
├── routes/                    # Express route definitions
│   ├── adminRoutes.js        # Admin-only routes
│   ├── authRoutes.js         # Authentication routes
│   └── loanRoutes.js         # Loan application routes
├── views/                     # EJS templates
│   ├── dashboard.ejs         # Admin dashboard with metrics
│   ├── form.ejs              # Loan application form
│   ├── admin_users.ejs       # User management panel
│   ├── history.ejs           # Loan application history
│   ├── index.ejs             # Landing page
│   ├── login.ejs             # Login page
│   ├── register.ejs          # Registration page
│   ├── result.ejs            # Loan result page
│   ├── retrain_live.ejs      # Live AI retraining console
│   ├── retrain_result.ejs    # Retraining result page
│   └── partials/             # Reusable header/footer
├── package.json               # Node.js dependencies
└── requirements.txt           # Python dependencies
```

## 🛡️ Security Highlights
- **Password Hashing**: Passwords are hashed using bcrypt.js for robust protection.
- **Session Management**: Secure, server-side sessions with `express-session` and a unique `SESSION_SECRET`.
- **OAuth Security**: Google OAuth 2.0 uses restricted callback URLs for safe authentication.
- **Route Protection**: Middleware (`authMiddleware.js`) ensures only authorized users access protected routes (e.g., `ensureAuth`, `ensureAdmin`).
- **Environment Variables**: Sensitive data (e.g., MongoDB URI, OAuth credentials) is stored in a `.env` file, excluded from version control.
- **Anomaly Detection**: The AI pipeline flags outliers for manual review, preventing unreliable automated decisions.

## 📚 Future Enhancements
- **Email Notifications**: Notify users of application status via email (e.g., using nodemailer).
- **PDF Exports**: Allow admins to download loan reports as PDFs.
- **MLOps Integration**: Add MLFlow or Weights & Biases for advanced model tracking.
- **Unit Tests**: Implement tests for backend and AI components to ensure reliability.
- **Dockerization**: Containerize the app for seamless deployment across environments.

## 🔍 Troubleshooting Tips
- **MongoDB Connection Error**: Ensure MongoDB is running (`mongod`) and `MONGO_URI` is correct in `.env`.
- **Missing `.pkl` Files**: Train the AI model via the admin dashboard’s **"Train Initial AI Model"** button.
- **Python Dependency Issues**: Activate the virtual environment and verify `requirements.txt` installation.
- **Socket.IO Issues**: Check that the server is running and the browser supports WebSockets.