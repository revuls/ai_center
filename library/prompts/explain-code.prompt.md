---
name: Explain code
description: Explains what a piece of code does, how it fits into the system and its risks. Ideal for onboarding and legacy code.
icon: 🧑‍🏫
mode: ask
tags: [dev, onboarding]
audience: [dev, qa]
targets: [copilot, claude, cursor, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Explain this code for someone joining the team:

{{selection}}

1. What it does, in 3 lines.
2. How it works step by step.
3. Dependencies and how it fits into the system.
4. Risks, technical debt or uncovered cases.
5. A Mermaid diagram if it helps.

Reader level: {{level: junior / senior / non-technical}}
