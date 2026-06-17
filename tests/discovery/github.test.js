import { describe, expect, it } from 'vitest';
import { GitHubClient } from '../../src/discovery/github.js';

describe('GitHubClient', () => {
  it('searches repository metadata instead of README text and applies range qualifiers', async () => {
    let requestedUrl;
    const client = new GitHubClient({
      token: null,
      fetchImpl: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          status: 200,
          async json() {
            return { items: [] };
          }
        };
      }
    });

    await client.searchRepositories('desktop pet', {
      perPage: 50,
      starRange: { min: 5, max: 2000 },
      pushedAfter: '2021-06-17'
    });

    const query = requestedUrl.searchParams.get('q');
    expect(query).toContain('desktop pet');
    expect(query).toContain('in:name,description,topics');
    expect(query).toContain('stars:5..2000');
    expect(query).toContain('pushed:>2021-06-17');
    expect(query).not.toContain('readme');
    expect(requestedUrl.searchParams.get('per_page')).toBe('50');
  });
});
