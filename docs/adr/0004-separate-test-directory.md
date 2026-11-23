# ADR 0004 — Separate tests from application code

## Status

Accepted

## Context

RepoDNA's first unit test was colocated with its source file. As the suite grows, contributors need a predictable way to find tests and browse application code on its own.

## Decision

Keep application code in `src/` and tests in a root-level `tests/` directory that mirrors the feature paths. For example, `tests/modules/analysis/count-typescript-files.test.ts` covers `src/modules/analysis/count-typescript-files.ts`. Include `tests/` in TypeScript checking.

## Alternatives Considered

Colocating tests next to the source gives them shorter imports and makes source and test moves happen in the same directory. It mixes test files into the application tree.

## Consequences

The matching paths make tests easy to locate while keeping the two trees separate. Moving a source module may require moving its tests and updating their imports.
