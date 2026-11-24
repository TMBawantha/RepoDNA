import type { RepositoryBlob } from './file-tree';
import type { RepositoryInfo } from './index';

export const MAX_SOURCE_REQUESTS = 12;
export const MAX_SOURCE_BYTES = 128 * 1024;

interface SourceFile {
  path: string;
  content: string;
}

interface SourceProgress {
  completed: number;
  total: number;
}

const generatedDirectories = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'vendor',
  '.next',
  '.nuxt',
  'out',
  'generated',
  '__generated__',
]);
const generatedFilename = /(?:\.d\.[cm]?ts$|\.(?:min|bundle|generated|gen)\.[jt]sx?$)/i;
const decoder = new TextDecoder('utf-8', { fatal: true });

function isSourceFile(blob: RepositoryBlob): boolean {
  const parts = blob.path.toLowerCase().split('/');
  const name = parts.pop()!;
  return (
    /\.[jt]sx?$/.test(name) &&
    !generatedFilename.test(name) &&
    !parts.some((part) => generatedDirectories.has(part)) &&
    blob.size <= MAX_SOURCE_BYTES
  );
}

async function readBlob(response: Response, blob: RepositoryBlob): Promise<string | null> {
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('encoding' in data) ||
    data.encoding !== 'base64' ||
    !('content' in data) ||
    typeof data.content !== 'string' ||
    !('size' in data) ||
    data.size !== blob.size ||
    !('sha' in data) ||
    data.sha !== blob.sha
  ) {
    throw new Error('GitHub returned invalid blob data.');
  }

  const base64 = data.content.replace(/\s/g, '');
  if (base64.length !== Math.ceil(blob.size / 3) * 4) {
    throw new Error('GitHub returned an unexpected content size.');
  }
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  if (bytes.length !== blob.size) throw new Error('GitHub returned an unexpected content size.');
  if (bytes.includes(0)) return null;

  try {
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

export async function fetchRepositorySource(
  repository: RepositoryInfo,
  blobs: readonly RepositoryBlob[],
  options: { signal?: AbortSignal; onProgress?: (progress: SourceProgress) => void } = {},
) {
  const candidates = blobs.filter(isSourceFile);
  const batch = candidates.slice(0, MAX_SOURCE_REQUESTS);
  const files: SourceFile[] = [];
  const errors: string[] = [];
  let skippedBinary = 0;
  let stopped = false;
  let completed = 0;

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
  options.onProgress?.({ completed, total: batch.length });

  for (const blob of batch) {
    options.signal?.throwIfAborted();
    try {
      const response = await fetch(`${apiUrl}/git/blobs/${blob.sha}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: options.signal,
      });
      if (response.status === 403 || response.status === 429) {
        const limited =
          response.status === 429 ||
          response.headers.get('x-ratelimit-remaining') === '0' ||
          response.headers.has('retry-after');
        stopped = true;
        throw new Error(
          limited
            ? 'GitHub API rate limit reached. Try again later.'
            : 'GitHub refused further source requests (HTTP 403).',
        );
      }
      if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);

      const content = await readBlob(response, blob);
      if (content === null) {
        skippedBinary++;
      } else {
        files.push({ path: blob.path, content });
      }
    } catch (error) {
      options.signal?.throwIfAborted();
      errors.push(
        `${blob.path}: ${error instanceof Error ? error.message : 'Could not fetch this file.'}`,
      );
    }
    options.signal?.throwIfAborted();
    completed++;
    options.onProgress?.({ completed, total: batch.length });
    if (stopped) break;
  }

  return {
    files,
    errors,
    skippedBinary,
    eligible: candidates.length,
    unrequested: candidates.length - completed,
  };
}
