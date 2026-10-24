---
name: Reference architecture
description: "Overview of the system architecture: components, technologies, integrations and principles. Basis for technical designs and reviews."
icon: 🏗️
kind: architecture
tags: [architecture]
audience: [dev, architecture]
targets: [any]
status: draft
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

> ✏️ Template: describe your real architecture. The more concrete it is, the better the designs the AI will propose.

## Context
- System: …
- Main users: …

## Components
| Component | Responsibility | Technology |
|---|---|---|
| Web frontend | Customer UI | React + TypeScript |
| API | Business logic | Node.js / .NET / Java |
| Database | Persistence | PostgreSQL |
| Messaging | Domain events | Kafka / Service Bus |

## Principles
- Hexagonal architecture: domain isolated from infrastructure.
- Synchronous communication (REST) for queries; asynchronous (events) between domains.
- Secure by default: OAuth2/OIDC, least privilege, encryption in transit and at rest.
- Observability: structured logs, distributed traces, RED metrics.

## Constraints
- Cloud: …
- Regulation: GDPR, …
