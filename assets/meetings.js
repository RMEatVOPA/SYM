(async () => {
  const { esc, fmtDate, fmtRange, toDate } = SYM;
  const project = await SYM.init("meetings.html");
  const root = document.getElementById("app");

  let meetings, events;
  try { [meetings, events] = await Promise.all([SYM.json("data/meetings.json"), SYM.json("data/timeline.json")]); }
  catch (e) { SYM.showError(root, e); return; }
  meetings.sort((a, b) => b.date.localeCompare(a.date)); // newest first

  const yearOf = (d) => project.years.find((y) => toDate(y.start) <= toDate(d) && toDate(d) <= toDate(y.end));
  const types = [...new Set(meetings.map((m) => m.type).filter(Boolean))].sort();
  const state = { type: "", year: "", q: "" };

  root.innerHTML = `
    ${SYM.pageHead({ group: "Project", title: "Meetings", mr: "बैठका व इतिवृत्त", desc: "Minutes of project meetings, newest first. Each meeting links to the timeline events it relates to." })}
    <section class="panel" style="margin-bottom:18px"><div class="filters">
      <div class="field"><label for="f-type">Meeting type</label><select id="f-type"><option value="">All types</option>${types.map((t) => `<option>${esc(t)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-year">Project year</label><select id="f-year"><option value="">All years</option>${project.years.map((y) => `<option value="${y.year}">${esc(y.label)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-q">Search titles and participants</label><input id="f-q" type="search" autocomplete="off"></div>
    </div></section>
    <div class="split">
      <section class="panel" style="padding:8px"><ul class="m-list" id="mlist"></ul></section>
      <section class="panel" id="mdetail" aria-live="polite"></section>
    </div>`;

  const visible = () => meetings.filter((m) =>
    (!state.type || m.type === state.type) &&
    (!state.year || (yearOf(m.date) || {}).year === Number(state.year)) &&
    (!state.q || `${m.title} ${m.participants || ""}`.toLowerCase().includes(state.q.toLowerCase())));

  let current = null;
  function list() {
    const v = visible();
    document.getElementById("mlist").innerHTML = v.map((m) => `<li><button data-id="${esc(m.id)}" aria-current="${m.id === current}">
      <div><b>${esc(m.title)}</b>${SYM.sampleBadge(m)}</div><div class="d">${esc(fmtDate(m.date))}${m.type ? `, ${esc(m.type)}` : ""}</div></button></li>`).join("")
      || '<li class="empty">No meetings match these filters.</li>';
    document.querySelectorAll("#mlist button").forEach((b) => b.addEventListener("click", () => { location.hash = encodeURIComponent(b.dataset.id); }));
  }

  async function show(id) {
    const m = meetings.find((x) => x.id === id) || meetings[0];
    const el = document.getElementById("mdetail");
    if (!m) { el.innerHTML = '<div class="empty">No meetings added yet. Add one in data/meetings.json.</div>'; return; }
    current = m.id; list();
    const linked = (m.events || []).map((id) => events.find((e) => e.id === id)).filter(Boolean);
    el.innerHTML = `<div class="detail"><h2>${esc(m.title)}${SYM.sampleBadge(m)}</h2>
      <div class="meta">${m.type ? `<span class="tag">${esc(m.type)}</span>` : ""}<span class="muted small">${esc(fmtDate(m.date))}</span></div>
      ${m.participants ? `<p class="small" style="margin:0 0 8px"><span class="muted">Participants:</span> ${esc(m.participants)}</p>` : ""}
      ${linked.length ? `<p class="small" style="margin:0 0 8px"><span class="muted">On the timeline:</span> ${linked.map((e) => `<a href="timeline.html#${encodeURIComponent(e.id)}">${esc(e.title)}</a> (${esc(fmtRange(e.start, e.end))})`).join("; ")}</p>` : ""}
      </div><hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><div class="minutes" id="minutes"><p class="muted">Loading minutes…</p></div>`;
    const box = document.getElementById("minutes");
    if (!m.minutes) { box.innerHTML = '<p class="muted">Minutes have not been added for this meeting.</p>'; return; }
    try { box.innerHTML = marked.parse(await SYM.text(m.minutes)); }
    catch (e) { box.innerHTML = `<p class="muted">Could not load ${esc(m.minutes)}. Check the file name in data/meetings.json.</p>`; }
  }

  ["type", "year"].forEach((k) => document.getElementById("f-" + k).addEventListener("change", (e) => { state[k] = e.target.value; list(); }));
  document.getElementById("f-q").addEventListener("input", (e) => { state.q = e.target.value.trim(); list(); });
  window.addEventListener("hashchange", () => show(decodeURIComponent(location.hash.slice(1))));
  list(); show(decodeURIComponent(location.hash.slice(1)));
})();
