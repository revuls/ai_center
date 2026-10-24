---
name: Refine an idea into stories
description: Turns a business idea or need into user stories with acceptance criteria, value and priority.
icon: 🎯
mode: agent
agent: product-owner
tags: [product, agile]
audience: [po, business]
targets: [copilot, m365, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Act as a senior Product Owner.

# Idea or need
{{idea: Describe the idea, the problem or the request}}

# Additional context
{{context: Affected users, constraints, dates, links… (optional)}}

# Task
1. Summarize the problem and the business goal, and how we will measure success.
2. Split it into small, independent user stories.
3. For each story: *As/I want/So that* format, acceptance criteria in **Gherkin** (including errors and edge cases) and notes (dependencies, out of scope, questions).
4. Finish with a table: ID · Title · Value · Effort (S/M/L) · Priority.

If essential information is missing, ask up to 3 questions first.
