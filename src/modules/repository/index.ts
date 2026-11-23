export function parseRepositoryUrl(value: string) {
  const match =
    /^https?:\/\/github\.com\/([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d._-]+)\/?$/i.exec(
      value.trim(),
    );

  if (!match) return null;

  const [, owner, path] = match;
  const name = path.replace(/\.git$/i, '');

  if (owner.includes('--') || name === '' || name === '.' || name === '..' || name.length > 100) {
    return null;
  }

  return { owner, name };
}
