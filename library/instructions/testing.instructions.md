---
name: How we write tests
description: "Rules for automated tests: AAA structure, expressive names, isolation and edge-case coverage."
icon: 🧪
applyTo: "**/*.test.*,**/*.spec.*,**/tests/**,**/__tests__/**"
tags: [dev, qa, testing]
audience: [dev, qa]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- **Arrange / Act / Assert** structure and one behavior per test.
- Test name = expected behavior: `should <result> when <condition>`.
- Cover the happy path, **edge cases** (empty, null, max values) and errors.
- Deterministic tests: no network, clock or randomness dependencies (use *fakes* and *fixtures*).
- Mocks only at the system boundaries; do not mock what you are testing.
- When fixing a bug, first add a test that reproduces it.
