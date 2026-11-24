import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryBlob } from '../../../src/modules/repository/file-tree';
import {
  fetchRepositorySource,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_REQUESTS,
} from '../../../src/modules/repository/source-code';

const repository = {
  owner: 'owner',
  name: 'repo',
  url: 'https://github.com/owner/repo',
};

function makeBlob(path: string, size: number, id: number): RepositoryBlob {
  return { path, size, sha: id.toString(16).padStart(40, '0') };
}

function blobResponse(blob: RepositoryBlob, content: string) {
  return Response.json({ sha: blob.sha, size: blob.size, encoding: 'base64', content });
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchRepositorySource', () => {
  it('fetches only eligible snapshot blobs, decodes UTF-8, and reports progress', async () => {
    const file = makeBlob('src/Page.tsx', 3, 1);
    const fetchMock = vi.fn().mockResolvedValue(blobResponse(file, '4Le\nD'));
    vi.stubGlobal('fetch', fetchMock);
    const onProgress = vi.fn();
    const { signal } = new AbortController();

    const result = await fetchRepositorySource(
      repository,
      [
        makeBlob('generated/index.ts', 3, 2),
        makeBlob('src/index.d.ts', 3, 3),
        makeBlob('src/large.js', MAX_SOURCE_BYTES + 1, 4),
        makeBlob('README.md', 3, 5),
        makeBlob('src/app.min.js', 3, 6),
        file,
      ],
      { signal, onProgress },
    );

    expect(result.files).toEqual([{ path: file.path, content: 'ස' }]);
    expect(result.eligible).toBe(1);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://api.github.com/repos/owner/repo/git/blobs/${file.sha}`,
      { signal, headers: { Accept: 'application/vnd.github+json' } },
    );
    expect(onProgress.mock.calls).toEqual([
      [{ completed: 0, total: 1 }],
      [{ completed: 1, total: 1 }],
    ]);
  });

  it('caps the number of requests and retains per-file failures', async () => {
    const files = Array.from({ length: MAX_SOURCE_REQUESTS + 2 }, (_, index) =>
      makeBlob(`src/${index}.js`, 0, index),
    );
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRepositorySource(repository, files);

    expect(fetchMock).toHaveBeenCalledTimes(MAX_SOURCE_REQUESTS);
    expect(result.unrequested).toBe(2);
    expect(result.errors).toHaveLength(MAX_SOURCE_REQUESTS);
  });

  it('skips binary data and continues after an invalid blob response', async () => {
    const binary = makeBlob('binary.ts', 1, 1);
    const invalid = makeBlob('invalid.jsx', 1, 2);
    const text = makeBlob('text.js', 1, 3);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(blobResponse(binary, 'AA=='))
        .mockResolvedValueOnce(blobResponse(invalid, 'eHk='))
        .mockResolvedValueOnce(blobResponse(text, 'eA==')),
    );

    const result = await fetchRepositorySource(repository, [binary, invalid, text]);

    expect(result.skippedBinary).toBe(1);
    expect(result.errors).toEqual(['invalid.jsx: GitHub returned an unexpected content size.']);
    expect(result.files).toEqual([{ path: text.path, content: 'x' }]);
  });

  it.each([
    [429, {}],
    [403, { 'x-ratelimit-remaining': '0' }],
  ] as const)(
    'stops the batch when GitHub rate-limits the request (%i)',
    async (status, headers) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status, headers }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchRepositorySource(repository, [
        makeBlob('first.ts', 0, 1),
        makeBlob('second.ts', 0, 2),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.unrequested).toBe(1);
      expect(result.errors[0]).toContain('rate limit reached');
    },
  );

  it('aborts a running batch without requesting more files', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw controller.signal.reason;
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchRepositorySource(repository, [makeBlob('a.ts', 0, 1), makeBlob('b.ts', 0, 2)], {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
