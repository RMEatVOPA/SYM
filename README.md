# संयम (SYM) project site

Dashboard and resource centre for the SYM project, maintained by the RME team, VOPA.
The site is plain HTML, CSS and JavaScript. There is nothing to build or install; GitHub Pages serves the files as they are.

## Pages

| Page | File | Data it reads |
|---|---|---|
| Home | `index.html` | `data/project.json`, `data/timeline.json`, `data/meetings.json`, school list |
| Demographics | `demographics.html` | school list for each year (`data/schools_year1.csv`) |
| Timeline | `timeline.html` | `data/timeline.json`, `data/meetings.json`, `data/resources.json` |
| Meetings | `meetings.html` | `data/meetings.json`, `data/minutes/*.md` |
| Resources | `resources.html` | `data/resources.json` |

All content lives in the `data` folder. You should never need to edit the `.html` or `assets` files to add content.

## Putting it on GitHub Pages (one time)

1. In the RME VOPA GitHub account, create a new **public** repository, for example `sym`.
2. Upload everything in this folder (keep the folder structure, including the empty `.nojekyll` file).
3. Go to **Settings > Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute or two the site is live at `https://<account-name>.github.io/sym/`.

Every later change committed to `main` goes live automatically within a couple of minutes.

## Adding content

You can edit files directly on github.com (open the file, click the pencil icon, then **Commit changes**). Dates are always written `YYYY-MM-DD`.

### A timeline event (`data/timeline.json`)

```json
{
  "id": "y1-baseline",
  "title": "Baseline assessment",
  "type": "Assessment",
  "start": "2026-11-16",
  "end": "2026-11-28",
  "status": "Planned",
  "description": "Short note on what this is."
}
```

- `id`: short unique name, no spaces. Meetings and resources link to events through this.
- `type`: one of `Phase`, `Assessment`, `Training`, `Milestone`, `Event`. Each type gets its own row on the timeline.
- `end` is optional. Leave it out for one-day milestones.
- `status`: free text, for example `Planned`, `In progress`, `Done`.

### A meeting (two steps)

1. Write the minutes as a Markdown file in `data/minutes/`, for example `data/minutes/2026-11-03-pmc-officials.md`. Use `##` for headings, `-` for bullet points. Marathi text works as is.
2. Add an entry to `data/meetings.json`:

```json
{
  "id": "2026-11-03-pmc-officials",
  "date": "2026-11-03",
  "title": "Meeting with PMC education officials",
  "type": "Government",
  "participants": "Names or roles",
  "events": ["y1-baseline"],
  "minutes": "data/minutes/2026-11-03-pmc-officials.md"
}
```

`events` is the list of timeline event ids this meeting relates to. It can be empty: `[]`.
The meeting then appears on the Meetings page, on the Timeline (as a dot, and under each linked event), and on Home.

### A resource (`data/resources.json`)

```json
{
  "id": "y1-baseline-tool",
  "title": "Baseline tool, Std 5",
  "type": "Tool",
  "year": 1,
  "date": "2026-11-01",
  "url": "files/baseline_tool_std5.pdf",
  "description": "One line on what it is.",
  "events": ["y1-baseline"]
}
```

`url` can point to a file uploaded into the `files` folder, or to a SharePoint link. A SharePoint link keeps the document itself behind the VOPA login even though this site is public.

### Next year's school list

1. Upload the sheet as `data/schools_year2.csv` with the same column headings as Year 1:
   `UDISE code, School name, Total students (5th to 8th), Management details, Block, Medium`
2. In `data/project.json`, set `"schools_file": "data/schools_year2.csv"` for Year 2.

If the headings change, add the new spelling to `SCHOOL_COLS` near the top of `assets/common.js`.

### Removing the sample entries

Entries with `"sample": true` show a yellow "Sample" tag. Delete them (and `data/minutes/2026-10-12-baseline-planning.md`) once real content is in.

## Logos

The header has a logo slot on each side, like the NM dashboard. Add `assets/logo-left.png` and/or `assets/logo-right.png` (PNG with a transparent background, about 300 px tall) and they appear automatically. If a file is missing, that slot stays empty.

## JSON tips

- Entries are separated by commas; there is no comma after the last entry.
- Text goes in double quotes.
- If a page shows "Data could not be loaded", the JSON file usually has a missing or extra comma. Paste the file into https://jsonlint.com to find the line.

## Previewing on your computer

Opening the `.html` files by double-clicking will not load the data (browsers block it). Instead, open a terminal in this folder and run:

```
python -m http.server 8000
```

then visit http://localhost:8000. In VS Code, the "Live Server" extension does the same.

## Note

The site is public. Anything committed here, including meeting minutes, can be read by anyone with the link.
