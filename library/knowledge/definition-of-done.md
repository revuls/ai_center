---
name: Definition of Done
description: Criterios que una historia debe cumplir para considerarse terminada. Úsalo al implementar, revisar y validar.
icon: ✅
kind: process
tags: [proceso, calidad]
audience: [todos]
targets: [any]
status: stable
version: "1.0.0"
author: AI Center
updated: 2026-10-24
---

## Una historia está terminada cuando…

- [ ] Cumple **todos** los criterios de aceptación acordados con el PO.
- [ ] El código está **revisado** por al menos una persona (o el agente Revisor + una persona).
- [ ] Tiene **tests automatizados** (unitarios y, si aplica, de integración) en verde en CI.
- [ ] No introduce **vulnerabilidades** conocidas ni secretos.
- [ ] La **documentación** relevante está actualizada (README, API, ADR si hubo decisión).
- [ ] Se ha probado en un entorno de **preproducción**.
- [ ] Las **métricas/observabilidad** necesarias están en su sitio (logs, trazas, alertas).
- [ ] El PO ha **aceptado** la historia.
