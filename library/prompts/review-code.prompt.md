---
name: Review selected code
description: Reviews the selected code (or a diff) and returns prioritized findings with improvement proposals.
icon: 🔍
mode: ask
agent: code-reviewer
tools: [search, usages, problems]
tags: [dev, quality]
audience: [dev]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Review this code applying the review checklist (correctness, security, performance, design, readability and tests):

{{selection}}

Special focus: {{focus: e.g. security, performance, readability (optional)}}

Return:
1. One-line verdict.
2. Findings table: Priority (🔴🟠🟡💬) · Location · Problem · Proposal.
3. Improved version of the most important fragments.
