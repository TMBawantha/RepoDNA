import type { RepositoryInfo } from './index';

export interface RepositoryMetadata {
  fullName: string;
  description: string | null;
  language: string | null;
  license: string | null;
  defaultBranch: string;
  visibility: 'public' | 'private' | 'internal';
  stars: number;
  forks: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseMetadata(value: unknown): RepositoryMetadata {
  if (!isRecord(value)) throw new Error('GitHub returned invalid repository details.');

  const {
    full_name: fullName,
    description,
    language,
    license,
    default_branch: defaultBranch,
    visibility,
    stargazers_count: stars,
    forks_count: forks,
  } = value;
  const licenseName = license === null ? null : isRecord(license) ? license.name : undefined;

  if (
    typeof fullName !== 'string' ||
    !fullName.trim() ||
    !isNullableString(description) ||
    !isNullableString(language) ||
    !isNullableString(licenseName) ||
    typeof defaultBranch !== 'string' ||
    !defaultBranch.trim() ||
    (visibility !== 'public' && visibility !== 'private' && visibility !== 'internal') ||
    !isCount(stars) ||
    !isCount(forks)
  ) {
    throw new Error('GitHub returned invalid repository details.');
  }

  return {
    fullName,
    description,
    language,
    license: licenseName,
    defaultBranch,
    visibility,
    stars,
    forks,
  };
}

export async function fetchRepositoryMetadata(
  repository: RepositoryInfo,
  signal?: AbortSignal,
): Promise<RepositoryMetadata> {
  const owner = encodeURIComponent(repository.owner);
  const name = encodeURIComponent(repository.name);
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (response.status === 404) {
    throw new Error('Repository not found. Check that the GitHub URL is correct and public.');
  }
  if (!response.ok) {
    throw new Error(
      `GitHub could not load repository details (HTTP ${response.status}). Try again.`,
    );
  }

  const data: unknown = await response.json();
  return parseMetadata(data);
}
