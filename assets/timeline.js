(async () => {
  const { esc, toDate, fmtDate, fmtRange, today } = SYM;
  const project = await SYM.init("timeline.html");
  const root = document.getElementById("app");
  const TYPES = ["Phase", "Assessment", "Training", "Milestone", "Event"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let events, meetings, resources;
  try {
    [events, meetings, resources] = await Promise.all([
      SYM.json("data/timeline.json"), SYM.json("data/meetings.json"), SYM.json("data/resources.json").catch(() => []),
    ]);
  } catch (e) { SYM.showError(root, e); return; }
  events.sort((a, b) => a.start.localeCompare(b.start));
  meetings.sort((a, b) => a.date.localeCompare(b.date));

  const yearOf = (dateStr) => project.years.find((y) => toDate(y.start) <= toDate(dateStr) && toDate(dateStr) <= toDate(y.end));
  const meetingsFor = (id) => meetings.filter((m) => (m.events || []).includes(id));
  const resourcesFor = (id) => resources.filter((r) => (r.events || []).includes(id));
  const typeClass = (t) => "t-" + (TYPES.includes(t) ? t : "Event");

  root.innerHTML = `
    ${SYM.pageHead({ group: "Project", title: "Timeline", mr: "कालरेषा", desc: "Phases, assessments and milestones across the three project years. Select an item to see its linked meetings and documents.", about: "Events come from data/timeline.json. Grey dots are meetings; click one to open its minutes." })}
    <div class="legend" style="margin:-6px 0 16px">${TYPES.map((t) => `<span><i class="${typeClass(t)}"></i>${t}</span>`).join("")}
      <span><i style="background:var(--muted);border-radius:50%"></i>Meeting</span>
      <span><i style="background:var(--yellow);width:3px"></i>Today</span></div>
    <div id="years"></div>
    <section class="panel detail" id="detail" aria-live="polite"></section>
    <section class="panel" style="margin-top:18px"><div class="panel-head"><h2>All events</h2></div><ul class="event-list" id="list"></ul></section>`;

  const pos = (y, d) => {
    const s = toDate(y.start), e = toDate(y.end), x = toDate(d);
    return Math.min(100, Math.max(0, ((x - s) / (e - s)) * 100));
  };

  document.getElementById("years").innerHTML = project.years.map((y) => {
    const s = toDate(y.start);
    const e = toDate(y.end);
    const nMonths = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1;
    const months = Array.from({ length: nMonths }, (_, i) => {
      const d = new Date(s.getFullYear(), s.getMonth() + i, 1);
      return `<div>${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}</div>`;
    }).join("");
    const yEvents = events.filter((e) => yearOf(e.start) === y);
    const yMeet = meetings.filter((m) => yearOf(m.date) === y);
    const lanes = TYPES.filter((t) => yEvents.some((e) => (TYPES.includes(e.type) ? e.type : "Event") === t));
    const laneHtml = lanes.map((t) => `<div class="tl-lane"><span class="tl-lane-name">${t}</span>${
      yEvents.filter((e) => (TYPES.includes(e.type) ? e.type : "Event") === t).map((e) => {
        const left = pos(y, e.start);
        const range = e.end && e.end !== e.start;
        const width = range ? Math.max(1, pos(y, e.end) - left) : 0;
        return `<button class="tl-item ${typeClass(e.type)}${range ? " range" : ""}${e.sample ? " sample" : ""}" data-id="${esc(e.id)}"
          style="left:${range ? `${left}%` : `clamp(8px, ${left}%, calc(100% - 8px))`};${range ? `width:${width}%` : ""}" title="${esc(e.title)}: ${esc(fmtRange(e.start, e.end))}" aria-label="${esc(e.title)}, ${esc(fmtRange(e.start, e.end))}"></button>`;
      }).join("")}</div>`).join("");
    const meetLane = yMeet.length ? `<div class="tl-lane"><span class="tl-lane-name">Meetings</span>${yMeet.map((m) =>
      `<a class="tl-item t-Meeting" href="meetings.html#${encodeURIComponent(m.id)}" style="left:${pos(y, m.date)}%" title="${esc(m.title)}: ${esc(fmtDate(m.date))}" aria-label="Meeting: ${esc(m.title)}, ${esc(fmtDate(m.date))}"></a>`).join("")}</div>` : "";
    const t = today();
    const todayLine = t >= toDate(y.start) && t <= toDate(y.end) ? `<div class="tl-today" style="left:${pos(y, `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`)}%"><span>Today</span></div>` : "";
    const body = laneHtml || meetLane ? `<div class="tl-lanes">${laneHtml}${meetLane}${todayLine}</div>`
      : `<div class="tl-lanes"><div class="tl-empty">No events added for ${esc(y.label)} yet.</div>${todayLine}</div>`;
    return `<section class="tl-year"><div class="tl-year-head"><h2>${esc(y.label)}</h2><span class="muted">${esc(fmtRange(y.start, y.end))}</span></div>
      <div class="tl-scroll"><div class="tl-band"><div class="tl-months" style="grid-template-columns:repeat(${nMonths},1fr)">${months}</div>${body}</div></div></section>`;
  }).join("");

  document.getElementById("list").innerHTML = events.map((e) => {
    const n = meetingsFor(e.id).length;
    return `<li><span class="muted small d">${esc(fmtDate(e.start))}</span><span class="dot ${typeClass(e.type)}"></span>
      <span><a href="#${encodeURIComponent(e.id)}">${esc(e.title)}</a>${SYM.sampleBadge(e)}</span>
      <span class="muted small">${n ? `${n} meeting${n > 1 ? "s" : ""}` : ""}</span></li>`;
  }).join("") || '<li class="empty">No events yet. Add them in data/timeline.json.</li>';

  function select(id) {
    const e = events.find((x) => x.id === id) || events.find((x) => toDate(x.start) >= today()) || events[events.length - 1];
    const el = document.getElementById("detail");
    if (!e) { el.innerHTML = '<div class="empty">No events yet.</div>'; return; }
    document.querySelectorAll(".tl-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === e.id));
    const ms = meetingsFor(e.id), rs = resourcesFor(e.id);
    const y = yearOf(e.start);
    el.innerHTML = `<h2>${esc(e.title)}${SYM.sampleBadge(e)}</h2>
      <div class="meta"><span class="tag">${esc(e.type || "Event")}</span>${e.status ? `<span class="tag">${esc(e.status)}</span>` : ""}
        <span class="muted small">${esc(fmtRange(e.start, e.end))}${y ? ` (${esc(y.label)})` : ""}</span></div>
      ${e.description ? `<p style="max-width:75ch;margin:0 0 12px">${esc(e.description)}</p>` : ""}
      <div class="grid-2">
        <div><h3>Linked meetings</h3>${ms.length ? `<ul>${ms.map((m) => `<li><a href="meetings.html#${encodeURIComponent(m.id)}">${esc(m.title)}</a> <span class="muted small">${esc(fmtDate(m.date))}</span></li>`).join("")}</ul>` : '<p class="muted small">None linked yet.</p>'}</div>
        <div><h3>Linked documents</h3>${rs.length ? `<ul>${rs.map((r) => `<li>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)} <span class="muted small">${esc(r.type || "")}</span></li>`).join("")}</ul>` : '<p class="muted small">None linked yet.</p>'}</div>
      </div>`;
  }

  document.querySelectorAll("button.tl-item").forEach((b) => b.addEventListener("click", () => { history.replaceState(null, "", "#" + b.dataset.id); select(b.dataset.id); }));
  window.addEventListener("hashchange", () => select(decodeURIComponent(location.hash.slice(1))));
  select(decodeURIComponent(location.hash.slice(1)));
})();
