# GitHub Project Discovery Static Site Design

## Context

The project starts from an empty directory. The goal is to build a static, GitHub-hosted discovery tool that automatically searches GitHub for small, interesting open-source projects that may be suitable for secondary development into apps or toys for non-technical users.

Target examples include desktop pets, floating widgets, lightweight games, Android toy apps, Windows utilities, WeChat mini programs, and other playful or practical projects that are not necessarily popular.

## Goals

- Run automatically every day from GitHub Actions.
- Discover 20 new, non-duplicate GitHub repositories per run.
- Keep intermediate results as plain files that can be deleted manually.
- Generate both Markdown and CSV output for human research.
- Serve a static web page from GitHub Pages.
- Avoid databases and server-side application code in the first version.
- Prefer cold or moderately known projects over highly popular infrastructure projects.

## Non-Goals

- No user account system.
- No online write-back for favorites, notes, or review status.
- No source-code cloning or deep code analysis in the first version.
- No paid external services.
- No guarantee that every result is immediately buildable or maintained.

## Recommended Approach

Use a pure static data pipeline:

1. A scheduled GitHub Actions workflow runs a discovery script once per day and can also be triggered manually.
2. The script searches GitHub repositories with a curated keyword pool.
3. It filters and ranks candidates.
4. It removes repositories already present in `data/seen.json`.
5. It appends up to 20 new projects to durable data files.
6. The static site reads `data/projects.json` and renders a browsable project list.
7. GitHub Pages publishes the site.

This keeps the system simple, cheap, and easy to maintain. It also makes cleanup explicit: the user can delete generated Markdown or CSV files periodically, while keeping `data/seen.json` if they want duplicate prevention to continue.

## Data Sources

The first version uses GitHub Repository Search through GitHub's REST API.

Search uses mixed keyword groups:

- Desktop and Windows: `desktop pet`, `floating widget`, `tray app`, `screensaver`, `wallpaper`, `electron app`, `tauri app`, `desktop toy`.
- Games and playful tools: `mini game`, `pygame`, `godot`, `virtual pet`, `pixel pet`, `idle game`, `toy app`.
- Android and mobile: `android toy`, `android widget`, `flutter game`, `kotlin app`, `compose app`.
- Mini program: `wechat mini program`, `miniprogram`, `uni-app`, `taro`, `微信小程序`.
- Utility ideas: `clipboard tool`, `habit tracker`, `pomodoro`, `note widget`, `timer widget`.

The keyword pool should live in a configuration file so it can be adjusted without changing the core logic.

## Filtering And Ranking

The filter is intentionally heuristic. It should select projects that look fun, small, or adaptable, not merely popular.

Default filters:

- Repository is public and not archived.
- Stars are within a configurable range, initially `5` to `2000`.
- Repository has a description or README signal.
- Repository has been pushed within the last few years.
- Repository is not obviously a list, framework, template collection, SDK, enterprise backend, algorithm library, or tutorial-only repository.

Ranking signals:

- Positive keywords in name, description, topics, or README snippet.
- Platform confidence: desktop, Windows, Android, mini program, game, tool, unknown.
- Practicality for secondary development.
- Simplicity indicators such as small-app keywords, focused descriptions, and non-enterprise language.
- Cold-project preference by slightly favoring moderate star counts over very high star counts.

Each selected project receives:

- `platform` tags.
- `category` tags.
- A short discovery reason.
- A suggested secondary-development direction.

## Deduplication

Deduplication uses `data/seen.json`.

The file stores stable repository identifiers:

- GitHub repository id.
- `owner/name`.
- First seen date.
- First seen source query.

During each run, candidates already present in `seen.json` are skipped. New projects are added to `seen.json` only after they are accepted into that day's final 20 results.

Manual cleanup behavior:

- Deleting old Markdown files does not affect deduplication.
- Deleting CSV snapshots does not affect deduplication.
- Deleting `data/seen.json` resets the discovery memory and allows old projects to appear again.

## File Outputs

The system writes these files:

- `data/projects.json`: cumulative normalized project data for the static site.
- `data/projects.csv`: cumulative tabular data for spreadsheet review.
- `docs/discoveries/YYYY-MM-DD.md`: daily human-readable research notes.
- `data/seen.json`: deduplication state.
- `data/latest.json`: compact metadata for the latest run, including run date, count, and failures.

The Markdown output should include:

- Project name and GitHub URL.
- Platform and category tags.
- Stars, primary language, license, last pushed date.
- One-sentence reason it was selected.
- Suggested secondary-development idea.
- Search query that found it.

The CSV output should include enough columns for sorting and manual filtering:

- `date_found`
- `full_name`
- `url`
- `description`
- `platforms`
- `categories`
- `language`
- `stars`
- `forks`
- `license`
- `last_pushed_at`
- `reason`
- `dev_idea`
- `source_query`

## Static Site

The site is a single static page with local assets and no backend.

Required UI:

- Search box for name, description, tags, and language.
- Platform filter: all, desktop, Windows, Android, mini program, game, tool, unknown.
- Category filter.
- Sort controls: date found, stars, last pushed date.
- Project cards showing the key research fields.
- Direct GitHub links.
- Links to Markdown and CSV files.
- A small run-status area showing the latest run date and number of new projects.

The page reads from `data/projects.json`. If the file is missing or malformed, it should show a clear empty/error state without breaking the whole page.

## Automation

GitHub Actions workflow:

- `discover-and-publish.yml`: scheduled daily run plus manual `workflow_dispatch`; discovers projects, commits generated files, builds the static site, and deploys it to GitHub Pages.

The discovery workflow should:

1. Check out the repository.
2. Set up the runtime.
3. Run the discovery script.
4. Commit changed data and document files back to the default branch when new projects were found.
5. Upload the static site artifact and deploy it to GitHub Pages.

The schedule should avoid the top of the hour to reduce contention, for example `23 2 * * *` UTC.

GitHub documentation confirms that workflows can use `schedule` events and that Pages can publish through GitHub Actions. GitHub's REST API rate limit endpoint also reports separate search limits, so the workflow must keep query volume modest and handle rate-limit failures gracefully.

## Error Handling

The script should not corrupt existing data if a run fails.

Expected behavior:

- If GitHub search fails for one query, continue with other queries.
- If rate limited, stop searching and write a run-status warning.
- If fewer than 20 new projects are found, write the smaller result set instead of forcing weak matches.
- If no new projects are found, update latest run metadata but avoid unnecessary data churn.
- Write files atomically where practical.
- Validate generated JSON before committing.

## Configuration

Use a checked-in configuration file for:

- Daily target count, initially `20`.
- Star range.
- Maximum queries per run.
- Keyword groups.
- Exclusion keywords.
- Platform-tagging rules.

This lets the user tune discovery quality without editing program logic.

## Testing

Tests should cover:

- Deduplication from `seen.json`.
- Candidate filtering.
- Ranking stability for sample repositories.
- Markdown generation.
- CSV generation and escaping.
- JSON schema shape.
- Static page behavior with empty and populated data.

The first implementation should include a small fixture set so tests do not depend on live GitHub responses.

## Deployment Notes

The repository should be pushed to GitHub. GitHub Pages should be configured to deploy using GitHub Actions. The workflow can use the default `GITHUB_TOKEN` for repository writes and Pages deployment permissions.

If API quota becomes a problem, a GitHub token can be added as a repository secret later, but the first design should avoid requiring extra setup beyond enabling Actions and Pages.

## Confirmed Decisions

- The first version will not support persistent in-browser notes or favorites.
- The user can periodically delete generated Markdown and CSV files.
- `data/seen.json` should be kept unless the user wants to intentionally reset duplicate prevention.
