(async () => {
  const { esc, num, fmtDate, fmtRange, toDate, today } = SYM;
  const project = await SYM.init("index.html");
  const root = document.getElementById("app");
  try {
    const [events, meetings] = await Promise.all([SYM.json("data/timeline.json"), SYM.json("data/meetings.json")]);
    const cur = SYM.currentYear(project) || project.years[0];
    const withList = [...project.years].reverse().find((y) => y.schools_file && toDate(y.start) <= today()) || project.years.find((y) => y.schools_file);
    const rows = withList ? await SYM.schools(withList.schools_file) : [];
    const schools = rows.length; // a school running two mediums counts as two schools
    const students = rows.reduce((s, r) => s + r.students, 0);
    const blocks = new Set(rows.map((r) => r.block)).size;
    const t = today();
    const next = events.filter((e) => toDate(e.end || e.start) >= t).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
    const recent = [...meetings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

    root.innerHTML = `
      ${SYM.pageHead({ group: "Overview", title: "Home", mr: "आढावा",
        desc: `Dashboard and resource centre for संयम, ${esc((project.tagline || "").toLowerCase().replace(/^an /, "a three-year "))} in ${esc(project.area)} schools. ${esc(cur.label)} runs ${esc(fmtRange(cur.start, cur.end))}.` })}
      <div class="kpi-cards">
        ${SYM.kpiCard({ title: "Schools", mr: "शाळा", value: num(schools), desc: `In the ${esc(withList ? withList.label : "")} school list` })}
        ${SYM.kpiCard({ title: "Students", mr: "विद्यार्थी", value: num(students), desc: "Std 5 to 8 combined" })}
        ${SYM.kpiCard({ title: "Blocks", value: num(blocks), desc: "Blocks in the school list" })}
        ${SYM.kpiCard({ title: "Project year", mr: "प्रकल्प वर्ष", value: `${esc(cur.label.replace("Year ", ""))} of ${project.years.length}`, desc: esc(fmtRange(cur.start, cur.end)), accent: true })}
      </div>
      <div class="home-grid">
        <section class="panel"><div class="panel-head"><h2>Coming up</h2><a class="small" href="timeline.html">Open timeline</a></div>
          ${next.length ? `<ul class="event-list">${next.map((e) => `<li style="grid-template-columns:130px 14px 1fr"><span class="muted small d">${esc(fmtDate(e.start))}</span><span class="dot t-${esc(e.type)}"></span><span><a href="timeline.html#${encodeURIComponent(e.id)}">${esc(e.title)}</a>${SYM.sampleBadge(e)}</span></li>`).join("")}</ul>` : '<p class="muted small">Nothing scheduled. Add events in data/timeline.json.</p>'}
        </section>
        <section class="panel"><div class="panel-head"><h2>Recent meetings</h2><a class="small" href="meetings.html">All meetings</a></div>
          ${recent.length ? `<ul class="event-list">${recent.map((m) => `<li style="grid-template-columns:130px 1fr"><span class="muted small d">${esc(fmtDate(m.date))}</span><span><a href="meetings.html#${encodeURIComponent(m.id)}">${esc(m.title)}</a>${SYM.sampleBadge(m)}</span></li>`).join("")}</ul>` : '<p class="muted small">No meetings added yet.</p>'}
        </section>
      </div>
      <nav class="pagelinks" aria-label="Sections">
        <a href="demographics.html"><b>Demographics</b><span class="mr">शाळा व विद्यार्थी</span><span class="d">Schools and students by block, management and medium</span></a>
        <a href="timeline.html"><b>Timeline</b><span class="mr">कालरेषा</span><span class="d">Phases, assessments and milestones</span></a>
        <a href="meetings.html"><b>Meetings</b><span class="mr">बैठका व इतिवृत्त</span><span class="d">Minutes linked to the timeline</span></a>
        <a href="resources.html"><b>Resources</b><span class="mr">संसाधने</span><span class="d">Tools, reports and data files</span></a>
      </nav>`;
  } catch (e) { SYM.showError(root, e); }
})();
