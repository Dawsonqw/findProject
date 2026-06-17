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
