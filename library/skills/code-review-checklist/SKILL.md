---
name: code-review-checklist
description: "Revisión sistemática de cambios de código: corrección, seguridad, rendimiento, legibilidad y tests, con hallazgos priorizados. Úsala al revisar PRs o diffs."
metadata:
  title: Checklist de revisión de código
  icon: 🔍
  tags: dev, calidad
  audience: dev
  targets: copilot, claude, cursor, any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Checklist de revisión de código

## Procedimiento
1. Entiende el **objetivo** del cambio (historia, issue, descripción de la PR).
2. Revisa en este orden: **corrección → seguridad → datos → rendimiento → diseño → legibilidad → tests**.
3. Clasifica cada hallazgo: 🔴 **Bloqueante** · 🟠 **Importante** · 🟡 **Sugerencia** · 💬 **Pregunta**.
4. Para cada hallazgo indica **fichero:línea**, el problema, el porqué y una **propuesta concreta**.
5. Termina con un **veredicto**: Aprobar / Aprobar con cambios / Cambios necesarios.

## Qué buscar
- **Corrección**: lógica, casos límite, nulos, concurrencia, manejo de errores.
- **Seguridad**: validación de entradas, inyección, autorización, secretos, datos personales en logs.
- **Datos**: migraciones reversibles, índices, transacciones.
- **Rendimiento**: N+1, bucles costosos, llamadas en serie que podrían ir en paralelo.
- **Diseño**: responsabilidades claras, acoplamiento, duplicación.
- **Legibilidad**: nombres, funciones largas, comentarios que explican el *porqué*.
- **Tests**: cubren el cambio, son deterministas y legibles.

## Formato de salida
| Prioridad | Ubicación | Hallazgo | Propuesta |
|---|---|---|---|
