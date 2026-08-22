
require("dotenv").config();
const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
const fs=require("fs");
const path=require("path");
const ExcelJS=require("exceljs");
const crypto=require("crypto");
const mongoose=require("mongoose");
const docGenerator = require("./documentation_generator.js");
const quizGenerator = require("./quiz_generator.js");

const app=express();
const PORT=process.env.PORT||5000;
const SECRET=process.env.JWT_SECRET||"aparaitech-advanced-secret";
const PASSWORD=process.env.PORTAL_PASSWORD||"Aparaitech123@";
const STUDENT_DEFAULT_PASSWORD=process.env.STUDENT_DEFAULT_PASSWORD||"Aparaitech123@";
const LEADER_DEFAULT_USERNAME=process.env.LEADER_DEFAULT_USERNAME||"teamleader";
const LEADER_DEFAULT_PASSWORD=process.env.LEADER_DEFAULT_PASSWORD||"Leader123@";
const MONGODB_URI=process.env.MONGODB_URI||"mongodb+srv://rathodkrushna4696_db_user:Aparaitech123%40@cluster0.q84ry3f.mongodb.net/aparaitech_internship?retryWrites=true&w=majority&appName=Cluster0";

const FILE=path.join(__dirname,"data.json");
const UPLOADS=path.join(__dirname,"uploads");
const REPORTS=path.join(__dirname,"reports");
const REPORT_FILE=path.join(REPORTS,"student_work_report.xlsx");
if(!fs.existsSync(UPLOADS))fs.mkdirSync(UPLOADS,{recursive:true});
if(!fs.existsSync(REPORTS))fs.mkdirSync(REPORTS,{recursive:true});

// Mongoose MongoDB Atlas Schema & Model
const portalDataSchema = new mongoose.Schema({
  key: { type: String, default: "main_data", unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const PortalData = mongoose.model("PortalData", portalDataSchema);

let isMongoConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      isMongoConnected = true;
      console.log("🍃 MongoDB Atlas connected successfully!");
      try {
        let record = await PortalData.findOne({ key: "main_data" });
        if (record && record.data) {
          fs.writeFileSync(FILE, JSON.stringify(record.data, null, 2));
          console.log("🍃 Local database (data.json) successfully synced from MongoDB Atlas!");
          
          const db = read();
          initializeAndNormalizeDatabase(db);
          write(db);
          console.log("🍃 Database successfully initialized, normalized, and persisted!");
        } else if (!record) {
          const localDb = read();
          const db = initializeAndNormalizeDatabase(localDb);
          record = await PortalData.create({ key: "main_data", data: db });
          console.log("🌱 MongoDB Atlas initialized with local database data.");
        }
      } catch (err) {
        console.error("MongoDB initial sync notice:", err.message);
      }
    })
    .catch(err => console.error("⚠️ MongoDB Atlas connection notice:", err.message));
}

app.use(cors());
app.use(express.json({limit:"12mb"}));
app.use(express.static(path.join(__dirname, "../frontend")));

function hashPassword(password, salt){
  if(!salt) salt=crypto.randomBytes(16).toString("hex");
  const hash=crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword){
  if(!storedPassword) return false;
  if(storedPassword.includes(":")){
    const [salt, hash]=storedPassword.split(":");
    const verifyHash=crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash===verifyHash;
  }
  return password===storedPassword;
}

const DEFAULT_DOMAINS = [
  "Web Development",
  "Cyber Security",
  "Artificial Intelligence",
  "Cloud Computing",
  "Python with Machine Learning"
];
const DOMAINS = DEFAULT_DOMAINS;

const DEFAULT_PROJECTS = [
  // --- WEB DEVELOPMENT DOMAIN ---
  { id: "cafe-billing", name: "Cafe Billing System", title: "Cafe Billing System", icon: "☕", domain: "Web Development", level: "Intermediate", difficulty: "Intermediate", duration: "4–6 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Complete cafe POS, KOT, table ordering, billing, inventory, payments and reports.", modules: ["Authentication", "Dashboard", "Menu", "POS Billing", "Tables", "KOT", "Payments", "Inventory", "Customers", "Reports"], status: "active", objective: "Automate cafe operations & POS transactions.", outcomes: ["POS architecture", "Real-time orders", "KOT printing"], customChapters: [] },
  { id: "multi-vendor", name: "Multi-Vendor E-Commerce Platform", title: "Multi-Vendor E-Commerce Platform", icon: "🛍️", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Vendors, products, cart, checkout, commissions, returns and payouts.", modules: ["Vendors", "KYC", "Products", "Variants", "Cart", "Checkout", "Orders", "Commission", "Payouts", "Reviews"], status: "active", objective: "Multi-tenant e-commerce platform.", outcomes: ["Vendor management", "Payout engine", "Cart & checkout"], customChapters: [] },
  { id: "food-delivery", name: "Food Delivery & Restaurant Management", title: "Food Delivery & Restaurant Management", icon: "🍔", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, MongoDB, Maps", summary: "Restaurants, ordering, delivery assignment, live tracking and settlements.", modules: ["Restaurants", "Menus", "Cart", "Orders", "Restaurant Panel", "Delivery", "Tracking", "Coupons", "Payments", "Settlements"], status: "active", objective: "End-to-end food ordering platform.", outcomes: ["Geo-tracking", "Order dispatch", "Commission engine"], customChapters: [] },
  { id: "hospital", name: "Hospital & Doctor Appointment System", title: "Hospital & Doctor Appointment System", icon: "🏥", domain: "Web Development", level: "Intermediate", difficulty: "Intermediate", duration: "5–7 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Doctors, patients, schedules, appointments, prescriptions and billing.", modules: ["Patients", "Doctors", "Departments", "Schedules", "Appointments", "Medical Records", "Prescriptions", "Billing", "Notifications", "Reports"], status: "active", objective: "Clinical workflow & patient care booking.", outcomes: ["Doctor scheduling", "EHR records", "Prescription PDF"], customChapters: [] },
  { id: "college", name: "College / Institute Management System", title: "College / Institute Management System", icon: "🎓", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "7–9 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Admissions, attendance, fees, exams, results, library and notices.", modules: ["Admissions", "Students", "Faculty", "Courses", "Attendance", "Timetable", "Fees", "Exams", "Results", "Library"], status: "active", objective: "Higher education ERP platform.", outcomes: ["Course management", "Fee gateways", "Examination engine"], customChapters: [] },
  { id: "job-portal", name: "Job Portal & Recruitment Management", title: "Job Portal & Recruitment Management", icon: "💼", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Jobs, candidates, applications, interviews, feedback and offers.", modules: ["Candidates", "Employers", "Jobs", "Resume", "Applications", "Shortlisting", "Interviews", "Feedback", "Offers", "Analytics"], status: "active", objective: "Recruitment & Applicant Tracking System (ATS).", outcomes: ["Resume parser", "Interview scheduler", "Job matching"], customChapters: [] },
  { id: "real-estate", name: "Real Estate Property Platform", title: "Real Estate Property Platform", icon: "🏠", domain: "Web Development", level: "Intermediate", difficulty: "Intermediate", duration: "5–7 Weeks", stack: "React, Node.js, Express, MongoDB, Maps", summary: "Properties, agents, enquiries, site visits, leads and bookings.", modules: ["Properties", "Agents", "Search", "Maps", "Enquiries", "Visits", "Lead CRM", "Bookings", "Documents", "Reports"], status: "active", objective: "Property listing & agent lead management.", outcomes: ["Map integration", "Lead CRM", "Virtual tours"], customChapters: [] },
  { id: "agriculture", name: "Agriculture & Livestock Marketplace", title: "Agriculture & Livestock Marketplace", icon: "🌾", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "7–9 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Farmers, buyers, crops, livestock, orders, payments and transport.", modules: ["Farmers", "Verification", "Crops", "Livestock", "Marketplace", "Orders", "Payments", "Transport", "Ratings", "Reports"], status: "active", objective: "Direct B2B farm marketplace.", outcomes: ["Crop auctions", "Logistics mapping", "Escrow payments"], customChapters: [] },
  { id: "inventory", name: "Inventory & Business Management", title: "Inventory & Business Management", icon: "📦", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Purchases, sales, stock, suppliers, customers, expenses and reports.", modules: ["Products", "Categories", "Suppliers", "Customers", "Purchases", "Sales", "Stock Ledger", "Expenses", "Payments", "Reports"], status: "active", objective: "Enterprise inventory & warehouse tracking.", outcomes: ["Stock auditing", "Purchase orders", "GST invoicing"], customChapters: [] },
  { id: "employee-task", name: "Live Project & Employee Task Portal", title: "Live Project & Employee Task Portal", icon: "✅", domain: "Web Development", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Projects, employees, tasks, attendance, reports and performance.", modules: ["Employees", "Projects", "Tasks", "Task Updates", "Daily Reports", "Attendance", "Duty Tracking", "Approvals", "Notifications", "Performance"], status: "active", objective: "Agile task management & employee portal.", outcomes: ["Kanban boards", "Timesheet tracking", "Sprint velocity"], customChapters: [] },

  // --- CYBER SECURITY DOMAIN ---
  { id: "cs-phishing-risk", name: "Phishing Awareness & Email Risk Detection System", title: "Phishing Awareness & Email Risk Detection System", icon: "🎣", domain: "Cyber Security", level: "Beginner", difficulty: "Beginner", duration: "4–6 Weeks", stack: "Node.js, Express, MongoDB, Cyber Security, NLP", summary: "Develop a web-based system that analyzes submitted email content for common phishing warning signs, generates an explainable risk score, and improves users' cybersecurity awareness.", description: "Develop a web-based system that analyzes submitted email content for common phishing warning signs, generates an explainable risk score, and improves users' cybersecurity awareness.", modules: ["Email Parsing", "Header Inspection", "Phishing Heuristics", "Risk Engine", "Educational Feedback", "Audit Logs"], status: "active", objective: "Analyze email content for phishing warning signs and generate explainable risk scores.", outcomes: ["Phishing pattern recognition", "Email header analysis", "Security awareness training"], customChapters: [] },
  { id: "cs-password-safety", name: "Password Security & Account Safety System", title: "Password Security & Account Safety System", icon: "🔑", domain: "Cyber Security", level: "Beginner", difficulty: "Beginner", duration: "4–6 Weeks", stack: "React, Node.js, Express, Cryptography", summary: "Develop a security platform that evaluates password strength safely, validates password policies, promotes secure authentication practices, and provides account-security awareness.", description: "Develop a security platform that evaluates password strength safely, validates password policies, promotes secure authentication practices, and provides account-security awareness.", modules: ["Entropy Evaluator", "Pwned API Checker", "Policy Validator", "Security Advisor", "User Safety Dashboard"], status: "active", objective: "Safely evaluate password strength, validate policies, and promote account security.", outcomes: ["Entropy calculation", "Breach database checking", "Authentication security"], customChapters: [] },
  { id: "cs-secure-upload", name: "Secure File Upload & Document Verification System", title: "Secure File Upload & Document Verification System", icon: "📁", domain: "Cyber Security", level: "Beginner", difficulty: "Beginner", duration: "4–6 Weeks", stack: "Node.js, Express, ClamAV, Crypto, MongoDB", summary: "Develop a secure file-management platform that validates uploaded documents, verifies file integrity, controls access, and maintains an audit history.", description: "Develop a secure file-management platform that validates uploaded documents, verifies file integrity, controls access, and maintains an audit history.", modules: ["MIME Type Inspection", "Malware Scanning", "SHA-256 Hashing", "Role Access Control", "Upload Audit Trails"], status: "active", objective: "Validate uploaded documents, verify integrity using cryptographic hashes, and log audit history.", outcomes: ["File signature verification", "Cryptographic hashing", "Malware scanning integration"], customChapters: [] },
  { id: "cs-incident-response", name: "Cyber Security Incident Reporting & Response System", title: "Cyber Security Incident Reporting & Response System", icon: "🚨", domain: "Cyber Security", level: "Intermediate", difficulty: "Intermediate", duration: "5–7 Weeks", stack: "React, Node.js, Express, MongoDB", summary: "Develop a centralized platform where users can report security incidents and authorized security teams can classify, assign, investigate, track, and resolve them.", description: "Develop a centralized platform where users can report security incidents and authorized security teams can classify, assign, investigate, track, and resolve them.", modules: ["Incident Portal", "Severity Categorization", "SOC Assignment", "Investigation Timeline", "Resolution Workflows"], status: "active", objective: "Centralized incident intake, classification, assignment, and resolution tracking.", outcomes: ["Incident management lifecycle", "Threat classification", "SLA response tracking"], customChapters: [] },
  { id: "cs-app-sec-monitor", name: "Web Application Security Monitoring System", title: "Web Application Security Monitoring System", icon: "🛡️", domain: "Cyber Security", level: "Intermediate", difficulty: "Intermediate", duration: "5–7 Weeks", stack: "React, Node.js, Express, MongoDB, Webhooks", summary: "Develop a defensive monitoring platform that analyzes authorized application logs, identifies unusual security-related events, generates alerts, and presents security analytics through a dashboard.", description: "Develop a defensive monitoring platform that analyzes authorized application logs, identifies unusual security-related events, generates alerts, and presents security analytics through a dashboard.", modules: ["Log Ingestion", "WAF Event Parser", "Anomaly Detection", "Real-Time Alerts", "Security Dashboard"], status: "active", objective: "Analyze application logs, detect anomalous security events, and present real-time security dashboards.", outcomes: ["Log parsing & correlation", "SIEM dashboard design", "Real-time threat alerting"], customChapters: [] },
  { id: "cs-rbac-audit", name: "Role-Based Access Control & Audit Management System", title: "Role-Based Access Control & Audit Management System", icon: "🔐", domain: "Cyber Security", level: "Intermediate", difficulty: "Intermediate", duration: "5–7 Weeks", stack: "Node.js, Express, JWT, RBAC, MongoDB", summary: "Develop a centralized access-management platform that controls application features according to user roles and permissions while maintaining detailed audit records of sensitive activities.", description: "Develop a centralized access-management platform that controls application features according to user roles and permissions while maintaining detailed audit records of sensitive activities.", modules: ["Role & Permission Matrix", "JWT Token Claims", "Resource Guard", "Immutable Audit Logger", "Compliance Inspector"], status: "active", objective: "Control feature access using granular roles/permissions and maintain immutable audit trails.", outcomes: ["Granular RBAC design", "JWT claim verification", "Immutable audit logging"], customChapters: [] },
  { id: "cs-soc-alert-triage", name: "SOC Security Event Monitoring & Alert Triage Platform", title: "SOC Security Event Monitoring & Alert Triage Platform", icon: "📊", domain: "Cyber Security", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, WebSockets, MongoDB", summary: "Develop a Security Operations Center platform that processes authorized or simulated security events, applies detection rules, prioritizes alerts, and supports analyst investigation and incident management.", description: "Develop a Security Operations Center platform that processes authorized or simulated security events, applies detection rules, prioritizes alerts, and supports analyst investigation and incident management.", modules: ["Event Stream Processing", "Rule Engine", "Alert Triage Queue", "Analyst Workbench", "Incident Case Builder"], status: "active", objective: "Process security event telemetry, execute rule engines, prioritize alerts, and manage SOC workflows.", outcomes: ["SIEM/SOC architecture", "Alert correlation rules", "Analyst workflow optimization"], customChapters: [] },
  { id: "cs-ai-log-analysis", name: "AI-Assisted Cyber Security Log Analysis System", title: "AI-Assisted Cyber Security Log Analysis System", icon: "🤖", domain: "Cyber Security", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, TensorFlow/ML, MongoDB", summary: "Develop an AI-assisted defensive security platform that analyzes authorized security logs, identifies unusual patterns, summarizes alerts, calculates explainable risk scores, and assists analysts with incident investigation.", description: "Develop an AI-assisted defensive security platform that analyzes authorized security logs, identifies unusual patterns, summarizes alerts, calculates explainable risk scores, and assists analysts with incident investigation.", modules: ["Security Log Collector", "ML Anomaly Detector", "Risk Scoring Engine", "AI Summary Generator", "Analyst Copilot"], status: "active", objective: "AI-driven log analysis, anomaly detection, explainable risk scoring, and threat summarization.", outcomes: ["Machine learning anomaly detection", "Explainable AI risk scoring", "Automated threat intelligence"], customChapters: [] },
  { id: "cs-zerotrust-compliance", name: "Zero-Trust Access & Device Compliance Management System", title: "Zero-Trust Access & Device Compliance Management System", icon: "🛡️", domain: "Cyber Security", level: "Advanced", difficulty: "Advanced", duration: "6–8 Weeks", stack: "React, Node.js, Express, Certificate Auth, MongoDB", summary: "Develop a zero-trust security platform that evaluates identity, roles, session context, and device-compliance signals before granting access to protected organizational resources.", description: "Develop a zero-trust security platform that evaluates identity, roles, session context, and device-compliance signals before granting access to protected organizational resources.", modules: ["Identity Evaluator", "Device Telemetry Inspector", "Contextual Policy Engine", "Adaptive Auth Gateway", "Access Audit Log"], status: "active", objective: "Evaluate identity, session context, and device compliance signals continuously before granting access.", outcomes: ["Zero-trust architecture", "Device posture verification", "Adaptive authentication"], customChapters: [] },
  { id: "cs-threat-intel-command", name: "Enterprise Cyber Security Incident Command & Threat Intelligence Platform", title: "Enterprise Cyber Security Incident Command & Threat Intelligence Platform", icon: "⚔️", domain: "Cyber Security", level: "Advanced", difficulty: "Advanced", duration: "7–9 Weeks", stack: "React, Node.js, Express, STIX/TAXII, MongoDB", summary: "Develop an enterprise security platform that integrates authorized security events, threat-intelligence records, assets, alerts, incidents, investigation workflows, response activities, and management reporting.", description: "Develop an enterprise security platform that integrates authorized security events, threat-intelligence records, assets, alerts, incidents, investigation workflows, response activities, and management reporting.", modules: ["Threat Intel Feeds", "Asset Inventory", "Incident Command Center", "Playbook Execution Engine", "Executive Threat Metrics"], status: "active", objective: "Integrate threat intelligence feeds, asset inventories, automated playbooks, and incident command metrics.", outcomes: ["Threat intelligence feeds (STIX/TAXII)", "Automated SOAR playbooks", "Executive security reporting"], customChapters: [] },
  {
    id: "py-ml-student-perf",
    name: "Student Performance Prediction System",
    title: "Student Performance Prediction System",
    icon: "📈",
    domain: "Python with Machine Learning",
    level: "Easy",
    difficulty: "Easy",
    duration: "4-6 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn, Matplotlib",
    summary: "Predict a student's final marks or academic performance using attendance, previous study metrics, and grades.",
    modules: ["Data Ingestion", "Feature Engineering", "Model Training", "Predictive Dashboard", "Reports"],
    status: "active",
    objective: "Build an academic forecasting model to identify students at risk early.",
    outcomes: ["Regression pipeline", "Feature significance analysis", "Visual analytics dashboard"],
    customChapters: [],
    realWorldApp: "Academic progress monitoring & early student intervention systems.",
    mlConcepts: "Linear Regression / Random Forest",
    description: "Predict a student's final marks or academic performance using attendance, previous marks, study hours, assignments, and other factors."
  },
  {
    id: "py-ml-house-price",
    name: "House Price Prediction System",
    title: "House Price Prediction System",
    icon: "🏠",
    domain: "Python with Machine Learning",
    level: "Easy",
    difficulty: "Easy",
    duration: "4-6 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn",
    summary: "Predict house/property prices based on location, area, bedrooms, bathrooms, and other features.",
    modules: ["Data Cleaning", "Geocoding", "Feature Extraction", "Regression Model", "Evaluation Metrics"],
    status: "active",
    objective: "Predict housing market valuations using spatial and structural attributes.",
    outcomes: ["Scikit-learn pipeline", "Overfitting prevention", "Model serialization"],
    customChapters: [],
    realWorldApp: "Real estate evaluation, property pricing search engines, and mortgage assessment.",
    mlConcepts: "Linear Regression / Random Forest Regression",
    description: "Predict house/property prices based on location, area, number of bedrooms, bathrooms, age of property, and other features."
  },
  {
    id: "py-ml-customer-churn",
    name: "Customer Churn Prediction",
    title: "Customer Churn Prediction",
    icon: "🔄",
    domain: "Python with Machine Learning",
    level: "Intermediate",
    difficulty: "Intermediate",
    duration: "5-7 Weeks",
    stack: "Python, Pandas, Scikit-learn, Matplotlib, Seaborn",
    summary: "Predict whether a customer is likely to leave a company based on usage, subscriptions, and payment history.",
    modules: ["Usage Aggregator", "Churn Analytics Dashboard", "Risk Scoring", "Retention Action Engine"],
    status: "active",
    objective: "Classify subscriber profiles into high, medium, and low churn risks.",
    outcomes: ["Imbalanced data handling (SMOTE)", "ROC-AUC optimization", "Feature importance charts"],
    customChapters: [],
    realWorldApp: "SaaS retention optimization, subscriber engagement analytics, and churn prevention campaigns.",
    mlConcepts: "Logistic Regression / Decision Tree / Random Forest",
    description: "Predict whether a customer is likely to leave a company based on usage, subscription, payment history, complaints, and customer activity."
  },
  {
    id: "py-ml-spam-detection",
    name: "Spam Email/SMS Detection",
    title: "Spam Email/SMS Detection",
    icon: "🚫",
    domain: "Python with Machine Learning",
    level: "Intermediate",
    difficulty: "Intermediate",
    duration: "5-7 Weeks",
    stack: "Python, Pandas, Scikit-learn, NLTK",
    summary: "Classify messages as spam or legitimate using Natural Language Processing.",
    modules: ["Text Tokenizer", "Feature Vectorizer", "Naive Bayes Classifier", "Gateway Guard API"],
    status: "active",
    objective: "Filter spam communication streams using text classification.",
    outcomes: ["TF-IDF vector space model", "NLP text preprocessing pipelines", "Precision/Recall optimization"],
    customChapters: [],
    realWorldApp: "Email client filtering, SMS gateway spam blocking, and communications safety guards.",
    mlConcepts: "NLP, TF-IDF, Naive Bayes",
    description: "Classify messages as spam or legitimate using Natural Language Processing."
  },
  {
    id: "py-ml-loan-approval",
    name: "Loan Approval Prediction System",
    title: "Loan Approval Prediction System",
    icon: "💵",
    domain: "Python with Machine Learning",
    level: "Intermediate",
    difficulty: "Intermediate",
    duration: "5-7 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn",
    summary: "Predict whether a loan application should be approved based on income, credit history, and employment factors.",
    modules: ["Applicant Portal", "Credit Score Ingest", "Decision Engine", "Compliance & Audit Log"],
    status: "active",
    objective: "Evaluate default risk of loan applicants automatically.",
    outcomes: ["Classification pipeline", "Fairness checking algorithms", "Model audit reporting"],
    customChapters: [],
    realWorldApp: "Automated retail lending decisions, credit scoring verification, and risk profiling dashboards.",
    mlConcepts: "Logistic Regression / Random Forest / Decision Tree",
    description: "Predict whether a loan application should be approved based on income, credit history, employment, loan amount, education, and other applicant information."
  },
  {
    id: "py-ml-fake-news",
    name: "Fake News Detection System",
    title: "Fake News Detection System",
    icon: "📰",
    domain: "Python with Machine Learning",
    level: "Intermediate",
    difficulty: "Intermediate",
    duration: "5-7 Weeks",
    stack: "Python, Pandas, Scikit-learn, NLTK",
    summary: "Analyze news articles and predict whether the news is potentially fake or genuine using NLP.",
    modules: ["Text Ingestion", "Sentiment Analyzer", "Stance Detection Model", "Verification Console"],
    status: "active",
    objective: "Analyze and label textual integrity of online media files.",
    outcomes: ["Text representation models", "Media verification pipeline", "Topic model metrics"],
    customChapters: [],
    realWorldApp: "Social media content moderation, fact-checking assistants, and automated news feed evaluation.",
    mlConcepts: "NLP, TF-IDF, Logistic Regression / Naive Bayes",
    description: "Analyze news articles and predict whether the news is potentially fake or genuine using NLP and machine learning."
  },
  {
    id: "py-ml-product-recommendation",
    name: "E-Commerce Product Recommendation System",
    title: "E-Commerce Product Recommendation System",
    icon: "🛒",
    domain: "Python with Machine Learning",
    level: "Advanced",
    difficulty: "Advanced",
    duration: "6-8 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn, Flask/FastAPI",
    summary: "Recommend products to users based on purchase history, ratings, and similar user behavior.",
    modules: ["User Profiles Ingestion", "Ratings Matrix Builder", "Recommendation Engine API", "Storefront Widget Sync"],
    status: "active",
    objective: "Construct product matching graphs based on user-item matrix similarities.",
    outcomes: ["Matrix Factorization (SVD)", "Cosine similarity algorithms", "API service containerization"],
    customChapters: [],
    realWorldApp: "Personalized shopping storefronts, related-item carousels, and catalog discovery.",
    mlConcepts: "Collaborative Filtering / Content-Based Filtering",
    description: "Recommend products to users based on their previous purchases, browsing history, ratings, and similar user behavior."
  },
  {
    id: "py-ml-disease-risk",
    name: "Disease Risk Prediction System",
    title: "Disease Risk Prediction System",
    icon: "🩺",
    domain: "Python with Machine Learning",
    level: "Advanced",
    difficulty: "Advanced",
    duration: "6-8 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn, Flask/FastAPI",
    summary: "Predict the risk of a particular disease based on user-provided medical parameters (Prediction/Decision-support only).",
    modules: ["Biometric Inputs Portal", "Medical Parameter Normalizer", "Risk Assessment Engine", "Disclaimer & Audit Log"],
    status: "active",
    objective: "Calculate general health risk categories using physiological sensor data.",
    outcomes: ["Strict disclaimer architecture", "Precision-focused classification", "Model explaining layers (SHAP)"],
    customChapters: [],
    realWorldApp: "Clinical decision support, preventive wellness dashboards, and risk stratification metrics. (Presented only as prediction/decision-support; does not claim professional medical diagnosis.)",
    mlConcepts: "Classification, Random Forest, Logistic Regression",
    description: "Predict the risk of a particular disease based on user-provided medical parameters. Presented only as a prediction/decision-support system and must not claim to provide professional medical diagnosis."
  },
  {
    id: "py-ml-fraud-detection",
    name: "Credit Card Fraud Detection System",
    title: "Credit Card Fraud Detection System",
    icon: "💳",
    domain: "Python with Machine Learning",
    level: "Advanced",
    difficulty: "Advanced",
    duration: "6-8 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn",
    summary: "Detect potentially fraudulent transactions by analyzing transaction amount, time, and behaviors.",
    modules: ["Transaction Stream Ingestion", "Anomaly Risk Detector", "Triage Dashboard", "Blocked Cards Log"],
    status: "active",
    objective: "Detect fraudulent events in heavily imbalanced transaction records.",
    outcomes: ["Unsupervised anomaly models", "SMOTE oversampling pipeline", "F1-Score optimization"],
    customChapters: [],
    realWorldApp: "Real-time payment fraud prevention, risk assessment filters, and authorization blocking.",
    mlConcepts: "Classification, Random Forest, Isolation Forest, Anomaly Detection",
    description: "Detect potentially fraudulent transactions by analyzing transaction amount, time, location, transaction behavior, and other features."
  },
  {
    id: "py-ml-traffic-accident",
    name: "Traffic Accident Risk Prediction System",
    title: "Traffic Accident Risk Prediction System",
    icon: "🚗",
    domain: "Python with Machine Learning",
    level: "Advanced",
    difficulty: "Advanced",
    duration: "6-8 Weeks",
    stack: "Python, Pandas, NumPy, Scikit-learn, Matplotlib",
    summary: "Predict accident-risk levels based on traffic density, weather, road conditions, time, and location.",
    modules: ["GIS Spatial Loader", "Weather Ingest API", "Risk Scoring Engine", "Route Analysis Map"],
    status: "active",
    objective: "Stratify traffic accident probability along roadway segments.",
    outcomes: ["Spatial-temporal feature engineering", "Gradient Boosting pipeline", "Risk maps visualization"],
    customChapters: [],
    realWorldApp: "Municipal route safety planning, GPS risk-aware navigation, and emergency resource allocation.",
    mlConcepts: "Classification / Random Forest / Gradient Boosting",
    description: "Predict accident-risk levels based on traffic density, weather, road conditions, time, location, and historical accident data."
  }
];

const DEFAULT_CHAPTER_TITLES = [
  "Overview", "Problem & Solution", "Requirements", "Workflow", "Modules",
  "Architecture", "Database", "APIs", "Security", "UI/UX",
  "Code Examples", "Testing", "Deployment", "Assignment", "Quiz", "References"
];

function getDetailedTheoryForChapter(title, proj) {
  return docGenerator.getDetailedTheoryForChapter(title, proj);
}

function generateDefaultChapters(proj) {
  return DEFAULT_CHAPTER_TITLES.map((title, index) => {
    const chapNum = index + 1;
    const theory = getDetailedTheoryForChapter(title, proj);

    return {
      id: `chap_${proj.id}_${chapNum}`,
      chapterNumber: chapNum,
      title: title,
      shortDescription: `Comprehensive ${title} documentation and architectural guide for ${proj.name}.`,
      mainHeading: `${chapNum}. ${title} - ${proj.name}`,
      introduction: theory.introduction,
      importantSubtopics: theory.subtopics,
      projectObjective: proj.objective || `Automate ${proj.name} core operations, business workflows, and reporting.`,
      learningOutcomes: Array.isArray(proj.outcomes) && proj.outcomes.length ? proj.outcomes : [
        `Production-grade ${title} architecture`,
        "RESTful API integration & error handling",
        "Database mapping & asynchronous state validation"
      ],
      readingTime: "15 min",
      codingTime: "2 hours",
      difficulty: proj.difficulty || proj.level || "Intermediate",
      status: "published",
      isEnabled: true,
      order: chapNum,
      sections: theory.sections,
      codeExamples: [
        {
          title: "Backend Controller Endpoint Example",
          language: "javascript",
          code: `// ${proj.name} - ${title} Controller\nconst handleRequest = async (req, res) => {\n  try {\n    const data = await service.process(req.body);\n    res.json({ success: true, data });\n  } catch (error) {\n    res.status(500).json({ error: error.message });\n  }\n};`,
          explanation: "Standard async error-handled Express controller pattern.",
          order: 1
        }
      ],
      updatedAt: new Date().toISOString()
    };
  });
}

function getDefaultDocumentationForProject(proj) {
  return {
    id: `doc_${proj.id}`,
    projectId: proj.id,
    projectTitle: proj.name,
    projectDescription: proj.summary,
    mode: "Documentation Preview",
    progressEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chapters: generateDefaultChapters(proj)
  };
}

function read(){
  try{
    const db = JSON.parse(fs.readFileSync(FILE,"utf8"));
    db.users = Array.isArray(db.users) ? db.users : [];
    db.leaders = Array.isArray(db.leaders) ? db.leaders : [];
    db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
    db.notes = Array.isArray(db.notes) ? db.notes : [];
    db.projects = Array.isArray(db.projects) ? db.projects : [];
    db.documentation = Array.isArray(db.documentation) ? db.documentation : [];
    db.domains = Array.isArray(db.domains) ? db.domains : [];
    db.quizzes = Array.isArray(db.quizzes) ? db.quizzes : [];
    db.questions = Array.isArray(db.questions) ? db.questions : [];
    db.quizResults = Array.isArray(db.quizResults) ? db.quizResults : [];
    return db;
  }
  catch{
    const defaultDoc = DEFAULT_PROJECTS.map(p => getDefaultDocumentationForProject(p));
    return {
      users:[],
      leaders:[],
      auditLogs:[],
      notes:[],
      projects: DEFAULT_PROJECTS,
      domains: DEFAULT_DOMAINS,
      documentation: defaultDoc,
      quizzes: [],
      questions: [],
      quizResults: []
    };
  }
}

function initializeAndNormalizeDatabase(db) {
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];
  db.documentation = Array.isArray(db.documentation) ? db.documentation : [];
  db.domains = Array.isArray(db.domains) && db.domains.length ? db.domains : [...DEFAULT_DOMAINS];

  db.domains = db.domains.map(d => d === "Artificial Intelligence (AI/ML)" ? "Artificial Intelligence" : d);
  db.domains = [...new Set(db.domains)];

  if (Array.isArray(db.users)) {
    db.users.forEach(u => {
      if (u.domain === "Artificial Intelligence (AI/ML)") {
        u.domain = "Artificial Intelligence";
      }
    });
  }

  if (Array.isArray(db.projects)) {
    db.projects.forEach(p => {
      if (p.domain === "Artificial Intelligence (AI/ML)") {
        p.domain = "Artificial Intelligence";
      }
    });
  }

  DEFAULT_DOMAINS.forEach(d => {
    if (!db.domains.includes(d)) db.domains.push(d);
  });

  DEFAULT_PROJECTS.forEach(defP => {
    let existing = db.projects.find(p => p.id === defP.id);
    if (!existing) {
      db.projects.push({ ...defP });
    } else {
      if (defP.domain) {
        existing.domain = defP.domain;
      }
      if (defP.level) {
        existing.level = defP.level;
        existing.difficulty = defP.level;
      }
    }
  });

  const categoryCounts = {};
  db.projects.forEach(p => {
    p.domain = p.domain || "Web Development";
    const cat = p.domain;
    if (categoryCounts[cat] === undefined) {
      categoryCounts[cat] = 0;
    }
    const index = categoryCounts[cat];
    categoryCounts[cat]++;

    let diff = "Intermediate";
    if (index < 3) {
      diff = "Easy";
    } else if (index < 6) {
      diff = "Intermediate";
    } else {
      diff = "Advanced";
    }
    p.difficulty = diff;
    p.level = diff;

    let doc = db.documentation.find(d => d.projectId === p.id);
    if (!doc) {
      doc = getDefaultDocumentationForProject(p);
      db.documentation.push(doc);
    } else {
      const defaults = getDefaultDocumentationForProject(p);
      doc.projectTitle = defaults.projectTitle;
      doc.projectDescription = defaults.projectDescription;
      
      doc.chapters = doc.chapters || [];
      defaults.chapters.forEach(defChap => {
        let existingChap = doc.chapters.find(c => c.id === defChap.id);
        if (existingChap) {
          existingChap.title = defChap.title;
          existingChap.shortDescription = defChap.shortDescription;
          existingChap.mainHeading = defChap.mainHeading;
          existingChap.introduction = defChap.introduction;
          existingChap.importantSubtopics = defChap.importantSubtopics;
          existingChap.projectObjective = defChap.projectObjective;
          existingChap.learningOutcomes = defChap.learningOutcomes;
          existingChap.sections = defChap.sections;
          existingChap.codeExamples = defChap.codeExamples;
          existingChap.difficulty = defChap.difficulty;
          existingChap.updatedAt = new Date().toISOString();
        } else {
          doc.chapters.push(defChap);
        }
      });
      doc.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
      doc.updatedAt = new Date().toISOString();
    }
  });

  db.quizzes = Array.isArray(db.quizzes) ? db.quizzes : [];
  db.questions = Array.isArray(db.questions) ? db.questions : [];
  db.quizResults = Array.isArray(db.quizResults) ? db.quizResults : [];
  
  if (!global.quizzesEnsured) {
    quizGenerator.ensureAllQuizzes(db, FILE);
    global.quizzesEnsured = true;
  }

  (db.users || []).forEach(u => normalizeUser(u));
  return db;
}
function write(db){
  db.users=Array.isArray(db.users)?db.users:[];
  db.leaders=Array.isArray(db.leaders)?db.leaders:[];
  db.auditLogs=Array.isArray(db.auditLogs)?db.auditLogs:[];
  db.notes=Array.isArray(db.notes)?db.notes:[];
  db.projects=Array.isArray(db.projects)?db.projects:DEFAULT_PROJECTS;
  db.domains=Array.isArray(db.domains)&&db.domains.length?db.domains:DEFAULT_DOMAINS;
  db.documentation=Array.isArray(db.documentation)?db.documentation:[];
  db.quizzes = Array.isArray(db.quizzes) ? db.quizzes : [];
  db.questions = Array.isArray(db.questions) ? db.questions : [];
  db.quizResults = Array.isArray(db.quizResults) ? db.quizResults : [];
  fs.writeFileSync(FILE,JSON.stringify(db,null,2));
  queueExcelReport(db);

  if (isMongoConnected) {
    PortalData.findOneAndUpdate(
      { key: "main_data" },
      { data: db },
      { upsert: true, new: true }
    ).catch(err => console.error("MongoDB Atlas sync error:", err.message));
  }
}
function auth(req,res,next){
  try{
    const payload = jwt.verify((req.headers.authorization||"").replace(/^Bearer\s+/i,""),SECRET);
    req.auth = payload;
    req.userId = payload.userId || payload.id;
    next();
  }catch{res.status(401).json({message:"Unauthorized or expired session."});}
}
function studentAuth(req,res,next){
  return auth(req,res,next);
}
function getUser(db,id){return db.users.find(u=>u.id===id)}

function leaderAuth(req,res,next){
  try{
    const payload=jwt.verify(
      (req.headers.authorization||"").replace(/^Bearer\s+/i,""),
      SECRET
    );
    if(payload.role!=="TEAM_LEADER" && payload.role!=="ADMIN")throw new Error("Invalid role");
    req.leader=payload;
    req.admin=payload;
    next();
  }catch{
    res.status(401).json({message:"Unauthorized team leader / admin session."});
  }
}

function adminAuth(req,res,next){
  return leaderAuth(req,res,next);
}
function cameraSummary(u){
  const history=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const totalWorkSeconds = history.reduce((sum, item) => {
    const dur = Number(item.durationSeconds || item.duration || 0);
    return sum + (dur > 86400 ? 0 : dur);
  }, 0);
  const totalFocusedSeconds = history.reduce((sum, item) => {
    const dur = Number(item.durationSeconds || item.duration || 0);
    const foc = Number(item.focusedSeconds || 0);
    return sum + (dur > 86400 ? 0 : foc);
  }, 0);
  return{
    totalWorkSeconds,
    totalFocusedSeconds,
    averageAttentionPercent:totalWorkSeconds>0
      ?Math.round(totalFocusedSeconds/totalWorkSeconds*100)
      :0,
    proofCount:Array.isArray(u.cameraProofs)?u.cameraProofs.length:0
  };
}

function log(db,userId,action,details={}){
  db.auditLogs.push({id:"log_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),userId,action,details,createdAt:new Date().toISOString()});
  if(db.auditLogs.length>4000)db.auditLogs=db.auditLogs.slice(-4000);
}
function dayKey(date=new Date()){return date.toISOString().slice(0,10)}

function getStudentSummaryRow(u){
  normalizeUser(u);
  const assigned=u.selectedProjects||[];
  const completed=assigned.filter(id=>u.progress?.[id]?.status==="completed").length;
  const overall=assigned.length
    ?Math.round(assigned.reduce((sum,id)=>sum+Number(u.progress?.[id]?.percent||0),0)/assigned.length)
    :0;
  const cam=cameraSummary(u);
  return{
    studentId:u.id,
    username:u.username||"",
    name:u.name||"",
    email:u.email||"",
    college:u.college||"",
    chosenProjects:assigned.length,
    completedProjects:completed,
    overallProgress:overall,
    totalWorkSeconds:cam.totalWorkSeconds,
    totalFocusedSeconds:cam.totalFocusedSeconds,
    attentionPercent:cam.averageAttentionPercent,
    cameraProofs:cam.proofCount,
    lastActive:u.updatedAt||u.createdAt||"",
    createdAt:u.createdAt||""
  };
}

async function generateExcelReport(db){
  const workbook=new ExcelJS.Workbook();
  workbook.creator="Aparaitech Software";
  workbook.created=new Date();
  workbook.modified=new Date();

  const headerStyle={
    font:{bold:true,color:{argb:"FFFFFFFF"}},
    fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FF1769A4"}},
    alignment:{vertical:"middle",horizontal:"center",wrapText:true},
    border:{
      top:{style:"thin",color:{argb:"FFD3DCE7"}},
      left:{style:"thin",color:{argb:"FFD3DCE7"}},
      bottom:{style:"thin",color:{argb:"FFD3DCE7"}},
      right:{style:"thin",color:{argb:"FFD3DCE7"}}
    }
  };

  function title(sheet,text,lastColumn){
    sheet.mergeCells(`A1:${lastColumn}1`);
    const cell=sheet.getCell("A1");
    cell.value=text;
    cell.font={bold:true,size:16,color:{argb:"FFFFFFFF"}};
    cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF0D2F59"}};
    cell.alignment={horizontal:"center",vertical:"middle"};
    sheet.getRow(1).height=26;
  }
  function styleHeaders(sheet,row=2){
    sheet.getRow(row).eachCell(cell=>Object.assign(cell,headerStyle));
    sheet.views=[{state:"frozen",ySplit:row}];
  }
  function stripe(sheet,start=3){
    for(let r=start;r<=sheet.rowCount;r++){
      if(r%2===1){
        sheet.getRow(r).eachCell(cell=>{
          cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF3F7FB"}};
        });
      }
      sheet.getRow(r).eachCell(cell=>{
        cell.alignment={vertical:"top",wrapText:true};
        cell.border={
          top:{style:"thin",color:{argb:"FFE5E7EB"}},
          left:{style:"thin",color:{argb:"FFE5E7EB"}},
          bottom:{style:"thin",color:{argb:"FFE5E7EB"}},
          right:{style:"thin",color:{argb:"FFE5E7EB"}}
        };
      });
    }
  }

  const students=(db.users||[]).map(getStudentSummaryRow);

  const summary=workbook.addWorksheet("Student Summary");
  title(summary,"APARAITECH SOFTWARE - STUDENT WORK REPORT","O");
  summary.addRow(["Student ID","Username","Student Name","Email","College","Chosen Projects","Completed Projects","Overall Progress %","Total Work Seconds","Focused Seconds","Attention %","Camera Proofs","Last Active","Created At","Report Status"]);
  students.forEach(s=>summary.addRow([
    s.studentId,s.username,s.name,s.email,s.college,s.chosenProjects,s.completedProjects,
    s.overallProgress,s.totalWorkSeconds,s.totalFocusedSeconds,s.attentionPercent,s.cameraProofs,
    s.lastActive,s.createdAt,s.chosenProjects===4?"Projects Locked":"Awaiting Selection"
  ]));
  styleHeaders(summary);stripe(summary);
  summary.columns=[
    {width:20},{width:18},{width:24},{width:28},{width:24},{width:15},{width:17},
    {width:18},{width:18},{width:17},{width:14},{width:14},{width:23},{width:23},{width:20}
  ];

  const projects=workbook.addWorksheet("Project Progress");
  title(projects,"PROJECT PROGRESS","L");
  projects.addRow(["Student Username","Student Name","Project Order","Project ID","Project Name","Status","Completed Chapters","Total Chapters","Progress %","Quiz","GitHub URL","Tracked Time Seconds"]);
  for(const u of db.users||[]){
    normalizeUser(u);
    (u.selectedProjects||[]).forEach((id,index)=>{
      const p=u.progress?.[id]||{};
      projects.addRow([
        u.username||"",u.name||"",index+1,id,id,p.status||"locked",
        (p.completedChapters||[]).length,16,p.percent||0,
        p.quizPassed?`Passed (${p.quizScore||100}%)`:"Pending",
        p.githubUrl||"",p.timeSpentSeconds||0
      ]);
    });
  }
  styleHeaders(projects);stripe(projects);
  projects.columns=[{width:18},{width:24},{width:14},{width:22},{width:24},{width:20},{width:20},{width:15},{width:14},{width:18},{width:38},{width:20}];

  const activity=workbook.addWorksheet("Daily Activity");
  title(activity,"DAILY ACTIVITY","E");
  activity.addRow(["Student Username","Student Name","Date","Work Seconds","Work Hours"]);
  for(const u of db.users||[]){
    for(const [date,seconds] of Object.entries(u.dailyActivity||{})){
      activity.addRow([u.username||"",u.name||"",date,Number(seconds||0),Number(seconds||0)/3600]);
    }
  }
  styleHeaders(activity);stripe(activity);
  activity.getColumn(5).numFmt="0.00";
  activity.columns=[{width:18},{width:24},{width:15},{width:18},{width:14}];

  const camera=workbook.addWorksheet("Camera Sessions");
  title(camera,"CAMERA WORK SESSIONS","J");
  camera.addRow(["Student Username","Student Name","Project ID","Chapter","Started At","Stopped At","Duration Seconds","Focused Seconds","Attention %","Status"]);
  for(const u of db.users||[]){
    for(const item of u.cameraWorkHistory||[]){
      const isCorrupt = (item.durationSeconds || 0) > 86400;
      camera.addRow([
        u.username||"",u.name||"",item.projectId||"",item.chapterIndex??"",
        item.startedAt||"",item.stoppedAt||"",
        isCorrupt ? 0 : (item.durationSeconds||0),
        isCorrupt ? 0 : (item.focusedSeconds||0),
        isCorrupt ? 0 : (item.attentionPercent||0),
        item.active?"Active":"Completed"
      ]);
    }
  }
  styleHeaders(camera);stripe(camera);
  camera.columns=[{width:18},{width:24},{width:22},{width:12},{width:23},{width:23},{width:18},{width:18},{width:14},{width:14}];

  const proofs=workbook.addWorksheet("Camera Proofs");
  title(proofs,"CAMERA PROOFS","H");
  proofs.addRow(["Student Username","Student Name","Project ID","Chapter","Proof Type","Captured At","File","Proof ID"]);
  for(const u of db.users||[]){
    for(const proof of u.cameraProofs||[]){
      proofs.addRow([
        u.username||"",u.name||"",proof.projectId||"",proof.chapterIndex??"",
        proof.type||"",proof.capturedAt||"",proof.file||"",proof.id||""
      ]);
    }
  }
  styleHeaders(proofs);stripe(proofs);
  proofs.columns=[{width:18},{width:24},{width:22},{width:12},{width:16},{width:23},{width:38},{width:24}];

  await workbook.xlsx.writeFile(REPORT_FILE);
  return REPORT_FILE;
}

function queueExcelReport(db){
  setTimeout(()=>{
    generateExcelReport(JSON.parse(JSON.stringify(db))).catch(error=>{
      console.error("Excel report generation failed:",error.message);
    });
  },20);
}

function getProjectDifficultyForUser(db, u, projectId) {
  const userDomain = u.domain || "Web Development";
  const domainProjects = (db.projects || []).filter(p => String(p.domain || "Web Development").trim().toLowerCase() === String(userDomain).trim().toLowerCase());
  const idx = domainProjects.findIndex(p => p.id === projectId);
  if (idx === -1) return "Intermediate";

  if (String(userDomain).trim().toLowerCase() === "python with machine learning") {
    if (idx < 2) return "Easy";
    if (idx < 6) return "Intermediate";
    return "Advanced";
  } else {
    if (idx < 3) return "Easy";
    if (idx < 6) return "Intermediate";
    return "Advanced";
  }
}

function normalizeUser(u){
  u.role=u.role||"STUDENT";
  u.department=u.department||"Computer Science";
  u.customDepartment=u.customDepartment||"";
  u.year=u.year||"Final Year";
  u.domain=u.domain||"Web Development";
  u.selectedProjects=Array.isArray(u.selectedProjects)?u.selectedProjects:[];
  u.progress=u.progress&&typeof u.progress==="object"?u.progress:{};
  u.dailyActivity=u.dailyActivity&&typeof u.dailyActivity==="object"?u.dailyActivity:{};

  const assigned=u.selectedProjects;
  const initialProjects=assigned.slice(0, 4);
  const completedInitial=initialProjects.filter(id=>u.progress?.[id]?.status==="completed").length;
  if(initialProjects.length===4 && completedInitial===4) {
    u.status="completed";
  } else if(!u.status) {
    if(assigned.length>0) u.status="active";
    else u.status="pending";
  }

  for(const id of u.selectedProjects){
    u.progress[id]=u.progress[id]||{};
    const p=u.progress[id];
    p.status=p.status||"locked";
    p.completedChapters=Array.isArray(p.completedChapters)?p.completedChapters:[];
    p.percent=Number(p.percent||0);
    p.githubUrl=p.githubUrl||"";
    p.submissionNote=p.submissionNote||"";
    p.submittedAt=p.submittedAt||null;
    p.timeSpentSeconds=Number(p.timeSpentSeconds||0);
    p.activeStartedAt=p.activeStartedAt||null;
    p.quizPassed=Boolean(p.quizPassed);
    p.quizScore=Number(p.quizScore||0);
  }
  return u;
}

app.get("/",(_,res)=>res.json({success:true,service:"Aparaitech Advanced Tracking Backend"}));
app.get("/api/health",(_,res)=>res.json({success:true,status:"healthy",timestamp:new Date().toISOString()}));


app.post("/api/auth/student-login",(req,res)=>{
  const{username,password,login}=req.body||{};
  const userQuery = String(login || username || "").trim();
  if(!userQuery||!password)return res.status(400).json({message:"Username/Email and password are required."});
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  const queryLower = userQuery.toLowerCase();
  let u=db.users.find(item=>
    String(item.username||"").toLowerCase()===queryLower ||
    String(item.email||"").toLowerCase()===queryLower ||
    String(item.name||"").toLowerCase()===queryLower
  );
  const passToVerify = u?.password || STUDENT_DEFAULT_PASSWORD;
  if(!u||!verifyPassword(password, passToVerify)){
    return res.status(401).json({message:"Invalid student username or password."});
  }
  if(!u.password || !u.password.includes(":")){
    u.password = hashPassword(password);
  }
  normalizeUser(u);
  log(db,u.id,"STUDENT_LOGIN",{username:u.username});
  write(db);
  const token=jwt.sign({userId:u.id,role:"STUDENT"},SECRET,{expiresIn:"7d"});
  const safe={...u};delete safe.password;
  res.json({token,role:"STUDENT",user:safe});
});

app.post("/api/auth/leader-login",(req,res)=>{
  const{username,password,login}=req.body||{};
  const userQuery = String(login || username || "").trim();
  const db=read();
  db.leaders=Array.isArray(db.leaders)?db.leaders:[];
  if(!db.leaders.length){
    db.leaders.push({
      id:"leader_default",
      username:LEADER_DEFAULT_USERNAME,
      email:"admin@aparaitech.com",
      password:hashPassword(LEADER_DEFAULT_PASSWORD),
      name:"Team Leader Admin",
      role:"ADMIN"
    });
    write(db);
  }
  const queryLower = userQuery.toLowerCase();
  const leader=db.leaders.find(item=>
    String(item.username||"").toLowerCase()===queryLower ||
    String(item.email||"").toLowerCase()===queryLower
  );
  if(!leader||!verifyPassword(password, leader.password)){
    return res.status(401).json({message:"Invalid team leader/admin username or password."});
  }
  if(!leader.password.includes(":")){
    leader.password = hashPassword(password);
    write(db);
  }
  const token=jwt.sign({leaderId:leader.id,role:"ADMIN"},SECRET,{expiresIn:"7d"});
  res.json({token,role:"ADMIN",leader:{id:leader.id,username:leader.username,name:leader.name,email:leader.email}});
});

app.post("/api/auth/login",(req,res)=>{
  const{login,username,email,password,name,college="",domain=""}=req.body||{};
  const userQuery = String(login || username || email || "").trim();

  // If candidate quick register fallback without password
  if(password === PASSWORD && (name || email)) {
    const db=read(),normalized=(email||login).toLowerCase().trim();
    let u=db.users.find(x=>x.email===normalized || x.username===normalized || x.name===normalized);
    if(!u){
      u={id:"usr_"+Date.now(),name:name?name.trim():"Intern",email:normalized,username:normalized.split("@")[0],password:hashPassword(STUDENT_DEFAULT_PASSWORD),domain:domain.trim()||"Web Development",college:college.trim(),selectedProjects:[],progress:{},dailyActivity:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      db.users.push(u);log(db,u.id,"CANDIDATE_CREATED");
    } else {
      if(name) u.name=name.trim();
      if(domain) u.domain=domain.trim();
      u.updatedAt=new Date().toISOString();log(db,u.id,"LOGIN");
    }
    normalizeUser(u);write(db);
    const token=jwt.sign({userId:u.id,role:"STUDENT"},SECRET,{expiresIn:"7d"});
    const safe={...u};delete safe.password;
    return res.json({token,role:"STUDENT",user:safe});
  }

  if(!userQuery || !password){
    return res.status(400).json({message:"Email or Username and Password are required."});
  }

  const db = read();
  db.leaders = Array.isArray(db.leaders)?db.leaders:[];
  db.users = Array.isArray(db.users)?db.users:[];

  if(!db.leaders.length){
    db.leaders.push({
      id:"leader_default",
      username:LEADER_DEFAULT_USERNAME,
      email:"admin@aparaitech.com",
      password:hashPassword(LEADER_DEFAULT_PASSWORD),
      name:"Team Leader Admin",
      role:"ADMIN"
    });
    write(db);
  }

  const queryLower = userQuery.toLowerCase();

  // 1. Check Admin / Leader
  const leader = db.leaders.find(l =>
    String(l.username||"").toLowerCase() === queryLower ||
    String(l.email||"").toLowerCase() === queryLower ||
    queryLower === "admin@aparaitech.com" ||
    queryLower === "teamleader" ||
    queryLower === "admin"
  );
  if(leader && verifyPassword(password, leader.password)){
    if(!leader.password.includes(":")){
      leader.password = hashPassword(password);
    }
    const token = jwt.sign({leaderId:leader.id, role:"ADMIN"}, SECRET, {expiresIn:"7d"});
    log(db, leader.id, "ADMIN_LOGIN", {username: leader.username});
    write(db);
    return res.json({
      token,
      role:"ADMIN",
      user:{id:leader.id, username:leader.username, name:leader.name, email:leader.email||"admin@aparaitech.com", role:"ADMIN"}
    });
  }

  // 2. Check Student
  let student = db.users.find(u =>
    String(u.username||"").toLowerCase() === queryLower ||
    String(u.email||"").toLowerCase() === queryLower ||
    String(u.name||"").toLowerCase() === queryLower
  );

  if (student) {
    const passToVerify = student.password || STUDENT_DEFAULT_PASSWORD;
    if(!student.password || verifyPassword(password, passToVerify) || password === STUDENT_DEFAULT_PASSWORD || password === PASSWORD || password === "Aparitech123@" || password === "Aparaitech123@"){
      if(!student.password || !student.password.includes(":")){
        student.password = hashPassword(password);
      }
      normalizeUser(student);
      log(db, student.id, "STUDENT_LOGIN", {username: student.username});
      write(db);
      const token = jwt.sign({userId:student.id, role:"STUDENT"}, SECRET, {expiresIn:"7d"});
      const safe = {...student}; delete safe.password;
      return res.json({token, role:"STUDENT", user:safe});
    }
  }

  return res.status(401).json({message:"Invalid Email/Username or Password."});
});

app.post("/api/leader/students",leaderAuth,(req,res)=>{
  const{name,username,email="",college="",department="Computer Science",customDepartment="",year="Final Year",domain="Web Development"}=req.body||{};
  if(!name||!username)return res.status(400).json({message:"Student name and username are required."});
  if(!String(department).trim()){
    return res.status(400).json({message:"Branch is required."});
  }
  if(String(department).trim()==="Other" && !String(customDepartment).trim()){
    return res.status(400).json({message:"Custom branch name is required when Other is selected."});
  }
  if(!String(year).trim()){
    return res.status(400).json({message:"Year is required."});
  }
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  if(db.users.some(u=>String(u.username||"").toLowerCase()===String(username).toLowerCase())){
    return res.status(409).json({message:"Student username already exists."});
  }
  const student={
    id:"usr_"+Date.now(),
    name:String(name).trim(),
    username:String(username).trim(),
    password:hashPassword(STUDENT_DEFAULT_PASSWORD),
    email:String(email).trim().toLowerCase(),
    domain:String(domain||"Web Development").trim(),
    college:String(college).trim(),
    department:String(department).trim(),
    customDepartment:String(department).trim()==="Other"?String(customDepartment).trim():"",
    year:String(year).trim(),
    status:"pending",
    role:"STUDENT",
    selectedProjects:[],
    progress:{},
    dailyActivity:{},
    cameraProofs:[],
    cameraWorkHistory:[],
    createdBy: req.leader.leaderId,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  db.users.push(student);
  log(db,student.id,"STUDENT_ACCOUNT_CREATED",{username:student.username,leaderId:req.leader.leaderId});
  write(db);
  const safe={...student};delete safe.password;
  res.json({message:"Student account created.",student:safe,defaultPassword:STUDENT_DEFAULT_PASSWORD});
});

app.get("/api/leader/excel-preview",leaderAuth,async(req,res)=>{
  const db=read();
  const rows=(db.users||[]).map(getStudentSummaryRow);
  await generateExcelReport(db);
  res.json({
    generatedAt:new Date().toISOString(),
    rows
  });
});

app.get("/api/leader/report.xlsx",leaderAuth,async(req,res)=>{
  const db=read();
  await generateExcelReport(db);
  res.download(REPORT_FILE,"Aparaitech_Student_Work_Report.xlsx");
});

app.get("/api/leader/students",leaderAuth,(req,res)=>{
  const db=read();
  db.users=Array.isArray(db.users)?db.users:[];
  const students=db.users.map(u=>{
    normalizeUser(u);
    const safe={...u,cameraSummary:cameraSummary(u)};
    delete safe.password;
    return safe;
  });
  res.json({students});
});

// ADMIN PANEL ENDPOINTS
app.get("/api/admin/students", adminAuth, (req, res) => {
  const db = read();
  db.users = Array.isArray(db.users) ? db.users : [];
  const { q = "", department = "", year = "", project = "", status = "" } = req.query;

  let students = db.users.map(u => {
    normalizeUser(u);
    const assigned = u.selectedProjects || [];
    const completed = assigned.filter(id => u.progress?.[id]?.status === "completed").length;
    const overall = assigned.length
      ? Math.round(assigned.reduce((sum, id) => sum + Number(u.progress?.[id]?.percent || 0), 0) / assigned.length)
      : 0;
    const safe = { ...u, cameraSummary: cameraSummary(u), overallProgress: overall, completedProjectsCount: completed };
    delete safe.password;
    return safe;
  });

  if (q) {
    const query = String(q).toLowerCase();
    students = students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.username && s.username.toLowerCase().includes(query)) ||
      (s.college && s.college.toLowerCase().includes(query))
    );
  }
  if (department) {
    students = students.filter(s => {
      const displayDept = s.department === "Other" ? (s.customDepartment || "Other") : (s.department || "Computer Science");
      return displayDept.toLowerCase() === String(department).toLowerCase();
    });
  }
  if (year) {
    students = students.filter(s => String(s.year).toLowerCase() === String(year).toLowerCase());
  }
  if (project) {
    students = students.filter(s => (s.selectedProjects || []).includes(project));
  }
  if (status) {
    students = students.filter(s => String(s.status).toLowerCase() === String(status).toLowerCase());
  }

  res.json({ students });
});

app.get("/api/admin/stats", adminAuth, (req, res) => {
  const db = read();
  db.users = Array.isArray(db.users) ? db.users : [];
  const totalStudents = db.users.length;
  const uniqueProjectIds = new Set();
  (db.projects || []).forEach(p => {
    if (p && p.id) {
      uniqueProjectIds.add(String(p.id).trim().toLowerCase());
    }
  });
  const totalProjects = uniqueProjectIds.size;

  let activeStudents = 0;
  let completedStudents = 0;
  let pendingStudents = 0;

  const departmentCounts = {};
  const projectDistribution = {};

  db.users.forEach(u => {
    normalizeUser(u);
    const st = u.status || "pending";
    if (st === "completed") completedStudents++;
    else if (st === "active") activeStudents++;
    else pendingStudents++;

    const dept = u.department === "Other" ? (u.customDepartment || "Other") : (u.department || "Computer Science");
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

    (u.selectedProjects || []).forEach(pId => {
      projectDistribution[pId] = (projectDistribution[pId] || 0) + 1;
    });
  });

  res.json({
    totalStudents,
    totalProjects,
    activeStudents,
    completedStudents,
    pendingStudents,
    departmentCounts,
    projectDistribution
  });
});

app.get("/api/admin/students/:id", adminAuth, (req, res) => {
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  normalizeUser(u);
  const safe = { ...u, cameraSummary: cameraSummary(u) };
  delete safe.password;
  const studentLogs = (db.auditLogs || []).filter(l => l.userId === u.id).slice(-100).reverse();
  res.json({ student: safe, logs: studentLogs });
});

app.put("/api/admin/students/:id/status", adminAuth, (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ message: "Status is required." });
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  u.status = status;
  u.updatedAt = new Date().toISOString();
  log(db, u.id, "ADMIN_CHANGE_STATUS", { status, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  normalizeUser(u);
  const safe = { ...u };
  delete safe.password;
  res.json({ message: "Student status updated.", student: safe });
});

app.put("/api/admin/students/:id/progress", adminAuth, (req, res) => {
  const { projectId, percent, status } = req.body || {};
  if (!projectId) return res.status(400).json({ message: "projectId is required." });
  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  normalizeUser(u);
  if (!u.progress[projectId]) {
    return res.status(404).json({ message: "Project not selected by this student." });
  }
  if (typeof percent === "number") {
    u.progress[projectId].percent = Math.min(100, Math.max(0, percent));
    const completedCount = Math.round((u.progress[projectId].percent / 100) * 16);
    u.progress[projectId].completedChapters = Array.from({ length: completedCount }, (_, i) => i);
    if(u.progress[projectId].percent === 100 && u.progress[projectId].status !== "completed") {
      u.progress[projectId].status = "ready_for_submission";
    }
  }
  if (status) {
    u.progress[projectId].status = status;
  }
  u.updatedAt = new Date().toISOString();
  log(db, u.id, "ADMIN_UPDATE_PROGRESS", { projectId, percent, status, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  const safe = { ...u };
  delete safe.password;
  res.json({ message: "Student project progress updated.", student: safe });
});

app.delete("/api/admin/students/:id", adminAuth, (req, res) => {
  const db = read();
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Student not found." });
  const removed = db.users.splice(index, 1)[0];
  log(db, req.params.id, "ADMIN_DELETE_STUDENT", { username: removed.username, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  res.json({ message: "Student account deleted successfully." });
});

app.put("/api/admin/students/:id", adminAuth, (req, res) => {
  const { name, email, username, department, customDepartment, year, college, domain, selectedProjects } = req.body || {};
  if (!name || !email || !username) {
    return res.status(400).json({ message: "Name, email, and username are required." });
  }

  const db = read();
  const u = getUser(db, req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });

  // Check username/email conflicts
  const conflict = db.users.find(x => x.id !== u.id && (
    (x.username || "").toLowerCase() === username.toLowerCase() ||
    (x.email || "").toLowerCase() === email.toLowerCase()
  ));
  if (conflict) {
    return res.status(400).json({ message: "Username or email is already taken." });
  }

  // Update details
  u.name = name;
  u.email = email;
  u.username = username;
  u.department = department || "Computer Science";
  u.customDepartment = customDepartment || "";
  u.year = year || "Final Year";
  u.college = college || "";
  u.domain = domain || "Web Development";

  // Merge selectedProjects
  if (Array.isArray(selectedProjects)) {
    const newProgress = {};
    selectedProjects.forEach((id, index) => {
      if (u.progress && u.progress[id]) {
        newProgress[id] = u.progress[id];
      } else {
        newProgress[id] = {
          status: index === 0 ? "available" : "locked",
          completedChapters: [],
          percent: 0,
          githubUrl: "",
          submissionNote: "",
          submittedAt: null,
          timeSpentSeconds: 0,
          activeStartedAt: null,
          quizPassed: false,
          quizScore: 0
        };
      }
    });
    u.selectedProjects = selectedProjects;
    u.progress = newProgress;
  }

  u.updatedAt = new Date().toISOString();
  log(db, u.id, "ADMIN_EDIT_STUDENT", { name, email, username, adminId: req.admin.leaderId || req.admin.userId });
  write(db);
  normalizeUser(u);

  const safe = { ...u };
  delete safe.password;
  res.json({ message: "Student information updated successfully.", student: safe });
});

app.get("/api/intern/me",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  normalizeUser(u);write(db);res.json({user:u});
});

app.post("/api/intern/selection",auth,(req,res)=>{
  const ids=req.body?.projectIds;
  if(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4){
    return res.status(400).json({message:"Exactly 4 unique projects must be selected."});
  }
  const db=read(),u=getUser(db,req.auth.userId);
  normalizeUser(u);
  if((u.selectedProjects||[]).length===4){
    return res.status(409).json({
      message:"Your four projects are already selected and cannot be changed.",
      user:u
    });
  }

  // Enforce difficulty count rules
  let easy = 0, inter = 0, adv = 0;
  for (const id of ids) {
    const diff = getProjectDifficultyForUser(db, u, id);
    if (diff === "Easy") easy++;
    else if (diff === "Intermediate") inter++;
    else if (diff === "Advanced") adv++;
  }

  if (easy !== 1 || inter !== 1 || adv !== 2) {
    return res.status(400).json({
      message: "Invalid combination. You must select exactly 1 Easy, 1 Intermediate, and 2 Advanced projects."
    });
  }

  u.selectedProjects=ids;
  u.progress={};
  ids.forEach((id,index)=>{
    u.progress[id]={
      status:index===0?"available":"locked",
      completedChapters:[],
      percent:0,
      githubUrl:"",
      submissionNote:"",
      submittedAt:null,
      timeSpentSeconds:0,
      activeStartedAt:null,
      quizPassed:false,
      quizScore:0
    };
  });
  log(db,u.id,"STUDENT_PROJECT_SELECTION_LOCKED",{projectIds:ids});
  write(db);
  res.json({user:u,message:"Four projects selected and locked successfully."});
});

app.post("/api/intern/select-additional",auth,(req,res)=>{
  const { projectId } = req.body || {};
  if (!projectId) return res.status(400).json({ message: "projectId is required." });

  const db = read(), u = getUser(db, req.auth.userId);
  if (!u) return res.status(404).json({ message: "User not found." });
  normalizeUser(u);

  if ((u.selectedProjects || []).includes(projectId)) {
    return res.status(400).json({ message: "Project already selected." });
  }

  const initialProjects = u.selectedProjects.slice(0, 4);
  if (initialProjects.length < 4) {
    return res.status(403).json({ message: "You must select the initial 4 projects first." });
  }

  const allCompleted = initialProjects.every(id => u.progress?.[id]?.status === "completed");
  if (!allCompleted) {
    return res.status(403).json({ message: "You must complete all 4 initially selected projects before unlocking additional projects." });
  }

  u.selectedProjects.push(projectId);
  u.progress[projectId] = {
    status: "available",
    completedChapters: [],
    percent: 0,
    githubUrl: "",
    submissionNote: "",
    submittedAt: null,
    timeSpentSeconds: 0,
    activeStartedAt: null,
    quizPassed: false,
    quizScore: 0
  };

  log(db, u.id, "STUDENT_ADDITIONAL_PROJECT_SELECTED", { projectId });
  write(db);
  res.json({ user: u, message: "Additional project unlocked." });
});

app.post("/api/tracking/:id/start",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked. Complete the previous project."});
  if(!p.activeStartedAt)p.activeStartedAt=new Date().toISOString();
  log(db,u.id,"TRACKING_STARTED",{projectId:req.params.id});write(db);res.json({message:"Tracking started."});
});

app.post("/api/tracking/:id/stop",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.activeStartedAt){
    const seconds=Math.max(0,Math.floor((Date.now()-new Date(p.activeStartedAt).getTime())/1000));
    p.timeSpentSeconds+=seconds;
    const key=dayKey();
    u.dailyActivity[key]=Number(u.dailyActivity[key]||0)+seconds;
    p.activeStartedAt=null;
    log(db,u.id,"TRACKING_STOPPED",{projectId:req.params.id,seconds,total:p.timeSpentSeconds});
    write(db);
  }
  res.json({timeSpentSeconds:p.timeSpentSeconds,dailyActivity:u.dailyActivity});
});

app.post("/api/projects/:id/chapters/:chapter",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked."});
  const chapter=Number(req.params.chapter);
  if(!Number.isInteger(chapter)||chapter<0||chapter>=16)return res.status(400).json({message:"Invalid chapter."});
  if(!p.completedChapters.includes(chapter))p.completedChapters.push(chapter);
  p.completedChapters.sort((a,b)=>a-b);
  p.percent=Math.min(100,Math.round(p.completedChapters.length/16*100));
  if(p.percent===100)p.status="ready_for_submission";
  log(db,u.id,"CHAPTER_COMPLETED",{projectId:req.params.id,chapter,percent:p.percent});
  write(db);res.json({progress:p});
});

app.get("/api/projects/:id/quiz", auth, (req, res) => {
  const db = read();
  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found." });
  
  const activeQuestions = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
  
  // Omit correctAnswer from the response for security
  const sanitizedQuestions = activeQuestions.map(q => ({
    id: q.id,
    projectId: q.projectId,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    marks: q.marks
  }));

  res.json({
    quiz,
    questions: sanitizedQuestions
  });
});

app.post("/api/projects/:id/quiz", auth, (req, res) => {
  const db = read(), u = getUser(db, req.auth.userId);
  normalizeUser(u);
  
  const p = u.progress[req.params.id];
  if (!p) return res.status(404).json({ message: "Project not selected." });
  if (p.status === "locked") return res.status(403).json({ message: "Project is locked." });
  
  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found." });

  const activeQuestions = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
  if (activeQuestions.length < 25) {
    return res.status(400).json({ message: "Quiz is not available yet. Admin is still preparing the questions." });
  }

  const { answers } = req.body || {}; // e.g. { "qId1": "A", "qId2": "B" }
  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ message: "Invalid answers payload." });
  }

  let score = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let attemptedQuestions = 0;

  activeQuestions.forEach(q => {
    const studentAns = answers[q.id];
    if (studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== "") {
      attemptedQuestions++;
      if (String(studentAns).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase()) {
        score += Number(q.marks || 2);
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }
    } else {
      incorrectAnswers++;
    }
  });

  const totalMarks = activeQuestions.reduce((sum, q) => sum + Number(q.marks || 2), 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const passed = percentage >= 70;

  db.quizResults = db.quizResults.filter(r => !(r.studentId === u.id && r.projectId === req.params.id));

  const result = {
    id: "res_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    studentId: u.id,
    studentName: u.name,
    studentEmail: u.email,
    projectId: req.params.id,
    projectName: quiz.title.replace(" Assessment Quiz", ""),
    quizId: quiz.projectId,
    score,
    totalMarks,
    percentage,
    correctAnswers,
    incorrectAnswers,
    attemptedQuestions,
    submittedAt: new Date().toISOString()
  };

  db.quizResults.push(result);
  
  p.quizPassed = passed;
  p.quizScore = percentage; // store percentage as score
  
  log(db, u.id, "QUIZ_SUBMITTED", { projectId: req.params.id, score, totalMarks, percentage, passed });
  write(db);

  res.json({
    message: passed ? "Quiz passed successfully." : "Quiz not passed. Score at least 70% and try again.",
    passed,
    result
  });
});

app.get("/api/projects/:id/quiz/result", auth, (req, res) => {
  const db = read();
  const result = db.quizResults.find(r => r.studentId === req.auth.userId && r.projectId === req.params.id);
  res.json({ result: result || null });
});

app.get("/api/student/quiz-results", auth, (req, res) => {
  const db = read();
  const results = db.quizResults.filter(r => r.studentId === req.auth.userId);
  res.json({ results });
});

app.get("/api/admin/quiz-results", leaderAuth, (req, res) => {
  const db = read();
  res.json({ results: db.quizResults || [] });
});

app.get("/api/admin/projects/:id/quiz/questions", leaderAuth, (req, res) => {
  const db = read();
  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found." });
  const activeQuestions = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
  res.json({ quiz, questions: activeQuestions });
});

app.post("/api/admin/projects/:id/quiz/questions", leaderAuth, (req, res) => {
  const { question, optionA, optionB, optionC, optionD, correctAnswer, marks } = req.body || {};
  if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    return res.status(400).json({ message: "All question fields are required." });
  }

  const db = read();
  const activeQuestions = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
  if (activeQuestions.length >= 25) {
    return res.status(400).json({ message: "Maximum 25 questions reached for this quiz." });
  }

  const newId = `${req.params.id}-q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const newQ = {
    id: newId,
    projectId: req.params.id,
    question,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer: String(correctAnswer).trim().toUpperCase(),
    marks: Number(marks || 2),
    active: true
  };

  db.questions.push(newQ);
  
  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (quiz) {
    const newActiveQ = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
    quiz.totalQuestions = newActiveQ.length;
    quiz.totalMarks = newActiveQ.reduce((sum, q) => sum + Number(q.marks || 2), 0);
  }

  log(db, req.admin?.leaderId || "admin", "QUESTION_CREATED", { projectId: req.params.id, questionId: newId });
  write(db);

  res.json({ message: "Question added successfully.", question: newQ });
});

app.put("/api/admin/projects/:id/quiz/questions/:qId", leaderAuth, (req, res) => {
  const { question, optionA, optionB, optionC, optionD, correctAnswer, marks } = req.body || {};
  
  const db = read();
  const q = db.questions.find(item => item.id === req.params.qId && item.projectId === req.params.id);
  if (!q) return res.status(404).json({ message: "Question not found." });

  if (question !== undefined) q.question = question;
  if (optionA !== undefined) q.optionA = optionA;
  if (optionB !== undefined) q.optionB = optionB;
  if (optionC !== undefined) q.optionC = optionC;
  if (optionD !== undefined) q.optionD = optionD;
  if (correctAnswer !== undefined) q.correctAnswer = String(correctAnswer).trim().toUpperCase();
  if (marks !== undefined) q.marks = Number(marks || 2);

  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (quiz) {
    const newActiveQ = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
    quiz.totalQuestions = newActiveQ.length;
    quiz.totalMarks = newActiveQ.reduce((sum, q) => sum + Number(q.marks || 2), 0);
  }

  log(db, req.admin?.leaderId || "admin", "QUESTION_EDITED", { projectId: req.params.id, questionId: q.id });
  write(db);

  res.json({ message: "Question updated successfully.", question: q });
});

app.delete("/api/admin/projects/:id/quiz/questions/:qId", leaderAuth, (req, res) => {
  const db = read();
  const qIdx = db.questions.findIndex(item => item.id === req.params.qId && item.projectId === req.params.id);
  if (qIdx === -1) return res.status(404).json({ message: "Question not found." });

  db.questions.splice(qIdx, 1);

  const quiz = db.quizzes.find(q => q.projectId === req.params.id);
  if (quiz) {
    const newActiveQ = db.questions.filter(q => q.projectId === req.params.id && q.active !== false);
    quiz.totalQuestions = newActiveQ.length;
    quiz.totalMarks = newActiveQ.reduce((sum, q) => sum + Number(q.marks || 2), 0);
  }

  log(db, req.admin?.leaderId || "admin", "QUESTION_DELETED", { projectId: req.params.id, questionId: req.params.qId });
  write(db);

  res.json({ message: "Question deleted successfully." });
});

app.delete("/api/admin/projects/:projectId/quiz/results/:studentId", leaderAuth, (req, res) => {
  const db = read();
  const { projectId, studentId } = req.params;
  
  const initialLength = db.quizResults.length;
  db.quizResults = db.quizResults.filter(r => !(r.studentId === studentId && r.projectId === projectId));
  
  if (db.quizResults.length === initialLength) {
    return res.status(404).json({ message: "Quiz result not found." });
  }

  const u = getUser(db, studentId);
  if (u && u.progress && u.progress[projectId]) {
    u.progress[projectId].quizPassed = false;
    u.progress[projectId].quizScore = 0;
  }

  log(db, req.admin?.leaderId || "admin", "QUIZ_RESULT_RESET", { projectId, studentId });
  write(db);

  res.json({ message: "Quiz attempt reset successfully. Student can now re-attempt the quiz." });
});

app.post("/api/projects/:id/submit",auth,(req,res)=>{
  const{githubUrl,submissionNote=""}=req.body||{};
  if(!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(githubUrl||""))return res.status(400).json({message:"Enter a valid GitHub repository URL."});
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.percent<100)return res.status(400).json({message:"Complete all chapters before submission."});
  if(!p.quizPassed)return res.status(400).json({message:"Pass the quiz before submission."});
  p.githubUrl=githubUrl;p.submissionNote=submissionNote.trim();p.submittedAt=new Date().toISOString();p.status="completed";
  const i=u.selectedProjects.indexOf(req.params.id);
  if(i>=0&&i<u.selectedProjects.length-1)u.progress[u.selectedProjects[i+1]].status="available";
  log(db,u.id,"PROJECT_SUBMITTED",{projectId:req.params.id,githubUrl});
  write(db);res.json({message:"Project submitted successfully. Next project unlocked.",user:u});
});



app.post("/api/work-proof",auth,(req,res)=>{
  const{projectId=null,chapterIndex=null,type="manual",capturedAt,imageData}=req.body||{};
  const match=String(imageData||"").match(/^data:image\/jpeg;base64,(.+)$/);
  if(!match)return res.status(400).json({message:"Valid JPEG camera image is required."});

  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});

  const filename=`proof_${u.id}_${Date.now()}.jpg`;
  fs.writeFileSync(path.join(UPLOADS,filename),Buffer.from(match[1],"base64"));

  u.cameraProofs=Array.isArray(u.cameraProofs)?u.cameraProofs:[];
  const proof={
    id:"proof_"+Date.now(),
    projectId,
    chapterIndex,
    type,
    capturedAt:capturedAt||new Date().toISOString(),
    file:`uploads/${filename}`
  };
  u.cameraProofs.push(proof);
  if(u.cameraProofs.length>200)u.cameraProofs=u.cameraProofs.slice(-200);
  log(db,u.id,"CAMERA_PROOF_CAPTURED",{projectId,chapterIndex,type,file:proof.file});
  write(db);
  res.json({message:"Camera proof stored successfully.",proof});
});



app.get("/api/camera-work/active", auth, (req, res) => {
  const db = read();
  const u = getUser(db, req.auth.userId);
  if (!u) return res.status(404).json({ message: "User not found." });
  res.json({ session: u.cameraWorkSession || null });
});

app.get("/api/camera-work/summary", auth, (req, res) => {
  const db = read();
  const u = getUser(db, req.auth.userId);
  if (!u) return res.status(404).json({ message: "User not found." });
  const history = Array.isArray(u.cameraWorkHistory) ? u.cameraWorkHistory : [];
  const totalWorkSeconds = history.reduce((sum, item) => {
    const dur = Number(item.durationSeconds || item.duration || 0);
    return sum + (dur > 86400 ? 0 : dur);
  }, 0);
  const totalFocusedSeconds = history.reduce((sum, item) => {
    const dur = Number(item.durationSeconds || item.duration || 0);
    const foc = Number(item.focusedSeconds || 0);
    return sum + (dur > 86400 ? 0 : foc);
  }, 0);
  const averageAttentionPercent = totalWorkSeconds > 0
    ? Math.round(totalFocusedSeconds / totalWorkSeconds * 100)
    : 0;
  res.json({
    totalSessions: history.length,
    totalWorkSeconds,
    totalFocusedSeconds,
    averageAttentionPercent
  });
});

app.post("/api/camera-work/start", auth, (req, res) => {
  const db = read();
  const u = getUser(db, req.auth.userId);
  if (!u) return res.status(404).json({ message: "User not found." });

  if (u.cameraWorkSession && u.cameraWorkSession.status === "ACTIVE") {
    return res.json({ message: "Work session already active.", session: u.cameraWorkSession });
  }

  const now = new Date().toISOString();
  const sessionId = "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  
  u.cameraWorkSession = {
    studentId: u.id,
    sessionId: sessionId,
    projectId: req.body?.projectId || null,
    startTime: now,
    endTime: null,
    duration: 0,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    active: true,
    startedAt: now,
    chapterIndex: req.body?.chapterIndex ?? null
  };

  log(db, u.id, "CAMERA_WORK_STARTED", u.cameraWorkSession);
  write(db);

  res.json({ message: "Camera work session started.", session: u.cameraWorkSession });
});

app.post("/api/camera-work/stop", auth, (req, res) => {
  const db = read();
  const u = getUser(db, req.auth.userId);
  if (!u) return res.status(404).json({ message: "User not found." });

  const session = u.cameraWorkSession;
  if (!session || session.status !== "ACTIVE") {
    return res.status(400).json({ message: "No active work session found." });
  }

  const now = new Date().toISOString();
  const durationSeconds = Math.max(0, Math.floor((new Date(now) - new Date(session.startTime)) / 1000));
  
  const focusedSeconds = Math.min(
    durationSeconds,
    Math.max(0, Number(req.body?.focusedSeconds || 0))
  );

  const attentionPercent = durationSeconds > 0
    ? Math.round((focusedSeconds / durationSeconds) * 100)
    : 0;

  session.status = "COMPLETED";
  session.active = false;
  session.endTime = now;
  session.stoppedAt = now;
  session.duration = durationSeconds;
  session.durationSeconds = durationSeconds;
  session.focusedSeconds = focusedSeconds;
  session.attentionPercent = attentionPercent;
  session.updatedAt = now;

  u.cameraWorkHistory = Array.isArray(u.cameraWorkHistory) ? u.cameraWorkHistory : [];
  u.cameraWorkHistory.push(session);
  if (u.cameraWorkHistory.length > 500) {
    u.cameraWorkHistory = u.cameraWorkHistory.slice(-500);
  }

  u.cameraWorkSession = null;

  log(db, u.id, "CAMERA_WORK_STOPPED", {
    sessionId: session.sessionId,
    durationSeconds,
    focusedSeconds,
    attentionPercent,
    projectId: session.projectId
  });

  write(db);
  res.json({ message: "Camera work session saved.", session });
});

// INTERNSHIP NOTES API ENDPOINTS

// 1. Student: Save or Update Chapter Note
app.post("/api/notes", studentAuth, (req, res) => {
  const { projectId, chapterId, notes, chapterName = "" } = req.body || {};
  if (!projectId || chapterId === undefined || chapterId === null) {
    return res.status(400).json({ message: "projectId and chapterId are required." });
  }
  const db = read();
  const student = db.users.find(u => u.id === req.userId);
  if (!student) return res.status(404).json({ message: "Student not found." });

  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const chapIdx = Number(chapterId);
  const now = new Date().toISOString();

  let noteEntry = db.notes.find(n => n.studentId === student.id && n.projectId === projectId && Number(n.chapterId) === chapIdx);

  if (noteEntry) {
    noteEntry.notes = String(notes || "").trim();
    noteEntry.updatedAt = now;
    if (chapterName) noteEntry.chapterName = chapterName;
  } else {
    noteEntry = {
      id: "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      studentId: student.id,
      studentName: student.name || student.username || "Student",
      studentEmail: student.email || "",
      projectId,
      chapterId: chapIdx,
      chapterName: chapterName || `Chapter ${chapIdx + 1}`,
      notes: String(notes || "").trim(),
      createdAt: now,
      updatedAt: now
    };
    db.notes.push(noteEntry);
  }

  log(db, student.id, "STUDENT_SAVE_NOTES", { projectId, chapterId: chapIdx });
  write(db);
  res.json({ message: "Intern notes saved successfully.", note: noteEntry });
});

// 2. Student: Get own notes (with optional search/filter params)
app.get("/api/notes", studentAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { projectId, chapterId, q } = req.query || {};

  let list = db.notes.filter(n => n.studentId === req.userId);

  if (projectId) list = list.filter(n => n.projectId === projectId);
  if (chapterId !== undefined && chapterId !== null && chapterId !== "") {
    list = list.filter(n => Number(n.chapterId) === Number(chapterId));
  }
  if (q) {
    const query = String(q).toLowerCase().trim();
    list = list.filter(n =>
      n.notes.toLowerCase().includes(query) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(query)) ||
      n.projectId.toLowerCase().includes(query)
    );
  }

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ notes: list });
});

// 3. Student: Get single note for a specific chapter
app.get("/api/notes/:projectId/:chapterId", studentAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { projectId, chapterId } = req.params;
  const note = db.notes.find(n => n.studentId === req.userId && n.projectId === projectId && Number(n.chapterId) === Number(chapterId));
  res.json({ note: note || null });
});

// 4. Admin: View all student notes (Read-Only)
app.get("/api/admin/notes", adminAuth, (req, res) => {
  const db = read();
  db.notes = Array.isArray(db.notes) ? db.notes : [];
  const { q, projectId, studentId } = req.query || {};

  let list = [...db.notes];

  if (studentId) list = list.filter(n => n.studentId === studentId);
  if (projectId) list = list.filter(n => n.projectId === projectId);
  if (q) {
    const query = String(q).toLowerCase().trim();
    list = list.filter(n =>
      (n.studentName && n.studentName.toLowerCase().includes(query)) ||
      (n.studentEmail && n.studentEmail.toLowerCase().includes(query)) ||
      (n.notes && n.notes.toLowerCase().includes(query)) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(query)) ||
      (n.projectId && n.projectId.toLowerCase().includes(query))
    );
  }

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ total: list.length, notes: list });
});

app.get("/api/admin/candidates",(req,res)=>{
  if(req.headers["x-admin-password"]!==PASSWORD)return res.status(401).json({message:"Invalid admin password."});
  const db=read();res.json({total:db.users.length,candidates:db.users,auditLogs:db.auditLogs.slice(-200).reverse()});
});

// PROJECT MANAGEMENT API ENDPOINTS

// 1. Get all projects (secure domain-filtered for students, full list for admins & public domain view)
app.get("/api/projects", (req, res) => {
  const db = read();
  let list = db.projects || DEFAULT_PROJECTS;

  const normalizeDomain = (d) => String(d || "").trim().toLowerCase();

  let token = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  let userDomain = null;
  let isAdmin = false;

  if (req.headers["x-admin-password"] === PASSWORD || req.headers["authorization"] === `Bearer ${PASSWORD}`) {
    isAdmin = true;
  }

  if (token && !isAdmin) {
    try {
      const decoded = jwt.verify(token, SECRET);
      if (decoded.role === "ADMIN" || decoded.leaderId) {
        isAdmin = true;
      } else if (decoded.userId) {
        const user = db.users.find(u => u.id === decoded.userId);
        if (user) {
          if (user.role === "ADMIN") {
            isAdmin = true;
          } else {
            userDomain = user.domain || "Web Development";
          }
        }
      }
    } catch (e) {
      // Invalid or expired token
    }
  }

  const requestedDomain = req.query.domain;
  const showAll = req.query.all === "true" || isAdmin;

  if (!showAll) {
    // Non-admin / student call: only active projects for the student's assigned domain
    list = list.filter(p => p.status !== "inactive");
    const effectiveDomain = userDomain || requestedDomain || "Web Development";
    list = list.filter(p => normalizeDomain(p.domain || "Web Development") === normalizeDomain(effectiveDomain));
  } else if (requestedDomain && String(requestedDomain).trim() !== "") {
    // Admin with domain filter
    list = list.filter(p => normalizeDomain(p.domain || "Web Development") === normalizeDomain(requestedDomain));
  }

  res.json({ projects: list, userDomain: userDomain || requestedDomain || null, isAdmin });
});

// DOMAIN MANAGEMENT API ENDPOINTS
app.get("/api/domains", (req, res) => {
  const db = read();
  res.json({ domains: db.domains || DEFAULT_DOMAINS });
});

app.post("/api/admin/domains", adminAuth, (req, res) => {
  const { name, domainName } = req.body || {};
  const newDomain = String(name || domainName || "").trim();

  if (!newDomain) {
    return res.status(400).json({ message: "Domain name is required." });
  }

  const db = read();
  db.domains = Array.isArray(db.domains) && db.domains.length ? db.domains : [...DEFAULT_DOMAINS];

  const norm = s => String(s || "").trim().toLowerCase();
  const exists = db.domains.some(d => norm(d) === norm(newDomain));
  if (exists) {
    return res.status(409).json({ message: `Domain "${newDomain}" already exists.`, domains: db.domains });
  }

  db.domains.push(newDomain);
  log(db, req.admin.username || "admin", "ADMIN_CREATE_DOMAIN", { domain: newDomain });
  write(db);

  res.json({ message: `New domain "${newDomain}" added successfully.`, domain: newDomain, domains: db.domains });
});

// 2. Admin: Add New Project
app.post("/api/admin/projects", adminAuth, (req, res) => {
  const { name, icon, summary, description, domain, level, duration, stack, modules, status, difficulty, objective, outcomes } = req.body || {};
  if (!name || !summary) {
    return res.status(400).json({ message: "Project Name and Summary are required." });
  }

  const db = read();
  db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `proj-${Date.now()}`;
  const id = slug + "_" + Math.random().toString(36).slice(2, 6);

  const newProject = {
    id,
    name,
    title: name,
    icon: icon || "💻",
    domain: domain || "Web Development",
    summary,
    description: description || summary,
    level: level || difficulty || "Intermediate",
    difficulty: difficulty || level || "Intermediate",
    duration: duration || "4–6 Weeks",
    stack: stack || "React, Node.js, Express, MongoDB",
    modules: Array.isArray(modules) ? modules : (modules ? String(modules).split(",").map(s=>s.trim()) : ["Overview", "Authentication", "Dashboard", "Modules", "Testing", "Deployment"]),
    status: status || "active",
    objective: objective || "Build production-grade web application module.",
    outcomes: Array.isArray(outcomes) ? outcomes : (outcomes ? String(outcomes).split(",").map(s=>s.trim()) : ["Full-stack architecture", "REST API integration"]),
    customChapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.projects.push(newProject);
  log(db, req.admin.username || "admin", "ADMIN_CREATE_PROJECT", { projectId: id, name, domain: newProject.domain });
  write(db);
  res.json({ message: "New project created successfully.", project: newProject });
});

// 3. Admin: Update Existing Project
app.put("/api/admin/projects/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const db = read();
  db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];

  const projectIndex = db.projects.findIndex(p => p.id === id);
  if (projectIndex === -1) {
    return res.status(404).json({ message: "Project not found." });
  }

  const p = db.projects[projectIndex];
  const { name, icon, summary, description, domain, level, duration, stack, modules, status, difficulty, objective, outcomes, customChapters } = req.body || {};

  if (name) { p.name = name; p.title = name; }
  if (icon) p.icon = icon;
  if (domain) p.domain = domain;
  if (summary) p.summary = summary;
  if (description !== undefined) p.description = description;
  if (level) { p.level = level; p.difficulty = level; }
  if (difficulty) { p.difficulty = difficulty; p.level = difficulty; }
  if (duration) p.duration = duration;
  if (stack) p.stack = stack;
  if (status) p.status = status;
  if (objective) p.objective = objective;
  if (modules !== undefined) p.modules = Array.isArray(modules) ? modules : String(modules).split(",").map(s=>s.trim());
  if (outcomes !== undefined) p.outcomes = Array.isArray(outcomes) ? outcomes : String(outcomes).split(",").map(s=>s.trim());
  if (customChapters !== undefined) p.customChapters = customChapters;
  p.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_UPDATE_PROJECT", { projectId: id, domain: p.domain });
  
  // Also update / repair dynamic project documentation chapters to reflect the project changes
  let doc = db.documentation.find(d => d.projectId === id);
  if (doc) {
    const defaults = getDefaultDocumentationForProject(p);
    doc.projectTitle = defaults.projectTitle;
    doc.projectDescription = defaults.projectDescription;
    doc.chapters = doc.chapters || [];
    defaults.chapters.forEach(defChap => {
      let existingChap = doc.chapters.find(c => c.id === defChap.id);
      if (existingChap) {
        existingChap.title = defChap.title;
        existingChap.shortDescription = defChap.shortDescription;
        existingChap.mainHeading = defChap.mainHeading;
        existingChap.introduction = defChap.introduction;
        existingChap.importantSubtopics = defChap.importantSubtopics;
        existingChap.projectObjective = defChap.projectObjective;
        existingChap.learningOutcomes = defChap.learningOutcomes;
        existingChap.sections = defChap.sections;
        existingChap.codeExamples = defChap.codeExamples;
        existingChap.difficulty = defChap.difficulty;
        existingChap.updatedAt = new Date().toISOString();
      } else {
        doc.chapters.push(defChap);
      }
    });
    doc.chapters.sort((a, b) => (a.order || 0) - (b.order || 0));
    doc.updatedAt = new Date().toISOString();
  }

  write(db);
  res.json({ message: "Project updated successfully.", project: p });
});

// 4. Admin: Delete Project Safely
app.delete("/api/admin/projects/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const db = read();
  db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];

  const projectIndex = db.projects.findIndex(p => p.id === id);
  if (projectIndex === -1) {
    return res.status(404).json({ message: "Project not found." });
  }

  const deleted = db.projects.splice(projectIndex, 1)[0];
  log(db, req.admin.username || "admin", "ADMIN_DELETE_PROJECT", { projectId: id, name: deleted.name });
  write(db);
  res.json({ message: `Project '${deleted.name}' deleted successfully.` });
});

// 5. Admin: Add / Update Chapter Content & Documentation
app.post("/api/admin/projects/:id/chapters", adminAuth, (req, res) => {
  const { id } = req.params;
  const { chapterIndex, chapterName, content } = req.body || {};
  const db = read();
  db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];

  const project = db.projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ message: "Project not found." });

  project.customChapters = Array.isArray(project.customChapters) ? project.customChapters : [];
  const idx = Number(chapterIndex);

  let chap = project.customChapters.find(c => c.index === idx);
  if (chap) {
    if (chapterName) chap.name = chapterName;
    if (content !== undefined) chap.content = content;
    chap.updatedAt = new Date().toISOString();
  } else {
    chap = {
      index: idx,
      name: chapterName || `Chapter ${idx + 1}`,
      content: content || "",
      updatedAt: new Date().toISOString()
    };
    project.customChapters.push(chap);
  }

  log(db, req.admin.username || "admin", "ADMIN_UPDATE_CHAPTER", { projectId: id, chapterIndex: idx });
  write(db);
  res.json({ message: "Chapter documentation updated successfully.", chapter: chap });
});

// DYNAMIC DOCUMENTATION MANAGEMENT ENDPOINTS

// 1. GET Public Documentation for a project (Students / Viewers)
app.get("/api/documentation/:projectId", (req, res) => {
  const { projectId } = req.params;
  const db = read();
  let doc = db.documentation.find(d => d.projectId === projectId);
  const proj = db.projects.find(p => p.id === projectId);

  if (!doc) {
    if (proj) {
      doc = getDefaultDocumentationForProject(proj);
      db.documentation.push(doc);
      write(db);
    } else {
      return res.status(404).json({ message: "Documentation not found." });
    }
  }

  // Filter published and enabled chapters for public student view
  const publicChapters = (doc.chapters || []).filter(c => c.isEnabled !== false && c.status !== "draft");
  publicChapters.sort((a, b) => (a.order || 0) - (b.order || 0));

  res.json({
    documentation: {
      ...doc,
      chapters: publicChapters
    }
  });
});

// 2. GET Full Documentation for Admin (Includes Drafts & Disabled)
app.get("/api/admin/documentation/:projectId", adminAuth, (req, res) => {
  const { projectId } = req.params;
  const db = read();
  let doc = db.documentation.find(d => d.projectId === projectId);
  const proj = db.projects.find(p => p.id === projectId);

  if (!doc) {
    if (proj) {
      doc = getDefaultDocumentationForProject(proj);
      db.documentation.push(doc);
      write(db);
    } else {
      return res.status(404).json({ message: "Documentation not found for this project." });
    }
  }

  (doc.chapters || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ documentation: doc });
});

// 3. Admin: Create New Chapter in Documentation
app.post("/api/admin/documentation/:projectId/chapters", adminAuth, (req, res) => {
  const { projectId } = req.params;
  const { title, shortDescription, mainHeading, introduction, importantSubtopics, projectObjective, learningOutcomes, readingTime, codingTime, difficulty, status, isEnabled, sections, codeExamples } = req.body || {};

  if (!title) {
    return res.status(400).json({ message: "Chapter Title is required." });
  }

  const db = read();
  let doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  doc.chapters = Array.isArray(doc.chapters) ? doc.chapters : [];
  const nextOrder = doc.chapters.length + 1;
  const chapId = `chap_${projectId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const newChapter = {
    id: chapId,
    chapterNumber: nextOrder,
    title,
    shortDescription: shortDescription || `Chapter ${nextOrder}: ${title}`,
    mainHeading: mainHeading || `${nextOrder}. ${title}`,
    introduction: introduction || "",
    importantSubtopics: Array.isArray(importantSubtopics) ? importantSubtopics : (importantSubtopics ? String(importantSubtopics).split(",").map(s=>s.trim()).filter(Boolean) : []),
    projectObjective: projectObjective || "",
    learningOutcomes: Array.isArray(learningOutcomes) ? learningOutcomes : (learningOutcomes ? String(learningOutcomes).split(",").map(s=>s.trim()).filter(Boolean) : []),
    readingTime: readingTime || "15 min",
    codingTime: codingTime || "2 hours",
    difficulty: difficulty || "Intermediate",
    status: status || "published",
    isEnabled: isEnabled !== false,
    order: nextOrder,
    sections: Array.isArray(sections) ? sections : [],
    codeExamples: Array.isArray(codeExamples) ? codeExamples : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  doc.chapters.push(newChapter);
  doc.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_CREATE_DOC_CHAPTER", { projectId, chapterId: chapId, title });
  write(db);
  res.json({ message: "New chapter created successfully.", chapter: newChapter });
});

// 4. Admin: Update Existing Chapter
app.put("/api/admin/documentation/:projectId/chapters/:chapterId", adminAuth, (req, res) => {
  const { projectId, chapterId } = req.params;
  const db = read();
  const doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  const chap = (doc.chapters || []).find(c => c.id === chapterId || String(c.order) === String(chapterId) || String(c.chapterNumber) === String(chapterId));
  if (!chap) return res.status(404).json({ message: "Chapter not found." });

  const { chapterNumber, title, shortDescription, mainHeading, introduction, importantSubtopics, projectObjective, learningOutcomes, readingTime, codingTime, difficulty, status, isEnabled, order, sections, codeExamples } = req.body || {};

  if (chapterNumber !== undefined) chap.chapterNumber = Number(chapterNumber);
  if (title) chap.title = title;
  if (shortDescription !== undefined) chap.shortDescription = shortDescription;
  if (mainHeading !== undefined) chap.mainHeading = mainHeading;
  if (introduction !== undefined) chap.introduction = introduction;
  if (importantSubtopics !== undefined) chap.importantSubtopics = Array.isArray(importantSubtopics) ? importantSubtopics : String(importantSubtopics).split(",").map(s=>s.trim()).filter(Boolean);
  if (projectObjective !== undefined) chap.projectObjective = projectObjective;
  if (learningOutcomes !== undefined) chap.learningOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes : String(learningOutcomes).split(",").map(s=>s.trim()).filter(Boolean);
  if (readingTime !== undefined) chap.readingTime = readingTime;
  if (codingTime !== undefined) chap.codingTime = codingTime;
  if (difficulty) chap.difficulty = difficulty;
  if (status) chap.status = status;
  if (isEnabled !== undefined) chap.isEnabled = Boolean(isEnabled);
  if (order !== undefined) chap.order = Number(order);
  if (sections !== undefined) chap.sections = Array.isArray(sections) ? sections : [];
  if (codeExamples !== undefined) chap.codeExamples = Array.isArray(codeExamples) ? codeExamples : [];
  chap.updatedAt = new Date().toISOString();
  doc.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_UPDATE_DOC_CHAPTER", { projectId, chapterId, title: chap.title });
  write(db);
  res.json({ message: "Chapter updated successfully.", chapter: chap });
});

// 5. Admin: Delete Chapter
app.delete("/api/admin/documentation/:projectId/chapters/:chapterId", adminAuth, (req, res) => {
  const { projectId, chapterId } = req.params;
  const db = read();
  const doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  const idx = (doc.chapters || []).findIndex(c => c.id === chapterId || String(c.order) === String(chapterId) || String(c.chapterNumber) === String(chapterId));
  if (idx === -1) return res.status(404).json({ message: "Chapter not found." });

  const deleted = doc.chapters.splice(idx, 1)[0];
  doc.chapters.forEach((c, i) => {
    c.order = i + 1;
    c.chapterNumber = i + 1;
  });
  doc.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_DELETE_DOC_CHAPTER", { projectId, chapterId, title: deleted.title });
  write(db);
  res.json({ message: `Chapter '${deleted.title}' deleted successfully.` });
});

// 6. Admin: Reorder Chapters
app.put("/api/admin/documentation/:projectId/reorder", adminAuth, (req, res) => {
  const { projectId } = req.params;
  const { chapterIds } = req.body || {};
  if (!Array.isArray(chapterIds)) return res.status(400).json({ message: "chapterIds array is required." });

  const db = read();
  const doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  const reordered = [];
  chapterIds.forEach((id, index) => {
    const chap = (doc.chapters || []).find(c => c.id === id);
    if (chap) {
      chap.order = index + 1;
      chap.chapterNumber = index + 1;
      reordered.push(chap);
    }
  });

  (doc.chapters || []).forEach(c => {
    if (!reordered.includes(c)) {
      c.order = reordered.length + 1;
      c.chapterNumber = reordered.length + 1;
      reordered.push(c);
    }
  });

  doc.chapters = reordered;
  doc.updatedAt = new Date().toISOString();
  log(db, req.admin.username || "admin", "ADMIN_REORDER_CHAPTERS", { projectId });
  write(db);
  res.json({ message: "Chapters reordered successfully.", chapters: doc.chapters });
});

// 7. Admin: Update Project Documentation Settings
app.put("/api/admin/documentation/:projectId/settings", adminAuth, (req, res) => {
  const { projectId } = req.params;
  const { projectTitle, projectDescription, mode, progressEnabled } = req.body || {};
  const db = read();
  let doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  if (projectTitle) doc.projectTitle = projectTitle;
  if (projectDescription !== undefined) doc.projectDescription = projectDescription;
  if (mode) doc.mode = mode;
  if (progressEnabled !== undefined) doc.progressEnabled = Boolean(progressEnabled);
  doc.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_UPDATE_DOC_SETTINGS", { projectId });
  write(db);
  res.json({ message: "Documentation settings updated successfully.", documentation: doc });
});

// 8. Admin: Duplicate Chapter
app.post("/api/admin/documentation/:projectId/chapters/:chapterId/duplicate", adminAuth, (req, res) => {
  const { projectId, chapterId } = req.params;
  const db = read();
  const doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  const original = (doc.chapters || []).find(c => c.id === chapterId || String(c.order) === String(chapterId));
  if (!original) return res.status(404).json({ message: "Original chapter not found." });

  const dupId = `chap_${projectId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const dupOrder = original.order + 1;

  const duplicated = {
    ...JSON.parse(JSON.stringify(original)),
    id: dupId,
    chapterNumber: dupOrder,
    title: `${original.title} (Copy)`,
    order: dupOrder,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  doc.chapters.splice(original.order, 0, duplicated);
  doc.chapters.forEach((c, i) => {
    c.order = i + 1;
    c.chapterNumber = i + 1;
  });
  doc.updatedAt = new Date().toISOString();

  log(db, req.admin.username || "admin", "ADMIN_DUPLICATE_CHAPTER", { projectId, originalId: chapterId, newId: dupId });
  write(db);
  res.json({ message: "Chapter duplicated successfully.", chapter: duplicated });
});

// 9. Admin: Bulk Actions
app.post("/api/admin/documentation/:projectId/bulk", adminAuth, (req, res) => {
  const { projectId } = req.params;
  const { action, chapterIds } = req.body || {};
  if (!action || !Array.isArray(chapterIds)) return res.status(400).json({ message: "Action and chapterIds array required." });

  const db = read();
  const doc = db.documentation.find(d => d.projectId === projectId);
  if (!doc) return res.status(404).json({ message: "Documentation not found." });

  if (action === "publish") {
    (doc.chapters || []).forEach(c => { if (chapterIds.includes(c.id)) c.status = "published"; });
  } else if (action === "unpublish") {
    (doc.chapters || []).forEach(c => { if (chapterIds.includes(c.id)) c.status = "draft"; });
  } else if (action === "enable") {
    (doc.chapters || []).forEach(c => { if (chapterIds.includes(c.id)) c.isEnabled = true; });
  } else if (action === "disable") {
    (doc.chapters || []).forEach(c => { if (chapterIds.includes(c.id)) c.isEnabled = false; });
  } else if (action === "delete") {
    doc.chapters = (doc.chapters || []).filter(c => !chapterIds.includes(c.id));
    doc.chapters.forEach((c, i) => { c.order = i + 1; c.chapterNumber = i + 1; });
  }

  doc.updatedAt = new Date().toISOString();
  log(db, req.admin.username || "admin", "ADMIN_BULK_DOC_ACTION", { projectId, action, count: chapterIds.length });
  write(db);
  res.json({ message: `Bulk action '${action}' completed on ${chapterIds.length} chapters.`, chapters: doc.chapters });
});

const server = app.listen(PORT,()=> {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  // Run normalization once in the background after startup
  setTimeout(() => {
    try {
      const db = read();
      initializeAndNormalizeDatabase(db);
      write(db);
      console.log("🍃 Database startup normalization completed successfully.");
    } catch (err) {
      console.error("Database startup normalization error:", err.message);
    }
  }, 1000);
})
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is currently occupied by another process. Kill process on port ${PORT} or run: npx kill-port ${PORT}`);
    } else {
      console.error("Server error:", err);
    }
  });
