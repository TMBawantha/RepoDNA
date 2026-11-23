# ADR 0001 — Use TypeScript

## Status

Accepted

## Context

RepoDNA handles repository URLs and will pass repository metadata and analysis results between modules. Contributors need a clear way to see what shape each module expects.

## Decision

Write application code and tests in TypeScript. Enable strict checking and use `pnpm typecheck` to check types without emitting files.

## Alternatives Considered

JavaScript with JSDoc can add type information without changing file formats, but requires maintaining annotations separately from the JavaScript syntax.

## Consequences

Module interfaces make data shapes explicit, and type mismatches can surface before runtime. Contributors maintain TypeScript types alongside the code. External input, such as repository URLs and API responses, still needs runtime validation.
