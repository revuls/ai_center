# Use AI Center with your own AI subscription

Run workflows, generate prompts, agents and skills, and run prompts with **GitHub Copilot**, **Claude**, **ChatGPT (Codex)** or a free local model with **Ollama**. You use the plan you already pay for: there is no per-token API bill.

- [Which one should I pick?](#which-one-should-i-pick)
- [Before you start (everyone)](#before-you-start-everyone)
- Engines: [GitHub Copilot](#github-copilot) · [Claude](#claude) · [ChatGPT (Codex)](#chatgpt-codex) · [Ollama](#ollama)
- [Start AI Center](#start-ai-center) · [What you can do](#what-you-can-do) · [Safe use](#safe-use) · [If something goes wrong](#if-something-goes-wrong)

## Which one should I pick?

You only need one. Pick the subscription you already have; you can add more later and switch engine in each dialog.

| Engine | What you need | Cost | Best for |
|---|---|---|---|
| GitHub Copilot | A GitHub account with a Copilot plan | Included in your plan | Teams already on Copilot; it also offers Claude and GPT models |
| Claude Code | Claude Pro, Max or Ultra | Included in your plan | Long, careful writing and code work |
| Codex CLI | ChatGPT Free, Go, Plus, Pro, Business, Edu or Enterprise | Included in your plan (Free: light use) | People who already use ChatGPT |
| Ollama | A laptop with 8 GB of RAM or more | Free, runs offline | Trying things out, private data, no account |

Usage counts against your plan's limits. When you hit them, the engine stops answering until the limit resets.

## Before you start (everyone)

1. **Install Node.js 18 or newer.** Download the LTS version from [nodejs.org](https://nodejs.org), then check it in a terminal (it should print `v18` or higher; npm comes with it):

   ```bash
   node --version
   ```

2. **Install Git and get AI Center.** Install Git from [git-scm.com](https://git-scm.com/downloads) if you don't have it. You need access to this repository on GitHub.

   ```bash
   git clone https://github.com/revuls/ai_center.git
   ```

   ```bash
   cd ai_center
   ```

   There is nothing else to install: AI Center has no dependencies.

3. **Use Chrome or Edge.** They are the browsers that can save your changes straight into a folder on your computer.

## GitHub Copilot

*Copilot CLI · any Copilot plan*

1. **Install Copilot CLI**

   ```bash
   npm install -g @github/copilot
   ```

2. **Sign in with your GitHub account.** Run `copilot`. If it asks whether you trust the folder, choose **Yes**. Then type `/login`, follow the link in your browser and approve. Leave with `/exit`.

   ```bash
   copilot
   ```

3. **Check it.** It prints "GitHub Copilot CLI 1.0…".

   ```bash
   copilot --version
   ```

> **Company account?** If your Copilot plan is managed by your company, an admin may need to enable Copilot CLI for you.
>
> **Tip:** inside Copilot you can pick Claude or GPT models with `/model`, depending on your plan.

## Claude

*Claude Code · Claude Pro, Max or Ultra*

1. **Install Claude Code.** npm may warn that an install script was not run. You can ignore it: Claude Code works anyway.

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Sign in with your Claude account.** Run `claude` and choose to sign in with your **Claude account (subscription)**, not with an API key, then approve in the browser. If it does not ask, type `/login`. Leave with `/exit`.

   ```bash
   claude
   ```

3. **Check it.** It prints "2.x (Claude Code)".

   ```bash
   claude --version
   ```

> **Avoid surprise bills:** if you have an `ANTHROPIC_API_KEY` set, Claude Code would use it and bill the API. AI Center hides it from Claude Code by default, so your subscription is used.
>
> **Team or Enterprise?** Ask your admin whether Claude Code is enabled for your seat.

## ChatGPT (Codex)

*Codex CLI · any ChatGPT plan*

1. **Install Codex CLI**

   ```bash
   npm install -g @openai/codex
   ```

2. **Sign in with ChatGPT.** Choose **Sign in with ChatGPT** and approve in the browser.

   ```bash
   codex login
   ```

3. **Check it.** It prints the Codex version.

   ```bash
   codex --version
   ```

> **Free plan:** ChatGPT Free includes Codex for quick tasks only. Long workflows can hit the limit; Plus or higher is more comfortable.
>
> **Avoid surprise bills:** AI Center hides `OPENAI_API_KEY` and `CODEX_API_KEY` from Codex by default, so your ChatGPT plan is used.

## Ollama

*Free · local · no account*

1. **Install Ollama.** On macOS or Windows, download the app from [ollama.com/download](https://ollama.com/download). On Linux:

   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Download a model.** A small model that runs on most laptops (about 2 GB). With 16 GB of RAM or more you can try a larger one, such as `llama3.1` (about 5 GB), for better answers.

   ```bash
   ollama pull llama3.2
   ```

3. **Check it.** It shows the model you downloaded. Ollama keeps running in the background.

   ```bash
   ollama list
   ```

> **Good to know:** local models are free and private, but slower and less capable than the others. They answer with text only: they cannot open or edit files in your repository.

## Start AI Center

1. **Start the server from the AI Center folder.** Replace the path with the repository you want the AI to work on. Leave out `--cwd` to use the folder you are in. Keep this terminal open while you use AI Center; stop it with Ctrl+C.

   ```bash
   node cli/aic.mjs serve --cwd /path/to/your/repository
   ```

2. **Check what it found.** The server lists each engine with its version, or "not found". Example:

   ```text
   AI Center → http://localhost:4317  · working folder /home/ana/projects/shop
     GitHub Copilot CLI  GitHub Copilot CLI 1.0.117
     Claude Code         2.1.332 (Claude Code)
     Codex CLI           not found · npm install -g @openai/codex …
   ```

3. **Open the app** at `http://localhost:4317` in Chrome or Edge. Use that address, not the `index.html` file: the engines only work through the server.

4. **Choose the engine.** Every place that uses AI has an **AI engine** selector. A green check means it is ready.

   | Engine | Choose | Extra settings |
   |---|---|---|
   | GitHub Copilot | 🐙 GitHub Copilot CLI | Model: optional |
   | Claude | ✳️ Claude Code | Model: optional (`sonnet`, `opus`…) |
   | ChatGPT | ⬛ Codex CLI | Model: optional |
   | Ollama | 🟢 OpenAI-compatible | Base URL `http://localhost:11434/v1` · Model `llama3.2` · API key empty |

## What you can do

- **Run a workflow:** open a workflow, click **Run**, fill in the inputs, pick the engine and start. It stops at human reviews for your approval, and keeps running if you browse elsewhere.
- **Generate with AI:** in any prompt, agent, skill, instruction or knowledge editor, click **Generate with AI** (or **Improve with AI**). Review the result and click **Save**.
- **Design a workflow:** **New → Workflow → Design with AI**: describe the process and click **Generate with AI**. It appears on the canvas.
- **Run a prompt:** open a prompt, click **Use**, fill in the variables and click **Run**. The answer stays there and is saved in **Runs**.

You can also run a workflow from the terminal. Use `copilot`, `claude-code`, `codex` or `ollama` as the provider:

```bash
node cli/aic.mjs run bugfix --input symptoms="Login fails after 2FA" --provider claude-code --cwd /path/to/your/repository
```

```bash
node cli/aic.mjs run meeting-to-actions --input meeting="…" --provider ollama --model llama3.2
```

## Safe use

- **Your subscription is personal.** Use it only on your own computer. Don't share your login or run the server for other people.
- **Never put the server on the internet.** It can run programs and edit files with your account. It only accepts connections from your own computer.
- **File changes are off by default.** Tick "Let … edit files and run commands" only when you want the AI to change the working folder, and review the changes with Git afterwards.
- **No API keys needed.** To use an API key on purpose (and pay per token), start the server with `--use-api-keys`.

## If something goes wrong

| You see | What to do |
|---|---|
| "Bridge not available" | You opened `index.html` directly. Start the server and open `http://localhost:4317`. |
| "… was not found" | Install that engine, then restart the server (it checks engines when it starts). |
| Found, but the wrong program or version | Point the server at the right one: `--copilot-bin`, `--claude-bin` or `--codex-bin` followed by the path, e.g. `--claude-bin "$(npm prefix -g)/bin/claude"`. |
| "Working folder not found" | The `--cwd` path does not exist. Use the real path of your repository. |
| An error about login or authentication | Sign in again: `copilot` → `/login`, `claude` → `/login`, or `codex login`. |
| Answers stop with a limit or quota message | You reached your plan's usage limit. Wait for it to reset or switch engine. |
| Ollama: connection refused | Ollama is not running. Open the Ollama app, or run `ollama serve`. |
| Ollama: very slow | Use a smaller model such as `llama3.2`, and close other heavy apps. |

---

Plans and limits are set by GitHub, Anthropic and OpenAI and can change; check their pages if something here no longer matches.
