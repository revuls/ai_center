<!-- Generado con: node cli/aic.mjs agents-md -->

# AGENTS.md · AI Center

> Guía para agentes de IA (GitHub Copilot coding agent, Copilot CLI, Claude Code, Codex, Cursor…). Generado por AI Center: edita el original en `/library`.

## Normas del equipo

### Normas del equipo para la IA

- Responde en **español** salvo que se pida otro idioma; el código, identificadores y commits en inglés.
- **No inventes**: si falta información imprescindible, pregunta. Si asumes algo, decláralo como *Supuesto*.
- Prioriza **claridad y concisión**: listas, tablas y ejemplos antes que párrafos largos.
- **Seguridad**: nunca incluyas secretos, credenciales ni datos personales reales en código, ejemplos o documentación.
- Cuando propongas cambios de código, explica el **porqué** y los **riesgos**, y sugiere cómo probarlos.
- Respeta las convenciones existentes del proyecto antes que tus preferencias.
- Antes de acciones irreversibles (borrar, desplegar, enviar a terceros) pide confirmación explícita.

## Agentes especializados

Adopta el rol adecuado según la tarea:

| Agente | Cuándo usarlo | Definición |
|---|---|---|
| 🏗️ Arquitecto de soluciones | Diseña soluciones técnicas a partir de historias: componentes, APIs, datos, seguridad, riesgos y plan de implementación. Documenta decisiones como ADR. | [`library/agents/architect.agent.md`](library/agents/architect.agent.md) |
| 💼 Asistente de negocio | Asistente para negocio en Copilot M365: resume reuniones, redacta correos e informes ejecutivos, prepara presentaciones y extrae acciones. Pensado para Outlook, Teams y Word. | [`library/agents/asistente-negocio.agent.md`](library/agents/asistente-negocio.agent.md) |
| 🔍 Revisor de código | Revisa diffs y PRs buscando bugs, problemas de seguridad, rendimiento y mantenibilidad; devuelve hallazgos priorizados y un veredicto. Úsalo antes de abrir o aprobar una PR. | [`library/agents/code-reviewer.agent.md`](library/agents/code-reviewer.agent.md) |
| 🧑‍💻 Desarrollador | Implementa cambios de código siguiendo el diseño y las convenciones del repo, con tests y commits limpios. Úsalo en modo agente para tareas de implementación. | [`library/agents/developer.agent.md`](library/agents/developer.agent.md) |
| 🎯 Product Owner | Asistente de producto: convierte ideas en historias de usuario claras, con criterios de aceptación, valor y prioridad. Úsalo para refinar backlog y preparar sprints. | [`library/agents/product-owner.agent.md`](library/agents/product-owner.agent.md) |
| 🧪 QA Engineer | Diseña la estrategia y los casos de prueba, genera tests automatizados y hace pruebas exploratorias con navegador. Úsalo para validar historias antes de cerrarlas. | [`library/agents/qa-engineer.agent.md`](library/agents/qa-engineer.agent.md) |
| ✍️ Tech Writer | Redacta documentación técnica y de producto: descripciones de PR, READMEs, guías, changelogs y release notes para públicos técnicos y de negocio. | [`library/agents/tech-writer.agent.md`](library/agents/tech-writer.agent.md) |
| 🎼 Orquestador de workflows | Ejecuta workflows de AI Center de principio a fin: lee el runbook, adopta el rol de cada agente en cada paso, guarda entregables y se detiene en las revisiones humanas. | [`library/agents/workflow-orchestrator.agent.md`](library/agents/workflow-orchestrator.agent.md) |

## Workflows ejecutables E2E

Cuando te pidan ejecutar un workflow, abre su runbook y síguelo paso a paso (incluidas las paradas de revisión humana):

- **Corrección de bug** — Del reporte de un bug a la corrección verificada: análisis de causa raíz, reproducción, fix mínimo con test de regresión y revisión. → [`library/workflows/bugfix.workflow.json`](library/workflows/bugfix.workflow.json)
- **Feature de principio a fin** — De una idea de negocio a una Pull Request lista: refinamiento con el PO, diseño técnico, implementación con tests, revisión de código, QA y documentación, con aprobaciones humanas en los hitos. → [`library/workflows/feature-e2e.workflow.json`](library/workflows/feature-e2e.workflow.json)
- **De idea a backlog priorizado** — Para Product Owners: analiza una iniciativa, la divide en historias, define criterios de aceptación y prioriza con RICE, con validación de negocio. → [`library/workflows/idea-a-backlog.workflow.json`](library/workflows/idea-a-backlog.workflow.json)
- **Release comunicada** — Prepara una versión: release notes técnicas, comunicado para negocio/clientes e informe ejecutivo, con revisión antes de publicar. → [`library/workflows/release-comunicada.workflow.json`](library/workflows/release-comunicada.workflow.json)
- **De reunión a acciones** — Convierte una reunión en resumen, plan de acciones y correo de seguimiento listo para enviar. Pensado para Copilot M365 (Teams y Outlook). → [`library/workflows/reunion-a-acciones.workflow.json`](library/workflows/reunion-a-acciones.workflow.json)

## Skills

- **Architecture Decision Records** — Documenta decisiones de arquitectura como ADR (contexto, opciones, decisión, consecuencias). Úsala cuando haya que elegir entre alternativas técnicas relevantes. → [`library/skills/adr-writing/SKILL.md`](library/skills/adr-writing/SKILL.md)
- **Checklist de revisión de código** — Revisión sistemática de cambios de código: corrección, seguridad, rendimiento, legibilidad y tests, con hallazgos priorizados. Úsala al revisar PRs o diffs. → [`library/skills/code-review-checklist/SKILL.md`](library/skills/code-review-checklist/SKILL.md)
- **Conventional Commits** — Genera mensajes de commit y títulos de PR siguiendo Conventional Commits. Úsala al hacer commit o preparar una PR. → [`library/skills/conventional-commits/SKILL.md`](library/skills/conventional-commits/SKILL.md)
- **Resumen de reuniones** — Convierte transcripciones o notas de reuniones en un resumen accionable: decisiones, acciones con responsable y fecha, riesgos y dudas. Úsala tras reuniones de Teams o notas sueltas. → [`library/skills/meeting-summary/SKILL.md`](library/skills/meeting-summary/SKILL.md)
- **Revisión de seguridad** — Analiza diseños o código buscando vulnerabilidades (OWASP Top 10, gestión de secretos, autorización, datos personales) y propone mitigaciones. Úsala en diseños técnicos y PRs sensibles. → [`library/skills/security-review/SKILL.md`](library/skills/security-review/SKILL.md)
- **Diseño de casos de prueba** — Diseña casos de prueba a partir de historias o código usando particiones de equivalencia, valores límite, tablas de decisión y escenarios de error. Úsala al preparar planes de prueba o tests automatizados. → [`library/skills/test-case-design/SKILL.md`](library/skills/test-case-design/SKILL.md)
- **Redacción de historias de usuario** — Redacta y refina historias de usuario con formato estándar, criterios de aceptación en Gherkin y checklist INVEST. Úsala al convertir ideas o requisitos en historias listas para desarrollo. → [`library/skills/user-story-writing/SKILL.md`](library/skills/user-story-writing/SKILL.md)

## Conocimiento de referencia

- [Arquitectura de referencia](library/knowledge/arquitectura-referencia.md) — Visión general de la arquitectura del sistema: componentes, tecnologías, integraciones y principios. Base para diseños técnicos y revisiones.
- [Definition of Done](library/knowledge/definition-of-done.md) — Criterios que una historia debe cumplir para considerarse terminada. Úsalo al implementar, revisar y validar.
- [Estilo de comunicación](library/knowledge/estilo-comunicacion.md) — Tono y formato para correos, informes y comunicaciones del equipo hacia negocio, clientes y dirección.
- [Glosario del dominio](library/knowledge/glosario.md) — Términos de negocio y técnicos del equipo con su significado. Rellénalo con vuestro dominio: los agentes lo usan para hablar vuestro idioma.
- [Niveles de autonomía de la IA](library/knowledge/niveles-autonomia-ia.md) — Cuándo dejar que la IA actúe sola y cuándo exigir revisión humana. Úsalo al diseñar workflows y agentes.

## Prompts reutilizables

- **Analizar bug** — Analiza un bug a partir de síntomas y logs: hipótesis de causa raíz, cómo reproducirlo, corrección propuesta y test de regresión. → `library/prompts/analizar-bug.prompt.md`
- **Criterios de aceptación (Gherkin)** — Genera criterios de aceptación completos en Gherkin para una historia, incluidos casos límite y de error. → `library/prompts/criterios-aceptacion.prompt.md`
- **Descripción de Pull Request** — Redacta la descripción de una PR a partir de los cambios: qué, por qué, cómo probarlo, riesgos y título en Conventional Commits. → `library/prompts/descripcion-pr.prompt.md`
- **Diseño técnico** — Genera el diseño técnico de una historia: componentes, contratos, datos, seguridad, riesgos y plan de implementación. → `library/prompts/diseno-tecnico.prompt.md`
- **Correo ejecutivo** — Redacta un correo claro y breve para dirección o clientes: lo importante primero, contexto mínimo y petición concreta. → `library/prompts/email-ejecutivo.prompt.md`
- **Explicar código** — Explica qué hace un fragmento de código, cómo encaja en el sistema y sus riesgos. Ideal para onboarding y código heredado. → `library/prompts/explicar-codigo.prompt.md`
- **Generar tests** — Genera tests automatizados para un fichero o función cubriendo camino feliz, casos límite y errores, siguiendo las convenciones del repo. → `library/prompts/generar-tests.prompt.md`
- **Informe ejecutivo** — Convierte datos, notas o documentos en un informe ejecutivo de una página: situación, logros, riesgos y decisiones necesarias. → `library/prompts/informe-ejecutivo.prompt.md`
- **Mejorar un prompt** — Meta-prompt: analiza un prompt existente y devuelve una versión mejorada (rol, contexto, tarea, formato, ejemplos) lista para la librería. → `library/prompts/mejorar-prompt.prompt.md`
- **Plan de pruebas** — Crea un plan de pruebas para una historia o funcionalidad: alcance, casos priorizados por riesgo, automatización y datos de prueba. → `library/prompts/plan-de-pruebas.prompt.md`
- **Priorizar backlog (RICE)** — Prioriza iniciativas o historias con RICE (Reach, Impact, Confidence, Effort) y justifica el orden propuesto. → `library/prompts/priorizar-backlog.prompt.md`
- **Refinar idea en historias** — Convierte una idea o necesidad de negocio en historias de usuario con criterios de aceptación, valor y prioridad. → `library/prompts/refinar-historia.prompt.md`
- **Release notes** — Genera notas de versión a partir de commits, PRs o historias, adaptadas al público (técnico, negocio o clientes). → `library/prompts/release-notes.prompt.md`
- **Resumen de reunión y acciones** — Resume una reunión (transcripción o notas) en decisiones, acciones con responsable y fecha, riesgos y dudas. Perfecto en Teams con Copilot M365. → `library/prompts/resumen-reunion.prompt.md`
- **Revisar código seleccionado** — Revisa el código seleccionado (o un diff) y devuelve hallazgos priorizados con propuestas de mejora. → `library/prompts/revisar-codigo.prompt.md`

## Instrucciones por tipo de fichero

- `src/api/**,**/*controller*,**/*.openapi.*` → **Diseño de APIs**: Guía para diseñar y modificar APIs REST: recursos, códigos HTTP, versionado, errores y compatibilidad.
- `**/*.test.*,**/*.spec.*,**/tests/**,**/__tests__/**` → **Cómo escribimos tests**: Normas para tests automatizados: estructura AAA, nombres expresivos, aislamiento y cobertura de casos límite.
- `**/*.ts,**/*.tsx` → **Convenciones TypeScript**: Estándares para código TypeScript/React: tipado estricto, funciones puras, manejo de errores y estilo.

## Cómo ejecutar un workflow de este framework

1. Lee el JSON del workflow en `library/workflows/<id>.workflow.json` o, mejor, su runbook: `node cli/aic.mjs runbook <id>`.
2. Sigue el runbook paso a paso adoptando el rol de cada agente (`library/agents/`), aplicando sus skills (`library/skills/`) y su conocimiento (`library/knowledge/`).
3. Detente en las revisiones humanas.
4. Para ejecutarlo de forma automática: `node cli/aic.mjs run <id> --provider copilot|claude-code|anthropic|github`.

## Mantener la librería

- Edita ficheros en `library/` respetando el formato de `docs/FORMATO.md`.
- Después: `node cli/aic.mjs lint && node cli/aic.mjs bundle`.
