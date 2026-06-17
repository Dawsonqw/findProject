const DAY_MS = 24 * 60 * 60 * 1000;

function searchableText(repo) {
  return [repo.full_name, repo.name, repo.description, repo.language, ...(repo.topics ?? [])]
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
