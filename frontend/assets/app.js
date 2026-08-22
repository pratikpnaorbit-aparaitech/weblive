
"use strict";

const API = "https://weblive-qvzp.onrender.com/api";
const $ = id => document.getElementById(id);
const state = {
  token: localStorage.getItem("aprToken") || "",
  leaderToken: localStorage.getItem("aprLeaderToken") || "",
  role: localStorage.getItem("aprRole") || "",
  user: null,
  currentProject: null,
  currentChapter: 0,
  selected: [],
  publicMode: false,
  sessionSeconds: 0,
  sessionTimer: null,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth()
};

let adminStudentsCache = [];

async function api(path, options = {}) {
  let response;
    try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    response = await fetch(API + path, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    const isLocal = API.includes("localhost") || API.includes("127.0.0.1");
    throw new Error(isLocal ? "Backend is offline. Run backend using npm start." : "Connection failed. Hosted backend is starting up or unreachable. Please try again in a few seconds.");
  }
  const data = await response.json().catch(() => ({ message: "Invalid server response." }));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function notify(message, type = "success") {
  const toast = $("toast");
  if (!toast) return alert(message);
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.className = "toast", 2400);
}

function updateNav() {
  const isLogged = Boolean(state.token || state.leaderToken);
  const isStudent = state.role === "STUDENT" || (Boolean(state.token) && !state.leaderToken);
  const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);

  $("navLoginBtn")?.classList.toggle("hidden", isLogged);
  $("navStudentDashBtn")?.classList.toggle("hidden", !isLogged || !isStudent);
  $("navAdminDashBtn")?.classList.toggle("hidden", !isLogged || !isAdmin);
  $("logoutBtn")?.classList.toggle("hidden", !isLogged);
}

function show(id) {
  const isLogged = Boolean(state.token || state.leaderToken);
  const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);

  // If user is not logged in, block access to any protected view
  if (!isLogged && id !== "loginView") {
    notify("Please log in to access the portal.", "error");
    id = "loginView";
  }

  // Admin Route Shield: Admin users must NEVER land on student project selection or student dashboard
  if (isAdmin && (id === "selectView" || id === "dashboardView" || id === "homeView")) {
    id = "adminView";
  }

  // If user is already logged in and tries to access loginView
  if (isLogged && id === "loginView") {
    id = isAdmin ? "adminView" : ((state.user?.selectedProjects || []).length >= 4 ? "dashboardView" : "selectView");
  }

  // Admin route protection for non-admins
  if (id === "adminView" && !isAdmin) {
    notify("Admin credentials required to access the Admin Panel.", "error");
    id = "loginView";
  }
  
  if (state.token && state.role === "STUDENT" && id === "selectView" && (state.user?.selectedProjects || []).length >= 4) {
    id = "dashboardView";
    renderDashboard();
  }

  ["homeView","loginView","adminView","leaderView","selectView","dashboardView","docView"].forEach(viewId => $(viewId)?.classList.add("hidden"));
  $(id)?.classList.remove("hidden");
  document.body.classList.toggle("on-login-page", id === "loginView");
  document.body.classList.toggle("on-admin-page", id === "adminView");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateNav();

  if (id === "homeView") {
    renderHome();
  }
}

async function renderHome() {
  await loadProjects();

  const normalize = s => String(s || "").trim().toLowerCase();
  const isStudent = state.role === "STUDENT" || Boolean(state.token && !state.leaderToken);
  const studentDomain = isStudent ? (state.user?.domain || "Web Development") : null;

  let projects = window.PROJECTS || [];
  if (studentDomain) {
    projects = projects.filter(p => normalize(p.domain || "Web Development") === normalize(studentDomain));
  }

  const uniqueProjSet = new Set((window.PROJECTS || []).map(p => String(p.id || '').trim().toLowerCase()).filter(Boolean));
  const globalCount = uniqueProjSet.size || (window.PROJECTS || []).length || 10;
  const domainLabel = studentDomain ? studentDomain : "Internship";

  // Dynamic UI Heading Updates
  if ($("topPortalTitle")) {
    $("topPortalTitle").textContent = `APARAITECH · ${domainLabel} Intern Documentation Portal`;
  }
  if ($("brandSubtext")) {
    $("brandSubtext").textContent = `Explore ${domainLabel} Internship Program · Choose 4 Projects · Complete Chapters · Pass Quiz · Submit GitHub`;
  }
  if ($("homeHeroHeading")) {
    $("homeHeroHeading").textContent = `APARAITECH ${domainLabel} Internship Program`;
  }
  if ($("homeHeroSubtext")) {
    $("homeHeroSubtext").textContent = `Welcome to your ${domainLabel} Internship Portal. To track your chapter completion, quiz results, work sessions, camera proofs, and time, click below to select your 4 projects.`;
  }
  if ($("homeStatAvailableCount")) {
    $("homeStatAvailableCount").textContent = globalCount;
  }
}

async function unifiedLogin() {
  const login = $("loginInput")?.value.trim();
  const password = $("loginPasswordInput")?.value;
  if (!login || !password) {
    return notify("Invalid Email/Password.", "error");
  }

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password })
    });

    state.role = data.role;
    localStorage.setItem("aprRole", data.role);

    if (data.role === "ADMIN") {
      state.leaderToken = data.token;
      state.token = data.token;
      localStorage.setItem("aprLeaderToken", data.token);
      localStorage.setItem("aprToken", data.token);
      notify("Authenticated successfully as Admin.");
      await renderAdminDashboard();
      show("adminView");
    } else {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem("aprToken", state.token);

      if ((state.user?.selectedProjects || []).length >= 4) {
        await renderDashboard();
        show("dashboardView");
        notify(`Welcome back, ${state.user.name || "Student"}!`);
      } else {
        renderSelection();
        show("selectView");
        notify("Choose exactly 4 projects to start your learning path.");
      }
    }
  } catch (error) {
    notify(error.message || "Invalid Email/Password.", "error");
  }
}

async function logout() {
  if (cameraState.working) {
    try {
      await stopCameraWorkSession();
    } catch (e) {
      console.error("Error stopping session on logout:", e);
    }
  }
  if (cameraState.stream) {
    stopWorkCamera();
  }
  state.token = "";
  state.leaderToken = "";
  state.user = null;
  state.role = "";
  localStorage.removeItem("aprToken");
  localStorage.removeItem("aprLeaderToken");
  localStorage.removeItem("aprRole");
  updateNav();
  show("loginView");
  notify("Logged out successfully.");
}

async function studentLogin() {
  const username = $("loginInput")?.value.trim() || $("studentUsername")?.value.trim();
  const password = $("loginPasswordInput")?.value || $("studentPassword")?.value;
  if (!username || !password) {
    return notify("Enter student username/email and password.", "error");
  }

  try {
    const data = await api("/auth/student-login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    state.token = data.token;
    state.user = data.user;
    state.role = "STUDENT";
    localStorage.setItem("aprToken", state.token);
    localStorage.setItem("aprRole", "STUDENT");

    if ((state.user.selectedProjects || []).length >= 4) {
      await renderDashboard();
      show("dashboardView");
    } else {
      renderSelection();
      show("selectView");
      notify("Choose exactly 4 projects to start your learning path.");
    }
  } catch (error) {
    notify(error.message, "error");
  }
}

async function leaderApi(path, options = {}) {
  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...((state.leaderToken || state.token) ? { Authorization: `Bearer ${state.leaderToken || state.token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("Backend is offline.");
  }
  const data = await response.json().catch(() => ({ message: "Invalid server response." }));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

async function leaderLogin() {
  const username = $("loginInput")?.value.trim() || $("leaderUsername")?.value.trim();
  const password = $("loginPasswordInput")?.value || $("leaderPassword")?.value;
  if (!username || !password) {
    return notify("Enter team leader username and password.", "error");
  }

  try {
    const data = await leaderApi("/auth/leader-login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    state.leaderToken = data.token;
    state.token = data.token;
    state.role = "ADMIN";
    localStorage.setItem("aprLeaderToken", state.leaderToken);
    localStorage.setItem("aprToken", state.token);
    localStorage.setItem("aprRole", "ADMIN");
    await renderAdminDashboard();
    show("adminView");
  } catch (error) {
    notify(error.message, "error");
  }
}

function toggleLoginRole(role) {
  switchLoginMode('unified');
}

async function createStudentAccount() {
  const name = $("legacyStudentName")?.value.trim() || $("newStudentName")?.value.trim();
  const username = $("legacyStudentUsername")?.value.trim() || $("newStudentUsername")?.value.trim();
  const email = $("legacyStudentEmail")?.value.trim() || $("newStudentEmail")?.value.trim();
  const college = $("legacyStudentCollege")?.value.trim() || $("newStudentCollege")?.value.trim();

  const payload = { name, username, email, college };
  if (!payload.name || !payload.username) {
    return notify("Student name and username are required.", "error");
  }
  try {
    const data = await leaderApi("/leader/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify(`Student created: @${data.student.username}`);
    ["legacyStudentName","legacyStudentUsername","legacyStudentEmail","legacyStudentCollege",
     "newStudentName","newStudentUsername","newStudentEmail","newStudentCollege"].forEach(id => $(id) && ($(id).value = ""));
    await renderAdminDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

/* ADMIN SIDEBAR & NAVIGATION CONTROLLERS */
function toggleAdminSidebar() {
  const adminView = $("adminView");
  if (adminView) {
    adminView.classList.toggle("show-sidebar");
  }
}

function switchAdminTab(tabName, clickedEl) {
  const links = document.querySelectorAll(".sidebar-link");
  links.forEach(link => link.classList.remove("active"));
  if (clickedEl) {
    clickedEl.classList.add("active");
  } else {
    const activeLink = document.querySelector(`.sidebar-link[data-tab="${tabName}"]`);
    if (activeLink) activeLink.classList.add("active");
  }

  const sections = document.querySelectorAll(".admin-tab-section");
  sections.forEach(sec => sec.classList.remove("active"));

  let targetId = `adminTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
  if (tabName === "docmgmt") targetId = "adminTabDocMgmt";

  const targetSection = $(targetId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  const titles = {
    overview: "Dashboard Overview",
    students: "Registered Students Directory",
    projects: "Available Internship Projects",
    progress: "Student Progress & Work Camera Tracking",
    notes: "Student Internship Notes Directory",
    docmgmt: "Dynamic Documentation Management System",
    reports: "Automatic Student Work Excel Reports",
    quizscores: "Student Quiz Attempt Scores",
    quizmgmt: "Interactive Quiz Questions Management",
    settings: "System Settings & Profile"
  };

  if ($("adminHeaderTitle")) {
    $("adminHeaderTitle").textContent = titles[tabName] || "Admin Dashboard";
  }

  if (window.innerWidth <= 992) {
    $("adminView")?.classList.remove("show-sidebar");
  }

  if (tabName === "projects") renderAdminProjectsGrid();
  if (tabName === "progress") renderLeaderDashboard();
  if (tabName === "notes") renderAdminNotes();
  if (tabName === "quizscores") renderAdminQuizScores();
  if (tabName === "quizmgmt") renderAdminQuizMgmt();
  if (tabName === "docmgmt") {
    populateDocAdminProjectSelect();
    loadAdminDocForSelectedProject();
  }
}

async function loadDomains() {
  try {
    const res = await api("/domains");
    if (res?.domains && Array.isArray(res.domains) && res.domains.length) {
      window.DOMAINS = res.domains;
    }
  } catch (err) {
    console.warn("Could not load dynamic domains, using default domains:", err.message);
  }

  const domains = window.DOMAINS || [
    "Web Development",
    "Cyber Security",
    "Artificial Intelligence (AI/ML)",
    "Cloud Computing"
  ];

  // 1. Update Admin Filter Dropdown
  const filterSelect = $("adminProjectDomainFilter");
  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = `<option value="">All Domains</option>` +
      domains.map(d => `<option value="${d}">${d}</option>`).join("");
    if (domains.includes(currentVal)) filterSelect.value = currentVal;
  }

  // 2. Update Create/Edit Project Modal Select
  const projDomainSelect = $("projFormDomain");
  if (projDomainSelect) {
    const currentVal = projDomainSelect.value;
    projDomainSelect.innerHTML = domains.map(d => `<option value="${d}">${d}</option>`).join("");
    if (domains.includes(currentVal)) projDomainSelect.value = currentVal;
  }

  // 3. Update Create Student Modal Select
  const studentDomainSelect = $("newStudentDomain");
  if (studentDomainSelect) {
    const currentVal = studentDomainSelect.value;
    studentDomainSelect.innerHTML = domains.map(d => `<option value="${d}">${d}</option>`).join("");
    if (domains.includes(currentVal)) studentDomainSelect.value = currentVal;
  }
}

function openAddDomainModal() {
  if ($("newDomainNameInput")) $("newDomainNameInput").value = "";
  $("addDomainModal")?.classList.add("show");
}

async function saveNewDomainForm() {
  const domainName = $("newDomainNameInput")?.value.trim();
  if (!domainName) {
    return notify("Domain name is required.", "error");
  }

  try {
    const res = await leaderApi("/admin/domains", {
      method: "POST",
      body: JSON.stringify({ name: domainName })
    });

    notify(res.message || `Domain "${domainName}" added successfully!`);
    $("addDomainModal")?.classList.remove("show");

    if (res?.domains) {
      window.DOMAINS = res.domains;
    }
    await loadDomains();
    await renderAdminProjectsGrid();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function loadProjects() {
  try {
    const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);
    const fetchFunc = isAdmin ? leaderApi : api;
    const path = isAdmin ? "/projects?all=true" : "/projects";
    const res = await fetchFunc(path);
    if (res?.projects && Array.isArray(res.projects) && res.projects.length) {
      window.PROJECTS = res.projects;
    }
  } catch (err) {
    console.warn("Could not load projects from API, using default projects:", err.message);
  }
}

async function renderAdminProjectsGrid() {
  await loadDomains();
  await loadProjects();
  const grid = $("adminProjectsGrid");
  if (!grid) return;

  const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);
  const filterDomain = $("adminProjectDomainFilter")?.value || "";

  const normalize = s => String(s || "").trim().toLowerCase();

  let projects = window.PROJECTS || [];
  if (filterDomain) {
    projects = projects.filter(p => normalize(p.domain || "Web Development") === normalize(filterDomain));
  }

  if (!projects.length) {
    grid.innerHTML = `<div class="empty-notice" style="padding:24px;text-align:center;color:var(--muted);grid-column:1/-1">No projects found matching selected domain criteria.</div>`;
    return;
  }

  grid.innerHTML = projects.map(p => {
    const statusBadgeClass = p.status === "inactive" ? "background:#fef3c7;color:#92400e" : "background:#dcfce7;color:#166534";
    const statusText = p.status === "inactive" ? "Inactive" : "Active";

    // Find the 1-based order of this project in its specific domain
    const categoryProjects = (window.PROJECTS || []).filter(proj => normalize(proj.domain || "Web Development") === normalize(p.domain || "Web Development"));
    const categoryOrder = categoryProjects.findIndex(proj => proj.id === p.id) + 1;

    // Premium custom badge styling for difficulty
    let diffBadgeStyle = "background:rgba(37,99,235,.1);color:var(--blue)";
    if (p.difficulty === "Easy") {
      diffBadgeStyle = "background:#dcfce7;color:#166534";
    } else if (p.difficulty === "Intermediate") {
      diffBadgeStyle = "background:#fef3c7;color:#92400e";
    } else if (p.difficulty === "Advanced") {
      diffBadgeStyle = "background:#fee2e2;color:#b91c1c";
    }

    return `
      <article class="panel project-card" style="background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-size:32px">${p.icon || "💻"}</span>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <span class="pill" style="font-size:11px;background:#e0f2fe;color:#0369a1">${p.domain || "Web Development"}</span>
              <span class="pill" style="font-size:11px;${diffBadgeStyle};font-weight:bold">${p.difficulty || "Intermediate"}</span>
              <span class="pill" style="font-size:11px;background:#f3f4f6;color:#374151;font-weight:bold">Order: ${categoryOrder}</span>
              <span class="pill" style="font-size:11px;${statusBadgeClass}">${statusText}</span>
            </div>
          </div>
          <h4 style="margin:0 0 6px;color:var(--navy);font-size:16px">${p.name || p.title}</h4>
          <p class="muted" style="font-size:13px;line-height:1.4;margin:0 0 12px">${p.summary}</p>
          <div style="margin-bottom:12px">
            <small class="muted" style="display:block;margin-bottom:4px"><b>Stack:</b> ${p.stack || "Full Stack Web"}</small>
            <small class="muted" style="display:block"><b>Duration:</b> ${p.duration || "4–6 Weeks"}</small>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--border)">
          <button class="btn primary btn-xs" type="button" onclick="openProjectDocument('${p.id}', true)">Preview Docs & Chapters</button>
          ${isAdmin ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <button class="btn outline btn-xs" type="button" onclick="openEditProjectModal('${p.id}')">✏️ Edit Project</button>
              <button class="btn danger btn-xs" type="button" onclick="deleteProjectConfirm('${p.id}')">🗑️ Delete</button>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function openCreateProjectModal() {
  if ($("projFormId")) $("projFormId").value = "";
  if ($("projFormName")) $("projFormName").value = "";
  if ($("projFormIcon")) $("projFormIcon").value = "💻";
  if ($("projFormSummary")) $("projFormSummary").value = "";
  if ($("projFormDescription")) $("projFormDescription").value = "";
  if ($("projFormDomain")) $("projFormDomain").value = "Web Development";
  if ($("projFormLevel")) $("projFormLevel").value = "Intermediate";
  if ($("projFormDuration")) $("projFormDuration").value = "4–6 Weeks";
  if ($("projFormStatus")) $("projFormStatus").value = "active";
  if ($("projFormStack")) $("projFormStack").value = "React, Node.js, Express, MongoDB";
  if ($("projFormObjective")) $("projFormObjective").value = "Build production-grade web application module.";
  if ($("projFormOutcomes")) $("projFormOutcomes").value = "Full-stack architecture, REST API integration";

  if ($("projectFormModalTitle")) $("projectFormModalTitle").textContent = "Create New Internship Project";
  $("projectFormModal")?.classList.add("show");
}

function openEditProjectModal(projectId) {
  const p = (window.PROJECTS || []).find(x => x.id === projectId);
  if (!p) return notify("Project not found.", "error");

  if ($("projFormId")) $("projFormId").value = p.id;
  if ($("projFormName")) $("projFormName").value = p.name || p.title || "";
  if ($("projFormIcon")) $("projFormIcon").value = p.icon || "💻";
  if ($("projFormSummary")) $("projFormSummary").value = p.summary || "";
  if ($("projFormDescription")) $("projFormDescription").value = p.description || p.summary || "";
  if ($("projFormDomain")) $("projFormDomain").value = p.domain || "Web Development";
  if ($("projFormLevel")) $("projFormLevel").value = p.level || p.difficulty || "Intermediate";
  if ($("projFormDuration")) $("projFormDuration").value = p.duration || "4–6 Weeks";
  if ($("projFormStatus")) $("projFormStatus").value = p.status || "active";
  if ($("projFormStack")) $("projFormStack").value = p.stack || "";
  if ($("projFormObjective")) $("projFormObjective").value = p.objective || "";
  if ($("projFormOutcomes")) $("projFormOutcomes").value = Array.isArray(p.outcomes) ? p.outcomes.join(", ") : (p.outcomes || "");

  if ($("projectFormModalTitle")) $("projectFormModalTitle").textContent = `Edit Project: ${p.name || p.title}`;
  $("projectFormModal")?.classList.add("show");
}

async function saveProjectForm() {
  const id = $("projFormId")?.value;
  const payload = {
    name: $("projFormName")?.value.trim(),
    icon: $("projFormIcon")?.value.trim(),
    summary: $("projFormSummary")?.value.trim(),
    description: $("projFormDescription")?.value.trim(),
    domain: $("projFormDomain")?.value || "Web Development",
    level: $("projFormLevel")?.value || "Intermediate",
    difficulty: $("projFormLevel")?.value || "Intermediate",
    duration: $("projFormDuration")?.value.trim(),
    status: $("projFormStatus")?.value,
    stack: $("projFormStack")?.value.trim(),
    objective: $("projFormObjective")?.value.trim(),
    outcomes: $("projFormOutcomes")?.value.split(",").map(s => s.trim()).filter(Boolean)
  };

  if (!payload.name || !payload.summary) {
    return notify("Project Name and Summary are required.", "error");
  }

  try {
    let res;
    if (id) {
      res = await leaderApi(`/admin/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      res = await leaderApi("/admin/projects", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    notify(res.message || "Project saved successfully.");
    $("projectFormModal")?.classList.remove("show");
    await renderAdminProjectsGrid();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function deleteProjectConfirm(projectId) {
  const p = (window.PROJECTS || []).find(x => x.id === projectId);
  if (!p) return;

  if (confirm(`Are you sure you want to delete "${p.name}"?\nExisting student progress records will remain safely intact.`)) {
    try {
      const res = await leaderApi(`/admin/projects/${projectId}`, {
        method: "DELETE"
      });
      notify(res.message || "Project deleted.");
      await renderAdminProjectsGrid();
    } catch (err) {
      notify(err.message, "error");
    }
  }
}

function openAdminDocChapterEdit() {
  if (!state.currentProject) return;
  const idx = state.currentChapter;
  const customChapters = state.currentProject.customChapters || [];
  const existing = customChapters.find(c => c.index === idx);

  if ($("editDocChapIndex")) $("editDocChapIndex").value = idx;
  if ($("editDocChapName")) $("editDocChapName").value = existing?.name || CHAPTERS[idx] || `Chapter ${idx + 1}`;
  if ($("editDocChapContent")) $("editDocChapContent").value = existing?.content || "";

  if ($("editDocChapterTitle")) $("editDocChapterTitle").textContent = `Edit Chapter ${idx + 1}: ${CHAPTERS[idx] || ''}`;
  $("editDocChapterModal")?.classList.add("show");
}

async function saveDocChapterFromModal() {
  if (!state.currentProject) return;
  const idx = Number($("editDocChapIndex")?.value || 0);
  const chapterName = $("editDocChapName")?.value.trim();
  const content = $("editDocChapContent")?.value;

  try {
    const res = await leaderApi(`/admin/projects/${state.currentProject.id}/chapters`, {
      method: "POST",
      body: JSON.stringify({
        chapterIndex: idx,
        chapterName,
        content
      })
    });

    notify(res.message || "Chapter documentation updated.");
    $("editDocChapterModal")?.classList.remove("show");

    state.currentProject.customChapters = state.currentProject.customChapters || [];
    let chap = state.currentProject.customChapters.find(c => c.index === idx);
    if (chap) {
      chap.name = chapterName;
      chap.content = content;
    } else {
      state.currentProject.customChapters.push({ index: idx, name: chapterName, content });
    }

    renderChapter();
  } catch (err) {
    notify(err.message, "error");
  }
}

/* ADMIN DASHBOARD FUNCTIONS */
async function renderAdminDashboard() {
  try {
    const stats = await leaderApi("/admin/stats");
    if ($("adminStatTotalStudents")) $("adminStatTotalStudents").textContent = stats.totalStudents || 0;
    if ($("adminStatTotalProjects")) $("adminStatTotalProjects").textContent = stats.totalProjects || 10;
    if ($("adminStatActiveStudents")) $("adminStatActiveStudents").textContent = stats.activeStudents || 0;
    if ($("adminStatCompletedStudents")) $("adminStatCompletedStudents").textContent = stats.completedStudents || 0;
    if ($("adminStatPendingStudents")) $("adminStatPendingStudents").textContent = stats.pendingStudents || 0;

    const total = stats.totalStudents || 1;
    if ($("adminStatusChart")) {
      $("adminStatusChart").innerHTML = `
        <div class="chart-bar-row">
          <span class="chart-label">Active</span>
          <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${Math.round(stats.activeStudents/total*100)}%;background:var(--blue)"></div></div>
          <span class="chart-val">${stats.activeStudents||0}</span>
        </div>
        <div class="chart-bar-row">
          <span class="chart-label">Completed</span>
          <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${Math.round(stats.completedStudents/total*100)}%;background:var(--green)"></div></div>
          <span class="chart-val">${stats.completedStudents||0}</span>
        </div>
        <div class="chart-bar-row">
          <span class="chart-label">Pending</span>
          <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${Math.round(stats.pendingStudents/total*100)}%;background:#f59e0b"></div></div>
          <span class="chart-val">${stats.pendingStudents||0}</span>
        </div>
      `;
    }

    const depts = Object.entries(stats.departmentCounts || {});
    if ($("adminDeptChart")) {
      if (!depts.length) {
        $("adminDeptChart").innerHTML = '<p class="muted">No department data yet.</p>';
      } else {
        $("adminDeptChart").innerHTML = depts.map(([dept, count]) => `
          <div class="chart-bar-row">
            <span class="chart-label">${dept}</span>
            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${Math.round(count/total*100)}%"></div></div>
            <span class="chart-val">${count}</span>
          </div>
        `).join("");
      }
    }

    const data = await leaderApi("/admin/students");
    adminStudentsCache = data.students || [];

    // Dynamically update admin department filter dropdown to include custom departments
    const filterDeptSelect = $("adminFilterDept");
    if (filterDeptSelect) {
      const currentSelected = filterDeptSelect.value;
      const uniqueDepts = new Set(["Computer Science", "Information Technology", "Electronics", "Data Science"]);
      adminStudentsCache.forEach(s => {
        const displayDept = s.department === 'Other' ? (s.customDepartment || 'Other') : (s.department || "Computer Science");
        if (displayDept) uniqueDepts.add(displayDept);
      });
      filterDeptSelect.innerHTML = `<option value="">All Departments</option>` + 
        Array.from(uniqueDepts).map(dept => `<option value="${dept}">${dept}</option>`).join("");
      filterDeptSelect.value = currentSelected;
    }

    filterAdminStudents();
    await renderAdminNotes();
    renderAdminProjectsGrid();
  } catch (error) {
    notify(error.message, "error");
  }
}

function filterAdminStudents() {
  const query = $("adminSearchInput")?.value.toLowerCase().trim() || "";
  const deptFilter = $("adminFilterDept")?.value.toLowerCase() || "";
  const yearFilter = $("adminFilterYear")?.value.toLowerCase() || "";
  const projFilter = $("adminFilterProject")?.value.toLowerCase() || "";
  const statusFilter = $("adminFilterStatus")?.value.toLowerCase() || "";

  let list = adminStudentsCache;

  if (query) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.username && s.username.toLowerCase().includes(query)) ||
      (s.college && s.college.toLowerCase().includes(query))
    );
  }
  if (deptFilter) {
    list = list.filter(s => {
      const displayDept = s.department === 'Other' ? (s.customDepartment || 'Other') : (s.department || "Computer Science");
      return displayDept.toLowerCase() === deptFilter;
    });
  }
  if (yearFilter) {
    list = list.filter(s => (s.year || "").toLowerCase() === yearFilter);
  }
  if (projFilter) {
    list = list.filter(s => (s.selectedProjects || []).includes(projFilter));
  }
  if (statusFilter) {
    list = list.filter(s => (s.status || "").toLowerCase() === statusFilter);
  }

  renderAdminStudentTable(list);
}

function resetAdminFilters() {
  if ($("adminSearchInput")) $("adminSearchInput").value = "";
  if ($("adminFilterDept")) $("adminFilterDept").value = "";
  if ($("adminFilterYear")) $("adminFilterYear").value = "";
  if ($("adminFilterProject")) $("adminFilterProject").value = "";
  if ($("adminFilterStatus")) $("adminFilterStatus").value = "";
  filterAdminStudents();
}

function renderAdminStudentTable(students) {
  const container = $("adminStudentTableContainer");
  if (!container) return;

  if (!students.length) {
    container.innerHTML = '<div style="padding:20px;text-align:center" class="muted">No students match your search/filter criteria.</div>';
    return;
  }

  container.innerHTML = `
    <table class="leader-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Department & Year</th>
          <th>Selected Projects</th>
          <th>Overall Progress</th>
          <th>Status</th>
          <th>Submission</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(s => {
          const assigned = s.selectedProjects || [];
          const progress = s.progress || {};
          const hasSubmission = assigned.some(id => progress[id]?.githubUrl);
          const projNames = assigned.map(id => {
            const p = PROJECTS.find(x => x.id === id);
            const pg = progress[id] || {};
            return `<span class="pill" title="${pg.percent||0}% completed">${p?.name || id} (${pg.percent||0}%)</span>`;
          }).join(" ") || '<span class="muted">Awaiting selection</span>';

          return `
            <tr>
              <td>
                <b>${s.name}</b><br>
                <small class="muted">${s.email || "No email"}</small><br>
                <span class="student-username-badge">@${s.username || s.id}</span>
              </td>
              <td>
                <b>${s.department === 'Other' ? (s.customDepartment || 'Other') : (s.department || "Computer Science")}</b><br>
                <small class="muted">${s.year || "Final Year"}</small><br>
                <small>${s.college || ""}</small>
              </td>
              <td>${projNames}</td>
              <td>
                <b>${s.overallProgress || 0}%</b>
                <div class="progress" style="width:90px;height:8px;margin-top:4px"><span style="width:${s.overallProgress||0}%"></span></div>
              </td>
              <td>
                <select class="input" style="padding:4px 8px;font-size:12px;width:auto" onchange="changeStudentStatus('${s.id}', this.value)">
                  <option value="active" ${s.status==="active"?"selected":""}>Active</option>
                  <option value="completed" ${s.status==="completed"?"selected":""}>Completed</option>
                  <option value="pending" ${s.status==="pending"?"selected":""}>Pending</option>
                  <option value="deactivated" ${s.status==="deactivated"?"selected":""}>Deactivated</option>
                </select>
              </td>
              <td>${hasSubmission ? '<span style="color:var(--green);font-weight:700">Submitted</span>' : '<span class="muted">Pending</span>'}</td>
              <td>
                <div class="action-btns">
                  <button class="btn primary btn-xs" onclick="openStudentDetailModal('${s.id}')">Profile</button>
                  <button class="btn outline btn-xs" onclick="openEditStudentModal('${s.id}')">Edit</button>
                  <button class="btn outline btn-xs" onclick="editStudentProgressPrompt('${s.id}')">Progress</button>
                  <button class="btn outline btn-xs" style="color:#b91c1c;border-color:#fca5a5" onclick="deleteStudentAccount('${s.id}')">Delete</button>
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function changeStudentStatus(studentId, newStatus) {
  try {
    await leaderApi(`/admin/students/${studentId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus })
    });
    notify("Student status updated.");
    await renderAdminDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

async function editStudentProgressPrompt(studentId) {
  const student = adminStudentsCache.find(s => s.id === studentId);
  if (!student || !(student.selectedProjects || []).length) {
    return notify("This student has not selected projects yet.", "error");
  }
  const projOptions = student.selectedProjects.map((id, index) => `${index+1}. ${id}`).join("\n");
  const choice = prompt(`Select project to update:\n${projOptions}\nEnter Project ID:`, student.selectedProjects[0]);
  if (!choice) return;
  const percentStr = prompt(`Enter new progress percentage (0-100) for project '${choice}':`, "100");
  if (percentStr === null) return;
  const percent = Number(percentStr);

  try {
    await leaderApi(`/admin/students/${studentId}/progress`, {
      method: "PUT",
      body: JSON.stringify({ projectId: choice, percent })
    });
    notify("Student project progress updated.");
    await renderAdminDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

async function deleteStudentAccount(studentId) {
  if (!confirm("Are you sure you want to delete/deactivate this student account?")) return;
  try {
    await leaderApi(`/admin/students/${studentId}`, { method: "DELETE" });
    notify("Student account removed.");
    await renderAdminDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

function toggleEditStudentCustomDeptField() {
  const select = $("editStudentDept");
  const customInput = $("editStudentCustomDept");
  if (select && customInput) {
    if (select.value === "Other") {
      customInput.style.display = "block";
    } else {
      customInput.style.display = "none";
    }
  }
}

async function openEditStudentModal(studentId) {
  try {
    const data = await leaderApi(`/admin/students/${studentId}`);
    const student = data.student;
    
    $("editStudentId").value = student.id;
    $("editStudentName").value = student.name || "";
    $("editStudentUsername").value = student.username || "";
    $("editStudentEmail").value = student.email || "";
    $("editStudentDomain").value = student.domain || "Web Development";
    $("editStudentDept").value = student.department || "Computer Science";
    $("editStudentCustomDept").value = student.customDepartment || "";
    $("editStudentYear").value = student.year || "Final Year";
    $("editStudentCollege").value = student.college || "";
    
    toggleEditStudentCustomDeptField();

    // Set onchange handler for domain to dynamic project rendering
    $("editStudentDomain").onchange = (e) => {
      renderEditStudentProjectsList(e.target.value, []);
    };

    // Render the checkbox list of projects
    renderEditStudentProjectsList(student.domain || "Web Development", student.selectedProjects || []);

    $("editStudentModal").classList.add("show");
  } catch (error) {
    console.error("Error opening edit student modal:", error);
    notify("Error loading student details.", "error");
  }
}

function renderEditStudentProjectsList(selectedDomain, checkedProjectIds = []) {
  const container = $("editStudentProjectsContainer");
  if (!container) return;

  // Filter projects by domain (case-insensitive)
  const domainProjects = (window.PROJECTS || []).filter(p => 
    String(p.domain || "Web Development").trim().toLowerCase() === String(selectedDomain).trim().toLowerCase()
  );
  
  if (domainProjects.length === 0) {
    container.innerHTML = `<p class="muted" style="font-size:13px;margin:8px 0 0">No projects available for this domain.</p>`;
    return;
  }

  container.innerHTML = `
    <label class="form-label" style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Project Selection (Domain: ${selectedDomain})</label>
    <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border); padding: 8px; border-radius: 4px; display: grid; gap: 6px;">
      ${domainProjects.map(p => {
        const isChecked = checkedProjectIds.includes(p.id);
        const diffLabel = getProjectDifficulty(p.id);
        return `
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin:0">
            <input type="checkbox" name="editStudentProjectCheckbox" value="${p.id}" ${isChecked ? 'checked' : ''}>
            <span>${p.name} <span class="badge ${diffLabel.toLowerCase()}" style="font-size:10px;padding:1px 4px;border-radius:3px">${diffLabel}</span></span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

async function saveEditedStudent() {
  const studentId = $("editStudentId").value;
  const name = $("editStudentName").value.trim();
  const username = $("editStudentUsername").value.trim();
  const email = $("editStudentEmail").value.trim();
  const domain = $("editStudentDomain").value;
  const department = $("editStudentDept").value;
  const customDepartment = $("editStudentCustomDept").value.trim();
  const year = $("editStudentYear").value;
  const college = $("editStudentCollege").value.trim();

  if (!name || !username || !email) {
    notify("Name, username, and email are required.", "error");
    return;
  }

  // Get selected projects from checkboxes
  const checkboxes = document.getElementsByName("editStudentProjectCheckbox");
  const selectedProjects = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedProjects.push(cb.value);
    }
  });

  try {
    const res = await leaderApi(`/admin/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        username,
        email,
        domain,
        department,
        customDepartment: department === "Other" ? customDepartment : "",
        year,
        college,
        selectedProjects
      })
    });
    
    notify("Student profile updated successfully.");
    $("editStudentModal").classList.remove("show");
    
    // Refresh student list/directory
    await renderAdminDashboard();
  } catch (error) {
    console.error("Error saving student edits:", error);
    notify(error.message || "Failed to update student profile.", "error");
  }
}

async function openStudentDetailModal(studentId) {
  try {
    const data = await leaderApi(`/admin/students/${studentId}`);
    const student = data.student;
    const logs = data.logs || [];

    $("modalStudentName").textContent = student.name;
    const displayDept = student.department === 'Other' ? (student.customDepartment || 'Other') : (student.department || "Computer Science");
    $("modalStudentSub").textContent = `${student.email || 'No Email'} · @${student.username || student.id} · ${displayDept} (${student.year || "Final Year"})`;

    const assigned = student.selectedProjects || [];
    const progress = student.progress || {};

    const projectsHtml = assigned.map((id, idx) => {
      const p = PROJECTS.find(x => x.id === id);
      const pg = progress[id] || {};
      
      let zipHtml = "";
      if (pg.zipOriginalName) {
        const uploadTime = pg.zipUploadedAt ? new Date(pg.zipUploadedAt).toLocaleString() : "";
        const sizeMb = pg.zipFileSize ? (pg.zipFileSize / (1024 * 1024)).toFixed(2) : "0.00";
        zipHtml = `
          <div style="margin-top:8px;padding:8px;background:var(--border);border-radius:6px;font-size:12px">
            📁 <b>Project ZIP:</b> ${escapeHtml(pg.zipOriginalName)} (${sizeMb} MB)<br/>
            <span class="muted">Uploaded: ${uploadTime}</span><br/>
            <button class="btn btn-xs primary" style="margin-top:6px;padding:4px 8px;font-size:11px" onclick="downloadSubmissionZip('${student.id}', '${id}')">Download ZIP</button>
          </div>
        `;
      } else if (pg.status === "completed") {
        zipHtml = `
          <div style="margin-top:8px;padding:8px;background:var(--border);border-radius:6px;font-size:12px;color:var(--text-muted)">
            📁 No ZIP uploaded (Older submission)
          </div>
        `;
      }

      return `
        <div class="detail-card" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>${idx+1}. ${p?.name || id}</b>
            <span class="status-badge status-${pg.status||'locked'}">${(pg.status||'locked').replace('_',' ')}</span>
          </div>
          <p class="muted" style="margin:4px 0;font-size:13px">${p?.summary || ''}</p>
          <div class="progress" style="height:10px;margin:6px 0"><span style="width:${pg.percent||0}%"></span></div>
          <small>Chapters: ${(pg.completedChapters||[]).length}/16 · Quiz: ${pg.quizPassed ? "Passed" : "Pending"} · GitHub: ${pg.githubUrl ? `<a href="${pg.githubUrl}" target="_blank">View Repo</a>` : "Pending"}</small>
          ${zipHtml}
        </div>
      `;
    }).join("") || '<p class="muted">No projects selected yet.</p>';

    $("modalStudentBody").innerHTML = `
      <div class="student-detail-grid">
        <div>
          <h4>Selected Projects Roadmap</h4>
          ${projectsHtml}
        </div>
        <div>
          <h4>Work & Camera Summary</h4>
          <div class="detail-card" style="margin-bottom:12px">
            <p style="margin:4px 0"><b>Total Work Time:</b> ${formatCameraDuration(student.cameraSummary?.totalWorkSeconds || 0)}</p>
            <p style="margin:4px 0"><b>Focused Time:</b> ${formatCameraDuration(student.cameraSummary?.totalFocusedSeconds || 0)}</p>
            <p style="margin:4px 0"><b>Attention Score:</b> ${student.cameraSummary?.averageAttentionPercent || 0}%</p>
            <p style="margin:4px 0"><b>Camera Proofs:</b> ${student.cameraSummary?.proofCount || 0} captured</p>
          </div>
          <h4>Recent Activity Log</h4>
          <div style="max-height:220px;overflow:auto;font-size:12px" class="detail-card">
            ${logs.slice(0, 15).map(l => `
              <div style="padding:4px 0;border-bottom:1px solid var(--border)">
                <b>${l.action}</b> <span class="muted">${new Date(l.createdAt).toLocaleTimeString()}</span>
              </div>
            `).join("") || '<span class="muted">No activity logs.</span>'}
          </div>
        </div>
      </div>
    `;

    $("studentDetailModal").classList.add("show");
  } catch (error) {
    notify(error.message, "error");
  }
}

function toggleCustomDeptField() {
  const deptSelect = $("newStudentDept");
  const customDeptInput = $("newStudentCustomDept");
  if (deptSelect && customDeptInput) {
    if (deptSelect.value === "Other") {
      customDeptInput.style.display = "block";
    } else {
      customDeptInput.style.display = "none";
      customDeptInput.value = "";
    }
  }
}

function openCreateStudentModal() {
  $("createStudentModal").classList.add("show");
  ["newStudentName", "newStudentUsername", "newStudentEmail", "newStudentCollege", "newStudentCustomDept"].forEach(id => {
    if ($(id)) $(id).value = "";
  });
  if ($("newStudentDept")) {
    $("newStudentDept").value = "Computer Science";
  }
  if ($("newStudentYear")) {
    $("newStudentYear").value = "Final Year";
  }
  if ($("newStudentCustomDept")) {
    $("newStudentCustomDept").style.display = "none";
  }
}

async function createStudentFromModal() {
  const deptVal = $("newStudentDept").value;
  const customDeptVal = $("newStudentCustomDept")?.value.trim() || "";
  const yearVal = $("newStudentYear").value;

  const payload = {
    name: $("newStudentName").value.trim(),
    username: $("newStudentUsername").value.trim(),
    email: $("newStudentEmail").value.trim(),
    domain: $("newStudentDomain")?.value || "Web Development",
    department: deptVal,
    customDepartment: customDeptVal,
    year: yearVal,
    college: $("newStudentCollege").value.trim()
  };

  if (!payload.name || !payload.username) {
    return notify("Student name and username are required.", "error");
  }
  if (!payload.department) {
    return notify("Branch is required.", "error");
  }
  if (payload.department === "Other" && !payload.customDepartment) {
    return notify("Custom branch name is required when 'Other' is selected.", "error");
  }
  if (!payload.year) {
    return notify("Year is required.", "error");
  }

  try {
    const data = await leaderApi("/leader/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify(`Student account created for @${data.student.username} (${data.student.domain})!`);
    ["newStudentName", "newStudentUsername", "newStudentEmail", "newStudentCollege", "newStudentCustomDept"].forEach(id => $(id) && ($(id).value = ""));
    if ($("newStudentDept")) {
      $("newStudentDept").value = "Computer Science";
    }
    if ($("newStudentCustomDept")) {
      $("newStudentCustomDept").style.display = "none";
    }
    $("createStudentModal").classList.remove("show");
    await renderAdminDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

function switchLoginMode(mode) {
  const isUnified = mode === "unified";
  $("unifiedLoginPanel")?.classList.toggle("hidden", !isUnified);
  $("credsInfoPanel")?.classList.toggle("hidden", isUnified);
  $("singleLoginTab")?.classList.toggle("active", isUnified);
  $("credsInfoTab")?.classList.toggle("active", !isUnified);
}

function getProjectDifficulty(projectId) {
  const userDomain = state.user?.domain || "Web Development";
  const normalize = s => String(s || "").trim().toLowerCase();
  const domainProjects = (window.PROJECTS || []).filter(p => normalize(p.domain || "Web Development") === normalize(userDomain));
  const idx = domainProjects.findIndex(p => p.id === projectId);
  if (idx === -1) return "Intermediate";
  
  if (normalize(userDomain) === "python with machine learning") {
    if (idx < 2) return "Easy";
    if (idx < 6) return "Intermediate";
    return "Advanced";
  } else {
    if (idx < 3) return "Easy";
    if (idx < 6) return "Intermediate";
    return "Advanced";
  }
}

function exploreRemainingProjects() {
  const userDomain = state.user?.domain || "Web Development";
  const normalize = s => String(s || "").trim().toLowerCase();
  const domainProjects = (window.PROJECTS || []).filter(p => normalize(p.domain || "Web Development") === normalize(userDomain));

  const remaining = domainProjects.filter(p => !state.selected.includes(p.id));

  const listHtml = remaining.map(p => {
    let badgeStyle = "background:rgba(37,99,235,.1);color:var(--blue)";
    const diff = getProjectDifficulty(p.id);
    if (diff === "Easy") {
      badgeStyle = "background:#dcfce7;color:#166534";
    } else if (diff === "Intermediate") {
      badgeStyle = "background:#fef3c7;color:#92400e";
    } else if (diff === "Advanced") {
      badgeStyle = "background:#fee2e2;color:#b91c1c";
    }

    let extraMlDetails = "";
    if (p.domain === "Python with Machine Learning") {
      extraMlDetails = `
        <div style="margin-top:6px; font-size:12px; line-height:1.4; color:var(--text)">
          <div><b>Real-World App:</b> ${p.realWorldApp || ''}</div>
          <div><b>Technologies:</b> ${p.stack || ''}</div>
          <div><b>ML Concepts:</b> ${p.mlConcepts || ''}</div>
        </div>
      `;
    }

    return `
      <div style="padding:12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
        <div>
          <strong style="color:var(--navy)">${p.icon || '💻'} ${p.name || p.title}</strong>
          <span class="pill" style="font-size:11px; margin-left:8px; padding:2px 6px; font-weight:bold; ${badgeStyle}">${diff}</span>
          <p class="muted" style="margin:4px 0 0; font-size:12px">${p.summary}</p>
          ${extraMlDetails}
        </div>
      </div>
    `;
  }).join("") || '<p class="muted">No remaining projects.</p>';

  $("previewBody").innerHTML = `
    <div class="section-head">
      <h3>Remaining Projects in ${userDomain}</h3>
      <button class="btn outline" type="button" onclick="$('previewModal').classList.remove('show')">✕ Close</button>
    </div>
    <div style="margin-top:14px; max-height:400px; overflow-y:auto">
      <p style="font-size:13px; margin-bottom:14px; line-height:1.4" class="muted">
        These projects are currently locked. You will be able to unlock and work on them after completing your 4 initially selected projects.
      </p>
      ${listHtml}
    </div>
  `;
  $("previewModal").classList.add("show");
}

async function renderSelection() {
  if (state.token && !state.user) {
    try { await loadMe(); } catch (e) {}
  }
  await loadProjects();

  if ((state.user?.selectedProjects || []).length >= 4) {
    await renderDashboard();
    show("dashboardView");
    return;
  }
  state.selected = [];

  const userDomain = state.user?.domain || "Web Development";
  const normalize = s => String(s || "").trim().toLowerCase();

  const domainProjects = (window.PROJECTS || []).filter(p => normalize(p.domain || "Web Development") === normalize(userDomain));

  const container = $("selectionGrid");
  if (!container) return;

  if (!domainProjects.length) {
    container.innerHTML = `
      <div class="empty-notice" style="padding:32px;text-align:center;grid-column:1/-1;background:var(--card2);border:1px solid var(--border);border-radius:12px">
        <h3 style="margin:0 0 8px;color:var(--navy)">No projects are currently available for your domain.</h3>
        <p class="muted" style="margin:0">Assigned Domain: <b>${userDomain}</b>. Please contact your administrator to add projects for this domain.</p>
      </div>
    `;
    updateSelect();
    return;
  }

  // Determine difficulty dynamically by position in category:
  // Projects 1-3 (index 0,1,2) -> Easy
  // Projects 4-6 (index 3,4,5) -> Intermediate
  // Projects 7-10 (index 6,7,8,9...) -> Advanced
  const easyProjects = [];
  const intermediateProjects = [];
  const advancedProjects = [];

  domainProjects.forEach((p, idx) => {
    let diff = "Intermediate";
    if (normalize(userDomain) === "python with machine learning") {
      if (idx < 2) {
        diff = "Easy";
      } else if (idx < 6) {
        diff = "Intermediate";
      } else {
        diff = "Advanced";
      }
    } else {
      if (idx < 3) {
        diff = "Easy";
      } else if (idx < 6) {
        diff = "Intermediate";
      } else {
        diff = "Advanced";
      }
    }
    p.difficulty = diff;
    p.level = diff;

    if (diff === "Easy") {
      easyProjects.push(p);
    } else if (diff === "Intermediate") {
      intermediateProjects.push(p);
    } else {
      advancedProjects.push(p);
    }
  });

  const renderCard = p => {
    let badgeStyle = "background:rgba(37,99,235,.1);color:var(--blue)";
    if (p.difficulty === "Easy") {
      badgeStyle = "background:#dcfce7;color:#166534";
    } else if (p.difficulty === "Intermediate") {
      badgeStyle = "background:#fef3c7;color:#92400e";
    } else if (p.difficulty === "Advanced") {
      badgeStyle = "background:#fee2e2;color:#b91c1c";
    }

    let extraMlDetails = "";
    if (p.domain === "Python with Machine Learning") {
      extraMlDetails = `
        <div class="ml-project-details" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 13px; line-height: 1.4">
          <div style="margin-bottom: 4px"><b>Real-World App:</b> ${p.realWorldApp || ''}</div>
          <div style="margin-bottom: 4px"><b>Technologies:</b> ${p.stack || ''}</div>
          <div><b>ML Concepts:</b> ${p.mlConcepts || ''}</div>
        </div>
      `;
    }

    return `
      <article class="panel project" id="selection-${p.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="pill" style="${badgeStyle};font-weight:bold">${p.difficulty}</span>
          <span class="pill" style="background:#e0f2fe;color:#0369a1">${p.domain || 'Web Development'}</span>
        </div>
        <h3>${p.icon || '💻'} ${p.name || p.title}</h3>
        <p class="muted">${p.summary}</p>
        ${extraMlDetails}
        <label style="display:block; margin-top:10px"><input class="choose" type="checkbox" value="${p.id}"> Choose Project</label>
      </article>
    `;
  };

  const sectionsHtml = [];

  // Section 1: Easy
  sectionsHtml.push(`
    <div class="difficulty-section easy-section" style="margin-bottom: 30px; grid-column: 1/-1;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f8a68; padding-bottom:8px; margin-bottom:14px">
        <div>
          <h3 style="margin:0; font-size:18px; color:#0f8a68; display:flex; align-items:center; gap:8px">
            <span>🟢</span> EASY PROJECTS
          </h3>
          <p style="margin:4px 0 0; font-size:13px; color:var(--muted)">Beginner-friendly projects to build fundamental skills.</p>
        </div>
        <span class="pill" style="background:#0f8a68; color:#fff; font-weight:bold; padding:4px 10px">${easyProjects.length} Projects</span>
      </div>
      <div class="grid">
        ${easyProjects.map(renderCard).join("") || `<p class="muted" style="grid-column:1/-1;padding:12px 0;">No projects available in this section.</p>`}
      </div>
    </div>
  `);

  // Section 2: Intermediate
  sectionsHtml.push(`
    <div class="difficulty-section intermediate-section" style="margin-bottom: 30px; grid-column: 1/-1;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #d97706; padding-bottom:8px; margin-bottom:14px">
        <div>
          <h3 style="margin:0; font-size:18px; color:#d97706; display:flex; align-items:center; gap:8px">
            <span>🟡</span> INTERMEDIATE PROJECTS
          </h3>
          <p style="margin:4px 0 0; font-size:13px; color:var(--muted)">Projects requiring practical development knowledge.</p>
        </div>
        <span class="pill" style="background:#d97706; color:#fff; font-weight:bold; padding:4px 10px">${intermediateProjects.length} Projects</span>
      </div>
      <div class="grid">
        ${intermediateProjects.map(renderCard).join("") || `<p class="muted" style="grid-column:1/-1;padding:12px 0;">No projects available in this section.</p>`}
      </div>
    </div>
  `);

  // Section 3: Advanced
  sectionsHtml.push(`
    <div class="difficulty-section advanced-section" style="margin-bottom: 20px; grid-column: 1/-1;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #dc2626; padding-bottom:8px; margin-bottom:14px">
        <div>
          <h3 style="margin:0; font-size:18px; color:#dc2626; display:flex; align-items:center; gap:8px">
            <span>🔴</span> ADVANCED PROJECTS
          </h3>
          <p style="margin:4px 0 0; font-size:13px; color:var(--muted)">Complex projects requiring strong technical knowledge.</p>
        </div>
        <span class="pill" style="background:#dc2626; color:#fff; font-weight:bold; padding:4px 10px">${advancedProjects.length} Projects</span>
      </div>
      <div class="grid">
        ${advancedProjects.map(renderCard).join("") || `<p class="muted" style="grid-column:1/-1;padding:12px 0;">No projects available in this section.</p>`}
      </div>
    </div>
  `);

  container.innerHTML = sectionsHtml.join("");

  document.querySelectorAll(".choose").forEach(box => box.onchange = () => pick(box));
  updateSelect();
}

function pick(box) {
  state.selected = [...document.querySelectorAll(".choose:checked")].map(x => x.value);
  PROJECTS.forEach(p => $("selection-"+p.id)?.classList.toggle("selected", state.selected.includes(p.id)));
  updateSelect();
}

function updateSelect() {
  const selectedEasy = state.selected.filter(id => getProjectDifficulty(id) === "Easy");
  const selectedInter = state.selected.filter(id => getProjectDifficulty(id) === "Intermediate");
  const selectedAdv = state.selected.filter(id => getProjectDifficulty(id) === "Advanced");

  const easyCount = selectedEasy.length;
  const interCount = selectedInter.length;
  const advCount = selectedAdv.length;
  const totalCount = state.selected.length;

  // Enforce Category-based Disabling
  document.querySelectorAll(".choose").forEach(box => {
    const pId = box.value;
    const diff = getProjectDifficulty(pId);
    if (!box.checked) {
      if (diff === "Easy" && easyCount >= 1) {
        box.disabled = true;
      } else if (diff === "Intermediate" && interCount >= 1) {
        box.disabled = true;
      } else if (diff === "Advanced" && advCount >= 2) {
        box.disabled = true;
      } else {
        box.disabled = false;
      }
    } else {
      box.disabled = false; // Keep checked boxes enabled so they can be unchecked
    }
  });

  // Display category progress
  const progressContainer = $("selectionProgressContainer");
  const isCompleted = easyCount === 1 && interCount === 1 && advCount === 2;
  if (progressContainer) {
    progressContainer.innerHTML = `
      <div style="margin: 12px 0; padding: 14px; background: var(--card2); border: 1px solid var(--border); border-radius: 8px; font-size: 14px; line-height: 1.5">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-weight: 600;">
          <div style="color: #0f8a68">🟢 Easy: ${easyCount} / 1</div>
          <div style="color: #d97706">🟡 Intermediate: ${interCount} / 1</div>
          <div style="color: #dc2626">🔴 Advanced: ${advCount} / 2</div>
          <div style="color: var(--navy)">Total: ${totalCount} / 4 ${isCompleted ? '<span style="color:#0f8a68; margin-left: 4px;">✓ Complete</span>' : ''}</div>
        </div>
      </div>
    `;

    // Save button styling and state
    const saveBtn = $("saveSelectionBtn");
    if (saveBtn) {
      if (isCompleted) {
        saveBtn.removeAttribute("disabled");
        saveBtn.style.opacity = "1";
        saveBtn.style.cursor = "pointer";
      } else {
        saveBtn.setAttribute("disabled", "true");
        saveBtn.style.opacity = "0.6";
        saveBtn.style.cursor = "not-allowed";
      }
    }
  }

  // Trigger success message once when combination is met
  if (isCompleted && !state._selectionNoticeShown) {
    notify("Mandatory combination satisfied! Click Save to lock your selection.", "success");
    state._selectionNoticeShown = true;
  } else if (!isCompleted) {
    state._selectionNoticeShown = false;
  }

  if ($("selectBar")) {
    $("selectBar").style.width = `${(totalCount / 4) * 100}%`;
  }
  if ($("selectText")) {
    $("selectText").textContent = `${totalCount} of 4 selected`;
  }
}

async function ensureCandidate() {
  if (state.token) return true;
  const name = prompt("Candidate name:", "Intern");
  if (name === null) return false;
  const email = prompt("Candidate email:", `intern-${Date.now()}@aparaitech.local`);
  if (email === null) return false;
  try {
    const data = await api("/auth/login", {
      method:"POST",
      body:JSON.stringify({ name:name||"Intern", email:email||`intern-${Date.now()}@aparaitech.local`, college:"", password:"Aparaitech123@" })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("aprToken", state.token);
    return true;
  } catch (e) { notify(e.message,"error"); return false; }
}

async function saveSelection() {
  const selectedEasy = state.selected.filter(id => getProjectDifficulty(id) === "Easy");
  const selectedInter = state.selected.filter(id => getProjectDifficulty(id) === "Intermediate");
  const selectedAdv = state.selected.filter(id => getProjectDifficulty(id) === "Advanced");

  if (selectedEasy.length !== 1 || selectedInter.length !== 1 || selectedAdv.length !== 2) {
    return notify("Invalid combination. Select exactly 1 Easy, 1 Intermediate, and 2 Advanced projects.", "error");
  }
  if (!(await ensureCandidate())) return;
  try {
    const data = await api("/intern/selection", { method:"POST", body:JSON.stringify({ projectIds:state.selected }) });
    state.user = data.user;
    await renderDashboard();
    show("dashboardView");
    notify("Four projects saved. Project 1 is unlocked.");
  } catch (e) { notify(e.message,"error"); }
}

async function loadMe() {
  const data = await api("/intern/me");
  state.user = data.user;
  return data.user;
}

function formatTime(seconds) {
  return `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`;
}

function statusBadge(status) {
  const label = (status || "locked").replaceAll("_"," ");
  return `<span class="status-badge status-${status || "locked"}">${label}</span>`;
}

async function renderDashboard() {
  const user = await loadMe();
  const progress = user.progress || {};
  $("welcome").textContent = `Welcome, ${user.name}`;
  $("profileText").textContent = `${user.email}${user.college ? " · "+user.college : ""}`;

  let completed=0, github=0, total=0, totalTime=0;
  $("roadmap").innerHTML = user.selectedProjects.map((id,index) => {
    const project = PROJECTS.find(p => p.id===id);
    const item = progress[id] || {};
    if (item.status==="completed") completed++;
    if (item.githubUrl) github++;
    total += item.percent || 0;
    totalTime += item.timeSpentSeconds || 0;
    return ``; // ... remainder of function
  });
}

async function renderLeaderDashboard() {
  const data = await leaderApi("/leader/students");
  const students = data.students || [];
  if ($("leaderStudentTable")) {
    $("leaderStudentTable").innerHTML = `
      <table class="leader-table">
        <tr>
          <th>Student</th>
          <th>Chosen Projects</th>
          <th>Progress</th>
          <th>Total Work</th>
          <th>Focused Time</th>
          <th>Attention</th>
          <th>Camera Proofs</th>
        </tr>
        ${students.map(student => {
          const progress = student.progress || {};
          const assigned = student.selectedProjects || [];
          const projectProgress = assigned.map(id => {
            const project = PROJECTS.find(p => p.id === id);
            const pg = progress[id] || {};
            return `${project?.name || id}: ${pg.percent || 0}%`;
          }).join("<br>") || "Not assigned";
          return `
            <tr>
              <td>
                <b>${student.name}</b><br>
                <span class="student-username-badge">${student.username}</span>
              </td>
              <td>${assigned.length}/4</td>
              <td>${projectProgress}</td>
              <td>${formatCameraDuration(student.cameraSummary?.totalWorkSeconds || 0)}</td>
              <td>${formatCameraDuration(student.cameraSummary?.totalFocusedSeconds || 0)}</td>
              <td>${student.cameraSummary?.averageAttentionPercent || 0}%</td>
              <td>${student.cameraSummary?.proofCount || 0}</td>
            </tr>`;
        }).join("")}
      </table>`;
  }
}

async function viewExcelReport() {
  try {
    const data = await leaderApi("/leader/excel-preview");
    const rows = data.rows || [];
    const headers = [
      "Username","Student","Email","College","Chosen Projects",
      "Completed","Overall %","Total Work","Focused","Attention %","Camera Proofs"
    ];
    $("excelPreviewTable").innerHTML = `
      <div class="excel-preview-scroll">
        <table class="excel-preview-table">
          <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          ${rows.map(row => `
            <tr>
              <td>${row.username || ""}</td>
              <td>${row.name || ""}</td>
              <td>${row.email || ""}</td>
              <td>${row.college || ""}</td>
              <td>${row.chosenProjects || 0}/4</td>
              <td>${row.completedProjects || 0}</td>
              <td>${row.overallProgress || 0}%</td>
              <td>${formatCameraDuration(row.totalWorkSeconds || 0)}</td>
              <td>${formatCameraDuration(row.totalFocusedSeconds || 0)}</td>
              <td>${row.attentionPercent || 0}%</td>
              <td>${row.cameraProofs || 0}</td>
            </tr>`).join("")}
        </table>
      </div>`;
    $("excelPreviewSection").classList.remove("hidden");
    $("excelPreviewSection").scrollIntoView({ behavior:"smooth" });
    if ($("excelReportStatus")) $("excelReportStatus").textContent = `Last generated: ${new Date(data.generatedAt).toLocaleString()}`;
  } catch (error) {
    notify(error.message, "error");
  }
}

async function downloadExcelReport() {
  try {
    const response = await fetch(API + "/leader/report.xlsx", {
      headers: { Authorization: `Bearer ${state.leaderToken || state.token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({message:"Unable to download report."}));
      throw new Error(data.message || "Unable to download report.");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Aparaitech_Student_Work_Report.xlsx";
    link.click();
    URL.revokeObjectURL(link.href);
    if ($("excelReportStatus")) $("excelReportStatus").textContent = `Downloaded: ${new Date().toLocaleString()}`;
    notify("Excel report downloaded.");
  } catch (error) {
    notify(error.message, "error");
  }
}

function leaderLogout() {
  logout();
}

async function renderDashboard() {
  const user = await loadMe();
  const progress = user.progress || {};
  $("welcome").textContent = `Welcome, ${user.name}`;
  $("profileText").textContent = `${user.email}${user.college ? " · "+user.college : ""}`;

  let completed=0, github=0, total=0, totalTime=0;
  $("roadmap").innerHTML = user.selectedProjects.map((id,index) => {
    const project = PROJECTS.find(p => p.id===id);
    const item = progress[id] || {};
    if (item.status==="completed") completed++;
    if (item.githubUrl) github++;
    total += item.percent || 0;
    totalTime += item.timeSpentSeconds || 0;
    const locked = item.status==="locked";
    return `<div class="road ${locked?"locked":""} ${item.status==="completed"?"completed":""}">
      <article class="panel">
        <span class="pill">Selected Project ${index+1}</span>${statusBadge(item.status)}
        <h3>${project.icon} ${project.name}</h3><p class="muted">${project.summary}</p>
        <div class="progress"><span style="width:${item.percent||0}%"></span></div>
        <p class="muted">Chapters: ${(item.completedChapters||[]).length}/${CHAPTERS.length} · Quiz: ${item.quizPassed?"Passed":"Pending"} · Time: ${formatTime(item.timeSpentSeconds||0)}</p>
        ${locked
          ? `<button class="btn outline" disabled>🔒 Complete previous project</button>`
          : `<button class="btn primary tracked-open" data-id="${id}" type="button" onclick="window.openTrackedProjectSafe('${id}'); return false;">${item.status==="completed"?"Review":"Start / Continue"}</button>`}
      </article></div>`;
  }).join("");
  $("completedStat").textContent = completed;
  $("pendingStat").textContent = user.selectedProjects.length-completed;
  $("githubStat").textContent = github;
  $("overallStat").textContent = Math.round(total/user.selectedProjects.length)+"%";

  const initialProjects = user.selectedProjects.slice(0, 4);
  const coreCompleted = initialProjects.length === 4 && initialProjects.every(id => progress[id]?.status === "completed");

  if (coreCompleted) {
    $("additionalProjectsSection")?.classList.remove("hidden");
    await renderAdditionalProjects(user);
  } else {
    $("additionalProjectsSection")?.classList.add("hidden");
  }

  renderCalendar();
  renderReport();
  loadCameraTotals();
}

async function renderAdditionalProjects(user) {
  const container = $("additionalProjectsGrid");
  if (!container) return;

  const userDomain = user.domain || "Web Development";
  const normalize = s => String(s || "").trim().toLowerCase();
  
  const domainProjects = (window.PROJECTS || []).filter(p => normalize(p.domain || "Web Development") === normalize(userDomain));
  const remaining = domainProjects.filter(p => !user.selectedProjects.includes(p.id));

  if (!remaining.length) {
    container.innerHTML = `<p class="muted" style="grid-column: 1/-1; text-align: center; padding: 20px;">You have added all available projects for your domain!</p>`;
    return;
  }

  container.innerHTML = remaining.map(p => {
    let badgeStyle = "background:rgba(37,99,235,.1);color:var(--blue)";
    const diff = getProjectDifficulty(p.id);
    if (diff === "Easy") {
      badgeStyle = "background:#dcfce7;color:#166534";
    } else if (diff === "Intermediate") {
      badgeStyle = "background:#fef3c7;color:#92400e";
    } else if (diff === "Advanced") {
      badgeStyle = "background:#fee2e2;color:#b91c1c";
    }

    let extraMlDetails = "";
    if (p.domain === "Python with Machine Learning") {
      extraMlDetails = `
        <div class="ml-project-details" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 13px; line-height: 1.4">
          <div style="margin-bottom: 4px"><b>Real-World App:</b> ${p.realWorldApp || ''}</div>
          <div style="margin-bottom: 4px"><b>Technologies:</b> ${p.stack || ''}</div>
          <div><b>ML Concepts:</b> ${p.mlConcepts || ''}</div>
        </div>
      `;
    }

    return `
      <article class="panel project" style="border: 1px solid var(--border); padding: 16px; border-radius: 8px; background: var(--card)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="pill" style="${badgeStyle};font-weight:bold">${diff}</span>
        </div>
        <h4 style="margin: 0 0 8px; color: var(--navy)">${p.icon || '💻'} ${p.name || p.title}</h4>
        <p class="muted" style="font-size: 13px; margin: 0 0 14px; line-height: 1.4">${p.summary}</p>
        ${extraMlDetails}
        <button class="btn success btn-xs" type="button" onclick="addAdditionalProject('${p.id}')" style="margin-top:10px">+ Add Project</button>
      </article>
    `;
  }).join("");
}

async function addAdditionalProject(projectId) {
  const p = PROJECTS.find(x => x.id === projectId);
  if (!confirm(`Are you sure you want to add "${p?.name || projectId}" to your dashboard?`)) return;

  try {
    const data = await api("/intern/select-additional", {
      method: "POST",
      body: JSON.stringify({ projectId })
    });
    notify(`Project "${p?.name || projectId}" added and unlocked successfully!`, "success");
    state.user = data.user;
    await renderDashboard();
  } catch (error) {
    notify(error.message, "error");
  }
}

async function renderReport() {
  if (!state.user) return;
  const progress = state.user.progress || {};
  const rows = state.user.selectedProjects.map((id,index) => {
    const p = PROJECTS.find(x=>x.id===id);
    const pg = progress[id] || {};
    return `<tr>
      <td>${index+1}. ${p ? p.name : id}</td>
      <td>${statusBadge(pg.status)}</td>
      <td>${(pg.completedChapters||[]).length}/${CHAPTERS.length}</td>
      <td>${pg.percent||0}%</td>
      <td>${pg.quizPassed ? `Passed (${pg.quizScore||100}%)` : "Pending"}</td>
      <td>${formatTime(pg.timeSpentSeconds||0)}</td>
      <td>${pg.githubUrl ? `<a href="${pg.githubUrl}" target="_blank">Submitted</a>` : "Pending"}</td>
    </tr>`;
  }).join("");
  
  const originalTableHtml = `<table class="report-table">
    <tr><th>Project</th><th>Status</th><th>Chapters</th><th>Progress</th><th>Quiz</th><th>Tracked Time</th><th>GitHub</th></tr>${rows}
  </table>`;

  let quizStatsHtml = "";
  try {
    const quizRes = await api("/student/quiz-results");
    const results = quizRes.results || [];

    const totalQuizzes = results.length;
    let avgScore = 0;
    let highestScore = 0;
    let completedQuizzes = 0;

    if (totalQuizzes > 0) {
      const sum = results.reduce((s, r) => s + r.percentage, 0);
      avgScore = Math.round(sum / totalQuizzes);
      highestScore = Math.max(...results.map(r => r.percentage));
      completedQuizzes = results.filter(r => r.percentage >= 70).length;
    }

    const quizRows = results.map(r => `
      <tr>
        <td><b>${escapeHtml(r.projectName)}</b></td>
        <td><b>${r.score}</b> / ${r.totalMarks}</td>
        <td><b>${r.percentage}%</b></td>
        <td><span class="badge ${r.percentage >= 70 ? 'success' : 'danger'}">${r.percentage >= 70 ? 'Completed' : 'Failed'}</span></td>
      </tr>
    `).join("");

    const quizTable = results.length > 0 ? `
      <table class="report-table" style="margin-top:12px">
        <thead>
          <tr style="background:var(--navy);color:#fff">
            <th>Project</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${quizRows}
        </tbody>
      </table>
    ` : `<p class="muted" style="margin-top:10px">No quizzes attempted yet. Pass Chapter 15 of your projects to see scores here.</p>`;

    quizStatsHtml = `
      <div style="margin-top:24px;border-top:1px dashed var(--border);padding-top:20px">
        <h3>🏆 Quiz Statistics & Performance</h3>
        <div class="metrics" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:12px;margin-bottom:20px">
          <article class="metricbox" style="padding:14px;background:var(--card2);border:1px solid var(--border);border-radius:12px;text-align:center">
            <h5 style="margin:0 0 4px 0;color:var(--text-muted)">Total Attempted</h5>
            <span style="font-size:24px;font-weight:bold;color:var(--navy)">${totalQuizzes}</span>
          </article>
          <article class="metricbox" style="padding:14px;background:var(--card2);border:1px solid var(--border);border-radius:12px;text-align:center">
            <h5 style="margin:0 0 4px 0;color:var(--text-muted)">Average Score</h5>
            <span style="font-size:24px;font-weight:bold;color:var(--green)">${avgScore}%</span>
          </article>
          <article class="metricbox" style="padding:14px;background:var(--card2);border:1px solid var(--border);border-radius:12px;text-align:center">
            <h5 style="margin:0 0 4px 0;color:var(--text-muted)">Highest Score</h5>
            <span style="font-size:24px;font-weight:bold;color:var(--blue)">${highestScore}%</span>
          </article>
          <article class="metricbox" style="padding:14px;background:var(--card2);border:1px solid var(--border);border-radius:12px;text-align:center">
            <h5 style="margin:0 0 4px 0;color:var(--text-muted)">Completed Quizzes</h5>
            <span style="font-size:24px;font-weight:bold;color:var(--green)">${completedQuizzes}</span>
          </article>
        </div>
        
        <h4>Project-Wise Quiz Scores</h4>
        ${quizTable}
      </div>
    `;
  } catch (err) {
    console.error("Error loading quiz stats on dashboard:", err.message);
  }

  $("reportTable").innerHTML = originalTableHtml + quizStatsHtml;
  renderStudentNotes();
}

function renderCalendar() {
  if (!state.user) return;
  const activity = state.user.dailyActivity || {};
  const first = new Date(state.calendarYear,state.calendarMonth,1);
  const last = new Date(state.calendarYear,state.calendarMonth+1,0);
  $("calendarTitle").textContent = first.toLocaleString(undefined,{month:"long",year:"numeric"});
  const cells = [];
  for(let i=0;i<first.getDay();i++) cells.push('<div class="calendar-day empty"></div>');
  const today = new Date();
  for(let day=1;day<=last.getDate();day++){
    const key = `${state.calendarYear}-${String(state.calendarMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const seconds = activity[key] || 0;
    const isToday = today.getFullYear()===state.calendarYear && today.getMonth()===state.calendarMonth && today.getDate()===day;
    cells.push(`<div class="calendar-day ${seconds>0?"has-activity":""} ${isToday?"today":""}">
      <span class="day-number">${day}</span>${seconds>0?`<span class="day-time">${formatTime(seconds)}</span>`:""}
    </div>`);
  }
  $("calendarGrid").innerHTML = cells.join("");
}



function openProjectDocument(id, publicMode = false) {
  try {
    const project = PROJECTS.find(item => item.id === id);
    if (!project) {
      notify("Project information was not found.", "error");
      return false;
    }

    // Set the project and render documentation BEFORE any backend request.
    state.currentProject = project;
    state.publicMode = Boolean(publicMode || !state.token);

    const completed = state.publicMode
      ? JSON.parse(localStorage.getItem(`publicProgress:${project.id}`) || "[]")
      : (state.user?.progress?.[project.id]?.completedChapters || []);

    const firstPending = CHAPTERS.findIndex(
      (chapter, index) => !completed.includes(index) && !completed.includes(chapter)
    );
    state.currentChapter = firstPending >= 0 ? firstPending : 0;

    const title = $("projectTitle");
    if (title) title.textContent = project.name;

    renderChapterList();

    if (state.publicMode) {
      clearInterval(state.sessionTimer);
      state.sessionSeconds = 0;
    } else {
      startSessionTimer();
    }

    renderChapter();
    show("docView");

    const doc = $("docView");
    if (doc) {
      doc.classList.remove("document-open-animation");
      void doc.offsetWidth;
      doc.classList.add("document-open-animation");
    }

    notify(`${project.name} documentation opened.`);

    // Tracking runs after navigation and can never block the document screen.
    if (!state.publicMode) {
      // Opening a selected tracked project automatically requests camera permission,
      // opens the floating camera panel and begins work counting.
      setTimeout(() => autoStartCameraForTrackedProject(id), 250);

      api(`/tracking/${id}/start`, { method: "POST" })
        .then(() => notify("Project time tracking started."))
        .catch(error => notify(
          `Document opened. Tracking could not start: ${error.message}`,
          "error"
        ));
    }

    return false;
  } catch (error) {
    console.error("Project open error:", error);
    notify(`Unable to open project: ${error.message}`, "error");
    return false;
  }
}

function openProject(id, publicMode = false) {
  return openProjectDocument(id, publicMode);
}

// One reliable global function used by Start / Continue.
window.openTrackedProjectSafe = function (id) {
  return openProjectDocument(id, false);
};

// Direct preview documentation opener.
window.openPreviewProjectSafe = function (id) {
  return openProjectDocument(id, true);
};

function renderChapterList() {
  const completed = state.publicMode
    ? JSON.parse(localStorage.getItem(`publicProgress:${state.currentProject.id}`)||"[]")
    : (state.user?.progress?.[state.currentProject.id]?.completedChapters || []);
  $("chapterList").innerHTML = CHAPTERS.map((chapter,index)=>`
    <button class="nav chapter-button ${index===state.currentChapter?"active":""}" data-index="${index}" type="button">
      ${completed.includes(index)||completed.includes(chapter)?"✅":"📘"} ${index+1}. ${chapter}
    </button>`).join("");
  document.querySelectorAll(".chapter-button").forEach(btn=>btn.onclick=()=>openChapter(Number(btn.dataset.index)));
}

function startSessionTimer() {
  clearInterval(state.sessionTimer);
  state.sessionSeconds = 0;
  state.sessionTimer = setInterval(()=>{
    state.sessionSeconds++;
    const el=$("liveSessionTime");
    if(el) el.textContent=formatTime(state.sessionSeconds);
  },1000);
}

function openChapter(index) {
  state.currentChapter=index;
  renderChapterList();
  renderChapter();
  window.scrollTo({top:0,behavior:"smooth"});
  
  completeChapterOnSidebarClick(index);
}

async function completeChapterOnSidebarClick(chapterIndex) {
  if (state.publicMode) {
    const key = `publicProgress:${state.currentProject.id}`;
    const completed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!completed.includes(chapterIndex)) {
      completed.push(chapterIndex);
      localStorage.setItem(key, JSON.stringify(completed));
      renderChapterList();
    }
    return;
  }
  if (!state.token) return;

  const progress = state.user?.progress?.[state.currentProject.id] || {};
  const completedChapters = progress.completedChapters || [];
  if (completedChapters.includes(chapterIndex)) {
    return;
  }

  // Optimistic UI updates
  completedChapters.push(chapterIndex);
  completedChapters.sort((a, b) => a - b);
  const totalChapters = CHAPTERS.length;
  const completedCount = completedChapters.length;
  const percentComplete = Math.min(100, Math.round(completedCount / totalChapters * 100));
  progress.percent = percentComplete;
  
  renderChapterList();

  const progressFill = document.querySelector(".progress-track-fill");
  if (progressFill) progressFill.style.width = `${percentComplete}%`;
  const progressText = document.querySelector(".progress-summary-bar-box small");
  if (progressText) progressText.textContent = `${percentComplete}% Complete`;
  const progressCount = document.querySelector(".progress-summary-bar-box span b");
  if (progressCount) progressCount.textContent = `${completedCount}/subproject ${totalChapters}`;

  // Execute actual API calls asynchronously in the background
  api(`/projects/${state.currentProject.id}/chapters/${chapterIndex}`, { method: "POST" })
    .then(async () => {
      await loadMe();
    })
    .catch(err => {
      console.error("Error in background completion:", err);
    });
}

function getDynamicDeepTheory(project, chapterName) {
  const projName = project.name;
  const projDomain = project.domain;
  const projStack = project.stack || "React, Node.js, Express, MongoDB";
  const projModules = Array.isArray(project.modules) ? project.modules : ["Overview", "Authentication", "Dashboard"];
  const projObjective = project.objective || "Automate operational processes.";
  const projOutcomes = Array.isArray(project.outcomes) ? project.outcomes : ["Full-stack architecture", "REST API integration"];

  const theoryMap = {
    "Overview": {
      part1: `The <b>${projName}</b> platform is built on top of a highly modular service-oriented architecture designed to handle transaction volumes within the <b>${projDomain}</b> domain. By separating client views from backend services, the design ensures robust security boundaries and data isolation. This structural choice aligns with modern architectural patterns to ensure high system maintainability and scalability.`,
      part2: `The implementation partition organizes the codebase into modules like <b>${projModules.join(', ')}</b>. Authorized users (such as administrators, Cashiers, or Waiters) interact with these modules to trigger business workflows. Data flows from frontend interfaces to REST API handlers that process operations and persist states securely.`,
      part3: `From an engineering perspective, the system integrates the tech stack (<b>${projStack}</b>) to ensure horizontal scalability and fast processing. The design leverages connection pooling, database indexing, and caching to guarantee response times under 200ms. It also integrates failure logs and retry logic to keep operations resilient in production.`,
      part4: `The expected system behavior is a production-grade application that automates tasks and provides managers with real-time statistics. The final implementation helps students learn REST integrations, schema design, and unit testing protocols: <b>${projOutcomes.join(', ')}</b>.`
    },

    "Problem & Solution": {
      part1: `Legacy processing in <b>${projDomain}</b> suffers from structural flaws that result in transactional bottlenecks, data inconsistency, and manual reconciliation delays. The architecture of <b>${projName}</b> is conceptualized to replace these manual sheets with a centralized digital ledger. This transitions operational states from offline entry points to a secure cloud platform.`,
      part2: `The system implements automated validations and state transitions to manage operations like <b>${projModules[0]}</b> features. Operations are parsed using stateless requests, reducing dependency chains between services. Automated verification checks ensure changes are distributed across active panels instantly.`,
      part3: `Engineering considerations focus on reducing processing delays and preventing human transcription errors. The platform implements constraint checks at the database layer to block contradictory updates and protect transactional fields. Database indexes optimize search parameters, keeping daily query executions efficient.`,
      part4: `Deploying <b>${projName}</b> eliminates operational bottlenecks, secures historical logs, and decreases transaction processing times by 90%. Candidates gain a complete understanding of how automated backend services solve real-world industrial overhead.`
    },

    "Requirements": {
      part1: `The requirement structure for <b>${projName}</b> maps user permissions directly to system boundaries. The design organizes access configurations into multiple privilege roles to restrict operations securely. By segregating roles, the architecture prevents unauthorized actions on core tables.`,
      part2: `The platform handles functional parameters like input checks and validations for <b>${projModules.join(', ')}</b>. The input pipeline rejects malformed inputs, verifying that quantities are non-negative, and IDs are valid. Business rules block conflicting transactions and handle exceptions gracefully.`,
      part3: `Non-functional criteria specify sub-200ms latency SLAs, high query throughput, and database rollback protections. Connections to databases are pooled, and sessions are encrypted using secure header tokens. Hardware resource usage is optimized to support containerised microservices deployment.`,
      part4: `Developers implement a robust operational structure that handles edge-case validations and rejects bad payloads. The final outcome is a secure validation layer matching industry auditing standards.`
    },

    "Workflow": {
      part1: `The transaction state machine of <b>${projName}</b> coordinates user interactions and data movements across modules. The state flow models clear transitions, ensuring entities transition through strict operational stages. This flow coordinates events from system triggers to transactional logs.`,
      part2: `Operators access the interface and initialize inputs within <b>${projModules[0]}</b> or <b>${projModules[1]}</b>. Backend controllers process payloads, evaluate business policies, and persist states to the database. Upon completion, updated dashboard views are pushed to the client immediately.`,
      part3: `Exception paths manage database connection drops, token expiration, and payload rejections by rolling back active transactions. The system ensures that no partial states are stored, preserving data consistency. Status change events are audited with timestamps and operator details.`,
      part4: `The workflow yields a clean process execution cycle that prevents invalid states and recovers gracefully from errors. Interns master mapping sequences and state validation logic.`
    },

    "Modules": {
      part1: `Decoupling system responsibilities is the primary goal of the modular design inside <b>${projName}</b>. The architecture organizes core functions into modules like <b>${projModules.join(', ')}</b> to minimize side-effects. This prevents changes in styling from breaking database queries.`,
      part2: `The <b>${projModules[0]}</b> module handles initialization routing, while <b>${projModules[1]}</b> processes state logic. Aggregate reporting is isolated inside <b>${projModules[2] || 'Reports'}</b> module to analyze logs. Interfaces communicate using clean resource endpoints.`,
      part3: `Modules map dependencies unidirectionally to avoid circular imports and facilitate independent testing. Repository layers encapsulate database calls, keeping routes decoupled from MongoDB or SQL schemas. Resource pooling isolates heavy aggregations from transactional processes.`,
      part4: `The modular structure allows developers to build, test, and deploy features incrementally without regression. The final build satisfies clean-code standards and microservices requirements.`
    },

    "Architecture": {
      part1: `The multi-tier architecture of <b>${projName}</b> separates styling, application logic, and storage services. The frontend client leverages <b>${projStack}</b> to render forms, while backend services process transactions. This layer separation is vital for system maintainability.`,
      part2: `Client dashboards fetch data from stateless REST controllers over secure HTTPS routes. Controllers validate tokens, sanitize body fields, and execute database schema methods. Query outputs are returned as JSON payloads to update user panels.`,
      part3: `Scaling is achieved by decoupling routing endpoints, allowing horizontal replication of backend servers. Database indexing prevents slow queries under concurrent user request peaks. The architecture integrates error-handling filters to prevent server crashes.`,
      part4: `The architecture delivers a high-throughput, low-latency application framework that scales dynamically. Developers gain hands-on experience designing 3-tier enterprise patterns.`
    },

    "Database": {
      part1: `Data persistence inside <b>${projName}</b> is structured to represent relationships between core entities. The schemas manage collections like <b>${projModules.map(m => m.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 5).join(', ')}</b>. Document IDs and index configurations secure operational logging.`,
      part2: `Documents use primary key values and reference object identifiers to represent associations. Constraint checks block duplicate payments, negative totals, or orphaned items. Data validations are enforced at both application and storage layers.`,
      part3: `Index keys are added to status fields, creation dates, and reference IDs to speed up lookups. Transactions use atomic boundaries; operations like modifying orders and updating inventories commit or rollback together. Backup scripts automate data exports to secure recovery targets.`,
      part4: `Query executions run efficiently with sub-50ms search delays under peak database sizes. The database design provides complete audit trails and data integrity.`
    },

    "APIs": {
      part1: `Backend REST APIs expose resource endpoints to connect frontend screens to database tables. Paths are mapped using HTTP verbs (GET, POST, PUT, DELETE) to manage collections inside <b>${projModules.slice(0, 3).join(', ')}</b>. Endpoints are documented using standard specs.`,
      part2: `<code>POST</code> routes handle record registration, while <code>PUT</code> endpoints modify states using path parameter identifiers. Express controllers utilize middleware checks to validate session headers before querying database collections. Malformed request bodies trigger immediate bad-request rejections.`,
      part3: `The API design uses try/catch blocks to trap errors and return standard JSON error structures. Pagination and filters are configured on listing routes to limit server payload size. API versions are isolated to prevent breaking changes on legacy clients.`,
      part4: `Client requests receive responses in under 200ms, ensuring real-time dashboard views. Students learn endpoint structure design and response protocol standards.`
    },

    "Security": {
      part1: `Protecting transaction logs and user credentials from common vulnerabilities is a core architecture priority. The security tier configures authentication and role-based access filters to restrict sensitive routes. This ensures Cashiers cannot access Admin statistics.`,
      part2: `Passwords are encrypted using hashing algorithms before saving records. Input parameters are sanitized and verified to block SQL injection and cross-site scripting attempts. JWT tokens are verified in request headers to authorize user operations.`,
      part3: `Express middleware limits requests per client to protect endpoints from brute-force queries. Server configurations and database passwords are saved inside environment files instead of source code. Route logs capture security incidents and access details.`,
      part4: `The application stands secure against OWASP top vulnerabilities, protecting database collections. Interns master secure coding patterns and credential handling.`
    },

    "UI/UX": {
      part1: `The visual design of <b>${projName}</b> focuses on delivering an intuitive dashboard to manage operations. Screen layouts separate search tables, input forms, state metrics, and administrative panels cleanly. Visual hierarchies direct user focus to critical tasks.`,
      part2: `Users navigate modules, submit data forms, and filter tables dynamically. Layout components leverage CSS transitions and loader indicators to communicate state changes during async fetches. Success messages confirm database operations.`,
      part3: `Views are built to scale dynamically, adapting layouts for mobile, tablet, and desktop screens. Client inputs are validated in real-time, displaying helper warnings before API calls are fired. Accessibility rules ensure keyboard and screen-reader support.`,
      part4: `The client dashboard delivers a responsive, low-friction user experience. Developers learn to design visual state machines and connect views to APIs.`
    },

    "Code Examples": {
      part1: `The codebase files are organized to reflect clean code principles and decoupling rules. Model schemas, routing files, controller handlers, and validation scripts reside in dedicated directories. This partition keeps files short and readable.`,
      part2: `Schema files define validations, while router modules configure endpoints. Controller handlers coordinate data fetches, verify privileges, and return JSON responses. Middleware wrappers trap async exceptions, preventing process failures.`,
      part3: `Code conventions prioritize naming standards, small functions, and thorough documentation. Exception handlers return formatted JSON errors containing clear details instead of raw backend stack traces. Testing folders host unit assertions.`,
      part4: `The codebase provides a production-grade template for building scalable apps. Students learn professional refactoring and coding standards.`
    },

    "Testing": {
      part1: `The testing architecture verifies validation constraints, routes, and database operations. Unit checkers, integration assertions, and UI triggers are organized into automated scripts. This coverage guarantees system stability.`,
      part2: `Unit tests verify functions like calculations or input checking. Integration suites trigger endpoints, asserting that controllers query collections correctly and return proper HTTP status codes. Negative checks ensure bad requests are blocked.`,
      part3: `Edge tests simulate invalid quantities, expired session tokens, and database drops to verify rollback paths. Tests run on local environments and automatically execute inside CI pipeline triggers. Assertions compare database records before and after mock runs.`,
      part4: `The test suites verify code changes and identify bugs before code merges. Interns learn assertion structures and test coverage configuration.`
    },

    "Deployment": {
      part1: `The deployment plan targets cloud environments running containerised instances of <b>${projName}</b>. The server topology decouples static frontend hosting from dynamic API services and cloud storage instances. This separation reduces costs and improves availability.`,
      part2: `Frontend code is built and deployed to static content networks. Backend dynamic microservices run in container environments, while database servers are configured with restricted IP rules. Configuration files isolate secret variables.`,
      part3: `CI/CD pipelines automate building, testing, and deploying updates upon git commits. Monitoring tools track server performance, memory footprints, and endpoint latency SLAs. Server logs capture route errors and runtime statistics.`,
      part4: `The deployment architecture ensures high uptime and automatic recovery. Interns learn server provisioning, container configurations, and env setups.`
    },

    "Assignment": {
      part1: `The candidate assignment assesses practical skills in building and securing <b>${projName}</b> services. Developers must extend features, model collections, write APIs, and configure validations. This verifies the intern's engineering capability.`,
      part2: `Candidates build schema classes and code endpoints for <b>${projModules.slice(0, 3).join(', ')}</b>. Frontend dashboard panels are connected to these backend paths to display live states. Testing scripts must assert validation safety.`,
      part3: `Deliverables must conform to strict performance SLAs and coding conventions. The code must handle failure scenarios and validate input boundaries correctly. Final code is pushed to GitHub, accompanied by setup documentation.`,
      part4: `Students implement, test, and deploy features, proving full-stack development capability. The assignment prepares interns for actual industry expectations.`
    },

    "Quiz": {
      part1: `The assessment quiz evaluates technical and conceptual understanding of the <b>${projName}</b> system. Before starting, students should review routing configurations, database indexes, validation rules, and security frameworks.`,
      part2: `Questions test scenarios, such as identifying endpoint verbs for modifications or tracking collection keys. Answers require analyzing database structures and comparing security rules. Explanations clarify concepts.`,
      part3: `Quiz items verify that students understand why specific indexes or rollbacks are used in production. The evaluation covers error-handling codes and CORS setups. Passing validates core system understanding.`,
      part4: `The evaluation confirms that the candidate possesses the theoretical knowledge required to manage systems. It validates technical competence in building and securing apps.`
    },

    "References": {
      part1: `The reference index coordinates learning resources and documentation for the <b>${projName}</b> stack. It links official manuals for <b>${projStack}</b> to clarify configuration details, query formats, and deployment.`,
      part2: `References include documentation for libraries used to validate inputs, encrypt fields, and handle tokens. Best practice articles detail how to structure transactional schemas within the <b>${projDomain}</b> domain.`,
      part3: `Material covers database indexing, stateless REST API designs, and Docker configuration files. These guidelines provide the context required to resolve coding errors and optimize data queries.`,
      part4: `The references build a learning roadmap to guide interns during implementation. They ensure that candidate code aligns with standard software practices.`
    }
  };

  const currentObj = theoryMap[chapterName] || theoryMap["Overview"];
  return currentObj;
}

function getEnhancedChapterContent(project, chapterIndex, chapterName, completedCount, totalChapters = 16, chapObj = {}) {
  const isOverview = chapterName === "Overview" || chapterIndex === 0;
  const remainingCount = Math.max(0, totalChapters - completedCount);
  const percentComplete = Math.round((completedCount / totalChapters) * 100);
  const readingTime = chapObj.readingTime || "15 min";
  const codingTime = chapObj.codingTime || "2 hours";
  const difficulty = chapObj.difficulty || project.level || "Intermediate";

  // Dynamic Objectives and Outcomes Map per Chapter
  const objectivesMap = {
    "Overview": {
      objective: project.objective || "Analyze and initialize the system setup.",
      outcomes: project.outcomes || ["Full-stack architecture", "REST API integration"]
    },
    "Problem & Solution": {
      objective: `Solve the manual operational limitations of the manual ${project.domain} processes.`,
      outcomes: ["Before/after workflow comparisons", "Operational process mapping"]
    },
    "Requirements": {
      objective: `Identify all functional validation rules and hardware requirements for ${project.name}.`,
      outcomes: ["User permission matrix creation", "Input validation schema specifications"]
    },
    "Workflow": {
      objective: `Map customer, waiter, administrative, or edge journeys for the system state changes.`,
      outcomes: ["System sequence modeling", "Status transition logic mapping"]
    },
    "Modules": {
      objective: `Partition the ${project.name} structure into modular, decoupled units.`,
      outcomes: ["Subsystem encapsulation design", "Internal module dependency management"]
    },
    "Architecture": {
      objective: `Design the 3-tier client-server structure of the ${project.name} platform.`,
      outcomes: ["Component responsibility separation", "System scalability architectures"]
    },
    "Database": {
      objective: `Construct normalized relational tables or document schemas for ${project.name}.`,
      outcomes: ["Query execution optimization", "Primary and foreign reference keys configuration"]
    },
    "APIs": {
      objective: `Expose stateless REST interfaces connecting frontend forms to backend databases.`,
      outcomes: ["Query parameters handling", "Structured JSON error response formats"]
    },
    "Security": {
      objective: `Secure routes and sanitize incoming payloads for the ${project.name} endpoints.`,
      outcomes: ["Role-based routing authentication", "Data hashing protection"]
    },
    "UI/UX": {
      objective: `Build responsive interfaces displaying data metrics with clean loaders.`,
      outcomes: ["Interactive state feedback loops", "UX form designs"]
    },
    "Code Examples": {
      objective: `Inspect controller templates and routes to align code with standards.`,
      outcomes: ["Clean-code patterns application", "Structured exception handling"]
    },
    "Testing": {
      objective: `Assert codebase resilience using unit checkers and validation suites.`,
      outcomes: ["Positive and negative testing validation", "Edge exception coverage metrics"]
    },
    "Deployment": {
      objective: `Compile production-ready packages and host client, database, and API layers.`,
      outcomes: ["Environment variables configuration", "Containerised hosting deployment"]
    },
    "Assignment": {
      objective: `Implement split features or complex route handlers to complete the build.`,
      outcomes: ["Independent problem solving", "Real enterprise task submission"]
    },
    "Quiz": {
      objective: `Test knowledge of route parameters, collection indexing, and security policies.`,
      outcomes: ["Competency check confirmation", "Conceptual validation verification"]
    },
    "References": {
      objective: `Explore documentation links to master the libraries used in ${project.name}.`,
      outcomes: ["Continuous developer learning", "Official documentation lookup skill"]
    }
  };

  const currentObj = objectivesMap[chapterName] || objectivesMap["Overview"];
  const objective = currentObj.objective;
  const outcomes = currentObj.outcomes;

  const cleanProjId = project.id.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const cleanModName = (project.modules && project.modules[chapterIndex % project.modules.length]) || "Core Module";

  // Build tech stack pills dynamically from project stack
  const techPills = (project.stack || "React, Node.js, Express, MongoDB")
    .split(",")
    .map(t => t.trim())
    .map((t, idx) => {
      const colors = [
        { bg: "#e0e7ff", text: "#3730a3" },
        { bg: "#fef3c7", text: "#92400e" },
        { bg: "#dcfce7", text: "#166534" },
        { bg: "#ccfbf1", text: "#115e59" },
        { bg: "#f3e8ff", text: "#6b21a8" },
        { bg: "#fee2e2", text: "#991b1b" }
      ];
      const color = colors[idx % colors.length];
      return `<span class="pill" style="background:${color.bg};color:${color.text}">${t}</span>`;
    }).join("");

  const { part1, part2, part3, part4 } = getDynamicDeepTheory(project, chapterName);

  // Chapter-specific roadmaps
  const roadmapMap = {
    "Overview": [
      "Analyze business problems and goals.",
      "Identify target user roles.",
      "Define technology stack requirements."
    ],
    "Problem & Solution": [
      "Document manual processes.",
      "Identify pain points and risks.",
      "Draft software-driven solutions."
    ],
    "Requirements": [
      "List functional inputs and outputs.",
      "Establish parameter validations.",
      "Define system hardware constraints."
    ],
    "Workflow": [
      "Model sequence diagrams.",
      "Map exception flows.",
      "Verify state transitions."
    ],
    "Modules": [
      "Partition subsystems.",
      "Map module dependencies.",
      "Design internal schemas."
    ],
    "Architecture": [
      "Detail structural tiers.",
      "Establish API layer controllers.",
      "Outline scaling patterns."
    ],
    "Database": [
      "Define schemas and fields.",
      "Establish lookup key indexes.",
      "Verify relation structures."
    ],
    "APIs": [
      "Specify path parameters and bodies.",
      "Secure paths with auth middleware.",
      "Document error codes."
    ],
    "Security": [
      "Implement password hashes.",
      "Enforce token permissions.",
      "Sanitize incoming payloads."
    ],
    "UI/UX": [
      "Draft user screen layouts.",
      "Design loading and error indicators.",
      "Verify responsive views."
    ],
    "Code Examples": [
      "Build controller functions.",
      "Write router logic.",
      "Integrate exception handlers."
    ],
    "Testing": [
      "Write test verification scripts.",
      "Execute failure validations.",
      "Assert API code responses."
    ],
    "Deployment": [
      "Set production environment variables.",
      "Compile application builds.",
      "Launch cloud database servers."
    ],
    "Assignment": [
      "Clone the project repository.",
      "Code missing features.",
      "Submit the GitHub repository URL."
    ],
    "Quiz": [
      "Review documentation chapters.",
      "Study database keys and APIs.",
      "Answer quiz questions."
    ],
    "References": [
      "Read tech stack documentations.",
      "Check pattern references.",
      "Explore sample repositories."
    ]
  };

  const roadmapSteps = roadmapMap[chapterName] || roadmapMap["Overview"];

  // Chapter-specific git commits
  const gitMap = {
    "Overview": `git commit -m "init: initialize ${project.name} repository structure"`,
    "Database": `git commit -m "feat(db): establish database schemas for ${project.name}"`,
    "APIs": `git commit -m "feat(api): implement REST controller routes for ${project.name}"`,
    "Security": `git commit -m "sec(auth): enforce authorization rules for ${project.name} endpoints"`,
    "Testing": `git commit -m "test(coverage): add unit testing assertions for ${project.name}"`,
    "UI/UX": `git commit -m "feat(ui): style dashboard panels for ${project.name} view"`,
  };

  const gitCommand = gitMap[chapterName] || `git commit -m "feat(${cleanProjId}): implement ${chapterName} module for ${project.name}"`;

  // Helper function to highlight key technical terms dynamically
  function highlightTechTerms(text) {
    const terms = [
      "RESTful APIs", "REST APIs", "REST API", "database", "Mongoose", "schemas", "indexes", "JWT", 
      "authorization", "authentication", "stateless", "SQL", "NoSQL", "Docker", "VPS", 
      "latency", "SLA", "unit tests", "integration testing", "validation rules", "CORS", 
      "encryption", "audit trail", "audit logs", "session management", "connection pooling", 
      "horizontal scaling", "load balancing", "API endpoints", "HTTP methods", "JSON payloads",
      "validation middleware", "Mongoose models", "Express controllers"
    ];
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, "gi");
      highlighted = highlighted.replace(regex, `<strong>$1</strong>`);
    });
    return highlighted;
  }
  return `
    <div class="enhancement-sections-wrapper" style="margin-top:24px;display:grid;gap:20px">
      <!-- Theoretical Cards Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div class="stat-badge-card" style="background:var(--card2);padding:12px;border:1px solid var(--border);border-radius:10px">
          <span class="muted" style="font-size:12px;display:block">Estimated Reading</span>
          <b style="color:var(--navy);font-size:16px">📖 ${readingTime}</b>
        </div>
        <div class="stat-badge-card" style="background:var(--card2);padding:12px;border:1px solid var(--border);border-radius:10px">
          <span class="muted" style="font-size:12px;display:block">Estimated Coding</span>
          <b style="color:var(--navy);font-size:16px">💻 ${codingTime}</b>
        </div>
        <div class="stat-badge-card" style="background:var(--card2);padding:12px;border:1px solid var(--border);border-radius:10px">
          <span class="muted" style="font-size:12px;display:block">Difficulty Level</span>
          <b style="color:var(--blue);font-size:16px">⚡ ${difficulty}</b>
        </div>
      </div>

      <!-- Chapter Specific Theoretical Specifications -->
      <style>
        .deep-theory-paragraph-flow strong {
          color: var(--navy);
          font-weight: 600;
        }
      </style>
      <div class="enhancement-card deep-theory-panel" style="border-left: 5px solid var(--navy); background: linear-gradient(180deg, var(--card2) 0%, var(--card) 100%); padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-radius: 12px; margin-bottom: 20px;">
        <h4 class="card-title" style="font-size: 15px; font-weight: 700; color: var(--navy); margin: 0 0 18px 0; border-bottom: 1px solid var(--border); padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 8px;">📚 Deep Theoretical Architecture & Specifications</span>
          <span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; border: 1px solid #bae6fd;">Interactive Spec</span>
        </h4>
        <div class="deep-theory-paragraph-flow" style="font-size: 13px; line-height: 1.7; color: var(--text); display: flex; flex-direction: column; gap: 20px;">
          <div>
            <h5 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: var(--navy);">1. Architecture & Concept</h5>
            <p style="margin: 0; text-align: justify; line-height: 1.7;">${highlightTechTerms(part1)}</p>
          </div>
          <div>
            <h5 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: var(--navy);">2. Project Implementation</h5>
            <p style="margin: 0; text-align: justify; line-height: 1.7;">${highlightTechTerms(part2)}</p>
          </div>
          <div>
            <h5 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: var(--navy);">3. Engineering Factors</h5>
            <p style="margin: 0; text-align: justify; line-height: 1.7;">${highlightTechTerms(part3)}</p>
          </div>
          <div>
            <h5 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: var(--navy);">4. Expected System Outcome</h5>
            <p style="margin: 0; text-align: justify; line-height: 1.7;">${highlightTechTerms(part4)}</p>
          </div>
        </div>
      </div>
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🎯 Chapter Technical Objective</h4>
          <p style="margin:4px 0 0;font-size:13px;line-height:1.5">${objective}</p>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">💡 Learning Outcomes</h4>
          <ul style="margin:6px 0 0;padding-left:20px;font-size:13px">
            ${(Array.isArray(outcomes) ? outcomes : [outcomes]).map(o => `<li>&bull; ${o}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Real World Use Cases & Tech Stack -->
      ${isOverview ? `
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🛠️ Core Technologies & Tools</h4>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${techPills}
          </div>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">🏢 Real-World Enterprise Application</h4>
          <p style="font-size:13px;line-height:1.5">
            The <b>subproject ${project.name}</b> platform is engineered specifically to process real-time events, maintain high reliability standards in <b>subproject ${project.domain}</b>, and provide a secure digital auditing trace.
          </p>
        </div>
      </div>
      ` : `
      <div class="enhancement-card">
        <h4 class="card-title">🏢 Real-World Enterprise Application</h4>
        <p style="font-size:13px;line-height:1.5">
          The <b>subproject ${project.name}</b> platform is engineered specifically to process real-time events, maintain high reliability standards in <b>subproject ${project.domain}</b>, and provide a secure digital auditing trace.
        </p>
      </div>
      `}

      <!-- Implementation Roadmap -->
      <div class="enhancement-card">
        <h4 class="card-title">🚀 Step-by-Step Implementation Roadmap</h4>
        <ol style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.6">
          ${roadmapSteps.map((step, sIdx) => `<li><b>Phase ${sIdx + 1}:</b> ${step}</li>`).join("")}
        </ol>
      </div>

      <!-- Git Workflow -->
      <div class="enhancement-card">
        <h4 class="card-title">⚡ Git Version Control Commands</h4>
        <pre class="code-tree-box"><code>${gitCommand}</code></pre>
      </div>

      <!-- Progress Summary Bar -->
      <div class="progress-summary-bar-box" style="background:var(--card2);padding:16px;border:1px solid var(--border);border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>📊 Project Progress Summary</b>
          <span><b>${completedCount}/subproject ${totalChapters}</b> Chapters Finished (${remainingCount} Remaining)</span>
        </div>
        <div class="progress-track-bg" style="background:var(--border);height:8px;border-radius:4px;overflow:hidden">
          <div class="progress-track-fill" style="width:${percentComplete}%;background:var(--green);height:100%"></div>
        </div>
        <small class="muted" style="display:block;margin-top:6px;text-align:right">${percentComplete}% Complete</small>
      </div>
    </div>
  `;
}

function renderChapter() {
  const p = state.currentProject;
  const docChapters = (state.currentDoc?.chapters || []).filter(c => c.isEnabled !== false && c.status !== "draft");
  const activeChapObj = docChapters[state.currentChapter] || {
    id: `chap_${state.currentChapter}`,
    title: CHAPTERS[state.currentChapter] || "Overview",
    chapterNumber: state.currentChapter + 1,
    mainHeading: `${state.currentChapter + 1}. ${CHAPTERS[state.currentChapter] || "Overview"}`,
    introduction: p.summary,
    importantSubtopics: ["Business purpose", "Actors & permissions", "Fields and validation", "Workflow and exceptions", "Database and API mapping", "Testing and deployment"],
    projectObjective: p.objective || "Automate operations and reporting.",
    learningOutcomes: p.outcomes || ["Full-stack architecture", "REST API integration"],
    readingTime: "15 min",
    codingTime: "2 hours",
    difficulty: p.difficulty || "Intermediate"
  };

  const chapterTitle = activeChapObj.title;
  const totalChaptersCount = docChapters.length || CHAPTERS.length;

  const completed = state.publicMode
    ? JSON.parse(localStorage.getItem(`publicProgress:${p.id}`)||"[]")
    : (state.user?.progress?.[p.id]?.completedChapters || []);

  const progressEnabled = state.currentDoc?.progressEnabled !== false;

  // Render project header summary card
  let body = `
    <div class="summarybox" style="margin-bottom:16px; border-left:4px solid var(--navy); padding:14px; background:var(--card);">
      <h3 style="margin:0 0 6px 0">${state.currentDoc?.projectTitle || p.name}</h3>
      <p style="margin:0 0 10px 0; font-size:13px; line-height:1.4;">${state.currentDoc?.projectDescription || p.summary}</p>
      <div style="display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:var(--text-muted);">
        <span>Domain: <b>${p.domain}</b></span> · 
        <span>Difficulty: <b>${p.difficulty || p.level || "Intermediate"}</b></span> · 
        <span>Duration: <b>${p.duration || "4-6 Weeks"}</b></span>
      </div>
    </div>
    <div class="chapter-queue">
      ${docChapters.map((c, i) => `<span class="queue-chip ${completed.includes(i)||completed.includes(c.title)||completed.includes(c.id)?"done":""} ${i===state.currentChapter?"current":""}">${c.chapterNumber || (i+1)}</span>`).join("")}
    </div>`;

  const isQuizChapter = activeChapObj.title === "Quiz" || String(activeChapObj.chapterNumber) === "15" || state.currentChapter === 14;
  if (isQuizChapter) {
    $("chapterContent").innerHTML = `
      <section class="chapter">
        <div class="tracking-strip">
          <span>Chapter ${state.currentChapter + 1}/${totalChaptersCount}</span>
        </div>
        <div id="activeQuizContainer" style="margin-top:14px">Loading Quiz details...</div>
      </section>
    `;
    loadStudentQuiz(p.id);
    return;
  }

  if (activeChapObj.introduction) {
    body += `<div class="chapter-intro-box" style="margin:16px 0;line-height:1.6;font-size:14px;color:var(--text)">${activeChapObj.introduction}</div>`;
  }

  const isOverviewChapter = activeChapObj.title === "Overview" || String(activeChapObj.chapterNumber) === "1" || state.currentChapter === 0;

  if (isOverviewChapter && Array.isArray(activeChapObj.importantSubtopics) && activeChapObj.importantSubtopics.length) {
    body += `<h3>Important Subtopics</h3><ul>${activeChapObj.importantSubtopics.map(st => `<li>${st}</li>`).join("")}</ul>`;
  }

  // isQuizChapter is already declared at the top of renderChapter

  if (Array.isArray(activeChapObj.sections) && activeChapObj.sections.length) {
    activeChapObj.sections.forEach((sec, qIdx) => {
      if (isQuizChapter && sec.heading.toLowerCase().includes("question")) {
        // Render as interactive quiz question
        const optionsHtml = (sec.bulletPoints || [])
          .filter(bp => !bp.trim().toLowerCase().startsWith("explanation:"))
          .map((bp, oIdx) => {
            const isCorrect = bp.toLowerCase().includes("(correct)");
            const labelText = bp.replace(/\(correct\)/i, "").trim();
            const optionId = `quiz_${qIdx}_option_${oIdx}`;
            return `
              <label class="quiz-option-label" style="display:block;margin:8px 0;font-size:13px;cursor:pointer;padding:6px;border-radius:6px;background:var(--bg);border:1px solid var(--border)">
                <input type="radio" name="quiz_question_${qIdx}" value="${oIdx}" data-correct="${isCorrect}" style="margin-right:8px;">
                ${labelText}
              </label>
            `;
          }).join("");

        const explanationBlock = (sec.bulletPoints || []).find(bp => bp.trim().toLowerCase().startsWith("explanation:"));
        const explanationHtml = explanationBlock ? `<div class="quiz-explanation muted" style="display:none;margin-top:8px;font-size:12px;color:var(--text-muted);border-left:2px solid var(--green);padding-left:8px;">${explanationBlock}</div>` : "";

        body += `
          <div class="enhancement-card quiz-question-card" style="margin-top:16px;" data-qidx="${qIdx}">
            <h4 class="card-title">${sec.heading}</h4>
            <p style="font-size:13px;line-height:1.5;margin-bottom:10px;">${sec.content}</p>
            <div class="quiz-options-container">${optionsHtml}</div>
            ${explanationHtml}
          </div>
        `;
      } else {
        // Normal section rendering
        body += `<div class="enhancement-card" style="margin-top:16px">
          <h4 class="card-title">${sec.heading || "Section"}</h4>
          ${sec.content ? `<p style="font-size:13px;line-height:1.5">${sec.content}</p>` : ""}
          ${Array.isArray(sec.bulletPoints) && sec.bulletPoints.length ? `<ul>${sec.bulletPoints.map(bp=>`<li>${bp}</li>`).join("")}</ul>` : ""}
        </div>`;
      }
    });

    if (isQuizChapter) {
      // Add Submit Quiz button
      const hasPassed = state.publicMode 
        ? localStorage.getItem(`quizPassed:${p.id}`) === "true"
        : (state.user?.progress?.[p.id]?.quizPassed === true);

      body += `
        <div class="enhancement-card" style="margin-top:16px;text-align:center;">
          ${hasPassed ? `
            <div style="color:var(--green);font-weight:bold;margin-bottom:12px;">🎉 You have passed the quiz for this project!</div>
          ` : `
            <button class="btn primary" id="quizButton" type="button" style="padding:10px 24px;">Submit Quiz Answers</button>
          `}
        </div>
      `;
    }
  }

  if (Array.isArray(activeChapObj.codeExamples) && activeChapObj.codeExamples.length) {
    activeChapObj.codeExamples.forEach(ce => {
      body += `<div class="enhancement-card" style="margin-top:16px">
        <h4 class="card-title">💻 ${ce.title || "Code Example"} (${ce.language || "code"})</h4>
        <pre class="code-tree-box"><code>${ce.code}</code></pre>
        ${ce.explanation ? `<p class="muted" style="font-size:12px;margin-top:6px">${ce.explanation}</p>` : ""}
      </div>`
    });
  }

  body += getEnhancedChapterContent(p, state.currentChapter, chapterTitle, completed.length, totalChaptersCount, activeChapObj);

  const noteKey = `note:${p.id}:${state.currentChapter}`;

  $("chapterContent").innerHTML = `<section class="chapter">
    <div class="tracking-strip">
      <span>Mode: <b>${state.currentDoc?.mode || (state.publicMode ? "Documentation Preview" : "Tracked Learning")}</b></span>
      <span>Progress changes: <b>${progressEnabled ? (state.publicMode ? "Disabled" : "Enabled") : "Disabled"}</b></span>
      <span>Chapter ${state.currentChapter + 1}/${totalChaptersCount}</span>
    </div>
    <h2 style="margin:0 0 12px 0">${activeChapObj.mainHeading || chapterTitle}</h2>
    ${body}
    ${state.publicMode ? `
      <div class="preview-information">
        <div class="preview-info-card"><b>Documentation Preview</b><span>Read all chapters without changing tracked progress.</span></div>
        <div class="preview-info-card"><b>Tracking ${progressEnabled ? "Disabled in Preview" : "Disabled by Admin"}</b><span>Select 4 projects and use Start / Continue for chapter completion.</span></div>
      </div>` : `
      <div class="notes-section"><h3>Intern Notes</h3><textarea id="noteBox" class="notes">${localStorage.getItem(noteKey) || ""}</textarea><button class="btn outline" id="saveNoteButton" type="button">Save Notes</button></div>`}
    <div class="chapter-actions">
      <button class="btn outline" id="prevChapter" ${state.currentChapter===0?"disabled":""}>← Previous</button>
      ${state.publicMode ? `
        <button class="btn outline" id="backToProjectsButton">← Back to Projects</button>
      ` : (completed.includes(state.currentChapter) || completed.includes(chapterTitle) ? `
        <button class="btn success" id="completeChapterButton" style="background:var(--green);color:#fff;cursor:default;opacity:0.9" disabled>✓ Chapter Completed</button>
      ` : `
        <button class="btn success" id="completeChapterButton" ${!progressEnabled?"disabled":""}>Mark Chapter Complete</button>
      `)}
      <button class="btn primary" id="nextChapter" ${state.currentChapter===totalChaptersCount-1?"disabled":""}>Next →</button>
    </div>
  </section>`;

  if(!state.publicMode){
    if(state.token) {
      api(`/notes/${p.id}/${state.currentChapter}`)
        .then(res => {
          if(res?.note?.notes && $("noteBox")) {
            $("noteBox").value = res.note.notes;
          }
        })
        .catch(()=>{});
    }

    $("saveNoteButton").onclick = async () => {
      const val = $("noteBox").value;
      localStorage.setItem(noteKey, val);
      try {
        await api("/notes", {
          method: "POST",
          body: JSON.stringify({
            projectId: p.id,
            chapterId: state.currentChapter,
            chapterName: chapterTitle,
            notes: val
          })
        });
        notify("Notes saved to database permanently.");
        renderStudentNotes();
      } catch(err) {
        notify(`Notes saved locally: ${err.message}`);
      }
    };
    if (progressEnabled && !completed.includes(state.currentChapter) && !completed.includes(chapterTitle)) {
      $("completeChapterButton").onclick = completeChapter;
    }
  } else {
    $("backToProjectsButton").onclick = () => show("homeView");
  }
  $("prevChapter").onclick = () => openChapter(Math.max(0, state.currentChapter - 1));
  $("nextChapter").onclick = () => openChapter(Math.min(totalChaptersCount - 1, state.currentChapter + 1));
  if($("quizButton")) $("quizButton").onclick = submitQuiz;
}

/* INTERNSHIP NOTES CONTROLLERS */
let studentNotesCache = [];
let adminNotesCache = [];

async function renderStudentNotes() {
  const container = $("studentNotesGrid");
  if (!container || !state.token || state.publicMode) return;

  try {
    const res = await api("/notes");
    studentNotesCache = res?.notes || [];

    const projFilter = $("studentNoteProjectFilter");
    if (projFilter) {
      const selected = state.user?.selectedProjects || [];
      projFilter.innerHTML = `<option value="">All Projects</option>` +
        selected.map(pid => {
          const proj = PROJECTS.find(x => x.id === pid);
          return `<option value="${pid}">${proj ? proj.name : pid}</option>`;
        }).join("");
    }

    const chapFilter = $("studentNoteChapterFilter");
    if (chapFilter) {
      chapFilter.innerHTML = `<option value="">All Chapters</option>` +
        CHAPTERS.map((c, i) => `<option value="${i}">Chapter ${i+1}: ${c}</option>`).join("");
    }

    filterStudentNotes();
  } catch (err) {
    if (container) container.innerHTML = `<p class="muted">Unable to load notes: ${err.message}</p>`;
  }
}

function filterStudentNotes() {
  const container = $("studentNotesGrid");
  if (!container) return;

  const q = ($("studentNoteSearch")?.value || "").toLowerCase().trim();
  const proj = $("studentNoteProjectFilter")?.value || "";
  const chap = $("studentNoteChapterFilter")?.value || "";

  let list = [...studentNotesCache];

  if (proj) list = list.filter(n => n.projectId === proj);
  if (chap !== "") list = list.filter(n => Number(n.chapterId) === Number(chap));
  if (q) {
    list = list.filter(n =>
      (n.notes && n.notes.toLowerCase().includes(q)) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(q)) ||
      n.projectId.toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-notes-card" style="padding:20px;background:var(--card2);border:1px solid var(--border);border-radius:12px;grid-column:1/-1"><p class="muted" style="margin:0">No internship notes found matching criteria. Open a chapter to write & save notes.</p></div>`;
    return;
  }

  container.innerHTML = list.map(n => {
    const projObj = PROJECTS.find(p => p.id === n.projectId);
    const projName = projObj ? projObj.name : n.projectId;
    const projIcon = projObj ? projObj.icon : "📘";
    const dateStr = n.updatedAt ? new Date(n.updatedAt).toLocaleString() : "Recently";
    const snippet = n.notes.length > 140 ? n.notes.slice(0, 140) + "..." : n.notes;

    return `
      <article class="panel student-note-card">
        <div class="note-card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="pill"><b>${projIcon} ${projName}</b></span>
          <span class="pill">Ch ${Number(n.chapterId) + 1}: ${n.chapterName || CHAPTERS[n.chapterId]}</span>
        </div>
        <p class="note-card-preview" style="font-size:13px;line-height:1.5;margin:8px 0;white-space:pre-wrap;background:var(--bg);padding:10px;border-radius:8px;border:1px solid var(--border)">${snippet || "<i>No text written...</i>"}</p>
        <div class="note-card-footer" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <small class="muted">📅 ${dateStr}</small>
          <div class="note-actions" style="display:flex;gap:6px">
            <button class="btn btn-xs outline" type="button" onclick="openChapterFromNote('${n.projectId}', ${n.chapterId})">View Chapter</button>
            <button class="btn btn-xs primary" type="button" onclick="editStudentNotePrompt('${n.id}')">Edit Note</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function resetStudentNoteFilters() {
  if ($("studentNoteSearch")) $("studentNoteSearch").value = "";
  if ($("studentNoteProjectFilter")) $("studentNoteProjectFilter").value = "";
  if ($("studentNoteChapterFilter")) $("studentNoteChapterFilter").value = "";
  filterStudentNotes();
}

function openChapterFromNote(projectId, chapterIndex) {
  openProjectDocument(projectId, false);
  setTimeout(() => openChapter(Number(chapterIndex)), 100);
}

function editStudentNotePrompt(noteId) {
  const noteObj = studentNotesCache.find(n => n.id === noteId);
  if (!noteObj) return;

  const newText = prompt(`Edit Note for ${noteObj.chapterName || 'Chapter ' + (Number(noteObj.chapterId)+1)}:`, noteObj.notes);
  if (newText !== null) {
    api("/notes", {
      method: "POST",
      body: JSON.stringify({
        projectId: noteObj.projectId,
        chapterId: noteObj.chapterId,
        chapterName: noteObj.chapterName,
        notes: newText
      })
    }).then(() => {
      notify("Note updated successfully.");
      renderStudentNotes();
    }).catch(err => notify(`Update error: ${err.message}`, "error"));
  }
}

async function renderAdminNotes() {
  const container = $("adminNotesContainer");
  if (!container || !state.leaderToken) return;

  try {
    const res = await api("/admin/notes");
    adminNotesCache = res?.notes || [];

    const projFilter = $("adminNoteProjectFilter");
    if (projFilter) {
      projFilter.innerHTML = `<option value="">All Projects</option>` +
        PROJECTS.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    }

    const studFilter = $("adminNoteStudentFilter");
    if (studFilter) {
      const uniqueStudents = Array.from(new Set(adminNotesCache.map(n => n.studentId)));
      studFilter.innerHTML = `<option value="">All Students</option>` +
        uniqueStudents.map(sid => {
          const sample = adminNotesCache.find(n => n.studentId === sid);
          return `<option value="${sid}">${sample ? sample.studentName : sid}</option>`;
        }).join("");
    }

    filterAdminNotes();
  } catch (err) {
    if (container) container.innerHTML = `<p class="muted">Unable to load admin notes: ${err.message}</p>`;
  }
}

function filterAdminNotes() {
  const container = $("adminNotesContainer");
  if (!container) return;

  const q = ($("adminNoteSearch")?.value || "").toLowerCase().trim();
  const proj = $("adminNoteProjectFilter")?.value || "";
  const stud = $("adminNoteStudentFilter")?.value || "";

  let list = [...adminNotesCache];

  if (proj) list = list.filter(n => n.projectId === proj);
  if (stud) list = list.filter(n => n.studentId === stud);
  if (q) {
    list = list.filter(n =>
      (n.studentName && n.studentName.toLowerCase().includes(q)) ||
      (n.studentEmail && n.studentEmail.toLowerCase().includes(q)) ||
      (n.notes && n.notes.toLowerCase().includes(q)) ||
      (n.chapterName && n.chapterName.toLowerCase().includes(q)) ||
      (n.projectId && n.projectId.toLowerCase().includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `<p class="muted" style="padding:16px 0">No student internship notes found matching criteria.</p>`;
    return;
  }

  container.innerHTML = `
    <table class="table" style="margin-top:10px">
      <thead>
        <tr>
          <th>Student</th>
          <th>Project & Chapter</th>
          <th>Notes (Read-Only)</th>
          <th>Created At</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(n => {
          const projObj = PROJECTS.find(p => p.id === n.projectId);
          const projName = projObj ? projObj.name : n.projectId;
          const createdStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "-";
          const updatedStr = n.updatedAt ? new Date(n.updatedAt).toLocaleString() : "-";
          return `
            <tr>
              <td><b>${n.studentName || 'Student'}</b><br><small class="muted">${n.studentEmail || ''}</small></td>
              <td><span class="pill">${projName}</span><br><small>Ch ${Number(n.chapterId)+1}: ${n.chapterName || ''}</small></td>
              <td style="max-width:350px;white-space:pre-wrap;font-size:12px;background:var(--card2);padding:8px;border-radius:6px">${n.notes || '<i>Empty note</i>'}</td>
              <td><small>${createdStr}</small></td>
              <td><small>${updatedStr}</small></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function resetAdminNoteFilters() {
  if ($("adminNoteSearch")) $("adminNoteSearch").value = "";
  if ($("adminNoteProjectFilter")) $("adminNoteProjectFilter").value = "";
  if ($("adminNoteStudentFilter")) $("adminNoteStudentFilter").value = "";
  filterAdminNotes();
}

async function submitQuiz() {
  const answer=document.querySelector('input[name="quizAnswer"]:checked')?.value;
  if(!answer) return notify("Choose an answer first.","error");
  if(state.publicMode) return notify(answer==="backend"?"Correct answer.":"Try again.",answer==="backend"?"success":"error");
  try {
    const data=await api(`/projects/${state.currentProject.id}/quiz`,{method:"POST",body:JSON.stringify({answer})});
    await loadMe();
    notify(data.message);
    renderChapter();
  } catch(e){notify(e.message,"error");}
}

async function completeChapter() {
  if(state.publicMode){
    const key=`publicProgress:${state.currentProject.id}`;
    const completed=JSON.parse(localStorage.getItem(key)||"[]");
    if(!completed.includes(state.currentChapter)) completed.push(state.currentChapter);
    localStorage.setItem(key,JSON.stringify(completed));
    notify(`Chapter completed locally: ${completed.length}/${CHAPTERS.length}`);
    if(state.currentChapter<CHAPTERS.length-1) openChapter(state.currentChapter+1);
    return;
  }
  try{
    const data=await api(`/projects/${state.currentProject.id}/chapters/${state.currentChapter}`,{method:"POST"});
    await loadMe();
    notify(`Chapter completed. Progress ${data.progress.percent}%`);
    if(data.progress.percent>=100) showSubmission();
    else if(state.currentChapter<CHAPTERS.length-1) openChapter(state.currentChapter+1);
  }catch(e){notify(e.message,"error");}
}

function showSubmission() {
  $("chapterContent").innerHTML = `
    <section class="chapter">
      <h2>Project Submission</h2>
      <p>All chapters are complete. Pass the quiz and submit GitHub URL and Project ZIP.</p>
      
      <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:13px">GitHub Repository URL</label>
      <input id="githubUrl" class="input" placeholder="https://github.com/username/repository" style="margin-bottom:12px">
      
      <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:13px">Upload Project ZIP (Max 50MB)</label>
      <div style="margin-bottom:12px">
        <input type="file" id="projectZipFile" accept=".zip" style="display:none" onchange="handleZipSelection(this)">
        <button type="button" class="btn outline" onclick="$('projectZipFile').click()">Choose ZIP File</button>
        <span id="selectedZipInfo" style="margin-left:10px;font-size:13px;color:var(--text-muted)">No file chosen</span>
      </div>
      
      <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:13px">Submission Note</label>
      <textarea id="submissionNote" class="input" placeholder="Submission note" style="margin-bottom:16px"></textarea>
      
      <button class="btn success" id="submitProjectButton">Submit Project & Unlock Next</button>
    </section>
  `;
  $("submitProjectButton").onclick = submitProject;
}

window.handleZipSelection = function(input) {
  const file = input.files[0];
  const infoSpan = $("selectedZipInfo");
  if (!infoSpan) return;
  if (!file) {
    infoSpan.textContent = "No file chosen";
    return;
  }
  
  if (!file.name.endsWith(".zip")) {
    notify("Please select a valid .zip file.", "error");
    input.value = "";
    infoSpan.textContent = "No file chosen";
    return;
  }
  
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > 50) {
    notify("File size exceeds the 50 MB limit.", "error");
    input.value = "";
    infoSpan.textContent = "No file chosen";
    return;
  }
  
  infoSpan.textContent = `${file.name} (${sizeMb.toFixed(2)} MB)`;
};

async function submitProject() {
  const githubUrl = $("githubUrl").value.trim();
  const submissionNote = $("submissionNote").value.trim();
  const zipInput = $("projectZipFile");
  
  if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(githubUrl)) {
    notify("Enter a valid GitHub repository URL.", "error");
    return;
  }
  
  if (!zipInput || zipInput.files.length === 0) {
    notify("Please upload your project ZIP file.", "error");
    return;
  }
  
  const zipFile = zipInput.files[0];
  if (!zipFile.name.endsWith(".zip")) {
    notify("Please select a valid .zip file.", "error");
    return;
  }
  if (zipFile.size / (1024 * 1024) > 50) {
    notify("ZIP file size exceeds 50 MB.", "error");
    return;
  }
  
  const submitBtn = $("submitProjectButton");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading & Submitting...";
  
  try {
    const formData = new FormData();
    formData.append("githubUrl", githubUrl);
    formData.append("submissionNote", submissionNote);
    formData.append("projectZip", zipFile);
    
    const data = await api(`/projects/${state.currentProject.id}/submit`, {
      method: "POST",
      body: formData
    });
    
    await api(`/tracking/${state.currentProject.id}/stop`, { method: "POST" });
    clearInterval(state.sessionTimer);
    notify(data.message);
    await renderDashboard();
    show("dashboardView");
  } catch (e) {
    notify(e.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function backDashboard() {
  clearInterval(state.sessionTimer);
  const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);
  if (isAdmin) {
    await renderAdminDashboard();
    return show("adminView");
  }
  if(state.publicMode || !state.token) return show("homeView");
  try{
    await api(`/tracking/${state.currentProject.id}/stop`,{method:"POST"});
    await renderDashboard();
    show("dashboardView");
  }catch(e){notify(e.message,"error");}
}


// Reliable dashboard control fallback for dynamically rendered elements.
document.addEventListener("click", event => {
const preview = event.target.closest(".preview-project");
  if (preview) {
    event.preventDefault();
    event.stopPropagation();
    openProject(preview.dataset.id, true);
    return;
  }

  if (event.target.closest("#prevMonth")) {
    state.calendarMonth--;
    if (state.calendarMonth < 0) {
      state.calendarMonth = 11;
      state.calendarYear--;
    }
    renderCalendar();
    return;
  }

  if (event.target.closest("#nextMonth")) {
    state.calendarMonth++;
    if (state.calendarMonth > 11) {
      state.calendarMonth = 0;
      state.calendarYear++;
    }
    renderCalendar();
    return;
  }

  if (event.target.closest("#todayButton")) {
    const today = new Date();
    state.calendarYear = today.getFullYear();
    state.calendarMonth = today.getMonth();
    renderCalendar();
    return;
  }

  if (event.target.closest("#exportReportButton")) {
    exportReport();
  }
});


// Final single fallback for dynamically generated project buttons.
document.addEventListener("click", function (event) {
  const trackedButton = event.target.closest(".tracked-open");
  if (trackedButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.openTrackedProjectSafe(trackedButton.dataset.id);
    return;
  }

  const previewButton = event.target.closest(".preview-project");
  if (previewButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.openPreviewProjectSafe(previewButton.dataset.id);
  }
}, true);



/* Floating camera and work-proof system */
const cameraState = {
  stream: null,
  working: false,
  startedAt: null,
  timer: null,
  attentionTimer: null,
  detector: null,
  focusedSeconds: 0,
  totalSeconds: 0,
  sessionSeconds: 0,
  facePresent: false,
  lastFaceCheckAt: 0,
  autoStartedProjectId: null
};

function formatCameraDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function updateCameraTimer() {
  if (!cameraState.working || !cameraState.startedAt) return;

  cameraState.sessionSeconds = Math.max(
    0,
    Math.floor((Date.now() - cameraState.startedAt) / 1000)
  );

  // Count focused time only while the tab is visible and a face is present.
  if (!document.hidden && cameraState.facePresent) {
    cameraState.focusedSeconds += 1;
  }

  const current = document.getElementById("cameraWorkTimer");
  const total = document.getElementById("cameraTotalTimer");
  const focused = document.getElementById("cameraFocusedTimer");
  const percent = document.getElementById("cameraAttentionPercent");

  if (current) current.textContent = formatCameraDuration(cameraState.sessionSeconds);
  if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds + cameraState.sessionSeconds);
  if (focused) focused.textContent = formatCameraDuration(cameraState.focusedSeconds);

  const attention = cameraState.sessionSeconds > 0
    ? Math.round((cameraState.focusedSeconds / cameraState.sessionSeconds) * 100)
    : 0;
  if (percent) percent.textContent = `${Math.min(100, attention)}%`;
}



function setAttentionState(mode, text) {
  const dot = document.getElementById("attentionIndicator");
  const label = document.getElementById("attentionText");
  if (dot) dot.className = `attention-dot ${mode}`;
  if (label) label.textContent = text;
}

async function initializeAttentionDetector() {
  if ("FaceDetector" in window) {
    try {
      cameraState.detector = new FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1
      });
      setAttentionState("idle", "Face-presence tracking ready");
      return;
    } catch {}
  }
  cameraState.detector = null;
  setAttentionState(
    "idle",
    "Basic attention mode: tab visibility and camera activity"
  );
}

async function checkFacePresence() {
  if (!cameraState.working || !cameraState.stream) return;

  if (document.hidden) {
    cameraState.facePresent = false;
    setAttentionState("away", "Away: browser tab is not active");
    return;
  }

  const video = document.getElementById("workCameraVideo");
  if (!video || video.readyState < 2) {
    cameraState.facePresent = false;
    setAttentionState("blocked", "Camera frame is not ready");
    return;
  }

  if (!cameraState.detector) {
    // Privacy-safe fallback: no identity recognition. Camera active + visible tab.
    cameraState.facePresent = true;
    setAttentionState("focused", "Active tab and camera detected");
    return;
  }

  try {
    const faces = await cameraState.detector.detect(video);
    cameraState.facePresent = faces.length > 0;
    setAttentionState(
      cameraState.facePresent ? "focused" : "away",
      cameraState.facePresent
        ? "Face present — focused time counting"
        : "No face detected — focused time paused"
    );
  } catch {
    cameraState.facePresent = true;
    setAttentionState("focused", "Camera active — basic focus mode");
  }
}

function startAttentionChecks() {
  clearInterval(cameraState.attentionTimer);
  checkFacePresence();
  cameraState.attentionTimer = setInterval(checkFacePresence, 2000);
}

function stopAttentionChecks() {
  clearInterval(cameraState.attentionTimer);
  cameraState.attentionTimer = null;
  cameraState.facePresent = false;
  setAttentionState("idle", "Attention tracking inactive");
}

async function loadCameraTotals() {
  const updateDashboardWorkTime = (sec) => {
    const dashTotal = document.getElementById("dashboardTotalWorkTime");
    if (dashTotal) {
      dashTotal.textContent = formatTime(sec);
    }
  };

  if (!state.token) {
    cameraState.totalSeconds = Number(
      localStorage.getItem("cameraTotalWorkSeconds") || 0
    );
    if (cameraState.totalSeconds > 50000000) cameraState.totalSeconds = 0;
    const total = document.getElementById("cameraTotalTimer");
    if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds);
    updateDashboardWorkTime(cameraState.totalSeconds);
    return;
  }

  try {
    const data = await api("/camera-work/summary");
    cameraState.totalSeconds = Number(data.totalWorkSeconds || 0);
    if (cameraState.totalSeconds > 50000000) cameraState.totalSeconds = 0;
    const total = document.getElementById("cameraTotalTimer");
    if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds);
    updateDashboardWorkTime(cameraState.totalSeconds);

    // Fetch and restore active work session on refresh/re-login
    const activeRes = await api("/camera-work/active");
    if (activeRes && activeRes.session && activeRes.session.status === "ACTIVE") {
      const sess = activeRes.session;
      cameraState.working = true;
      cameraState.startedAt = new Date(sess.startTime).getTime();
      cameraState.sessionSeconds = Math.max(0, Math.floor((Date.now() - cameraState.startedAt) / 1000));
      
      clearInterval(cameraState.timer);
      cameraState.timer = setInterval(updateCameraTimer, 1000);
      
      document.getElementById("workLiveBadge")?.classList.remove("hidden");
      const statusEl = document.getElementById("cameraStatus");
      if (statusEl) statusEl.textContent = "Work session active";
      
      document.getElementById("startWorkButton")?.classList.add("hidden");
      document.getElementById("stopWorkButton")?.classList.remove("hidden");
      
      if (!cameraState.stream) {
        await startWorkCamera();
      }
      startAttentionChecks();
    }
  } catch (err) {
    console.error("Error loading camera totals/active session:", err);
  }
}

async function autoStartCameraForTrackedProject(projectId) {
  if (!projectId || state.publicMode) return;
  if (cameraState.autoStartedProjectId === projectId && cameraState.working) return;

  const widget = document.getElementById("cameraWidget");
  widget?.classList.remove("collapsed");
  widget?.classList.add("auto-active");
  const toggle = document.getElementById("cameraTogglePanel");
  if (toggle) toggle.textContent = "⌄";

  if (!cameraState.stream) {
    await startWorkCamera();
  }

  if (cameraState.stream && !cameraState.working) {
    cameraState.autoStartedProjectId = projectId;
    await startCameraWorkSession();
  }
}

async function startWorkCamera() {
  const video = document.getElementById("workCameraVideo");
  const placeholder = document.getElementById("cameraPlaceholder");
  const status = document.getElementById("cameraStatus");
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera is not supported in this browser.");
    }
    cameraState.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = cameraState.stream;
    video.style.display = "block";
    placeholder.classList.add("hidden");
    status.textContent = "Camera ready";
    document.getElementById("startCameraButton").textContent = "Stop Camera";
    document.getElementById("startWorkButton").disabled = false;
    document.getElementById("captureProofButton").disabled = false;
    const pauseBtn = document.getElementById("pauseCameraButton");
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.textContent = "Pause Camera";
    }
    await initializeAttentionDetector();
    notify("Camera started.");
  } catch (error) {
    notify(`Camera error: ${error.message}`, "error");
  }
}

function stopWorkCamera() {
  cameraState.stream?.getTracks().forEach(track => track.stop());
  cameraState.stream = null;
  const video = document.getElementById("workCameraVideo");
  video.srcObject = null;
  video.style.display = "none";
  const placeholder = document.getElementById("cameraPlaceholder");
  if (placeholder) {
    placeholder.classList.remove("hidden");
    placeholder.textContent = "Camera preview";
  }
  document.getElementById("cameraStatus").textContent = "Camera stopped";
  document.getElementById("startCameraButton").textContent = "Start Camera";
  document.getElementById("startWorkButton").disabled = true;
  document.getElementById("captureProofButton").disabled = true;
  const pauseBtn = document.getElementById("pauseCameraButton");
  if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause Camera";
  }
  stopAttentionChecks();
}

async function toggleWorkCamera() {
  if (cameraState.stream) {
    if (cameraState.working) await stopCameraWorkSession();
    stopWorkCamera();
  } else {
    await startWorkCamera();
  }
}

function toggleCameraPause() {
  if (!cameraState.stream) return;
  const videoTrack = cameraState.stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    const isPaused = !videoTrack.enabled;
    
    const pauseBtn = document.getElementById("pauseCameraButton");
    if (pauseBtn) pauseBtn.textContent = isPaused ? "Resume Camera" : "Pause Camera";

    const status = document.getElementById("cameraStatus");
    if (status) status.textContent = isPaused ? "Camera paused" : "Work session active";

    const placeholder = document.getElementById("cameraPlaceholder");
    const video = document.getElementById("workCameraVideo");
    
    if (isPaused) {
      if (video) video.style.display = "none";
      if (placeholder) {
        placeholder.classList.remove("hidden");
        placeholder.textContent = "Camera paused";
      }
    } else {
      if (video) video.style.display = "block";
      if (placeholder) placeholder.classList.add("hidden");
    }
  }
}

async function captureCameraProof(kind = "manual") {
  if (!cameraState.stream) {
    notify("Start the camera first.", "error");
    return null;
  }
  const video = document.getElementById("workCameraVideo");
  const canvas = document.getElementById("workCameraCanvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const context = canvas.getContext("2d");
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/jpeg", 0.72);

  const payload = {
    projectId: state.currentProject?.id || null,
    chapterIndex: Number.isInteger(state.currentChapter) ? state.currentChapter : null,
    type: kind,
    capturedAt: new Date().toISOString(),
    imageData
  };

  if (!state.token) {
    localStorage.setItem("latestCameraProof", JSON.stringify({
      ...payload,
      imageData: imageData.slice(0, 120) + "..."
    }));
    notify("Proof captured locally. Login for backend storage.");
    return payload;
  }

  try {
    const result = await api("/work-proof", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify(result.message || "Work proof captured.");
    return result;
  } catch (error) {
    notify(`Proof captured, but upload failed: ${error.message}`, "error");
    return payload;
  }
}

async function startCameraWorkSession() {
  if (!cameraState.stream) return notify("Start the camera first.", "error");
  if (cameraState.working) return;

  cameraState.working = true;
  cameraState.startedAt = Date.now();
  cameraState.sessionSeconds = 0;
  cameraState.focusedSeconds = 0;
  clearInterval(cameraState.timer);
  cameraState.timer = setInterval(updateCameraTimer, 1000);
  startAttentionChecks();

  document.getElementById("workLiveBadge").classList.remove("hidden");
  document.getElementById("cameraStatus").textContent = "Work session active";
  document.getElementById("startWorkButton").classList.add("hidden");
  document.getElementById("stopWorkButton").classList.remove("hidden");

  await captureCameraProof("work_start");

  if (state.token) {
    try {
      await api("/camera-work/start", {
        method: "POST",
        body: JSON.stringify({
          projectId: state.currentProject?.id || null,
          chapterIndex: Number.isInteger(state.currentChapter) ? state.currentChapter : null
        })
      });
    } catch (error) {
      notify(`Work started locally. Backend tracking failed: ${error.message}`, "error");
    }
  }
  notify("Work session started.");
}

async function stopCameraWorkSession() {
  if (!cameraState.working) return;
  await captureCameraProof("work_stop");

  const durationSeconds = Math.max(0, Math.floor((Date.now() - cameraState.startedAt) / 1000));
  const focusedSeconds = Math.min(durationSeconds, cameraState.focusedSeconds);
  const attentionPercent = durationSeconds > 0
    ? Math.round((focusedSeconds / durationSeconds) * 100)
    : 0;
  cameraState.totalSeconds += durationSeconds;
  localStorage.setItem("cameraTotalWorkSeconds", String(cameraState.totalSeconds));
  cameraState.working = false;
  cameraState.startedAt = null;
  clearInterval(cameraState.timer);
  cameraState.timer = null;
  stopAttentionChecks();

  document.getElementById("workLiveBadge").classList.add("hidden");
  document.getElementById("cameraStatus").textContent = "Camera ready";
  document.getElementById("startWorkButton").classList.remove("hidden");
  document.getElementById("stopWorkButton").classList.add("hidden");

  if (state.token) {
    try {
      await api("/camera-work/stop", {
        method: "POST",
        body: JSON.stringify({
          durationSeconds,
          focusedSeconds,
          attentionPercent,
          projectId: state.currentProject?.id || null,
          chapterIndex: Number.isInteger(state.currentChapter)
            ? state.currentChapter
            : null
        })
      });
    } catch (error) {
      notify(`Work stopped locally. Backend save failed: ${error.message}`, "error");
    }
  }
  const total = document.getElementById("cameraTotalTimer");
  const focused = document.getElementById("cameraFocusedTimer");
  const percent = document.getElementById("cameraAttentionPercent");
  if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds);
  if (focused) focused.textContent = formatCameraDuration(focusedSeconds);
  if (percent) percent.textContent = `${attentionPercent}%`;
  document.getElementById("cameraWidget")?.classList.remove("auto-active");
  notify(
    `Work stopped: ${formatCameraDuration(durationSeconds)} · Focus ${attentionPercent}%.`
  );
}

function initializeCameraWidget() {
  const widget = document.getElementById("cameraWidget");
  const toggle = document.getElementById("cameraTogglePanel");
  if (!widget || !toggle) return;

  const togglePanel = () => {
    widget.classList.toggle("collapsed");
    toggle.textContent = widget.classList.contains("collapsed") ? "⌃" : "⌄";
  };

  toggle.onclick = togglePanel;
  document.querySelector(".camera-header").onclick = event => {
    if (event.target.closest("button")) return;
    togglePanel();
  };
  const startBtn = document.getElementById("startCameraButton");
  if (startBtn) startBtn.onclick = toggleWorkCamera;

  const pauseBtn = document.getElementById("pauseCameraButton");
  if (pauseBtn) pauseBtn.onclick = toggleCameraPause;

  const startWorkBtn = document.getElementById("startWorkButton");
  if (startWorkBtn) startWorkBtn.onclick = startCameraWorkSession;

  const captureBtn = document.getElementById("captureProofButton");
  if (captureBtn) captureBtn.onclick = () => captureCameraProof("manual");

  const stopWorkBtn = document.getElementById("stopWorkButton");
  if (stopWorkBtn) stopWorkBtn.onclick = stopCameraWorkSession;

  loadCameraTotals();
  initializeAttentionDetector();
}

window.addEventListener("beforeunload", () => {
  cameraState.stream?.getTracks().forEach(track => track.stop());
});

async function initApp() {
  initializeCameraWidget();
  window.checkBackendHealth();
  await loadDomains();
  const isLogged = Boolean(state.token || state.leaderToken);
  const role = state.role || (state.leaderToken ? "ADMIN" : (state.token ? "STUDENT" : ""));

  if (!isLogged) {
    show("loginView");
  } else {
    if (role === "ADMIN") {
      try {
        await renderAdminDashboard();
        show("adminView");
      } catch (err) {
        if (err.message.includes("Connection failed") || err.message.includes("Backend is offline") || err.message.includes("Failed to fetch")) {
          show("loginView");
          notify("Connection failed. Waking up backend server, please wait...", "error");
        } else {
          logout();
        }
      }
    } else {
      try {
        const user = await loadMe();
        if ((user?.selectedProjects || []).length >= 4) {
          await renderDashboard();
          show("dashboardView");
        } else {
          renderSelection();
          show("selectView");
        }
      } catch (err) {
        if (err.message.includes("Connection failed") || err.message.includes("Backend is offline") || err.message.includes("Failed to fetch")) {
          show("loginView");
          notify("Connection failed. Waking up backend server, please wait...", "error");
        } else {
          logout();
        }
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", initApp);

document.addEventListener("visibilitychange", () => {
  if (!cameraState.working) return;
  if (document.hidden) {
    cameraState.facePresent = false;
    setAttentionState("away", "Away: browser tab is not active");
  } else {
    checkFacePresence();
  }
});

/* DYNAMIC DOCUMENTATION MANAGEMENT CONTROLLERS */
let adminDocCache = null;
let unsavedChanges = false;

function markUnsavedChanges() {
  unsavedChanges = true;
  if ($("unsavedChangesBadge")) $("unsavedChangesBadge").style.display = "inline-block";
}

function clearUnsavedChanges() {
  unsavedChanges = false;
  if ($("unsavedChangesBadge")) $("unsavedChangesBadge").style.display = "none";
}

async function loadAdminDocForSelectedProject() {
  const select = $("docAdminProjectSelect");
  if (!select) return;
  const projectId = select.value;
  if (!projectId) return;

  try {
    const res = await leaderApi(`/admin/documentation/${projectId}`);
    adminDocCache = res.documentation;
    renderAdminChaptersTable();
  } catch (err) {
    notify(err.message, "error");
  }
}

function populateDocAdminProjectSelect() {
  const select = $("docAdminProjectSelect");
  if (!select) return;
  select.innerHTML = (window.PROJECTS || []).map(p => `
    <option value="${p.id}">${p.icon || "💻"} ${p.name}</option>
  `).join("");
}

function renderAdminChaptersTable() {
  const container = $("adminDocChaptersTableContainer");
  if (!container || !adminDocCache) return;

  const searchQuery = ($("docAdminSearch")?.value || "").toLowerCase().trim();
  const filterStatus = $("docAdminFilterStatus")?.value || "";
  const filterState = $("docAdminFilterState")?.value || "";

  let chapters = adminDocCache.chapters || [];

  if (searchQuery) {
    chapters = chapters.filter(c =>
      c.title.toLowerCase().includes(searchQuery) ||
      (c.shortDescription && c.shortDescription.toLowerCase().includes(searchQuery)) ||
      (c.mainHeading && c.mainHeading.toLowerCase().includes(searchQuery))
    );
  }

  if (filterStatus) {
    chapters = chapters.filter(c => c.status === filterStatus);
  }

  if (filterState) {
    const isE = filterState === "enabled";
    chapters = chapters.filter(c => c.isEnabled === isE);
  }

  if (!chapters.length) {
    container.innerHTML = `<div class="empty-notice" style="padding:24px;text-align:center;color:var(--muted)">No chapters found matching criteria.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="table" style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr style="background:var(--card2);text-align:left">
          <th style="padding:10px;width:30px"><input type="checkbox" onchange="toggleSelectAllDocChapters(this)"></th>
          <th style="padding:10px;width:70px">Order</th>
          <th style="padding:10px">Chapter # & Title</th>
          <th style="padding:10px;width:90px">Status</th>
          <th style="padding:10px;width:90px">State</th>
          <th style="padding:10px;width:160px">Estimation</th>
          <th style="padding:10px;width:240px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${chapters.map((c, i) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px"><input type="checkbox" class="doc-chap-check" value="${c.id}"></td>
            <td style="padding:10px">
              <div style="display:flex;gap:4px;align-items:center">
                <button class="btn outline btn-xs" style="padding:1px 5px" onclick="reorderAdminChapter('${c.id}', 'up')" ${i === 0 ? "disabled" : ""}>▲</button>
                <button class="btn outline btn-xs" style="padding:1px 5px" onclick="reorderAdminChapter('${c.id}', 'down')" ${i === chapters.length - 1 ? "disabled" : ""}>▼</button>
              </div>
            </td>
            <td style="padding:10px">
              <strong>${c.chapterNumber || (i + 1)}. ${c.title}</strong>
              <p class="muted" style="margin:2px 0 0;font-size:12px">${c.shortDescription || ""}</p>
            </td>
            <td style="padding:10px">
              <span class="pill" style="font-size:11px;${c.status === 'published' ? 'background:#dcfce7;color:#166534' : 'background:#fef3c7;color:#92400e'}">
                ${c.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </td>
            <td style="padding:10px">
              <span class="pill" style="font-size:11px;${c.isEnabled !== false ? 'background:#e0f2fe;color:#0369a1' : 'background:#fee2e2;color:#991b1b'}">
                ${c.isEnabled !== false ? 'Active' : 'Disabled'}
              </span>
            </td>
            <td style="padding:10px;font-size:12px">
              <div>📖 ${c.readingTime || '15 min'}</div>
              <div>💻 ${c.codingTime || '2 hours'}</div>
            </td>
            <td style="padding:10px">
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button class="btn primary btn-xs" onclick="openAdminChapterEditorModal('${c.id}')">✏️ Edit</button>
                <button class="btn outline btn-xs" onclick="previewAdminChapter('${c.id}')">👁️ Preview</button>
                <button class="btn outline btn-xs" onclick="duplicateAdminChapter('${c.id}')">📋 Duplicate</button>
                <button class="btn danger btn-xs" onclick="deleteAdminChapterConfirm('${c.id}')">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function toggleSelectAllDocChapters(master) {
  document.querySelectorAll(".doc-chap-check").forEach(cb => cb.checked = master.checked);
}

function openAdminChapterEditorModal(chapId = null) {
  clearUnsavedChanges();
  const form = $("chapterEditorForm");
  if (form) form.reset();

  if (!adminDocCache) return notify("Select a project first.", "error");

  let chap = null;
  if (chapId) {
    chap = (adminDocCache.chapters || []).find(c => c.id === chapId);
  }

  if (chap) {
    if ($("chapEditId")) $("chapEditId").value = chap.id;
    if ($("chapEditNum")) $("chapEditNum").value = chap.chapterNumber || chap.order || 1;
    if ($("chapEditTitle")) $("chapEditTitle").value = chap.title || "";
    if ($("chapEditStatus")) $("chapEditStatus").value = chap.status || "published";
    if ($("chapEditShortDesc")) $("chapEditShortDesc").value = chap.shortDescription || "";
    if ($("chapEditEnabled")) $("chapEditEnabled").value = chap.isEnabled !== false ? "true" : "false";
    if ($("chapEditMainHeading")) $("chapEditMainHeading").value = chap.mainHeading || "";
    if ($("chapEditIntro")) $("chapEditIntro").value = chap.introduction || "";
    if ($("chapEditSubtopics")) $("chapEditSubtopics").value = Array.isArray(chap.importantSubtopics) ? chap.importantSubtopics.join(", ") : (chap.importantSubtopics || "");
    if ($("chapEditOutcomes")) $("chapEditOutcomes").value = Array.isArray(chap.learningOutcomes) ? chap.learningOutcomes.join(", ") : (chap.learningOutcomes || "");
    if ($("chapEditObjective")) $("chapEditObjective").value = chap.projectObjective || "";
    if ($("chapEditReadingTime")) $("chapEditReadingTime").value = chap.readingTime || "15 min";
    if ($("chapEditCodingTime")) $("chapEditCodingTime").value = chap.codingTime || "2 hours";
    if ($("chapEditDifficulty")) $("chapEditDifficulty").value = chap.difficulty || "Intermediate";

    const sec = Array.isArray(chap.sections) && chap.sections[0] ? chap.sections[0] : {};
    if ($("chapEditSecHeading")) $("chapEditSecHeading").value = sec.heading || "";
    if ($("chapEditSecContent")) $("chapEditSecContent").value = Array.isArray(sec.bulletPoints) ? sec.bulletPoints.join(", ") : (sec.content || "");

    const code = Array.isArray(chap.codeExamples) && chap.codeExamples[0] ? chap.codeExamples[0] : {};
    if ($("chapEditCodeTitle")) $("chapEditCodeTitle").value = code.title || "";
    if ($("chapEditCodeLang")) $("chapEditCodeLang").value = code.language || "javascript";
    if ($("chapEditCodeSnippet")) $("chapEditCodeSnippet").value = code.code || "";

    if ($("adminChapterEditorTitle")) $("adminChapterEditorTitle").textContent = `Edit Chapter ${chap.chapterNumber}: ${chap.title}`;
  } else {
    if ($("chapEditId")) $("chapEditId").value = "";
    if ($("chapEditNum")) $("chapEditNum").value = (adminDocCache.chapters || []).length + 1;
    if ($("chapEditTitle")) $("chapEditTitle").value = "";
    if ($("chapEditStatus")) $("chapEditStatus").value = "published";
    if ($("chapEditEnabled")) $("chapEditEnabled").value = "true";
    if ($("chapEditReadingTime")) $("chapEditReadingTime").value = "15 min";
    if ($("chapEditCodingTime")) $("chapEditCodingTime").value = "2 hours";
    if ($("chapEditDifficulty")) $("chapEditDifficulty").value = "Intermediate";

    if ($("adminChapterEditorTitle")) $("adminChapterEditorTitle").textContent = "Create New Documentation Chapter";
  }

  $("adminChapterEditorModal")?.classList.add("show");
}

function closeAdminChapterEditorModal() {
  if (unsavedChanges) {
    if (!confirm("You have unsaved changes. Are you sure you want to close the editor?")) return;
  }
  clearUnsavedChanges();
  $("adminChapterEditorModal")?.classList.remove("show");
}

async function saveAdminChapterForm(isDraft = false) {
  if (!adminDocCache) return;
  const projectId = adminDocCache.projectId;
  const chapId = $("chapEditId")?.value;

  const payload = {
    chapterNumber: Number($("chapEditNum")?.value || 1),
    title: $("chapEditTitle")?.value.trim(),
    status: isDraft ? "draft" : ($("chapEditStatus")?.value || "published"),
    shortDescription: $("chapEditShortDesc")?.value.trim(),
    isEnabled: $("chapEditEnabled")?.value === "true",
    mainHeading: $("chapEditMainHeading")?.value.trim(),
    introduction: $("chapEditIntro")?.value.trim(),
    importantSubtopics: $("chapEditSubtopics")?.value.split(",").map(s => s.trim()).filter(Boolean),
    learningOutcomes: $("chapEditOutcomes")?.value.split(",").map(s => s.trim()).filter(Boolean),
    projectObjective: $("chapEditObjective")?.value.trim(),
    readingTime: $("chapEditReadingTime")?.value.trim() || "15 min",
    codingTime: $("chapEditCodingTime")?.value.trim() || "2 hours",
    difficulty: $("chapEditDifficulty")?.value || "Intermediate",
    sections: $("chapEditSecHeading")?.value.trim() ? [{
      heading: $("chapEditSecHeading")?.value.trim(),
      content: $("chapEditSecContent")?.value.trim(),
      bulletPoints: $("chapEditSecContent")?.value.split(",").map(s=>s.trim()).filter(Boolean),
      order: 1
    }] : [],
    codeExamples: $("chapEditCodeSnippet")?.value.trim() ? [{
      title: $("chapEditCodeTitle")?.value.trim() || "Code Example",
      language: $("chapEditCodeLang")?.value.trim() || "javascript",
      code: $("chapEditCodeSnippet")?.value.trim(),
      explanation: "Sample snippet for implementation.",
      order: 1
    }] : []
  };

  if (!payload.title || !payload.mainHeading) {
    return notify("Chapter Title and Main Heading are required.", "error");
  }

  try {
    let res;
    if (chapId) {
      res = await leaderApi(`/admin/documentation/${projectId}/chapters/${chapId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      res = await leaderApi(`/admin/documentation/${projectId}/chapters`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    notify(res.message || "Chapter saved successfully.");
    clearUnsavedChanges();
    $("adminChapterEditorModal")?.classList.remove("show");
    await loadAdminDocForSelectedProject();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function deleteAdminChapterConfirm(chapId) {
  if (!adminDocCache) return;
  const chap = (adminDocCache.chapters || []).find(c => c.id === chapId);
  if (!chap) return;

  if (confirm(`Are you sure you want to delete Chapter ${chap.chapterNumber}: "${chap.title}"?`)) {
    try {
      const res = await leaderApi(`/admin/documentation/${adminDocCache.projectId}/chapters/${chapId}`, {
        method: "DELETE"
      });
      notify(res.message || "Chapter deleted.");
      await loadAdminDocForSelectedProject();
    } catch (err) {
      notify(err.message, "error");
    }
  }
}

async function reorderAdminChapter(chapId, direction) {
  if (!adminDocCache) return;
  const chapters = [...(adminDocCache.chapters || [])];
  const idx = chapters.findIndex(c => c.id === chapId);
  if (idx === -1) return;

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= chapters.length) return;

  const temp = chapters[idx];
  chapters[idx] = chapters[targetIdx];
  chapters[targetIdx] = temp;

  const chapterIds = chapters.map(c => c.id);

  try {
    const res = await leaderApi(`/admin/documentation/${adminDocCache.projectId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ chapterIds })
    });
    notify(res.message || "Reordered.");
    await loadAdminDocForSelectedProject();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function duplicateAdminChapter(chapId) {
  if (!adminDocCache) return;
  try {
    const res = await leaderApi(`/admin/documentation/${adminDocCache.projectId}/chapters/${chapId}/duplicate`, {
      method: "POST"
    });
    notify(res.message || "Chapter duplicated.");
    await loadAdminDocForSelectedProject();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function applyBulkDocAction(action) {
  if (!adminDocCache) return;
  const checked = [...document.querySelectorAll(".doc-chap-check:checked")].map(cb => cb.value);
  if (!checked.length) return notify("Select at least one chapter.", "error");

  if (action === "delete" && !confirm(`Are you sure you want to delete ${checked.length} selected chapters?`)) {
    return;
  }

  try {
    const res = await leaderApi(`/admin/documentation/${adminDocCache.projectId}/bulk`, {
      method: "POST",
      body: JSON.stringify({ action, chapterIds: checked })
    });
    notify(res.message || "Bulk action executed.");
    await loadAdminDocForSelectedProject();
  } catch (err) {
    notify(err.message, "error");
  }
}

function openDocSettingsModal() {
  if (!adminDocCache) return notify("Select a project first.", "error");
  if ($("docSettingTitle")) $("docSettingTitle").value = adminDocCache.projectTitle || "";
  if ($("docSettingDesc")) $("docSettingDesc").value = adminDocCache.projectDescription || "";
  if ($("docSettingMode")) $("docSettingMode").value = adminDocCache.mode || "Documentation Preview";
  if ($("docSettingProgress")) $("docSettingProgress").value = adminDocCache.progressEnabled !== false ? "true" : "false";

  $("docSettingsModal")?.classList.add("show");
}

async function saveDocSettingsForm() {
  if (!adminDocCache) return;
  const payload = {
    projectTitle: $("docSettingTitle")?.value.trim(),
    projectDescription: $("docSettingDesc")?.value.trim(),
    mode: $("docSettingMode")?.value,
    progressEnabled: $("docSettingProgress")?.value === "true"
  };

  try {
    const res = await leaderApi(`/admin/documentation/${adminDocCache.projectId}/settings`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    notify(res.message || "Settings saved.");
    $("docSettingsModal")?.classList.remove("show");
    await loadAdminDocForSelectedProject();
  } catch (err) {
    notify(err.message, "error");
  }
}

function previewAdminChapter(chapId) {
  if (!adminDocCache) return;
  const idx = (adminDocCache.chapters || []).findIndex(c => c.id === chapId);
  if (idx !== -1) {
    state.currentChapter = idx;
    openProjectDocument(adminDocCache.projectId, true);
  }
}

function previewAdminChapterModal() {
  if (adminDocCache) {
    const num = Number($("chapEditNum")?.value || 1);
    state.currentChapter = Math.max(0, num - 1);
    openProjectDocument(adminDocCache.projectId, true);
  }
}

/* ADMIN & STUDENT QUIZ PORTAL SYSTEM */
let adminQuizResultsCache = [];
let adminProjectsCacheForQuiz = [];
let activeQuizQuestionsCache = [];

async function renderAdminQuizScores() {
  try {
    const res = await leaderApi("/admin/quiz-results");
    adminQuizResultsCache = res.results || [];

    // Populate projects filter
    const projFilter = $("adminQuizProjectFilter");
    if (projFilter) {
      const uniqueProjects = [...new Set(adminQuizResultsCache.map(r => r.projectName))].sort();
      projFilter.innerHTML = `<option value="">All Projects</option>` +
        uniqueProjects.map(pName => `<option value="${pName}">${escapeHtml(pName)}</option>`).join("");
    }

    filterAdminQuizResults();
  } catch (err) {
    notify(err.message, "error");
  }
}

function filterAdminQuizResults() {
  const searchVal = ($("adminQuizSearch")?.value || "").toLowerCase().trim();
  const projectVal = $("adminQuizProjectFilter")?.value || "";
  const scoreVal = $("adminQuizScoreFilter")?.value || "";
  const sortVal = $("adminQuizSort")?.value || "date_desc";

  let filtered = [...adminQuizResultsCache];

  // Search
  if (searchVal) {
    filtered = filtered.filter(r => 
      (r.studentName || "").toLowerCase().includes(searchVal) ||
      (r.studentEmail || "").toLowerCase().includes(searchVal)
    );
  }

  // Filter Project
  if (projectVal) {
    filtered = filtered.filter(r => r.projectName === projectVal);
  }

  // Filter Score Status
  if (scoreVal) {
    if (scoreVal === "passed") {
      filtered = filtered.filter(r => r.percentage >= 70);
    } else if (scoreVal === "failed") {
      filtered = filtered.filter(r => r.percentage < 70);
    }
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortVal === "date_desc") {
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    } else if (sortVal === "date_asc") {
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    } else if (sortVal === "score_desc") {
      return b.percentage - a.percentage;
    } else if (sortVal === "score_asc") {
      return a.percentage - b.percentage;
    }
    return 0;
  });

  const tbody = $("adminQuizResultsTableBody");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center muted">No quiz scores found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const isPassed = r.percentage >= 70;
    const statusText = isPassed ? "🟢 Passed" : "🔴 Failed";
    const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "N/A";
    
    return `
      <tr>
        <td><b>${escapeHtml(r.studentName || "N/A")}</b></td>
        <td><small>${escapeHtml(r.studentEmail || "N/A")}</small></td>
        <td>${escapeHtml(r.projectName)}</td>
        <td><b>${r.score}</b> / ${r.totalMarks}</td>
        <td><b>${r.percentage}%</b></td>
        <td><span style="color:var(--green)">${r.correctAnswers}</span></td>
        <td><span style="color:var(--red)">${r.incorrectAnswers}</span></td>
        <td><small>${dateStr}</small></td>
        <td><span class="badge ${isPassed ? 'success' : 'danger'}">${statusText}</span></td>
        <td>
          <button class="btn danger btn-xs" type="button" onclick="resetStudentQuizAttempt('${r.projectId}', '${r.studentId}')">🔄 Reset Attempt</button>
        </td>
      </tr>
    `;
  }).join("");
}

async function renderAdminQuizMgmt() {
  try {
    const res = await api("/projects");
    adminProjectsCacheForQuiz = res.projects || [];
    
    const select = $("adminQuizMgmtProjectSelect");
    if (select) {
      select.innerHTML = adminProjectsCacheForQuiz.map(p => `
        <option value="${p.id}">${escapeHtml(p.name)} [${escapeHtml(p.domain)}]</option>
      `).join("");
      
      loadQuizMgmtQuestions();
    }
  } catch (err) {
    notify(err.message, "error");
  }
}

async function loadQuizMgmtQuestions() {
  const projId = $("adminQuizMgmtProjectSelect")?.value;
  if (!projId) return;

  try {
    const res = await leaderApi(`/admin/projects/${projId}/quiz/questions`);
    activeQuizQuestionsCache = res.questions || [];
    const quiz = res.quiz || { totalQuestions: 0, totalMarks: 0 };

    if ($("quizMgmtCount")) $("quizMgmtCount").textContent = `${activeQuizQuestionsCache.length} / 25`;
    if ($("quizMgmtMarks")) $("quizMgmtMarks").textContent = `${quiz.totalMarks} / 50`;

    const container = $("quizMgmtQuestionsContainer");
    if (!container) return;

    if (activeQuizQuestionsCache.length === 0) {
      container.innerHTML = `<div class="text-center muted" style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;">No questions added yet.</div>`;
      return;
    }

    container.innerHTML = activeQuizQuestionsCache.map((q, idx) => `
      <div class="settings-card" style="background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="badge secondary" style="background:var(--navy);color:#fff">Q${idx + 1}</span>
            <span class="badge info">Marks: ${q.marks || 2}</span>
            <span class="badge success" style="background:var(--green);color:#fff">Correct: Option ${escapeHtml(q.correctAnswer)}</span>
          </div>
          <h4 style="margin:0 0 8px 0;font-size:14px">${escapeHtml(q.question)}</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--text-muted)">
            <div><b>A:</b> ${escapeHtml(q.optionA)}</div>
            <div><b>B:</b> ${escapeHtml(q.optionB)}</div>
            <div><b>C:</b> ${escapeHtml(q.optionC)}</div>
            <div><b>D:</b> ${escapeHtml(q.optionD)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn outline btn-xs" type="button" onclick="openEditQuestionModal('${q.id}')">✏️ Edit</button>
          <button class="btn danger btn-xs" type="button" onclick="deleteQuizQuestion('${q.id}')">🗑️ Delete</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    notify(err.message, "error");
  }
}

function openCreateQuestionModal() {
  if (activeQuizQuestionsCache.length >= 25) {
    notify("Maximum 25 questions reached for this quiz.", "error");
    return;
  }

  $("quizQuestionModalTitle").textContent = "Add Quiz Question";
  $("questionFormId").value = "";
  $("questionFormText").value = "";
  $("questionFormOptA").value = "";
  $("questionFormOptB").value = "";
  $("questionFormOptC").value = "";
  $("questionFormOptD").value = "";
  $("questionFormCorrect").value = "A";
  $("questionFormMarks").value = "2";

  $("quizQuestionModal").classList.add("show");
}

function openEditQuestionModal(qId) {
  const q = activeQuizQuestionsCache.find(item => item.id === qId);
  if (!q) return;

  $("quizQuestionModalTitle").textContent = "Edit Quiz Question";
  $("questionFormId").value = q.id;
  $("questionFormText").value = q.question;
  $("questionFormOptA").value = q.optionA;
  $("questionFormOptB").value = q.optionB;
  $("questionFormOptC").value = q.optionC;
  $("questionFormOptD").value = q.optionD;
  $("questionFormCorrect").value = q.correctAnswer;
  $("questionFormMarks").value = q.marks || 2;

  $("quizQuestionModal").classList.add("show");
}

async function saveQuizQuestionForm() {
  const projId = $("adminQuizMgmtProjectSelect")?.value;
  if (!projId) return;

  const qId = $("questionFormId").value;
  const payload = {
    question: $("questionFormText").value.trim(),
    optionA: $("questionFormOptA").value.trim(),
    optionB: $("questionFormOptB").value.trim(),
    optionC: $("questionFormOptC").value.trim(),
    optionD: $("questionFormOptD").value.trim(),
    correctAnswer: $("questionFormCorrect").value,
    marks: Number($("questionFormMarks").value || 2)
  };

  const isEdit = !!qId;
  const url = isEdit
    ? `/admin/projects/${projId}/quiz/questions/${qId}`
    : `/admin/projects/${projId}/quiz/questions`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await leaderApi(url, {
      method,
      body: JSON.stringify(payload)
    });
    notify(res.message || "Question saved successfully.");
    $("quizQuestionModal").classList.remove("show");
    loadQuizMgmtQuestions();
  } catch (err) {
    notify(err.message, "error");
  }
}

async function deleteQuizQuestion(qId) {
  const projId = $("adminQuizMgmtProjectSelect")?.value;
  if (!projId) return;

  if (!confirm("Are you sure you want to delete this question?")) {
    return;
  }

  try {
    const res = await leaderApi(`/admin/projects/${projId}/quiz/questions/${qId}`, {
      method: "DELETE"
    });
    notify(res.message || "Question deleted successfully.");
    loadQuizMgmtQuestions();
  } catch (err) {
    notify(err.message, "error");
  }
}

/* STUDENT PORTAL QUIZ SYSTEM CONTROLLERS */
let studentQuizQuestions = [];
let studentQuizAnswers = {}; // { questionId: "A" / "B" / "C" / "D" }
let studentQuizCurrentIndex = 0; // 0 to 24
let studentQuizResult = null;
let studentQuizLoadedProjectId = null;

async function loadStudentQuiz(projectId) {
  if (state.publicMode) {
    const container = $("activeQuizContainer");
    if (container) {
      container.innerHTML = `
        <div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">🔒</div>
          <h3 style="color:var(--navy)">Registered Interns Only</h3>
          <p class="muted">You must log in to attempt the project assessment quiz.</p>
        </div>
      `;
    }
    return;
  }

  if (studentQuizLoadedProjectId === projectId && studentQuizQuestions.length > 0) {
    renderStudentQuizPage();
    return;
  }
  
  studentQuizLoadedProjectId = projectId;
  studentQuizQuestions = [];
  studentQuizAnswers = {};
  studentQuizCurrentIndex = 0;
  studentQuizResult = null;
  
  try {
    const resResult = await api(`/projects/${projectId}/quiz/result`);
    if (resResult && resResult.result) {
      studentQuizResult = resResult.result;
      renderStudentQuizPage();
      return;
    }

    const resQuiz = await api(`/projects/${projectId}/quiz`);
    if (resQuiz && resQuiz.questions) {
      studentQuizQuestions = resQuiz.questions || [];
      if (studentQuizQuestions.length < 25) {
        studentQuizQuestions = [];
      }
    }
  } catch (err) {
    console.error("Error loading quiz:", err.message);
  }
  
  renderStudentQuizPage();
}

function renderStudentQuizPage() {
  const container = $("activeQuizContainer");
  if (!container) return;

  const p = state.currentProject;

  if (studentQuizResult) {
    const r = studentQuizResult;
    const isPassed = r.percentage >= 70;
    
    container.innerHTML = `
      <div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;">
        <h2 style="color:var(--navy)">🎉 Quiz Completed</h2>
        <div style="margin:20px 0;padding:16px;background:var(--card2);border-radius:8px;border-left:4px solid ${isPassed ? 'var(--green)' : 'var(--red)'}">
          <h4 style="margin:0 0 10px 0">${escapeHtml(p.name)} Assessment Quiz</h4>
          <p style="font-size:18px;margin:6px 0">Score: <b>${r.score} / ${r.totalMarks}</b></p>
          <p style="font-size:18px;margin:6px 0">Percentage: <b>${r.percentage}%</b></p>
          <p style="font-size:14px;margin:6px 0;color:var(--text-muted)">
            Correct: <b>${r.correctAnswers} / 25</b> · Incorrect: <b>${r.incorrectAnswers} / 25</b>
          </p>
          <p style="font-size:14px;margin:6px 0;font-weight:bold;color:${isPassed ? 'var(--green)' : 'var(--red)'}">
            Status: ${isPassed ? 'Passed' : 'Failed (Required >= 70% to pass)'}
          </p>
        </div>
      </div>
    `;
    return;
  }

  if (studentQuizQuestions.length === 0) {
    container.innerHTML = `
      <div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <h3 style="color:var(--red)">Quiz is not available yet</h3>
        <p class="muted">Admin is still preparing the questions. Please check back later.</p>
      </div>
    `;
    return;
  }

  const q = studentQuizQuestions[studentQuizCurrentIndex];
  const qNum = studentQuizCurrentIndex + 1;
  const totalQ = studentQuizQuestions.length;
  const activeAnswer = studentQuizAnswers[q.id] || "";

  const optionsHtml = ["A", "B", "C", "D"].map(optLetter => {
    const optText = q[`option${optLetter}`];
    const isChecked = activeAnswer === optLetter ? "checked" : "";
    return `
      <label class="quiz-option-label" style="display:block;margin:10px 0;font-size:13px;cursor:pointer;padding:10px;border-radius:6px;background:var(--bg);border:1px solid var(--border)">
        <input type="radio" name="student_quiz_radio" value="${optLetter}" ${isChecked} onchange="saveStudentQuizAnswer('${q.id}', '${optLetter}')" style="margin-right:8px;">
        <b>${optLetter}:</b> ${escapeHtml(optText)}
      </label>
    `;
  }).join("");

  const paletteChips = studentQuizQuestions.map((qItem, idx) => {
    const isAttempted = !!studentQuizAnswers[qItem.id];
    const isCurrent = idx === studentQuizCurrentIndex;
    const style = isCurrent 
      ? "background:var(--navy);color:#fff;border-color:var(--navy)" 
      : (isAttempted ? "background:var(--green);color:#fff;border-color:var(--green)" : "background:var(--card);border-color:var(--border)");
    return `
      <span class="palette-chip" onclick="jumpToQuizQuestion(${idx})" style="display:inline-block;width:30px;height:30px;line-height:28px;text-align:center;border:1px solid;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;${style}">
        ${idx + 1}
      </span>
    `;
  }).join("");

  container.innerHTML = `
    <div style="padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px">
        <div>
          <h2 style="margin:0;font-size:18px;color:var(--navy)">${escapeHtml(p.name)}</h2>
          <small class="muted">Chapter 15 Quiz</small>
        </div>
        <div style="text-align:right">
          <span style="font-weight:bold;color:var(--green)">25 Questions · 50 Marks</span><br>
          <small class="muted">2 Marks per Question</small>
        </div>
      </div>

      <div class="quiz-question-card" style="margin-bottom:20px">
        <div style="font-weight:bold;margin-bottom:8px;font-size:14px;color:var(--text-muted)">
          Question ${qNum} of ${totalQ}
        </div>
        <h4 style="margin:0 0 14px 0;font-size:16px;line-height:1.5">${escapeHtml(q.question)}</h4>
        <div class="quiz-options-container">${optionsHtml}</div>
      </div>

      <!-- Question Palette -->
      <div style="margin-top:20px;margin-bottom:20px;border-top:1px solid var(--border);padding-top:16px">
        <h5 style="margin:0 0 8px 0;font-size:12px;color:var(--text-muted)">Question Navigation Palette</h5>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${paletteChips}</div>
      </div>

      <!-- Navigation Buttons -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
        <div style="display:flex;gap:8px">
          <button class="btn outline" type="button" onclick="prevQuizQuestion()" ${studentQuizCurrentIndex === 0 ? "disabled" : ""}>← Previous</button>
          <button class="btn outline" type="button" onclick="nextQuizQuestion()" ${studentQuizCurrentIndex === totalQ - 1 ? "disabled" : ""}>Next →</button>
        </div>
        <button class="btn success" type="button" style="padding:10px 24px" onclick="submitStudentQuiz()">Submit Quiz Answers</button>
      </div>
    </div>
  `;
}

function saveStudentQuizAnswer(qId, value) {
  studentQuizAnswers[qId] = value;
  renderStudentQuizPage();
}

function jumpToQuizQuestion(idx) {
  if (idx >= 0 && idx < studentQuizQuestions.length) {
    studentQuizCurrentIndex = idx;
    renderStudentQuizPage();
  }
}

function nextQuizQuestion() {
  if (studentQuizCurrentIndex < studentQuizQuestions.length - 1) {
    studentQuizCurrentIndex++;
    renderStudentQuizPage();
  }
}

function prevQuizQuestion() {
  if (studentQuizCurrentIndex > 0) {
    studentQuizCurrentIndex--;
    renderStudentQuizPage();
  }
}

function retryStudentQuiz() {
  if (confirm("Are you sure you want to attempt the quiz again?")) {
    studentQuizResult = null;
    studentQuizAnswers = {};
    studentQuizCurrentIndex = 0;
    renderStudentQuizPage();
  }
}

async function submitStudentQuiz() {
  const attemptedCount = Object.keys(studentQuizAnswers).length;
  if (attemptedCount < 25) {
    if (!confirm(`You have only answered ${attemptedCount} out of 25 questions. Are you sure you want to submit the quiz?`)) {
      return;
    }
  } else {
    if (!confirm("Are you sure you want to submit the quiz?")) {
      return;
    }
  }

  const projectId = state.currentProject.id;
  try {
    const res = await api(`/projects/${projectId}/quiz`, {
      method: "POST",
      body: JSON.stringify({ answers: studentQuizAnswers })
    });
    notify(res.message || "Quiz submitted successfully.");
    studentQuizResult = res.result;
    
    if (state.user && state.user.progress && state.user.progress[projectId]) {
      state.user.progress[projectId].quizPassed = res.passed;
      state.user.progress[projectId].quizScore = res.result.percentage;
    }
    
    renderStudentQuizPage();
  } catch (err) {
    notify(err.message, "error");
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function resetStudentQuizAttempt(projectId, studentId) {
  if (!confirm("Are you sure you want to reset this quiz attempt and allow the student to re-attempt?")) {
    return;
  }

  try {
    const res = await leaderApi(`/admin/projects/${projectId}/quiz/results/${studentId}`, {
      method: "DELETE"
    });
    notify(res.message || "Quiz attempt reset successfully.");
    renderAdminQuizScores();
  } catch (err) {
    notify(err.message, "error");
  }
}

window.downloadSubmissionZip = async function(studentId, projectId) {
  try {
    const url = `${API}/admin/projects/${projectId}/submissions/${studentId}/zip`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${state.leaderToken || state.token}`
      }
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Failed to download file.");
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    
    const contentDisposition = response.headers.get("content-disposition");
    let filename = `${studentId}-${projectId}.zip`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    notify(err.message, "error");
  }
};

window.checkBackendHealth = async function() {
  const statusSpan = $("backendStatus");
  if (!statusSpan) return;
  
  statusSpan.className = "status checking";
  statusSpan.textContent = "Connecting to server...";
  
  try {
    const response = await fetch(API + "/projects", {
      method: "GET"
    });
    if (response.ok) {
      statusSpan.className = "status online";
      statusSpan.textContent = "Connected";
    } else {
      throw new Error("Server offline");
    }
  } catch (err) {
    statusSpan.className = "status offline";
    statusSpan.textContent = "Offline / Waking up server...";
    setTimeout(window.checkBackendHealth, 3000);
  }
};
