---
name: Analizar bug
description: "Analiza un bug a partir de síntomas y logs: hipótesis de causa raíz, cómo reproducirlo, corrección propuesta y test de regresión."
icon: 🐞
mode: agent
agent: developer
tools: [search, usages, problems, runCommands]
tags: [dev, qa, bugs]
audience: [dev, qa]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Analiza este bug:

## Síntomas
{{sintomas: Qué ocurre, qué se esperaba y desde cuándo}}

## Logs / trazas
{{logs: Pega logs, stack traces o capturas (opcional)}}

## Tarea
1. Pasos mínimos para **reproducirlo**.
2. **Hipótesis** de causa raíz ordenadas por probabilidad, con evidencia del código.
3. Corrección propuesta (mínima) y alternativas.
4. **Test de regresión** que falle antes y pase después.
5. Impacto y posibles efectos colaterales.

Indica en la primera línea si es **REPRODUCIBLE** o **NO REPRODUCIBLE** con la información disponible.
