import { summarizeFileClassification } from './modules/analysis/file-classification';
import { parseRepositoryUrl } from './modules/repository';
import { fetchRepositoryMetadata, type RepositoryMetadata } from './modules/repository/metadata';
import { fetchRepositoryFileTree, type RepositoryFileTree } from './modules/repository/file-tree';
import { renderFileTree } from './modules/repository/render-file-tree';
import {
  fetchRepositorySource,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_REQUESTS,
} from './modules/repository/source-code';
import type { RepositoryInfo } from './modules/repository';
import './style.css';

const form = document.querySelector<HTMLFormElement>('#repository-form')!;
const input = document.querySelector<HTMLInputElement>('#repository-url')!;
const error = document.querySelector('#repository-error')!;
const status = document.querySelector('#repository-status')!;
const details = document.querySelector<HTMLElement>('#repository-details')!;
const title = document.querySelector('#repository-title')!;
const description = document.querySelector<HTMLElement>('#repository-description')!;
const fields = document.querySelectorAll<HTMLElement>('[data-metadata]');
const treeSection = document.querySelector<HTMLElement>('#repository-file-tree')!;
const treeCounts = document.querySelector('#repository-tree-counts')!;
const treeWarning = document.querySelector<HTMLElement>('#repository-tree-warning')!;
const treeContent = document.querySelector('#repository-tree-content')!;
const classificationSection = document.querySelector<HTMLElement>('#repository-classification')!;
const classificationWarning = document.querySelector<HTMLElement>(
  '#repository-classification-warning',
)!;
const classificationEmpty = document.querySelector<HTMLElement>(
  '#repository-classification-empty',
)!;
const classificationCounts = document.querySelector<HTMLElement>(
  '#repository-classification-counts',
)!;
const languageCounts = document.querySelector('#repository-language-counts')!;
const categoryCounts = document.querySelector('#repository-category-counts')!;
const sourceSection = document.querySelector<HTMLElement>('#repository-source')!;
const sourceButton = document.querySelector<HTMLButtonElement>('#fetch-repository-source')!;
const sourceStatus = document.querySelector('#repository-source-status')!;
const sourceError = document.querySelector('#repository-source-error')!;
const sourceFiles = document.querySelector('#repository-source-files')!;
const importSummary = document.querySelector('#repository-import-summary')!;
document.querySelector('#repository-source-limit')!.textContent =
  `Fetch up to ${MAX_SOURCE_REQUESTS} JavaScript or TypeScript files of at most ${MAX_SOURCE_BYTES / 1024} KiB each.`;
const numberFormat = new Intl.NumberFormat();
let request: AbortController | undefined;
let sourceSnapshot: { repository: RepositoryInfo; tree: RepositoryFileTree } | undefined;

function clearFeedback() {
  request?.abort();
  request = undefined;
  input.removeAttribute('aria-invalid');
  error.textContent = '';
  status.textContent = '';
  details.hidden = true;
  treeSection.hidden = true;
  classificationSection.hidden = true;
  sourceSnapshot = undefined;
  sourceSection.hidden = true;
  sourceButton.disabled = false;
  sourceStatus.textContent = '';
  sourceError.textContent = '';
  sourceFiles.replaceChildren();
  importSummary.textContent = '';
  treeWarning.hidden = true;
  treeContent.replaceChildren();
}

function showMetadata(metadata: RepositoryMetadata) {
  title.textContent = metadata.fullName.replace('/', ' / ');
  description.textContent = metadata.description ?? '';
  description.hidden = !metadata.description;

  const values: Record<string, string> = {
    language: metadata.language ?? '—',
    license: metadata.license ?? '—',
    defaultBranch: metadata.defaultBranch,
    visibility: metadata.visibility,
    stars: numberFormat.format(metadata.stars),
    forks: numberFormat.format(metadata.forks),
  };

  for (const field of fields) {
    field.textContent = values[field.dataset.metadata ?? ''];
  }

  details.hidden = false;
}

function renderCounts(target: Element, entries: { label: string; count: number }[]) {
  const rows = document.createDocumentFragment();
  for (const { label, count } of entries) {
    const row = document.createElement('div');
    row.className = 'flex justify-between gap-4 py-2 text-slate-700';
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = label;
    value.textContent = numberFormat.format(count);
    row.append(term, value);
    rows.append(row);
  }
  target.replaceChildren(rows);
}

function showClassification(tree: RepositoryFileTree) {
  const { languages, categories, partial } = summarizeFileClassification(tree);
  classificationWarning.hidden = !partial;
  classificationEmpty.hidden = languages.length > 0;
  classificationCounts.hidden = languages.length === 0;
  renderCounts(languageCounts, languages);
  renderCounts(categoryCounts, categories);
  classificationSection.hidden = false;
}

sourceButton.addEventListener('click', async () => {
  if (!sourceSnapshot || sourceButton.disabled) return;
  const { repository, tree } = sourceSnapshot;
  const controller = new AbortController();
  request = controller;
  sourceButton.disabled = true;
  sourceError.textContent = '';
  sourceFiles.replaceChildren();
  importSummary.textContent = '';

  try {
    const result = await fetchRepositorySource(repository, tree.blobs, {
      signal: controller.signal,
      onProgress: ({ completed, total }) => {
        sourceStatus.textContent = `Fetching source files… ${completed} of ${total}`;
      },
    });
    if (controller.signal.aborted) return;

    const summary = [`Fetched ${result.files.length} of ${result.eligible} eligible files.`];
    if (result.skippedBinary) summary.push(`Skipped ${result.skippedBinary} non-text files.`);
    if (result.unrequested)
      summary.push(`${result.unrequested} eligible files were not requested.`);
    if (tree.truncated) summary.push('The GitHub file tree is partial.');
    sourceStatus.textContent = summary.join(' ');
    sourceError.textContent = result.errors.join('\n');

    for (const file of result.files) {
      const disclosure = document.createElement('details');
      const label = document.createElement('summary');
      const preview = document.createElement('pre');
      label.className = 'cursor-pointer break-all font-medium';
      label.textContent = file.path;
      preview.className = 'mt-2 max-h-80 overflow-auto rounded bg-slate-100 p-3';
      preview.textContent = file.content;
      disclosure.append(label, preview);
      sourceFiles.append(disclosure);
    }

    if (result.files.length) {
      importSummary.textContent = 'Analyzing static imports…';
      try {
        const { analyzeImports } = await import('./modules/analysis');
        if (controller.signal.aborted) return;

        const counts = { internal: 0, external: 0, unresolved: 0 };
        for (const relationship of analyzeImports(
          result.files,
          tree.blobs.map(({ path }) => path),
        )) {
          counts[relationship.kind]++;
        }
        importSummary.textContent = `Static imports and re-exports in fetched files · Internal ${numberFormat.format(counts.internal)} · External ${numberFormat.format(counts.external)} · Unresolved ${numberFormat.format(counts.unresolved)}`;
      } catch {
        if (!controller.signal.aborted)
          importSummary.textContent = 'Could not analyze static imports.';
      }
    }
  } catch {
    if (!controller.signal.aborted) {
      sourceStatus.textContent = '';
      sourceError.textContent = 'Could not fetch source files.';
    }
  } finally {
    if (request === controller) {
      request = undefined;
      sourceButton.disabled = false;
    }
  }
});

input.addEventListener('input', clearFeedback);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();
  const repository = parseRepositoryUrl(input.value);

  if (!repository) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent =
      'Enter a valid GitHub repository URL, such as https://github.com/owner/repo.';
    input.focus();
    return;
  }

  const controller = new AbortController();
  request = controller;
  status.textContent = 'Loading repository details…';

  try {
    const metadata = await fetchRepositoryMetadata(repository, controller.signal);
    if (controller.signal.aborted) return;
    showMetadata(metadata);
    status.textContent = 'Loading repository file tree…';

    const tree = await fetchRepositoryFileTree(
      repository,
      metadata.defaultBranch,
      controller.signal,
    );
    if (controller.signal.aborted) return;

    treeCounts.textContent = `Files ${numberFormat.format(tree.fileCount)} · Directories ${numberFormat.format(tree.directoryCount)}`;
    treeWarning.hidden = !tree.truncated;
    if (tree.nodes.length) {
      treeContent.replaceChildren(renderFileTree(tree.nodes));
    } else {
      treeContent.textContent = tree.truncated
        ? 'No entries were returned.'
        : 'This tree is empty.';
    }
    treeSection.hidden = false;
    showClassification(tree);
    sourceSnapshot = { repository, tree };
    sourceSection.hidden = false;
    status.textContent = 'Repository details, file tree, and classification loaded.';
  } catch (cause) {
    if (!controller.signal.aborted) {
      status.textContent = '';
      error.textContent =
        cause instanceof Error && !(cause instanceof TypeError || cause instanceof SyntaxError)
          ? cause.message
          : details.hidden
            ? 'Could not load repository details. Try again.'
            : 'Could not load the repository file tree. Try again.';
    }
  } finally {
    if (request === controller) request = undefined;
  }
});
