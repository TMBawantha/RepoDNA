# ADR 0005 — Use the TypeScript AST for import analysis

## Status

Accepted

## Context

RepoDNA needs to extract dependency relationships from downloaded JavaScript and TypeScript source text. Import-like text can appear in comments and strings, and static dependencies can also be declared through re-exports.

## Decision

Use the existing TypeScript Compiler API to parse source text and inspect static import and re-export declarations. Resolve relative specifiers against repository file paths and preserve unresolved references in the result.

## Alternatives Considered

A regular-expression scanner would be small but would need to reproduce syntax rules for comments, strings, and multiline declarations. A separate parser such as Tree-sitter could support more languages and would add tooling for the initial JavaScript and TypeScript scope.

## Consequences

The analyzer recognizes syntax without executing source files. The result describes references found in the supplied source files and paths. Path aliases, dynamic imports, and full compiler module resolution are deferred.
