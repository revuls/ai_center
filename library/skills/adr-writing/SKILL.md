---
name: adr-writing
description: Documents architecture decisions as ADRs (context, options, decision, consequences). Use it when choosing between relevant technical alternatives.
metadata:
  title: Architecture Decision Records
  icon: 🧭
  tags: architecture, documentation
  audience: architecture, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Architecture Decision Records

## When to use it
- Choosing a technology, pattern, vendor or structure with medium-term impact.
- Changing a previous decision (create a new ADR that supersedes it).

## Procedure
1. Describe the **context**: problem, forces, constraints and quality requirements.
2. List **2-4 real options** (including "do nothing" if applicable).
3. Compare them in a **table** of criteria (cost, complexity, performance, security, fit with the architecture, reversibility).
4. Write the **decision** in one sentence with its justification.
5. List positive and negative **consequences** and risks with mitigation.
6. Use the template `templates/adr-template.md`.

## Best practices
- One ADR = one decision. Short (1-2 pages).
- ADRs are not edited once accepted: they are **superseded**.
