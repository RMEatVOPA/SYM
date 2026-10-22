(async () => {
  const { esc, fmtDate } = SYM;
  const project = await SYM.init("resources.html");
  const root = document.getElementById("app");
  let resources, events;
  try { [resources, events] = await Promise.all([SYM.json("data/resources.json"), SYM.json("data/timeline.json")]); }
  catch (e) { SYM.showError(root, e); return; }
  resources.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const types = [...new Set(resources.map((r) => r.type).filter(Boolean))].sort();
  const state = { type: "", year: "", q: "" };

  root.innerHTML = `
    ${SYM.pageHead({ group: "Library", title: "Resources", mr: "संसाधने", desc: "Assessment tools, reports, presentations and data files for the project." })}
    <section class="panel" style="margin-bottom:18px"><div class="filters">
      <div class="field"><label for="f-type">Type</label><select id="f-type"><option value="">All types</option>${types.map((t) => `<option>${esc(t)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-year">Project year</label><select id="f-year"><option value="">All years</option>${project.years.map((y) => `<option value="${y.year}">${esc(y.label)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-q">Search</label><input id="f-q" type="search" autocomplete="off"></div>
    </div></section>
    <section class="panel"><ul class="res-list" id="rlist"></ul></section>`;

  function render() {
    const v = resources.filter((r) => (!state.type || r.type === state.type) && (!state.year || r.year === Number(state.year)) &&
      (!state.q || `${r.title} ${r.description || ""}`.toLowerCase().includes(state.q.toLowerCase())));
    document.getElementById("rlist").innerHTML = v.map((r) => {
      const ev = (r.events || []).map((id) => events.find((e) => e.id === id)).filter(Boolean);
      const yr = project.years.find((y) => y.year === r.year);
      return `<li>
        <span class="title">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}${SYM.sampleBadge(r)}</span>
        <span class="muted small">${[r.type, yr && yr.label, fmtDate(r.date)].filter(Boolean).map(esc).join(", ")}</span>
        ${r.description ? `<span class="desc">${esc(r.description)}</span>` : ""}
        ${ev.length ? `<span class="links">${ev.map((e) => `<a class="tag" href="timeline.html#${encodeURIComponent(e.id)}">${esc(e.title)}</a>`).join("")}</span>` : ""}
      </li>`;
    }).join("") || '<li class="empty">No resources match these filters.</li>';
  }
  ["type", "year"].forEach((k) => document.getElementById("f-" + k).addEventListener("change", (e) => { state[k] = e.target.value; render(); }));
  document.getElementById("f-q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
  render();
})();
