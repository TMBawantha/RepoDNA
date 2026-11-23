import { describe, expect, it } from 'vitest';
import { countTypeScriptFiles } from '../../../src/modules/analysis/count-typescript-files';

describe('countTypeScriptFiles', () => {
  it('counts TypeScript files correctly', () => {
    const files = ['src/main.ts', 'src/app.tsx', 'src/style.css', 'README.md'];
    const result = countTypeScriptFiles(files);

    expect(result).toBe(2);
  });

  it('returns zero for an empty list', () => {
    expect(countTypeScriptFiles([])).toBe(0);
  });

  it('returns zero when there are no TypeScript files', () => {
    expect(countTypeScriptFiles(['index.html', 'src/style.css'])).toBe(0);
  });

  it('counts all files when they are TypeScript files', () => {
    expect(countTypeScriptFiles(['src/main.ts', 'src/app.tsx'])).toBe(2);
  });
});
