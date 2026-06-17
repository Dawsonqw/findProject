export function filterProjects(projects, { platform = 'all', category = 'all', search = '' } = {}) {
  const needle = search.trim().toLowerCase();
  return projects.filter((project) => {
    const platformMatch = platform === 'all' || project.platforms.includes(platform);
    const categoryMatch = category === 'all' || project.categories.includes(category);
    const text = [
      project.full_name,
      project.description,
      project.language,
      project.platforms.join(' '),
      project.categories.join(' ')
    ]
      .join(' ')
      .toLowerCase();
    const searchMatch = needle.length === 0 || text.includes(needle);
    return platformMatch && categoryMatch && searchMatch;
  });
}

export function sortProjects(projects, sortBy = 'date_found') {
  return [...projects].sort((a, b) => {
    if (sortBy === 'stars') return b.stars - a.stars;
    if (sortBy === 'last_pushed_at') return new Date(b.last_pushed_at) - new Date(a.last_pushed_at);
    return new Date(b.date_found) - new Date(a.date_found);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function tagList(tags) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function renderProjects(projects) {
  const list = document.querySelector('[data-projects]');
  const count = document.querySelector('[data-count]');
  count.textContent = String(projects.length);
  if (projects.length === 0) {
    list.innerHTML = '<p class="empty">No projects match the current filters.</p>';
    return;
  }

  list.innerHTML = projects
    .map(
      (project) => `
    <article class="project-card">
      <div class="project-card__header">
        <h2><a href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">${escapeHtml(project.full_name)}</a></h2>
        <span class="stars">${escapeHtml(project.stars)} stars</span>
      </div>
      <p>${escapeHtml(project.description || 'No description provided.')}</p>
      <div class="tags">${tagList(project.platforms)}${tagList(project.categories)}</div>
      <dl>
        <div><dt>Language</dt><dd>${escapeHtml(project.language || 'unknown')}</dd></div>
        <div><dt>Last pushed</dt><dd>${escapeHtml(project.last_pushed_at)}</dd></div>
        <div><dt>Found</dt><dd>${escapeHtml(project.date_found)}</dd></div>
      </dl>
      <p class="reason">${escapeHtml(project.reason)}</p>
      <p class="idea">${escapeHtml(project.dev_idea)}</p>
    </article>
  `
    )
    .join('');
}

function stateFromControls() {
  return {
    platform: document.querySelector('[data-platform]').value,
    category: document.querySelector('[data-category]').value,
    search: document.querySelector('[data-search]').value,
    sortBy: document.querySelector('[data-sort]').value
  };
}

function populateCategoryFilter(projects) {
  const select = document.querySelector('[data-category]');
  const categories = [...new Set(projects.flatMap((project) => project.categories))].sort();
  select.innerHTML =
    '<option value="all">All categories</option>' +
    categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
}

async function loadData() {
  const [projectsResponse, latestResponse] = await Promise.all([fetch('./data/projects.json'), fetch('./data/latest.json')]);
  if (!projectsResponse.ok) throw new Error('Unable to load project data.');
  const projectData = await projectsResponse.json();
  const latestData = latestResponse.ok ? await latestResponse.json() : null;
  return { projects: projectData.projects ?? [], latest: latestData };
}

async function boot() {
  const root = document.querySelector('[data-app]');
  if (!root) return;

  try {
    const { projects, latest } = await loadData();
    if (latest) {
      document.querySelector('[data-latest]').textContent = `${latest.date} · ${latest.new_count} new · ${latest.total_count} total`;
    }
    populateCategoryFilter(projects);
    const update = () => {
      const state = stateFromControls();
      renderProjects(sortProjects(filterProjects(projects, state), state.sortBy));
    };
    document.querySelectorAll('input, select').forEach((control) => control.addEventListener('input', update));
    update();
  } catch (error) {
    document.querySelector('[data-projects]').innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

if (typeof document !== 'undefined') {
  boot();
}
