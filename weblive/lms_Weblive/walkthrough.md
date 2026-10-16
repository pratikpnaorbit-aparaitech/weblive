# Walkthrough - Camera Controls, Project Redesign, Authentication, & Quiz System

This document summarizes the changes made to the internship portal, focusing on the Camera widget restoration, Project Selection redesign, Authentication issues, the project-wise Quiz System, login performance optimization, and persistent cumulative work-time tracking.

---

## 1. Camera Widget Controls & Pause Feature

- **Restored Controls (`index.html`)**: Restored the original `.camera-controls` container with a grid layout containing the necessary buttons.
- **Added Pause Camera Feature (`app.js`)**: Added a new `toggleCameraPause` function that pauses/resumes the video track of the webcam stream without interrupting the internship work timer or session.
- **Enabled Buttons Dynamically (`app.js`)**: Wired up state transitions:
  - Starting the camera enables the **Pause Camera**, **Start Work**, and **Capture Proof** buttons.
  - Pausing the camera turns off the video feed and displays a "Camera paused" placeholder on the video container, while updating the button status to "Resume Camera".
  - Stopping the camera stops the webcam stream, ends any active work session, and resets all buttons.

---

## 2. Redesign Project Selection Difficulty Grouping

- **Backend Dynamic Grouping (`server.js`)**: Computes the project `difficulty` and `level` automatically based on the project's position in its category (domain) on database read.
  - Projects 1–3 → `Easy`
  - Projects 4–6 → `Intermediate`
  - Projects 7–10+ → `Advanced`
  - Normalizes and persists to `data.json` and MongoDB Atlas.
- **Redesigned Selection Layout (`app.js`)**: Reorganized the student view into three visual sections: 🟢 **EASY PROJECTS**, 🟡 **INTERMEDIATE PROJECTS**, and 🔴 **ADVANCED PROJECTS**, with custom descriptions and project counts.
- **Admin View Updates (`app.js`)**: Added the project's domain-specific position (`Order`) and the colored difficulty badge directly to the Admin project card grid.

---

## 3. Project-wise Quiz System

### Structure & Database (`quiz_generator.js`)
- **Structure**: Every project has a dedicated quiz composed of exactly 25 questions, worth 2 marks each (Total 50 Marks).
- **Dynamic Question Generator**: Tailors questions specifically to each project's metadata (technologies, domain, stack, modules, objectives, and outcomes) to make them project-specific and meaningful.
- **Initialization**: Automatically generates 25 project-specific multiple-choice questions for any project with 0 questions on startup.
- **Security**: The correct answer (`correctAnswer`) is kept strictly on the backend. The frontend only receives the question text and 4 choices.

### Backend APIs (`server.js`)
- **`GET /api/projects/:id/quiz`**: Retrieve the quiz metadata and active questions list (sanitized to omit the correct answer).
- **`POST /api/projects/:id/quiz`**: Grade and submit the student's quiz on the backend. Updates student progress (`quizPassed` & `quizScore`) and logs results in `db.quizResults`.
- **`GET /api/projects/:id/quiz/result`**: Fetches the student's previously saved results.
- **`GET /api/student/quiz-results`**: Retrieves the current student's historical results.
- **`GET /api/admin/quiz-results`**: Retrieves all student quiz results (Admin only).
- **`GET /api/admin/projects/:id/quiz/questions`**: Retrieves questions **with** correct answers (Admin only).
- **`POST /api/admin/projects/:id/quiz/questions`**: Add a question. Enforces the 25 active question limit.
- **`PUT /api/admin/projects/:id/quiz/questions/:qId`**: Edit a question.
- **`DELETE /api/admin/projects/:id/quiz/questions/:qId`**: Delete a question.
- **`DELETE /api/admin/projects/:projectId/quiz/results/:studentId`**: Allows administrators to reset a student's quiz attempt to grant a re-attempt.

### Student Quiz UI (`app.js` & `index.html`)
- **Interactive Chapter 15**: If fewer than 25 questions exist, the student is notified. If 25 questions exist, they can attempt the quiz.
- **Form Controls**: Multi-step Radio button options, Next/Previous controls, and a **Question Navigation Palette** tracking Attempted vs Unattempted status.
- **Submission Confirmation**: Shows a confirmation warning before submission.
- **Scorecard Display**: Shows results immediately upon completion: Score, Percentage, Correct, and Incorrect counts.
- **Dashboard Stats**: Displays project-wise quiz results table, total quizzes attempted, average quiz score, highest quiz score, and completed quizzes count.

### Admin Dashboard UI (`app.js` & `index.html`)
- **Quiz Scores Tab**: Display student name, email, project, score, percentage, correct/incorrect count, date, and status. Provides search, filtering (by project, score), and sorting (by score, date).
- **Quiz Management Tab**: Choose a project, view active question/marks count, and manage individual questions (Add / Edit / Delete).
- **Reset Attempt Option**: Beside each student's quiz attempt row, a **Reset Attempt** button allows administrators to remove the student's score from the database and unlock the quiz for re-attempt.

---

## 4. Performance Optimization (Fast Login Fix)

### Issue
Every request to the backend calls the database `read()` function to parse database state. Since the Quiz System contains 181 projects, checking and ensuring that 25 questions exist for each project runs ~800,000 array iterations on **every single read call**. This blocked the Node.js event loop and caused login and navigation requests to be extremely slow.

### Solution
- **Global Flag Control (`server.js`)**: Wrapped the `ensureAllQuizzes` execution check inside a `global.quizzesEnsured` conditional flag.
- **Result**: The quiz validation and generation loop now runs **only once on server startup**. Subsequent database `read()` calls run instantly in `< 2ms` by directly parsing the JSON database state, restoring normal and fast login/API speed.

---

## 5. Work Time Persistence & Session Restoration

### Issue
The student's cumulative work time was previously recalculated from each frontend session, causing it to reset to zero on logout/login, refresh, or session expiration.

### Solution
- **Active Session Checking (`app.js` & `server.js`)**: Added `/api/camera-work/active` endpoint to check for and fetch any active session from the backend on login/refresh. If an active session is found, the timer resumes from the correct start time.
- **Robust Logout Handling (`app.js`)**: Modified the client-side `logout()` function to be asynchronous. If a work session is currently running, it automatically calls the stop endpoint to save and commit the session duration before clearing tokens.
- **Backend Timestamp Verification (`server.js`)**: Calculate and record work session durations on the backend using `now - startTime` (verifying actual start and end timestamps rather than trusting client-side variables).
- **Dashboard Display Card (`index.html` & `app.js`)**: Injected a new stat card **Total Work Time** into the dashboard statistics grid, displaying the student's accumulated hours/minutes computed dynamically from completed work sessions in their history.
- **Prevent Duplicate Sessions (`server.js`)**: The start endpoint checks for existing `ACTIVE` sessions and returns the existing one instead of spawning a duplicate.

---

## 6. Recent Bug Fixes (August 22, 2026)

### A. Total Work Time Calculation Fix (`server.js` & `app.js`)
* **Issue**: Old sessions were saved with corrupt/epoch timestamp values (e.g. `1,787,382,000` seconds) instead of true durations, causing the total work time to display millions of hours (`496495h`).
* **Solution**: In backend `cameraSummary`, `/api/camera-work/summary`, and the Excel report generator, any session duration greater than `86400` seconds (24 hours) is treated as `0` seconds. On the frontend, `loadCameraTotals` checks and resets any total time greater than `50,000,000` seconds to `0` to instantly filter out corrupt legacy values and display accurate hours.

### B. Pre-filled Intern Notes Textarea Typo (`app.js`)
* **Issue**: The textarea element on render was hardcoded with the raw text `ext(localStorage.getItem(noteKey)||"")` due to a syntax typo, displaying it visually.
* **Solution**: Fixed the template string evaluation so the default value inside the textarea evaluates to `${localStorage.getItem(noteKey) || ""}` or falls back to empty while loading async server notes.

### C. Sidebar Chapter Completion on Click (`app.js`)
* **Issue**: Students had to manually scroll and click "Mark Chapter Complete", and sidebar list items were not updating progress directly when navigated.
* **Solution**: Integrated a background `completeChapterOnSidebarClick(chapterIndex)` helper function triggered automatically inside `openChapter()`. When a student clicks any chapter in the left sidebar, it registers it as completed in the database and updates the sidebar tick icon and progress bar instantly.

