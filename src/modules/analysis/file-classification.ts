import type { RepositoryFileTree, RepositoryTreeNode } from '../repository/file-tree';

export type FileCategory =
  'Source' | 'Styling' | 'Configuration' | 'Documentation' | 'Testing' | 'Asset' | 'Unknown';

interface FileClassification {
  language: string;
  category: FileCategory;
}

const extensionRules: ReadonlyArray<[FileCategory, Record<string, string>]> = [
  [
    'Source',
    {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      mts: 'TypeScript',
      cts: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      mjs: 'JavaScript',
      cjs: 'JavaScript',
      py: 'Python',
      java: 'Java',
      kt: 'Kotlin',
      go: 'Go',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      c: 'C',
      h: 'C',
      cpp: 'C++',
      cc: 'C++',
      hpp: 'C++',
      cs: 'C#',
      swift: 'Swift',
      sh: 'Shell',
      bash: 'Shell',
      sql: 'SQL',
      html: 'HTML',
      vue: 'Vue',
      svelte: 'Svelte',
    },
  ],
  ['Styling', { css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less' }],
  [
    'Configuration',
    { json: 'JSON', jsonc: 'JSONC', yaml: 'YAML', yml: 'YAML', toml: 'TOML', ini: 'INI' },
  ],
  [
    'Documentation',
    { md: 'Markdown', mdx: 'MDX', rst: 'reStructuredText', adoc: 'AsciiDoc', txt: 'Plain text' },
  ],
  [
    'Asset',
    {
      png: 'PNG',
      jpg: 'JPEG',
      jpeg: 'JPEG',
      gif: 'GIF',
      svg: 'SVG',
      ico: 'ICO',
      webp: 'WebP',
      avif: 'AVIF',
      woff: 'WOFF',
      woff2: 'WOFF2',
      ttf: 'TTF',
      mp3: 'MP3',
      mp4: 'MP4',
      pdf: 'PDF',
    },
  ],
];

const extensions = new Map<string, FileClassification>();
for (const [category, formats] of extensionRules) {
  for (const [extension, language] of Object.entries(formats)) {
    extensions.set(extension, { language, category });
  }
}

const filenames = new Map<string, FileClassification>([
  ['dockerfile', { language: 'Dockerfile', category: 'Configuration' }],
  ['makefile', { language: 'Makefile', category: 'Configuration' }],
  ['.gitignore', { language: 'Plain text', category: 'Configuration' }],
  ['.gitattributes', { language: 'Plain text', category: 'Configuration' }],
  ['.editorconfig', { language: 'INI', category: 'Configuration' }],
  ['.npmrc', { language: 'INI', category: 'Configuration' }],
]);

export function classifyFile(name: string): FileClassification {
  const filename = name.toLowerCase();
  const namedRule = filenames.get(filename);
  if (namedRule) return { ...namedRule };

  if (/^\.env(?:\.|$)/.test(filename)) {
    return { language: 'Dotenv', category: 'Configuration' };
  }

  const separator = filename.lastIndexOf('.');
  const extension = separator > 0 ? filename.slice(separator + 1) : '';
  const format = extensions.get(extension);

  if (
    /^(?:readme|license|notice|changelog|contributing|code_of_conduct)(?:\.|$)/.test(filename) &&
    (!format || format.category === 'Documentation')
  ) {
    return { language: format?.language ?? 'Plain text', category: 'Documentation' };
  }

  if (!format) return { language: 'Unknown', category: 'Unknown' };

  const stem = filename.slice(0, separator);
  if (format.category === 'Source') {
    if (/\.(?:test|spec)$/.test(stem) || /^test_.+|_test$/.test(stem)) {
      return { language: format.language, category: 'Testing' };
    }
    if (/\.config$/.test(stem)) return { language: format.language, category: 'Configuration' };
  }

  return { ...format };
}

function sortedCounts(counts: Map<string, number>) {
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

export function summarizeFileClassification(tree: Pick<RepositoryFileTree, 'nodes' | 'truncated'>) {
  const languages = new Map<string, number>();
  const categories = new Map<string, number>();
  const pending: RepositoryTreeNode[][] = [tree.nodes];

  while (pending.length) {
    for (const node of pending.pop()!) {
      if (node.kind === 'directory') {
        pending.push(node.children);
      } else if (node.kind === 'file') {
        const { language, category } = classifyFile(node.name);
        languages.set(language, (languages.get(language) ?? 0) + 1);
        categories.set(category, (categories.get(category) ?? 0) + 1);
      }
    }
  }

  return {
    languages: sortedCounts(languages),
    categories: sortedCounts(categories),
    partial: tree.truncated,
  };
}
