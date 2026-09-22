/* ============================================================
   CE CAMPUS — CHART HELPERS
   Thin wrappers around Chart.js so every chart in the app shares
   the same minimal, restrained styling.
   ============================================================ */

const CHART_COLORS = {
  royal: "#3346d6",
  violet: "#7c6fe0",
  gold: "#c9962f",
  success: "#1c9a6c",
  grid: "#eef0f8",
  text: "#8b90ab"
};

Chart.defaults.font.family = "Inter, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = CHART_COLORS.text;

function renderLineChart(canvasId, labels, values, opts) {
  opts = opts || {};
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(51, 70, 214, 0.18)");
  gradient.addColorStop(1, "rgba(51, 70, 214, 0)");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: opts.label || "Attendance",
        data: values,
        borderColor: CHART_COLORS.royal,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: "#fff",
        pointBorderColor: CHART_COLORS.royal,
        pointBorderWidth: 2,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { grid: { color: CHART_COLORS.grid }, border: { display: false }, beginAtZero: true }
      }
    }
  });
}

function renderDonutChart(canvasId, labels, values, colors) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 8, usePointStyle: true, pointStyle: "circle" } } }
    }
  });
}

function renderBarChart(canvasId, labels, values, opts) {
  opts = opts || {};
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: opts.label || "",
        data: values,
        backgroundColor: opts.color || CHART_COLORS.violet,
        borderRadius: 6,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { grid: { color: CHART_COLORS.grid }, border: { display: false }, beginAtZero: true }
      }
    }
  });
}
