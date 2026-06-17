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
