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
