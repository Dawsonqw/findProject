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
