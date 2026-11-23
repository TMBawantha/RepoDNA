# RepoDNA Git workflow

## Start a change

- Check the working tree and preserve any existing changes.
- Switch to `main` with `git switch main` and update it with `git pull --ff-only origin main`.
- Create a feature branch from the updated `main`, such as `git switch -c feat/repository-input`.

## Submit a change

- Run `pnpm build` and verify the behavior that changed.
- Review the diff, stage the intended files, and use a descriptive commit message such as `feat: add repository URL input`.
- Push the feature branch with `git push -u origin <feature-branch>` on its first push. Target `main` in the pull request.

## Clean up after a merge

1. Confirm that the pull request into `main` is merged.
2. Run `git switch main` and `git pull --ff-only origin main`. If the pull fails, resolve the discrepancy before deleting the feature branch. A fast-forward-only pull avoids creating an unexpected merge commit.
3. Confirm that the updated `main` contains the feature changes and that the local feature branch has no additional work. Check ancestry with `git merge-base --is-ancestor <feature-branch> main`. After a squash or rebase merge, check the merged PR head against the local branch tip and compare the feature patch with what landed in `main`.
4. Delete the local branch with `git branch -d <feature-branch>`. If Git refuses because of rewritten history, use `git branch -D <feature-branch>` only after the verification in step 3 succeeds. Keep the branch if any local work is missing from `main`.
