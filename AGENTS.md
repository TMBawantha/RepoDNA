# RepoDNA workflow and code standards

## Start a change

- Check the working tree and preserve any existing changes.
- Switch to `main` with `git switch main` and update it with `git pull --ff-only origin main`.
- Create a topic branch from the updated `main`, such as `git switch -c feat/repository-input`.

## Name branches and commits

Use `<type>/<short-kebab-case-name>` for branches and `<type>: <short imperative summary>` for commit subjects.

| Type    | Use                     | Branch example                  | Commit example                        |
| ------- | ----------------------- | ------------------------------- | ------------------------------------- |
| `feat`  | New functionality       | `feat/repository-input`         | `feat: add repository URL input`      |
| `fix`   | Bug fixes               | `fix/repository-url-validation` | `fix: reject invalid repository URLs` |
| `chore` | Tooling and maintenance | `chore/code-quality`            | `chore: configure ESLint`             |
| `docs`  | Documentation           | `docs/git-workflow`             | `docs: document RepoDNA Git workflow` |

## Organize application code and tests

- Keep application code in `src/` and test files in the root-level `tests/` directory.
- Mirror the feature-based paths from `src/` in `tests/`. For example, `src/modules/analysis/count-typescript-files.ts` is tested by `tests/modules/analysis/count-typescript-files.test.ts`.

## Check code quality

- Use pnpm for dependencies and scripts. Include `pnpm-lock.yaml` when changing dependencies.
- Apply the repository's Prettier configuration with `pnpm format` and verify formatting with `pnpm format:check`.
- Run `pnpm lint` with the recommended ESLint and typescript-eslint rules configured in `eslint.config.mjs`.
- Run `pnpm typecheck` for standalone TypeScript checks. Keep strict mode and the unused-code and switch-fallthrough checks enabled in `tsconfig.json`.
- Validate external input at runtime before using it as typed application data.
- Run `pnpm build` to type-check and build for production. The build already runs `pnpm typecheck`.

## Submit a change

- Run the formatting, lint, and build checks before submitting. Verify the behavior that changed.
- When a pull request introduces a significant architecture decision, add an ADR under `docs/adr/` in the same PR. Use the [template](docs/adr/template.md) and the next sequential number.
- Preserve the original decision and rationale in accepted ADRs. When replacing a decision, write a new ADR and update the old record's status to `Superseded` with a link to the replacement.
- Review the diff and stage the intended files before committing.
- Push the topic branch with `git push -u origin <branch>` on its first push. Target `main` in the pull request.

## Clean up after a merge

1. Confirm that the pull request into `main` is merged.
2. Run `git switch main` and `git pull --ff-only origin main`. If the pull fails, resolve the discrepancy before deleting the feature branch. A fast-forward-only pull avoids creating an unexpected merge commit.
3. Confirm that the updated `main` contains the feature changes and that the local feature branch has no additional work. Check ancestry with `git merge-base --is-ancestor <feature-branch> main`. After a squash or rebase merge, check the merged PR head against the local branch tip and compare the feature patch with what landed in `main`.
4. Delete the local branch with `git branch -d <feature-branch>`. If Git refuses because of rewritten history, use `git branch -D <feature-branch>` only after the verification in step 3 succeeds. Keep the branch if any local work is missing from `main`.
