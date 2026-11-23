import { parseRepositoryUrl } from './modules/repository';
import './style.css';

const form = document.querySelector<HTMLFormElement>('#repository-form')!;
const input = document.querySelector<HTMLInputElement>('#repository-url')!;
const error = document.querySelector('#repository-error')!;
const result = document.querySelector('#repository-result')!;

input.addEventListener('input', () => {
  input.removeAttribute('aria-invalid');
  error.textContent = '';
  result.textContent = '';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const repository = parseRepositoryUrl(input.value);

  if (!repository) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent =
      'Enter a valid GitHub repository URL, such as https://github.com/owner/repo.';
    result.textContent = '';
    input.focus();
    return;
  }

  input.removeAttribute('aria-invalid');
  error.textContent = '';
  result.textContent = `Owner: ${repository.owner} · Repository: ${repository.name}`;
});
