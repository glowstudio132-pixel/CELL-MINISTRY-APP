/* ============================================================
   CE CAMPUS — AUTH (Supabase)
   Real accounts: email + password, and Google. Roles come from the
   database (profiles.role), never from the browser. Administrators are
   invited by email (see supabase/schema.sql, table admin_invites).

   Pages call:   session = await bootPage("cell_leader" | "administrator")
   which signs the visitor in (or redirects to login.html), loads the
   data they are allowed to see, and returns the session object.
   ============================================================ */

/* ---------- Permissions (for reference; the database enforces the real rules) ---------- */
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

let _sb = null;     // Supabase client (one per page)
let _user = null;   // the signed-in user's session object (in memory only)

/* ---------- Supabase client ---------- */
function configIsMissing() {
  const c = window.CE_CONFIG || {};
  const bad = v => !v || /PASTE_|YOUR_/i.test(v);
  return bad(c.SUPABASE_URL) || bad(c.SUPABASE_ANON_KEY);
}

function getSupabase() {
  if (_sb) return _sb;
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("The Supabase library could not load. Check your internet connection and refresh.");
  }
  if (configIsMissing()) {
    throw new Error("Supabase isn't connected yet. Open supabase-config.js and paste your Project URL and anon key (see SETUP.md).");
  }
  _sb = window.supabase.createClient(window.CE_CONFIG.SUPABASE_URL, window.CE_CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  });
  return _sb;
}

function pageUrl(name) { return new URL(name, window.location.href).href; }

function friendlyAuthError(error) {
  const m = (error && error.message) || "";
  if (/invalid login credentials/i.test(m)) return "Invalid login details. Please check your email and password.";
  if (/email not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for the confirmation link.";
  if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a minute and try again.";
  if (/failed to fetch|network/i.test(m)) return "Network problem. Check your connection and try again.";
  if (/password should be at least/i.test(m)) return "Password must be at least 6 characters.";
  if (/unsupported provider|provider is not enabled/i.test(m)) return "Google sign-in isn't switched on in Supabase yet (see SETUP.md).";
  return m || "Something went wrong. Please try again.";
}

/* ---------- Loading / fatal-error screens ---------- */
function showBootLoader() {
  if (document.getElementById("boot-loader")) return;
  const el = document.createElement("div");
  el.id = "boot-loader";
  el.textContent = "Loading…";
  const main = document.querySelector(".main");
  if (main) {
    // Keep the sidebar on screen while data loads; only the page area waits.
    main.classList.add("booting");
    main.appendChild(el);
  } else {
    el.style.cssText = "position:fixed; inset:0; z-index:9998; background:var(--paper-0, #fff); display:flex; align-items:center; justify-content:center; font-family:Inter,sans-serif; color:var(--ink-500, #656b87); font-size:14px;";
    document.body.appendChild(el);
  }
}
function hideBootLoader() {
  const el = document.getElementById("boot-loader");
  if (el) el.remove();
  const main = document.querySelector(".main");
  if (main) main.classList.remove("booting");
}
function showFatal(message) {
  hideBootLoader();
  const el = document.createElement("div");
  el.style.cssText = "position:fixed; inset:0; z-index:9999; background:var(--paper-0, #fff); display:flex; align-items:center; justify-content:center; padding:24px; font-family:Inter,sans-serif;";
  el.innerHTML = `<div style="max-width:440px; text-align:center;">
      <h2 style="margin-bottom:10px; color:var(--ink-900, #10142b);">We couldn't load the app</h2>
      <p style="color:var(--ink-500, #656b87); line-height:1.6; margin-bottom:18px;">${escapeHtml(message)}</p>
      <button class="btn btn-primary" onclick="window.location.reload()">Try again</button>
      <div style="margin-top:12px;"><a href="login.html" style="color:var(--royal-600, #3346d6); font-size:13px;">Back to sign in</a></div>
    </div>`;
  document.body.appendChild(el);
}

/* ---------- Profile / session ---------- */
async function fetchProfile(sb, userId) {
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(friendlyAuthError(error));
  return data;
}

async function signedAvatarUrl(path) {
  if (!path) return null;
  try {
    const { data } = await getSupabase().storage.from("avatars").createSignedUrl(path, 3600);
    return data ? data.signedUrl : null;
  } catch (e) { return null; }
}

/* Builds the object every page uses as `session`. */
async function buildSession(profile) {
  const user = {
    id: profile.id,
    name: profile.full_name || profile.email,
    email: profile.email,
    phone: profile.phone || "",
    role: profile.role,
    photoPath: profile.photo_path || null,
    photo: await signedAvatarUrl(profile.photo_path),
    emailReminders: profile.email_reminders !== false
  };
  if (profile.role === "administrator") {
    user.adminType = profile.admin_type || "zonal_admin";
    user.groupId = profile.group_id || null;
    const g = (typeof getGroupById === "function" && profile.group_id) ? getGroupById(profile.group_id) : null;
    user.groupName = g ? g.name : null;
  } else {
    user.leaderId = profile.id;
    user.cellId = profile.cell_id || null;
    user.cell = user.group = user.chapter = null;
    if (profile.cell_id && typeof getCellById === "function") {
      const cell = getCellById(profile.cell_id);
      if (cell) {
        user.cell = cell.name;
        const ch = getChapterById(cell.chapterId), gr = getGroupById(cell.groupId);
        user.chapter = ch ? ch.name : null;
        user.group = gr ? gr.name : null;
      }
    }
  }
  return user;
}

function getCurrentUser() { return _user; }
function updateSessionFields(changes) { if (_user) Object.assign(_user, changes); }
function hasPermission(permission) {
  return !!_user && (PERMISSIONS[_user.role] || []).includes(permission);
}

function dashboardPathFor(role) {
  return role === "administrator" ? "admin-dashboard.html" : "leader-dashboard.html";
}
function redirectByRole(user) {
  user = user || _user;
  window.location.href = user ? dashboardPathFor(user.role) : "login.html";
}

/* ---------- Page bootstrap ----------
   requiredRole: "cell_leader" | "administrator" | null (any signed-in user)
   opts.skipData: don't load cell data (help page, profile setup)
   opts.allowNoCell: let a leader without a cell stay on this page */
async function bootPage(requiredRole, opts) {
  opts = opts || {};
  showBootLoader();
  try {
    const sb = getSupabase();
    const { data: { session: authSession } } = await sb.auth.getSession();
    if (!authSession) { window.location.replace("login.html"); return null; }

    let profile = await fetchProfile(sb, authSession.user.id);
    if (!profile) {
      await sb.rpc("ensure_profile");
      profile = await fetchProfile(sb, authSession.user.id);
    }
    if (!profile) throw new Error("We couldn't find your profile. Please sign out and sign in again.");

    if (profile.role === "cell_leader" && !profile.cell_id && !opts.allowNoCell) {
      window.location.replace("complete-profile.html");
      return null;
    }
    if (requiredRole && profile.role !== requiredRole) {
      window.location.replace(dashboardPathFor(profile.role));
      return null;
    }

    if (!opts.skipData) await initData(profile);
    _user = await buildSession(profile);

    sb.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") window.location.replace("login.html"); });
    hideBootLoader();
    return _user;
  } catch (err) {
    showFatal(err.message || "Something went wrong while loading.");
    return null;
  }
}

/* After any sign-in: make sure a profile exists, apply an admin invite if
   there is one, and say where the person should land. */
async function routeSignedInUser() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  let profile = await fetchProfile(sb, session.user.id);
  if (!profile) { await sb.rpc("ensure_profile"); profile = await fetchProfile(sb, session.user.id); }
  if (!profile) return null;
  if (profile.role === "cell_leader") {
    const { data: claimed } = await sb.rpc("claim_admin_invite");
    if (claimed) profile = await fetchProfile(sb, session.user.id);
  }
  if (profile.role === "cell_leader" && !profile.cell_id) return { path: "complete-profile.html", profile };
  return { path: dashboardPathFor(profile.role), profile };
}

/* ---------- Sign in / up / out ---------- */
async function signInWithPassword(email, password) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true };
}

async function signInWithGoogle() {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: pageUrl("login.html"), queryParams: { prompt: "select_account" } }
  });
  return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true };
}

/* Email sign-up. The cell details ride along as metadata; the database
   (never the browser) decides the role and creates the cell. */
async function signUpWithEmail(info) {
  const { data, error } = await getSupabase().auth.signUp({
    email: info.email,
    password: info.password,
    options: {
      emailRedirectTo: pageUrl("login.html"),
      data: { full_name: info.fullName, chapter_id: info.chapterId || null, cell_name: info.cellName || null }
    }
  });
  if (error) return { ok: false, message: friendlyAuthError(error) };
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, message: "An account with this email already exists." };
  }
  return { ok: true, signedIn: !!data.session };
}

async function sendPasswordReset(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: pageUrl("reset-password.html") });
  return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true };
}

async function logout() {
  try { await getSupabase().auth.signOut(); } catch (e) { /* still leave */ }
  window.location.href = "login.html";
}

/* ---------- Editing your own profile ---------- */
/* changes: { name, phone, photo }  photo: undefined = keep, null = remove, data URL = new */
async function saveMyProfile(changes) {
  const sb = getSupabase();
  const u = _user;
  const patch = { full_name: changes.name, phone: changes.phone || null };
  let uploadedPath = null;

  if (changes.photo !== undefined) {
    if (changes.photo) {
      const blob = await dataUrlToBlob(changes.photo);
      uploadedPath = u.id + "/avatar-" + Date.now() + ".jpg";
      const up = await sb.storage.from("avatars").upload(uploadedPath, blob, { contentType: "image/jpeg" });
      if (up.error) throw new Error("Could not upload your photo. " + friendlyAuthError(up.error));
      patch.photo_path = uploadedPath;
    } else {
      patch.photo_path = null;
    }
  }

  const { error } = await sb.from("profiles").update(patch).eq("id", u.id);
  if (error) {
    if (uploadedPath) await sb.storage.from("avatars").remove([uploadedPath]);
    throw new Error(friendlyAuthError(error));
  }
  if (changes.photo !== undefined && u.photoPath) await sb.storage.from("avatars").remove([u.photoPath]); // tidy old file
  u.name = changes.name;
  u.phone = changes.phone || "";
  if (changes.photo !== undefined) {
    u.photoPath = patch.photo_path;
    u.photo = await signedAvatarUrl(patch.photo_path);
  }
  const leader = typeof getLeaderById === "function" ? getLeaderById(u.id) : null;
  if (leader) { leader.name = u.name; leader.phone = u.phone; }
  return u;
}

async function setEmailReminders(flag) {
  const { error } = await getSupabase().from("profiles").update({ email_reminders: !!flag }).eq("id", _user.id);
  if (error) throw new Error(friendlyAuthError(error));
  _user.emailReminders = !!flag;
}
