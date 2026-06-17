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
