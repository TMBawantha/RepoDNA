# ADR 0003 — Use pnpm

## Status

Accepted

## Context

Contributors need to install consistent dependency versions and run the same project commands locally and in automation.

## Decision

Use pnpm for dependency management and scripts. Declare the pnpm version in `package.json` and commit `pnpm-lock.yaml`. Use `pnpm install --frozen-lockfile` when an install must match the committed lockfile.

## Alternatives Considered

npm is bundled with typical Node.js installations and can provide reproducible installs with its own lockfile. pnpm provides a content-addressable store and matches the tooling chosen for the project.

## Consequences

The repository has a single documented dependency workflow. Contributors and automated environments need the declared pnpm version, and dependency updates must include the lockfile.
