---
name: user-story-writing
description: Writes and refines user stories in a standard format, with Gherkin acceptance criteria and an INVEST checklist. Use it when turning ideas or requirements into development-ready stories.
metadata:
  title: User story writing
  icon: 📝
  tags: product, agile
  audience: po, business, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# User story writing

## When to use it
- Turning an idea, request or requirement into one or more stories.
- Checking whether a story is ready for development (*Definition of Ready*).

## Procedure
1. Identify **who** (role/persona), **what** they need and **why** (value).
2. Write: **As** <role> **I want** <capability> **so that** <benefit>.
3. If it is too big, **split** it by workflow, business rule, data or interface (SPIDR).
4. Write **acceptance criteria** in Gherkin (3-7 scenarios): happy path, alternatives and errors.
5. Add **notes**: dependencies, out of scope, open questions, success metrics.
6. Check **INVEST**.

## Template
```markdown
### US-XXX · <short value-oriented title>
**As** … **I want** … **so that** …

#### Acceptance criteria
```gherkin
Scenario: <happy path>
  Given …
  When …
  Then …
```

#### Notes
- Out of scope: …
- Open questions: …
- Success metric: …
```

## INVEST checklist
- [ ] **I**ndependent  - [ ] **N**egotiable  - [ ] **V**aluable
- [ ] **E**stimable  - [ ] **S**mall (fits in a sprint)  - [ ] **T**estable
