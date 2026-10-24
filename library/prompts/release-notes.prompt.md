---
name: Release notes
description: Generates release notes from commits, PRs or stories, adapted to the audience (technical, business or customers).
icon: 🚀
agent: tech-writer
tags: [documentation, product]
audience: [po, business, dev]
targets: [copilot, m365, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Generate the release notes for version {{version: e.g. 2.4.0}} for a **{{audience: technical / business / customers}}** audience.

Changes included:
{{changes: List of commits, PRs or stories}}

Format:
- Release headline (1 line).
- ✨ What's new · 🛠 Improvements · 🐞 Fixes · ⚠️ Actions required.
- Benefit-oriented language for the user; no jargon if the audience is not technical.
