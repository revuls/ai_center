---
name: Cómo escribimos tests
description: "Normas para tests automatizados: estructura AAA, nombres expresivos, aislamiento y cobertura de casos límite."
icon: 🧪
applyTo: "**/*.test.*,**/*.spec.*,**/tests/**,**/__tests__/**"
tags: [dev, qa, testing]
audience: [dev, qa]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- Estructura **Arrange / Act / Assert** y un comportamiento por test.
- Nombre del test = comportamiento esperado: `should <resultado> when <condición>`.
- Cubre el camino feliz, **casos límite** (vacíos, nulos, máximos) y errores.
- Tests deterministas: sin dependencias de red, reloj o aleatoriedad (usa *fakes* y *fixtures*).
- Mocks solo en los bordes del sistema; no mockees lo que estás probando.
- Si arreglas un bug, añade primero un test que lo reproduzca.
