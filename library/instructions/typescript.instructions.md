---
name: Convenciones TypeScript
description: "Estándares para código TypeScript/React: tipado estricto, funciones puras, manejo de errores y estilo."
icon: 🟦
applyTo: "**/*.ts,**/*.tsx"
tags: [dev, typescript]
audience: [dev]
targets: [copilot, claude, cursor]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- Usa `strict` y evita `any`; prefiere `unknown` + *type guards*.
- Funciones pequeñas y puras; efectos secundarios en los bordes (servicios, adaptadores).
- Nombres descriptivos en inglés; `camelCase` para variables/funciones y `PascalCase` para tipos y componentes.
- Maneja errores explícitamente: nunca silencies excepciones; usa tipos `Result` o errores de dominio.
- Componentes React: funcionales, *hooks* para estado, props tipadas, sin lógica de negocio en la vista.
- Importa por alias de ruta del proyecto; no uses rutas relativas profundas (`../../../`).
- Cada cambio de comportamiento va acompañado de tests.
