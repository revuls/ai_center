/* AI Center · ai.js — generate library items (prompts, agents, skills…) and workflows with an AI engine */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, btn, toast, modal, copy } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});

  const ENGINES = [
    { value: 'copilot-cli', label: '🐙 GitHub Copilot CLI (your Copilot plan)' },
    { value: 'claude-cli', label: '✳️ Claude Code (your Claude Pro/Max/Ultra plan)' },
    { value: 'codex-cli', label: '⬛ Codex CLI (your ChatGPT plan)' },
    { value: 'anthropic', label: '🟣 Anthropic API' },
    { value: 'openai', label: '🟢 OpenAI-compatible (OpenAI API, Ollama…)' },
    { value: 'azure', label: '🔷 Azure OpenAI' },
    { value: 'manual', label: '✋ Manual: copy the prompt, paste the answer' }
  ];


  /** Engine settings shared with the Runner (S.prefs.llm). */
  function engineConfig() {
    const cfg = Object.assign({ provider: 'copilot-cli', model: '', baseUrl: '', apiKey: '', apiVersion: '2024-10-21', remember: false, cwd: '' }, S.prefs.llm);
    if (!ENGINES.some((e) => e.value === cfg.provider)) cfg.provider = 'copilot-cli';
    return cfg;
  }
  function saveEngine(cfg) { Object.assign(S.prefs.llm, cfg); S.savePrefs(); }

  /** Compact engine picker; mutates cfg. */
  function enginePanel(cfg) {
    const box = h('div', { class: 'col', style: { gap: '8px' } });
    const fields = h('div', { class: 'col', style: { gap: '8px' } });
    const sel = h('select', { onchange: (e) => { cfg.provider = e.target.value; draw(); } }, ...ENGINES.map((e) => h('option', { value: e.value, selected: e.value === cfg.provider }, e.label)));
    const inp = (label, key, opts) => h('div', { class: 'field', style: { margin: 0 } }, h('div', { class: 'lbl' }, label),
      h('input', Object.assign({ type: 'text', value: cfg[key] || '', oninput: (e) => { cfg[key] = e.target.value; } }, opts || {})));
    function draw() {
      fields.innerHTML = '';
      const p = cfg.provider;
      if (V.AGENT_ENGINES[p]) fields.append(V.bridgeStatus(p), inp('Model (optional)', 'model', { placeholder: V.AGENT_ENGINES[p].modelHint }));
      if (p === 'openai') fields.append(inp('Base URL', 'baseUrl', { placeholder: 'https://api.openai.com/v1 · http://localhost:11434/v1 (Ollama)' }));
      if (p === 'azure') fields.append(inp('Endpoint', 'baseUrl', { placeholder: 'https://my-resource.openai.azure.com' }));
      if (p === 'anthropic' || p === 'openai' || p === 'azure') {
        fields.append(inp(p === 'azure' ? 'Deployment' : 'Model', 'model', { placeholder: p === 'anthropic' ? 'claude-sonnet-5-5' : p === 'azure' ? 'gpt-4o' : 'gpt-4.1' }));
        fields.append(inp('API key', 'apiKey', { type: 'password', autocomplete: 'off', placeholder: 'Stays in this browser' }),
          h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: cfg.remember, onchange: (e) => { cfg.remember = e.target.checked; } }), 'Remember the key in this browser'));
      }
    }
    draw();
    box.append(h('div', { class: 'field', style: { margin: 0 } }, h('div', { class: 'lbl' }, 'AI engine'), sel, h('div', { class: 'help' }, 'Shared with the Runner. The three CLIs use your own subscription (no API billing) through node cli/aic.mjs serve.')), fields);
    return box;
  }

  /** Calls the engine (not manual). Tools are off unless opts.allowTools (agent CLIs only). */
  async function callEngine(cfg, composed, signal, opts) {
    if ((cfg.provider === 'anthropic' || cfg.provider === 'azure') && !cfg.apiKey) throw new Error('Enter the API key');
    saveEngine(cfg);
    return V.callLLM(Object.assign({}, cfg, { allowAllTools: !!(opts && opts.allowTools) }), composed, signal);
  }

  /**
   * Generic «generate with AI» dialog.
   * opts: { title, intro, label, placeholder, initial, build(request) → {system,user}, apply(text) → error string | undefined }
   */
  function aiDialog(opts) {
    const cfg = engineConfig();
    const req = h('textarea', { rows: 5, placeholder: opts.placeholder || '', value: opts.initial || '' });
    const status = h('div');
    const manualBox = h('div', { class: 'hidden' });
    let ctrl = null;
    const composed = () => {
      const p = opts.build(req.value.trim());
      return { title: opts.title, system: p.system, user: p.user, full: `${p.system}\n\n---\n\n${p.user}`, agent: null, skills: [], files: [] };
    };
    const useAnswer = (text, close) => {
      const err = opts.apply(text);
      if (err) { status.innerHTML = ''; status.append(h('div', { class: 'callout err small' }, '⚠', h('div', null, err))); return false; }
      close();
      return true;
    };
    const m = modal({
      title: opts.title, titleIcon: '✨', size: 'wide',
      body: h('div', { class: 'col', style: { gap: '12px' } },
        opts.intro ? h('div', { class: 'muted small' }, opts.intro) : null,
        h('div', { class: 'field', style: { margin: 0 } }, h('div', { class: 'lbl' }, opts.label || 'What do you need?'), req),
        h('div', { class: 'card card-pad' }, enginePanel(cfg)),
        manualBox, status),
      foot: (close) => [
        btn('Cancel', () => { if (ctrl) ctrl.abort(); close(); }, { cls: 'ghost' }),
        btn('Generate', async (e) => {
          if (!req.value.trim()) { toast('Describe what you need', 'err'); req.focus(); return; }
          const c = composed();
          if (cfg.provider === 'manual') {
            saveEngine(cfg);
            const ans = h('textarea', { rows: 8, class: 'code', placeholder: 'Paste the AI answer here…' });
            manualBox.classList.remove('hidden'); manualBox.innerHTML = '';
            manualBox.append(h('div', { class: 'card card-pad col', style: { gap: '8px' } },
              h('div', { class: 'row wrap' }, h('b', null, '1. Copy the prompt into your AI'), h('div', { class: 'grow' }), btn('Copy prompt', () => copy(c.full, 'Prompt copied: paste it into your AI'), { cls: 'sm primary', icon: 'copy' })),
              h('b', null, '2. Paste its answer'), ans,
              h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Use this answer', () => { if (!ans.value.trim()) { toast('Paste the answer', 'err'); return; } useAnswer(ans.value, close); }, { cls: 'primary sm', icon: 'check' }))));
            return;
          }
          const b = e.currentTarget; b.disabled = true;
          ctrl = new AbortController();
          status.innerHTML = '';
          status.append(h('div', { class: 'callout small' }, h('span', { class: 'spinner' }), h('div', null, 'Generating with ', h('b', null, (ENGINES.find((x) => x.value === cfg.provider) || {}).label || cfg.provider), '… this can take a minute.')));
          try {
            const text = await callEngine(cfg, c, ctrl.signal);
            useAnswer(text || '', close);
          } catch (err) {
            if (err.name === 'AbortError') return;
            status.innerHTML = '';
            status.append(h('div', { class: 'callout err small' }, '⛔', h('div', null, err.message)));
          } finally { b.disabled = false; ctrl = null; }
        }, { cls: 'primary', icon: 'sparkle' })
      ]
    });
    setTimeout(() => req.focus(), 30);
    return m;
  }

  /* ---------- library items ---------- */
  const SKIP = new Set(['author', 'area', 'updated', 'version', 'status', 'targets', 'model', 'sharepointUrls']);
  const GUIDE = {
    prompt: 'The prompt template in Markdown. Use {{variable}} or {{variable: hint}} placeholders for what the user fills in. Structure it as role, context, task, output format and rules.',
    agent: 'The agent system prompt in Markdown: role, responsibilities, how it works step by step, output format and limits. Do not list its skills, knowledge or MCP tools: they are appended automatically.',
    skill: 'The SKILL.md content without frontmatter: when to use it, a step-by-step procedure, checklists, examples and common mistakes.',
    instruction: 'Rules the AI must always follow, as concise bullet points grouped by topic.',
    knowledge: 'A reference document in Markdown (sections, tables, definitions). Write TODO where you lack real information instead of inventing facts.',
    mcp: 'Usage notes in Markdown: what the server is for, setup, authentication and example requests.'
  };
  function fieldSpec(f) {
    const ids = (t) => S.all(t).map((i) => i.id);
    const vals = (o) => o.map((x) => JSON.stringify(x.value)).join(' | ');
    switch (f.kind) {
      case 'emoji': return 'one emoji';
      case 'select': return 'one of ' + vals(f.options);
      case 'multi': return 'array with values from ' + vals(f.options);
      case 'bool': return 'true or false';
      case 'kv': return 'object of string → string' + (f.key === 'env' || f.key === 'headers' ? ' (never real secrets: use "${input:NAME}")' : '');
      case 'ref': return 'one id from [' + ids(f.ref).join(', ') + '] or ""';
      case 'refs': return 'array of ids from [' + ids(f.ref).join(', ') + '] (only relevant ones, may be empty)';
      case 'tags': return 'array of strings' + (f.suggest ? ' from [' + f.suggest.join(', ') + ']' : ' (lowercase tags)');
      case 'list': return 'array of strings';
      default: return 'string';
    }
  }
  function itemPrompt(type, request, current) {
    const T = C.TYPES[type];
    const fields = C.FIELDS[type].filter((f) => !SKIP.has(f.key) && f.kind !== 'readonly' && f.kind !== 'combo');
    const example = S.all(type).filter((i) => i.body && (!current || i.id !== current.id)).sort((a, b) => a.body.length - b.body.length)[Math.floor(S.all(type).length / 2)] || S.all(type)[0];
    const globals = S.all('instruction').filter((i) => i.global).map((i) => i.body.trim()).join('\n\n');
    const system = `You are an expert in designing reusable AI assets for a team library called AI Center. You write clear, practical, production-quality content in English.${globals ? '\n\n# Team rules\n\n' + globals : ''}`;
    const L = [];
    const hasCurrent = current && (current.name || (current.body && current.body.trim()));
    L.push(hasCurrent ? `Improve this existing ${T.singular.toLowerCase()} of AI Center following the request.` : `Create a new ${T.singular.toLowerCase()} for AI Center.`, '');
    L.push(`**What a ${T.singular.toLowerCase()} is**: ${T.help}`, '');
    L.push('**Request**:', '"""', request, '"""', '');
    if (hasCurrent) {
      const cur = {};
      fields.forEach((f) => { cur[f.key] = current[f.key]; });
      cur.body = current.body;
      L.push('**Current version** (keep what is good, change what the request asks):', '```json', JSON.stringify(cur, null, 2), '```', '');
    } else if (example && example.body) {
      L.push(`**Example of an existing ${T.singular.toLowerCase()} in this library** (match its style and level of detail, not its topic):`, '```json',
        JSON.stringify({ name: example.name, description: example.description, body: example.body.trim().slice(0, 2500) }, null, 2), '```', '');
    }
    L.push('**Fields**:', '');
    L.push('- `name` (string, required): short title');
    L.push('- `description` (string, required): what it does and when to use it, 1-2 sentences (agents read it to decide when to apply it)');
    fields.filter((f) => f.key !== 'name' && f.key !== 'description').forEach((f) => L.push(`- \`${f.key}\` (${fieldSpec(f)}): ${f.label}${f.help ? ' — ' + f.help : ''}`));
    L.push(`- \`body\` (string, Markdown): ${C.BODY_LABEL[type]}. ${GUIDE[type] || ''}`, '');
    L.push('Return ONLY one valid JSON object with these keys (escape line breaks in strings as \\n). No text before or after.');
    return { system, user: L.join('\n') };
  }
  /** Validates the AI answer against the type fields; returns a patch for the draft. */
  function itemPatch(type, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The answer is not a JSON object');
    if (!String(data.name || '').trim()) throw new Error('The answer has no "name"');
    const patch = { name: String(data.name).trim(), description: String(data.description || '').trim() };
    C.FIELDS[type].forEach((f) => {
      if (SKIP.has(f.key) || f.key === 'name' || f.key === 'description' || !(f.key in data)) return;
      let v = data[f.key];
      if (['tags', 'list', 'refs', 'multi'].includes(f.kind)) {
        v = (Array.isArray(v) ? v : [v]).filter((x) => x !== null && x !== undefined && x !== '').map(String);
        if (f.kind === 'refs') v = v.filter((id) => S.get(f.ref, id));
        if (f.kind === 'multi') v = v.filter((x) => f.options.some((o) => o.value === x));
      } else if (f.kind === 'ref') v = v && S.get(f.ref, String(v)) ? String(v) : '';
      else if (f.kind === 'select') { if (!f.options.some((o) => o.value === v)) return; }
      else if (f.kind === 'bool') v = v === true || v === 'true';
      else if (f.kind === 'kv') { if (!v || typeof v !== 'object' || Array.isArray(v)) return; v = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])); }
      else v = v === null || v === undefined ? '' : String(v);
      patch[f.key] = v;
    });
    if (typeof data.body === 'string') patch.body = data.body.replace(/\r\n?/g, '\n').trim() + '\n';
    return patch;
  }
  /** Opens the dialog for an item draft; onPatch(patch) receives the validated fields. */
  function generateItem(type, draft, onPatch) {
    const T = C.TYPES[type];
    const hasCurrent = draft && (draft.name || '').trim();
    return aiDialog({
      title: (hasCurrent ? 'Improve ' : 'Generate ') + T.singular.toLowerCase() + ' with AI',
      intro: hasCurrent ? 'The AI rewrites this ' + T.singular.toLowerCase() + ' following your request. You review the result in the editor before saving.' : 'Describe it and the AI fills in the name, description, fields and content. You review everything before saving.',
      label: hasCurrent ? 'What should change?' : 'What do you need?',
      placeholder: {
        prompt: 'e.g. A prompt that turns a support ticket into a bug report with steps to reproduce, expected vs actual behavior and severity.',
        agent: 'e.g. A data analyst agent that answers questions about our sales data, explains its reasoning and always shows the query it used.',
        skill: 'e.g. How we write database migrations: naming, reversibility, data backfills and the review checklist.',
        instruction: 'e.g. Rules for writing Python: type hints, ruff formatting, pytest conventions and error handling.',
        knowledge: 'e.g. Our release process: environments, branching, approvals and rollback.',
        mcp: 'e.g. The PostgreSQL MCP server, read-only, for querying the analytics database.'
      }[type] || '',
      build: (request) => itemPrompt(type, request, hasCurrent ? draft : null),
      apply: (text) => {
        let patch;
        try { patch = itemPatch(type, C.parseLooseJson(text)); } catch (e) { return 'Could not use the answer: ' + e.message; }
        onPatch(patch);
        toast('✨ Generated: review it and save', 'ok', 3500);
        return undefined;
      }
    });
  }

  AIC.ai = { ENGINES, engineConfig, enginePanel, callEngine, aiDialog, generateItem, itemPrompt, itemPatch };
})();
