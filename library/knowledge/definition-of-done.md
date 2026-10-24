---
name: Definition of Done
description: Criteria a story must meet to be considered done. Use it when implementing, reviewing and validating.
icon: ✅
kind: process
tags: [process, quality]
audience: [all]
targets: [any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

## A story is done when…

- [ ] It meets **all** acceptance criteria agreed with the PO.
- [ ] The code has been **reviewed** by at least one person (or the Reviewer agent + one person).
- [ ] It has **automated tests** (unit and, where relevant, integration) passing in CI.
- [ ] It introduces no known **vulnerabilities** or secrets.
- [ ] Relevant **documentation** is updated (README, API, ADR if a decision was made).
- [ ] It has been tested in a **pre-production** environment.
- [ ] The required **metrics/observability** are in place (logs, traces, alerts).
- [ ] The PO has **accepted** the story.
