---
name: Technical design
description: "Produces the technical design of a story: components, contracts, data, security, risks and implementation plan."
icon: 📐
mode: agent
agent: architect
tools: [search, usages, fetch]
tags: [architecture, design]
audience: [architecture, dev]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Design the technical solution for this story:

{{story: User story with acceptance criteria}}

Constraints or preferences: {{constraints: technologies, deadlines, NFRs (optional)}}

Deliver:
1. Solution summary.
2. Affected components and diagram (Mermaid).
3. API / event contracts and data model changes.
4. Security (apply the security review).
5. Alternatives considered and an ADR if the decision matters.
6. Implementation plan in small steps with a testing strategy.
