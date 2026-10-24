---
name: Generar tests
description: Genera tests automatizados para un fichero o función cubriendo camino feliz, casos límite y errores, siguiendo las convenciones del repo.
icon: 🧪
mode: agent
agent: qa-engineer
tools: [search, edit, runTests, testFailure]
tags: [dev, qa, testing]
audience: [dev, qa]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Genera tests automatizados para {{file}}.

- Framework y estilo: los que ya usa el repositorio (búscalos antes de empezar).
- Cubre: camino feliz, casos límite, errores y regresiones conocidas.
- Estructura AAA, un comportamiento por test, nombres expresivos.
- Sin dependencias de red ni reloj: usa fakes/fixtures.
- Ejecuta los tests y corrige hasta que pasen. Si encuentras un bug real, no lo ocultes: repórtalo.

Notas adicionales: {{notas: casos que te preocupan (opcional)}}
