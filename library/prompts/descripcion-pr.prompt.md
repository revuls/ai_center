---
name: Descripción de Pull Request
description: "Redacta la descripción de una PR a partir de los cambios: qué, por qué, cómo probarlo, riesgos y título en Conventional Commits."
icon: 📬
agent: tech-writer
tools: [changes, search]
tags: [dev, documentacion, git]
audience: [dev]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Redacta la descripción de la Pull Request para estos cambios:

{{cambios: Pega el diff o describe los cambios (en Copilot puedes usar #changes)}}

Historia/issue relacionada: {{issue: enlace o ID (opcional)}}

Formato:
- **Título** (Conventional Commits)
- ## Qué cambia
- ## Por qué
- ## Cómo probarlo (pasos)
- ## Riesgos y plan de vuelta atrás
- ## Checklist (tests, docs, seguridad)
