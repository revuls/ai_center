---
name: API design
description: "Guide for designing and changing REST APIs: resources, HTTP codes, versioning, errors and compatibility."
icon: 🌐
applyTo: src/api/**,**/*controller*,**/*.openapi.*
tags: [dev, architecture, api]
audience: [dev, architecture]
targets: [copilot, claude, cursor]
status: review
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- Plural, noun-based resources (`/invoices/{id}`), HTTP verbs with their semantics.
- Codes: 200/201/204 success, 400 validation, 401/403 authentication/authorization, 404, 409 conflict, 422 business rule.
- Errors in **RFC 9457 (Problem Details)** format.
- **Backward-compatible** changes by default; breaking changes require a new version (`/v2`).
- Cursor pagination for large collections; filters via query params.
- Document every endpoint in OpenAPI with request and response examples.
