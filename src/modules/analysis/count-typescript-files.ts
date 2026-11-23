export function countTypeScriptFiles(files: string[]): number {
  return files.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx')).length;
}
