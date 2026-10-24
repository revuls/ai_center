---
name: AI autonomy levels
description: When to let the AI act on its own and when to require human review. Use it when designing workflows and agents.
icon: 🎚️
kind: guideline
tags: [governance, workflows]
audience: [all]
targets: [any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

| Level | The AI… | Examples | Human review |
|---|---|---|---|
| 0 · Assistant | Suggests; the person decides and acts | Draft an email, explain code | Always |
| 1 · Copilot | Performs bounded, reversible tasks | Generate tests, local refactor | Before integrating |
| 2 · Supervised agent | Chains steps with checkpoints | Feature E2E with PO approval | At milestones (story, design, PR) |
| 3 · Autonomous agent | Runs end to end | Minor dependency updates, recurring reports | Sampling and alerts |

**Rule**: the more irreversible or customer-visible the action, the lower the autonomy level.
