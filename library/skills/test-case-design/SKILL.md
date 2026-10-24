---
name: test-case-design
description: Designs test cases from stories or code using equivalence partitioning, boundary values, decision tables and error scenarios. Use it when preparing test plans or automated tests.
metadata:
  title: Test case design
  icon: 🧪
  tags: qa, testing
  audience: qa, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Test case design

## Techniques
- **Equivalence partitioning**: one case per valid/invalid input class.
- **Boundary values**: minimum, minimum-1, maximum, maximum+1, empty.
- **Decision tables**: combinations of business rules.
- **State transitions**: valid and invalid states.
- **Errors and resilience**: timeouts, unavailable dependencies, corrupt data.
- **Non-functional**: security (OWASP), accessibility (WCAG), performance.

## Procedure
1. Extract rules and acceptance criteria.
2. Apply the techniques to generate cases; remove duplicates.
3. Prioritize by **risk** (impact × likelihood).
4. Decide what to automate (unit / integration / E2E) and what to explore manually.

## Format
| ID | Title | Preconditions | Steps | Expected result | Priority | Level |
|---|---|---|---|---|---|---|
