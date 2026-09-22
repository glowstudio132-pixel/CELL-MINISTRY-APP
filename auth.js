/* ============================================================
   CE CAMPUS — AUTH (DEMO ONLY)
   -----------------------------------------------------------
   Frontend authentication is for demonstration only.
   Production authentication must be handled by a secure backend.
   Role permissions must be enforced server-side.
   -----------------------------------------------------------
   This file only decides what the UI shows. Swapping to a real
   backend later means replacing login()/getCurrentUser()/logout()
   with real API calls — every other page calls only the helpers
   below, never localStorage/sessionStorage directly.
   ============================================================ */

const AUTH_KEY = "ceCampusAuth_v2";

/* ---------- Demo accounts ---------- */
const DEMO_ACCOUNTS = {
  cell_leader: {
    id: "demo-user-001",
    name: "Daniel Etim",
    email: "leader@demo.com",
    password: "leader123",
    role: "cell_leader",
    leaderId: "leader1"
  },
  administrator: {
    id: "demo-admin-001",
    name: "Pastor Wale Adaeze",
    email: "admin@demo.com",
    password: "admin123",
    role: "administrator"
  }
};

/* ---------- Permissions (frontend-only, for future backend parity) ---------- */
const PERMISSIONS = {
  administrator: [
    "viewGroups", "manageGroups", "viewChapters", "manageChapters",
    "viewCells", "manageCells", "viewMembers", "manageMembers",
    "viewAttendance", "viewOfferings", "viewReports", "viewAnalytics"
  ],
  cell_leader: [
    "viewOwnCell", "manageOwnMembers", "recordAttendance",
    "recordOffering", "recordActivity", "trackGrowth", "submitReports"
  ]
};

function hasPermission(permission) {
  const user = getCurrentUser();
  if (!user) return false;
  return (PERMISSIONS[user.role] || []).includes(permission);
}

/* ---------- Storage: localStorage if "remember me", else sessionStorage ---------- */
function storeSession(session, remember) {
  const payload = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(AUTH_KEY, payload);
    sessionStorage.removeItem(AUTH_KEY);
  } else {
    sessionStorage.setItem(AUTH_KEY, payload);
    localStorage.removeItem(AUTH_KEY);
  }
}

function getCurrentUser() {
  try {
    const fromLocal = localStorage.getItem(AUTH_KEY);
    if (fromLocal) return JSON.parse(fromLocal);
    const fromSession = sessionStorage.getItem(AUTH_KEY);
    if (fromSession) return JSON.parse(fromSession);
    return null;
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  return !!getCurrentUser();
}

function isAdmin() {
  const u = getCurrentUser();
  return !!u && u.role === "administrator";
}

function isCellLeader() {
  const u = getCurrentUser();
  return !!u && u.role === "cell_leader";
}

/* ---------- Login / logout ---------- */
function login(role, email, password, remember) {
  if (!role) return { ok: false, field: "role", message: "Please select your account type." };
  if (!email) return { ok: false, field: "email", message: "Please enter your email or username." };
  if (!password) return { ok: false, field: "password", message: "Please enter your password." };

  let account = DEMO_ACCOUNTS[role];
  let matched = account && account.email.toLowerCase() === email.trim().toLowerCase() && account.password === password;

  // Also check accounts created through the registration page.
  if (!matched && typeof findRegisteredAccount === "function") {
    const registered = findRegisteredAccount(email.trim());
    if (registered && registered.role === role && registered.password === password) {
      account = registered;
      matched = true;
    }
  }

  if (!matched) {
    return { ok: false, field: "form", message: "Invalid login details. Please check your email and password." };
  }

  const session = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };

  // Enrich a Cell Leader's session with their cell/chapter/group context,
  // pulled from the demo data layer (js/data.js must be loaded first).
  if (account.role === "cell_leader") {
    session.group = account.group || null;
    session.chapter = account.chapter || null;
    session.cell = account.cellName || account.cell || null;
    if (account.leaderId && typeof getCellForLeader === "function") {
      session.leaderId = account.leaderId;
      const cell = getCellForLeader(account.leaderId);
      if (cell) {
        session.cell = cell.name;
        session.cellId = cell.id;
        const chapter = (typeof getChapterById === "function" ? getChapterById(cell.chapterId) : null);
        const group = (typeof getGroupById === "function" ? getGroupById(cell.groupId) : null);
        session.chapter = chapter ? chapter.name : session.chapter;
        session.group = group ? group.name : session.group;
      }
    }
  }

  storeSession(session, !!remember);
  return { ok: true, session };
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = "login.html";
}

/* ---------- Redirects ---------- */
function dashboardPathFor(role) {
  return role === "administrator" ? "admin-dashboard.html" : "leader-dashboard.html";
}

function redirectByRole(user) {
  user = user || getCurrentUser();
  window.location.href = user ? dashboardPathFor(user.role) : "login.html";
}

/* Call at the very top of any protected page. */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

/* Call at the very top of a page restricted to one role,
   e.g. requireRole("administrator") or requireRole("cell_leader"). */
function requireRole(role) {
  const user = requireAuth();
  if (!user) return null;
  if (user.role !== role) {
    redirectByRole(user);
    return null;
  }
  return user;
}

/* ---------- Role-based UI helpers ---------- */
/* Toggle elements with [data-role-admin] / [data-role-leader] to match the
   current user's role. Call once a page has confirmed a valid session. */
function applyRoleVisibility() {
  const admin = isAdmin();
  document.querySelectorAll("[data-role-admin]").forEach(el => { el.style.display = admin ? "" : "none"; });
  document.querySelectorAll("[data-role-leader]").forEach(el => { el.style.display = admin ? "none" : ""; });
}
function showAdminUI() { document.querySelectorAll("[data-role-admin]").forEach(el => { el.style.display = ""; }); }
function showLeaderUI() { document.querySelectorAll("[data-role-leader]").forEach(el => { el.style.display = ""; }); }
