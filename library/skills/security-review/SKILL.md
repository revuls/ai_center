---
name: security-review
description: Analyzes designs or code looking for vulnerabilities (OWASP Top 10, secret management, authorization, personal data) and proposes mitigations. Use it for technical designs and sensitive PRs.
metadata:
  title: Security review
  icon: 🛡️
  tags: security, architecture, dev
  audience: dev, architecture
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Security review

## Checklist (OWASP Top 10 and more)
- **Access control**: server-side authorization, least privilege, IDOR.
- **Cryptography**: TLS, encryption at rest, no obsolete algorithms.
- **Injection**: SQL/NoSQL/command/LDAP; parameterized queries.
- **Insecure design**: threats modeled (STRIDE) for critical flows.
- **Configuration**: headers, CORS, *debug* disabled, secure defaults.
- **Vulnerable components**: up-to-date dependencies, SCA in CI.
- **Authentication**: MFA, sessions, token rotation.
- **Integrity**: signatures, protected pipelines, supply chain.
- **Logging**: security events recorded, no sensitive data.
- **SSRF** and controlled outbound calls.
- **Secrets**: never in code; use a secret manager.
- **Personal data**: minimization, legal basis (GDPR), retention.

## Output
Table of findings with **severity** (Critical/High/Medium/Low), description, impact and mitigation.
