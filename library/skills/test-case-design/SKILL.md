---
name: test-case-design
description: Diseña casos de prueba a partir de historias o código usando particiones de equivalencia, valores límite, tablas de decisión y escenarios de error. Úsala al preparar planes de prueba o tests automatizados.
metadata:
  title: Diseño de casos de prueba
  icon: 🧪
  tags: qa, testing
  audience: qa, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Diseño de casos de prueba

## Técnicas
- **Particiones de equivalencia**: un caso por clase de entrada válida/inválida.
- **Valores límite**: mínimo, mínimo-1, máximo, máximo+1, vacío.
- **Tablas de decisión**: combinaciones de reglas de negocio.
- **Transición de estados**: estados válidos e inválidos.
- **Errores y resiliencia**: timeouts, dependencias caídas, datos corruptos.
- **No funcionales**: seguridad (OWASP), accesibilidad (WCAG), rendimiento.

## Procedimiento
1. Extrae reglas y criterios de aceptación.
2. Aplica las técnicas para generar casos; elimina duplicados.
3. Prioriza por **riesgo** (impacto × probabilidad).
4. Indica qué automatizar (unitario / integración / E2E) y qué probar en exploratorio.

## Formato
| ID | Título | Precondiciones | Pasos | Resultado esperado | Prioridad | Nivel |
|---|---|---|---|---|---|---|
