import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRepositoryMetadata } from '../../../src/modules/repository/metadata';

const repository = {
  owner: 'TMBawantha',
  name: 'RepoDNA',
  url: 'https://github.com/TMBawantha/RepoDNA',
};

const response = {
  full_name: 'TMBawantha/RepoDNA',
  description: 'Explore, understand, and visualize your codebase.',
  language: 'TypeScript',
  license: { name: 'Apache License 2.0' },
  default_branch: 'main',
  visibility: 'public',
  stargazers_count: 0,
  forks_count: 2,
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchRepositoryMetadata', () => {
  it('fetches repository information and maps the GitHub response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(response));
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    await expect(fetchRepositoryMetadata(repository, signal)).resolves.toEqual({
      fullName: 'TMBawantha/RepoDNA',
      description: response.description,
      language: 'TypeScript',
      license: 'Apache License 2.0',
      defaultBranch: 'main',
      visibility: 'public',
      stars: 0,
      forks: 2,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/TMBawantha/RepoDNA', {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });
  });

  it('accepts missing optional metadata represented by null', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...response, description: null, language: null, license: null }),
        ),
    );

    await expect(fetchRepositoryMetadata(repository)).resolves.toMatchObject({
      description: null,
      language: null,
      license: null,
    });
  });

  it.each([{ stargazers_count: '0' }, { license: {} }, { default_branch: null }])(
    'rejects invalid metadata %j',
    async (invalidFields) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ ...response, ...invalidFields })),
      );

      await expect(fetchRepositoryMetadata(repository)).rejects.toThrow(
        'invalid repository details',
      );
    },
  );

  it.each([
    [404, 'Repository not found'],
    [500, 'HTTP 500'],
  ])('reports an HTTP %i error', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));

    await expect(fetchRepositoryMetadata(repository)).rejects.toThrow(message);
  });

  it('rejects when the request fails at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchRepositoryMetadata(repository)).rejects.toThrow('Failed to fetch');
  });
});
