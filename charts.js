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

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + alpha + ")";
}

/* opts: label, color (hex), max (y-axis cap), spanGaps, format(value) for ticks/tooltips */
function renderLineChart(canvasId, labels, values, opts) {
  opts = opts || {};
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();
  const color = opts.color || CHART_COLORS.royal;
  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, hexToRgba(color, 0.18));
  gradient.addColorStop(1, hexToRgba(color, 0));
  const fmt = opts.format || (v => v);

  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: opts.label || "Attendance",
        data: values,
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: "#fff",
        pointBorderColor: color,
        spanGaps: !!opts.spanGaps,
        pointBorderWidth: 2,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => " " + (c.parsed.y == null ? "No data" : fmt(c.parsed.y)) } }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { grid: { color: CHART_COLORS.grid }, border: { display: false }, beginAtZero: true,
             max: opts.max, ticks: { callback: v => fmt(v), precision: 0 } }
      }
    }
  });
}

/* Draws the four Growth trends (members, first timers, offerings, attendance
   rate) from getWeeklySeries(). ids = { members, firstTimers, offerings, rate } canvas ids. */
function renderGrowthTrends(series, ids) {
  const labels = series.map(p => p.label);
  const money = v => "₦" + Number(v).toLocaleString("en-NG");
  renderLineChart(ids.members, labels, series.map(p => p.members), { label: "Members", color: CHART_COLORS.royal });
  renderLineChart(ids.firstTimers, labels, series.map(p => p.firstTimers), { label: "First timers", color: CHART_COLORS.violet });
  renderLineChart(ids.offerings, labels, series.map(p => p.offerings), { label: "Offerings", color: CHART_COLORS.success, format: money });
  renderLineChart(ids.rate, labels, series.map(p => p.attendanceRate), { label: "Attendance rate", color: CHART_COLORS.gold, max: 100, spanGaps: true, format: v => v + "%" });
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
