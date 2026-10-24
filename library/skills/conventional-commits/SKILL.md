---
name: conventional-commits
description: Generates commit messages and PR titles following Conventional Commits. Use it when committing or preparing a PR.
metadata:
  title: Conventional Commits
  icon: 🏷️
  tags: dev, git
  audience: dev
  targets: copilot, claude, cursor, any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Conventional Commits

Format: `<type>(<optional scope>): <imperative description, lowercase, no period>`

| Type | Use |
|---|---|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation only |
| refactor | Internal change without behavior change |
| test | Add or fix tests |
| perf | Performance improvement |
| build / ci | Build, dependencies, pipelines |
| chore | Maintenance |

## Rules
- Description ≤ 72 characters.
- Optional body: the **why** of the change.
- Breaking changes: `!` after the type and a `BREAKING CHANGE: …` footer.
- Reference issues in the footer: `Refs: #123`.

## Examples
- `feat(invoices): add PDF export`
- `fix(auth): refresh token before expiration`
- `refactor!: drop support for Node 16`
