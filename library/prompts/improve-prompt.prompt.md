---
name: Improve a prompt
description: "Meta-prompt: analyzes an existing prompt and returns an improved version (role, context, task, format, examples) ready for the library."
icon: 🪄
tags: [ai, prompting]
audience: [all]
targets: [copilot, m365, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

You are a prompt engineering expert. Improve this prompt so it is clear, robust and reusable:

"""
{{prompt: paste the current prompt}}
"""

It will be used in: {{tool: GitHub Copilot / Copilot M365 / Claude / other}}
Goal: {{goal: what result is expected}}

1. Diagnosis: what is missing or ambiguous (role, context, task, constraints, format, examples).
2. Improved version with {{variables}} for the parts that change.
3. Suggested name, description (when to use it) and tags to save it in AI Center.
