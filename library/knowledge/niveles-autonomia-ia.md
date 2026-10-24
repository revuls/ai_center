---
name: Niveles de autonomía de la IA
description: Cuándo dejar que la IA actúe sola y cuándo exigir revisión humana. Úsalo al diseñar workflows y agentes.
icon: 🎚️
kind: guideline
tags: [gobierno, workflows]
audience: [todos]
targets: [any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

| Nivel | La IA… | Ejemplos | Revisión humana |
|---|---|---|---|
| 0 · Asistente | Sugiere; la persona decide y ejecuta | Redactar un correo, explicar código | Siempre |
| 1 · Copiloto | Ejecuta tareas acotadas y reversibles | Generar tests, refactor local | Antes de integrar |
| 2 · Agente supervisado | Encadena pasos con puntos de control | Feature E2E con aprobación del PO | En los hitos (historia, diseño, PR) |
| 3 · Agente autónomo | Ejecuta de principio a fin | Actualizar dependencias menores, informes recurrentes | Muestreo y alertas |

**Regla**: cuanto más irreversible o visible para clientes sea la acción, más bajo el nivel de autonomía.
