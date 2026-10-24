# Formato de ficheros de AI Center

Todo el framework vive en `library/`. El **id** de cada elemento es su nombre de fichero (minúsculas y guiones). La app y la CLI leen y escriben exactamente este formato, así que también puedes editarlo a mano.

## Campos comunes (frontmatter)

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | texto | Nombre visible |
| `description` | texto | Qué hace y **cuándo usarlo** (lo leen personas y agentes) |
| `icon` | emoji | Icono |
| `tags` | lista | Etiquetas libres |
| `audience` | lista | `todos`, `dev`, `po`, `qa`, `arquitectura`, `ux`, `negocio`, `datos`, `ops` |
| `targets` | lista | `copilot`, `m365`, `claude`, `chatgpt`, `cursor`, `any` |
| `status` | texto | `draft`, `review`, `stable`, `deprecated` (los obsoletos no se exportan) |
| `version` | texto | SemVer recomendado |
| `author`, `updated` | texto | Autoría y fecha (la app la actualiza) |

Los campos desconocidos se conservan al guardar.

## 💬 Prompt · `prompts/<id>.prompt.md`

```markdown
---
name: Refinar idea en historias
description: Convierte una idea en historias de usuario con criterios de aceptación.
mode: agent            # ask | edit | agent (modo de Copilot)
agent: product-owner   # agente asociado (opcional)
model: Claude Sonnet 5.5
tools: [search, fetch]
---

# Idea
{{idea: Describe la idea}}
```

Variables: `{{nombre}}` o `{{nombre: texto de ayuda}}`. Especiales: `{{selection}}` y `{{file}}` (→ `${selection}` / `${file}` en Copilot).

## 🤖 Agente · `agents/<id>.agent.md`

| Campo | Descripción |
|---|---|
| `model` | Modelo preferido |
| `tools` | Herramientas de Copilot (`search`, `edit`, `runCommands`…) |
| `skills`, `knowledge`, `mcp` | ids de skills, conocimiento y servidores MCP |
| `handoffs` | ids de agentes a los que pasar el trabajo |
| `starters` | Conversation starters (Copilot M365) |
| `capabilities` | Capacidades M365: `WebSearch`, `OneDriveAndSharePoint`, `GraphConnectors`, `Email`, `TeamsMessages`, `Meetings`, `People`, `CodeInterpreter`, `GraphicArt` |
| `sharepointUrls` | Fuentes de conocimiento M365 |

El cuerpo son las instrucciones del agente (system prompt).

## 🧩 Skill · `skills/<id>/SKILL.md`

Sigue el estándar abierto **Agent Skills**: `name` = id (minúsculas y guiones, ≤ 64), `description` (≤ 1024), opcionales `license` y `allowed-tools`. Los metadatos de AI Center van en `metadata` (mapa de textos). Cualquier fichero adicional de la carpeta (plantillas, scripts, referencias) se considera recurso de la skill y se exporta con ella.

```markdown
---
name: adr-writing
description: Documenta decisiones de arquitectura como ADR…
metadata:
  title: Architecture Decision Records
  tags: arquitectura, documentacion
  status: stable
---
```

## 📏 Instrucción · `instructions/<id>.instructions.md`

| Campo | Descripción |
|---|---|
| `global` | `true` → va a `copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md` |
| `applyTo` | Glob(s) separados por comas, p. ej. `**/*.ts,**/*.tsx` |

## 📚 Conocimiento · `knowledge/<id>.md`

Campos extra: `kind` (`glossary`, `architecture`, `process`, `guideline`, `domain`, `template`, `reference`) y `source`.

## 🔌 MCP · `mcp/<id>.mcp.json`

```json
{
  "name": "GitHub",
  "description": "…",
  "transport": "http",              // stdio | http | sse
  "url": "https://api.githubcopilot.com/mcp/",
  "command": "npx", "args": ["…"], // si es stdio
  "env": { "API_TOKEN": "${input:API_TOKEN}" },
  "headers": {},
  "notes": "Notas de uso"
}
```

Nunca guardes secretos: usa `${input:NOMBRE}`.

## 🔀 Workflow · `workflows/<id>.workflow.json`

```json
{
  "name": "…", "description": "…",
  "inputs": [{ "name": "idea", "label": "Idea", "description": "…", "required": true }],
  "nodes": [
    { "id": "start", "type": "start", "title": "Inicio", "x": 40, "y": 200 },
    { "id": "n1", "type": "step", "title": "Refinar", "agent": "product-owner", "prompt": "refinar-historia",
      "skills": [], "knowledge": [], "mcp": [], "instructions": "Usa {{idea}}", "deliverable": "…",
      "outputKey": "historias", "context": "prev", "vars": { "idea": "{{idea}}" }, "x": 260, "y": 180 },
    { "id": "h1", "type": "human", "title": "Aprobación", "owner": "PO", "instructions": "…" },
    { "id": "c1", "type": "condition", "title": "¿OK?", "question": "…", "agent": "…" },
    { "id": "end", "type": "end", "title": "Fin", "instructions": "(opcional) consolidación", "deliverable": "…" },
    { "id": "note", "type": "note", "text": "…" }
  ],
  "edges": [{ "id": "e1", "from": "start", "to": "n1", "label": "opcional" }],
  "notes": "README del workflow"
}
```

### Semántica de ejecución

- Se empieza en los nodos `start`. Un nodo se ejecuta cuando sus predecesores pendientes han terminado (permite ramas paralelas que se unen).
- **step**: compone el prompt = rol del agente + instrucciones globales + skills + conocimiento + MCP + entradas + resultados previos (`context`: `prev` | `all` | `none`) + instrucciones + prompt (con `vars`) + entregable.
- **human**: se detiene. Aprobar → salidas sin etiqueta de rechazo. Rechazar → salidas etiquetadas `cambios`/`rechazado`/`no` (o el paso anterior) con el feedback.
- **condition**: la IA responde con una de las etiquetas de salida en la primera línea; si no coincide, se pregunta a la persona.
- **end**: si tiene `instructions`, un agente consolida el resultado final.
- Variables: `{{entrada}}`, `{{outputKey}}`, `{{prev}}`, `{{steps.<id>.output}}`.
- Límite de 5 iteraciones por nodo para evitar bucles infinitos.

## Otros ficheros

- `ai-center.json`: configuración del espacio (`workspace`, `description`, `defaultTargets`, `organization`, `websiteUrl`, `privacyUrl`, `termsUrl`, `accentColor`).
- `library.bundle.js`: instantánea generada (no editar). Regenerar: `node cli/aic.mjs bundle`.
- `runs/<fecha>-<workflow>/`: `run.json`, `INFORME.md` y un fichero por paso.
