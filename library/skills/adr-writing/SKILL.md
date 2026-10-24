---
name: adr-writing
description: Documenta decisiones de arquitectura como ADR (contexto, opciones, decisión, consecuencias). Úsala cuando haya que elegir entre alternativas técnicas relevantes.
metadata:
  title: Architecture Decision Records
  icon: 🧭
  tags: arquitectura, documentacion
  audience: arquitectura, dev
  targets: any
  status: stable
  version: "1.0.0"
  author: AI Center
  updated: 2026-10-24
---

# Architecture Decision Records

## Cuándo usarla
- Elegir tecnología, patrón, proveedor o estructura con impacto a medio plazo.
- Cambiar una decisión anterior (crear un ADR nuevo que la sustituya).

## Procedimiento
1. Describe el **contexto**: problema, fuerzas, restricciones y requisitos de calidad.
2. Lista **2-4 opciones** reales (incluida "no hacer nada" si aplica).
3. Compara con una **tabla** de criterios (coste, complejidad, rendimiento, seguridad, encaje con la arquitectura, reversibilidad).
4. Escribe la **decisión** en una frase y su justificación.
5. Enumera **consecuencias** positivas, negativas y riesgos con mitigación.
6. Usa la plantilla `templates/adr-template.md`.

## Buenas prácticas
- Un ADR = una decisión. Breve (1-2 páginas).
- Los ADR no se editan una vez aceptados: se **sustituyen**.
