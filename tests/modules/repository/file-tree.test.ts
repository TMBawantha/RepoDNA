import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRepositoryFileTree } from '../../../src/modules/repository/file-tree';

const repository = {
  owner: 'TMBawantha',
  name: 'RepoDNA',
  url: 'https://github.com/TMBawantha/RepoDNA',
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchRepositoryFileTree', () => {
  it('builds a nested tree from out-of-order entries and counts files and directories', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        truncated: false,
        tree: [
          {
            type: 'blob',
            path: 'src/modules/main.ts',
            mode: '100644',
            sha: 'a'.repeat(40),
            size: 42,
          },
          { type: 'tree', path: 'src' },
          { type: 'tree', path: 'src/modules' },
          { type: 'blob', path: 'README.md' },
          { type: 'commit', path: 'vendor' },
          { type: 'tree', path: 'empty' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    await expect(fetchRepositoryFileTree(repository, 'release/stable', signal)).resolves.toEqual({
      blobs: [{ path: 'src/modules/main.ts', sha: 'a'.repeat(40), size: 42 }],
      nodes: [
        {
          name: 'src',
          kind: 'directory',
          children: [
            {
              name: 'modules',
              kind: 'directory',
              children: [{ name: 'main.ts', kind: 'file' }],
            },
          ],
        },
        { name: 'README.md', kind: 'file' },
        { name: 'vendor', kind: 'submodule' },
        { name: 'empty', kind: 'directory', children: [] },
      ],
      fileCount: 2,
      directoryCount: 3,
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/TMBawantha/RepoDNA/git/trees/release%2Fstable?recursive=1',
      { headers: { Accept: 'application/vnd.github+json' }, signal },
    );
  });

  it('keeps partial results and marks their counts as incomplete', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ truncated: true, tree: [{ type: 'blob', path: 'src/main.ts' }] }),
        ),
    );

    await expect(fetchRepositoryFileTree(repository, 'main')).resolves.toMatchObject({
      truncated: true,
      fileCount: 1,
      directoryCount: 1,
    });
  });

  it('returns an empty hierarchy and zero counts for an empty tree', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ truncated: false, tree: [] })),
    );

    await expect(fetchRepositoryFileTree(repository, 'main')).resolves.toEqual({
      nodes: [],
      blobs: [],
      fileCount: 0,
      directoryCount: 0,
      truncated: false,
    });
  });

  it.each([
    { truncated: 'false', tree: [] },
    { truncated: false, tree: [{ type: 'blob', path: 'src//main.ts' }] },
    { truncated: false, tree: [{ type: 'unknown', path: 'main.ts' }] },
  ])('rejects malformed tree responses', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));

    await expect(fetchRepositoryFileTree(repository, 'main')).rejects.toThrow('invalid file tree');
  });

  it('reports an unsuccessful HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 409 })));

    await expect(fetchRepositoryFileTree(repository, 'main')).rejects.toThrow('HTTP 409');
  });
});
