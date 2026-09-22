/* ============================================================
   CE CAMPUS — THEME TOGGLE
   The inline snippet in each page's <head> applies the saved
   theme before first paint (see THEME_INIT_SNIPPET below, kept
   here only as a reference copy — it must run inline, not as an
   external file, or the flicker it prevents would still happen).
   This file just wires up the visible toggle button.
   ============================================================ */

const THEME_KEY = "ceCampusTheme";

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
}

function initThemeToggle(buttonId) {
  const btn = document.getElementById(buttonId || "theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  });
}
document.addEventListener("DOMContentLoaded", () => initThemeToggle());

/* Reference copy of the inline snippet placed in every <head>:

<script>
(function () {
  try {
    var saved = localStorage.getItem("ceCampusTheme");
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
</script>

*/
