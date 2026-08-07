
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

  // If user is already logged in and tries to access loginView
  if (isLogged && id === "loginView") {
    id = isAdmin ? "adminView" : ((state.user?.selectedProjects || []).length === 4 ? "dashboardView" : "selectView");
  }

  // Admin route protection
  if (id === "adminView" && !isAdmin) {
    notify("Admin credentials required to access the Admin Panel.", "error");
    id = "loginView";
  }

  ["homeView","loginView","adminView","leaderView","selectView","dashboardView","docView"].forEach(viewId => $(viewId)?.classList.add("hidden"));
  $(id)?.classList.remove("hidden");
  if (id === "loginView") {
    document.body.classList.add("on-login-page");
  } else {
    document.body.classList.remove("on-login-page");
  }
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

function getEnhancedChapterContent(project, chapterIndex, chapterName, completedCount) {
  const totalChapters = CHAPTERS.length;
  const percentComplete = Math.round((completedCount / totalChapters) * 100);
  const remainingCount = totalChapters - completedCount;
  const difficulty = chapterIndex < 4 ? "Beginner" : (chapterIndex < 10 ? "Intermediate" : "Advanced");
  const diffBadgeClass = difficulty === "Beginner" ? "badge-beginner" : (difficulty === "Intermediate" ? "badge-intermediate" : "badge-advanced");
  const estTimeReading = 15 + (chapterIndex % 3) * 10;
  const estTimeCoding = 45 + (chapterIndex % 4) * 30;
  const cleanProjId = project.id.replace(/-/g, "_");
  const cleanModName = project.modules[chapterIndex % project.modules.length] || "Core Module";

  return `
    <div class="enhanced-chapter-section">
      <!-- 17. Estimated Time, 18. Difficulty Level, 20. Progress Summary -->
      <div class="meta-info-grid">
        <div class="meta-card">
          <span class="meta-icon">⏱️</span>
          <div>
            <div class="meta-label">17. Estimated Time</div>
            <div class="meta-val">${estTimeReading} mins reading · ${estTimeCoding} mins coding</div>
          </div>
        </div>
        <div class="meta-card">
          <span class="meta-icon">🎯</span>
          <div>
            <div class="meta-label">18. Difficulty Level</div>
            <div class="meta-val"><span class="diff-badge ${diffBadgeClass}">${difficulty}</span></div>
          </div>
        </div>
        <div class="meta-card">
          <span class="meta-icon">📊</span>
          <div>
            <div class="meta-label">20. Progress Summary</div>
            <div class="meta-val"><b>${completedCount}/${totalChapters}</b> Chapters Done (${percentComplete}%)</div>
          </div>
        </div>
      </div>

      <!-- 1. Project Objective & 2. Learning Outcomes -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🎯 1. Project Objective</h4>
          <p>Implement the business logic and digital workflow for the <b>${cleanModName}</b> feature in <b>${project.name}</b>. Ensure reliable data processing, multi-user role validation, operational security, and real-time state management for enterprise production deployment.</p>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">🎓 2. Learning Outcomes</h4>
          <ul class="styled-bullet-list">
            <li>Master ${chapterName} architectural concepts & component design.</li>
            <li>Implement production-grade REST API integration and database mapping.</li>
            <li>Apply asynchronous error handling, state validation, and clean code principles.</li>
            <li>Understand real-world industry standards for ${project.name}.</li>
          </ul>
        </div>
      </div>

      <!-- 3. Technologies Used & 4. Real-World Use Case -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🛠️ 3. Technologies Used</h4>
          <div class="tech-tags-list">
            <span class="tech-tag">HTML5</span>
            <span class="tech-tag">CSS3 / Flexbox</span>
            <span class="tech-tag">JavaScript (ES6+)</span>
            <span class="tech-tag">React / Modular UI</span>
            <span class="tech-tag">Node.js</span>
            <span class="tech-tag">Express.js</span>
            <span class="tech-tag">REST API</span>
            <span class="tech-tag">MongoDB / SQL</span>
            <span class="tech-tag">Git & GitHub</span>
          </div>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">🏢 4. Real-World Use Case</h4>
          <p>Used by production web platforms (such as Shopify, Swiggy, Stripe, Salesforce, and Uber) to automate ${cleanModName} processes, maintain transaction integrity, manage session permissions, and generate live administrative analytics.</p>
        </div>
      </div>

      <!-- 5. Implementation Steps -->
      <div class="enhancement-card">
        <h4 class="card-title">🚀 5. Implementation Steps</h4>
        <ol class="step-process-list">
          <li><b>Requirement Analysis:</b> Review functional requirements and define entity schemas for <i>${cleanModName}</i>.</li>
          <li><b>Database Schema Setup:</b> Create collections/tables, indexes, and initial seeds for data persistence.</li>
          <li><b>Backend Controller & API Routes:</b> Build REST API endpoints with request validation and JSON responses.</li>
          <li><b>Frontend Component Construction:</b> Build responsive UI views with loading spinners, forms, and data tables.</li>
          <li><b>State Integration & Error Handling:</b> Connect frontend state handlers to backend endpoints with try/catch blocks.</li>
          <li><b>Testing & Verification:</b> Run unit tests, manual API calls, and verify audit logs.</li>
        </ol>
      </div>

      <!-- 6. Database Tables & 7. API Endpoints -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🗄️ 6. Database Tables</h4>
          <table class="enhanced-table">
            <thead><tr><th>Table / Collection</th><th>Key Fields</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>users</code></td><td>id, email, role, status</td><td>User accounts & authorization</td></tr>
              <tr><td><code>${cleanProjId}_${cleanModName.toLowerCase().replace(/[^a-z0-9]/g, '_')}</code></td><td>id, userId, status, createdAt</td><td>Module operation logs & state</td></tr>
              <tr><td><code>audit_logs</code></td><td>id, userId, action, timestamp</td><td>Security activity & event logs</td></tr>
            </tbody>
          </table>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">🔌 7. API Endpoints</h4>
          <table class="enhanced-table">
            <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="method-tag post">POST</span></td><td><code>/api/${cleanProjId}/${cleanModName.toLowerCase().replace(/[^a-z0-9]/g, '-')}</code></td><td>Create new record</td></tr>
              <tr><td><span class="method-tag get">GET</span></td><td><code>/api/${cleanProjId}/${cleanModName.toLowerCase().replace(/[^a-z0-9]/g, '-')}</code></td><td>Fetch module records</td></tr>
              <tr><td><span class="method-tag put">PUT</span></td><td><code>/api/${cleanProjId}/${cleanModName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/:id</code></td><td>Update module status</td></tr>
              <tr><td><span class="method-tag delete">DELETE</span></td><td><code>/api/${cleanProjId}/${cleanModName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/:id</code></td><td>Remove/deactivate record</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 8. Folder Structure & 9. Best Practices -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">📁 8. Folder Structure</h4>
          <pre class="code-tree-box"><code>project-root/
├── src/
│   ├── components/${cleanModName}/
│   │   ├── ${cleanModName}View.jsx
│   │   └── ${cleanModName}Card.jsx
│   ├── controllers/${cleanModName.toLowerCase()}Controller.js
│   ├── models/${cleanModName.toLowerCase()}Model.js
│   └── routes/${cleanModName.toLowerCase()}Routes.js
└── tests/${cleanModName.toLowerCase()}.test.js</code></pre>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">💡 9. Best Practices</h4>
          <ul class="styled-bullet-list">
            <li><b>Input Sanitization:</b> Validate and sanitize all incoming payloads on both frontend and backend.</li>
            <li><b>Async Safety:</b> Wrap asynchronous controller calls in <code>try...catch</code> blocks to prevent unhandled promise rejections.</li>
            <li><b>Modular Code:</b> Keep single-responsibility components and decouple database queries into model modules.</li>
            <li><b>Security First:</b> Never hardcode secret keys or credentials in client-side script code.</li>
          </ul>
        </div>
      </div>

      <!-- 10. Common Mistakes & 14. Industry Tips -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card alert-mistakes">
          <h4 class="card-title">⚠️ 10. Common Mistakes</h4>
          <ul class="styled-bullet-list">
            <li>Skipping client-side and server-side validation checks.</li>
            <li>Forgetting to handle loading states or API timeout exceptions in UI components.</li>
            <li>Exposing database errors directly to end-user clients.</li>
            <li>Not creating feature branches or writing descriptive Git commit messages.</li>
          </ul>
        </div>
        <div class="enhancement-card alert-industry">
          <h4 class="card-title">💎 14. Industry Tips</h4>
          <ul class="styled-bullet-list">
            <li><b>Clean Architecture:</b> Follow DRY (Don't Repeat Yourself) principles across component trees.</li>
            <li><b>Structured Logging:</b> Use structured JSON logs (e.g. Winston/Pino) for production monitoring.</li>
            <li><b>Pull Requests:</b> Keep commits atomic and test UI responsiveness across devices before merging.</li>
          </ul>
        </div>
      </div>

      <!-- 11. Assignment & 12. Mini Challenge -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">📝 11. Assignment</h4>
          <p>Build the core UI form and database endpoints for <b>${cleanModName}</b>. Test POST and GET methods using Postman or browser console, and verify that audit logs record the activity.</p>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">⚡ 12. Mini Challenge</h4>
          <p>Add a real-time status filter toggle (e.g. <i>Active / Completed / Pending</i>) and a search input to instantly filter records in the UI table without re-fetching from backend.</p>
        </div>
      </div>

      <!-- 13. Interview Questions -->
      <div class="enhancement-card">
        <h4 class="card-title">❓ 13. Technical Interview Questions</h4>
        <div class="qna-accordion">
          <details class="qna-item"><summary>Q1: How does ${chapterName} integrate into the overall system architecture of ${project.name}?</summary><div class="qna-ans">It connects UI user actions to backend controller endpoints, processing business rules and updating database state with security audit logging.</div></details>
          <details class="qna-item"><summary>Q2: What techniques ensure database query performance during high traffic for this module?</summary><div class="qna-ans">Using indexes on frequently searched fields (like <code>userId</code>, <code>email</code>, <code>status</code>), pagination, and caching static resources.</div></details>
          <details class="qna-item"><summary>Q3: How do you handle authorization and prevent unauthorized endpoint access?</summary><div class="qna-ans">By attaching JWT middleware (e.g., <code>authenticate</code> & <code>authorize("ADMIN")</code>) to REST API routes to check user tokens and roles before execution.</div></details>
          <details class="qna-item"><summary>Q4: What is the benefit of separating routes, controllers, and models in backend code?</summary><div class="qna-ans">Separation of concerns ensures clean readability, simplified unit testing, easier maintenance, and scalable team collaboration.</div></details>
          <details class="qna-item"><summary>Q5: Why is client-side validation alone insufficient for web security?</summary><div class="qna-ans">Client-side code can be bypassed or manipulated in browser DevTools. Backend server validation is mandatory to guarantee data integrity and security.</div></details>
        </div>
      </div>

      <!-- 15. GitHub Task & 16. Completion Checklist -->
      <div class="enhancement-grid-2col">
        <div class="enhancement-card">
          <h4 class="card-title">🐙 15. GitHub Commit Task</h4>
          <p>Commit your completed code to your GitHub repository:</p>
          <pre class="code-tree-box"><code>git add .
git commit -m "feat(${cleanProjId}): implement ${chapterName} module with UI & REST API"
git push origin main</code></pre>
        </div>
        <div class="enhancement-card">
          <h4 class="card-title">✅ 16. Completion Checklist</h4>
          <div class="checklist-grid">
            <label class="check-item"><input type="checkbox" checked disabled> <span>Requirement Understood</span></label>
            <label class="check-item"><input type="checkbox" checked disabled> <span>UI Completed</span></label>
            <label class="check-item"><input type="checkbox" checked disabled> <span>Backend Completed</span></label>
            <label class="check-item"><input type="checkbox" checked disabled> <span>Database Updated</span></label>
            <label class="check-item"><input type="checkbox" checked disabled> <span>API Tested</span></label>
            <label class="check-item"><input type="checkbox" checked disabled> <span>GitHub Commit Done</span></label>
          </div>
        </div>
      </div>

      <!-- 19. Additional Resources & 20. Progress Summary Footer -->
      <div class="enhancement-card">
        <h4 class="card-title">📚 19. Additional Resources & Documentation</h4>
        <div class="resource-links-grid">
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" class="resource-link">🌐 MDN Web Docs - JavaScript Guide</a>
          <a href="https://react.dev/" target="_blank" class="resource-link">⚛️ Official React Documentation</a>
          <a href="https://expressjs.com/" target="_blank" class="resource-link">🚀 Express.js API Reference</a>
          <a href="https://owasp.org/" target="_blank" class="resource-link">🔒 OWASP Web Security Guidelines</a>
        </div>
      </div>

      <div class="progress-summary-bar-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>📊 20. Project Progress Summary</b>
          <span><b>${completedCount}/${totalChapters}</b> Chapters Finished (${remainingCount} Remaining)</span>
        </div>
        <div class="progress-track-bg">
          <div class="progress-track-fill" style="width:${percentComplete}%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderChapter() {
  const p=state.currentProject, chapter=CHAPTERS[state.currentChapter];
  const completed = state.publicMode
    ? JSON.parse(localStorage.getItem(`publicProgress:${p.id}`)||"[]")
    : (state.user?.progress?.[p.id]?.completedChapters || []);
  const moduleRows=p.modules.map((m,i)=>`<tr><td>${i+1}</td><td>${m}</td><td>Purpose, fields, CRUD, validation, permissions, workflow, reports and testing.</td></tr>`).join("");
  let body=`<div class="summarybox"><b>${p.name}</b><br>${p.summary}</div>
    <div class="chapter-queue">${CHAPTERS.map((c,i)=>`<span class="queue-chip ${completed.includes(i)||completed.includes(c)?"done":""} ${i===state.currentChapter?"current":""}">${i+1}</span>`).join("")}</div>
    <h3>Important Subtopics</h3><ul><li>Business purpose</li><li>Actors and permissions</li><li>Fields and validation</li><li>Workflow and exceptions</li><li>Database and API mapping</li><li>Testing and deployment</li></ul>`;

  if(chapter==="Overview") body+=`<table class="table"><tr><th>Week</th><th>Work</th></tr><tr><td>1</td><td>Research and SRS</td></tr><tr><td>2</td><td>Database and authentication</td></tr><tr><td>3–4</td><td>Core modules</td></tr><tr><td>5</td><td>Testing and reports</td></tr><tr><td>6</td><td>Deployment and submission</td></tr></table>`;
  if(chapter==="Requirements") body+=`<table class="table"><tr><th>#</th><th>Module</th><th>Requirement</th></tr>${moduleRows}</table>`;
  if(chapter==="Modules") body+=`<table class="table"><tr><th>#</th><th>Module</th><th>Coverage</th></tr>${moduleRows}</table>`;
  if(chapter==="Architecture") body+=`<pre>React Frontend → REST API → Node / Express → MongoDB</pre>`;
  if(chapter==="Database") body+=`<table class="table"><tr><th>Collection</th><th>Purpose</th></tr><tr><td>users</td><td>Profiles and roles</td></tr><tr><td>transactions</td><td>Operational records</td></tr><tr><td>auditLogs</td><td>Activity tracking</td></tr></table>`;
  if(chapter==="APIs") body+=`<table class="table"><tr><th>Method</th><th>Endpoint</th><th>Purpose</th></tr><tr><td>POST</td><td>/api/auth/login</td><td>Login</td></tr><tr><td>GET</td><td>/api/resources</td><td>List</td></tr><tr><td>POST</td><td>/api/resources</td><td>Create</td></tr></table>`;
  if(chapter==="Security") body+=`<ul><li>Password hashing</li><li>JWT/session</li><li>Role permissions</li><li>Validation</li><li>Rate limiting</li><li>HTTPS</li></ul>`;
  if(chapter==="UI/UX") body+=`<div class="image-ref"><b>Image Reference</b><p>Add Login, Dashboard, Form, Reports and Mobile screenshots.</p></div>`;
  if(chapter==="Code Examples") body+=`<pre>router.post("/resources", authenticate, authorize("ADMIN"), validate(schema), controller.create);</pre>`;
  if(chapter==="Testing") body+=`<ul><li>Unit testing</li><li>API testing</li><li>Integration testing</li><li>UI testing</li><li>UAT</li></ul>`;
  if(chapter==="Deployment") body+=`<pre># Backend\nnpm install\nnpm test\nnpm start\n\n# Frontend\nnpx serve .</pre>`;
  if(chapter==="Assignment") body+=`<ol><li>Complete modules.</li><li>Add screenshots.</li><li>Write tests.</li><li>Deploy.</li><li>Submit GitHub URL.</li></ol>`;
  if(chapter==="Quiz") {
    const quizPassed = state.user?.progress?.[p.id]?.quizPassed;
    body+=`<h3>Project Quiz</h3>
      <label class="quiz-option"><input type="radio" name="quizAnswer" value="frontend"> Security is only required in frontend.</label>
      <label class="quiz-option"><input type="radio" name="quizAnswer" value="backend"> Backend must enforce authentication and authorization.</label>
      <label class="quiz-option"><input type="radio" name="quizAnswer" value="none"> Validation is optional.</label>
      <button class="btn primary" id="quizButton" type="button">Submit Quiz</button>
      ${quizPassed?'<div class="quiz-result">Quiz Passed · Score 100%</div>':""}`;
  }
  if(chapter==="References") body+=`<ul><li>React documentation</li><li>Node.js documentation</li><li>Express documentation</li><li>MongoDB documentation</li><li>OWASP guidance</li><li>GitHub documentation</li></ul>`;

  body += getEnhancedChapterContent(p, state.currentChapter, chapter, completed.length);

  const noteKey=`note:${p.id}:${state.currentChapter}`;
  $("chapterContent").innerHTML=`<section class="chapter">
    <div class="tracking-strip">
      <span>Mode: <b>${state.publicMode?"Documentation Preview":"Tracked Learning"}</b></span>
      ${state.publicMode ? `<span>Progress changes: <b>Disabled</b></span>` : `<span>Session Time: <span id="liveSessionTime" class="live-timer">${formatTime(state.sessionSeconds)}</span></span>`}
      <span>Chapter ${state.currentChapter+1}/${CHAPTERS.length}</span>
    </div>
    <h2>${chapter}</h2>${body}
    ${state.publicMode ? `
      <div class="preview-information">
        <div class="preview-info-card"><b>Documentation Preview</b><span>Read all chapters without changing tracked progress.</span></div>
        <div class="preview-info-card"><b>Tracking Disabled</b><span>Select 4 projects and use Start / Continue for chapter completion, quiz reports and time tracking.</span></div>
      </div>` : `
      <div class="notes-section"><h3>Intern Notes</h3><textarea id="noteBox" class="notes">${localStorage.getItem(noteKey)||""}</textarea><button class="btn outline" id="saveNoteButton" type="button">Save Notes</button></div>`}
    <div class="chapter-actions">
      <button class="btn outline" id="prevChapter" ${state.currentChapter===0?"disabled":""}>← Previous</button>
      ${state.publicMode ? `<button class="btn outline" id="backToProjectsButton">← Back to 10 Projects</button>` : `<button class="btn success" id="completeChapterButton">Mark Chapter Complete</button>`}
      <button class="btn primary" id="nextChapter" ${state.currentChapter===CHAPTERS.length-1?"disabled":""}>Next →</button>
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
            chapterName: CHAPTERS[state.currentChapter],
            notes: val
          })
        });
        notify("Notes saved to database permanently.");
        renderStudentNotes();
      } catch(err) {
        notify(`Notes saved locally: ${err.message}`);
      }
    };
    $("completeChapterButton").onclick=completeChapter;
  } else {
    $("backToProjectsButton").onclick=()=>show("homeView");
  }
  $("prevChapter").onclick=()=>openChapter(Math.max(0,state.currentChapter-1));
  $("nextChapter").onclick=()=>openChapter(Math.min(CHAPTERS.length-1,state.currentChapter+1));
  if($("quizButton")) $("quizButton").onclick=submitQuiz;
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
