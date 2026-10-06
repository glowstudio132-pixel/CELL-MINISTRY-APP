/* ============================================================
   CE CAMPUS — DATA LAYER (Supabase)
   All data lives in the Supabase database. This file loads what the
   signed-in person is allowed to see into memory (`demoData`, a plain
   in-memory cache; nothing is written to the browser's storage), and
   every change is saved to Supabase.

   Reads are synchronous (they read the cache). Writes are async and
   throw an Error with a readable message if the database refuses them,
   so pages should `await` them inside try/catch.

   Row Level Security in supabase/schema.sql decides what each person can
   see and change, so a leader never receives another cell's data.
   ============================================================ */

const GROWTH_STAGES = [
  "Joined Cell",
  "Regular Attendee",
  "Active Member",
  "Worker",
  "Cell Volunteer",
  "Cell Leader Candidate"
];

/* Attendance slots. weekday: 0=Sun ... 6=Sat. Leaders meeting has no fixed
   day (the leader picks the date) and only lists members flagged as leaders. */
const ATTENDANCE_SESSIONS = [
  { id: "wednesday", label: "Wednesday", weekday: 3, leadersOnly: false },
  { id: "sunday", label: "Sunday", weekday: 0, leadersOnly: false },
  { id: "prayer", label: "Friday Prayer Meeting", weekday: 5, leadersOnly: false },
  { id: "leaders", label: "Leaders Meeting", weekday: null, leadersOnly: true }
];

const ACTIVITY_CATEGORIES = [
  "Outreach", "Evangelism", "Fellowship", "Prayer",
  "Campus Activity", "Community Service", "Other"
];

const ACTIVITY_PHOTO_LIMIT = 3;
const REPORT_EDIT_WINDOW_MINUTES = 30;

/* ---------- Groups and chapters ----------
   Fixed reference data, built in so pages don't have to fetch it. It must match
   the groups/chapters seeded in supabase/schema.sql (edit both if one ever changes). */
const REFERENCE_GROUPS = [
  { id: "nau", name: "NAU GROUP" },
  { id: "grace", name: "GRACE GROUP" },
  { id: "supernatural", name: "SUPERNATURAL GROUP" },
  { id: "unn", name: "UNN GROUP" },
  { id: "luxuriant", name: "LUXURIANT GROUP" }
];
const REFERENCE_CHAPTERS = [
  { id: "nau-1", groupId: "nau", name: "BLW NAU 1" },
  { id: "nau-2", groupId: "nau", name: "BLW NAU 2" },
  { id: "nau-sopa", groupId: "nau", name: "BLW SOPA" },
  { id: "nau-chs", groupId: "nau", name: "BLW CHS" },
  { id: "grace-uli", groupId: "grace", name: "BLW ULI" },
  { id: "grace-igbariam", groupId: "grace", name: "BLW IGBARIAM" },
  { id: "grace-legacy", groupId: "grace", name: "BLW LEGACY" },
  { id: "grace-umunze", groupId: "grace", name: "BLW UMUNZE" },
  { id: "grace-tansian", groupId: "grace", name: "BLW TANSIAN" },
  { id: "grace-nocen", groupId: "grace", name: "BLW NOCEN" },
  { id: "grace-mti", groupId: "grace", name: "BLW MTI" },
  { id: "grace-grundtvig", groupId: "grace", name: "BLW GRUNDTVIG" },
  { id: "sn-unec", groupId: "supernatural", name: "BLW UNEC" },
  { id: "sn-esut", groupId: "supernatural", name: "BLW ESUT" },
  { id: "sn-parklane", groupId: "supernatural", name: "BLW PARKLANE" },
  { id: "sn-esect", groupId: "supernatural", name: "BLW ESECT" },
  { id: "sn-dental", groupId: "supernatural", name: "BLW DENTAL" },
  { id: "unn-1", groupId: "unn", name: "BLW UNN 1" },
  { id: "unn-2", groupId: "unn", name: "BLW UNN 2" },
  { id: "unn-sumas", groupId: "unn", name: "BLW SUMAS" },
  { id: "unn-maduka", groupId: "unn", name: "BLW MADUKA" },
  { id: "unn-pacesetters", groupId: "unn", name: "BLW PACESETTERS CHURCH NSUKKA" },
  { id: "lux-ebsu", groupId: "luxuriant", name: "BLW EBSU" },
  { id: "lux-funai", groupId: "luxuriant", name: "BLW FUNAI" },
  { id: "lux-dufus", groupId: "luxuriant", name: "BLW DUFUS" },
  { id: "lux-sits", groupId: "luxuriant", name: "BLW SITs" }
];

/* ---------- In-memory cache ---------- */
function emptyData() {
  return { groups: REFERENCE_GROUPS.map(g => ({ ...g })), chapters: REFERENCE_CHAPTERS.map(c => ({ ...c })),
           cells: [], leaders: [], members: [], attendance: [],
           firstTimers: [], offerings: [], activities: [], reports: [] };
}
let demoData = emptyData();
let serverClockOffsetMs = 0; // server time minus this device's time

/* ---------- Errors ---------- */
function dbError(err, fallback) {
  const m = (err && err.message) || "";
  let msg = fallback || m || "Something went wrong. Please try again.";
  if (/row-level security|permission denied|not allowed/i.test(m)) msg = "You don't have permission to do that.";
  else if (/duplicate key|already exists/i.test(m)) msg = "That already exists.";
  else if (/failed to fetch|networkerror|network request/i.test(m)) msg = "Network problem. Check your connection and try again.";
  else if (/jwt expired|not signed in|invalid jwt/i.test(m)) msg = "Your session has expired. Please sign in again.";
  else if (/violates check constraint/i.test(m)) msg = "Some of the details aren't valid. Please check and try again.";
  else if (m && !fallback) msg = m;
  return new Error(msg);
}
function must(result, fallback) {
  if (result.error) throw dbError(result.error, fallback);
  return result.data;
}

/* ---------- Row mappers (database snake_case <-> app camelCase) ---------- */
const mapGroup = r => ({ id: r.id, name: r.name });
const mapChapter = r => ({ id: r.id, groupId: r.group_id, name: r.name });
const mapCell = r => ({
  id: r.id, chapterId: r.chapter_id, groupId: r.group_id, name: r.name,
  meetingDay: r.meeting_day || "", meetingTime: r.meeting_time || "", location: r.location || "",
  status: r.status, leaderId: null, createdAt: r.created_at
});
const mapLeader = r => ({ id: r.id, name: r.full_name || r.email, email: r.email, phone: r.phone || "", cellId: r.cell_id });
const mapMember = r => ({
  id: r.id, cellId: r.cell_id, name: r.name, phone: r.phone || "", email: r.email || "",
  gender: r.gender || "", department: r.department || "", course: r.course || "",
  churchDepartment: r.church_department || "", isLeader: !!r.is_leader,
  joinDate: r.join_date || "", growthStage: r.growth_stage, status: r.status,
  attendanceRate: Number(r.attendance_rate) || 0, notes: r.notes || "", createdAt: r.created_at
});
const mapAttendance = r => ({
  id: r.id, cellId: r.cell_id, date: r.date, session: r.session,
  present: r.present, absent: r.absent, excused: r.excused, visitors: r.visitors,
  total: r.total, marks: r.marks || {}, submittedAt: r.submitted_at
});
const mapFirstTimers = r => ({ id: r.id, cellId: r.cell_id, weekStart: r.week_start, count: r.count, note: r.note || "", submittedAt: r.submitted_at });
const mapOffering = r => ({
  id: r.id, cellId: r.cell_id, date: r.date, meeting: r.meeting || "", type: r.type || "",
  amount: Number(r.amount) || 0, method: r.method || "", recordedBy: r.recorded_by || "",
  notes: r.notes || "", status: r.status
});
const mapActivity = r => ({
  id: r.id, cellId: r.cell_id, name: r.name, category: r.category || "Other", date: r.date,
  location: r.location || "", participants: r.participants || 0,
  description: r.description || "", notes: r.notes || "", photos: []
});
const mapReport = r => ({
  id: r.id, cellId: r.cell_id, weekOf: r.week_of, attendance: r.attendance,
  offering: Number(r.offering) || 0, newMembers: r.new_members, visitors: r.visitors,
  activities: r.activities, notes: r.notes || "", status: r.status,
  submittedAt: r.submitted_at, editedAt: r.edited_at
});

/* ---------- Loading ---------- */
/* Reads a whole table, a page at a time (the API returns at most 1000 rows per request). */
async function fetchAll(table, columns, orderCol, filterFn) {
  const sb = getSupabase();
  const size = 1000;
  let from = 0, rows = [];
  for (;;) {
    let q = sb.from(table).select(columns || "*");
    if (filterFn) q = filterFn(q);
    q = q.order(orderCol || "id", { ascending: true });
    if (orderCol && orderCol !== "id") q = q.order("id", { ascending: true });
    const { data, error } = await q.range(from, from + size - 1);
    if (error) throw dbError(error, "Could not load " + table + ".");
    rows = rows.concat(data);
    if (data.length < size) break;
    from += size;
  }
  return rows;
}

/* Kept so older callers still work: groups and chapters are built in now. */
async function loadReferenceData() {
  demoData.groups = REFERENCE_GROUPS.map(g => ({ ...g }));
  demoData.chapters = REFERENCE_CHAPTERS.map(c => ({ ...c }));
}

async function loadActivityPhotos(activities) {
  const byId = Object.fromEntries(activities.map(a => [a.id, a]));
  const rows = await fetchAll("activity_photos", "*", "uploaded_at");
  const items = rows.filter(r => byId[r.activity_id]);
  if (!items.length) return;
  const urls = {};
  const chunks = [];
  for (let i = 0; i < items.length; i += 100) chunks.push(items.slice(i, i + 100).map(r => r.path));
  await Promise.all(chunks.map(async chunk => {
    const { data } = await getSupabase().storage.from("activity-photos").createSignedUrls(chunk, 3600);
    (data || []).forEach(d => { if (d && d.signedUrl) urls[d.path] = d.signedUrl; });
  }));
  items.forEach(r => {
    if (!urls[r.path]) return;
    byId[r.activity_id].photos.push({ id: r.id, path: r.path, src: urls[r.path], uploadedAt: r.uploaded_at });
  });
}

/* Which data sets a page loads. Cells and leaders are always loaded (they are small
   and every page needs names); the rest are loaded only when a page asks for them,
   which is what keeps page changes quick. */
const ALL_DATASETS = ["members", "attendance", "firstTimers", "offerings", "activities", "photos", "reports", "clock"];
const loadedSets = new Set(["cells", "leaders"]);
const warnedSets = new Set();
function needData(name) {
  if (loadedSets.size > 2 && !loadedSets.has(name) && !warnedSets.has(name)) {
    warnedSets.add(name);
    console.warn("[CE] '" + name + "' was read on a page that did not ask for it, so it is empty. Add '" + name + "' to that page's bootPage needs.");
  }
}

/* Loads what this person is allowed to see. needs = list of dataset names (default: everything).
   Everything is fetched in parallel. Called once per page by bootPage(). */
async function initData(needs) {
  const sb = getSupabase();
  const want = new Set(Array.isArray(needs) ? needs : ALL_DATASETS);
  if (want.has("photos")) want.add("activities");
  const t0 = Date.now();
  const job = (set, table, cols, order, filter) => want.has(set) ? fetchAll(table, cols, order, filter) : Promise.resolve([]);

  const [clock, cells, leaders, members, attendance, firstTimers, offerings, activities, reports] = await Promise.all([
    want.has("clock") ? sb.rpc("server_now") : Promise.resolve(null),
    fetchAll("cells", "*", "created_at"),
    fetchAll("profiles", "id,email,full_name,phone,cell_id", "created_at", q => q.eq("role", "cell_leader")),
    job("members", "members", "*", "created_at"),
    job("attendance", "attendance", "*", "date"),
    job("firstTimers", "first_timers", "*", "week_start"),
    job("offerings", "offerings", "*", "date"),
    job("activities", "activities", "*", "date"),
    job("reports", "reports", "*", "submitted_at")
  ]);
  if (clock && clock.data) serverClockOffsetMs = new Date(clock.data).getTime() - (t0 + Date.now()) / 2;

  demoData.cells = cells.map(mapCell);
  demoData.leaders = leaders.map(mapLeader);
  demoData.cells.forEach(c => { const l = demoData.leaders.find(x => x.cellId === c.id); c.leaderId = l ? l.id : null; });
  demoData.members = members.map(mapMember);
  demoData.attendance = attendance.map(mapAttendance);
  demoData.firstTimers = firstTimers.map(mapFirstTimers);
  demoData.offerings = offerings.map(mapOffering);
  demoData.activities = activities.map(mapActivity);
  demoData.reports = reports.map(mapReport).reverse(); // newest first
  if (want.has("photos")) await loadActivityPhotos(demoData.activities);
  want.forEach(n => loadedSets.add(n));
}

/* ---------- Read functions ---------- */
function getGroups() { return demoData.groups; }
function getGroupById(id) { return demoData.groups.find(g => g.id === id) || null; }
function getChapters(groupId) { return groupId ? demoData.chapters.filter(c => c.groupId === groupId) : demoData.chapters; }
function getChapterById(id) { return demoData.chapters.find(c => c.id === id) || null; }
function getCells(chapterId) { return chapterId ? demoData.cells.filter(c => c.chapterId === chapterId) : demoData.cells; }
function getCellById(cellId) { return demoData.cells.find(c => c.id === cellId) || null; }
function getLeaders() { return demoData.leaders; }
function getLeaderById(id) { return demoData.leaders.find(l => l.id === id) || null; }
function getMembers(cellId) { needData("members"); return cellId ? demoData.members.filter(m => m.cellId === cellId) : demoData.members; }
function getMemberById(id) { return demoData.members.find(m => m.id === id) || null; }
function getAttendance(cellId) { needData("attendance"); return (cellId ? demoData.attendance.filter(a => a.cellId === cellId) : demoData.attendance).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getOfferings(cellId) { needData("offerings"); return (cellId ? demoData.offerings.filter(o => o.cellId === cellId) : demoData.offerings).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getActivities(cellId) { needData("activities"); return (cellId ? demoData.activities.filter(a => a.cellId === cellId) : demoData.activities).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getActivityById(id) { return demoData.activities.find(a => a.id === id) || null; }
function getReports(cellId) { needData("reports"); return cellId ? demoData.reports.filter(r => r.cellId === cellId) : demoData.reports; }

/* ---------- Derived / computed ---------- */
/* ---------- Derived / computed ---------- */
function getCellStrength(cellId) { return getMembers(cellId).filter(m => m.status === "Active").length; }

/* Leaders-meeting records have a different denominator, so the cell's
   attendance rate and "latest attendance" only use regular sessions. */
function isRegularSession(a) { return a.session !== "leaders"; }

function getLatestAttendance(cellId) {
  const list = getAttendance(cellId).filter(isRegularSession);
  return list.length ? list[0] : null;
}

/* Rate for the most recent week that has regular attendance (all of that
   week's regular sessions combined). */
function getAttendanceRate(cellId) {
  const latest = getLatestAttendance(cellId);
  if (!latest) return 0;
  const wk = getWeekStart(latest.date);
  const rows = getAttendance(cellId).filter(a => isRegularSession(a) && getWeekStart(a.date) === wk);
  const present = rows.reduce((t, a) => t + (a.present || 0), 0);
  const total = rows.reduce((t, a) => t + (a.total || 0), 0);
  return total ? Math.round((present / total) * 1000) / 10 : 0;
}

function getCellForLeader(leaderId) {
  const leader = getLeaderById(leaderId);
  return leader ? getCellById(leader.cellId) : null;
}

/* Chapter-level counts, used on the Admin Group detail page. */
function getChapterStats(chapterId) {
  const cells = getCells(chapterId);
  const cellIds = cells.map(c => c.id);
  const leaderCount = demoData.leaders.filter(l => cellIds.includes(l.cellId)).length;
  const memberCount = demoData.members.filter(m => cellIds.includes(m.cellId) && m.status === "Active").length;
  return { cellCount: cells.length, leaderCount, memberCount };
}

/* Group-level counts, used on the Admin Groups overview cards. */
function getGroupStats(groupId) {
  const chapters = getChapters(groupId);
  const chapterIds = chapters.map(c => c.id);
  const cells = demoData.cells.filter(c => chapterIds.includes(c.chapterId));
  const cellIds = cells.map(c => c.id);
  const memberCount = demoData.members.filter(m => cellIds.includes(m.cellId) && m.status === "Active").length;
  const reportsSubmitted = demoData.reports.filter(r => cellIds.includes(r.cellId) && (r.status === "Submitted" || r.status === "Reviewed")).length;
  const cellsWithAttendance = cells.filter(c => getLatestAttendance(c.id));
  const avgAttendance = cellsWithAttendance.length
    ? Math.round(cellsWithAttendance.reduce((sum, c) => sum + getAttendanceRate(c.id), 0) / cellsWithAttendance.length * 10) / 10
    : 0;
  return {
    chapterCount: chapters.length,
    cellCount: cells.length,
    memberCount,
    avgAttendance,
    reportsSubmitted
  };
}

/* ---------- Week / date helpers (local time, Monday-start weeks) ---------- */
/* ---------- Week / date helpers (local time, Monday-start weeks) ---------- */
function localISODate(d) {
  const x = d || new Date();
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}

function parseISODate(str) { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }

function addDaysISO(str, n) { const d = parseISODate(str); d.setDate(d.getDate() + n); return localISODate(d); }

function getWeekStart(str) { const d = parseISODate(str); const back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back); return localISODate(d); }

function getSessionDate(weekStart, sessionId) {
  const s = ATTENDANCE_SESSIONS.find(x => x.id === sessionId);
  if (!s || s.weekday === null) return null;
  return addDaysISO(weekStart, (s.weekday + 6) % 7);
}

/* ---------- Attendance by session / week ---------- */
/* ---------- Attendance by session / week ---------- */
function getAttendanceRecord(cellId, date, session) {
  return demoData.attendance.find(a => a.cellId === cellId && a.date === date && (a.session || "") === session) || null;
}

function getAttendanceForWeek(cellId, weekStart) {
  const end = addDaysISO(weekStart, 6);
  return getAttendance(cellId).filter(a => a.date >= weekStart && a.date <= end);
}

/* ---------- First timers (one number per cell per week) ---------- */
/* ---------- First timers (one number per cell per week) ---------- */
function getFirstTimers(cellId) {
  return (cellId ? demoData.firstTimers.filter(f => f.cellId === cellId) : demoData.firstTimers)
    .sort((a, b) => (b.weekStart > a.weekStart ? 1 : -1));
}

function getFirstTimersForWeek(cellId, weekStart) {
  return demoData.firstTimers.find(f => f.cellId === cellId && f.weekStart === weekStart) || null;
}

/* ---------- Weekly trend series (used by both Growth pages) ----------
   cellIds: array of cell ids. Returns one point per week, oldest first:
   { weekStart, label, members, firstTimers, offerings, attendanceRate, present }
   - members: active members who had joined by the end of that week
   - attendanceRate: null when no regular attendance was recorded that week */
/* ---------- Weekly trend series (used by both Growth pages) ----------
   cellIds: array of cell ids. Returns one point per week, oldest first:
   { weekStart, label, members, firstTimers, offerings, attendanceRate, present }
   - members: active members who had joined by the end of that week
   - firstTimers: the weekly submission (falls back to older per-meeting counts)
   - attendanceRate: null when no regular attendance was recorded that week */
function memberJoinedISO(m) {
  if (m.joinDate && /^\d{4}-\d{2}-\d{2}/.test(m.joinDate)) return m.joinDate.slice(0, 10);
  if (m.createdAt) return m.createdAt.slice(0, 10);
  const t = parseInt(String(m.id || "").replace(/^m_/, ""), 36);
  return t && t > 1e11 ? localISODate(new Date(t)) : null;
}

function getWeeklySeries(cellIds, weeks) {
  const ids = new Set(cellIds);
  const n = weeks || 8;
  const thisWeek = getWeekStart(localISODate());
  const members = demoData.members.filter(m => ids.has(m.cellId) && m.status === "Active");
  const att = demoData.attendance.filter(a => ids.has(a.cellId));
  const ft = demoData.firstTimers.filter(f => ids.has(f.cellId));
  const off = demoData.offerings.filter(o => ids.has(o.cellId));
  const series = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = addDaysISO(thisWeek, -7 * i), we = addDaysISO(ws, 6);
    const inWeek = d => d >= ws && d <= we;
    const regular = att.filter(a => inWeek(a.date) && isRegularSession(a));
    const present = regular.reduce((t, a) => t + (a.present || 0), 0);
    const total = regular.reduce((t, a) => t + (a.total || 0), 0);
    let firstTimers = ft.filter(f => f.weekStart === ws).reduce((t, f) => t + (f.count || 0), 0);
    // Older per-meeting counts only count for cells with no weekly submission
    ids.forEach(cid => {
      if (!ft.some(f => f.cellId === cid && f.weekStart === ws)) {
        firstTimers += att.filter(a => a.cellId === cid && inWeek(a.date)).reduce((t, a) => t + (a.firstTimers || 0), 0);
      }
    });
    series.push({
      weekStart: ws,
      label: formatDate(ws, { day: "numeric", month: "short" }),
      members: members.filter(m => { const j = memberJoinedISO(m); return !j || j <= we; }).length,
      firstTimers,
      offerings: off.filter(o => inWeek(o.date)).reduce((t, o) => t + (o.amount || 0), 0),
      attendanceRate: total ? Math.round((present / total) * 1000) / 10 : null,
      present
    });
  }
  return series;
}

/* ---------- Report edit window ----------
   A leader may correct a report for 30 minutes after submitting it, while it
   is still "Submitted". The database enforces this; these helpers drive the UI. */
function getReportEditDeadline(r) {
  if (!r || !r.submittedAt) return null;
  return new Date(new Date(r.submittedAt).getTime() + REPORT_EDIT_WINDOW_MINUTES * 60000);
}
function serverNow() { return Date.now() + serverClockOffsetMs; }
function getReportEditMinutesLeft(r) {
  const dl = getReportEditDeadline(r);
  if (!dl || r.status !== "Submitted") return 0;
  return Math.max(0, Math.ceil((dl.getTime() - serverNow()) / 60000));
}
function canEditReport(r) { return getReportEditMinutesLeft(r) > 0; }


/* ---------- Write functions (save to Supabase, then update the cache) ---------- */
const nz = v => (v === undefined ? null : v);

async function addCell(cell) {
  const row = must(await getSupabase().from("cells").insert({
    chapter_id: cell.chapterId, name: cell.name, meeting_day: cell.meetingDay || null,
    meeting_time: cell.meetingTime || null, location: cell.location || null
  }).select().single(), "Could not add the cell.");
  const c = mapCell(row);
  demoData.cells.push(c);
  return c;
}

async function updateCell(id, changes) {
  const map = { name: "name", meetingDay: "meeting_day", meetingTime: "meeting_time", location: "location", status: "status" };
  const patch = {};
  Object.keys(changes).forEach(k => { if (map[k]) patch[map[k]] = changes[k] === "" && k !== "name" ? null : changes[k]; });
  const { data, error } = await getSupabase().from("cells").update(patch).eq("id", id).select();
  if (error) throw dbError(error, "Could not update the cell.");
  if (!data || !data.length) throw new Error("You don't have permission to change this cell.");
  const cell = getCellById(id);
  const fresh = mapCell(data[0]);
  if (cell) Object.assign(cell, fresh, { leaderId: cell.leaderId });
  return cell || fresh;
}

function toDbMember(d) {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };
  set("cell_id", d.cellId); set("name", d.name); set("phone", d.phone); set("email", d.email);
  set("gender", d.gender); set("department", d.department); set("course", d.course);
  set("church_department", d.churchDepartment); set("is_leader", d.isLeader);
  if (d.joinDate !== undefined) row.join_date = d.joinDate || null;
  set("growth_stage", d.growthStage); set("status", d.status); set("notes", d.notes);
  return row;
}
async function addMember(member) {
  const row = must(await getSupabase().from("members").insert(toDbMember(member)).select().single(), "Could not add the member.");
  const m = mapMember(row);
  demoData.members.push(m);
  return m;
}
async function updateMember(id, changes) {
  const patch = toDbMember(changes); delete patch.cell_id;
  const { data, error } = await getSupabase().from("members").update(patch).eq("id", id).select();
  if (error) throw dbError(error, "Could not update the member.");
  if (!data || !data.length) throw new Error("You don't have permission to change this member.");
  const m = getMemberById(id), fresh = mapMember(data[0]);
  if (m) Object.assign(m, fresh);
  return m || fresh;
}

/* Create or update (by cell + date + session) so re-submitting a day edits it. */
async function saveAttendanceRecord(entry) {
  const row = must(await getSupabase().from("attendance").upsert({
    cell_id: entry.cellId, date: entry.date, session: entry.session,
    present: entry.present, absent: entry.absent, excused: entry.excused,
    visitors: entry.visitors || 0, total: entry.total, marks: entry.marks || {}
  }, { onConflict: "cell_id,date,session" }).select().single(), "Could not save attendance.");
  const rec = mapAttendance(row);
  const i = demoData.attendance.findIndex(a => a.id === rec.id);
  if (i >= 0) demoData.attendance[i] = rec; else demoData.attendance.push(rec);
  return rec;
}

async function saveFirstTimers(entry) {
  const row = must(await getSupabase().from("first_timers").upsert({
    cell_id: entry.cellId, week_start: entry.weekStart, count: entry.count, note: entry.note || null
  }, { onConflict: "cell_id,week_start" }).select().single(), "Could not save first timers.");
  const rec = mapFirstTimers(row);
  const i = demoData.firstTimers.findIndex(f => f.id === rec.id);
  if (i >= 0) demoData.firstTimers[i] = rec; else demoData.firstTimers.push(rec);
  return rec;
}

async function recordOffering(entry) {
  const row = must(await getSupabase().from("offerings").insert({
    cell_id: entry.cellId, date: entry.date, meeting: nz(entry.meeting), type: nz(entry.type),
    amount: entry.amount, method: nz(entry.method), recorded_by: nz(entry.recordedBy), notes: nz(entry.notes)
  }).select().single(), "Could not record the offering.");
  const o = mapOffering(row);
  demoData.offerings.push(o);
  return o;
}

async function createActivity(entry) {
  const row = must(await getSupabase().from("activities").insert({
    cell_id: entry.cellId, name: entry.name, category: nz(entry.category), date: entry.date,
    location: nz(entry.location), participants: entry.participants || 0,
    description: nz(entry.description), notes: nz(entry.notes)
  }).select().single(), "Could not save the activity.");
  const a = mapActivity(row);
  demoData.activities.push(a);
  return a;
}

/* ---------- Activity photos (up to 3 per activity) ----------
   photos: array of image data URLs. Files go to the private "activity-photos"
   bucket; returns { ok, error?, activity? } (never throws). */
async function addActivityPhotos(id, photos) {
  const a = getActivityById(id);
  if (!a) return { ok: false, error: "Activity not found." };
  if (a.photos.length + photos.length > ACTIVITY_PHOTO_LIMIT) return { ok: false, error: "An activity can have at most " + ACTIVITY_PHOTO_LIMIT + " photos." };
  const sb = getSupabase();
  const done = [];   // uploaded paths, so we can clean up if something fails
  try {
    for (const src of photos) {
      const blob = await dataUrlToBlob(src);
      const path = a.cellId + "/" + a.id + "/" + newUUID() + ".jpg";
      const up = await sb.storage.from("activity-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw dbError(up.error, "Could not upload a photo.");
      done.push(path);
      const row = must(await sb.from("activity_photos").insert({ activity_id: a.id, cell_id: a.cellId, path }).select().single(), "Could not save a photo.");
      const signed = await sb.storage.from("activity-photos").createSignedUrl(path, 3600);
      a.photos.push({ id: row.id, path, src: signed.data ? signed.data.signedUrl : src, uploadedAt: row.uploaded_at });
    }
    return { ok: true, activity: a };
  } catch (err) {
    const saved = new Set(a.photos.map(p => p.path));
    const orphans = done.filter(p => !saved.has(p));
    if (orphans.length) await sb.storage.from("activity-photos").remove(orphans);
    return { ok: false, error: err.message || "Could not upload the photos." };
  }
}

async function removeActivityPhoto(id, index) {
  const a = getActivityById(id);
  const p = a && a.photos[index];
  if (!p) return false;
  const sb = getSupabase();
  const { error } = await sb.from("activity_photos").delete().eq("id", p.id);
  if (error) throw dbError(error, "Could not remove the photo.");
  await sb.storage.from("activity-photos").remove([p.path]);
  a.photos.splice(index, 1);
  return true;
}

/* ---------- Reports ---------- */
async function submitReport(entry) {
  const row = must(await getSupabase().from("reports").insert({
    cell_id: entry.cellId, week_of: entry.weekOf, attendance: entry.attendance || 0,
    offering: entry.offering || 0, new_members: entry.newMembers || 0,
    visitors: entry.visitors || 0, activities: entry.activities || 0, notes: nz(entry.notes)
  }).select().single(), "Could not submit the report.");
  const r = mapReport(row);
  demoData.reports.unshift(r);
  return r;
}

/* Returns the updated report, or null if the 30-minute window has closed. */
async function editReport(id, changes) {
  const patch = {};
  const map = { weekOf: "week_of", attendance: "attendance", offering: "offering", newMembers: "new_members", visitors: "visitors", activities: "activities", notes: "notes" };
  Object.keys(map).forEach(k => { if (k in changes) patch[map[k]] = changes[k]; });
  const { data, error } = await getSupabase().from("reports").update(patch).eq("id", id).select();
  if (error) throw dbError(error, "Could not update the report.");
  if (!data || !data.length) return null;           // the database refused: window closed or already reviewed
  const r = demoData.reports.find(x => x.id === id), fresh = mapReport(data[0]);
  if (r) Object.assign(r, fresh);
  return r || fresh;
}

/* Administrators: mark a report Reviewed. */
async function updateReport(id, changes) {
  if (changes.status !== "Reviewed") throw new Error("Only marking a report as Reviewed is supported.");
  must(await getSupabase().rpc("review_report", { p_report_id: id }), "Could not mark the report as reviewed.");
  const r = demoData.reports.find(x => x.id === id);
  if (r) r.status = "Reviewed";
  return r;
}

/* ---------- Cell leader sets up their cell (e.g. after Google sign-in) ---------- */
async function setupLeaderCell(chapterId, cellName, phone) {
  return must(await getSupabase().rpc("setup_leader_cell", { p_chapter_id: chapterId, p_cell_name: cellName, p_phone: phone || null }), "Could not set up your cell.");
}
