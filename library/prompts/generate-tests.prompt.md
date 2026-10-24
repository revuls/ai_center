---
name: Generate tests
description: Generates automated tests for a file or function covering the happy path, edge cases and errors, following the repo conventions.
icon: 🧪
mode: agent
agent: qa-engineer
tools: [search, edit, runTests, testFailure]
tags: [dev, qa, testing]
audience: [dev, qa]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Generate automated tests for {{file}}.

- Framework and style: those already used in the repository (look them up before starting).
- Cover: happy path, edge cases, errors and known regressions.
- AAA structure, one behavior per test, expressive names.
- No network or clock dependencies: use fakes/fixtures.
- Run the tests and fix them until they pass. If you find a real bug, do not hide it: report it.

Additional notes: {{notes: cases you are worried about (optional)}}
