---
name: Pull Request description
description: "Writes a PR description from the changes: what, why, how to test it, risks and a Conventional Commits title."
icon: 📬
agent: tech-writer
tools: [changes, search]
tags: [dev, documentation, git]
audience: [dev]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Write the Pull Request description for these changes:

{{changes: Paste the diff or describe the changes (in Copilot you can use #changes)}}

Related story/issue: {{issue: link or ID (optional)}}

Format:
- **Title** (Conventional Commits)
- ## What changes
- ## Why
- ## How to test it (steps)
- ## Risks and rollback plan
- ## Checklist (tests, docs, security)
