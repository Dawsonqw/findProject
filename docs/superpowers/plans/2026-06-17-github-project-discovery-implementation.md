# GitHub Project Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub project discovery site that runs daily, finds 20 new non-duplicate repositories, and writes Markdown, CSV, JSON, and web output.

**Architecture:** A Node.js discovery script reads checked-in configuration, calls GitHub Repository Search, filters and ranks candidates, updates file-backed data, and commits generated files from GitHub Actions. The static site is a plain HTML/CSS/JS app that reads `data/projects.json` and `data/latest.json`.

**Tech Stack:** Node.js 20, ECMAScript modules, Vitest, GitHub REST API, GitHub Actions, GitHub Pages, plain HTML/CSS/JavaScript.

---

## File Structure

- Create `package.json`: npm scripts, runtime metadata, Vitest dev dependency.
- Create `vitest.config.js`: test configuration for Node tests and browser-like static-site tests.
- Create `config/discovery.json`: daily count, star range, query groups, exclusion terms, tagging rules.
- Create `src/discovery/scoring.js`: filtering, platform/category tagging, reasons, development ideas, ranking.
- Create `src/discovery/state.js`: load/save JSON, seen-state handling, atomic write helper.
- Create `src/discovery/github.js`: GitHub API client with rate-limit and error handling.
- Create `src/discovery/output.js`: generate `projects.json`, `projects.csv`, daily Markdown, and `latest.json`.
- Create `src/discovery/run.js`: orchestration entrypoint used by CLI and GitHub Actions.
- Create `scripts/discover.js`: executable wrapper for `runDiscovery`.
- Create `index.html`: static app shell published at the Pages root.
- Create `styles.css`: responsive dashboard styling.
- Create `app.js`: fetch data, filter, sort, render project cards.
- Create `tests/fixtures/repos.js`: representative GitHub repository fixtures.
- Create `tests/discovery/*.test.js`: unit tests for filtering, dedupe, output, and orchestration.
- Create `tests/site/app.test.js`: static page data logic tests through exported pure helpers.
- Create `.github/workflows/discover-and-publish.yml`: daily/manual discovery and Pages deployment.
- Create `.gitignore`: ignore dependencies, coverage, temp files, and local env files.
- Create `README.md`: setup, local run, deployment, cleanup, and tuning instructions.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Create npm project metadata**

Create `package.json`:

```json
{
  "name": "github-project-discovery",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "discover": "node scripts/discover.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm test"
  },
  "devDependencies": {
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
```

- [ ] **Step 3: Create git ignore rules**

Create `.gitignore`:

```gitignore
node_modules/
coverage/
.env
.env.*
.DS_Store
tmp/
*.tmp
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and `npm` exits with code `0`.

- [ ] **Step 5: Run empty test command**

Run:

```bash
npm test -- --passWithNoTests
```

Expected: Vitest exits with code `0`.

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json package-lock.json vitest.config.js .gitignore
git commit -m "chore: scaffold node project"
```

---

### Task 2: Discovery Configuration

**Files:**
- Create: `config/discovery.json`
- Test: `tests/discovery/config.test.js`

- [ ] **Step 1: Write failing config validation test**

Create `tests/discovery/config.test.js`:

```js
import { describe, expect, it } from 'vitest';
import config from '../../config/discovery.json' with { type: 'json' };

describe('discovery config', () => {
  it('sets the daily target to 20 projects', () => {
    expect(config.dailyTarget).toBe(20);
  });

  it('contains mixed platform query groups', () => {
    const groupNames = config.queryGroups.map((group) => group.name);

    expect(groupNames).toContain('desktop');
    expect(groupNames).toContain('games');
    expect(groupNames).toContain('android');
    expect(groupNames).toContain('mini-program');
    expect(groupNames).toContain('utilities');
  });

  it('defines a moderate star range for cold-project discovery', () => {
    expect(config.starRange).toEqual({ min: 5, max: 2000 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/discovery/config.test.js
```

Expected: FAIL because `config/discovery.json` does not exist.

- [ ] **Step 3: Add checked-in discovery config**

Create `config/discovery.json`:

```json
{
  "dailyTarget": 20,
  "maxQueriesPerRun": 18,
  "perPage": 20,
  "starRange": {
    "min": 5,
    "max": 2000
  },
  "pushedWithinYears": 5,
  "queryGroups": [
    {
      "name": "desktop",
      "platforms": ["desktop", "windows"],
      "queries": ["desktop pet", "floating widget", "tray app", "screensaver", "wallpaper app", "electron toy", "tauri app", "desktop toy"]
    },
    {
      "name": "games",
      "platforms": ["game"],
      "queries": ["mini game", "pygame toy", "godot mini game", "virtual pet", "pixel pet", "idle game", "toy app"]
    },
    {
      "name": "android",
      "platforms": ["android"],
      "queries": ["android toy", "android widget", "flutter game", "kotlin app", "compose app"]
    },
    {
      "name": "mini-program",
      "platforms": ["mini-program"],
      "queries": ["wechat mini program", "miniprogram", "uni-app toy", "taro app", "微信小程序"]
    },
    {
      "name": "utilities",
      "platforms": ["tool"],
      "queries": ["clipboard tool", "habit tracker", "pomodoro widget", "note widget", "timer widget"]
    }
  ],
  "excludeKeywords": ["awesome", "framework", "sdk", "boilerplate", "template", "tutorial", "course", "algorithm", "leetcode", "backend", "serverless", "starter"],
  "platformRules": {
    "desktop": ["desktop", "electron", "tauri", "tray", "widget", "screen", "wallpaper", "pet"],
    "windows": ["windows", "win32", "wpf", "uwp", ".net"],
    "android": ["android", "kotlin", "compose", "flutter"],
    "mini-program": ["wechat", "miniprogram", "mini program", "微信小程序", "uni-app", "taro"],
    "game": ["game", "pygame", "godot", "pet", "idle", "pixel"],
    "tool": ["clipboard", "timer", "pomodoro", "habit", "note", "utility"]
  },
  "categoryRules": {
    "pet": ["pet", "virtual pet", "desktop pet", "pixel pet"],
    "widget": ["widget", "floating", "tray"],
    "game": ["game", "pygame", "godot", "idle"],
    "productivity": ["clipboard", "timer", "pomodoro", "habit", "note"],
    "visual": ["wallpaper", "screensaver", "pixel"]
  }
}
```

- [ ] **Step 4: Run config test**

Run:

```bash
npm test -- tests/discovery/config.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit config**

```bash
git add config/discovery.json tests/discovery/config.test.js
git commit -m "feat: add discovery configuration"
```

---

### Task 3: Candidate Filtering And Scoring

**Files:**
- Create: `tests/fixtures/repos.js`
- Create: `tests/discovery/scoring.test.js`
- Create: `src/discovery/scoring.js`

- [ ] **Step 1: Add repository fixtures**

Create `tests/fixtures/repos.js`:

```js
export const desktopPetRepo = {
  id: 101,
  full_name: 'alice/pixel-desktop-pet',
  html_url: 'https://github.com/alice/pixel-desktop-pet',
  name: 'pixel-desktop-pet',
  description: 'A tiny pixel desktop pet that walks around your screen',
  stargazers_count: 128,
  forks_count: 12,
  language: 'JavaScript',
  archived: false,
  fork: false,
  pushed_at: '2026-05-20T00:00:00Z',
  topics: ['desktop', 'pet', 'electron'],
  license: { spdx_id: 'MIT' }
};

export const androidWidgetRepo = {
  id: 102,
  full_name: 'bob/compose-habit-widget',
  html_url: 'https://github.com/bob/compose-habit-widget',
  name: 'compose-habit-widget',
  description: 'Small Android habit widget built with Kotlin Compose',
  stargazers_count: 64,
  forks_count: 4,
  language: 'Kotlin',
  archived: false,
  fork: false,
  pushed_at: '2025-11-02T00:00:00Z',
  topics: ['android', 'widget', 'compose'],
  license: { spdx_id: 'Apache-2.0' }
};

export const excludedAwesomeRepo = {
  id: 103,
  full_name: 'carol/awesome-desktop-apps',
  html_url: 'https://github.com/carol/awesome-desktop-apps',
  name: 'awesome-desktop-apps',
  description: 'Awesome list of desktop applications',
  stargazers_count: 900,
  forks_count: 80,
  language: null,
  archived: false,
  fork: false,
  pushed_at: '2026-01-01T00:00:00Z',
  topics: ['awesome', 'list'],
  license: null
};

export const tooPopularRepo = {
  id: 104,
  full_name: 'delta/popular-framework',
  html_url: 'https://github.com/delta/popular-framework',
  name: 'popular-framework',
  description: 'A framework for building every application',
  stargazers_count: 50000,
  forks_count: 2000,
  language: 'TypeScript',
  archived: false,
  fork: false,
  pushed_at: '2026-04-01T00:00:00Z',
  topics: ['framework'],
  license: { spdx_id: 'MIT' }
};
```

- [ ] **Step 2: Write failing scoring tests**

Create `tests/discovery/scoring.test.js`:

```js
import { describe, expect, it } from 'vitest';
import config from '../../config/discovery.json' with { type: 'json' };
import { enrichRepository, filterRepository, rankProjects } from '../../src/discovery/scoring.js';
import { androidWidgetRepo, desktopPetRepo, excludedAwesomeRepo, tooPopularRepo } from '../fixtures/repos.js';

describe('filterRepository', () => {
  it('accepts a focused playful desktop project', () => {
    expect(filterRepository(desktopPetRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(true);
  });

  it('rejects awesome lists and overly popular frameworks', () => {
    expect(filterRepository(excludedAwesomeRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
    expect(filterRepository(tooPopularRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
  });
});

describe('enrichRepository', () => {
  it('assigns platform tags, reason, and development idea', () => {
    const project = enrichRepository(desktopPetRepo, {
      config,
      dateFound: '2026-06-17',
      sourceQuery: 'desktop pet'
    });

    expect(project.full_name).toBe('alice/pixel-desktop-pet');
    expect(project.platforms).toContain('desktop');
    expect(project.platforms).toContain('game');
    expect(project.categories).toContain('pet');
    expect(project.reason).toContain('desktop pet');
    expect(project.dev_idea).toContain('non-technical users');
  });

  it('recognizes Android widget projects', () => {
    const project = enrichRepository(androidWidgetRepo, {
      config,
      dateFound: '2026-06-17',
      sourceQuery: 'android widget'
    });

    expect(project.platforms).toContain('android');
    expect(project.categories).toContain('widget');
  });
});

describe('rankProjects', () => {
  it('prefers focused playful projects over generic utilities when scores differ', () => {
    const projects = [
      enrichRepository(androidWidgetRepo, { config, dateFound: '2026-06-17', sourceQuery: 'android widget' }),
      enrichRepository(desktopPetRepo, { config, dateFound: '2026-06-17', sourceQuery: 'desktop pet' })
    ];

    expect(rankProjects(projects)[0].full_name).toBe('alice/pixel-desktop-pet');
  });
});
```

- [ ] **Step 3: Run scoring tests to verify they fail**

Run:

```bash
npm test -- tests/discovery/scoring.test.js
```

Expected: FAIL because `src/discovery/scoring.js` does not exist.

- [ ] **Step 4: Implement scoring module**

Create `src/discovery/scoring.js`:

```js
const DAY_MS = 24 * 60 * 60 * 1000;

function searchableText(repo) {
  return [
    repo.full_name,
    repo.name,
    repo.description,
    repo.language,
    ...(repo.topics ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function yearsSince(dateText, now) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return (now.getTime() - date.getTime()) / (365 * DAY_MS);
}

export function filterRepository(repo, config, now = new Date()) {
  if (!repo || repo.archived || repo.fork) return false;
  const stars = repo.stargazers_count ?? 0;
  if (stars < config.starRange.min || stars > config.starRange.max) return false;
  if (yearsSince(repo.pushed_at, now) > config.pushedWithinYears) return false;

  const text = searchableText(repo);
  if (!repo.description && text.trim().length === 0) return false;
  if (matchesAny(text, config.excludeKeywords)) return false;

  return true;
}

function tagsFromRules(repo, rules) {
  const text = searchableText(repo);
  return Object.entries(rules)
    .filter(([, words]) => matchesAny(text, words))
    .map(([tag]) => tag);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function scoreProject(project) {
  let score = 0;
  score += project.categories.includes('pet') ? 8 : 0;
  score += project.categories.includes('game') ? 5 : 0;
  score += project.categories.includes('widget') ? 4 : 0;
  score += project.platforms.includes('desktop') ? 3 : 0;
  score += project.platforms.includes('android') ? 3 : 0;
  score += project.platforms.includes('mini-program') ? 3 : 0;
  score += project.stars >= 20 && project.stars <= 500 ? 4 : 0;
  score += project.description.length > 0 ? 2 : 0;
  return score;
}

function buildReason(project, sourceQuery) {
  const platformText = project.platforms.length ? project.platforms.join(', ') : 'unknown platform';
  const categoryText = project.categories.length ? project.categories.join(', ') : 'interesting app';
  return `Matched "${sourceQuery}" as a ${platformText} project with ${categoryText} signals.`;
}

function buildDevIdea(project) {
  if (project.categories.includes('pet')) {
    return 'Turn it into a configurable desktop companion for non-technical users.';
  }
  if (project.categories.includes('game')) {
    return 'Package the core interaction as a simple casual game with presets for non-technical users.';
  }
  if (project.categories.includes('widget')) {
    return 'Make it a polished widget with themes, one-click setup, and simple settings for non-technical users.';
  }
  if (project.platforms.includes('android')) {
    return 'Wrap the idea as a focused Android app with friendly onboarding for non-technical users.';
  }
  return 'Simplify setup, add presets, and expose the main behavior through a friendly UI for non-technical users.';
}

export function enrichRepository(repo, { config, dateFound, sourceQuery }) {
  const platforms = uniqueSorted(tagsFromRules(repo, config.platformRules));
  const categories = uniqueSorted(tagsFromRules(repo, config.categoryRules));
  const project = {
    date_found: dateFound,
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    url: repo.html_url,
    description: repo.description ?? '',
    platforms: platforms.length ? platforms : ['unknown'],
    categories,
    language: repo.language ?? '',
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    license: repo.license?.spdx_id ?? '',
    last_pushed_at: repo.pushed_at,
    reason: '',
    dev_idea: '',
    source_query: sourceQuery
  };

  project.reason = buildReason(project, sourceQuery);
  project.dev_idea = buildDevIdea(project);
  project.score = scoreProject(project);
  return project;
}

export function rankProjects(projects) {
  return [...projects].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.full_name.localeCompare(b.full_name);
  });
}
```

- [ ] **Step 5: Run scoring tests**

Run:

```bash
npm test -- tests/discovery/scoring.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit scoring**

```bash
git add src/discovery/scoring.js tests/fixtures/repos.js tests/discovery/scoring.test.js
git commit -m "feat: score discovery candidates"
```

---

### Task 4: File State And Deduplication

**Files:**
- Create: `tests/discovery/state.test.js`
- Create: `src/discovery/state.js`

- [ ] **Step 1: Write failing state tests**

Create `tests/discovery/state.test.js`:

```js
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadJson, mergeSeen, saveJsonAtomic, unseenProjects } from '../../src/discovery/state.js';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'project-discovery-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('state helpers', () => {
  it('loads fallback data when a JSON file is missing', async () => {
    await expect(loadJson(join(dir, 'missing.json'), { items: [] })).resolves.toEqual({ items: [] });
  });

  it('writes JSON atomically with stable formatting', async () => {
    const target = join(dir, 'data.json');
    await saveJsonAtomic(target, { b: 2, a: 1 });

    expect(await readFile(target, 'utf8')).toBe('{\n  "b": 2,\n  "a": 1\n}\n');
  });

  it('filters projects already in seen state', () => {
    const projects = [
      { id: 101, full_name: 'alice/pixel-desktop-pet' },
      { id: 102, full_name: 'bob/compose-habit-widget' }
    ];
    const seen = {
      repositories: {
        '101': { full_name: 'alice/pixel-desktop-pet' }
      }
    };

    expect(unseenProjects(projects, seen)).toEqual([{ id: 102, full_name: 'bob/compose-habit-widget' }]);
  });

  it('merges accepted projects into seen state', () => {
    const seen = { repositories: {} };
    const merged = mergeSeen(seen, [{ id: 101, full_name: 'alice/pixel-desktop-pet', source_query: 'desktop pet' }], '2026-06-17');

    expect(merged.repositories['101']).toEqual({
      full_name: 'alice/pixel-desktop-pet',
      first_seen_at: '2026-06-17',
      source_query: 'desktop pet'
    });
  });
});
```

- [ ] **Step 2: Run state tests to verify they fail**

Run:

```bash
npm test -- tests/discovery/state.test.js
```

Expected: FAIL because `src/discovery/state.js` does not exist.

- [ ] **Step 3: Implement state helpers**

Create `src/discovery/state.js`:

```js
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function saveJsonAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}

export function emptySeenState() {
  return { repositories: {} };
}

export function isSeen(project, seen) {
  return Boolean(seen.repositories[String(project.id)] || Object.values(seen.repositories).some((item) => item.full_name === project.full_name));
}

export function unseenProjects(projects, seen) {
  return projects.filter((project) => !isSeen(project, seen));
}

export function mergeSeen(seen, projects, dateFound) {
  const repositories = { ...seen.repositories };
  for (const project of projects) {
    repositories[String(project.id)] = {
      full_name: project.full_name,
      first_seen_at: dateFound,
      source_query: project.source_query
    };
  }
  return { repositories };
}
```

- [ ] **Step 4: Run state tests**

Run:

```bash
npm test -- tests/discovery/state.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit state helpers**

```bash
git add src/discovery/state.js tests/discovery/state.test.js
git commit -m "feat: add discovery state helpers"
```

---

### Task 5: Output Writers

**Files:**
- Create: `tests/discovery/output.test.js`
- Create: `src/discovery/output.js`

- [ ] **Step 1: Write failing output tests**

Create `tests/discovery/output.test.js`:

```js
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeOutputs } from '../../src/discovery/output.js';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'project-discovery-output-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const project = {
  date_found: '2026-06-17',
  id: 101,
  full_name: 'alice/pixel-desktop-pet',
  name: 'pixel-desktop-pet',
  url: 'https://github.com/alice/pixel-desktop-pet',
  description: 'A tiny pixel desktop pet, with comma',
  platforms: ['desktop', 'game'],
  categories: ['pet'],
  language: 'JavaScript',
  stars: 128,
  forks: 12,
  license: 'MIT',
  last_pushed_at: '2026-05-20T00:00:00Z',
  reason: 'Matched "desktop pet" as a desktop project.',
  dev_idea: 'Turn it into a configurable desktop companion for non-technical users.',
  source_query: 'desktop pet',
  score: 20
};

describe('writeOutputs', () => {
  it('writes JSON, CSV, Markdown, and latest metadata', async () => {
    await writeOutputs({
      rootDir: dir,
      allProjects: [project],
      newProjects: [project],
      dateFound: '2026-06-17',
      warnings: []
    });

    const projectsJson = JSON.parse(await readFile(join(dir, 'data/projects.json'), 'utf8'));
    expect(projectsJson.projects).toHaveLength(1);

    const csv = await readFile(join(dir, 'data/projects.csv'), 'utf8');
    expect(csv).toContain('"A tiny pixel desktop pet, with comma"');
    expect(csv).toContain('alice/pixel-desktop-pet');

    const markdown = await readFile(join(dir, 'docs/discoveries/2026-06-17.md'), 'utf8');
    expect(markdown).toContain('# GitHub Project Discoveries - 2026-06-17');
    expect(markdown).toContain('pixel-desktop-pet');

    const latest = JSON.parse(await readFile(join(dir, 'data/latest.json'), 'utf8'));
    expect(latest.new_count).toBe(1);
    expect(latest.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Run output tests to verify they fail**

Run:

```bash
npm test -- tests/discovery/output.test.js
```

Expected: FAIL because `src/discovery/output.js` does not exist.

- [ ] **Step 3: Implement output module**

Create `src/discovery/output.js`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { saveJsonAtomic } from './state.js';

const CSV_COLUMNS = [
  'date_found',
  'full_name',
  'url',
  'description',
  'platforms',
  'categories',
  'language',
  'stars',
  'forks',
  'license',
  'last_pushed_at',
  'reason',
  'dev_idea',
  'source_query'
];

function csvValue(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function projectsToCsv(projects) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const project of projects) {
    rows.push(CSV_COLUMNS.map((column) => csvValue(project[column])).join(','));
  }
  return `${rows.join('\n')}\n`;
}

export function projectsToMarkdown(projects, dateFound) {
  const lines = [`# GitHub Project Discoveries - ${dateFound}`, ''];
  if (projects.length === 0) {
    lines.push('No new projects found for this run.');
    return `${lines.join('\n')}\n`;
  }

  projects.forEach((project, index) => {
    lines.push(`## ${index + 1}. ${project.name}`);
    lines.push('');
    lines.push(`- Repository: [${project.full_name}](${project.url})`);
    lines.push(`- Platforms: ${project.platforms.join(', ')}`);
    lines.push(`- Categories: ${project.categories.join(', ') || 'uncategorized'}`);
    lines.push(`- Language: ${project.language || 'unknown'}`);
    lines.push(`- Stars: ${project.stars}`);
    lines.push(`- Forks: ${project.forks}`);
    lines.push(`- License: ${project.license || 'unknown'}`);
    lines.push(`- Last pushed: ${project.last_pushed_at}`);
    lines.push(`- Source query: ${project.source_query}`);
    lines.push(`- Why it matched: ${project.reason}`);
    lines.push(`- Secondary development idea: ${project.dev_idea}`);
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

export async function writeOutputs({ rootDir, allProjects, newProjects, dateFound, warnings }) {
  const dataDir = join(rootDir, 'data');
  const docsDir = join(rootDir, 'docs/discoveries');
  await mkdir(dataDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  await saveJsonAtomic(join(dataDir, 'projects.json'), {
    generated_at: new Date().toISOString(),
    total_count: allProjects.length,
    projects: allProjects
  });

  await writeFile(join(dataDir, 'projects.csv'), projectsToCsv(allProjects), 'utf8');
  await writeFile(join(docsDir, `${dateFound}.md`), projectsToMarkdown(newProjects, dateFound), 'utf8');
  await saveJsonAtomic(join(dataDir, 'latest.json'), {
    date: dateFound,
    new_count: newProjects.length,
    total_count: allProjects.length,
    warnings
  });
}
```

- [ ] **Step 4: Run output tests**

Run:

```bash
npm test -- tests/discovery/output.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit output writers**

```bash
git add src/discovery/output.js tests/discovery/output.test.js
git commit -m "feat: write discovery outputs"
```

---

### Task 6: GitHub Client And Orchestration

**Files:**
- Create: `tests/discovery/run.test.js`
- Create: `src/discovery/github.js`
- Create: `src/discovery/run.js`
- Create: `scripts/discover.js`

- [ ] **Step 1: Write failing orchestration test**

Create `tests/discovery/run.test.js`:

```js
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import config from '../../config/discovery.json' with { type: 'json' };
import { runDiscovery } from '../../src/discovery/run.js';
import { androidWidgetRepo, desktopPetRepo } from '../fixtures/repos.js';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'project-discovery-run-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runDiscovery', () => {
  it('discovers unseen repositories and writes all state files', async () => {
    const client = {
      async searchRepositories(query) {
        if (query.includes('desktop')) return [desktopPetRepo];
        if (query.includes('android')) return [androidWidgetRepo];
        return [];
      }
    };

    const result = await runDiscovery({
      rootDir: dir,
      config: { ...config, dailyTarget: 2, maxQueriesPerRun: 8 },
      client,
      now: new Date('2026-06-17T12:00:00Z')
    });

    expect(result.newProjects).toHaveLength(2);

    const seen = JSON.parse(await readFile(join(dir, 'data/seen.json'), 'utf8'));
    expect(Object.keys(seen.repositories)).toEqual(['101', '102']);

    const projects = JSON.parse(await readFile(join(dir, 'data/projects.json'), 'utf8'));
    expect(projects.total_count).toBe(2);
  });

  it('does not emit duplicates on a second run', async () => {
    const client = {
      async searchRepositories() {
        return [desktopPetRepo];
      }
    };

    await runDiscovery({
      rootDir: dir,
      config: { ...config, dailyTarget: 1, maxQueriesPerRun: 1 },
      client,
      now: new Date('2026-06-17T12:00:00Z')
    });
    const result = await runDiscovery({
      rootDir: dir,
      config: { ...config, dailyTarget: 1, maxQueriesPerRun: 1 },
      client,
      now: new Date('2026-06-18T12:00:00Z')
    });

    expect(result.newProjects).toEqual([]);
  });
});
```

- [ ] **Step 2: Run orchestration tests to verify they fail**

Run:

```bash
npm test -- tests/discovery/run.test.js
```

Expected: FAIL because `src/discovery/run.js` does not exist.

- [ ] **Step 3: Implement GitHub client**

Create `src/discovery/github.js`:

```js
export class GitHubSearchError extends Error {
  constructor(message, { status, rateLimited = false } = {}) {
    super(message);
    this.name = 'GitHubSearchError';
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export class GitHubClient {
  constructor({ token = process.env.GITHUB_TOKEN, fetchImpl = globalThis.fetch } = {}) {
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async searchRepositories(query, { perPage = 20 } = {}) {
    const url = new URL('https://api.github.com/search/repositories');
    url.searchParams.set('q', `${query} in:name,description,readme archived:false fork:false`);
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(perPage));

    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'github-project-discovery'
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(url, { headers });
    if (response.status === 403 || response.status === 429) {
      throw new GitHubSearchError(`GitHub search rate limited for query "${query}"`, {
        status: response.status,
        rateLimited: true
      });
    }
    if (!response.ok) {
      throw new GitHubSearchError(`GitHub search failed for query "${query}" with status ${response.status}`, {
        status: response.status
      });
    }

    const data = await response.json();
    return data.items ?? [];
  }
}
```

- [ ] **Step 4: Implement discovery orchestrator**

Create `src/discovery/run.js`:

```js
import { join } from 'node:path';
import configJson from '../../config/discovery.json' with { type: 'json' };
import { GitHubClient, GitHubSearchError } from './github.js';
import { writeOutputs } from './output.js';
import { enrichRepository, filterRepository, rankProjects } from './scoring.js';
import { emptySeenState, loadJson, mergeSeen, saveJsonAtomic, unseenProjects } from './state.js';

function dateOnly(now) {
  return now.toISOString().slice(0, 10);
}

function allQueries(config) {
  const queries = [];
  const maxGroupLength = Math.max(...config.queryGroups.map((group) => group.queries.length));
  for (let index = 0; index < maxGroupLength; index += 1) {
    for (const group of config.queryGroups) {
      if (group.queries[index]) {
        queries.push(group.queries[index]);
      }
    }
  }
  return queries.slice(0, config.maxQueriesPerRun);
}

export async function runDiscovery({
  rootDir = process.cwd(),
  config = configJson,
  client = new GitHubClient(),
  now = new Date()
} = {}) {
  const dateFound = dateOnly(now);
  const seenPath = join(rootDir, 'data/seen.json');
  const projectsPath = join(rootDir, 'data/projects.json');
  const seen = await loadJson(seenPath, emptySeenState());
  const existingData = await loadJson(projectsPath, { projects: [] });
  const warnings = [];
  const candidates = [];

  for (const query of allQueries(config)) {
    if (candidates.length >= config.dailyTarget * 4) break;
    try {
      const repos = await client.searchRepositories(query, { perPage: config.perPage });
      for (const repo of repos) {
        if (filterRepository(repo, config, now)) {
          candidates.push(enrichRepository(repo, { config, dateFound, sourceQuery: query }));
        }
      }
    } catch (error) {
      if (error instanceof GitHubSearchError && error.rateLimited) {
        warnings.push(error.message);
        break;
      }
      warnings.push(error.message);
    }
  }

  const dedupedByRun = [...new Map(candidates.map((project) => [project.id, project])).values()];
  const ranked = rankProjects(unseenProjects(dedupedByRun, seen));
  const newProjects = ranked.slice(0, config.dailyTarget);
  const allProjects = [...existingData.projects, ...newProjects];
  const nextSeen = mergeSeen(seen, newProjects, dateFound);

  await writeOutputs({ rootDir, allProjects, newProjects, dateFound, warnings });
  await saveJsonAtomic(seenPath, nextSeen);

  return { dateFound, newProjects, warnings };
}
```

- [ ] **Step 5: Implement CLI wrapper**

Create `scripts/discover.js`:

```js
#!/usr/bin/env node
import { runDiscovery } from '../src/discovery/run.js';

try {
  const result = await runDiscovery();
  console.log(`Discovery complete: ${result.newProjects.length} new projects for ${result.dateFound}`);
  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
```

- [ ] **Step 6: Run orchestration tests**

Run:

```bash
npm test -- tests/discovery/run.test.js
```

Expected: PASS.

- [ ] **Step 7: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit orchestration**

```bash
git add src/discovery/github.js src/discovery/run.js scripts/discover.js tests/discovery/run.test.js
git commit -m "feat: orchestrate discovery runs"
```

---

### Task 7: Static Site

**Files:**
- Create: `tests/site/app.test.js`
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`

- [ ] **Step 1: Write failing static-site helper tests**

Create `tests/site/app.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { filterProjects, sortProjects } from '../../app.js';

const projects = [
  {
    full_name: 'alice/pixel-desktop-pet',
    description: 'Tiny desktop pet',
    platforms: ['desktop', 'game'],
    categories: ['pet'],
    language: 'JavaScript',
    stars: 128,
    last_pushed_at: '2026-05-20T00:00:00Z',
    date_found: '2026-06-17'
  },
  {
    full_name: 'bob/compose-habit-widget',
    description: 'Android habit widget',
    platforms: ['android'],
    categories: ['widget', 'productivity'],
    language: 'Kotlin',
    stars: 64,
    last_pushed_at: '2025-11-02T00:00:00Z',
    date_found: '2026-06-16'
  }
];

describe('site helpers', () => {
  it('filters by platform and search text', () => {
    expect(filterProjects(projects, { platform: 'android', category: 'all', search: 'habit' })).toEqual([projects[1]]);
  });

  it('sorts by stars descending', () => {
    expect(sortProjects(projects, 'stars')[0].full_name).toBe('alice/pixel-desktop-pet');
  });
});
```

- [ ] **Step 2: Run static-site tests to verify they fail**

Run:

```bash
npm test -- tests/site/app.test.js
```

Expected: FAIL because `app.js` does not exist.

- [ ] **Step 3: Implement static site JavaScript**

Create `app.js`:

```js
export function filterProjects(projects, { platform = 'all', category = 'all', search = '' } = {}) {
  const needle = search.trim().toLowerCase();
  return projects.filter((project) => {
    const platformMatch = platform === 'all' || project.platforms.includes(platform);
    const categoryMatch = category === 'all' || project.categories.includes(category);
    const text = [
      project.full_name,
      project.description,
      project.language,
      project.platforms.join(' '),
      project.categories.join(' ')
    ].join(' ').toLowerCase();
    const searchMatch = needle.length === 0 || text.includes(needle);
    return platformMatch && categoryMatch && searchMatch;
  });
}

export function sortProjects(projects, sortBy = 'date_found') {
  return [...projects].sort((a, b) => {
    if (sortBy === 'stars') return b.stars - a.stars;
    if (sortBy === 'last_pushed_at') return new Date(b.last_pushed_at) - new Date(a.last_pushed_at);
    return new Date(b.date_found) - new Date(a.date_found);
  });
}

function tagList(tags) {
  return tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
}

function renderProjects(projects) {
  const list = document.querySelector('[data-projects]');
  const count = document.querySelector('[data-count]');
  count.textContent = String(projects.length);
  if (projects.length === 0) {
    list.innerHTML = '<p class="empty">No projects match the current filters.</p>';
    return;
  }

  list.innerHTML = projects.map((project) => `
    <article class="project-card">
      <div class="project-card__header">
        <h2><a href="${project.url}" target="_blank" rel="noreferrer">${project.full_name}</a></h2>
        <span class="stars">${project.stars} stars</span>
      </div>
      <p>${project.description || 'No description provided.'}</p>
      <div class="tags">${tagList(project.platforms)}${tagList(project.categories)}</div>
      <dl>
        <div><dt>Language</dt><dd>${project.language || 'unknown'}</dd></div>
        <div><dt>Last pushed</dt><dd>${project.last_pushed_at}</dd></div>
        <div><dt>Found</dt><dd>${project.date_found}</dd></div>
      </dl>
      <p class="reason">${project.reason}</p>
      <p class="idea">${project.dev_idea}</p>
    </article>
  `).join('');
}

function stateFromControls() {
  return {
    platform: document.querySelector('[data-platform]').value,
    category: document.querySelector('[data-category]').value,
    search: document.querySelector('[data-search]').value,
    sortBy: document.querySelector('[data-sort]').value
  };
}

function populateCategoryFilter(projects) {
  const select = document.querySelector('[data-category]');
  const categories = [...new Set(projects.flatMap((project) => project.categories))].sort();
  select.innerHTML = '<option value="all">All categories</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');
}

async function loadData() {
  const [projectsResponse, latestResponse] = await Promise.all([
    fetch('./data/projects.json'),
    fetch('./data/latest.json')
  ]);
  if (!projectsResponse.ok) throw new Error('Unable to load project data.');
  const projectData = await projectsResponse.json();
  const latestData = latestResponse.ok ? await latestResponse.json() : null;
  return { projects: projectData.projects ?? [], latest: latestData };
}

async function boot() {
  const root = document.querySelector('[data-app]');
  if (!root) return;

  try {
    const { projects, latest } = await loadData();
    if (latest) {
      document.querySelector('[data-latest]').textContent = `${latest.date} · ${latest.new_count} new · ${latest.total_count} total`;
    }
    populateCategoryFilter(projects);
    const update = () => {
      const state = stateFromControls();
      renderProjects(sortProjects(filterProjects(projects, state), state.sortBy));
    };
    document.querySelectorAll('input, select').forEach((control) => control.addEventListener('input', update));
    update();
  } catch (error) {
    document.querySelector('[data-projects]').innerHTML = `<p class="empty">${error.message}</p>`;
  }
}

if (typeof document !== 'undefined') {
  boot();
}
```

- [ ] **Step 4: Create static HTML**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GitHub Project Discovery</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <main data-app>
      <header class="page-header">
        <div>
          <h1>GitHub Project Discovery</h1>
          <p>Small, playful repositories for secondary development research.</p>
        </div>
        <div class="status" data-latest>Loading latest run...</div>
      </header>

      <section class="toolbar" aria-label="Project filters">
        <input data-search type="search" aria-label="Search projects">
        <select data-platform>
          <option value="all">All platforms</option>
          <option value="desktop">Desktop</option>
          <option value="windows">Windows</option>
          <option value="android">Android</option>
          <option value="mini-program">Mini program</option>
          <option value="game">Game</option>
          <option value="tool">Tool</option>
          <option value="unknown">Unknown</option>
        </select>
        <select data-category>
          <option value="all">All categories</option>
        </select>
        <select data-sort>
          <option value="date_found">Newest found</option>
          <option value="stars">Stars</option>
          <option value="last_pushed_at">Recently pushed</option>
        </select>
      </section>

      <nav class="links" aria-label="Data files">
        <a href="./data/projects.csv">CSV</a>
        <a href="./data/projects.json">JSON</a>
        <a href="./docs/discoveries/">Markdown discoveries</a>
        <span><strong data-count>0</strong> visible</span>
      </nav>

      <section class="project-list" data-projects>
        <p class="empty">Loading projects...</p>
      </section>
    </main>
    <script type="module" src="./app.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Create static CSS**

Create `styles.css`:

```css
:root {
  color-scheme: light;
  --bg: #f7f7f4;
  --surface: #ffffff;
  --text: #1e2428;
  --muted: #667078;
  --line: #d9ded8;
  --accent: #256f5b;
  --accent-2: #8a4f2b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

main {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 24px;
}

h1 {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.15;
}

p {
  line-height: 1.55;
}

.page-header p,
.status,
.empty,
dt {
  color: var(--muted);
}

.status {
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 8px;
  white-space: nowrap;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, 190px));
  gap: 12px;
  margin-bottom: 14px;
}

input,
select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 0 12px;
  font: inherit;
}

.links {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  color: var(--muted);
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.project-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.project-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
}

.project-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.project-card h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.stars {
  color: var(--accent-2);
  font-weight: 700;
  white-space: nowrap;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.tag {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--muted);
  font-size: 12px;
}

dl {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}

dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

dt,
dd {
  margin: 0;
  font-size: 13px;
}

.reason,
.idea {
  margin-bottom: 0;
}

.idea {
  color: var(--accent);
  font-weight: 600;
}

.empty {
  grid-column: 1 / -1;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
}

@media (max-width: 760px) {
  .page-header,
  .project-card__header {
    flex-direction: column;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }

  .status,
  .stars {
    white-space: normal;
  }
}
```

- [ ] **Step 6: Run static-site tests**

Run:

```bash
npm test -- tests/site/app.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit static site**

```bash
git add index.html styles.css app.js tests/site/app.test.js
git commit -m "feat: add static discovery site"
```

---

### Task 8: GitHub Actions And Documentation

**Files:**
- Create: `.github/workflows/discover-and-publish.yml`
- Create: `README.md`
- Test: `npm test`, `npm run discover` with fixture client is already covered by orchestration tests.

- [ ] **Step 1: Create GitHub Actions workflow**

Create `.github/workflows/discover-and-publish.yml`:

```yaml
name: Discover and Publish

on:
  workflow_dispatch:
  schedule:
    - cron: '23 2 * * *'

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  discover:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run discovery
        run: npm run discover
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit discovery data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data docs/discoveries
          if git diff --cached --quiet; then
            echo "No discovery changes to commit"
          else
            git commit -m "data: update discovered projects"
            git push
          fi

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create README**

Create `README.md`:

```md
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
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
```

Expected: PASS.

Run:

```bash
npm run discover
```

Expected: The command exits with code `0`. If GitHub rate limits the run, `data/latest.json` contains a warning and existing generated data remains valid.

- [ ] **Step 4: Commit automation and docs**

```bash
git add .github/workflows/discover-and-publish.yml README.md
git commit -m "ci: add discovery and pages workflow"
```

---

### Task 9: Final Verification

**Files:**
- Read/verify: all files changed in previous tasks.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run discovery once locally**

Run:

```bash
npm run discover
```

Expected: Exits with code `0`; generated files exist under `data/` and `docs/discoveries/`.

- [ ] **Step 3: Check generated JSON validity**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('data/projects.json','utf8')); JSON.parse(require('fs').readFileSync('data/latest.json','utf8')); JSON.parse(require('fs').readFileSync('data/seen.json','utf8')); console.log('json ok')"
```

Expected: prints `json ok`.

- [ ] **Step 4: Check git status**

Run:

```bash
git status --short
```

Expected: only intentional generated data files are uncommitted if `npm run discover` found live projects after the final commit. Commit them if the user wants an initial data seed; leave them uncommitted if the user wants the first GitHub Actions run to seed data.

- [ ] **Step 5: Report completion**

Report:

- Tests run and result.
- Whether local discovery generated data.
- The GitHub Pages setup step the user must complete in repository settings.

---

## Self-Review Notes

- Spec coverage: daily GitHub Actions, 20 project target, Markdown/CSV/JSON outputs, static page, file-backed dedupe, config tuning, and rate-limit handling are covered by Tasks 2 through 8.
- Scope: the first version remains static and has no database, user accounts, source cloning, or online notes.
- Test strategy: unit tests use fixtures, and only final local discovery touches the live GitHub API.
