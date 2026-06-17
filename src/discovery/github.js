export class GitHubSearchError extends Error {
  constructor(message, { status, rateLimited = false } = {}) {
    super(message);
    this.name = 'GitHubSearchError';
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

export class GitHubClient {
  constructor({ token = process.env.GITHUB_TOKEN, fetchImpl = globalThis.fetch } = {}) {
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async searchRepositories(query, { perPage = 20, starRange, pushedAfter } = {}) {
    const url = new URL('https://api.github.com/search/repositories');
    const qualifiers = ['in:name,description,topics', 'archived:false', 'fork:false'];
    if (starRange) {
      qualifiers.push(`stars:${starRange.min}..${starRange.max}`);
    }
    if (pushedAfter) {
      qualifiers.push(`pushed:>${pushedAfter}`);
    }
    url.searchParams.set('q', `${query} ${qualifiers.join(' ')}`);
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', String(perPage));

    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'github-project-discovery'
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(url, { headers });
    if (response.status === 403 || response.status === 429) {
      throw new GitHubSearchError(`GitHub search rate limited for query "${query}"`, {
        status: response.status,
        rateLimited: true
      });
    }
    if (!response.ok) {
      throw new GitHubSearchError(`GitHub search failed for query "${query}" with status ${response.status}`, {
        status: response.status
      });
    }

    const data = await response.json();
    return data.items ?? [];
  }
}
