# ADR 0002 — Use feature-based architecture

## Status

Accepted

## Context

RepoDNA has distinct responsibilities for handling repository input, analyzing source files, and exploring repository structure. Contributors need to find the code for each responsibility as the project grows.

## Decision

Group application code under `src/modules/` by feature. The initial modules are `repository`, `analysis`, and `explorer`. Use `src/shared/` for code genuinely shared across features.

## Alternatives Considered

A layered structure could group files by technical role, such as UI and services. A single feature change could then span several directories.

## Consequences

Feature code is easier to locate and review together. Contributors must maintain module boundaries and decide when code belongs in a shared module.
