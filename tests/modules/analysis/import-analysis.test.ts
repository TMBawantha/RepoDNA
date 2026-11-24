import { describe, expect, it } from 'vitest';
import { analyzeImports } from '../../../src/modules/analysis';

describe('analyzeImports', () => {
  it('extracts declarations and ignores comments, strings, local exports, and dynamic imports', () => {
    const results = analyzeImports([
      {
        path: 'src/main.ts',
        content: [
          '// import "comment";',
          'const text = "import \\"example\\"";',
          'export { text };',
          'import("dynamic");',
          'require("commonjs");',
          'import type { Options } from',
          '  "./options";',
          'import "./startup";',
          'export { handler } from "./handler.js";',
          'export * from "external-package";',
        ].join('\n'),
      },
      { path: 'src/options.ts', content: 'export interface Options {}' },
      { path: 'src/startup.ts', content: 'export {};' },
      { path: 'src/handler.ts', content: 'export const handler = () => {};' },
    ]);

    expect(results).toEqual([
      {
        sourcePath: 'src/main.ts',
        specifier: './options',
        syntax: 'import',
        kind: 'internal',
        targetPath: 'src/options.ts',
      },
      {
        sourcePath: 'src/main.ts',
        specifier: './startup',
        syntax: 'import',
        kind: 'internal',
        targetPath: 'src/startup.ts',
      },
      {
        sourcePath: 'src/main.ts',
        specifier: './handler.js',
        syntax: 're-export',
        kind: 'internal',
        targetPath: 'src/handler.ts',
      },
      {
        sourcePath: 'src/main.ts',
        specifier: 'external-package',
        syntax: 're-export',
        kind: 'external',
      },
    ]);
  });

  it('resolves parent paths, explicit extensions, and directory indexes against known paths', () => {
    expect(
      analyzeImports(
        [
          {
            path: 'src/ui/Page.jsx',
            content:
              'import "../config.json"; import "../lib/"; import "../exact.js"; import "..";',
          },
        ],
        ['src/config.json', 'src/lib/index.ts', 'src/exact.js', 'src/exact.ts', 'src/index.js'],
      ),
    ).toMatchObject([
      { kind: 'internal', targetPath: 'src/config.json' },
      { kind: 'internal', targetPath: 'src/lib/index.ts' },
      { kind: 'internal', targetPath: 'src/exact.js' },
      { kind: 'internal', targetPath: 'src/index.js' },
    ]);
  });

  it('preserves missing and out-of-root imports and separates non-relative specifiers', () => {
    expect(
      analyzeImports(
        [
          {
            path: 'src/main.tsx',
            content:
              'import "./missing"; import "../../outside"; import "node:fs"; import "@/alias";',
          },
        ],
        ['outside.ts'],
      ),
    ).toMatchObject([
      { specifier: './missing', kind: 'unresolved' },
      { specifier: '../../outside', kind: 'unresolved' },
      { specifier: 'node:fs', kind: 'external' },
      { specifier: '@/alias', kind: 'external' },
    ]);
  });

  it('returns no relationships for empty input', () => {
    expect(analyzeImports([])).toEqual([]);
  });
});
