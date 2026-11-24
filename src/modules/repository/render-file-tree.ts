import type { RepositoryTreeNode } from './file-tree';

export function renderFileTree(nodes: RepositoryTreeNode[]): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'space-y-1 border-l border-slate-200 pl-4';

  for (const node of nodes) {
    const item = document.createElement('li');

    if (node.kind === 'directory' && node.children.length > 0) {
      const directory = document.createElement('details');
      const label = document.createElement('summary');
      label.className = 'cursor-pointer font-medium';
      label.textContent = `${node.name}/`;
      directory.append(label);
      directory.addEventListener('toggle', () => {
        if (directory.open && directory.childElementCount === 1) {
          directory.append(renderFileTree(node.children));
        }
      });
      item.append(directory);
    } else {
      const suffix =
        node.kind === 'directory' ? '/' : node.kind === 'submodule' ? ' (submodule)' : '';
      item.textContent = node.name + suffix;
    }

    list.append(item);
  }

  return list;
}
