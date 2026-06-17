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

  it('has enough query volume to target 20 accepted projects', () => {
    const queryCount = config.queryGroups.reduce((count, group) => count + group.queries.length, 0);

    expect(config.perPage).toBeGreaterThanOrEqual(50);
    expect(config.maxQueriesPerRun).toBeGreaterThanOrEqual(24);
    expect(config.maxQueriesPerRun).toBeLessThanOrEqual(28);
    expect(queryCount).toBeGreaterThanOrEqual(50);
  });
});
