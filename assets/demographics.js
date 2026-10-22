(async () => {
  const { esc, num } = SYM;
  const project = await SYM.init("demographics.html");
  const root = document.getElementById("app");

  const MEDIUM_COLOR = { Marathi: "var(--c-marathi)", English: "var(--c-english)", Urdu: "var(--c-urdu)", Hindi: "var(--c-hindi)" };
  const mColor = (m) => MEDIUM_COLOR[m] || "var(--c-other)";
  const STDS = ["5", "6", "7", "8"];
  const BANDS = [
    { key: "<150", label: "Under 150", test: (n) => n < 150 },
    { key: "150-299", label: "150 to 299", test: (n) => n >= 150 && n < 300 },
    { key: "300-499", label: "300 to 499", test: (n) => n >= 300 && n < 500 },
    { key: "500-999", label: "500 to 999", test: (n) => n >= 500 && n < 1000 },
    { key: "1000+", label: "1,000 and above", test: (n) => n >= 1000 },
  ];

  const years = (project?.years || []).filter((y) => y.schools_file);
  if (!years.length) { root.innerHTML = '<div class="panel empty">No school list has been added yet.</div>'; return; }

  // A "school" is one row of the school list: one UDISE code in one medium.
  // A UDISE code running two mediums therefore counts as two schools.
  const state = { year: years[0].year, block: "", mgmt: "", medium: "", std: "", band: "", q: "", metric: "schools", sortKey: "students", sortDir: -1 };
  let rows = [];

  async function loadYear(y) {
    const yr = project.years.find((x) => x.year === y);
    rows = await SYM.schools(yr.schools_file);
    rows.forEach((r) => { r.band = BANDS.find((b) => b.test(r.students)).key; });
  }

  const uniq = (arr) => [...new Set(arr)];
  const byCount = (field) => {
    const m = new Map(); rows.forEach((r) => m.set(r[field], (m.get(r[field]) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  };
  // Students in a row: the selected standard only, or Std 5 to 8 combined.
  const stu = (r, std = state.std) => (std ? r["s" + std] : r.students);

  function filtered(skip) {
    const q = state.q.toLowerCase();
    return rows.filter((r) =>
      (skip === "block" || !state.block || r.block === state.block) &&
      (skip === "mgmt" || !state.mgmt || r.mgmt === state.mgmt) &&
      (skip === "medium" || !state.medium || r.medium === state.medium) &&
      (skip === "std" || !state.std || r["s" + state.std] > 0) &&
      (skip === "band" || !state.band || r.band === state.band) &&
      (!q || r.name.toLowerCase().includes(q) || r.udise.includes(q)));
  }
  const measure = (list, std) => state.metric === "schools" ? list.length : list.reduce((s, r) => s + stu(r, std), 0);
  const stdLabel = () => (state.std ? `Std ${state.std}` : "Std 5 to 8");

  function shell() {
    const opt = (vals, label) => `<option value="">All ${label}</option>` + vals.map((v) => `<option>${esc(v)}</option>`).join("");
    const yl = project.years.find((y) => y.year === state.year).label;
    root.innerHTML = `
      ${SYM.pageHead({ group: "Overview", title: "Demographics", mr: "शाळा व विद्यार्थी",
        desc: "Schools and students (Std 5 to 8) covered by the project. Click any bar to filter the whole page; click it again to clear.",
        about: "Each row of the school list is one school: a UDISE code in one medium. A UDISE code with sections in two mediums counts as two schools.",
        meta: `Data: ${esc(yl)} school list with standard-wise enrolment` })}
      <section class="panel" aria-label="Filters">
        <div class="panel-head" style="margin-bottom:8px">
          <div class="ph-left"><h2 style="font-size:1.6rem">Filters</h2>${SYM.info("Filters apply to every number and chart on this page. Clicking a bar in a chart sets the matching filter.")}</div>
          <button class="collapse-btn" id="f-toggle" aria-expanded="true" aria-controls="f-body" aria-label="Show or hide filters"><span>⌃</span></button>
        </div>
        <div id="f-body"><div class="filters" style="margin-top:14px">
          <div class="field"><label for="f-year">Project year</label><select id="f-year">${project.years.map((y) =>
            `<option value="${y.year}"${y.schools_file ? "" : " disabled"}>${esc(y.label)}${y.schools_file ? "" : " (not added yet)"}</option>`).join("")}</select></div>
          <div class="field"><label for="f-block">Block</label><select id="f-block">${opt(byCount("block"), "blocks")}</select></div>
          <div class="field"><label for="f-mgmt">Management</label><select id="f-mgmt">${opt(byCount("mgmt"), "management types")}</select></div>
          <div class="field"><label for="f-medium">Medium</label><select id="f-medium">${opt(byCount("medium"), "mediums")}</select></div>
          <div class="field"><label for="f-std">Standard</label><select id="f-std"><option value="">Std 5 to 8</option>${STDS.map((s) => `<option value="${s}">Std ${s}</option>`).join("")}</select></div>
          <div class="field"><label for="f-band">School size (Std 5 to 8)</label><select id="f-band"><option value="">All sizes</option>${BANDS.map((b) => `<option value="${b.key}">${b.label}</option>`).join("")}</select></div>
          <div class="field"><label for="f-q">School (name or UDISE)</label><input id="f-q" type="search" placeholder="At least 3 characters" autocomplete="off"></div>
          <div class="field"><label for="reset">Reset</label><button class="btn" id="reset">Reset filters</button></div>
        </div></div>
        <div class="showing" id="f-note"></div>
      </section>
      <div class="kpi-cards" id="kpis"></div>
      <div class="panel-head" style="margin:0 0 12px">
        <span class="muted small">Charts show</span>
        <div class="seg-toggle" role="group" aria-label="Measure">
          <button data-m="schools">Schools</button><button data-m="students">Students</button>
        </div>
      </div>
      <div class="grid-2">
        <section class="panel"><div class="panel-head"><h2>By block</h2><span class="hint">Coloured by medium</span></div><div class="bars" id="c-block"></div><div class="legend" id="lg-block"></div></section>
        <section class="panel"><div class="panel-head"><div class="ph-left"><h2>By standard</h2>${SYM.info("Schools: number of schools with at least one student enrolled in that standard. Students: enrolment in that standard.")}</div></div><div class="std-cols" id="c-std"></div></section>
        <section class="panel"><div class="panel-head"><div class="ph-left"><h2>By management details</h2>${SYM.info("Private Aided and Private Aided 20, 40, 60 and 80 are all government-aided private schools.")}</div></div><div class="bars" id="c-mgmt"></div></section>
        <section class="panel"><div class="panel-head"><h2>By medium</h2></div><div class="bars" id="c-medium"></div></section>
      </div>
      <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>By school size</h2><span class="hint">Students in Std 5 to 8 per school</span></div><div class="bars narrow" id="c-band"></div></section>
      <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Block and medium</h2><span class="hint" id="mx-hint"></span></div><div class="table-scroll" id="matrix"></div></section>
      <section class="panel" style="margin-top:20px">
        <div class="panel-head"><h2>School list</h2><button class="btn" id="dl">Download this list (CSV)</button></div>
        <div class="list-scroll"><table class="data" id="tbl"></table></div>
        <div class="table-foot"><span class="muted small" id="tbl-count"></span></div>
      </section>
      <p class="note">A UDISE code with sections in two mediums (Moledina, Guru Nanak and Ornellas in Year 1) is counted as two schools.
      Schools that end at Std 7 show zero students in Std 8.</p>`;

    const bind = (id, key) => document.getElementById(id).addEventListener("change", (e) => { state[key] = e.target.value; render(); });
    ["block", "mgmt", "medium", "std", "band"].forEach((k) => bind("f-" + k, k));
    document.getElementById("f-q").addEventListener("input", (e) => { const v = e.target.value.trim(); state.q = v.length >= 3 || /^\d+$/.test(v) ? v : ""; render(); });
    document.getElementById("reset").addEventListener("click", () => {
      Object.assign(state, { block: "", mgmt: "", medium: "", std: "", band: "", q: "" });
      document.getElementById("f-q").value = ""; render();
    });
    const tg = document.getElementById("f-toggle");
    tg.addEventListener("click", () => { const open = tg.getAttribute("aria-expanded") !== "true"; tg.setAttribute("aria-expanded", open); document.getElementById("f-body").hidden = !open; });
    document.getElementById("f-year").value = state.year;
    document.getElementById("f-year").addEventListener("change", async (e) => {
      state.year = Number(e.target.value); Object.assign(state, { block: "", mgmt: "", medium: "", std: "", band: "", q: "" });
      await loadYear(state.year); shell(); render();
    });
    root.querySelectorAll(".seg-toggle button").forEach((b) => b.addEventListener("click", () => { state.metric = b.dataset.m; render(); }));
    document.getElementById("dl").addEventListener("click", download);
  }

  function bars(elId, key, groups) {
    const el = document.getElementById(elId);
    const max = Math.max(1, ...groups.map((g) => g.value));
    el.innerHTML = groups.map((g) => {
      const active = state[key] === g.key, dim = state[key] && !active;
      const width = (g.value / max) * 100;
      let segs = `<div class="bar-seg" style="width:${width}%;background:${g.color || "var(--navy)"}"></div>`;
      if (g.parts) {
        const tot = g.parts.reduce((s, p) => s + p.v, 0) || 1;
        segs = g.parts.map((p) => `<div class="bar-seg" title="${esc(p.k)}: ${num(p.v)}" style="width:${(p.v / tot) * width}%;background:${mColor(p.k)}"></div>`).join("");
      }
      return `<button class="bar-row${active ? " active" : ""}${dim ? " dim" : ""}" data-k="${esc(g.key)}" aria-pressed="${active}">
        <span class="bar-name" title="${esc(g.label)}">${esc(g.label)}</span>
        <span class="bar-track">${segs}</span><span class="bar-val">${num(g.value)}</span></button>`;
    }).join("") || '<div class="empty">No schools match these filters.</div>';
    el.querySelectorAll(".bar-row").forEach((b) => b.addEventListener("click", () => {
      state[key] = state[key] === b.dataset.k ? "" : b.dataset.k; render();
    }));
  }

  function group(list, field) {
    return uniq(list.map((r) => r[field])).map((k) => ({ key: k, label: k, list: list.filter((r) => r[field] === k) }));
  }

  function stdChart() {
    const base = filtered("std");
    const vals = STDS.map((s) => {
      const withStd = base.filter((r) => r["s" + s] > 0);
      return { s, v: state.metric === "schools" ? withStd.length : base.reduce((t, r) => t + r["s" + s], 0) };
    });
    const max = Math.max(1, ...vals.map((x) => x.v));
    const el = document.getElementById("c-std");
    el.innerHTML = vals.map(({ s, v }) => `<button class="std-col${state.std === s ? " active" : ""}${state.std && state.std !== s ? " dim" : ""}" data-k="${s}" aria-pressed="${state.std === s}">
      <span class="cv">${num(v)}</span><span class="col" style="height:${(v / max) * 120}px"></span><span class="cl">Std ${s}</span></button>`).join("");
    el.querySelectorAll(".std-col").forEach((b) => b.addEventListener("click", () => { state.std = state.std === b.dataset.k ? "" : b.dataset.k; render(); }));
  }

  function render() {
    ["block", "mgmt", "medium", "std", "band"].forEach((k) => { document.getElementById("f-" + k).value = state[k]; });
    root.querySelectorAll(".seg-toggle button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === state.metric));

    const all = filtered();
    const students = all.reduce((s, r) => s + stu(r), 0);
    const sizes = all.map((r) => r.students).sort((a, b) => a - b);
    const median = sizes.length ? (sizes.length % 2 ? sizes[(sizes.length - 1) / 2]
      : Math.round((sizes[sizes.length / 2 - 1] + sizes[sizes.length / 2]) / 2)) : 0;
    const yl = project.years.find((y) => y.year === state.year).label;
    document.getElementById("kpis").innerHTML = [
      SYM.kpiCard({ title: "Schools", mr: "शाळा", value: num(all.length), desc: `In the ${esc(yl)} list${state.std ? `, with students in Std ${state.std}` : ""}`,
        about: "One school = one UDISE code in one medium. A UDISE code with sections in two mediums counts as two schools." }),
      SYM.kpiCard({ title: "Students", mr: state.std ? `विद्यार्थी (इ. ${"५६७८"[Number(state.std) - 5]} वी)` : "विद्यार्थी (इ. ५ वी ते ८ वी)", value: num(students), desc: state.std ? `Std ${state.std} only` : "Std 5 to 8 combined",
        about: "Enrolment from the standard-wise school list." }),
      SYM.kpiCard({ title: "Blocks", value: num(uniq(all.map((r) => r.block)).length), desc: "Blocks with at least one school" }),
      SYM.kpiCard({ title: "Median school size", mr: "मध्यगा विद्यार्थी संख्या", value: num(median), desc: "Students in Std 5 to 8 per school", accent: true,
        about: "Half the schools have more students than this and half have fewer. Less affected by a few very large schools than the average." }),
    ].join("");

    const parts = [esc(yl), state.block ? esc(state.block) : "all blocks", state.mgmt ? esc(state.mgmt) : "all management types",
      state.medium ? esc(state.medium) : "all mediums", esc(stdLabel()), state.band ? esc(BANDS.find((b) => b.key === state.band).label) : "all sizes"];
    if (state.q) parts.push(`search “${esc(state.q)}”`);
    document.getElementById("f-note").innerHTML = `Showing: <b>${parts.join(" · ")}</b>`;

    const mediums = byCount("medium");
    bars("c-block", "block", group(filtered("block"), "block").map((g) => ({
      ...g, value: measure(g.list),
      parts: mediums.map((m) => ({ k: m, v: measure(g.list.filter((r) => r.medium === m)) })).filter((p) => p.v),
    })).sort((a, b) => b.value - a.value));
    document.getElementById("lg-block").innerHTML = mediums.map((m) => `<span><i style="background:${mColor(m)}"></i>${esc(m)}</span>`).join("");
    bars("c-mgmt", "mgmt", group(filtered("mgmt"), "mgmt").map((g) => ({ ...g, value: measure(g.list) })).sort((a, b) => b.value - a.value));
    bars("c-medium", "medium", group(filtered("medium"), "medium").map((g) => ({ ...g, value: measure(g.list), color: mColor(g.key) })).sort((a, b) => b.value - a.value));
    const bandRows = filtered("band");
    bars("c-band", "band", BANDS.map((b) => { const list = bandRows.filter((r) => r.band === b.key); return { key: b.key, label: b.label, value: measure(list) }; }));
    stdChart();
    matrix(all, mediums);
    table(all);
  }

  function matrix(list, mediums) {
    const blocks = uniq(list.map((r) => r.block)).sort();
    const cols = mediums.filter((m) => list.some((r) => r.medium === m));
    const vals = blocks.flatMap((b) => cols.map((m) => measure(list.filter((r) => r.block === b && r.medium === m))));
    const max = Math.max(1, ...vals);
    document.getElementById("mx-hint").textContent = state.metric === "schools" ? "Number of schools" : `Students in ${stdLabel()}`;
    if (!blocks.length) { document.getElementById("matrix").innerHTML = '<div class="empty">No schools match these filters.</div>'; return; }
    const head = `<tr><th>Block</th>${cols.map((m) => `<th class="num">${esc(m)}</th>`).join("")}<th class="num">Total</th></tr>`;
    const body = blocks.map((b) => {
      const bl = list.filter((r) => r.block === b);
      return `<tr><td>${esc(b)}</td>${cols.map((m) => {
        const v = measure(bl.filter((r) => r.medium === m));
        return `<td class="heat" style="background:rgba(34,57,111,${v ? (0.06 + 0.32 * v / max).toFixed(2) : 0})">${v ? num(v) : ""}</td>`;
      }).join("")}<td class="num"><b>${num(measure(bl))}</b></td></tr>`;
    }).join("");
    const foot = `<tr><td><b>Total</b></td>${cols.map((m) => `<td class="num"><b>${num(measure(list.filter((r) => r.medium === m)))}</b></td>`).join("")}<td class="num"><b>${num(measure(list))}</b></td></tr>`;
    document.getElementById("matrix").innerHTML = `<table class="data">${head}${body}${foot}</table>`;
  }

  const COLS = [
    ["udise", "UDISE", false], ["name", "School", false], ["block", "Block", false],
    ["mgmt", "Management details", false], ["medium", "Medium", false],
    ["s5", "Std 5", true], ["s6", "Std 6", true], ["s7", "Std 7", true], ["s8", "Std 8", true], ["students", "Std 5 to 8", true],
  ];
  function table(list) {
    const k = state.sortKey, d = state.sortDir;
    const sorted = [...list].sort((a, b) => (typeof a[k] === "number" ? (a[k] - b[k]) : String(a[k]).localeCompare(String(b[k]))) * d);
    const arrow = (key) => (key === k ? (d > 0 ? " ▲" : " ▼") : "");
    document.getElementById("tbl").innerHTML =
      `<thead><tr>${COLS.map(([key, l, n]) => `<th class="${n ? "num" : ""}"><button data-k="${key}">${l}${arrow(key)}</button></th>`).join("")}</tr></thead>
       <tbody>${sorted.map((r) => `<tr>${COLS.map(([key, , n]) => `<td class="${n ? "num" : ""}">${n ? num(r[key]) : esc(r[key])}</td>`).join("")}</tr>`).join("")}</tbody>`;
    document.querySelectorAll("#tbl th button").forEach((b) => b.addEventListener("click", () => {
      if (state.sortKey === b.dataset.k) state.sortDir *= -1;
      else { state.sortKey = b.dataset.k; state.sortDir = COLS.find((c) => c[0] === b.dataset.k)[2] ? -1 : 1; }
      table(filtered());
    }));
    document.getElementById("tbl-count").textContent = `${num(list.length)} schools`;
  }

  function download() {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [COLS.map((c) => q(c[1])).join(",")].concat(filtered().map((r) => COLS.map(([k]) => q(r[k])).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `sym_schools_year${state.year}_filtered.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  try { await loadYear(state.year); shell(); render(); }
  catch (e) { SYM.showError(root, e); }
})();
