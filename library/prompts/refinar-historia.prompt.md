---
name: Refinar idea en historias
description: Convierte una idea o necesidad de negocio en historias de usuario con criterios de aceptación, valor y prioridad.
icon: 🎯
mode: agent
agent: product-owner
tags: [producto, agile]
audience: [po, negocio]
targets: [copilot, m365, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Actúa como Product Owner senior.

# Idea o necesidad
{{idea: Describe la idea, el problema o la petición}}

# Contexto adicional
{{contexto: Usuarios afectados, restricciones, fechas, enlaces… (opcional)}}

# Tarea
1. Resume el problema y el objetivo de negocio, y cómo mediremos el éxito.
2. Divide en historias de usuario pequeñas e independientes.
3. Para cada historia: formato *Como/Quiero/Para*, criterios de aceptación en **Gherkin** (incluye errores y casos límite) y notas (dependencias, fuera de alcance, preguntas).
4. Termina con una tabla: ID · Título · Valor · Esfuerzo (S/M/L) · Prioridad.

Si falta información imprescindible, haz primero hasta 3 preguntas.
