import { describe, expect, it } from 'vitest';
import {
  classifyFile,
  summarizeFileClassification,
} from '../../../src/modules/analysis/file-classification';

describe('classifyFile', () => {
  it.each([
    ['main.ts', 'TypeScript', 'Source'],
    ['app.js', 'JavaScript', 'Source'],
    ['style.css', 'CSS', 'Styling'],
    ['package.json', 'JSON', 'Configuration'],
    ['README.md', 'Markdown', 'Documentation'],
    ['parser.test.ts', 'TypeScript', 'Testing'],
    ['widget.spec.TSX', 'TypeScript', 'Testing'],
    ['server_test.go', 'Go', 'Testing'],
    ['logo.PNG', 'PNG', 'Asset'],
    ['vite.config.ts', 'TypeScript', 'Configuration'],
    ['.env.example', 'Dotenv', 'Configuration'],
    ['.gitignore', 'Plain text', 'Configuration'],
    ['Dockerfile', 'Dockerfile', 'Configuration'],
    ['LICENSE', 'Plain text', 'Documentation'],
    ['archive.custom', 'Unknown', 'Unknown'],
    ['.custom', 'Unknown', 'Unknown'],
  ])('classifies %s as %s / %s', (name, language, category) => {
    expect(classifyFile(name)).toEqual({ language, category });
  });
});

describe('summarizeFileClassification', () => {
  it('counts nested files by format and category and excludes directories and submodules', () => {
    expect(
      summarizeFileClassification({
        truncated: true,
        nodes: [
          {
            name: 'src',
            kind: 'directory',
            children: [
              { name: 'main.ts', kind: 'file' },
              {
                name: 'parser',
                kind: 'directory',
                children: [{ name: 'parser.test.ts', kind: 'file' }],
              },
            ],
          },
          { name: 'vendor', kind: 'submodule' },
          { name: 'README.md', kind: 'file' },
          { name: 'unrecognized', kind: 'file' },
        ],
      }),
    ).toEqual({
      languages: [
        { label: 'TypeScript', count: 2 },
        { label: 'Markdown', count: 1 },
        { label: 'Unknown', count: 1 },
      ],
      categories: [
        { label: 'Documentation', count: 1 },
        { label: 'Source', count: 1 },
        { label: 'Testing', count: 1 },
        { label: 'Unknown', count: 1 },
      ],
      partial: true,
    });
  });

  it('returns empty counts for a complete tree with no files', () => {
    expect(summarizeFileClassification({ nodes: [], truncated: false })).toEqual({
      languages: [],
      categories: [],
      partial: false,
    });
  });
});
