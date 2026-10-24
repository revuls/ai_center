---
name: conventional-commits
description: Genera mensajes de commit y títulos de PR siguiendo Conventional Commits. Úsala al hacer commit o preparar una PR.
metadata:
  title: Conventional Commits
  icon: 🏷️
  tags: dev, git
  audience: dev
  targets: copilot, claude, cursor, any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Conventional Commits

Formato: `<tipo>(<ámbito opcional>): <descripción en imperativo, minúsculas, sin punto>`

| Tipo | Uso |
|---|---|
| feat | Nueva funcionalidad |
| fix | Corrección de bug |
| docs | Solo documentación |
| refactor | Cambio interno sin cambiar comportamiento |
| test | Añadir o corregir tests |
| perf | Mejora de rendimiento |
| build / ci | Build, dependencias, pipelines |
| chore | Mantenimiento |

## Reglas
- Descripción ≤ 72 caracteres, en inglés.
- Cuerpo opcional: el **porqué** del cambio.
- Cambios incompatibles: `!` tras el tipo y pie `BREAKING CHANGE: …`.
- Referencia issues en el pie: `Refs: #123`.

## Ejemplos
- `feat(invoices): add PDF export`
- `fix(auth): refresh token before expiration`
- `refactor!: drop support for Node 16`
