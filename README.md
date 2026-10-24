# ✦ AI Center

**El framework del equipo para trabajar con IA.** Guarda en ficheros todo lo que hace que la IA funcione bien en tu contexto —prompts, agentes, skills, instrucciones, conocimiento, herramientas MCP y workflows— y llévalo a **GitHub Copilot**, **Copilot M365**, Claude, Cursor o cualquier IA con un clic.

- 📁 **100% ficheros** (`.md` con frontmatter y `.json`): versionables en Git, revisables en PR. Sin base de datos.
- 🖱 **Sin instalación**: abre `index.html` con doble clic. Sin servidor ni dependencias.
- 🔀 **Workflows visuales**: arrastra agentes, prompts, skills, conocimiento, MCP, revisiones humanas y decisiones a un lienzo.
- ▶ **Ejecución E2E**: en la app (manual para Copilot M365, APIs o simulación), con la CLI (Copilot CLI, Claude Code, Anthropic, GitHub Models, Azure OpenAI, Ollama) o por un agente (Copilot en modo agente, Copilot coding agent).
- 📦 **Exportación nativa**: `.github/agents`, `prompts`, `skills`, `instructions`, `copilot-instructions.md`, `.vscode/mcp.json`, `AGENTS.md`, agentes declarativos M365 (manifest + `declarativeAgent.json` + iconos), `.claude/`, `.cursor/`.
- 🩺 **Gobierno**: validación de calidad, estados (borrador → estable → obsoleto), versionado, detección de secretos y CI.

---

## Empezar en 1 minuto

1. Abre **`index.html`** en Chrome o Edge (doble clic).
2. Pulsa **Conectar carpeta** y elige esta carpeta (la que contiene `library/`). A partir de ahí, cada cambio se guarda en ficheros.
3. Explora la librería inicial: 8 agentes, 15 prompts, 7 skills, 4 instrucciones, 5 documentos de conocimiento, 5 servidores MCP y 5 workflows.
4. Abre **Feature de principio a fin** y pulsa **Ejecutar → Simulación** para ver un workflow E2E.
5. Ve a **Exportar a IAs**, elige *GitHub Copilot* y *Copilot M365* y escribe los ficheros en tu repositorio.

> Firefox/Safari: la app funciona en modo lectura; los cambios se guardan como borrador del navegador y puedes descargarlos en ZIP.

## Las piezas

| | Pieza | Para qué | Fichero |
|---|---|---|---|
| 🔀 | Workflow | Proceso E2E que combina todo + revisiones humanas | `library/workflows/<id>.workflow.json` |
| 🤖 | Agente | Rol especializado con herramientas, skills, conocimiento y handoffs | `library/agents/<id>.agent.md` |
| 💬 | Prompt | Plantilla reutilizable con `{{variables}}` | `library/prompts/<id>.prompt.md` |
| 🧩 | Skill | Procedimiento empaquetado (estándar *Agent Skills*) | `library/skills/<id>/SKILL.md` |
| 📏 | Instrucción | Normas globales o por ficheros (`applyTo`) | `library/instructions/<id>.instructions.md` |
| 📚 | Conocimiento | Contexto de negocio y técnico | `library/knowledge/<id>.md` |
| 🔌 | MCP | Servidores de herramientas | `library/mcp/<id>.mcp.json` |

Especificación completa: [docs/FORMATO.md](docs/FORMATO.md).

## Ejecutar workflows de principio a fin

| Dónde | Cómo |
|---|---|
| **App** | Botón **Ejecutar** → *Manual* (copias/pegas en Copilot M365, Copilot Chat…), *API* (Anthropic, OpenAI‑compatible, Azure) o *Simulación*. Revisiones humanas en pantalla. Informe al final. |
| **GitHub Copilot (VS Code)** | Exporta y escribe `/wf-<id>` en el chat en modo agente. |
| **Copilot coding agent** | Asigna un issue: «Ejecuta el workflow de `.github/prompts/wf-<id>.prompt.md` con …». Lee `AGENTS.md`. |
| **CLI** | `node cli/aic.mjs run <id> --input clave=valor --provider copilot` |

Proveedores de la CLI: `manual` · `copilot` (Copilot CLI, ejecuta herramientas en tu repo) · `claude-code` · `anthropic` · `github` (GitHub Models) · `openai` · `azure` · `ollama`.

## CLI

```bash
node cli/aic.mjs help
node cli/aic.mjs lint                                   # valida (exit 1 si hay errores)
node cli/aic.mjs bundle                                 # regenera library/library.bundle.js
node cli/aic.mjs export copilot m365 --out ../mi-repo   # genera ficheros nativos
node cli/aic.mjs runbook feature-e2e --flavor copilot   # runbook E2E de un workflow
node cli/aic.mjs run bugfix --input sintomas="…" --provider copilot --cwd ../mi-repo
node cli/aic.mjs agents-md                              # regenera AGENTS.md de este repo
```

Requiere Node 18+. Sin dependencias (`npm` no es necesario; `package.json` solo añade atajos).

## Compartir con el equipo

- Sube esta carpeta a un **repositorio Git**. Los cambios se proponen por **Pull Request** (el diff es Markdown legible).
- La app regenera `library/library.bundle.js` automáticamente: quien abra `index.html` **sin conectar carpeta** (p. ej. desde OneDrive/SharePoint) ve la librería actualizada en modo lectura.
- CI incluida (`.github/workflows/ai-center.yml`): valida la librería y comprueba que el bundle está al día.

## Estructura

```text
index.html                 ← la app (ábrela con doble clic)
assets/css, assets/js      ← código de la app (sin dependencias)
  js/core.js               ← núcleo compartido app + CLI: formato, motor de workflows, exportadores
cli/aic.mjs                ← CLI
library/                   ← ⭐ tu framework: todo en ficheros
runs/                      ← informes de ejecuciones (ignorado en Git por defecto)
docs/FORMATO.md            ← especificación de ficheros
AGENTS.md                  ← guía para agentes que trabajen en este repo
```

## Seguridad

- No guardes secretos en ficheros: en MCP usa `${input:NOMBRE}` o variables de entorno (la validación lo detecta).
- Las claves de API del ejecutor se quedan en tu navegador y solo si marcas *Recordar*.
- Las revisiones humanas de los workflows son puntos de control obligatorios para agentes.
