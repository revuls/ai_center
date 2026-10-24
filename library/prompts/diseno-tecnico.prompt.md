---
name: Diseño técnico
description: "Genera el diseño técnico de una historia: componentes, contratos, datos, seguridad, riesgos y plan de implementación."
icon: 📐
mode: agent
agent: architect
tools: [search, usages, fetch]
tags: [arquitectura, diseño]
audience: [arquitectura, dev]
targets: [copilot, claude, any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

Diseña la solución técnica para esta historia:

{{historia: Historia de usuario con criterios de aceptación}}

Restricciones o preferencias: {{restricciones: tecnologías, plazos, NFR (opcional)}}

Entrega:
1. Resumen de la solución.
2. Componentes afectados y diagrama (Mermaid).
3. Contratos de API / eventos y cambios en el modelo de datos.
4. Seguridad (aplica la revisión de seguridad).
5. Alternativas consideradas y ADR si la decisión es relevante.
6. Plan de implementación en pasos pequeños con estrategia de pruebas.
