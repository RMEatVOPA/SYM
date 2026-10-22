/* Shared helpers for every page of the संयम site. */
const SYM = (() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const num = (n) => Number(n || 0).toLocaleString("en-IN");

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Dates are stored as YYYY-MM-DD; parse as local dates to avoid timezone shifts.
  const toDate = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const fmtDate = (s) => {
    const d = toDate(s);
    return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "";
  };
  const fmtRange = (a, b) => (b && b !== a ? `${fmtDate(a)} to ${fmtDate(b)}` : fmtDate(a));
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

  async function json(path) {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(`Could not load ${path} (HTTP ${r.status})`);
    return r.json();
  }
  async function text(path) {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(`Could not load ${path} (HTTP ${r.status})`);
    return r.text();
  }

  // Small CSV parser: handles quoted fields, commas inside quotes, BOM and CRLF.
  function parseCSV(src) {
    src = src.replace(/^\uFEFF/, "");
    const rows = [];
    let row = [], field = "", q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) {
        if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
    const head = rows.shift().map((h) => h.trim());
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
  }

  // Column names in the school list. If a future year's sheet uses different
  // headers, add the new spelling to the matching list.
  const SCHOOL_COLS = {
    udise: ["UDISE code", "UDISE", "udise"],
    name: ["School name", "School Name", "school_name"],
    students: ["Total students (5th to 8th)", "Total students", "students"],
    mgmt: ["Management details", "Management", "management_details"],
    block: ["Block", "block"],
    medium: ["Medium", "medium"],
    s5: ["Std 5"], s6: ["Std 6"], s7: ["Std 7"], s8: ["Std 8"],
  };
  function normaliseSchools(rows) {
    const pick = (r, keys) => { for (const k of keys) if (k in r) return r[k]; return ""; };
    return rows.map((r) => ({
      udise: pick(r, SCHOOL_COLS.udise),
      name: pick(r, SCHOOL_COLS.name),
      students: Number(String(pick(r, SCHOOL_COLS.students)).replace(/,/g, "")) || 0,
      mgmt: pick(r, SCHOOL_COLS.mgmt) || "Not given",
      block: pick(r, SCHOOL_COLS.block) || "Not given",
      medium: pick(r, SCHOOL_COLS.medium) || "Not given",
      s5: Number(pick(r, SCHOOL_COLS.s5)) || 0, s6: Number(pick(r, SCHOOL_COLS.s6)) || 0,
      s7: Number(pick(r, SCHOOL_COLS.s7)) || 0, s8: Number(pick(r, SCHOOL_COLS.s8)) || 0,
    }));
  }
  async function schools(file) { return normaliseSchools(parseCSV(await text(file))); }

  function currentYear(project) {
    const t = today();
    return project.years.find((y) => toDate(y.start) <= t && t <= toDate(y.end)) || null;
  }

  // Sidebar groups, matching the NM dashboard's navigation style.
  const NAV = [
    { group: "Overview", items: [
      { href: "index.html", label: "Home" },
      { href: "demographics.html", label: "Demographics" } ] },
    { group: "Project", items: [
      { href: "timeline.html", label: "Timeline" },
      { href: "meetings.html", label: "Meetings" } ] },
    { group: "Library", items: [
      { href: "resources.html", label: "Resources" } ] },
  ];

  function yearProgress(project) {
    const t = today();
    return project.years.map((y) => {
      const s = toDate(y.start), e = toDate(y.end);
      const pct = t <= s ? 0 : t >= e ? 100 : Math.round(((t - s) / (e - s)) * 100);
      const state = t > e ? "Completed" : t < s ? "Upcoming" : "In progress";
      return `<div class="row"><b>${esc(y.label)}</b><span>${state}</span></div>
        <div class="ys-bar" role="progressbar" aria-label="${esc(y.label)} progress" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="ys-fill" style="width:${pct}%"></div></div>`;
    }).join("");
  }

  const academicYear = (y) => `${toDate(y.start).getFullYear()}-${String(toDate(y.end).getFullYear()).slice(2)}`;

  async function init(active) {
    let project = null;
    try { project = await json("data/project.json"); } catch (e) { console.error(e); }
    const cur = project ? (currentYear(project) || project.years[0]) : null;
    const sub = cur ? `संयम प्रकल्प · ${esc(cur.label)} (${academicYear(cur)}) · ${esc(project.area_short || "Pune city")} · ${esc(project.standards || "Std 5 to 8")}` : "संयम प्रकल्प";
    // Left logo: assets/sym-logo.png. Right logo is optional: add assets/logo-right.png.
    document.getElementById("site-header").outerHTML = `
      <header class="top"><div class="top-inner">
        <div class="logo"><a href="index.html"><img src="assets/sym-logo.png" alt="संयम, An Addiction Prevention Initiative" onerror="this.remove()"></a></div>
        <div class="title"><h1><span class="mr" lang="mr">संयम</span> Project Dashboard</h1><p lang="mr">${sub}</p></div>
        <div class="logo logo-right"><img src="assets/logo-right.png" alt="" onerror="this.remove()"></div>
        <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="sidebar">Menu</button>
      </div></header>`;
    const nav = NAV.map((g) => `<div class="sb-group">${g.group}</div>` + g.items.map((p) =>
      `<a href="${p.href}"${p.href === active ? ' aria-current="page"' : ""}>${p.label}</a>`).join("")).join("");
    const sb = document.getElementById("sidebar");
    sb.className = "sidebar";
    sb.setAttribute("aria-label", "Pages");
    sb.innerHTML = nav + (project ? `<div class="sb-year"><div class="sb-group" style="margin:0 0 4px;padding:0">Project years</div>${yearProgress(project)}</div>` : "");
    const mb = document.getElementById("menu-btn");
    mb.addEventListener("click", () => { const o = sb.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `संयम (SYM) project, maintained by the Research, Monitoring and Evaluation team, VOPA.`;
    }
    return project;
  }

  // "i" button with a tooltip on hover or keyboard focus.
  const info = (txt) => `<button type="button" class="info" aria-label="About this: ${esc(txt)}">i<span class="tip" role="tooltip">${esc(txt)}</span></button>`;

  function pageHead({ group, title, mr, desc, about, meta }) {
    return `<div class="eyebrow">${esc(group)}</div>
      <div class="page-title"><h1>${esc(title)}</h1>${mr ? `<span class="mr" lang="mr">${esc(mr)}</span>` : ""}${about ? info(about) : ""}</div>
      <div class="page-sub"><p>${desc}</p>${meta ? `<div class="meta">${meta}</div>` : ""}</div>`;
  }

  function kpiCard({ title, mr, value, desc, about, accent }) {
    return `<div class="kpi-card${accent ? " accent" : ""}"><div class="kh"><div><div class="kt">${esc(title)}</div>${mr ? `<div class="km" lang="mr">${esc(mr)}</div>` : ""}</div>${about ? info(about) : ""}</div>
      <div class="v">${value}</div>${desc ? `<div class="kd">${desc}</div>` : ""}</div>`;
  }

  function showError(el, err) {
    el.innerHTML = `<div class="panel"><b>Data could not be loaded.</b><p class="muted small">${esc(err.message)}.
      If you opened this file directly from your computer, run a local server instead (see README).</p></div>`;
  }

  const sampleBadge = (o) => (o && o.sample ? '<span class="sample-badge">Sample</span>' : "");

  return { info, pageHead, kpiCard, esc, num, toDate, fmtDate, fmtRange, today, json, text, parseCSV, schools, currentYear, init, showError, sampleBadge };
})();
