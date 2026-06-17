import { describe, expect, it } from 'vitest';
import config from '../../config/discovery.json' with { type: 'json' };
import { enrichRepository, filterRepository, rankProjects } from '../../src/discovery/scoring.js';
import {
  androidWidgetRepo,
  desktopPetRepo,
  excludedAwesomeRepo,
  keywordScraperRepo,
  kotlinMirrorRepo,
  tooPopularRepo
} from '../fixtures/repos.js';

describe('filterRepository', () => {
  it('accepts a focused playful desktop project', () => {
    expect(filterRepository(desktopPetRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(true);
  });

  it('rejects awesome lists and overly popular frameworks', () => {
    expect(filterRepository(excludedAwesomeRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
    expect(filterRepository(tooPopularRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
  });

  it('rejects backend scraping and language-only platform matches', () => {
    expect(filterRepository(keywordScraperRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
    expect(filterRepository(kotlinMirrorRepo, config, new Date('2026-06-17T00:00:00Z'))).toBe(false);
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
