import { parseRepositoryUrl } from './modules/repository';
import { fetchRepositoryMetadata, type RepositoryMetadata } from './modules/repository/metadata';
import './style.css';

const form = document.querySelector<HTMLFormElement>('#repository-form')!;
const input = document.querySelector<HTMLInputElement>('#repository-url')!;
const error = document.querySelector('#repository-error')!;
const status = document.querySelector('#repository-status')!;
const details = document.querySelector<HTMLElement>('#repository-details')!;
const title = document.querySelector('#repository-title')!;
const description = document.querySelector<HTMLElement>('#repository-description')!;
const fields = document.querySelectorAll<HTMLElement>('[data-metadata]');
const numberFormat = new Intl.NumberFormat();
let request: AbortController | undefined;

function clearFeedback() {
  request?.abort();
  request = undefined;
  input.removeAttribute('aria-invalid');
  error.textContent = '';
  status.textContent = '';
  details.hidden = true;
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
    if (!controller.signal.aborted) {
      showMetadata(metadata);
      status.textContent = 'Repository details loaded.';
    }
  } catch (cause) {
    if (!controller.signal.aborted) {
      status.textContent = '';
      error.textContent =
        cause instanceof Error && !(cause instanceof TypeError || cause instanceof SyntaxError)
          ? cause.message
          : 'Could not load repository details. Try again.';
    }
  } finally {
    if (request === controller) request = undefined;
  }
});
