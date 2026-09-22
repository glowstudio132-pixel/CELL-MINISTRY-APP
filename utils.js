/* ============================================================
   CE CAMPUS — UTILITIES
   Formatting helpers + toast/modal engine used across all pages.
   ============================================================ */

function formatNaira(amount) {
  return "₦" + Number(amount || 0).toLocaleString("en-NG");
}

function formatDate(dateStr, opts) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", opts || { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return days + " days ago";
  return formatDate(dateStr);
}

function initials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

function statusBadgeClass(status) {
  const map = {
    "Active": "badge-active", "Reviewed": "badge-active", "Recorded": "badge-active",
    "Needs Attention": "badge-attention", "Pending": "badge-attention", "Pending Report": "badge-attention", "Submitted": "badge-pending",
    "Inactive": "badge-inactive"
  };
  return map[status] || "badge-pending";
}

/* ---------- Toasts ---------- */
function ensureToastStack() {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type) {
  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "success");
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

/* ---------- Modal helpers ---------- */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}
document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("modal-overlay")) {
    e.target.classList.add("hidden");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(m => m.classList.add("hidden"));
  }
});

/* ---------- Mobile nav toggles (shared shell) ---------- */
function initAppShellToggles() {
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  if (menuToggle && sidebar && overlay) {
    const openDrawer = () => {
      sidebar.classList.add("open");
      overlay.classList.add("show");
      document.body.classList.add("no-scroll");
    };
    const closeDrawer = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
      document.body.classList.remove("no-scroll");
    };
    menuToggle.addEventListener("click", openDrawer);
    overlay.addEventListener("click", closeDrawer);
    sidebar.querySelectorAll(".side-link").forEach(link => link.addEventListener("click", closeDrawer));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }
}
document.addEventListener("DOMContentLoaded", initAppShellToggles);

/* ---------- Simple number count-up ---------- */
function animateCount(el, target, opts) {
  opts = opts || {};
  const duration = opts.duration || 900;
  const decimals = opts.decimals || 0;
  const prefix = opts.prefix || "";
  const suffix = opts.suffix || "";
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * eased;
    el.textContent = prefix + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
