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
function initProfileMenu(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container || !user) return;

  const roleLabel = user.role === "administrator" ? "Administrator" : "Cell Leader";
  container.innerHTML = `
    <div class="profile-menu">
      <button class="profile-trigger" id="profile-trigger" aria-haspopup="true" aria-expanded="false">
        <span class="side-avatar" style="width:36px; height:36px; font-size:13px;">${initials(user.name)}</span>
        <span class="profile-trigger-text">
          <span class="u-name" style="color:var(--ink-900); display:block;">${user.name}</span>
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
      if (action === "logout") {
        confirmAction(
          "Are you sure you want to end your current session?",
          logout,
          { title: "Sign out?", confirmLabel: "Sign Out" }
        );
      } else {
        showToast("This isn't available yet.", "success");
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

  btn.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("collapsed");
    try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, isCollapsed ? "1" : "0"); } catch (e) {}
  });
}
document.addEventListener("DOMContentLoaded", initSidebarCollapse);
