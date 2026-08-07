
"use strict";

const API = "http://localhost:5000/api";
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
    response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("Backend is offline. Run backend using npm start.");
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
    id = isAdmin ? "adminView" : ((state.user?.selectedProjects || []).length === 4 ? "dashboardView" : "selectView");
  }

  // Admin route protection for non-admins
  if (id === "adminView" && !isAdmin) {
    notify("Admin credentials required to access the Admin Panel.", "error");
    id = "loginView";
  }

  ["homeView","loginView","adminView","leaderView","selectView","dashboardView","docView"].forEach(viewId => $(viewId)?.classList.add("hidden"));
  $(id)?.classList.remove("hidden");
  document.body.classList.toggle("on-login-page", id === "loginView");
  document.body.classList.toggle("on-admin-page", id === "adminView");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateNav();
}

function renderHome(query = "") {
  const q = query.toLowerCase().trim();
  $("homeGrid").innerHTML = PROJECTS
    .filter(p => [p.name,p.stack,p.level,p.summary,...p.modules].join(" ").toLowerCase().includes(q))
    .map((p, i) => `
      <article class="panel project direct-project-card" style="animation-delay:${i*35}ms">
        <span class="pill">Project ${i+1} of 10</span><span class="pill">${p.level}</span>
        <h3>${p.icon} ${p.name}</h3><p class="muted">${p.summary}</p>
        <p><span class="pill">${p.duration}</span><span class="pill">${p.stack}</span></p>
        <div class="cardfoot">
          <span>${p.modules.slice(0,3).join(" · ")}</span>
          <button class="btn primary preview-project" data-id="${p.id}" type="button">Preview Documentation</button>
        </div>
      </article>`).join("");
  document.querySelectorAll(".preview-project").forEach(btn => btn.onclick = () => window.openPreviewProjectSafe(btn.dataset.id));
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

      if ((state.user?.selectedProjects || []).length === 4) {
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
    notify("Invalid Email/Password.", "error");
  }
}

function logout() {
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

    if ((state.user.selectedProjects || []).length === 4) {
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
  if (tabName === "docmgmt") {
    populateDocAdminProjectSelect();
    loadAdminDocForSelectedProject();
  }
}

async function loadProjects() {
  try {
    const res = await api("/projects");
    if (res?.projects && res.projects.length) {
      window.PROJECTS = res.projects;
    }
  } catch (err) {
    console.warn("Could not load projects from API, using default projects:", err.message);
  }
}

async function renderAdminProjectsGrid() {
  await loadProjects();
  const grid = $("adminProjectsGrid");
  if (!grid) return;

  const isAdmin = state.role === "ADMIN" || Boolean(state.leaderToken);

  grid.innerHTML = (window.PROJECTS || []).map(p => {
    const statusBadgeClass = p.status === "inactive" ? "background:#fef3c7;color:#92400e" : "background:#dcfce7;color:#166534";
    const statusText = p.status === "inactive" ? "Inactive" : "Active";

    return `
      <article class="panel project-card" style="background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-size:32px">${p.icon || "💻"}</span>
            <div style="display:flex;gap:6px">
              <span class="pill" style="font-size:11px">${p.level || "Intermediate"}</span>
              <span class="pill" style="font-size:11px;${statusBadgeClass}">${statusText}</span>
            </div>
          </div>
          <h4 style="margin:0 0 6px;color:var(--navy);font-size:16px">${p.name}</h4>
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
  if ($("projFormName")) $("projFormName").value = p.name || "";
  if ($("projFormIcon")) $("projFormIcon").value = p.icon || "💻";
  if ($("projFormSummary")) $("projFormSummary").value = p.summary || "";
  if ($("projFormDescription")) $("projFormDescription").value = p.description || p.summary || "";
  if ($("projFormLevel")) $("projFormLevel").value = p.level || "Intermediate";
  if ($("projFormDuration")) $("projFormDuration").value = p.duration || "4–6 Weeks";
  if ($("projFormStatus")) $("projFormStatus").value = p.status || "active";
  if ($("projFormStack")) $("projFormStack").value = p.stack || "";
  if ($("projFormObjective")) $("projFormObjective").value = p.objective || "";
  if ($("projFormOutcomes")) $("projFormOutcomes").value = Array.isArray(p.outcomes) ? p.outcomes.join(", ") : (p.outcomes || "");

  if ($("projectFormModalTitle")) $("projectFormModalTitle").textContent = `Edit Project: ${p.name}`;
  $("projectFormModal")?.classList.add("show");
}

async function saveProjectForm() {
  const id = $("projFormId")?.value;
  const payload = {
    name: $("projFormName")?.value.trim(),
    icon: $("projFormIcon")?.value.trim(),
    summary: $("projFormSummary")?.value.trim(),
    description: $("projFormDescription")?.value.trim(),
    level: $("projFormLevel")?.value,
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
    list = list.filter(s => (s.department || "").toLowerCase() === deptFilter);
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
                <b>${s.department || "Computer Science"}</b><br>
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

async function openStudentDetailModal(studentId) {
  try {
    const data = await leaderApi(`/admin/students/${studentId}`);
    const student = data.student;
    const logs = data.logs || [];

    $("modalStudentName").textContent = student.name;
    $("modalStudentSub").textContent = `${student.email || 'No Email'} · @${student.username || student.id} · ${student.department || "Computer Science"} (${student.year || "Final Year"})`;

    const assigned = student.selectedProjects || [];
    const progress = student.progress || {};

    const projectsHtml = assigned.map((id, idx) => {
      const p = PROJECTS.find(x => x.id === id);
      const pg = progress[id] || {};
      return `
        <div class="detail-card" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>${idx+1}. ${p?.name || id}</b>
            <span class="status-badge status-${pg.status||'locked'}">${(pg.status||'locked').replace('_',' ')}</span>
          </div>
          <p class="muted" style="margin:4px 0;font-size:13px">${p?.summary || ''}</p>
          <div class="progress" style="height:10px;margin:6px 0"><span style="width:${pg.percent||0}%"></span></div>
          <small>Chapters: ${(pg.completedChapters||[]).length}/16 · Quiz: ${pg.quizPassed ? "Passed" : "Pending"} · GitHub: ${pg.githubUrl ? `<a href="${pg.githubUrl}" target="_blank">View Repo</a>` : "Pending"}</small>
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

function openCreateStudentModal() {
  $("createStudentModal").classList.add("show");
}

async function createStudentFromModal() {
  const payload = {
    name: $("newStudentName").value.trim(),
    username: $("newStudentUsername").value.trim(),
    email: $("newStudentEmail").value.trim(),
    department: $("newStudentDept").value,
    year: $("newStudentYear").value,
    college: $("newStudentCollege").value.trim()
  };
  if (!payload.name || !payload.username) {
    return notify("Student name and username are required.", "error");
  }
  try {
    const data = await leaderApi("/leader/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    notify(`Student account created for @${data.student.username}!`);
    ["newStudentName", "newStudentUsername", "newStudentEmail", "newStudentCollege"].forEach(id => $(id) && ($(id).value = ""));
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



function renderSelection() {
  if ((state.user?.selectedProjects || []).length === 4) {
    renderDashboard().then(() => show("dashboardView"));
    notify("Your four projects are already selected and locked.");
    return;
  }
  state.selected = [];
  $("selectionGrid").innerHTML = PROJECTS.map(p => `
    <article class="panel project" id="selection-${p.id}">
      <span class="pill">${p.level}</span><h3>${p.icon} ${p.name}</h3>
      <p class="muted">${p.summary}</p>
      <label><input class="choose" type="checkbox" value="${p.id}"> Choose Project</label>
    </article>`).join("");
  document.querySelectorAll(".choose").forEach(box => box.onchange = () => pick(box));
  updateSelect();
}

function pick(box) {
  const checked = [...document.querySelectorAll(".choose:checked")];
  if (box.checked && checked.length > 4) {
    box.checked = false;
    notify("You can select maximum 4 projects.", "error");
  }
  state.selected = [...document.querySelectorAll(".choose:checked")].map(x => x.value);
  PROJECTS.forEach(p => $("selection-"+p.id)?.classList.toggle("selected", state.selected.includes(p.id)));
  updateSelect();
}

function updateSelect() {
  $("selectText").textContent = `${state.selected.length} of 4 selected`;
  $("selectBar").style.width = `${state.selected.length/4*100}%`;
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
  if (state.selected.length !== 4) return notify("Select exactly 4 projects.","error");
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
  $("pendingStat").textContent = 4-completed;
  $("githubStat").textContent = github;
  $("overallStat").textContent = Math.round(total/4)+"%";

  renderCalendar();
  renderReport();
}

function renderReport() {
  if (!state.user) return;
  const progress = state.user.progress || {};
  const rows = state.user.selectedProjects.map((id,index) => {
    const p = PROJECTS.find(x=>x.id===id);
    const pg = progress[id] || {};
    return `<tr>
      <td>${index+1}. ${p.name}</td>
      <td>${statusBadge(pg.status)}</td>
      <td>${(pg.completedChapters||[]).length}/${CHAPTERS.length}</td>
      <td>${pg.percent||0}%</td>
      <td>${pg.quizPassed ? `Passed (${pg.quizScore||100}%)` : "Pending"}</td>
      <td>${formatTime(pg.timeSpentSeconds||0)}</td>
      <td>${pg.githubUrl ? `<a href="${pg.githubUrl}" target="_blank">Submitted</a>` : "Pending"}</td>
    </tr>`;
  }).join("");
  $("reportTable").innerHTML = `<table class="report-table">
    <tr><th>Project</th><th>Status</th><th>Chapters</th><th>Progress</th><th>Quiz</th><th>Tracked Time</th><th>GitHub</th></tr>${rows}
  </table>`;
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
}

function getEnhancedChapterContent(project, chapterIndex, chapterName, completedCount, totalChapters = 16, chapObj = {}) {
  const remainingCount = Math.max(0, totalChapters - completedCount);
  const percentComplete = Math.round((completedCount / totalChapters) * 100);
  const readingTime = chapObj.readingTime || "15 min";
  const codingTime = chapObj.codingTime || "2 hours";
  const difficulty = chapObj.difficulty || project.level || "Intermediate";
  const objective = chapObj.projectObjective || project.objective || "Automate system processes and reporting.";
  const outcomes = chapObj.learningOutcomes || project.outcomes || ["Full-stack architecture", "REST API integration"];

  const cleanProjId = project.id.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const cleanModName = (project.modules && project.modules[chapterIndex % project.modules.length]) || "Core Module";

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

      <!-- Comprehensive Theoretical Guide -->
      <div class="enhancement-card">
        <h4 class="card-title">📚 Deep Theoretical Architecture & Specifications</h4>
        <p style="font-size:13px;line-height:1.6;color:var(--text)">
          In real-world web engineering, <b>${chapterName}</b> forms a core pillar of the <b>${project.name}</b> platform. This module establishes a robust separation of concerns between client interface events, server middleware validation, and transactional database persistence. By adhering to 3-tier architecture, system developers ensure low latency (sub-200ms SLAs), high concurrent throughput, and complete operational auditing.
        </p>
      </div>

      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🎯 Project Objective</h4>
          <p style="margin:4px 0 0;font-size:13px;line-height:1.5">${objective}</p>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">💡 Learning Outcomes</h4>
          <ul style="margin:6px 0 0;padding-left:20px;font-size:13px">
            ${(Array.isArray(outcomes) ? outcomes : [outcomes]).map(o => `<li>${o}</li>`).join("")}
          </ul>
        </div>
      </div>

      <!-- Real World Use Cases & Tech Stack -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🛠️ Core Technologies & Tools</h4>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            <span class="pill" style="background:#e0e7ff;color:#3730a3">HTML5 / CSS3</span>
            <span class="pill" style="background:#fef3c7;color:#92400e">JavaScript (ES6+)</span>
            <span class="pill" style="background:#dcfce7;color:#166534">Node.js / Express</span>
            <span class="pill" style="background:#ccfbf1;color:#115e59">MongoDB / Mongoose</span>
            <span class="pill" style="background:#f3e8ff;color:#6b21a8">RESTful APIs</span>
            <span class="pill" style="background:#fee2e2;color:#991b1b">JWT Auth</span>
          </div>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">🏢 Real-World Enterprise Application</h4>
          <p style="font-size:13px;line-height:1.5">
            Production web platforms utilize this architectural pattern to process automated transactions, maintain state integrity across user sessions, enforce security compliance, and generate live administrative analytics.
          </p>
        </div>
      </div>

      <!-- Implementation Roadmap -->
      <div class="enhancement-card">
        <h4 class="card-title">🚀 Step-by-Step Implementation Roadmap</h4>
        <ol style="margin:6px 0 0;padding-left:20px;font-size:13px;line-height:1.6">
          <li><b>Requirements Analysis:</b> Define entity attributes, user authorization roles, and API contracts for <i>${cleanModName}</i>.</li>
          <li><b>Database Schema Setup:</b> Create Mongoose models/collections, indexes, and initial data seeds.</li>
          <li><b>Backend Controller & Routes:</b> Build Express REST API endpoints with request body validation and error handling.</li>
          <li><b>Frontend Integration:</b> Connect UI forms and data tables to REST endpoints with reactive loading state handlers.</li>
          <li><b>Testing & Audit Verification:</b> Execute unit tests (\`node test.js\`), check network status codes, and verify audit logs.</li>
        </ol>
      </div>

      <!-- Git Workflow -->
      <div class="enhancement-card">
        <h4 class="card-title">⚡ Git Version Control Commands</h4>
        <pre class="code-tree-box"><code>git add .
git commit -m "feat(${cleanProjId}): implement ${chapterName} module with REST API & validation"
git push origin main</code></pre>
      </div>

      <!-- Progress Summary Bar -->
      <div class="progress-summary-bar-box" style="background:var(--card2);padding:16px;border:1px solid var(--border);border-radius:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>📊 Project Progress Summary</b>
          <span><b>${completedCount}/${totalChapters}</b> Chapters Finished (${remainingCount} Remaining)</span>
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

  let body = `<div class="summarybox"><b>${state.currentDoc?.projectTitle || p.name}</b><br>${state.currentDoc?.projectDescription || p.summary}</div>
    <div class="chapter-queue">
      ${docChapters.map((c, i) => `<span class="queue-chip ${completed.includes(i)||completed.includes(c.title)||completed.includes(c.id)?"done":""} ${i===state.currentChapter?"current":""}">${c.chapterNumber || (i+1)}</span>`).join("")}
    </div>`;

  if (activeChapObj.introduction) {
    body += `<div class="chapter-intro-box" style="margin:16px 0;line-height:1.6;font-size:14px;color:var(--text)">${activeChapObj.introduction}</div>`;
  }

  if (Array.isArray(activeChapObj.importantSubtopics) && activeChapObj.importantSubtopics.length) {
    body += `<h3>Important Subtopics</h3><ul>${activeChapObj.importantSubtopics.map(st => `<li>${st}</li>`).join("")}</ul>`;
  }

  if (Array.isArray(activeChapObj.sections) && activeChapObj.sections.length) {
    activeChapObj.sections.forEach(sec => {
      body += `<div class="enhancement-card" style="margin-top:16px">
        <h4 class="card-title">${sec.heading || "Section"}</h4>
        ${sec.content ? `<p style="font-size:13px;line-height:1.5">${sec.content}</p>` : ""}
        ${Array.isArray(sec.bulletPoints) && sec.bulletPoints.length ? `<ul>${sec.bulletPoints.map(bp=>`<li>${bp}</li>`).join("")}</ul>` : ""}
      </div>`;
    });
  }

  if (Array.isArray(activeChapObj.codeExamples) && activeChapObj.codeExamples.length) {
    activeChapObj.codeExamples.forEach(ce => {
      body += `<div class="enhancement-card" style="margin-top:16px">
        <h4 class="card-title">💻 ${ce.title || "Code Example"} (${ce.language || "code"})</h4>
        <pre class="code-tree-box"><code>${ce.code}</code></pre>
        ${ce.explanation ? `<p class="muted" style="font-size:12px;margin-top:6px">${ce.explanation}</p>` : ""}
      </div>`;
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
      <div class="notes-section"><h3>Intern Notes</h3><textarea id="noteBox" class="notes">${localStorage.getItem(noteKey)||""}</textarea><button class="btn outline" id="saveNoteButton" type="button">Save Notes</button></div>`}
    <div class="chapter-actions">
      <button class="btn outline" id="prevChapter" ${state.currentChapter===0?"disabled":""}>← Previous</button>
      ${state.publicMode ? `<button class="btn outline" id="backToProjectsButton">← Back to Projects</button>` : `<button class="btn success" id="completeChapterButton" ${!progressEnabled?"disabled":""}>Mark Chapter Complete</button>`}
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
    if (progressEnabled) {
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
  $("chapterContent").innerHTML=`<section class="chapter"><h2>Project Submission</h2><p>All chapters are complete. Pass the quiz and submit GitHub URL.</p><input id="githubUrl" class="input" placeholder="https://github.com/username/repository"><textarea id="submissionNote" class="input" placeholder="Submission note"></textarea><button class="btn success" id="submitProjectButton">Submit Project & Unlock Next</button></section>`;
  $("submitProjectButton").onclick=submitProject;
}

async function submitProject() {
  try{
    const data=await api(`/projects/${state.currentProject.id}/submit`,{method:"POST",body:JSON.stringify({githubUrl:$("githubUrl").value.trim(),submissionNote:$("submissionNote").value.trim()})});
    await api(`/tracking/${state.currentProject.id}/stop`,{method:"POST"});
    clearInterval(state.sessionTimer);
    notify(data.message);
    await renderDashboard();
    show("dashboardView");
  }catch(e){notify(e.message,"error");}
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
  if (!state.token) {
    cameraState.totalSeconds = Number(
      localStorage.getItem("cameraTotalWorkSeconds") || 0
    );
    const total = document.getElementById("cameraTotalTimer");
    if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds);
    return;
  }

  try {
    const data = await api("/camera-work/summary");
    cameraState.totalSeconds = Number(data.totalWorkSeconds || 0);
    const total = document.getElementById("cameraTotalTimer");
    if (total) total.textContent = formatCameraDuration(cameraState.totalSeconds);
  } catch {}
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
  document.getElementById("cameraPlaceholder").classList.remove("hidden");
  document.getElementById("cameraStatus").textContent = "Camera stopped";
  document.getElementById("startCameraButton").textContent = "Start Camera";
  document.getElementById("startWorkButton").disabled = true;
  document.getElementById("captureProofButton").disabled = true;
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
  document.getElementById("startCameraButton").onclick = toggleWorkCamera;
  document.getElementById("startWorkButton").onclick = startCameraWorkSession;
  document.getElementById("captureProofButton").onclick = () => captureCameraProof("manual");
  document.getElementById("stopWorkButton").onclick = stopCameraWorkSession;
  loadCameraTotals();
  initializeAttentionDetector();
}

window.addEventListener("beforeunload", () => {
  cameraState.stream?.getTracks().forEach(track => track.stop());
});

async function initApp() {
  initializeCameraWidget();
  const isLogged = Boolean(state.token || state.leaderToken);
  const role = state.role || (state.leaderToken ? "ADMIN" : (state.token ? "STUDENT" : ""));

  if (!isLogged) {
    show("loginView");
  } else {
    if (role === "ADMIN") {
      try {
        await renderAdminDashboard();
        show("adminView");
      } catch {
        logout();
      }
    } else {
      try {
        const user = await loadMe();
        if ((user?.selectedProjects || []).length === 4) {
          await renderDashboard();
          show("dashboardView");
        } else {
          renderSelection();
          show("selectView");
        }
      } catch {
        logout();
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
