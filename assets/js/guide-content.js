/* AI Center · guide-content.js — guía integrada (se muestra en #/guide) */
(function () {
  'use strict';
  window.AIC = window.AIC || {};
  window.AIC.GUIDE = [
    {
      id: 'start', icon: '🚀', title: 'Empezar',
      md: `# Bienvenido a AI Center

AI Center es el **framework del equipo para trabajar con IA**. Guarda en ficheros todo lo que hace que la IA funcione bien en tu contexto —prompts, agentes, skills, instrucciones, conocimiento, herramientas MCP y workflows— y lo **exporta a los formatos nativos** de GitHub Copilot, Copilot M365, Claude, Cursor o cualquier IA.

## Principios

- **Todo son ficheros** (\`.md\` con frontmatter y \`.json\`): se versionan en Git, se revisan en PR y se comparten como código. No hay base de datos.
- **Sin instalación**: abre \`index.html\` con doble clic. Sin servidor, sin dependencias.
- **Una fuente, muchas IAs**: defines una vez y exportas a Copilot (VS Code, coding agent, CLI), M365, Claude Code, Cursor…
- **Ejecutable de principio a fin**: los workflows se ejecutan desde la app, desde la CLI o por un agente (Copilot en modo agente, Copilot coding agent, Claude Code).

## Primeros pasos

1. Abre \`index.html\` en **Chrome o Edge** (permiten escribir en carpetas).
2. Pulsa **Conectar carpeta** (barra lateral) y elige la carpeta del framework (la que contiene \`library/\`).
3. Explora la librería, marca favoritos ★ y prueba un prompt con **Usar**.
4. Abre un workflow, revísalo en el lienzo y pulsa **Ejecutar** (modo *Simulación* para probar sin IA).
5. Ve a **Exportar a IAs** y genera los ficheros para tu repositorio.

## Cómo se comparte con el equipo

- Guarda la carpeta del framework en un **repositorio Git** (o en una carpeta compartida de OneDrive/SharePoint).
- Cada persona edita con la app (o con su editor) y abre un **Pull Request**: el diff es legible porque todo es Markdown.
- La app regenera \`library/library.bundle.js\` en cada cambio: así quien abra \`index.html\` **sin conectar carpeta** (por ejemplo, negocio desde OneDrive) ve siempre la librería actualizada en modo lectura.
- Para CI: \`node cli/aic.mjs lint\` valida la librería y \`node cli/aic.mjs export copilot --out <repo>\` genera los ficheros.

> **Sin Chrome/Edge**: la app funciona igual en modo lectura; tus cambios se guardan como borrador en el navegador y puedes **descargar un ZIP** para llevarlos a la carpeta.
`
    },
    {
      id: 'pieces', icon: '🧱', title: 'Las piezas y cuándo usarlas',
      md: `# Las piezas del framework

| Pieza | Qué es | Úsala cuando… | Se exporta a |
|---|---|---|---|
| 💬 **Prompt** | Plantilla reutilizable con \`{{variables}}\` | Repites la misma petición con datos distintos | \`.github/prompts/*.prompt.md\` (\`/comando\`), \`.claude/commands\`, texto para M365 |
| 🤖 **Agente** | Rol con instrucciones, herramientas, skills, conocimiento y handoffs | Quieres un especialista consistente (arquitecto, QA, PO…) | \`.github/agents/*.agent.md\`, agente declarativo M365, \`.claude/agents\` |
| 🧩 **Skill** | Procedimiento empaquetado (estándar *Agent Skills*, \`SKILL.md\` + recursos) | Hay un "cómo se hace" que varios agentes deben aplicar | \`.github/skills/\`, \`.claude/skills/\`, inline en M365 |
| 📏 **Instrucción** | Norma siempre activa (global) o por ficheros (\`applyTo\`) | Convenciones de código, idioma, estilo, seguridad | \`copilot-instructions.md\`, \`*.instructions.md\`, \`CLAUDE.md\`, \`.mdc\` |
| 📚 **Conocimiento** | Contexto de negocio/técnico | Glosario, arquitectura, DoD, procesos | \`docs/ai/knowledge/\`, inline en agentes M365 |
| 🔌 **MCP** | Servidor de herramientas (Model Context Protocol) | Los agentes necesitan actuar: GitHub, Jira, navegador, BBDD… | \`.vscode/mcp.json\`, \`.mcp.json\`, \`.cursor/mcp.json\` |
| 🔀 **Workflow** | Flujo E2E que combina todo lo anterior + revisiones humanas | Un proceso de varios pasos que quieres repetir y automatizar | Runbooks \`/wf-*\` para Copilot y Claude, guía M365, CLI |

## Reglas de oro

- **Descripción = cuándo usarlo.** Los agentes (y Copilot) eligen skills y agentes leyendo la descripción. Escríbela pensando en ellos.
- **Una pieza, una responsabilidad.** Mejor 3 skills pequeñas que un agente gigante.
- **El conocimiento no se copia en cada prompt**: se referencia desde el agente o el paso.
- **Las normas globales** (idioma, seguridad, estilo) van en instrucciones globales: se aplican a todo.
- **Estado y versión**: usa *Borrador → En revisión → Estable*. Los *Obsoletos* no se exportan.
`
    },
    {
      id: 'workflows', icon: '🔀', title: 'Workflows E2E',
      md: `# Workflows de principio a fin

Un workflow es un **grafo** de nodos conectados. Se diseña arrastrando piezas al lienzo.

## Tipos de nodo

- **▶ Inicio** — recibe las *entradas* del workflow (p. ej. \`idea\`, \`repositorio\`).
- **⚙ Paso** — trabajo de un **agente** y/o **prompt**, con **skills**, **conocimiento** y **herramientas MCP**.
- **🧑 Revisión humana** — el flujo se detiene hasta que alguien aprueba. Una salida etiquetada **«cambios»** indica a qué paso volver si se rechaza.
- **◆ Decisión** — bifurca según un criterio; las **etiquetas de las conexiones** son las opciones (\`sí\` / \`no\`…).
- **■ Fin** — consolida el entregable final (opcionalmente con un agente).
- **✎ Nota** — documentación en el lienzo.

## Diseñar

- Arrastra un **agente** o **prompt** al lienzo → se crea un paso.
- Suelta una **skill / conocimiento / MCP / agente** *sobre* un paso → se le añade.
- Haz **clic** en una pieza de la paleta → se añade **después del nodo seleccionado** y se conecta solo.
- Conecta arrastrando desde el punto **●** derecho de un nodo hasta otro.
- **Ordenar** distribuye el grafo automáticamente. **⌘Z** deshace.
- **Diseñar con IA**: describe el proceso, copia el prompt en Copilot/Claude y pega el JSON resultante.

## Variables

- \`{{entrada}}\` → valor de una entrada del workflow.
- \`{{salida}}\` → resultado de un paso con *Nombre de la salida* = \`salida\`.
- \`{{prev}}\` → resultado de los pasos conectados.
- Cada paso recibe automáticamente el resultado del anterior (configurable: anterior / todos / ninguno).

## Ejecutar

| Dónde | Cómo | Ideal para |
|---|---|---|
| **App · Manual** | Copias el prompt de cada paso a tu IA y pegas la respuesta | Copilot M365, Copilot Chat, cualquier IA sin API |
| **App · API** | Anthropic, OpenAI-compatible (GitHub Models, Ollama…), Azure OpenAI | Ejecución automática con revisiones humanas en pantalla |
| **App · Simulación** | Salidas de ejemplo | Validar el diseño |
| **Copilot (modo agente)** | Exporta y escribe \`/wf-<id>\` en el chat | Desarrollo en el IDE con herramientas reales |
| **Copilot coding agent / CLI** | "Ejecuta el workflow de \`.github/prompts/wf-<id>.prompt.md\`" | Trabajo autónomo sobre issues |
| **CLI** | \`node cli/aic.mjs run <id> --provider copilot\\|claude-code\\|anthropic\\|github…\` | Automatización, CI, ejecución agéntica en el repo |

Cada ejecución genera un **informe** (\`INFORME.md\`) y \`run.json\` en \`runs/\`.
`
    },
    {
      id: 'copilot', icon: '🐙', title: 'GitHub Copilot',
      md: `# Trabajar con GitHub Copilot

Exporta con destino **GitHub Copilot** y copia el resultado en la raíz del repositorio:

\`\`\`text
.github/
  copilot-instructions.md        ← instrucciones globales + catálogo de recursos
  instructions/*.instructions.md ← normas por tipo de fichero (applyTo)
  prompts/*.prompt.md            ← prompts → /nombre en el chat
  prompts/wf-*.prompt.md         ← workflows E2E → /wf-nombre (modo agente)
  agents/*.agent.md              ← custom agents (con tools, model y handoffs)
  skills/<id>/SKILL.md           ← agent skills
.vscode/mcp.json                 ← servidores MCP (secretos vía \${input:…})
docs/ai/knowledge/*.md           ← conocimiento referenciado por los agentes
AGENTS.md                        ← guía para coding agent, CLI y otros agentes
\`\`\`

## Consejos

- En prompts usa \`{{variable: ayuda}}\` → se convierte en \`\${input:variable:ayuda}\`; \`{{selection}}\` → \`\${selection}\` y \`{{file}}\` → \`\${file}\`.
- Los **handoffs** de un agente generan botones para pasar el trabajo al siguiente agente (p. ej. *Arquitecto → Desarrollador → Revisor*).
- Las herramientas MCP asignadas a un agente se añaden como \`servidor/*\` en sus \`tools\`.
- **Copilot coding agent**: crea un issue y asígnaselo con el texto «Ejecuta el workflow \`/wf-feature-e2e\` con idea: …». Lee \`AGENTS.md\`.
- **Copilot CLI**: \`node cli/aic.mjs run <workflow> --provider copilot\` ejecuta cada paso con \`copilot -p\` en tu repo.
`
    },
    {
      id: 'm365', icon: '🟦', title: 'Copilot M365',
      md: `# Trabajar con Copilot M365

## Agentes (sin código)

1. Abre un agente → **Usar / desplegar → Copilot M365 · Agent Builder**.
2. En Microsoft 365 Copilot: **Agentes → Crear agente → Configurar**.
3. Copia nombre, descripción, instrucciones y *conversation starters*.
4. Añade el conocimiento (SharePoint/OneDrive) y las capacidades indicadas.

## Agentes (paquete)

- **Descargar paquete M365** genera \`manifest.json\` (Teams 1.19) + \`declarativeAgent.json\` (v1.5) + iconos.
- Súbelo como **app personalizada** en Teams o ábrelo con **Microsoft 365 Agents Toolkit** para validarlo y provisionarlo.
- Configura en **Ajustes** la organización y las URLs de privacidad/términos antes de publicarlo a toda la empresa.
- Límite de instrucciones: **8000 caracteres**. AI Center incluye skills y conocimiento dentro de las instrucciones y avisa si te pasas.

## Prompts

- **Usar** un prompt → pestaña *Copilot M365*: copia el texto listo con los datos rellenados.
- Exportar a M365 genera \`m365/PROMPTS.md\` para compartir y guardar en la galería de prompts.

## Workflows

Copilot M365 no encadena agentes por sí solo: usa el **Ejecutor** en modo **Manual**. La app compone el prompt de cada paso (rol + skills + contexto + resultado anterior), tú lo pegas en Copilot y pegas la respuesta: el flujo continúa y al final tienes un informe completo.
`
    },
    {
      id: 'prompting', icon: '✍️', title: 'Buenas prácticas de prompting',
      md: `# Escribir buenos prompts y agentes

## Estructura recomendada

1. **Rol** — quién es la IA ("Actúa como arquitecto de soluciones senior…").
2. **Contexto** — situación, restricciones, audiencia.
3. **Tarea** — qué hacer, con verbos concretos.
4. **Requisitos** — criterios de calidad, lo que *no* debe hacer.
5. **Formato de salida** — estructura exacta (tabla, Gherkin, JSON, secciones).
6. **Ejemplo** — un ejemplo corto vale más que tres párrafos.

## Consejos

- Pide que **pregunte** si falta información imprescindible y que **declare supuestos**.
- Prefiere **listas y checklists** a prosa.
- Divide tareas grandes en **pasos de workflow**, con revisión humana en los puntos críticos.
- Itera: guarda la versión que funciona, márcala como **Estable** e incrementa la **versión**.
- Mide: si un prompt se usa mucho, conviértelo en **skill** o **agente**.

## Antipatrones

- ❌ Prompts kilométricos que mezclan normas generales → muévelas a **instrucciones globales**.
- ❌ Pegar documentación en cada prompt → crea **conocimiento** y referéncialo.
- ❌ Agentes "para todo" → especialízalos y conéctalos con **handoffs**.
- ❌ Secretos o datos personales en prompts o ficheros.
`
    },
    {
      id: 'roles', icon: '👥', title: 'Por rol',
      md: `# Cómo lo usa cada rol

## 🧑‍💻 Desarrollo
- Agentes **Arquitecto**, **Desarrollador**, **Revisor de código** y **QA** con handoffs entre ellos.
- Instrucciones por lenguaje (\`applyTo\`), skills de *conventional commits*, ADR, testing.
- Workflows *Feature E2E* y *Bugfix* ejecutables con Copilot en modo agente.

## 🎯 Product Owner
- Prompts de **refinamiento de historias**, criterios de aceptación en Gherkin, priorización y release notes.
- Agente **Product Owner** también desplegable en Copilot M365.
- Revisión humana en los workflows: el PO aprueba la historia antes de implementar.

## 💼 Negocio
- Prompts listos para **Copilot M365** (Outlook, Teams, Word, PowerPoint): resúmenes de reuniones, correos, informes ejecutivos.
- Agentes declarativos M365 sin código con su conocimiento en SharePoint.
- Ejecutor manual para procesos de varios pasos.

## 🧪 QA
- Agente **QA**, skill de diseño de casos de prueba, prompts de plan de pruebas y exploratorio.

## 🏗 Arquitectura / Plataforma
- Skills de ADR y revisión de seguridad, MCP corporativos, instrucciones globales y gobierno de la librería (**Salud**).
`
    },
    {
      id: 'governance', icon: '🛡️', title: 'Seguridad y gobierno',
      md: `# Seguridad y gobierno

- **Nunca guardes secretos** en ficheros. En MCP usa \`\${input:NOMBRE}\` (Copilot pedirá el valor) o variables de entorno. *Salud* detecta secretos en claro.
- **Datos sensibles**: no incluyas datos personales o confidenciales en prompts de ejemplo ni en conocimiento compartido.
- **Revisión humana** obligatoria antes de acciones irreversibles (merge, despliegue, envío a clientes).
- **Ciclo de vida**: Borrador → En revisión → Estable → Obsoleto. Los obsoletos no se exportan.
- **Propiedad**: rellena *Autor/a* y revisa cambios por PR (CODEOWNERS sobre \`library/\`).
- **Validación en CI**: \`node cli/aic.mjs lint\` devuelve código de error si hay errores.
- **Claves de API** del Ejecutor: solo en tu navegador y solo si marcas *Recordar*.
`
    },
    {
      id: 'format', icon: '📁', title: 'Formato de ficheros',
      md: `# Formato de ficheros

\`\`\`text
library/
  ai-center.json                    ← configuración del espacio
  library.bundle.js                 ← instantánea autogenerada (no editar)
  prompts/<id>.prompt.md
  agents/<id>.agent.md
  skills/<id>/SKILL.md (+ recursos)
  instructions/<id>.instructions.md
  knowledge/<id>.md
  mcp/<id>.mcp.json
  workflows/<id>.workflow.json
runs/<fecha>-<workflow>/run.json + INFORME.md
\`\`\`

## Markdown con frontmatter

\`\`\`markdown
---
name: Revisor de código
description: Revisa cambios buscando bugs, seguridad y mantenibilidad. Úsalo antes de abrir una PR.
icon: 🔍
tools: [search, changes, problems]
skills: [code-review-checklist]
knowledge: [definition-of-done]
handoffs: [qa-engineer]
tags: [calidad, dev]
audience: [dev]
targets: [copilot, claude]
status: stable
version: 1.2.0
---

# Misión
…
\`\`\`

- El **id** es el nombre del fichero.
- Las **skills** siguen el estándar *Agent Skills*: \`name\` = id, \`description\`, y los metadatos de AI Center van en \`metadata\`.
- Los **workflows** son JSON: \`inputs\`, \`nodes\` (\`id, type, title, agent, prompt, skills, knowledge, mcp, instructions, deliverable, outputKey, x, y\`) y \`edges\` (\`from, to, label\`).

Consulta \`docs/FORMATO.md\` para la especificación completa.
`
    },
    {
      id: 'faq', icon: '❓', title: 'Preguntas frecuentes',
      md: `# Preguntas frecuentes

**¿Por qué no se guardan mis cambios en ficheros?**
No has conectado la carpeta (o tu navegador no lo permite). Usa Chrome/Edge y pulsa *Conectar carpeta*. Mientras tanto, los cambios quedan como borrador en el navegador.

**He editado un .md a mano y no lo veo.**
Pulsa *Recargar* en la barra lateral. Si abres sin carpeta, regenera el bundle con \`node cli/aic.mjs bundle\`.

**¿Puedo usarlo con otras IAs?**
Sí: el destino *Cualquier IA* genera system prompts y runbooks en texto plano, y el ejecutor admite cualquier API compatible con OpenAI.

**¿Cómo ejecuto un workflow sin intervención?**
CLI con \`--auto-approve\` (por ejemplo en CI) o en la app con un proveedor de API y *Aprobar automáticamente*.

**¿Dónde se guardan las ejecuciones?**
En \`runs/\` (con carpeta conectada o CLI) y en el historial del navegador.

**¿Se puede publicar la app?**
Es un HTML estático: puedes servirla desde GitHub Pages o SharePoint para lectura. Para editar, cada persona la abre en local con la carpeta del repo.
`
    }
  ];
})();
