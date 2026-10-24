---
name: user-story-writing
description: Redacta y refina historias de usuario con formato estándar, criterios de aceptación en Gherkin y checklist INVEST. Úsala al convertir ideas o requisitos en historias listas para desarrollo.
metadata:
  title: Redacción de historias de usuario
  icon: 📝
  tags: producto, agile
  audience: po, negocio, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Redacción de historias de usuario

## Cuándo usarla
- Convertir una idea, petición o requisito en una o varias historias.
- Revisar si una historia está lista para desarrollo (*Definition of Ready*).

## Procedimiento
1. Identifica **quién** (rol/persona), **qué** necesita y **para qué** (valor).
2. Redacta: **Como** <rol> **quiero** <capacidad> **para** <beneficio>.
3. Si es demasiado grande, **divide** por flujo, regla de negocio, datos o interfaz (SPIDR).
4. Escribe **criterios de aceptación** en Gherkin (3-7 escenarios): camino feliz, alternativas y errores.
5. Añade **notas**: dependencias, fuera de alcance, preguntas abiertas, métricas de éxito.
6. Comprueba **INVEST**.

## Plantilla
```markdown
### HU-XXX · <título corto orientado a valor>
**Como** … **quiero** … **para** …

#### Criterios de aceptación
```gherkin
Escenario: <camino feliz>
  Dado …
  Cuando …
  Entonces …
```

#### Notas
- Fuera de alcance: …
- Preguntas abiertas: …
- Métrica de éxito: …
```

## Checklist INVEST
- [ ] **I**ndependiente  - [ ] **N**egociable  - [ ] **V**aliosa
- [ ] **E**stimable  - [ ] **S**mall (cabe en un sprint)  - [ ] **T**esteable
