---
name: TypeScript conventions
description: "Standards for TypeScript/React code: strict typing, pure functions, error handling and style."
icon: 🟦
applyTo: "**/*.ts,**/*.tsx"
tags: [dev, typescript]
audience: [dev]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- Use `strict` and avoid `any`; prefer `unknown` + *type guards*.
- Small, pure functions; side effects at the edges (services, adapters).
- Descriptive English names; `camelCase` for variables/functions and `PascalCase` for types and components.
- Handle errors explicitly: never swallow exceptions; use `Result` types or domain errors.
- React components: functional, *hooks* for state, typed props, no business logic in the view.
- Import through the project's path aliases; avoid deep relative paths (`../../../`).
- Every behavior change comes with tests.
