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

/* Escape user-entered text before putting it into innerHTML. */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Reads an image file, centre-crops it to a square and shrinks it to a small
   JPEG data URL (so it is cheap to store). Resolves with the data URL. */
function readProfilePhoto(file, size) {
  size = size || 256;
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("Please choose an image file.")); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error("That image is too large. Please pick one under 8 MB.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a usable image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Reads an image file and shrinks it (aspect ratio kept) to a JPEG data URL
   whose longest side is at most maxDim. Keeps stored photos small. */
function readImageResized(file, maxDim, quality) {
  maxDim = maxDim || 960; quality = quality || 0.72;
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("Please choose image files only.")); return; }
    if (file.size > 12 * 1024 * 1024) { reject(new Error("An image is too large. Please pick ones under 12 MB.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("One of those files isn't a usable image."));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Turns a data: URL (from readProfilePhoto / readImageResized) into a Blob for upload. */
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/* RFC4122-style id for file names (falls back when crypto.randomUUID is unavailable). */
function newUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
