
require("dotenv").config();
const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
const fs=require("fs");
const path=require("path");
const ExcelJS=require("exceljs");
const crypto=require("crypto");
const mongoose=require("mongoose");

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
        if (!record) {
          const localDb = read();
          record = await PortalData.create({ key: "main_data", data: localDb });
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
  "Artificial Intelligence (AI/ML)",
  "Cloud Computing"
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
  { id: "cs-threat-intel-command", name: "Enterprise Cyber Security Incident Command & Threat Intelligence Platform", title: "Enterprise Cyber Security Incident Command & Threat Intelligence Platform", icon: "⚔️", domain: "Cyber Security", level: "Advanced", difficulty: "Advanced", duration: "7–9 Weeks", stack: "React, Node.js, Express, STIX/TAXII, MongoDB", summary: "Develop an enterprise security platform that integrates authorized security events, threat-intelligence records, assets, alerts, incidents, investigation workflows, response activities, and management reporting.", description: "Develop an enterprise security platform that integrates authorized security events, threat-intelligence records, assets, alerts, incidents, investigation workflows, response activities, and management reporting.", modules: ["Threat Intel Feeds", "Asset Inventory", "Incident Command Center", "Playbook Execution Engine", "Executive Threat Metrics"], status: "active", objective: "Integrate threat intelligence feeds, asset inventories, automated playbooks, and incident command metrics.", outcomes: ["Threat intelligence feeds (STIX/TAXII)", "Automated SOAR playbooks", "Executive security reporting"], customChapters: [] }
];

const DEFAULT_CHAPTER_TITLES = [
  "Overview", "Problem & Solution", "Requirements", "Workflow", "Modules",
  "Architecture", "Database", "APIs", "Security", "UI/UX",
  "Code Examples", "Testing", "Deployment", "Assignment", "Quiz", "References"
];

function getDetailedTheoryForChapter(title, proj) {
  const projName = proj.name || "Web Development Project";
  const projSummary = proj.summary || "Production web application";
  const projStack = proj.stack || "React, Node.js, Express, MongoDB";

  switch (title) {
    case "Overview":
      return {
        introduction: `The ${projName} is designed as an enterprise-ready industrial solution. The primary objective is to streamline ${projSummary.toLowerCase()}. Built with ${projStack}, the application features a modular 3-tier architecture separating presentation UI, RESTful business logic, and transactional database storage. User roles (Students, Interns, Team Leaders, Administrators) interact with dedicated interface views enforcing strict Role-Based Access Control (RBAC).`,
        subtopics: [
          "System Scope & Core Business Domain",
          "Architectural Paradigm: Client-Server REST Monolith",
          "Multi-Tenant User Roles & RBAC Matrix",
          "Data Flow & Event Lifecycle",
          "Security, Privacy & Audit Trail Requirements",
          "Performance SLAs & System Scalability Boundaries"
        ],
        sections: [
          {
            heading: "1. Executive Summary & System Domain",
            content: `The ${projName} provides an automated digital infrastructure replacing traditional manual processes. It operates seamlessly across modern browsers, offering real-time synchronization, interactive dashboards, and automated report generation. The system handles concurrent user actions securely using stateless JSON Web Token (JWT) authorization header validation.`,
            bulletPoints: [
              "High-availability operational uptime target: 99.9%.",
              "Stateless REST API communication over HTTPS.",
              "Dual storage architecture (Local JSON fallback + Live MongoDB Cloud sync).",
              "Automatic activity auditing for regulatory compliance."
            ]
          },
          {
            heading: "2. Key System Modules & Architectural Components",
            content: `The system comprises modular components including Authentication Gateway, User Management Directory, Task & Progress Tracking Engine, Real-time Camera Work Monitor, and Report Generator.`,
            bulletPoints: [
              "Frontend: Single Page Application (SPA) with responsive CSS flexbox/grid layout.",
              "Backend: Node.js Express server handling JSON payloads up to 12MB.",
              "Database: Mongoose ORM schema modeling with automatic indexing."
            ]
          }
        ]
      };

    case "Problem & Solution":
      return {
        introduction: `Traditional approaches to ${projName} rely heavily on manual recordkeeping, fragmented spreadsheets, and uncoordinated communication channels. These legacy workflows lead to data inconsistencies, loss of audit trails, delayed processing times, and security vulnerabilities. The ${projName} solves these issues by establishing a centralized, real-time web portal that automates validation, tracks progress, and ensures data integrity.`,
        subtopics: [
          "Identified Legacy Bottlenecks & Operational Inefficiencies",
          "Digital Transformation Strategy & Value Proposition",
          "Automated System Architecture vs Manual Spreadsheets",
          "Real-Time Audit Trails & Data Encryption Standards",
          "Scalability, Reliability & Error Recovery Mechanisms"
        ],
        sections: [
          {
            heading: "1. Comprehensive Problem Analysis",
            content: `Manual tracking methods suffer from human error, lack of centralized authorization, and vulnerability to data corruption. Without automated validation and logging, management lacks visibility into operational progress and compliance status.`,
            bulletPoints: [
              "Risk of duplicate or conflicting records during peak usage.",
              "Lack of immutable audit trail for security investigations.",
              "Inefficient manual file exports and delayed reporting cycles."
            ]
          },
          {
            heading: "2. The Digital Web Solution",
            content: `By consolidating business logic into standardized REST API endpoints and deploying an intuitive web dashboard, ${projName} provides instant visibility, verified progress tracking, and secure database persistence.`,
            bulletPoints: [
              "Instant data updates with sub-200ms API response time.",
              "Cryptographic password hashing and token-based authentication.",
              "Automated Excel and JSON report exports on demand."
            ]
          }
        ]
      };

    case "Requirements":
      return {
        introduction: `Defining clear functional and non-functional requirements is critical for building a robust implementation of ${projName}. Functional requirements dictate what the system does (user onboarding, data entry, reports, state transitions), while non-functional requirements dictate system quality attributes (performance, security, usability, reliability).`,
        subtopics: [
          "Functional Requirements Specifications (FRS)",
          "Non-Functional Requirements (NFRs: SLA, Security, Speed)",
          "Hardware, Software & Network Prerequisites",
          "API Payload Validation & Error Handling Contracts",
          "Data Storage & Indexing SLAs"
        ],
        sections: [
          {
            heading: "1. Functional Requirements Matrix",
            content: `The application must enforce strict validation rules across all input forms and API requests.`,
            bulletPoints: [
              "User Authentication: Secure login with email/username and salted PBKDF2/JWT tokens.",
              "Dashboard Access: Role-specific view routing for Students and Admins.",
              "CRUD Operations: Complete Create, Read, Update, Delete capabilities with real-time UI updates.",
              "Persistent Notes & Audit Trail: Permanent storage of intern notes and administrative logs."
            ]
          },
          {
            heading: "2. Non-Functional Quality Attributes",
            content: `Quality attributes ensure the web portal performs reliably under production conditions.`,
            bulletPoints: [
              "Performance: API responses complete under 200 milliseconds.",
              "Security: OWASP Top 10 compliance including XSS, SQLi/NoSQLi prevention.",
              "Usability: Fully responsive layout across Desktop, Laptop, Tablet, and Mobile screens."
            ]
          }
        ]
      };

    case "Workflow":
      return {
        introduction: `The operational workflow of ${projName} governs how data moves from initial candidate selection through progress tracking, documentation reading, note-taking, and administrative review. Understanding this state machine prevents invalid state transitions and guarantees data consistency across sessions.`,
        subtopics: [
          "System State Machine & Transition Rules",
          "User Journey: Onboarding → Project Selection → Tracked Learning",
          "Admin Lifecycle: Candidate Approval → Course Management → Report Generation",
          "Exception Handling & Partial Failure Recovery",
          "Session Security & Token Invalidation Logic"
        ],
        sections: [
          {
            heading: "1. User & Intern Workflow Lifecycle",
            content: `1. User signs in on the modern login page.\n2. Candidate selects 4 core projects.\n3. Candidate opens project chapters, reads documentation, writes persistent notes, and completes quizzes.\n4. Work progress is tracked in real-time with camera focus indicators.`,
            bulletPoints: [
              "Session time tracking updates live every second.",
              "Notes are saved immediately to database with timestamp linkage.",
              "Completed chapters update progress statistics automatically."
            ]
          },
          {
            heading: "2. Administrator & Leadership Workflow",
            content: `Admins monitor candidate directory, review internship notes, edit project roadmaps, customize chapter documentation dynamically, and export comprehensive Excel workbooks.`,
            bulletPoints: [
              "Fixed left sidebar navigation allows instant tab switching.",
              "Modal overlays float at z-index 10000 to prevent text clipping.",
              "Bulk action tools enable batch chapter publishing or deletion."
            ]
          }
        ]
      };

    case "Modules":
      return {
        introduction: `The ${projName} codebase is partitioned into distinct functional modules. Modular decomposition enforces separation of concerns, simplifies maintenance, enables parallel developer collaboration, and optimizes test coverage.`,
        subtopics: [
          "Authentication & Role Authorization Module",
          "Student Directory & Candidate Management Module",
          "Projects Catalog & Dynamic Roadmap Module",
          "Progress & Time Tracking Module",
          "Persistent Intern Notes Directory Module",
          "Documentation Management Engine (CRUD)",
          "Audit Logging & Report Export Module"
        ],
        sections: [
          {
            heading: "1. Core System Modules Overview",
            content: `Each module contains its own API endpoints, database schemas, and UI components.`,
            bulletPoints: [
              "Authentication: Manages credentials, hashing, JWT token verification.",
              "Projects Roadmap: Renders active projects, tech stack badges, and chapter previews.",
              "Documentation Management: Full chapter editor with reordering, draft/published status, and bulk actions."
            ]
          }
        ]
      };

    case "Architecture":
      return {
        introduction: `The system utilizes a modern 3-Tier Layered Web Architecture comprising Presentation Layer (HTML/CSS/JS frontend SPA), Business Logic Layer (Node.js/Express REST server), and Data Persistence Layer (Mongoose + JSON database engine).`,
        subtopics: [
          "3-Tier Architecture & Data Flow",
          "Single Page Application (SPA) Rendering Cycle",
          "RESTful Service Contracts & JSON Payload Formats",
          "Dual Persistence Engine: JSON + MongoDB Atlas Sync",
          "Middleware Pipeline: Auth, Logger, Error Handler"
        ],
        sections: [
          {
            heading: "1. Architectural Layer Breakdown",
            content: `Client requests travel through the Nginx/Serve presentation layer, hit the Express router middleware pipeline, execute business logic controllers, and commit changes to database storage.`,
            bulletPoints: [
              "Stateless HTTP requests decoupled from client UI state.",
              "CORS-enabled cross-origin communication.",
              "Synchronous JSON write queue mirrored to MongoDB Atlas in real-time."
            ]
          }
        ]
      };

    case "Database":
      return {
        introduction: `Data persistence in ${projName} relies on a structured schema design supporting users, projects, chapters, intern notes, camera work logs, and audit trails. Fast query execution is guaranteed through indexed lookup keys.`,
        subtopics: [
          "Entity-Relationship Diagram (ERD) & Collection Schemas",
          "Users Schema & Authentication Hashes",
          "Projects & Dynamic Documentation Schemas",
          "Intern Notes Linkage: Student ID + Project ID + Chapter ID",
          "Database Indexing Strategy & Mongoose Schema Validation"
        ],
        sections: [
          {
            heading: "1. Database Collections & Schemas",
            content: `The database maintains collections for 'users', 'projects', 'documentation', 'notes', and 'auditLogs'.`,
            bulletPoints: [
              "users: Stores profile details, progress state, selected project IDs.",
              "notes: Stores linked student notes with date/time stamps.",
              "documentation: Stores dynamic chapter titles, subtopics, code snippets, and order."
            ]
          }
        ]
      };

    case "APIs":
      return {
        introduction: `The RESTful API provides standardized HTTP interfaces for querying and modifying system state. Routes follow REST conventions: GET for fetching, POST for creating, PUT for updating, and DELETE for removal.`,
        subtopics: [
          "REST API Endpoint Specification & Path Conventions",
          "Authentication Middleware Header (Bearer Token / x-admin-password)",
          "Request Validation Schemas & Payload Limits",
          "Standard HTTP Status Code Responses (200, 201, 400, 401, 403, 404, 500)",
          "JSON Response Contracts & Error Wrappers"
        ],
        sections: [
          {
            heading: "1. Core API Endpoints List",
            content: `Standardized endpoint URLs allow seamless frontend state synchronization.`,
            bulletPoints: [
              "POST /api/auth/student-login: Student login endpoint.",
              "GET /api/documentation/:projectId: Fetch dynamic chapter docs for project.",
              "POST /api/admin/documentation/:projectId/chapters: Add chapter (Admin only)."
            ]
          }
        ]
      };

    case "Security":
      return {
        introduction: `Security is implemented across all system tiers according to OWASP guidelines. Passwords are encrypted using salted PBKDF2 hashing, sessions rely on signed JWTs, and all mutation endpoints enforce strict role checks.`,
        subtopics: [
          "OWASP Top 10 Mitigation Strategies",
          "Salted Hashing (PBKDF2 1000 iterations, SHA-512)",
          "JWT Session Token Verification & Protection",
          "Input Sanitization, XSS & Injection Prevention",
          "CORS Policy & Secure HTTP Headers"
        ],
        sections: [
          {
            heading: "1. Defense-in-Depth Security Controls",
            content: `All client inputs are sanitized before database queries execution to prevent code injection attacks.`,
            bulletPoints: [
              "No plaintext passwords are ever stored in the database.",
              "Admin endpoints enforce Bearer token verification.",
              "Security audit logs capture all sensitive administrative operations."
            ]
          }
        ]
      };

    case "UI/UX":
      return {
        introduction: `The UI/UX design emphasizes modern aesthetics, vibrant visual hierarchy, smooth transitions, dark navy sidebars, responsive card grids, and high contrast typography (Inter / System Fonts).`,
        subtopics: [
          "Design Tokens: Navy (#0f172a), Slate (#1e293b), Emerald (#10b981), Blue (#3b82f6)",
          "Fixed Left Sidebar & Responsive Drawer (< 992px)",
          "Modal Z-Index Hierarchy (Z-Index: 10000)",
          "Micro-Animations & Dynamic Hover States",
          "Accessibility Standards (WCAG 2.1 Compliance)"
        ],
        sections: [
          {
            heading: "1. Visual Design System & Aesthetics",
            content: `Clean spacing, subtle box shadows, rounded card radii (12px-14px), and clear status badges ensure an intuitive user experience.`,
            bulletPoints: [
              "Modal overlays float above all sticky headers to eliminate header overlap.",
              "Clear color cues for Published (green) vs Draft (amber) statuses.",
              "Responsive grid adjusts smoothly from mobile screens up to 4K displays."
            ]
          }
        ]
      };

    case "Code Examples":
      return {
        introduction: `Production-ready reference implementations illustrate standard patterns for backend controllers, database schema modeling, authentication middleware, and frontend API consumption.`,
        subtopics: [
          "Express Controller Async Endpoint Pattern",
          "Mongoose Schema & Dual Sync Persistence Handler",
          "JWT Auth Middleware Implementation",
          "Frontend API Fetch Helper with Toast Notifications",
          "Dynamic Documentation Rendering Engine"
        ],
        sections: [
          {
            heading: "1. Backend Controller Reference Code",
            content: `Standard Express async handler with input validation and audit logging.`,
            bulletPoints: [
              "Validates required payload keys before database mutations.",
              "Appends timestamp and logs administrative activity.",
              "Returns formatted JSON success/failure responses."
            ]
          }
        ]
      };

    case "Testing":
      return {
        introduction: `Quality assurance involves unit testing server utility functions, automated API endpoint testing via node scripts, and manual UI verification across responsive breakpoints.`,
        subtopics: [
          "Unit Testing Business Logic & Helper Functions",
          "API Endpoint Integration Test Suite (`node test.js`)",
          "Database Persistence & Fallback Recovery Tests",
          "UI Component Responsiveness & Cross-Browser Verification",
          "Edge Case Validation: Missing Fields, Invalid Passwords, Expired Tokens"
        ],
        sections: [
          {
            heading: "1. Automated Test Execution",
            content: `The project includes an automated verification script (\`node test.js\`) verifying authentication, database connectivity, and note APIs before deployment.`,
            bulletPoints: [
              "Clean execution with zero errors required for production releases.",
              "Validates dual-write JSON and MongoDB Atlas connectivity.",
              "Checks security middleware against unauthorized requests."
            ]
          }
        ]
      };

    case "Deployment":
      return {
        introduction: `Deploying ${projName} involves building static frontend assets, configuring environment variables (\`.env\`), setting up PM2 / Node server process management, and establishing Nginx reverse proxy routing over HTTPS.`,
        subtopics: [
          "Environment Variables Configuration (`.env`)",
          "Backend Production Server Initialization (`node server.js`)",
          "Frontend Static Asset Serving (`npx serve .` / Nginx)",
          "MongoDB Atlas Cloud Cluster Connection Setup",
          "Process Monitoring & Automated Crash Restart Strategy"
        ],
        sections: [
          {
            heading: "1. Deployment Step-by-Step Guide",
            content: `Follow the standardized production deployment steps:`,
            bulletPoints: [
              "Step 1: Configure backend/.env with PORT, JWT_SECRET, and MONGODB_URI.",
              "Step 2: Install dependencies using `npm install` in backend directory.",
              "Step 3: Run automated test suite `node test.js` to confirm validation.",
              "Step 4: Launch production server via `npm start` or PM2 process manager."
            ]
          }
        ]
      };

    case "Assignment":
      return {
        introduction: `Hands-on practical assignment designed to test candidates on constructing full-stack features for ${projName}. Candidates implement backend API controllers, database schemas, and responsive UI components.`,
        subtopics: [
          "Milestone 1: Environment Setup & Codebase Inspection",
          "Milestone 2: Database Schema & REST API Implementation",
          "Milestone 3: Frontend UI Integration & State Handling",
          "Milestone 4: Testing, Security & Audit Logging Verification",
          "Milestone 5: Git Commit & GitHub Repository Submission"
        ],
        sections: [
          {
            heading: "1. Assignment Submission Requirements",
            content: `Complete all milestone deliverables, verify that all automated unit tests pass, commit changes to GitHub, and submit your live repository URL.`,
            bulletPoints: [
              "All feature routes must enforce JWT authentication where required.",
              "UI views must be fully responsive across desktop and mobile devices.",
              "Git commit history must contain clear atomic commit messages."
            ]
          }
        ]
      };

    case "Quiz":
      return {
        introduction: `Interactive knowledge evaluation quiz assessing candidate comprehension of ${projName} architecture, REST API design, security practices, and database management.`,
        subtopics: [
          "Question 1: Frontend vs Backend Security Responsibilities",
          "Question 2: RESTful Endpoint Conventions & Status Codes",
          "Question 3: Database Transactions & Indexing Efficiency",
          "Question 4: Authentication vs Authorization Mechanics"
        ],
        sections: [
          {
            heading: "1. Quiz Completion Rules",
            content: `Select the correct answer for each technical question and submit for instant evaluation. Quiz completion is recorded permanently in student progress statistics.`,
            bulletPoints: [
              "Requires 100% score to pass quiz evaluation.",
              "Quiz results sync automatically with Admin Dashboard reports.",
              "Quiz completion badge displays on candidate profile."
            ]
          }
        ]
      };

    case "References":
    default:
      return {
        introduction: `Official documentation links, architectural standards, specification guides, and engineering references for building production-grade web applications with React, Node.js, Express, and MongoDB.`,
        subtopics: [
          "Official React Documentation (react.dev)",
          "Express.js API Reference & Middleware Guide",
          "Node.js Runtime & Async Patterns",
          "MongoDB Atlas & Mongoose ODM Documentation",
          "OWASP Top 10 Web Security Standards",
          "MDN Web Docs - JavaScript & Web APIs"
        ],
        sections: [
          {
            heading: "1. Core Documentation Resources",
            content: `Reference standard web specifications and official documentation while developing and debugging your modules.`,
            bulletPoints: [
              "MDN Web Docs: Developer guides for JS, HTML5, CSS3, Fetch API.",
              "OWASP Foundation: Web application security risks and guidelines.",
              "GitHub Docs: Version control, branching strategies, and pull requests."
            ]
          }
        ]
      };
  }
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
    db.notes = Array.isArray(db.notes) ? db.notes : [];
    db.projects = Array.isArray(db.projects) && db.projects.length ? db.projects : [...DEFAULT_PROJECTS];
    db.documentation = Array.isArray(db.documentation) ? db.documentation : [];
    db.domains = Array.isArray(db.domains) && db.domains.length ? db.domains : [...DEFAULT_DOMAINS];

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

    db.projects.forEach(p => {
      p.domain = p.domain || "Web Development";
      p.level = p.level || p.difficulty || "Intermediate";
      p.difficulty = p.difficulty || p.level || "Intermediate";

      let doc = db.documentation.find(d => d.projectId === p.id);
      if (!doc) {
        doc = getDefaultDocumentationForProject(p);
        db.documentation.push(doc);
      }
    });

    (db.users || []).forEach(u => normalizeUser(u));

    return db;
  }
  catch{
    const defaultDoc = DEFAULT_PROJECTS.map(p => getDefaultDocumentationForProject(p));
    return {users:[], leaders:[], auditLogs:[], notes:[], projects: DEFAULT_PROJECTS, domains: DEFAULT_DOMAINS, documentation: defaultDoc};
  }
}
function write(db){
  db.users=Array.isArray(db.users)?db.users:[];
  db.leaders=Array.isArray(db.leaders)?db.leaders:[];
  db.auditLogs=Array.isArray(db.auditLogs)?db.auditLogs:[];
  db.notes=Array.isArray(db.notes)?db.notes:[];
  db.projects=Array.isArray(db.projects)?db.projects:DEFAULT_PROJECTS;
  db.domains=Array.isArray(db.domains)&&db.domains.length?db.domains:DEFAULT_DOMAINS;
  db.documentation=Array.isArray(db.documentation)?db.documentation:[];
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
  const totalWorkSeconds=history.reduce((sum,item)=>sum+Number(item.durationSeconds||0),0);
  const totalFocusedSeconds=history.reduce((sum,item)=>sum+Number(item.focusedSeconds||0),0);
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
      camera.addRow([
        u.username||"",u.name||"",item.projectId||"",item.chapterIndex??"",
        item.startedAt||"",item.stoppedAt||"",item.durationSeconds||0,
        item.focusedSeconds||0,item.attentionPercent||0,item.active?"Active":"Completed"
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

function normalizeUser(u){
  u.role=u.role||"STUDENT";
  u.department=u.department||"Computer Science";
  u.year=u.year||"Final Year";
  u.domain=u.domain||"Web Development";
  u.selectedProjects=Array.isArray(u.selectedProjects)?u.selectedProjects:[];
  u.progress=u.progress&&typeof u.progress==="object"?u.progress:{};
  u.dailyActivity=u.dailyActivity&&typeof u.dailyActivity==="object"?u.dailyActivity:{};

  const assigned=u.selectedProjects;
  const completed=assigned.filter(id=>u.progress?.[id]?.status==="completed").length;
  if(!u.status){
    if(assigned.length===4 && completed===4) u.status="completed";
    else if(assigned.length>0) u.status="active";
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
  if(!u && (password === STUDENT_DEFAULT_PASSWORD || password === PASSWORD || password === "Aparitech123@" || password === "Aparaitech123@")){
    u = {
      id:"usr_"+Date.now(),
      name:userQuery,
      username:userQuery,
      email:userQuery.includes("@")?userQuery.toLowerCase():`${userQuery.toLowerCase()}@aparaitech.local`,
      password:hashPassword(password),
      college:"",
      department:"Computer Science",
      year:"Final Year",
      status:"pending",
      role:"STUDENT",
      selectedProjects:[],
      progress:{},
      dailyActivity:{},
      cameraProofs:[],
      cameraWorkHistory:[],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    db.users.push(u);
    log(db,u.id,"STUDENT_AUTO_REGISTERED",{username:u.username});
  }
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

  // If student is not registered yet, auto-register student on first login
  if (!student) {
    const cleanUser = userQuery.includes("@") ? userQuery.split("@")[0] : userQuery;
    student = {
      id: "usr_" + Date.now(),
      name: cleanUser,
      username: cleanUser,
      email: userQuery.includes("@") ? userQuery.toLowerCase() : `${userQuery.toLowerCase()}@aparaitech.local`,
      password: hashPassword(password),
      college: "",
      department: "Computer Science",
      year: "Final Year",
      status: "pending",
      role: "STUDENT",
      selectedProjects: [],
      progress: {},
      dailyActivity: {},
      cameraProofs: [],
      cameraWorkHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(student);
    log(db, student.id, "STUDENT_AUTO_REGISTERED", { username: student.username });
  }

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

  return res.status(401).json({message:"Invalid Email/Username or Password."});
});

app.post("/api/leader/students",leaderAuth,(req,res)=>{
  const{name,username,email="",college="",department="Computer Science",year="Final Year",domain="Web Development"}=req.body||{};
  if(!name||!username)return res.status(400).json({message:"Student name and username are required."});
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
    students = students.filter(s => String(s.department).toLowerCase() === String(department).toLowerCase());
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
  const totalProjects = 10;

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

    const dept = u.department || "Computer Science";
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

app.post("/api/projects/:id/quiz",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);normalizeUser(u);
  const p=u.progress[req.params.id];
  if(!p)return res.status(404).json({message:"Project not selected."});
  if(p.status==="locked")return res.status(403).json({message:"Project is locked."});
  const passed=req.body?.answer==="backend";
  p.quizPassed=passed;p.quizScore=passed?100:0;
  log(db,u.id,"QUIZ_ATTEMPT",{projectId:req.params.id,passed,score:p.quizScore});
  write(db);
  if(!passed)return res.status(400).json({message:"Quiz not passed. Review security and try again."});
  res.json({message:"Quiz passed successfully.",quizScore:p.quizScore});
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



app.get("/api/camera-work/summary",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  const history=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const totalWorkSeconds=history.reduce((sum,item)=>sum+Number(item.durationSeconds||0),0);
  const totalFocusedSeconds=history.reduce((sum,item)=>sum+Number(item.focusedSeconds||0),0);
  const averageAttentionPercent=totalWorkSeconds>0
    ? Math.round(totalFocusedSeconds/totalWorkSeconds*100)
    : 0;
  res.json({
    totalSessions:history.length,
    totalWorkSeconds,
    totalFocusedSeconds,
    averageAttentionPercent
  });
});

app.post("/api/camera-work/start",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  u.cameraWorkSession={
    active:true,
    startedAt:new Date().toISOString(),
    projectId:req.body?.projectId||null,
    chapterIndex:req.body?.chapterIndex??null
  };
  log(db,u.id,"CAMERA_WORK_STARTED",u.cameraWorkSession);
  write(db);
  res.json({message:"Camera work session started.",session:u.cameraWorkSession});
});

app.post("/api/camera-work/stop",auth,(req,res)=>{
  const db=read(),u=getUser(db,req.auth.userId);
  if(!u)return res.status(404).json({message:"User not found."});
  const durationSeconds=Math.max(0,Number(req.body?.durationSeconds||0));
  const focusedSeconds=Math.min(
    durationSeconds,
    Math.max(0,Number(req.body?.focusedSeconds||0))
  );
  const attentionPercent=durationSeconds>0
    ? Math.round(focusedSeconds/durationSeconds*100)
    : 0;
  u.cameraWorkHistory=Array.isArray(u.cameraWorkHistory)?u.cameraWorkHistory:[];
  const session={
    ...(u.cameraWorkSession||{}),
    active:false,
    stoppedAt:new Date().toISOString(),
    durationSeconds,
    focusedSeconds,
    attentionPercent,
    projectId:req.body?.projectId || u.cameraWorkSession?.projectId || null,
    chapterIndex:req.body?.chapterIndex ?? u.cameraWorkSession?.chapterIndex ?? null
  };
  u.cameraWorkHistory.push(session);
  if(u.cameraWorkHistory.length>500)u.cameraWorkHistory=u.cameraWorkHistory.slice(-500);
  u.cameraWorkSession=null;
  log(db,u.id,"CAMERA_WORK_STOPPED",{
    durationSeconds,
    focusedSeconds,
    attentionPercent,
    projectId:session.projectId,
    chapterIndex:session.chapterIndex
  });
  write(db);
  res.json({message:"Camera work session saved.",session});
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

const server = app.listen(PORT,()=>console.log(`🚀 Backend running on http://localhost:${PORT}`))
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is currently occupied by another process. Kill process on port ${PORT} or run: npx kill-port ${PORT}`);
    } else {
      console.error("Server error:", err);
    }
  });
