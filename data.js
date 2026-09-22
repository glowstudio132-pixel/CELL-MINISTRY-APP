/* ============================================================
   CE CAMPUS — DATA LAYER
   All data lives here. Every page reads/writes through the
   functions below, never by touching demoData directly. When a
   real backend arrives, only this file should need to change —
   swap each function body for an API call and keep the same
   function signatures.

   Groups and Chapters below are the actual ministry structure
   as supplied. Cells, Cell Leaders and Members have not been
   supplied yet, so those start empty — pages should render
   proper empty states for them rather than invented data.
   ============================================================ */

const STORAGE_KEY = "ceCampusData_v2";

const GROWTH_STAGES = [
  "Joined Cell",
  "Regular Attendee",
  "Active Member",
  "Worker",
  "Cell Volunteer",
  "Cell Leader Candidate"
];

const ACTIVITY_CATEGORIES = [
  "Outreach", "Evangelism", "Fellowship", "Prayer",
  "Campus Activity", "Community Service", "Other"
];

function seedData() {
  return {
    groups: [
      { id: "nau", name: "NAU GROUP" },
      { id: "grace", name: "GRACE GROUP" },
      { id: "supernatural", name: "SUPERNATURAL GROUP" },
      { id: "unn", name: "UNN GROUP" },
      { id: "luxuriant", name: "LUXURIANT GROUP" }
    ],
    chapters: [
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
    ],

    /* Not yet supplied — start empty. Pages should show empty
       states ("No cells have been added yet") rather than
       inventing placeholder records. */
    cells: [],
    leaders: [],
    members: [],
    attendance: [],
    offerings: [],
    activities: [],
    reports: [],

    /* Accounts created through the registration page (frontend-only demo). */
    registeredAccounts: []
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to reseed */ }
  const seeded = seedData();
  saveData(seeded);
  return seeded;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.warn("Could not persist data:", e); }
}

let demoData = loadData();

function resetData() {
  demoData = seedData();
  saveData(demoData);
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
function getLeaderByEmail(email) { return demoData.leaders.find(l => l.email.toLowerCase() === email.toLowerCase()) || null; }
function getMembers(cellId) { return cellId ? demoData.members.filter(m => m.cellId === cellId) : demoData.members; }
function getMemberById(id) { return demoData.members.find(m => m.id === id) || null; }
function getAttendance(cellId) { return (cellId ? demoData.attendance.filter(a => a.cellId === cellId) : demoData.attendance).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getOfferings(cellId) { return (cellId ? demoData.offerings.filter(o => o.cellId === cellId) : demoData.offerings).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getActivities(cellId) { return (cellId ? demoData.activities.filter(a => a.cellId === cellId) : demoData.activities).sort((a, b) => new Date(b.date) - new Date(a.date)); }
function getReports(cellId) { return cellId ? demoData.reports.filter(r => r.cellId === cellId) : demoData.reports; }

/* ---------- Derived / computed ---------- */
function getCellStrength(cellId) { return getMembers(cellId).filter(m => m.status === "Active").length; }
function getLatestAttendance(cellId) { const list = getAttendance(cellId); return list.length ? list[0] : null; }
function getAttendanceRate(cellId) {
  const latest = getLatestAttendance(cellId);
  if (!latest || !latest.total) return 0;
  return Math.round((latest.present / latest.total) * 1000) / 10;
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

/* ---------- Write functions (mutate + persist) ---------- */
function addCell(cell) {
  const id = "cell_" + Date.now().toString(36);
  const record = Object.assign({ id, status: "Active" }, cell);
  demoData.cells.push(record);
  saveData(demoData);
  return record;
}

function addLeader(leader) {
  const id = "leader_" + Date.now().toString(36);
  const record = Object.assign({ id }, leader);
  demoData.leaders.push(record);
  saveData(demoData);
  return record;
}

function addMember(member) {
  const id = "m_" + Date.now().toString(36);
  const record = Object.assign({
    id, status: "Active", growthStage: "Joined Cell", attendanceRate: 0
  }, member);
  demoData.members.push(record);
  saveData(demoData);
  return record;
}

function updateMember(id, changes) {
  const m = getMemberById(id);
  if (!m) return null;
  Object.assign(m, changes);
  saveData(demoData);
  return m;
}

function recordAttendance(entry) {
  const id = "a_" + Date.now().toString(36);
  const record = Object.assign({ id }, entry);
  demoData.attendance.unshift(record);
  saveData(demoData);
  return record;
}

function recordOffering(entry) {
  const id = "o_" + Date.now().toString(36);
  const record = Object.assign({ id, status: "Recorded" }, entry);
  demoData.offerings.unshift(record);
  saveData(demoData);
  return record;
}

function createActivity(entry) {
  const id = "act_" + Date.now().toString(36);
  const record = Object.assign({ id }, entry);
  demoData.activities.unshift(record);
  saveData(demoData);
  return record;
}

function submitReport(entry) {
  const id = "r_" + Date.now().toString(36);
  const record = Object.assign({ id, status: "Submitted" }, entry);
  demoData.reports.unshift(record);
  saveData(demoData);
  return record;
}

/* ---------- Registration (frontend-only demo accounts) ---------- */
function findRegisteredAccount(email) {
  return demoData.registeredAccounts.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
}

function registerAccount(account) {
  const id = "user_" + Date.now().toString(36);
  const record = Object.assign({ id }, account);
  demoData.registeredAccounts.push(record);
  saveData(demoData);
  return record;
}
