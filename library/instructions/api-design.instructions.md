---
name: Diseño de APIs
description: "Guía para diseñar y modificar APIs REST: recursos, códigos HTTP, versionado, errores y compatibilidad."
icon: 🌐
applyTo: src/api/**,**/*controller*,**/*.openapi.*
tags: [dev, arquitectura, api]
audience: [dev, arquitectura]
targets: [copilot, claude, cursor]
status: review
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

- Recursos en plural y sustantivos (`/invoices/{id}`), verbos HTTP con su semántica.
- Códigos: 200/201/204 éxito, 400 validación, 401/403 autenticación/autorización, 404, 409 conflicto, 422 negocio.
- Errores con formato **RFC 9457 (Problem Details)**.
- Cambios **retrocompatibles** por defecto; los incompatibles requieren nueva versión (`/v2`).
- Paginación por cursor para colecciones grandes; filtros por query params.
- Documenta cada endpoint en OpenAPI con ejemplos de petición y respuesta.
