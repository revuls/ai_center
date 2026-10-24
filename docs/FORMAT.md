# AI Center file format

The whole framework lives in `library/`. Each item's **id** is its file name (lowercase with hyphens). The app and the CLI read and write exactly this format, so you can also edit it by hand.

## Common fields (frontmatter)

| Field | Type | Description |
|---|---|---|
| `name` | text | Display name |
| `description` | text | What it does and **when to use it** (read by people and agents) |
| `icon` | emoji | Icon |
| `tags` | list | Free tags |
| `audience` | list | `all`, `dev`, `po`, `qa`, `architecture`, `ux`, `business`, `data`, `ops` |
| `targets` | list | `copilot`, `m365`, `claude`, `chatgpt`, `cursor`, `any` |
| `status` | text | `draft`, `review`, `stable`, `deprecated` (deprecated items are not exported) |
| `version` | text | SemVer recommended |
| `author`, `updated` | text | Authorship and date (the app updates it) |

Unknown fields are preserved on save.

## 💬 Prompt · `prompts/<id>.prompt.md`

```markdown
---
name: Refine an idea into stories
description: Turns an idea into user stories with acceptance criteria.
mode: agent            # ask | edit | agent (Copilot mode)
agent: product-owner   # linked agent (optional)
model: Claude Sonnet 5.5
tools: [search, fetch]
---

# Idea
{{idea: Describe the idea}}
```

Variables: `{{name}}` or `{{name: hint text}}`. Special ones: `{{selection}}` and `{{file}}` (→ `${selection}` / `${file}` in Copilot).

## 🤖 Agent · `agents/<id>.agent.md`

| Field | Description |
|---|---|
| `model` | Preferred model |
| `tools` | Copilot tools (`search`, `edit`, `runCommands`…) |
| `skills`, `knowledge`, `mcp` | ids of skills, knowledge and MCP servers |
| `handoffs` | ids of agents to pass the work to |
| `starters` | Conversation starters (Copilot M365) |
| `capabilities` | M365 capabilities: `WebSearch`, `OneDriveAndSharePoint`, `GraphConnectors`, `Email`, `TeamsMessages`, `Meetings`, `People`, `CodeInterpreter`, `GraphicArt` |
| `sharepointUrls` | M365 knowledge sources |

The body holds the agent instructions (system prompt).

## 🧩 Skill · `skills/<id>/SKILL.md`

Follows the open **Agent Skills** standard: `name` = id (lowercase with hyphens, ≤ 64), `description` (≤ 1024), optional `license` and `allowed-tools`. AI Center metadata goes in `metadata` (map of strings). Any additional file in the folder (templates, scripts, references) is treated as a skill resource and exported with it.

```markdown
---
name: adr-writing
description: Documents architecture decisions as ADRs…
metadata:
  title: Architecture Decision Records
  tags: architecture, documentation
  status: stable
---
```

## 📏 Instruction · `instructions/<id>.instructions.md`

| Field | Description |
|---|---|
| `global` | `true` → goes to `copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md` |
| `applyTo` | Comma-separated glob(s), e.g. `**/*.ts,**/*.tsx` |

## 📚 Knowledge · `knowledge/<id>.md`

Extra fields: `kind` (`glossary`, `architecture`, `process`, `guideline`, `domain`, `template`, `reference`) and `source`.

## 🔌 MCP · `mcp/<id>.mcp.json`

```json
{
  "name": "GitHub",
  "description": "…",
  "transport": "http",              // stdio | http | sse
  "url": "https://api.githubcopilot.com/mcp/",
  "command": "npx", "args": ["…"], // if stdio
  "env": { "API_TOKEN": "${input:API_TOKEN}" },
  "headers": {},
  "notes": "Usage notes"
}
```

Never store secrets: use `${input:NAME}`.

## 🔀 Workflow · `workflows/<id>.workflow.json`

```json
{
  "name": "…", "description": "…",
  "inputs": [{ "name": "idea", "label": "Idea", "description": "…", "required": true }],
  "nodes": [
    { "id": "start", "type": "start", "title": "Start", "x": 40, "y": 200 },
    { "id": "n1", "type": "step", "title": "Refine", "agent": "product-owner", "prompt": "refine-idea",
      "skills": [], "knowledge": [], "mcp": [], "instructions": "Use {{idea}}", "deliverable": "…",
      "outputKey": "stories", "context": "prev", "vars": { "idea": "{{idea}}" },
      "files": ["docs/stories/{{idea_slug}}.md"], "x": 260, "y": 180 },
    { "id": "h1", "type": "human", "title": "Approval", "owner": "PO", "instructions": "…" },
    { "id": "c1", "type": "condition", "title": "OK?", "question": "…", "agent": "…" },
    { "id": "end", "type": "end", "title": "End", "instructions": "(optional) consolidation", "deliverable": "…" },
    { "id": "note", "type": "note", "text": "…" }
  ],
  "edges": [{ "id": "e1", "from": "start", "to": "n1", "label": "optional" }],
  "notes": "Workflow README"
}
```

### Execution semantics

- Execution starts at the `start` nodes. A node runs when its pending predecessors have finished (allows parallel branches that join).
- **step**: composes the prompt = agent role + global instructions + skills + knowledge + MCP + inputs + previous results (`context`: `prev` | `all` | `none`) + instructions + prompt (with `vars`) + deliverable.
- **human**: stops. Approve → outputs without a rejection label. Reject → outputs labelled `changes`/`rejected`/`no` (or the previous step) with the feedback.
- **condition**: the AI answers with one of the output labels on its first line; if it does not match, a person is asked.
- **end**: if it has `instructions`, an agent consolidates the final result.
- **files** (steps and end): files the step must produce, as relative paths (`{{variables}}` allowed). See *Output files* below.
- Variables: `{{input}}`, `{{outputKey}}`, `{{prev}}`, `{{steps.<id>.output}}`.
- Limit of 5 iterations per node to avoid infinite loops.

### Output files

When a step declares `files`, its prompt asks the AI to return **each file complete** in its own fenced block tagged with the path:

`````text
````markdown file=docs/design/technical-design.md
# Technical design
…
````
`````

- Use four backticks so the file itself can contain code blocks.
- The engine extracts every `file=<path>` block from the answer (even undeclared ones). Absolute paths, `..` and drive letters are rejected.
- **App**: the run shows *Generated files* (view, download, ZIP, or *Write to folder…* into your repository). With the folder connected they are also saved in `runs/<run>/files/`.
- **CLI**: files go to `runs/<run>/files/`; add `--write-files <dir>` to also write them into a folder (e.g. your repository).
- **Agents with tools** (Copilot agent mode, coding agent, `--provider copilot` / `claude-code`): the runbook tells them to create the files directly in the repository.
- Declared files that the AI did not return are listed as *Missing files* in the report.

## Other files

- `ai-center.json`: workspace configuration (`workspace`, `description`, `defaultTargets`, `organization`, `websiteUrl`, `privacyUrl`, `termsUrl`, `accentColor`).
- `library.bundle.js`: generated snapshot (do not edit). Regenerate with `node cli/aic.mjs bundle`.
- `runs/<date>-<workflow>/`: `run.json`, `REPORT.md` and one file per step.
