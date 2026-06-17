# GitHub Project Discovery

Static GitHub project discovery for small, interesting repositories that may be useful for secondary development into playful apps, desktop toys, Android apps, Windows utilities, mini programs, or lightweight tools for non-technical users.

## Local Commands

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run discovery:

```bash
npm run discover
```

## Generated Files

- `data/projects.json`: cumulative data used by the static site.
- `data/projects.csv`: spreadsheet-friendly cumulative data.
- `data/latest.json`: latest run status.
- `data/seen.json`: duplicate-prevention memory.
- `docs/discoveries/YYYY-MM-DD.md`: daily research notes.

You can delete old Markdown files and CSV snapshots when they are no longer useful. Keep `data/seen.json` if you want the system to keep avoiding previously discovered projects.

## Deployment

Push this repository to GitHub, enable GitHub Pages with GitHub Actions as the source, and run the `Discover and Publish` workflow manually once. The workflow also runs daily at `02:23 UTC`.

## Tuning Discovery

Edit `config/discovery.json` to adjust:

- `dailyTarget`
- star range
- query groups
- exclusion keywords
- platform rules
- category rules

The default target is 20 new repositories per run.
