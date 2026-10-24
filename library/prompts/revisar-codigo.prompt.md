---
name: Revisar código seleccionado
description: Revisa el código seleccionado (o un diff) y devuelve hallazgos priorizados con propuestas de mejora.
icon: 🔍
mode: ask
agent: code-reviewer
tools: [search, usages, problems]
tags: [dev, calidad]
audience: [dev]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Revisa este código aplicando la checklist de revisión (corrección, seguridad, rendimiento, diseño, legibilidad y tests):

{{selection}}

Foco especial: {{foco: p. ej. seguridad, rendimiento, legibilidad (opcional)}}

Devuelve:
1. Veredicto en una línea.
2. Tabla de hallazgos: Prioridad (🔴🟠🟡💬) · Ubicación · Problema · Propuesta.
3. Versión mejorada de los fragmentos más importantes.
