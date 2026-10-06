/* ============================================================
   CE CAMPUS — SHARED COMPONENT BEHAVIOR
   ============================================================ */

/* Generic confirm dialog. Injects a modal into the DOM if one
   isn't already present, and resolves via callback.
   options: { title, confirmLabel } */
function confirmAction(message, onConfirm, options) {
  options = options || {};
  const title = options.title || "Please confirm";
  const confirmLabel = options.confirmLabel || "Confirm";

  let overlay = document.getElementById("confirm-modal");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "confirm-modal";
    overlay.className = "modal-overlay hidden";
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <div class="modal-header">
          <h3 style="font-size:16px;" id="confirm-title">Please confirm</h3>
          <button class="modal-close" onclick="closeModal('confirm-modal')">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirm-message" style="margin-bottom:20px;"></p>
          <div class="u-flex u-gap-12">
            <button class="btn btn-secondary btn-block" onclick="closeModal('confirm-modal')">Cancel</button>
            <button class="btn btn-primary btn-block" id="confirm-yes-btn">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  const yesBtn = document.getElementById("confirm-yes-btn");
  yesBtn.textContent = confirmLabel;
  const newYesBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
  newYesBtn.addEventListener("click", () => {
    closeModal("confirm-modal");
    onConfirm();
  });
  openModal("confirm-modal");
}

/* Highlights the sidebar / bottom-nav link matching the current page. */
function markActiveNav() {
  const path = window.location.pathname.split("/").pop();
  document.querySelectorAll(".side-link, .bn-item").forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.split("/").pop() === path) link.classList.add("active");
  });
}
document.addEventListener("DOMContentLoaded", markActiveNav);

/* ---------- Reusable profile dropdown ----------
   Renders into any container. Wires Sign Out to the shared
   logout confirmation; Profile/Account Settings/Help are
   placeholders until those pages exist. */
/* Full-size photo viewer (click anywhere or press Esc to close). */
/* Photos are either freshly picked (data: URL) or signed links from Supabase Storage (https). */
function isSafeImageSrc(src) {
  return typeof src === "string" && (src.indexOf("data:image/") === 0 || src.indexOf("https://") === 0 || src.indexOf("blob:") === 0);
}

function openPhotoViewer(src, caption) {
  if (!isSafeImageSrc(src)) return;
  const old = document.getElementById("photo-viewer"); if (old) old.remove();
  const el = document.createElement("div");
  el.id = "photo-viewer";
  el.style.cssText = "position:fixed; inset:0; background:rgba(10,12,30,.86); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; cursor:zoom-out;";
  el.innerHTML = `<img src="${escapeHtml(src)}" alt="" style="max-width:100%; max-height:82vh; border-radius:10px;" />` +
    (caption ? `<div style="color:#fff; margin-top:12px; font-size:13.5px; text-align:center;">${escapeHtml(caption)}</div>` : "");
  const close = () => { el.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  el.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(el);
}

/* Avatar: the user's photo if they have one, otherwise their initials. */
function avatarHTML(user, px, fontPx) {
  const base = `width:${px}px; height:${px}px; font-size:${fontPx}px;`;
  if (user && isSafeImageSrc(user.photo)) {
    return `<span class="side-avatar" style="${base} overflow:hidden; padding:0;"><img src="${escapeHtml(user.photo)}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" /></span>`;
  }
  return `<span class="side-avatar" style="${base}">${escapeHtml(initials(user ? user.name : ""))}</span>`;
}

function initProfileMenu(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container || !user) return;

  const roleLabel = user.role === "administrator" ? "Administrator" : "Cell Leader";
  container.innerHTML = `
    <div class="profile-menu">
      <button class="profile-trigger" id="profile-trigger" aria-haspopup="true" aria-expanded="false">
        ${avatarHTML(user, 36, 13)}
        <span class="profile-trigger-text">
          <span class="u-name" style="color:var(--ink-900); display:block;">${escapeHtml(user.name)}</span>
          <span class="u-role" style="color:var(--ink-500);">${roleLabel}</span>
        </span>
        <i data-lucide="chevron-down" class="profile-chevron" style="width:16px; height:16px; color:var(--ink-400);"></i>
      </button>
      <div class="profile-dropdown hidden" id="profile-dropdown">
        <a href="#" data-action="profile"><i data-lucide="user"></i> Profile</a>
        <a href="#" data-action="settings"><i data-lucide="settings"></i> Account Settings</a>
        <a href="#" data-action="help"><i data-lucide="life-buoy"></i> Help</a>
        <div class="profile-dropdown-divider"></div>
        <a href="#" data-action="logout" class="danger"><i data-lucide="log-out"></i> Sign Out</a>
      </div>
    </div>`;

  const trigger = document.getElementById("profile-trigger");
  const dropdown = document.getElementById("profile-dropdown");
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !dropdown.classList.contains("hidden");
    dropdown.classList.toggle("hidden", open);
    trigger.setAttribute("aria-expanded", String(!open));
  });
  document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
  });

  dropdown.querySelectorAll("a[data-action]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const action = link.getAttribute("data-action");
      const settingsPage = user.role === "administrator" ? "admin-settings.html" : "leader-settings.html";
      if (action === "logout") {
        confirmAction(
          "Are you sure you want to end your current session?",
          logout,
          { title: "Sign out?", confirmLabel: "Sign Out" }
        );
      } else if (action === "profile" || action === "settings") {
        window.location.href = settingsPage;
      } else if (action === "help") {
        window.location.href = "help.html";
      }
    });
  });

  if (window.lucide) lucide.createIcons();
}

/* ---------- Sidebar collapse (desktop) ---------- */
const SIDEBAR_COLLAPSE_KEY = "ceCampusSidebarCollapsed";

function initSidebarCollapse() {
  const sidebar = document.querySelector(".sidebar");
  const btn = document.getElementById("sidebar-collapse-btn");
  if (!sidebar || !btn) return;

  let collapsed = false;
  try { collapsed = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1"; } catch (e) {}
  if (collapsed) sidebar.classList.add("collapsed");
  document.documentElement.removeAttribute("data-sidebar"); // the early attribute has done its job

  btn.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("collapsed");
    try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, isCollapsed ? "1" : "0"); } catch (e) {}
  });
}
document.addEventListener("DOMContentLoaded", initSidebarCollapse);
