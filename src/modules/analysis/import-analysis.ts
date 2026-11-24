import ts from 'typescript';

export interface ImportAnalysisSource {
  path: string;
  content: string;
}

interface ImportReference {
  sourcePath: string;
  specifier: string;
  syntax: 'import' | 're-export';
}

export type ImportRelationship = ImportReference &
  ({ kind: 'internal'; targetPath: string } | { kind: 'external' | 'unresolved' });

const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const relativeSpecifier = /^\.{1,2}(?:\/|$)/;

function normalizeRelativePath(sourcePath: string, specifier: string): string | undefined {
  const path = sourcePath.split('/').slice(0, -1);
  for (const segment of specifier.split('/')) {
    if (segment === '..') {
      if (!path.length) return undefined;
      path.pop();
    } else if (segment && segment !== '.') {
      path.push(segment);
    }
  }
  return path.join('/');
}

function resolveRelativeImport(
  sourcePath: string,
  specifier: string,
  repositoryPaths: ReadonlySet<string>,
): string | undefined {
  const path = normalizeRelativePath(sourcePath, specifier);
  if (path === undefined) return undefined;

  const directoryOnly = /(?:^|\/)\.{1,2}$/.test(specifier) || specifier.endsWith('/');
  if (!directoryOnly) {
    if (repositoryPaths.has(path)) return path;

    const scriptExtension = /\.jsx?$/.exec(path);
    if (scriptExtension) {
      const stem = path.slice(0, -scriptExtension[0].length);
      const replacements = scriptExtension[0] === '.jsx' ? ['.tsx', '.ts'] : ['.ts', '.tsx'];
      return replacements
        .map((extension) => stem + extension)
        .find((file) => repositoryPaths.has(file));
    }

    const file = extensions
      .map((extension) => path + extension)
      .find((file) => repositoryPaths.has(file));
    if (file) return file;
  }

  const index = path ? path + '/index' : 'index';
  return extensions.map((extension) => index + extension).find((file) => repositoryPaths.has(file));
}

export function analyzeImports(
  sources: readonly ImportAnalysisSource[],
  knownPaths: Iterable<string> = [],
): ImportRelationship[] {
  const repositoryPaths = new Set(knownPaths);
  const relationships: ImportRelationship[] = [];

  for (const source of sources) repositoryPaths.add(source.path);

  for (const { path, content } of sources) {
    const ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest);

    for (const statement of ast.statements) {
      const isImport = ts.isImportDeclaration(statement);
      if (!isImport && !ts.isExportDeclaration(statement)) continue;
      const specifierNode = statement.moduleSpecifier;
      if (!specifierNode || !ts.isStringLiteral(specifierNode)) continue;

      const specifier = specifierNode.text;
      const reference: ImportReference = {
        sourcePath: path,
        specifier,
        syntax: isImport ? 'import' : 're-export',
      };

      if (!relativeSpecifier.test(specifier)) {
        relationships.push({ ...reference, kind: 'external' });
        continue;
      }

      const targetPath = resolveRelativeImport(path, specifier, repositoryPaths);
      relationships.push(
        targetPath
          ? { ...reference, kind: 'internal', targetPath }
          : { ...reference, kind: 'unresolved' },
      );
    }
  }

  return relationships;
}
