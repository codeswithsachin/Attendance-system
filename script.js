/* ================================================================
   ATTENDLY v2.0  |  Built by Sachin (@nyxsachin)
   script.js — full application logic
   ================================================================ */

/* ── 1. State & storage ─────────────────────────────────────────── */
const KEY = "attendly_v2";

const DEFAULTS = {
  students: [],
  classes: [{ id: "cs", name: "Computer Science", code: "CS-101", emoji: "💻" }],
  attendance: {},
  settings: { school: "Apex College", teacher: "Admin", credit: "Sachin", theme: "light", threshold: 75 }
};

let S = JSON.parse(localStorage.getItem(KEY) || "null") || clone(DEFAULTS);
let role = "teacher";
let currentStudentId = null;

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function save()    { localStorage.setItem(KEY, JSON.stringify(S)); }

/* ── 2. DOM helpers ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const Q = s  => document.querySelector(s);
const QQ = s => document.querySelectorAll(s);

/* ── 3. Utility ─────────────────────────────────────────────────── */
const today = () => {
  const d = new Date(), o = d.getTimezoneOffset();
  return new Date(d - o * 60000).toISOString().slice(0, 10);
};
const fmt      = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const fmtShort = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const dayAbbr  = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
const initials = n => (n || "?").split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
const esc      = v => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const uuid     = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();

const AVA_COLORS = [
  ["#ede9ff","#6c5ce7"], ["#d4f5ec","#00b894"], ["#fdecea","#e17055"],
  ["#fff4d6","#f0a500"], ["#ddf0ff","#0984e3"], ["#fce4f3","#d63184"],
  ["#e8fff3","#00a86b"], ["#fff3e0","#ff8c00"], ["#e3f2fd","#1565c0"],
  ["#f3e5f5","#9c27b0"]
];
const avaColor = name => {
  let h = 0;
  for (const c of (name || "A")) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVA_COLORS[Math.abs(h) % AVA_COLORS.length];
};

function getDay(d) {
  if (!S.attendance[d]) S.attendance[d] = {};
  return S.attendance[d];
}

function recordedDates() {
  return Object.keys(S.attendance)
    .filter(d => Object.values(S.attendance[d]).some(Boolean))
    .sort().reverse();
}

function rate(id) {
  let p = 0, m = 0;
  for (const x of Object.values(S.attendance)) {
    const v = x[id];
    if (v === "present" || v === "late") { p++; m++; }
    else if (v === "absent") m++;
  }
  return m ? Math.round(p / m * 100) : 0;
}

function counts(id) {
  let present = 0, absent = 0, late = 0, leave = 0;
  for (const x of Object.values(S.attendance)) {
    if (x[id] === "present") present++;
    else if (x[id] === "absent") absent++;
    else if (x[id] === "late") late++;
    else if (x[id] === "leave") leave++;
  }
  return { present, absent, late, leave };
}

function rateClass(cid) {
  const ids = S.students.filter(s => (s.classId || "cs") === cid).map(s => s.id);
  let p = 0, m = 0;
  for (const x of Object.values(S.attendance)) {
    for (const id of ids) {
      const v = x[id];
      if (v === "present" || v === "late") { p++; m++; }
      else if (v === "absent") m++;
    }
  }
  return m ? Math.round(p / m * 100) : 0;
}

function rateLabel(r) { return r >= 80 ? "good" : r >= 60 ? "warn" : "bad"; }

/* ── 4. Streak ──────────────────────────────────────────────────── */
function calcStreak() {
  const ds = recordedDates().sort().reverse();
  let streak = 0;
  const todayStr = today();
  for (const d of ds) {
    const reg = S.attendance[d] || {};
    const marked = Object.values(reg).some(Boolean);
    if (!marked) break;
    // allow today or consecutive past dates
    const expected = new Date(todayStr + "T00:00:00");
    expected.setDate(expected.getDate() - streak);
    const dDate = new Date(d + "T00:00:00");
    if (dDate.toDateString() !== expected.toDateString()) break;
    streak++;
  }
  return streak;
}

/* ── 5. Toast ───────────────────────────────────────────────────── */
function toast(msg, type = "default") {
  const wrap = $("toastWrap");
  const el = document.createElement("div");
  el.className = `toast${type !== "default" ? " " + type : ""}`;
  const icon = { success: "✓  ", error: "✕  ", warn: "⚠  " }[type] || "";
  el.textContent = icon + msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

/* ── 6. Confetti ────────────────────────────────────────────────── */
function launchConfetti() {
  const canvas = $("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -Math.random() * canvas.height * 0.5,
    r: Math.random() * 6 + 3,
    d: Math.random() * 80 + 20,
    color: ["#6c5ce7","#00b894","#f0a500","#e17055","#0984e3","#fd79a8"][Math.floor(Math.random() * 6)],
    tilt: Math.floor(Math.random() * 10) - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.07 + 0.05
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(frame * 0.01 + p.d) + 2);
      p.x += Math.sin(frame * 0.01) * 0.6;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r * 1.2);
      ctx.stroke();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

/* ── 7. Particle background ─────────────────────────────────────── */
function initParticles() {
  const canvas = $("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.4 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(108,92,231,${p.alpha})`
        : `rgba(108,92,231,${p.alpha * 0.5})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── 8. Notifications ───────────────────────────────────────────── */
function buildNotifs() {
  const threshold = Number(S.settings.threshold) || 75;
  const list = [];

  // today's register empty
  const todayReg = getDay(today());
  const marked = S.students.filter(s => todayReg[s.id]).length;
  if (S.students.length > 0 && marked === 0) {
    list.push({ type: "info", title: "Today's register is empty", body: "Take attendance before the day ends." });
  }

  // at-risk students
  S.students.forEach(s => {
    const r = rate(s.id);
    const c = counts(s.id);
    if ((c.present + c.absent + c.late) > 0 && r < threshold) {
      list.push({ type: "warn", title: `${s.name} — low attendance`, body: `${r}% (threshold: ${threshold}%)` });
    }
  });

  // update badge
  const badge = $("notifBadge");
  badge.textContent = list.length;
  badge.classList.toggle("hidden", list.length === 0);
  $("navAttBadge").classList.toggle("hidden", marked > 0 || S.students.length === 0);

  return list;
}

function renderNotifPanel() {
  const list = buildNotifs();
  const container = $("notifList");
  if (!list.length) { container.innerHTML = `<div class="notif-empty">No notifications right now</div>`; return; }
  const colors = { warn: "var(--orange)", info: "var(--blue)", error: "var(--red)" };
  container.innerHTML = list.map(n => `
    <div class="notif-item">
      <div class="ni-dot" style="background:${colors[n.type] || "var(--purple)"}"></div>
      <div><b>${esc(n.title)}</b><small>${esc(n.body)}</small></div>
    </div>`).join("");
}

/* ── 9. Theme ───────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  S.settings.theme = theme;
  const dark = theme === "dark";
  $("sunIcon").classList.toggle("hidden", !dark);
  $("moonIcon").classList.toggle("hidden",  dark);
  $("mSun").classList.toggle("hidden", !dark);
  $("mMoon").classList.toggle("hidden",  dark);
  const sw = $("settingTheme");
  if (sw) sw.setAttribute("aria-checked", String(dark));
  save();
}
function toggleTheme() { applyTheme(S.settings.theme === "dark" ? "light" : "dark"); }

/* ── 10. Navigation ─────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:    () => greeting() + ", " + S.settings.teacher + ".",
  attendance:   () => "Daily Attendance",
  students:     () => "Students",
  classes:      () => "Classes",
  analytics:    () => "Analytics",
  reports:      () => "Reports",
  settings:     () => "Settings",
  studentHome:  () => "Welcome back, " + (S.students.find(s => s.id === currentStudentId)?.name?.split(" ")[0] || "Student") + ".",
  myAttendance: () => "My Attendance",
  mySchedule:   () => "My Classes"
};
const CRUMBS = {
  dashboard:"Dashboard", attendance:"Attendance", students:"Students",
  classes:"Classes", analytics:"Analytics", reports:"Reports",
  settings:"Settings", studentHome:"My Overview", myAttendance:"My Attendance", mySchedule:"My Classes"
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function showPage(page) {
  QQ(".page").forEach(p => p.classList.add("hidden"));
  const el = $(page + "Page");
  if (el) el.classList.remove("hidden");

  QQ(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $("crumb").textContent     = CRUMBS[page] || page;
  $("pageTitle").textContent = PAGE_TITLES[page] ? PAGE_TITLES[page]() : "Attendly";
  $("sidebar").classList.remove("open");
  $("sbOverlay").classList.add("hidden");
  $("notifPanel").classList.add("hidden");

  const renders = {
    dashboard: renderDashboard, attendance: renderAttendance,
    students: renderStudents, classes: renderClasses,
    analytics: renderAnalytics, reports: renderReports,
    settings: renderSettings, studentHome: renderStudentHome,
    myAttendance: renderMyAttendance, mySchedule: renderStudentClasses
  };
  if (renders[page]) renders[page]();
  buildNotifs();
}

/* ── 11. Dashboard ──────────────────────────────────────────────── */
function renderDashboard() {
  const d   = today();
  const reg = getDay(d);
  const n   = S.students.length;
  const p   = S.students.filter(s => reg[s.id] === "present").length;
  const a   = S.students.filter(s => reg[s.id] === "absent").length;
  const l   = S.students.filter(s => reg[s.id] === "late").length;
  const lv  = S.students.filter(s => reg[s.id] === "leave").length;
  const mk  = p + a + l + lv;
  const r   = mk ? Math.round((p + l) / mk * 100) : 0;

  $("statRate").textContent        = mk ? r + "%" : "0%";
  $("statRateNote").textContent    = mk ? mk + " marked" : "No register marked";
  $("statPresent").textContent     = p;
  $("statPresentNote").textContent = `of ${n} student${n !== 1 ? "s" : ""}`;
  $("statAbsent").textContent      = a;
  $("statStudents").textContent    = n;
  $("statStreak").textContent      = calcStreak();
  $("navStudentCount").textContent = n;

  // Today label
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).toUpperCase();
  $("welcomeTitle").textContent = greeting() + ", " + S.settings.teacher + ".";

  // Trend badge on rate card
  const ds = recordedDates();
  if (ds.length > 1) {
    const prevReg = getDay(ds[1]);
    const pm = S.students.filter(s => prevReg[s.id] === "present" || prevReg[s.id] === "late").length;
    const pp = S.students.filter(s => prevReg[s.id] === "present" || prevReg[s.id] === "absent" || prevReg[s.id] === "late").length;
    const prevR = pp ? Math.round(pm / pp * 100) : 0;
    const diff  = r - prevR;
    const el    = $("scTrend1");
    if (el && diff !== 0) {
      el.textContent = (diff > 0 ? "+" : "") + diff + "%";
      el.className   = "sc-trend " + (diff >= 0 ? "up" : "down");
    }
  }

  drawDashChart();
  renderAtRisk();

  // Recent registers
  const recent = recordedDates().slice(0, 5);
  $("recentList").innerHTML = recent.length
    ? recent.map(x => {
        const q  = getDay(x);
        const rp = S.students.filter(s => q[s.id] === "present").length;
        const ra = S.students.filter(s => q[s.id] === "absent").length;
        const rl = S.students.filter(s => q[s.id] === "late").length;
        return `<div class="activity-row">
          <div class="act-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>
          <div><b>Register recorded</b><small>${fmt(x)}</small></div>
          <span>${rp}P &middot; ${ra}A &middot; ${rl}L</span>
        </div>`;
      }).join("")
    : `<div class="empty-block" style="padding:30px"><p>No attendance recorded yet.</p></div>`;
}

function renderAtRisk() {
  const threshold = Number(S.settings.threshold) || 75;
  const list = S.students
    .map(s => ({ s, r: rate(s.id), c: counts(s.id) }))
    .filter(({ r, c }) => (c.present + c.absent + c.late) > 0 && r < threshold)
    .sort((a, b) => a.r - b.r).slice(0, 5);

  $("atRiskList").innerHTML = list.length
    ? list.map(({ s, r }) => {
        const [bg, fg] = avaColor(s.name);
        return `<div class="risk-row">
          <div class="risk-av" style="background:${bg};color:${fg}">${initials(s.name)}</div>
          <div><b>${esc(s.name)}</b><small>${esc(s.className || "CS")}</small></div>
          <span class="risk-pct">${r}%</span>
        </div>`;
      }).join("")
    : `<div class="empty-block" style="padding:28px"><p>${S.students.length ? "All students above threshold." : "Add students to begin tracking."}</p></div>`;
}

/* ── 12. Dashboard bar chart ────────────────────────────────────── */
function drawDashChart() {
  const canvas = $("dashChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const W = Math.max(wrap.clientWidth || 400, 200);
  const H = 160;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  ctx.scale(dpr, dpr);

  const dark    = document.documentElement.getAttribute("data-theme") === "dark";
  const gridCol = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)";
  const textCol = dark ? "#4a5270" : "#a0aec0";

  const ds  = recordedDates().slice(0, 7).reverse();
  const dates = ds.length ? ds : [today()];
  const n   = S.students.length || 1;
  const pad = 32;
  const colW = (W - pad * 2) / dates.length;
  const maxH = H - 36;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  [0, 25, 50, 75, 100].forEach(pct => {
    const y = pad / 2 + maxH * (1 - pct / 100);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y);
    ctx.strokeStyle = gridCol; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = textCol; ctx.font = "9px Inter,sans-serif";
    ctx.textAlign = "left"; ctx.fillText(pct + "%", 0, y + 3);
  });

  const barW = Math.min(colW * 0.52, 22);

  dates.forEach((d, i) => {
    const q  = getDay(d);
    const p  = S.students.filter(s => q[s.id] === "present").length;
    const a  = S.students.filter(s => q[s.id] === "absent").length;
    const l  = S.students.filter(s => q[s.id] === "late").length;
    const u  = Math.max(0, n - p - a - l);
    const x  = pad + i * colW + (colW - barW) / 2;
    const base = pad / 2 + maxH;

    const segs = [
      { val: p, col: "#00b894" }, { val: l, col: "#f0a500" },
      { val: a, col: "#e17055" }, { val: u, col: dark ? "#252840" : "#edf2f7" }
    ];
    let curY = base;
    segs.forEach(({ val, col }) => {
      const h = Math.max(0, (val / n) * maxH);
      if (h < 0.5) return;
      ctx.fillStyle = col;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, curY - h, barW, h, [3, 3, 0, 0]); ctx.fill();
      } else {
        ctx.fillRect(x, curY - h, barW, h);
      }
      curY -= h;
    });

    // Label
    ctx.fillStyle = textCol; ctx.font = "9px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dayAbbr(d), x + barW / 2, H - 5);
    ctx.textAlign = "left";
  });

  // Update x labels
  const labelsEl = $("chartLabels");
  if (labelsEl) {
    labelsEl.innerHTML = dates.map(d => `<span>${dayAbbr(d)}</span>`).join("");
    labelsEl.style.display = "none"; // canvas handles it
  }
}

/* ── 13. Attendance page ────────────────────────────────────────── */
function fillClassSelect(id) {
  const sel = $(id);
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="all">All classes</option>` +
    S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  sel.value = cur || "all";
}

function renderAttendance() {
  fillClassSelect("classFilter");
  const d   = $("attendanceDate").value || today();
  const cls = $("classFilter")?.value || "all";
  const reg = getDay(d);
  let students = cls === "all" ? S.students : S.students.filter(s => (s.classId || "cs") === cls);

  const p  = students.filter(s => reg[s.id] === "present").length;
  const a  = students.filter(s => reg[s.id] === "absent").length;
  const l  = students.filter(s => reg[s.id] === "late").length;
  const lv = students.filter(s => reg[s.id] === "leave").length;
  const mk = p + a + l + lv;

  $("registerCount").textContent  = `${students.length} student${students.length !== 1 ? "s" : ""}`;
  $("registerMarked").textContent = `${mk} marked`;
  $("rPresent").textContent = p;
  $("rAbsent").textContent  = a;
  $("rLate").textContent    = l;
  $("rLeave").textContent   = lv;

  $("attendanceTable").classList.toggle("hidden", students.length === 0);
  $("attendanceEmpty").classList.toggle("hidden", students.length > 0);

  $("attendanceTable").innerHTML = students.map(s => {
    const st = reg[s.id] || "";
    const [bg, fg] = avaColor(s.name);
    return `<div class="att-row">
      <div class="stu-info">
        <div class="stu-av" style="background:${bg};color:${fg}">${initials(s.name)}</div>
        <div><b>${esc(s.name)}</b><small>Roll ${esc(s.roll)} &middot; ${esc(s.className || "CS")}</small></div>
      </div>
      <div class="status-btns">
        <button class="st-btn present ${st === "present" ? "on" : ""}" data-id="${s.id}" data-st="present">Present</button>
        <button class="st-btn absent  ${st === "absent"  ? "on" : ""}" data-id="${s.id}" data-st="absent">Absent</button>
        <button class="st-btn late    ${st === "late"    ? "on" : ""}" data-id="${s.id}" data-st="late">Late</button>
        <button class="st-btn leave   ${st === "leave"   ? "on" : ""}" data-id="${s.id}" data-st="leave">Leave</button>
      </div>
    </div>`;
  }).join("");

  $("attendanceTable").querySelectorAll(".st-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const r  = getDay($("attendanceDate").value || today());
      const id = btn.dataset.id;
      const st = btn.dataset.st;
      r[id] = r[id] === st ? "" : st;
      save(); renderAttendance(); buildNotifs();
    });
  });
}

/* ── 14. Students page ──────────────────────────────────────────── */
function renderStudents() {
  fillClassSelect("classFilterStudents");
  const q   = ($("studentSearch")?.value || "").toLowerCase();
  const cls = $("classFilterStudents")?.value || "all";

  const list = S.students.filter(s => {
    const mq  = (s.name + " " + s.roll + " " + (s.className || "")).toLowerCase().includes(q);
    const mc  = cls === "all" || (s.classId || "cs") === cls;
    return mq && mc;
  });

  $("studentTotal").textContent = `${S.students.length} student${S.students.length !== 1 ? "s" : ""}`;

  const tbody = $("studentsTable");
  tbody.innerHTML = list.map(s => {
    const r  = rate(s.id);
    const c  = counts(s.id);
    const ds = recordedDates();
    const last = ds.map(d => getDay(d)[s.id]).find(Boolean) || "";
    const [bg, fg] = avaColor(s.name);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div class="stu-av" style="background:${bg};color:${fg};width:30px;height:30px;font-size:10px">${initials(s.name)}</div>
          <div><b>${esc(s.name)}</b><small>${esc(s.email || "")}</small></div>
        </div>
      </td>
      <td>${esc(s.roll)}</td>
      <td>${esc(s.className || "CS")}</td>
      <td><span class="rate-tag ${rateLabel(r)}">${r}%</span></td>
      <td style="color:var(--green);font-weight:700">${c.present}</td>
      <td style="color:var(--red);font-weight:700">${c.absent}</td>
      <td style="color:var(--orange);font-weight:700">${c.late}</td>
      <td><span class="status-tag ${last || "none"}">${last || "Not marked"}</span></td>
      <td>
        <div class="act-btns">
          <button class="icon-btn" data-edit="${s.id}" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="icon-btn del" data-del="${s.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");

  $("studentEmpty").classList.toggle("hidden", list.length > 0);

  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openModal("editStudent", b.dataset.edit)));
  tbody.querySelectorAll("[data-del]").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("Delete this student and all their attendance history?")) return;
      S.students = S.students.filter(s => s.id !== b.dataset.del);
      Object.values(S.attendance).forEach(x => delete x[b.dataset.del]);
      save(); renderStudents(); buildNotifs();
      toast("Student removed", "warn");
    });
  });
}

/* ── 15. Classes page ───────────────────────────────────────────── */
function renderClasses() {
  $("classGrid").innerHTML = S.classes.map(c => {
    const count = S.students.filter(s => (s.classId || "cs") === c.id).length;
    const cr    = rateClass(c.id);
    return `<div class="card class-card">
      <div class="cc-top">
        <div class="cc-emoji">${c.emoji || "📚"}</div>
        <div class="act-btns">
          <button class="icon-btn" data-edit-class="${c.id}" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button class="icon-btn del" data-del-class="${c.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.code)} &middot; Active</p>
      <div class="cc-meta">
        <div><b>${count}</b><small>Students</small></div>
        <div><b style="color:var(--${rateLabel(cr) === "good" ? "green" : rateLabel(cr) === "warn" ? "orange" : "red"})">${cr}%</b><small>Attendance</small></div>
        <div><b>${recordedDates().length}</b><small>Registers</small></div>
      </div>
    </div>`;
  }).join("");

  QQ("[data-edit-class]").forEach(b => b.addEventListener("click", () => openModal("editClass", b.dataset.editClass)));
  QQ("[data-del-class]").forEach(b => {
    b.addEventListener("click", () => {
      if (S.classes.length <= 1) return toast("Keep at least one class", "warn");
      if (!confirm("Remove this class?")) return;
      S.classes = S.classes.filter(c => c.id !== b.dataset.delClass);
      save(); renderClasses(); toast("Class removed", "warn");
    });
  });
}

/* ── 16. Analytics ──────────────────────────────────────────────── */
function renderAnalytics() {
  const range = Number($("analyticsRange")?.value || 7);
  const ds    = recordedDates().slice(0, range).reverse();

  const values = ds.map(d => {
    const q = getDay(d);
    const p = S.students.filter(s => q[s.id] === "present" || q[s.id] === "late").length;
    const m = S.students.filter(s => ["present","absent","late"].includes(q[s.id])).length;
    return m ? Math.round(p / m * 100) : 0;
  });

  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  $("averageRate").textContent = avg + "%";

  drawTrendSvg(ds, values);

  const rates = S.students.map(s => rate(s.id));
  const good  = rates.filter(x => x >= 80).length;
  const warn  = rates.filter(x => x >= 60 && x < 80).length;
  const bad   = rates.filter(x => x > 0 && x < 60).length;
  const none  = rates.filter(x => x === 0).length;

  $("healthCards").innerHTML = `
    <div class="health-box good"><b>${good}</b><small>On track (80%+)</small></div>
    <div class="health-box warn"><b>${warn}</b><small>Needs watch (60-79%)</small></div>
    <div class="health-box bad"><b>${bad}</b><small>At risk (&lt;60%)</small></div>
    <div class="health-box none"><b>${none}</b><small>No records yet</small></div>`;

  drawDonut([good, warn, bad, none]);
  drawHeatmap();

  $("performanceList").innerHTML = S.students.length
    ? S.students.slice().sort((a, b) => rate(b.id) - rate(a.id)).map(s => {
        const r  = rate(s.id);
        const rl = rateLabel(r);
        return `<div class="perf-row">
          <b>${esc(s.name)}</b>
          <span style="color:var(--${rl==="good"?"green":rl==="warn"?"orange":"red"})">${r}%</span>
          <div class="track"><div class="track-fill ${rl}" style="width:${r}%"></div></div>
        </div>`;
      }).join("")
    : `<div class="empty-block" style="padding:30px"><p>Add students to see performance.</p></div>`;
}

function drawTrendSvg(dates, values) {
  const svg    = $("trendSvg");
  const labels = $("svgXLabels");
  if (!svg) return;

  if (!dates.length) {
    svg.innerHTML = `<text x="300" y="105" text-anchor="middle" fill="var(--subtle)" font-size="12" font-family="Inter">No data recorded yet</text>`;
    if (labels) labels.innerHTML = "";
    return;
  }

  const W = 600, H = 200, pL = 8, pR = 8, pT = 16, pB = 10;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridC = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)";
  const areaC = dark ? "rgba(108,92,231,.18)" : "rgba(108,92,231,.1)";

  let grid = "";
  [0, 25, 50, 75, 100].forEach(pct => {
    const y = pT + (H - pT - pB) * (1 - pct / 100);
    grid += `<line x1="${pL}" y1="${y}" x2="${W - pR}" y2="${y}" stroke="${gridC}" stroke-width="1"/>`;
  });

  const pts = dates.map((_, i) => {
    const x = pL + (i / Math.max(dates.length - 1, 1)) * (W - pL - pR);
    const y = pT + (H - pT - pB) * (1 - values[i] / 100);
    return { x, y, v: values[i] };
  });

  let area = `M ${pts[0].x} ${H - pB}`;
  pts.forEach(p => { area += ` L ${p.x} ${p.y}`; });
  area += ` L ${pts[pts.length - 1].x} ${H - pB} Z`;

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }

  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#6c5ce7" stroke="var(--surface)" stroke-width="2.5"><title>${p.v}%</title></circle>`).join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6c5ce7" stop-opacity="${dark ? ".35" : ".25"}"/>
        <stop offset="100%" stop-color="#6c5ce7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#tg)"/>
    <path d="${line}" fill="none" stroke="#6c5ce7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}`;

  if (labels) labels.innerHTML = dates.map(d => `<span>${fmtShort(d)}</span>`).join("");
}

function drawDonut(segs) {
  const c = $("donutChart");
  if (!c) return;
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  c.width  = 130 * dpr; c.height = 130 * dpr;
  ctx.scale(dpr, dpr);

  const total  = segs.reduce((a, b) => a + b, 0) || 1;
  const colors = ["#00b894", "#f0a500", "#e17055", "#9ca3af"];
  const cx = 65, cy = 65, r = 48, inner = 32;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";

  ctx.clearRect(0, 0, 130, 130);
  let start = -Math.PI / 2;
  segs.forEach((v, i) => {
    if (!v) return;
    const angle = (v / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath(); ctx.fillStyle = colors[i]; ctx.fill();
    start += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = dark ? "#13151f" : "#ffffff";
  ctx.fill();

  const avg = S.students.length
    ? Math.round(S.students.map(s => rate(s.id)).reduce((a, b) => a + b, 0) / S.students.length)
    : 0;
  $("donutCenter").innerHTML = `<strong>${avg}%</strong><small>avg</small>`;
}

function drawHeatmap() {
  const wrap = $("heatmapWrap");
  if (!wrap) return;
  const days = [];
  for (let i = 69; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  }
  const n = S.students.length || 1;
  const cells = days.map(d => {
    const q   = S.attendance[d] || {};
    const p   = S.students.filter(s => q[s.id] === "present" || q[s.id] === "late").length;
    const m   = S.students.filter(s => ["present","absent","late"].includes(q[s.id])).length;
    const pct = m ? p / m : -1;
    const cls = pct < 0 ? "hm-0" : pct >= .8 ? "hm-3" : pct >= .6 ? "hm-2" : "hm-1";
    return `<div class="hm-cell ${cls}" title="${fmt(d)}: ${m ? Math.round(pct*100)+"%" : "No data"}"></div>`;
  });
  wrap.innerHTML = `
    <div class="heatmap-grid">${cells.join("")}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:10px;color:var(--muted)">
      <span>Less</span>
      <div style="display:flex;gap:3px">
        <div class="hm-cell hm-0"></div><div class="hm-cell hm-1"></div>
        <div class="hm-cell hm-2"></div><div class="hm-cell hm-3"></div>
      </div>
      <span>More</span>
    </div>`;
}

/* ── 17. Reports page ───────────────────────────────────────────── */
function renderReports() {
  const ds  = recordedDates();
  const n   = S.students.length;
  const thr = Number(S.settings.threshold) || 75;
  const ar  = S.students.filter(s => { const c = counts(s.id); return (c.present+c.absent+c.late) > 0 && rate(s.id) < thr; }).length;

  $("reportMeta1").textContent = `${n} students · ${ds.length} dates`;
  $("reportMeta2").textContent = `${n} students · monthly breakdown`;
  $("reportMeta3").textContent = `${n} students · last 14 dates`;
  $("reportMeta4").textContent = `${ar} student${ar !== 1 ? "s" : ""} below ${thr}%`;
}

/* ── 18. Settings page ──────────────────────────────────────────── */
function renderSettings() {
  $("schoolInput").value    = S.settings.school;
  $("teacherInput").value   = S.settings.teacher;
  $("creditInput").value    = S.settings.credit;
  $("thresholdInput").value = S.settings.threshold || 75;

  $("schoolNameSide").textContent = S.settings.school;
  $("wsAvatar").textContent       = initials(S.settings.school);
  $("sideUser").textContent       = S.settings.teacher;
  $("topUser").textContent        = S.settings.teacher;
  $("sideAvatar").textContent     = initials(S.settings.teacher);
  $("topAvatar").textContent      = initials(S.settings.teacher);
  $("footerCredit").textContent   = S.settings.credit || "Sachin";
  applyTheme(S.settings.theme || "light");
}

/* ── 19. Student portal ─────────────────────────────────────────── */
function renderStudentHome() {
  const s = S.students.find(x => x.id === currentStudentId) || S.students[0];
  if (!s) return;

  const c     = counts(s.id);
  const total = c.present + c.absent + c.late;
  const r     = total ? Math.round((c.present + c.late) / total * 100) : 0;

  $("studentWelcome").textContent = `Welcome back, ${s.name.split(" ")[0]}.`;
  $("studentRate").textContent    = r + "%";
  $("sRate").textContent    = r + "%";
  $("sPresent").textContent = c.present;
  $("sAbsent").textContent  = c.absent;
  $("sLate").textContent    = c.late;

  // Animate ring
  const ring = $("scoreRing");
  if (ring) {
    const circ   = 264;
    const offset = circ - (r / 100) * circ;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 200);
  }

  let title, text;
  if (r >= 80)      { title = "Excellent!"; text = "Your attendance is in great shape. Keep it up!"; }
  else if (r >= 60) { title = "Getting there..."; text = "You're close to a strong record. Try not to miss upcoming classes."; }
  else if (total === 0) { title = "No records yet"; text = "No attendance has been marked for you yet."; }
  else              { title = "Needs attention"; text = "Your attendance is low. Please speak to your teacher."; }

  $("studentStatusTitle").textContent = title;
  $("studentStatusText").textContent  = text;

  $("studentBreakdown").innerHTML = `
    <div class="bd-item"><b style="color:var(--green)">${c.present}</b><small>Present</small></div>
    <div class="bd-item"><b style="color:var(--red)">${c.absent}</b><small>Absent</small></div>
    <div class="bd-item"><b style="color:var(--orange)">${c.late}</b><small>Late</small></div>
    <div class="bd-item"><b style="color:var(--blue)">${c.leave}</b><small>On leave</small></div>`;

  const iconM  = { present:"✓", absent:"✕", late:"⏰", leave:"📋", "":"—" };
  const colorM = { present:"var(--green)", absent:"var(--red)", late:"var(--orange)", leave:"var(--blue)", "":"var(--muted)" };

  $("studentRecent").innerHTML = recordedDates().slice(0, 8).map(d => {
    const st = getDay(d)[s.id] || "";
    return `<div class="activity-row">
      <div class="act-icon" style="background:${colorM[st]}22;color:${colorM[st]}">${iconM[st]}</div>
      <div><b>${fmt(d)}</b><small>${s.className || "CS"}</small></div>
      <span class="status-tag ${st || "none"}">${st || "Unmarked"}</span>
    </div>`;
  }).join("") || `<div class="empty-block" style="padding:30px"><p>No records yet.</p></div>`;

  if (r >= 80 && total >= 5) launchConfetti();
}

function renderMyAttendance() {
  const s  = S.students.find(x => x.id === currentStudentId) || S.students[0];
  const q  = ($("myAttSearch")?.value || "").toLowerCase();
  const ds = recordedDates().filter(d => !q || fmt(d).toLowerCase().includes(q));
  const iconM  = { present:"✓", absent:"✕", late:"⏰", leave:"📋", "":"—" };
  const colorM = { present:"var(--green)", absent:"var(--red)", late:"var(--orange)", leave:"var(--blue)", "":"var(--muted)" };

  $("myAttendanceList").innerHTML = ds.map(d => {
    const st = s ? getDay(d)[s.id] || "" : "";
    return `<div class="activity-row">
      <div class="act-icon" style="background:${colorM[st]}22;color:${colorM[st]}">${iconM[st]}</div>
      <div><b>${fmt(d)}</b><small>${s?.className || "CS"}</small></div>
      <span class="status-tag ${st || "none"}">${st || "Unmarked"}</span>
    </div>`;
  }).join("") || `<div class="empty-block" style="padding:30px"><p>No attendance records available.</p></div>`;
}

function renderStudentClasses() {
  const s = S.students.find(x => x.id === currentStudentId);
  $("studentClassGrid").innerHTML = S.classes.map(c => {
    const count = S.students.filter(x => (x.classId || "cs") === c.id).length;
    const myR   = s ? rate(s.id) : 0;
    return `<div class="card class-card">
      <div class="cc-top"><div class="cc-emoji">${c.emoji || "📚"}</div></div>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.code)}</p>
      <div class="cc-meta">
        <div><b>${count}</b><small>Class size</small></div>
        <div><b>${myR}%</b><small>My rate</small></div>
        <div><b>Active</b><small>Status</small></div>
      </div>
    </div>`;
  }).join("");
}

/* ── 20. Modal ──────────────────────────────────────────────────── */
function openModal(type, id) {
  const box = $("modalBox");
  $("modal").classList.remove("hidden");

  if (type === "student" || type === "editStudent") {
    const ex = type === "editStudent" ? S.students.find(s => s.id === id) : null;
    box.innerHTML = `
      <button class="modal-close" id="mClose">&#x2715;</button>
      <span class="eyebrow">${ex ? "EDIT STUDENT" : "NEW STUDENT"}</span>
      <h2>${ex ? "Edit student" : "Add student"}</h2>
      <p>${ex ? "Update this student's details." : "Add a student to your class roster."}</p>
      <form class="modal-form" id="mForm" autocomplete="off">
        <label>Full name<input id="mName" required placeholder="e.g. Riya Sharma" value="${esc(ex?.name||"")}"></label>
        <label>Roll number<input id="mRoll" required placeholder="e.g. 24" value="${esc(ex?.roll||"")}"></label>
        <label>Email (optional)<input id="mEmail" type="email" placeholder="student@school.com" value="${esc(ex?.email||"")}"></label>
        <label>Class
          <select id="mClass">${S.classes.map(c=>`<option value="${c.id}"${(ex?.classId||"cs")===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select>
        </label>
        <div class="modal-actions">
          <button type="button" class="outline-btn" id="mCancel">Cancel</button>
          <button class="primary-btn" type="submit">${ex ? "Save changes" : "Add student"}</button>
        </div>
      </form>`;

    $("mForm").addEventListener("submit", e => {
      e.preventDefault();
      const name  = $("mName").value.trim();
      const roll  = $("mRoll").value.trim();
      const email = $("mEmail").value.trim();
      const cid   = $("mClass").value;
      const cls   = S.classes.find(x => x.id === cid);
      if (ex) {
        Object.assign(ex, { name, roll, email, classId: cid, className: cls?.name || "CS" });
        toast("Student updated", "success");
      } else {
        S.students.push({ id: uuid(), name, roll, email, classId: cid, className: cls?.name || "CS" });
        toast("Student added", "success");
      }
      save(); closeModal(); renderStudents(); renderClasses();
      $("navStudentCount").textContent = S.students.length;
      buildNotifs();
    });
  }

  if (type === "class" || type === "editClass") {
    const ex     = type === "editClass" ? S.classes.find(c => c.id === id) : null;
    const emojis = ["💻","📐","🔬","📚","🎨","🎵","🏃","📊","🌍","🧪","🖥","⚗","🎭","🏛","🤝"];
    box.innerHTML = `
      <button class="modal-close" id="mClose">&#x2715;</button>
      <span class="eyebrow">${ex ? "EDIT CLASS" : "NEW CLASS"}</span>
      <h2>${ex ? "Edit class" : "Create class"}</h2>
      <p>${ex ? "Update this class." : "Set up a new class or section."}</p>
      <form class="modal-form" id="mForm">
        <label>Class name<input id="cName" required placeholder="e.g. Mathematics" value="${esc(ex?.name||"")}"></label>
        <label>Class code<input id="cCode" required placeholder="e.g. MAT-101" value="${esc(ex?.code||"")}"></label>
        <label>Emoji icon
          <select id="cEmoji">${emojis.map(em=>`<option value="${em}"${(ex?.emoji||"📚")===em?" selected":""}>${em}  ${em}</option>`).join("")}</select>
        </label>
        <div class="modal-actions">
          <button type="button" class="outline-btn" id="mCancel">Cancel</button>
          <button class="primary-btn" type="submit">${ex ? "Save changes" : "Create class"}</button>
        </div>
      </form>`;

    $("mForm").addEventListener("submit", e => {
      e.preventDefault();
      const name  = $("cName").value.trim();
      const code  = $("cCode").value.trim();
      const emoji = $("cEmoji").value;
      if (ex) {
        Object.assign(ex, { name, code, emoji });
        S.students.filter(s => s.classId === ex.id).forEach(s => s.className = name);
        toast("Class updated", "success");
      } else {
        S.classes.push({ id: "c" + Date.now(), name, code, emoji });
        toast("Class created", "success");
      }
      save(); closeModal(); renderClasses();
      fillClassSelect("classFilter"); fillClassSelect("classFilterStudents");
    });
  }

  $("mClose").addEventListener("click",  closeModal);
  $("mCancel")?.addEventListener("click", closeModal);
  $("modalBg").addEventListener("click",  closeModal);
  setTimeout(() => document.querySelector("#mForm input")?.focus(), 60);
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("modalBox").innerHTML = "";
}

/* ── 21. CSV exports ────────────────────────────────────────────── */
function dl(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a   = document.createElement("a");
  a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportFull() {
  const ds = recordedDates().sort();
  const rows = [["Roll","Student","Email","Class","Overall %", ...ds]];
  S.students.forEach(s => rows.push([s.roll, s.name, s.email||"", s.className||"CS", rate(s.id)+"%", ...ds.map(d => getDay(d)[s.id]||"")]));
  dl("attendly-full-report.csv", rows);
  toast("Report downloaded", "success");
}

function exportMonthly() {
  const months = {};
  recordedDates().forEach(d => { const m = d.slice(0,7); if (!months[m]) months[m]=[]; months[m].push(d); });
  const mKeys = Object.keys(months).sort();
  const rows  = [["Student","Roll","Class",...mKeys.map(m=>m+" (P/A/L/Lv/%)")],
  ];
  S.students.forEach(s => {
    const row = [s.name, s.roll, s.className||"CS"];
    mKeys.forEach(m => {
      let p=0,a=0,l=0,lv=0;
      months[m].forEach(d=>{const v=getDay(d)[s.id]||"";if(v==="present")p++;else if(v==="absent")a++;else if(v==="late")l++;else if(v==="leave")lv++;});
      const tot=p+a+l; row.push(`${p}/${a}/${l}/${lv}/${tot?Math.round((p+l)/tot*100):0}%`);
    });
    rows.push(row);
  });
  dl("attendly-monthly.csv", rows);
  toast("Monthly report downloaded", "success");
}

function exportAtRisk() {
  const thr  = Number(S.settings.threshold) || 75;
  const rows = [["Student","Roll","Class","Rate","Present","Absent","Late"]];
  S.students.filter(s=>{const c=counts(s.id);return(c.present+c.absent+c.late)>0&&rate(s.id)<thr;})
    .sort((a,b)=>rate(a.id)-rate(b.id))
    .forEach(s=>{const c=counts(s.id);rows.push([s.name,s.roll,s.className||"CS",rate(s.id)+"%",c.present,c.absent,c.late]);});
  dl("attendly-at-risk.csv", rows);
  toast("At-risk report downloaded", "success");
}

function exportJSON() {
  const a = document.createElement("a");
  a.href  = URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:"application/json"}));
  a.download = "attendly-backup.json";
  a.click(); URL.revokeObjectURL(a.href);
  toast("Backup downloaded", "success");
}

/* ── 22. Print ──────────────────────────────────────────────────── */
function printRegister() {
  const ds = recordedDates().sort().slice(-14);
  $("printArea").innerHTML = `
    <div class="print-header">
      <h1>Attendly — Attendance Register</h1>
      <p>${S.settings.school} &nbsp;|&nbsp; Printed ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Built by Sachin (@nyxsachin)</p>
    </div>
    <table class="print-table">
      <thead><tr><th>Roll</th><th>Student</th><th>Class</th>${ds.map(d=>`<th>${fmtShort(d)}</th>`).join("")}<th>Rate</th></tr></thead>
      <tbody>${S.students.map(s=>`<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.className||"CS")}</td>${ds.map(d=>{const v=getDay(d)[s.id]||"";return`<td>${v?v[0].toUpperCase():"—"}</td>`;}).join("")}<td>${rate(s.id)}%</td></tr>`).join("")}</tbody>
    </table>
    <p style="margin-top:12pt;font-size:8pt;color:#666">P=Present  A=Absent  L=Late  Lv=Leave  —=Not marked</p>`;
  window.print();
}

/* ── 23. Demo data ──────────────────────────────────────────────── */
function loadDemo() {
  const names = [
    "Aarav Patel","Riya Sharma","Dev Mehta","Anaya Shah","Kabir Desai",
    "Ishita Joshi","Vivaan Trivedi","Myra Patel","Arjun Shah","Kiara Mehta",
    "Rohan Gupta","Priya Nair","Aditya Kumar","Shreya Singh","Nikhil Verma"
  ];
  S.classes = [
    { id:"cs",   name:"Computer Science", code:"CS-101",  emoji:"💻" },
    { id:"math", name:"Mathematics",      code:"MAT-101", emoji:"📐" },
    { id:"phy",  name:"Physics",          code:"PHY-101", emoji:"🔬" }
  ];
  S.students = names.map((name,i) => ({
    id: "d"+i, name, roll: String(i+1).padStart(2,"0"),
    email: name.toLowerCase().replaceAll(" ","")+"@student.com",
    classId: S.classes[i%3].id, className: S.classes[i%3].name
  }));
  S.attendance = {};
  for (let x = 20; x >= 0; x--) {
    const d = new Date(); d.setDate(d.getDate()-x);
    if (d.getDay()===0||d.getDay()===6) continue;
    const k = new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
    S.attendance[k]={};
    S.students.forEach((s,i)=>{
      const v=(i+x)%9===0?"absent":(i+x)%7===0?"late":(i+x)%15===0?"leave":"present";
      S.attendance[k][s.id]=v;
    });
  }
  save(); renderAll();
  fillClassSelect("classFilter"); fillClassSelect("classFilterStudents");
  toast("Demo classroom loaded", "success");
}

/* ── 24. Login ──────────────────────────────────────────────────── */
function login() {
  const email = $("loginEmail").value.trim();
  const pass  = $("loginPassword").value;

  if (role === "teacher") {
    if (email !== "teacher@attendly.com" || pass !== "teacher123") {
      toast("Use: teacher@attendly.com / teacher123", "error"); return;
    }
  } else {
    const s = S.students.find(x => x.email === email || email === x.name.toLowerCase().replaceAll(" ","")+"@student.com");
    if (!s || pass !== "student123") {
      toast("Demo student: name@student.com / student123", "warn"); return;
    }
    currentStudentId = s.id;
  }

  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("teacherNav").classList.toggle("hidden", role !== "teacher");
  $("studentNav").classList.toggle("hidden",  role === "teacher");
  $("sideRole").textContent = role === "teacher" ? "Teacher" : "Student";
  $("topRole").textContent  = role === "teacher" ? "Teacher" : "Student";

  $("attendanceDate").value = today();
  renderSettings();
  fillClassSelect("classFilter");
  fillClassSelect("classFilterStudents");

  if (role === "student") showPage("studentHome");
  else showPage("dashboard");
}

/* ── 25. Render all ─────────────────────────────────────────────── */
function renderAll() {
  renderSettings();
  $("navStudentCount").textContent = S.students.length;
  buildNotifs();
  const active = [...QQ(".page")].find(p => !p.classList.contains("hidden"));
  if (!active) return;
  const id = active.id.replace("Page","");
  const map = {
    dashboard:renderDashboard, attendance:renderAttendance, students:renderStudents,
    classes:renderClasses, analytics:renderAnalytics, reports:renderReports,
    settings:renderSettings, studentHome:renderStudentHome,
    myAttendance:renderMyAttendance, mySchedule:renderStudentClasses
  };
  if (map[id]) map[id]();
}

/* ================================================================
   EVENT WIRING
   ================================================================ */

/* Auth */
$("loginForm").addEventListener("submit", e => { e.preventDefault(); login(); });

$("togglePassword").addEventListener("click", () => {
  const inp  = $("loginPassword");
  const show = inp.type === "text";
  inp.type   = show ? "password" : "text";
  $("eyeShow").classList.toggle("hidden",  show);
  $("eyeHide").classList.toggle("hidden", !show);
});

$("demoFill").addEventListener("click", () => {
  $("loginEmail").value    = role === "teacher" ? "teacher@attendly.com" : (S.students[0]?.email || "student@attendly.com");
  $("loginPassword").value = role === "teacher" ? "teacher123" : "student123";
});

$("forgotBtn").addEventListener("click", () => toast("Use the demo credentials shown on the card", "warn"));

QQ(".login-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    role = btn.dataset.role;
    QQ(".login-tab").forEach(b => b.classList.toggle("active", b === btn));
    $("loginHeading").textContent = role === "teacher" ? "Welcome back" : "Student sign in";
    $("loginSub").textContent     = role === "teacher" ? "Sign in to manage your classroom." : "Check your attendance and records.";
    $("loginEmail").placeholder   = role === "teacher" ? "teacher@attendly.com" : "student@school.com";
    $("demoHint").textContent     = role === "teacher" ? "teacher@attendly.com / teacher123" : "name@student.com / student123";
  });
});

/* Sidebar */
$("hamburger").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
  $("sbOverlay").classList.toggle("hidden", !$("sidebar").classList.contains("open"));
});
$("sbOverlay").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
  $("sbOverlay").classList.add("hidden");
});

QQ(".nav-item").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));

/* Global data-page clicks */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-page]");
  if (b && !b.classList.contains("nav-item")) showPage(b.dataset.page);
});

/* Theme */
$("themeToggle").addEventListener("click", toggleTheme);
$("mobileTheme").addEventListener("click", toggleTheme);
$("settingTheme")?.addEventListener("click", toggleTheme);

/* Notif */
$("notifBtn").addEventListener("click", e => {
  e.stopPropagation();
  const p = $("notifPanel");
  const hidden = p.classList.contains("hidden");
  p.classList.toggle("hidden", !hidden);
  if (hidden) renderNotifPanel();
});
$("clearNotifs").addEventListener("click", () => {
  $("notifPanel").classList.add("hidden");
  $("notifBadge").classList.add("hidden");
  $("navAttBadge").classList.add("hidden");
});
document.addEventListener("click", e => {
  if (!e.target.closest("#notifPanel") && !e.target.closest("#notifBtn"))
    $("notifPanel").classList.add("hidden");
});

/* Attendance */
$("attendanceDate").addEventListener("change", renderAttendance);
$("classFilter")?.addEventListener("change", renderAttendance);

$("allPresent").addEventListener("click", () => {
  const r = getDay($("attendanceDate").value || today());
  S.students.forEach(s => { r[s.id] = "present"; });
  save(); renderAttendance(); buildNotifs();
  toast("All students marked present", "success");
});

$("clearRegister").addEventListener("click", () => {
  if (!confirm("Clear all marks for this date?")) return;
  S.attendance[$("attendanceDate").value || today()] = {};
  save(); renderAttendance(); buildNotifs();
  toast("Register cleared", "warn");
});

$("saveRegister").addEventListener("click", () => { save(); toast("Register saved", "success"); });
$("attendanceAdd").addEventListener("click", () => openModal("student"));

/* Students */
$("addStudentBtn").addEventListener("click", () => openModal("student"));
$("dashAddStudent").addEventListener("click", () => openModal("student"));
$("studentSearch").addEventListener("input", renderStudents);
$("classFilterStudents")?.addEventListener("change", renderStudents);
$("importBtn").addEventListener("click", () => toast("Import: Use Settings > Load Demo for sample data", "warn"));

/* Classes */
$("addClassBtn").addEventListener("click", () => openModal("class"));

/* Analytics */
$("analyticsRange")?.addEventListener("change", renderAnalytics);
$("analyticsExport").addEventListener("click", exportFull);

/* Reports */
$("reportExport").addEventListener("click",  exportFull);
$("reportExport2").addEventListener("click", exportFull);
$("reportMonthly").addEventListener("click", exportMonthly);
$("reportPrint").addEventListener("click",   printRegister);
$("reportAtRisk").addEventListener("click",  exportAtRisk);

/* Dashboard shortcuts */
$("dashExport").addEventListener("click", exportFull);
$("dashPrint").addEventListener("click",  printRegister);

/* Settings */
$("schoolInput").addEventListener("change", e => {
  S.settings.school = e.target.value.trim() || "Apex College";
  save(); renderSettings(); toast("School name updated");
});
$("teacherInput").addEventListener("change", e => {
  S.settings.teacher = e.target.value.trim() || "Admin";
  save(); renderSettings(); showPage("dashboard");
});
$("creditInput").addEventListener("change", e => {
  S.settings.credit = e.target.value.trim() || "Sachin";
  save(); renderSettings(); toast("Credit updated");
});
$("thresholdInput").addEventListener("change", e => {
  S.settings.threshold = Math.min(100, Math.max(0, Number(e.target.value) || 75));
  save(); buildNotifs(); toast("Alert threshold updated");
});
$("loadDemo").addEventListener("click", loadDemo);
$("exportData").addEventListener("click", exportJSON);
$("resetApp").addEventListener("click", () => {
  if (!confirm("This will permanently delete all data. Are you sure?")) return;
  S = clone(DEFAULTS); save(); renderAll();
  toast("Workspace reset", "warn");
});

/* Student portal */
$("myAttSearch")?.addEventListener("input", renderMyAttendance);

/* Profile */
$("accountBtn").addEventListener("click",  () => { if (role === "teacher") showPage("settings"); });
$("profileTop").addEventListener("click",  () => { if (role === "teacher") showPage("settings"); });

/* Keyboard */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeModal();
    $("notifPanel").classList.add("hidden");
    $("sidebar").classList.remove("open");
    $("sbOverlay").classList.add("hidden");
  }
});

/* Resize — redraw charts */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const active = [...QQ(".page")].find(p => !p.classList.contains("hidden"));
    if (!active) return;
    const id = active.id.replace("Page","");
    if (id === "dashboard") drawDashChart();
    if (id === "analytics") renderAnalytics();
  }, 160);
});

/* ================================================================
   INIT
   ================================================================ */
(function init() {
  applyTheme(S.settings.theme || "light");
  initParticles();

  $("schoolNameSide").textContent = S.settings.school;
  $("wsAvatar").textContent       = initials(S.settings.school);
  $("sideUser").textContent       = S.settings.teacher;
  $("topUser").textContent        = S.settings.teacher;
  $("sideAvatar").textContent     = initials(S.settings.teacher);
  $("topAvatar").textContent      = initials(S.settings.teacher);
  $("footerCredit").textContent   = S.settings.credit || "Sachin";
  $("navStudentCount").textContent = S.students.length;
  $("attendanceDate").value        = today();
})();
