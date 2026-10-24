---
name: code-review-checklist
description: "Systematic code change review: correctness, security, performance, readability and tests, with prioritized findings. Use it when reviewing PRs or diffs."
metadata:
  title: Code review checklist
  icon: 🔍
  tags: dev, quality
  audience: dev
  targets: copilot, claude, cursor, any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Code review checklist

## Procedure
1. Understand the change's **goal** (story, issue, PR description).
2. Review in this order: **correctness → security → data → performance → design → readability → tests**.
3. Classify each finding: 🔴 **Blocker** · 🟠 **Important** · 🟡 **Suggestion** · 💬 **Question**.
4. For each finding give **file:line**, the problem, the why and a **concrete proposal**.
5. End with a **verdict**: Approve / Approve with changes / Changes required.

## What to look for
- **Correctness**: logic, edge cases, nulls, concurrency, error handling.
- **Security**: input validation, injection, authorization, secrets, personal data in logs.
- **Data**: reversible migrations, indexes, transactions.
- **Performance**: N+1, expensive loops, serial calls that could run in parallel.
- **Design**: clear responsibilities, coupling, duplication.
- **Readability**: names, long functions, comments explaining the *why*.
- **Tests**: they cover the change, are deterministic and readable.

## Output format
| Priority | Location | Finding | Proposal |
|---|---|---|---|
