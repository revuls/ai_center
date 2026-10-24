---
name: Explicar código
description: Explica qué hace un fragmento de código, cómo encaja en el sistema y sus riesgos. Ideal para onboarding y código heredado.
icon: 🧑‍🏫
mode: ask
tags: [dev, onboarding]
audience: [dev, qa]
targets: [copilot, claude, cursor, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Explica este código para alguien que se incorpora al equipo:

{{selection}}

1. Qué hace, en 3 líneas.
2. Cómo funciona paso a paso.
3. Dependencias y cómo encaja en el sistema.
4. Riesgos, deuda técnica o casos no cubiertos.
5. Un diagrama Mermaid si ayuda.

Nivel del lector: {{nivel: junior / senior / no técnico}}
