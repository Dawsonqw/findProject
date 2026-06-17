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
  return Boolean(
    seen.repositories[String(project.id)] ||
      Object.values(seen.repositories).some((item) => item.full_name === project.full_name)
  );
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
