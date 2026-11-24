import type { RepositoryInfo } from './index';

interface TreeEntry {
  path: string;
  type: 'tree' | 'blob' | 'commit';
  sha?: unknown;
  size?: unknown;
  mode?: unknown;
}

interface TreeDirectory {
  name: string;
  kind: 'directory';
  children: RepositoryTreeNode[];
}

export type RepositoryTreeNode = TreeDirectory | { name: string; kind: 'file' | 'submodule' };

export interface RepositoryBlob {
  path: string;
  sha: string;
  size: number;
}

export interface RepositoryFileTree {
  blobs: RepositoryBlob[];
  nodes: RepositoryTreeNode[];
  fileCount: number;
  directoryCount: number;
  truncated: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTreeEntry(value: unknown): value is TreeEntry {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    value.path.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
    (value.type === 'tree' || value.type === 'blob' || value.type === 'commit')
  );
}

function buildTree(entries: TreeEntry[], truncated: boolean): RepositoryFileTree {
  const nodes: RepositoryTreeNode[] = [];
  const directories = new Map<string, RepositoryTreeNode[]>([['', nodes]]);
  let fileCount = 0;
  const blobs: RepositoryBlob[] = [];

  function getDirectory(path: string): RepositoryTreeNode[] {
    const existing = directories.get(path);
    if (existing) return existing;

    const separator = path.lastIndexOf('/');
    const siblings = getDirectory(path.slice(0, Math.max(0, separator)));
    const children: RepositoryTreeNode[] = [];
    directories.set(path, children);
    siblings.push({ name: path.slice(separator + 1), kind: 'directory', children });
    return children;
  }

  for (const { path, type, sha, size, mode } of entries) {
    if (type === 'tree') {
      getDirectory(path);
    } else {
      const separator = path.lastIndexOf('/');
      const siblings = getDirectory(path.slice(0, Math.max(0, separator)));
      siblings.push({
        name: path.slice(separator + 1),
        kind: type === 'blob' ? 'file' : 'submodule',
      });
      if (type === 'blob') {
        fileCount++;
        if (
          (mode === '100644' || mode === '100755') &&
          typeof sha === 'string' &&
          /^[a-f0-9]{40}$/i.test(sha) &&
          typeof size === 'number' &&
          Number.isSafeInteger(size) &&
          size >= 0
        ) {
          blobs.push({ path, sha, size });
        }
      }
    }
  }

  return { nodes, blobs, fileCount, directoryCount: directories.size - 1, truncated };
}

export async function fetchRepositoryFileTree(
  repository: RepositoryInfo,
  branch: string,
  signal?: AbortSignal,
): Promise<RepositoryFileTree> {
  const owner = encodeURIComponent(repository.owner);
  const name = encodeURIComponent(repository.name);
  const ref = encodeURIComponent(branch);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/git/trees/${ref}?recursive=1`,
    {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub could not load the file tree (HTTP ${response.status}). Try again.`);
  }

  const data: unknown = await response.json();
  if (
    !isRecord(data) ||
    typeof data.truncated !== 'boolean' ||
    !Array.isArray(data.tree) ||
    !data.tree.every(isTreeEntry)
  ) {
    throw new Error('GitHub returned an invalid file tree.');
  }

  return buildTree(data.tree, data.truncated);
}
