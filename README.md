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

> Firefox/Safari: the app works in read-only mode; changes are kept as browser drafts and you can download them as a ZIP.

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

CLI providers: `manual` · `copilot` (Copilot CLI, runs tools in your repo) · `claude-code` · `anthropic` · `github` (GitHub Models) · `openai` · `azure` · `ollama`.

## CLI

```bash
node cli/aic.mjs help
node cli/aic.mjs lint                                   # validate (exit 1 on errors)
node cli/aic.mjs bundle                                 # regenerate library/library.bundle.js
node cli/aic.mjs export copilot m365 --out ../my-repo   # generate native files
node cli/aic.mjs runbook feature-e2e --flavor copilot   # E2E runbook of a workflow
node cli/aic.mjs run bugfix --input symptoms="…" --provider copilot --cwd ../my-repo
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
