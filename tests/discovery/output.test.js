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
