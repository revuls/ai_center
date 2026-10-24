# ✦ AI Center

**The team framework for working with AI.** Store in files everything that makes AI work well in your context —prompts, agents, skills, instructions, knowledge, MCP tools and workflows— and take it to **GitHub Copilot**, **Copilot M365**, Claude, Cursor or any AI in one click.

- 📁 **100% files** (`.md` with frontmatter and `.json`): versionable in Git, reviewable in PRs. No database.
- 🖱 **No installation**: open `index.html` with a double click. No server, no dependencies.
- 🔀 **Visual workflows**: drag agents, prompts, skills, knowledge, MCP, human reviews and decisions onto a canvas.
- ▶ **E2E execution**: in the app (manual for Copilot M365, APIs or simulation), from the CLI (Copilot CLI, Claude Code, Anthropic, GitHub Models, Azure OpenAI, Ollama) or by an agent (Copilot in agent mode, Copilot coding agent).
- 📦 **Native export**: `.github/agents`, `prompts`, `skills`, `instructions`, `copilot-instructions.md`, `.vscode/mcp.json`, `AGENTS.md`, M365 declarative agents (manifest + `declarativeAgent.json` + icons), `.claude/`, `.cursor/`.
- 🩺 **Governance**: quality validation, statuses (draft → stable → deprecated), versioning, secret detection and CI.

---

## Get started in 1 minute

1. Open **`index.html`** in Chrome or Edge (double click).
2. Click **Connect folder** and pick this folder (the one containing `library/`). From then on, every change is saved to files.
3. Browse the starter library: 8 agents, 15 prompts, 7 skills, 4 instructions, 5 knowledge documents, 5 MCP servers and 5 workflows.
4. Open **Feature end to end** and click **Run → Simulation** to see an E2E workflow.
5. Go to **Export to AIs**, pick *GitHub Copilot* and *Copilot M365* and write the files into your repository.

Ready to make it yours? See [Build your company's library from scratch](#build-your-companys-library-from-scratch).

> Firefox/Safari: the app works in read-only mode; changes are kept as browser drafts and you can download them as a ZIP.

## Build your company's library from scratch

You have two options: **adapt the starter library** (fastest: delete what you don't need and tailor the rest) or **start from an empty library**. To start from scratch:

### 1. Create your repository

Fork or copy this repository into your company's GitHub organization and clone it locally.

### 2. Empty the library

Delete the starter content, keeping only the workspace configuration:

```bash
cd library && find . -mindepth 1 ! -name 'ai-center.json' -delete && cd ..
```

Then **regenerate the bundle**. This step matters: if the bundle still contains the starter items, the app will refill the empty folder with them when you connect it.

```bash
node cli/aic.mjs bundle
```

### 3. Configure your workspace

Open `index.html`, click **Connect folder** and pick the repository folder. In **Settings**, fill in:

- The workspace name and description.
- The default target AIs.
- Organization, website, privacy and terms URLs (only needed if you will publish Copilot M365 agents).

### 4. Create the pieces in this order

Each piece builds on the previous ones:

| Order | Piece | Start with |
|---|---|---|
| 1 | 📚 **Knowledge** | Your business glossary, real architecture, Definition of Done, internal processes |
| 2 | 📏 **Instructions** | One global rule set (language, security, tone), then one per language or technology using `applyTo` |
| 3 | 🧩 **Skills** | Your "how we do it here": how you write stories, review code, document… |
| 4 | 🔌 **MCP** | The tools you use: GitHub, Jira, Confluence, internal databases |
| 5 | 🤖 **Agents** | Your team's roles, linked to their skills, knowledge and tools |
| 6 | 💬 **Prompts** | The requests your team repeats every week |
| 7 | 🔀 **Workflows** | Your real processes, combining everything above, with human reviews at the milestones |

Create each item from **+ New**. The **Health** view warns you about broken references, weak descriptions and plain-text secrets.

### 5. Shortcuts

- **Import what you already have**: **+ New → Import files…** brings in prompts, agents and instructions you already use in Copilot (`.github/…`, `.chatmode.md`, `SKILL.md`, Cursor rules). Variables are converted automatically.
- **Workflows with AI**: **New workflow → Design with AI** — describe the process and Copilot or Claude proposes the flow using your pieces.
- **Polish existing prompts**: keep the `improve-prompt` prompt before emptying the library and use it to clean up the loose prompts people already have.
- **From the terminal**: `new` creates items from a template, for example:

```bash
node cli/aic.mjs new agent "Data Analyst"
```

### 6. Roll it out to the team

1. Start small: 1 global instruction, 3–4 knowledge documents, 2 agents, 5 prompts and 1 workflow for a process that really hurts.
2. Validate and export: run `node cli/aic.mjs lint`, then use **Export to AIs** to write the Copilot and M365 files into your product repositories.
3. Make changes go through Pull Requests, and mark as **Stable** only what has been tested.
4. Grow it based on what people ask for; **Health** keeps the quality up.

> **Tip:** don't empty everything. Keep `definition-of-done`, `code-review-checklist`, `conventional-commits`, `security-review` and the `workflow-orchestrator` agent — they are generic and work for almost any company — and rewrite the rest with your context. What improves results the most is **knowledge** (a real glossary and architecture): fill that in first.

## The pieces

| | Piece | What for | File |
|---|---|---|---|
| 🔀 | Workflow | E2E process combining everything + human reviews | `library/workflows/<id>.workflow.json` |
| 🤖 | Agent | Specialized role with tools, skills, knowledge and handoffs | `library/agents/<id>.agent.md` |
| 💬 | Prompt | Reusable template with `{{variables}}` | `library/prompts/<id>.prompt.md` |
| 🧩 | Skill | Packaged procedure (*Agent Skills* standard) | `library/skills/<id>/SKILL.md` |
| 📏 | Instruction | Global or per-file (`applyTo`) rules | `library/instructions/<id>.instructions.md` |
| 📚 | Knowledge | Business and technical context | `library/knowledge/<id>.md` |
| 🔌 | MCP | Tool servers | `library/mcp/<id>.mcp.json` |

Full specification: [docs/FORMAT.md](docs/FORMAT.md).

## Running workflows end to end

| Where | How |
|---|---|
| **App** | **Run** button → *Manual* (copy/paste into Copilot M365, Copilot Chat…), *API* (Anthropic, OpenAI‑compatible, Azure) or *Simulation*. On-screen human reviews. Report at the end. |
| **GitHub Copilot (VS Code)** | Export and type `/wf-<id>` in the chat in agent mode. |
| **Copilot coding agent** | Assign an issue: «Run the workflow in `.github/prompts/wf-<id>.prompt.md` with …». It reads `AGENTS.md`. |
| **CLI** | `node cli/aic.mjs run <id> --input key=value --provider copilot` |

**Files as inputs and context**: workflow inputs can be of type **File(s)** or **Folder** (`{{spec}}` becomes the files' content), and each step can list **📂 Context files** (`src/**/*.ts`, `docs/`, `{{suspects}}`) to read from your repository. The app asks you to pick the files/folder, the CLI reads `--input spec=@path` and the `--cwd` folder, and agents with tools read them directly. Details in [docs/FORMAT.md](docs/FORMAT.md#input-and-context-files).

**Steps that must produce files**: list them in the step's **📄 Output files** field (e.g. `docs/design/{{feature}}.md`). The AI returns each file in a `file=<path>` block; the app lets you download them or write them into your repository, the CLI saves them in `runs/<run>/files/` (add `--write-files <dir>` to write them into a folder), and agents with tools create them directly in the repo. Details in [docs/FORMAT.md](docs/FORMAT.md#output-files).

CLI providers: `manual` · `copilot` (Copilot CLI, runs tools in your repo) · `claude-code` · `anthropic` · `github` (GitHub Models) · `openai` · `azure` · `ollama`.

## CLI

```bash
node cli/aic.mjs help
node cli/aic.mjs lint                                   # validate (exit 1 on errors)
node cli/aic.mjs bundle                                 # regenerate library/library.bundle.js
node cli/aic.mjs export copilot m365 --out ../my-repo   # generate native files
node cli/aic.mjs runbook feature-e2e --flavor copilot   # E2E runbook of a workflow
node cli/aic.mjs run bugfix --input symptoms="…" --provider copilot --cwd ../my-repo
node cli/aic.mjs run meeting-to-actions --input meeting="…" --provider github --write-files ../my-repo
node cli/aic.mjs run bugfix --input symptoms="…" --input suspects="src/auth/" --input spec=@docs/spec.md --cwd ../my-repo --provider github
node cli/aic.mjs agents-md                              # regenerate this repo's AGENTS.md
```

Requires Node 18+. No dependencies (`npm` is not needed; `package.json` only adds shortcuts).

## Sharing with the team

- Push this folder to a **Git repository**. Changes are proposed via **Pull Request** (the diff is readable Markdown).
- The app regenerates `library/library.bundle.js` automatically: whoever opens `index.html` **without connecting the folder** (e.g. from OneDrive/SharePoint) sees the up-to-date library in read-only mode.
- CI included (`.github/workflows/ai-center.yml`): validates the library and checks the bundle is up to date.

## Structure

```text
index.html                 ← the app (open it with a double click)
assets/css, assets/js      ← app code (no dependencies)
  js/core.js               ← core shared by app + CLI: format, workflow engine, exporters
cli/aic.mjs                ← CLI
library/                   ← ⭐ your framework: everything in files
runs/                      ← run reports (ignored by Git by default)
docs/FORMAT.md             ← file specification
AGENTS.md                  ← guide for agents working in this repo
```

## Security

- Never store secrets in files: in MCP use `${input:NAME}` or environment variables (validation detects them).
- The runner's API keys stay in your browser, and only if you tick *Remember*.
- Workflow human reviews are mandatory checkpoints for agents.
