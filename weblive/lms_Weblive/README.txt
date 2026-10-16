APARAITECH ONE-TIME PROJECT SELECTION + AUTOMATIC EXCEL REPORT PORTAL

UPDATED STUDENT FLOW
1. Team leader creates a student username.
2. Student logs in using username and default password Aparitech123@.
3. Student chooses exactly 4 projects only once.
4. The selection is permanently locked.
5. On future logins, the project selection screen does not appear.
6. The student goes directly to the selected-project dashboard.
7. Project 1 is unlocked; remaining projects unlock sequentially.
8. Camera, work-time and attention tracking start when a tracked project opens.

AUTOMATIC EXCEL REPORT
Backend automatically generates:
backend/reports/student_work_report.xlsx

The Excel workbook contains:
- Student Summary
- Project Progress
- Daily Activity
- Camera Sessions
- Camera Proofs

Team leader dashboard includes:
- View Excel Data
- Download Excel
- Automatic report status
- Student progress table

REMOVED
- Toggle Watermark
- Export Report button

TEAM LEADER LOGIN
Username: teamleader
Password: Leader123@

STUDENT DEFAULT PASSWORD
Aparitech123@

RUN BACKEND
cd backend
npm install
npm test
npm start

RUN FRONTEND
cd frontend
npx serve .
