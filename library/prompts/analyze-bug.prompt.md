---
name: Analyze a bug
description: "Analyzes a bug from symptoms and logs: root cause hypotheses, how to reproduce it, proposed fix and regression test."
icon: 🐞
mode: agent
agent: developer
tools: [search, usages, problems, runCommands]
tags: [dev, qa, bugs]
audience: [dev, qa]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Analyze this bug:

## Symptoms
{{symptoms: What happens, what was expected and since when}}

## Logs / traces
{{logs: Paste logs, stack traces or screenshots (optional)}}

## Task
1. Minimal steps to **reproduce** it.
2. Root cause **hypotheses** ordered by likelihood, with evidence from the code.
3. Proposed (minimal) fix and alternatives.
4. A **regression test** that fails before and passes after.
5. Impact and possible side effects.

State on the first line whether it is **REPRODUCIBLE** or **NOT REPRODUCIBLE** with the available information.
