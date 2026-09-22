/* ============================================================
   CE CAMPUS — LANDING PAGE APP LOGIC
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => menu.classList.toggle("open"));
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  // Animate stat counters once visible
  const statEls = document.querySelectorAll("[data-count]");
  if (statEls.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute("data-count"));
          const suffix = el.getAttribute("data-suffix") || "";
          animateCount(el, target, { suffix, duration: 1100 });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    statEls.forEach(el => observer.observe(el));
  }
});
