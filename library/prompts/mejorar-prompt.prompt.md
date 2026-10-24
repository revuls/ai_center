---
name: Mejorar un prompt
description: "Meta-prompt: analiza un prompt existente y devuelve una versión mejorada (rol, contexto, tarea, formato, ejemplos) lista para la librería."
icon: 🪄
tags: [ia, prompting]
audience: [todos]
targets: [copilot, m365, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Eres experto en prompt engineering. Mejora este prompt para que sea claro, robusto y reutilizable:

"""
{{prompt: pega el prompt actual}}
"""

Se usará en: {{herramienta: GitHub Copilot / Copilot M365 / Claude / otra}}
Objetivo: {{objetivo: qué resultado se espera}}

1. Diagnóstico: qué falta o es ambiguo (rol, contexto, tarea, restricciones, formato, ejemplos).
2. Versión mejorada con variables {{así}} para las partes que cambian.
3. Nombre, descripción (cuándo usarlo) y etiquetas sugeridas para guardarlo en AI Center.
