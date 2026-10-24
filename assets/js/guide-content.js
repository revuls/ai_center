/* AI Center · guide-content.js — built-in guide (shown at #/guide) */
(function () {
  'use strict';
  window.AIC = window.AIC || {};
  window.AIC.GUIDE = [
    {
      id: 'start', icon: '🚀', title: 'Getting started',
      md: `# Welcome to AI Center

AI Center is the **team framework for working with AI**. It stores in files everything that makes AI work well in your context —prompts, agents, skills, instructions, knowledge, MCP tools and workflows— and **exports it to the native formats** of GitHub Copilot, Copilot M365, Claude, Cursor or any AI.

## Principles

- **Everything is a file** (\`.md\` with frontmatter and \`.json\`): versioned in Git, reviewed in PRs and shared like code. No database.
- **No installation**: open \`index.html\` with a double click. No server, no dependencies.
- **One source, many AIs**: define it once and export it to Copilot (VS Code, coding agent, CLI), M365, Claude Code, Cursor…
- **Runnable end to end**: workflows run from the app, from the CLI or by an agent (Copilot in agent mode, Copilot coding agent, Claude Code).

## First steps

1. Open \`index.html\` in **Chrome or Edge** (they can write to folders).
2. Click **Connect folder** (sidebar) and pick the framework folder (the one containing \`library/\`).
3. Browse the library, star your favorites ★ and try a prompt with **Use**.
4. Open a workflow, review it on the canvas and click **Run** (*Simulation* mode to try it without an AI).
5. Go to **Export to AIs** and generate the files for your repository.

## How to share it with the team

- Keep the framework folder in a **Git repository** (or a shared OneDrive/SharePoint folder).
- Everyone edits with the app (or their editor) and opens a **Pull Request**: the diff is readable because everything is Markdown.
- The app regenerates \`library/library.bundle.js\` on every change, so whoever opens \`index.html\` **without connecting the folder** (e.g. business from OneDrive) always sees the up-to-date library in read-only mode.
- For CI: \`node cli/aic.mjs lint\` validates the library and \`node cli/aic.mjs export copilot --out <repo>\` generates the files.

> **Without Chrome/Edge**: the app works in read-only mode; your changes are kept as drafts in the browser and you can **download a ZIP** to bring them into the folder.
`
    },
    {
      id: 'pieces', icon: '🧱', title: 'The pieces and when to use them',
      md: `# The framework pieces

| Piece | What it is | Use it when… | Exported to |
|---|---|---|---|
| 💬 **Prompt** | Reusable template with \`{{variables}}\` | You repeat the same request with different data | \`.github/prompts/*.prompt.md\` (\`/command\`), \`.claude/commands\`, text for M365 |
| 🤖 **Agent** | Role with instructions, tools, skills, knowledge and handoffs | You want a consistent specialist (architect, QA, PO…) | \`.github/agents/*.agent.md\`, M365 declarative agent, \`.claude/agents\` |
| 🧩 **Skill** | Packaged procedure (*Agent Skills* standard, \`SKILL.md\` + resources) | There is a "how it's done" several agents must apply | \`.github/skills/\`, \`.claude/skills/\`, inline in M365 |
| 📏 **Instruction** | Always-on rule (global) or per files (\`applyTo\`) | Code conventions, language, style, security | \`copilot-instructions.md\`, \`*.instructions.md\`, \`CLAUDE.md\`, \`.mdc\` |
| 📚 **Knowledge** | Business/technical context | Glossary, architecture, DoD, processes | \`docs/ai/knowledge/\`, inline in M365 agents |
| 🔌 **MCP** | Tool server (Model Context Protocol) | Agents need to act: GitHub, Jira, browser, databases… | \`.vscode/mcp.json\`, \`.mcp.json\`, \`.cursor/mcp.json\` |
| 🔀 **Workflow** | E2E flow combining all of the above + human reviews | A multi-step process you want to repeat and automate | \`/wf-*\` runbooks for Copilot and Claude, M365 guide, CLI |

## Golden rules

- **Description = when to use it.** Agents (and Copilot) pick skills and agents by reading the description. Write it for them.
- **One piece, one responsibility.** Three small skills beat one giant agent.
- **Knowledge is not copied into every prompt**: reference it from the agent or the step.
- **Global rules** (language, security, style) go into global instructions: they apply everywhere.
- **Status and version**: use *Draft → In review → Stable*. *Deprecated* items are not exported.
`
    },
    {
      id: 'workflows', icon: '🔀', title: 'E2E workflows',
      md: `# End-to-end workflows

A workflow is a **graph** of connected nodes. You design it by dragging pieces onto the canvas.

## Node types

- **▶ Start** — receives the workflow *inputs* (e.g. \`idea\`, \`repository\`).
- **⚙ Step** — work done by an **agent** and/or **prompt**, with **skills**, **knowledge** and **MCP tools**.
- **🧑 Human review** — the flow stops until someone approves. An output labelled **«changes»** says which step to go back to if rejected.
- **◆ Decision** — branches on a criterion; the **connection labels** are the options (\`yes\` / \`no\`…).
- **■ End** — consolidates the final deliverable (optionally with an agent).
- **✎ Note** — documentation on the canvas.

## Designing

- Drag an **agent** or **prompt** onto the canvas → a step is created.
- Drop a **skill / knowledge / MCP / agent** *onto* a step → it is attached.
- **Click** a palette piece → it is added **after the selected node** and connected automatically.
- Connect by dragging from a node's right **●** dot to another node.
- **Arrange** lays out the graph automatically. **⌘Z** undoes.
- **Design with AI**: describe the process, copy the prompt into Copilot/Claude and paste the resulting JSON.

## Variables

- \`{{input}}\` → value of a workflow input.
- \`{{output}}\` → result of a step whose *Output name* is \`output\`.
- \`{{prev}}\` → result of the connected steps.
- Each step automatically receives the previous result (configurable: previous / all / none).

## Running

| Where | How | Best for |
|---|---|---|
| **App · Manual** | You copy each step's prompt to your AI and paste the answer | Copilot M365, Copilot Chat, any AI without an API |
| **App · API** | Anthropic, OpenAI-compatible (GitHub Models, Ollama…), Azure OpenAI | Automatic execution with on-screen human reviews |
| **App · Simulation** | Sample outputs | Validating the design |
| **Copilot (agent mode)** | Export and type \`/wf-<id>\` in the chat | IDE development with real tools |
| **Copilot coding agent / CLI** | "Run the workflow in \`.github/prompts/wf-<id>.prompt.md\`" | Autonomous work on issues |
| **CLI** | \`node cli/aic.mjs run <id> --provider copilot\\|claude-code\\|anthropic\\|github…\` | Automation, CI, agentic execution in the repo |

Every run produces a **report** (\`REPORT.md\`) and \`run.json\` in \`runs/\`.
`
    },
    {
      id: 'copilot', icon: '🐙', title: 'GitHub Copilot',
      md: `# Working with GitHub Copilot

Export with the **GitHub Copilot** target and copy the result to the root of the repository:

\`\`\`text
.github/
  copilot-instructions.md        ← global instructions + resource catalog
  instructions/*.instructions.md ← rules per file type (applyTo)
  prompts/*.prompt.md            ← prompts → /name in the chat
  prompts/wf-*.prompt.md         ← E2E workflows → /wf-name (agent mode)
  agents/*.agent.md              ← custom agents (with tools, model and handoffs)
  skills/<id>/SKILL.md           ← agent skills
.vscode/mcp.json                 ← MCP servers (secrets via \${input:…})
docs/ai/knowledge/*.md           ← knowledge referenced by the agents
AGENTS.md                        ← guide for coding agent, CLI and other agents
\`\`\`

## Tips

- In prompts use \`{{variable: hint}}\` → it becomes \`\${input:variable:hint}\`; \`{{selection}}\` → \`\${selection}\` and \`{{file}}\` → \`\${file}\`.
- An agent's **handoffs** create buttons to pass the work to the next agent (e.g. *Architect → Developer → Reviewer*).
- MCP tools assigned to an agent are added as \`server/*\` to its \`tools\`.
- **Copilot coding agent**: create an issue and assign it with the text «Run the workflow \`/wf-feature-e2e\` with idea: …». It reads \`AGENTS.md\`.
- **Copilot CLI**: \`node cli/aic.mjs run <workflow> --provider copilot\` runs each step with \`copilot -p\` in your repo.
`
    },
    {
      id: 'm365', icon: '🟦', title: 'Copilot M365',
      md: `# Working with Copilot M365

## Agents (no code)

1. Open an agent → **Use / deploy → Copilot M365 · Agent Builder**.
2. In Microsoft 365 Copilot: **Agents → Create agent → Configure**.
3. Copy the name, description, instructions and *conversation starters*.
4. Add the knowledge (SharePoint/OneDrive) and the listed capabilities.

## Agents (package)

- **Download M365 package** generates \`manifest.json\` (Teams 1.19) + \`declarativeAgent.json\` (v1.5) + icons.
- Upload it as a **custom app** in Teams or open it with **Microsoft 365 Agents Toolkit** to validate and provision it.
- Set the organization and the privacy/terms URLs in **Settings** before publishing it company-wide.
- Instruction limit: **8000 characters**. AI Center includes skills and knowledge inside the instructions and warns you if you go over.

## Prompts

- **Use** a prompt → *Copilot M365* tab: copy the ready-to-paste text with the data filled in.
- Exporting to M365 generates \`m365/PROMPTS.md\` to share and save in the prompt gallery.

## Workflows

Copilot M365 does not chain agents on its own: use the **Runner** in **Manual** mode. The app composes each step's prompt (role + skills + context + previous result), you paste it into Copilot and paste back the answer: the flow continues and at the end you get a complete report.
`
    },
    {
      id: 'prompting', icon: '✍️', title: 'Prompting best practices',
      md: `# Writing good prompts and agents

## Recommended structure

1. **Role** — who the AI is ("Act as a senior solution architect…").
2. **Context** — situation, constraints, audience.
3. **Task** — what to do, with concrete verbs.
4. **Requirements** — quality criteria, what it must *not* do.
5. **Output format** — exact structure (table, Gherkin, JSON, sections).
6. **Example** — one short example is worth more than three paragraphs.

## Tips

- Ask it to **ask** when essential information is missing and to **state assumptions**.
- Prefer **lists and checklists** over prose.
- Split large tasks into **workflow steps**, with human review at critical points.
- Iterate: keep the version that works, mark it **Stable** and bump the **version**.
- Measure: if a prompt is used a lot, turn it into a **skill** or an **agent**.

## Anti-patterns

- ❌ Endless prompts that mix general rules → move them to **global instructions**.
- ❌ Pasting documentation into every prompt → create **knowledge** and reference it.
- ❌ "Do-everything" agents → specialize them and connect them with **handoffs**.
- ❌ Secrets or personal data in prompts or files.
`
    },
    {
      id: 'roles', icon: '👥', title: 'By role',
      md: `# How each role uses it

## 🧑‍💻 Development
- **Architect**, **Developer**, **Code reviewer** and **QA** agents with handoffs between them.
- Per-language instructions (\`applyTo\`), skills for *conventional commits*, ADRs, testing.
- *Feature E2E* and *Bugfix* workflows runnable with Copilot in agent mode.

## 🎯 Product Owner
- Prompts for **story refinement**, Gherkin acceptance criteria, prioritization and release notes.
- **Product Owner** agent, also deployable to Copilot M365.
- Human review in workflows: the PO approves the story before implementation.

## 💼 Business
- Prompts ready for **Copilot M365** (Outlook, Teams, Word, PowerPoint): meeting summaries, emails, executive reports.
- No-code M365 declarative agents with their knowledge in SharePoint.
- Manual runner for multi-step processes.

## 🧪 QA
- **QA** agent, test case design skill, test plan and exploratory testing prompts.

## 🏗 Architecture / Platform
- ADR and security review skills, corporate MCP servers, global instructions and library governance (**Health**).
`
    },
    {
      id: 'governance', icon: '🛡️', title: 'Security and governance',
      md: `# Security and governance

- **Never store secrets** in files. In MCP use \`\${input:NAME}\` (Copilot will ask for the value) or environment variables. *Health* detects plain-text secrets.
- **Sensitive data**: do not include personal or confidential data in example prompts or shared knowledge.
- **Mandatory human review** before irreversible actions (merge, deploy, sending to customers).
- **Lifecycle**: Draft → In review → Stable → Deprecated. Deprecated items are not exported.
- **Ownership**: fill in *Author* and review changes via PR (CODEOWNERS on \`library/\`).
- **CI validation**: \`node cli/aic.mjs lint\` returns an error code if there are errors.
- **Runner API keys**: only in your browser and only if you tick *Remember*.
`
    },
    {
      id: 'format', icon: '📁', title: 'File format',
      md: `# File format

\`\`\`text
library/
  ai-center.json                    ← workspace configuration
  library.bundle.js                 ← auto-generated snapshot (do not edit)
  prompts/<id>.prompt.md
  agents/<id>.agent.md
  skills/<id>/SKILL.md (+ resources)
  instructions/<id>.instructions.md
  knowledge/<id>.md
  mcp/<id>.mcp.json
  workflows/<id>.workflow.json
runs/<date>-<workflow>/run.json + REPORT.md
\`\`\`

## Markdown with frontmatter

\`\`\`markdown
---
name: Code reviewer
description: Reviews changes looking for bugs, security and maintainability. Use it before opening a PR.
icon: 🔍
tools: [search, changes, problems]
skills: [code-review-checklist]
knowledge: [definition-of-done]
handoffs: [qa-engineer]
tags: [quality, dev]
audience: [dev]
targets: [copilot, claude]
status: stable
version: 1.2.0
---

# Mission
…
\`\`\`

- The **id** is the file name.
- **Skills** follow the *Agent Skills* standard: \`name\` = id, \`description\`, and AI Center metadata lives in \`metadata\`.
- **Workflows** are JSON: \`inputs\`, \`nodes\` (\`id, type, title, agent, prompt, skills, knowledge, mcp, instructions, deliverable, outputKey, x, y\`) and \`edges\` (\`from, to, label\`).

See \`docs/FORMAT.md\` for the full specification.
`
    },
    {
      id: 'faq', icon: '❓', title: 'FAQ',
      md: `# Frequently asked questions

**Why are my changes not saved to files?**
You have not connected the folder (or your browser does not allow it). Use Chrome/Edge and click *Connect folder*. Meanwhile, changes stay as drafts in the browser.

**I edited a .md by hand and do not see it.**
Click *Reload* in the sidebar. If you open it without a folder, regenerate the bundle with \`node cli/aic.mjs bundle\`.

**Can I use it with other AIs?**
Yes: the *Any AI* target generates plain-text system prompts and runbooks, and the runner supports any OpenAI-compatible API.

**How do I run a workflow unattended?**
CLI with \`--auto-approve\` (e.g. in CI) or in the app with an API provider and *Approve automatically*.

**Where are runs stored?**
In \`runs/\` (with a connected folder or the CLI) and in the browser history.

**Can the app be published?**
It is static HTML: you can serve it from GitHub Pages or SharePoint for reading. To edit, each person opens it locally with the repo folder.
`
    }
  ];
})();
