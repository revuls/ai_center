/* AI Center · views-runner.js — E2E workflow execution and history */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, toast, modal, copy, md, download, confirmDialog, timeAgo } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});
  const go = (x) => AIC.app.go(x);

  const PROVIDERS = [
    { value: 'manual', label: '✋ Manual (copy and paste)', desc: 'Works with Copilot M365, Copilot Chat, ChatGPT, Claude… You copy each step\'s prompt, paste the answer and the flow continues.' },
    { value: 'simulate', label: '🧪 Simulation', desc: 'Walks the flow with sample outputs to validate the design without spending tokens.' },
    { value: 'anthropic', label: '🟣 Anthropic API', desc: 'Calls Claude directly from the browser with your key.' },
    { value: 'openai', label: '🟢 OpenAI-compatible', desc: 'OpenAI, GitHub Models, Ollama, LM Studio, vLLM… (base URL + key).' },
    { value: 'azure', label: '🔷 Azure OpenAI', desc: 'Endpoint + deployment of your Azure OpenAI resource.' }
  ];

  async function callLLM(cfg, composed, signal) {
    const p = cfg.provider;
    if (p === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: cfg.model || 'claude-sonnet-5-5', max_tokens: 8000, system: composed.system, messages: [{ role: 'user', content: composed.user }] })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && d.error.message) || 'HTTP ' + r.status);
      return (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    }
    if (p === 'openai' || p === 'azure') {
      const url = p === 'azure'
        ? `${String(cfg.baseUrl).replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(cfg.model)}/chat/completions?api-version=${cfg.apiVersion || '2024-10-21'}`
        : `${String(cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
      const headers = { 'content-type': 'application/json' };
      if (p === 'azure') headers['api-key'] = cfg.apiKey; else if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey;
      const body = { messages: [{ role: 'system', content: composed.system }, { role: 'user', content: composed.user }] };
      if (p !== 'azure') body.model = cfg.model || 'gpt-4.1';
      const r = await fetch(url, { method: 'POST', signal, headers, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || 'HTTP ' + r.status);
      return d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    }
    throw new Error('Unsupported provider: ' + p);
  }
  V.callLLM = callLLM;

  /* ======================================================== *
   * Runner
   * ======================================================== */
  V.runner = function (root, wfId) {
    const wf = S.get('workflow', wfId);
    const page = h('div', { class: 'page' });
    root.append(page);
    if (!wf) { page.append(h('div', { class: 'card empty' }, h('div', { class: 'e-ico' }, '🔎'), 'Workflow not found.', h('div', { style: { marginTop: '10px' } }, btn('View workflows', () => go('#/library/workflow'))))); return; }
    const cfg = Object.assign({ provider: 'manual', model: '', baseUrl: '', apiKey: '', apiVersion: '2024-10-21', remember: false }, S.prefs.llm);
    const inputs = {};
    let autoApprove = false;
    let workspace = null; // picked folder for step context files: [{path, file}]
    let ctrl = null;
    let running = false;

    const head = h('div', { class: 'page-head' },
      h('div', null, h('h1', null, '▶ Run · ', wf.icon || '🔀', ' ', wf.name), h('p', null, wf.description)),
      h('div', { class: 'actions' }, btn('Edit workflow', () => go('#/workflow/' + encodeURIComponent(wf.id)), { icon: 'edit' })));
    page.append(head);
    const issues = C.validateWorkflow(S.lib, wf).filter((i) => i.level === 'error');
    if (issues.length) page.append(h('div', { class: 'callout err', style: { marginBottom: '14px' } }, '⛔', h('div', null, h('b', null, 'The workflow has errors: '), issues.map((i) => i.msg).join(' · '))));

    const body = h('div');
    page.append(body);
    setup();

    function fileInput(i) {
      const info = h('div', { class: 'small muted', style: { marginTop: '6px' } }, inputs[i.name] ? C.inputText(inputs[i.name]) : (i.description || 'Nothing selected'));
      const pick = async (folder) => {
        const entries = await AIC.pickLocal({ folder });
        if (!entries.length) return;
        const res = await AIC.readLocalFiles(entries, [folder ? (i.pattern || '**') : '**']);
        if (!res.files.length) { toast('No text files found' + (i.pattern ? ' matching ' + i.pattern : ''), 'err'); return; }
        inputs[i.name] = C.fileValue(res.files, res);
        info.textContent = '📎 ' + C.inputText(inputs[i.name]) + (res.omitted ? ` · ${res.omitted} omitted by limits` : '');
      };
      return h('div', null, h('div', { class: 'row wrap' },
        i.type === 'folder' ? btn('Choose folder', () => pick(true), { cls: 'sm', icon: 'folder' }) : btn('Choose file(s)', () => pick(false), { cls: 'sm', icon: 'file' }),
        i.pattern ? h('span', { class: 'chip mono' }, i.pattern) : null,
        btn('Clear', () => { delete inputs[i.name]; info.textContent = 'Nothing selected'; }, { cls: 'sm ghost' })), info);
    }
    function workspaceCard() {
      const pats = C.uniq(wf.nodes.flatMap((n) => C.arr(n.contextFiles)));
      const info = h('div', { class: 'small muted', style: { marginTop: '6px' } }, workspace ? `📂 ${workspace.length} files loaded` : 'Not selected: steps will be told to read these paths themselves (fine for agents with tools).');
      return h('div', { class: 'field', style: { borderTop: '1px solid var(--border)', paddingTop: '12px' } },
        h('div', { class: 'lbl' }, '📂 Context files folder'),
        h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Some steps read files as context: ', ...pats.map((p) => h('code', { style: { marginRight: '4px' } }, p)), '. Choose the folder they are relative to (usually your repository).'),
        h('div', { class: 'row' }, btn('Choose folder', async () => {
          const entries = await AIC.pickLocal({ folder: true });
          if (!entries.length) return;
          workspace = entries.filter((e) => !C.isIgnoredPath(e.path));
          info.textContent = `📂 ${workspace.length} files loaded`;
        }, { cls: 'sm', icon: 'folder' }), btn('Clear', () => { workspace = null; info.textContent = 'Not selected'; }, { cls: 'sm ghost' })), info);
    }

    function setup() {
      body.innerHTML = '';
      const left = h('div', { class: 'card card-pad' });
      left.append(h('h3', { style: { marginTop: 0 } }, '📥 Inputs'));
      if (!wf.inputs.length) left.append(h('div', { class: 'muted small' }, 'This workflow needs no inputs.'));
      wf.inputs.forEach((i) => left.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, i.label || i.name, i.required ? h('span', { class: 'req' }, '*') : null, h('span', { class: 'muted mono', style: { fontWeight: 400 } }, '{{' + i.name + '}}')),
        i.type === 'file' || i.type === 'folder' ? fileInput(i)
          : h('textarea', { rows: 3, placeholder: i.description || '', value: typeof inputs[i.name] === 'string' ? inputs[i.name] : '', oninput: (e) => { inputs[i.name] = e.target.value; } }))));
      if (wf.nodes.some((n) => C.arr(n.contextFiles).length)) left.append(workspaceCard());

      const right = h('div', { class: 'card card-pad' });
      right.append(h('h3', { style: { marginTop: 0 } }, '⚙ Execution engine'));
      const provBox = h('div', { class: 'col' });
      const cfgBox = h('div', { style: { marginTop: '12px' } });
      const drawCfg = () => {
        cfgBox.innerHTML = '';
        const p = cfg.provider;
        if (p === 'anthropic' || p === 'openai' || p === 'azure') {
          if (p !== 'anthropic') cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, p === 'azure' ? 'Endpoint' : 'Base URL'),
            h('input', { type: 'url', value: cfg.baseUrl, placeholder: p === 'azure' ? 'https://mi-recurso.openai.azure.com' : 'https://api.openai.com/v1 · https://models.github.ai/inference · http://localhost:11434/v1', oninput: (e) => { cfg.baseUrl = e.target.value; } })));
          cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, p === 'azure' ? 'Deployment' : 'Model'),
            h('input', { type: 'text', value: cfg.model, placeholder: p === 'anthropic' ? 'claude-sonnet-5-5' : p === 'azure' ? 'gpt-4o' : 'gpt-4.1 · openai/gpt-4.1 · llama3.1', oninput: (e) => { cfg.model = e.target.value; } })));
          cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'API key'),
            h('input', { type: 'password', value: cfg.apiKey, autocomplete: 'off', placeholder: 'Stays in this browser', oninput: (e) => { cfg.apiKey = e.target.value; } }),
            h('label', { class: 'check small', style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: cfg.remember, onchange: (e) => { cfg.remember = e.target.checked; } }), 'Remember the key in this browser (never stored in files)')));
          cfgBox.append(h('div', { class: 'callout small' }, '🔐', h('div', null, 'The call goes straight from your browser to the provider. If the provider blocks CORS, use the CLI: ', h('code', null, `node cli/aic.mjs run ${wf.id}`), '.')));
        }
        if (p !== 'manual') cfgBox.append(h('label', { class: 'check', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: autoApprove, onchange: (e) => { autoApprove = e.target.checked; } }), 'Approve human reviews automatically'));
      };
      PROVIDERS.forEach((p) => provBox.append(h('label', { class: 'card target-card' + (cfg.provider === p.value ? ' on' : ''), style: { padding: '10px 12px' }, onclick: () => { cfg.provider = p.value; Array.from(provBox.children).forEach((c, i) => c.classList.toggle('on', PROVIDERS[i].value === p.value)); drawCfg(); } },
        h('div', null, h('div', { style: { fontWeight: 650 } }, p.label), h('div', { class: 'muted small' }, p.desc)))));
      right.append(provBox, cfgBox);
      drawCfg();

      const order = C.linearize(wf);
      const plan = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '🗺 Plan'), ...order.map((n, i) => h('div', { class: 'row small', style: { marginBottom: '4px' } }, h('span', { class: 'tl-dot', style: { width: '20px', height: '20px', fontSize: '10px' } }, i + 1), h('span', null, (C.NODE_TYPES[n.type] || {}).icon, ' ', n.title || C.nodeLabel(S.lib, n)))));
      body.append(h('div', { class: 'grid', style: { gridTemplateColumns: '1.1fr 1fr', alignItems: 'start' } }, h('div', { class: 'col', style: { gap: '14px' } }, left, plan), right));
      body.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '16px' } }, btn('Start run', () => start(), { cls: 'primary', icon: 'play' })));
    }

    async function start() {
      const missing = wf.inputs.filter((i) => i.required && (!inputs[i.name] || (typeof inputs[i.name] === 'string' && !inputs[i.name].trim())));
      if (missing.length) { toast('Missing inputs: ' + missing.map((m) => m.label || m.name).join(', '), 'err'); return; }
      if (['anthropic', 'openai', 'azure'].includes(cfg.provider) && !cfg.apiKey && cfg.provider !== 'openai') { toast('Enter the API key', 'err'); return; }
      Object.assign(S.prefs.llm, cfg); S.savePrefs();
      running = true;
      ctrl = new AbortController();
      body.innerHTML = '';
      const timeline = h('div', { class: 'card timeline' });
      const main = h('div', { class: 'col', style: { gap: '14px' } });
      const status = h('div', { class: 'row' }, h('span', { class: 'spinner' }), h('b', null, 'Running…'), h('div', { class: 'grow' }), btn('Stop', () => { ctrl.abort(); if (pending) pending.reject(Object.assign(new Error('Run stopped'), { name: 'AbortError' })); }, { cls: 'sm danger', icon: 'stop' }));
      body.append(h('div', { class: 'runner' }, timeline, h('div', { class: 'col', style: { gap: '14px' } }, h('div', { class: 'card card-pad' }, status), main)));
      const order = C.linearize(wf);
      let pending = null;
      let viewing = null;
      let liveRun = null;
      const drawTimeline = () => {
        timeline.innerHTML = '';
        timeline.append(h('div', { class: 'small muted', style: { padding: '6px 10px' } }, 'Progress'));
        const doneIds = new Set((liveRun ? liveRun.steps : []).map((s) => s.nodeId));
        (liveRun ? liveRun.steps : []).forEach((s, i) => timeline.append(h('div', { class: 'tl-step ' + s.status + (viewing === i ? ' cur' : ''), onclick: () => { viewing = i; drawTimeline(); showStep(s); } },
          h('span', { class: 'tl-dot' }, s.status === 'done' ? '✓' : s.status === 'error' ? '!' : i + 1),
          h('div', { class: 'grow' }, h('div', { style: { fontWeight: 600, fontSize: '13px' } }, s.title, s.attempt > 1 ? ` (×${s.attempt})` : ''), h('div', { class: 'muted small' }, (C.NODE_TYPES[s.type] || {}).label, s.decision ? ' · ' + s.decision : '')))));
        order.filter((n) => !doneIds.has(n.id)).forEach((n) => timeline.append(h('div', { class: 'tl-step skipped' }, h('span', { class: 'tl-dot' }, '·'), h('div', { class: 'grow muted', style: { fontSize: '13px' } }, n.title || C.nodeLabel(S.lib, n)))));
      };
      const showStep = (s) => {
        main.innerHTML = '';
        main.append(h('div', { class: 'card card-pad' }, h('div', { class: 'row', style: { marginBottom: '10px' } }, h('h3', { style: { margin: 0 } }, s.title), h('div', { class: 'grow' }), h('span', { class: 'chip' }, s.status), btn('Back to current step', () => { viewing = null; drawTimeline(); if (currentPanel) { main.innerHTML = ''; main.append(currentPanel); } }, { cls: 'sm ghost' })),
          s.prompt ? promptBox(s.prompt) : null,
          s.files && s.files.length ? h('div', { style: { marginTop: '12px' } }, h('div', { class: 'lbl small muted' }, '📄 Files'), filesList(s.files)) : null,
          s.output ? h('div', { style: { marginTop: '12px' } }, h('div', { class: 'lbl small muted' }, 'Output'), h('div', { class: 'md card card-pad', html: md(s.output) })) : null));
      };
      let currentPanel = null;
      const setPanel = (el) => { currentPanel = el; if (viewing === null) { main.innerHTML = ''; main.append(el); } };
      const waitUser = () => new Promise((resolve, reject) => { pending = { resolve, reject }; });

      const hooks = {
        readFiles: workspace ? (patterns) => AIC.readLocalFiles(workspace, patterns) : undefined,
        signal: ctrl.signal,
        onEvent: (type, d, run) => {
          liveRun = run;
          if (type === 'step:start' || type === 'step:done' || type === 'step:error') drawTimeline();
          if (type === 'warn') toast(d.message);
        },
        llm: async (composed, info) => {
          if (cfg.provider === 'simulate') {
            await new Promise((r) => setTimeout(r, 450));
            if (info.kind === 'condition') return info.options[0] + '\n\n(simulation: the first option is chosen)';
            const by = composed.agent ? 'the agent `' + composed.agent + '`' : 'the AI';
            const skills = composed.skills.length ? ', applying the skills ' + composed.skills.join(', ') : '';
            const simFiles = (composed.files || []).map((p) => `\n\n\`\`\`\`markdown file=${p}\n# ${p}\n\n(simulated content of this file)\n\`\`\`\``).join('');
            return `**[Simulation] ${composed.title}**\n\nThe step deliverable generated by ${by}${skills} would go here.${simFiles}`;
          }
          if (cfg.provider === 'manual') {
            const out = h('textarea', { class: 'code', rows: 10, placeholder: 'Paste the AI answer here…' });
            const panel = h('div', { class: 'card card-pad' },
              h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '20px' } }, info.kind === 'condition' ? '◆' : '⚙'), h('h3', { style: { margin: 0 } }, composed.title), h('div', { class: 'grow' }),
                composed.agent ? h('span', { class: 'chip' }, '🤖 ' + (S.get('agent', composed.agent) || {}).name) : null, composed.model ? h('span', { class: 'chip' }, composed.model) : null),
              h('div', { class: 'steps-guide', style: { marginTop: '8px' } },
                h('div', { class: 'card' }, h('b', null, 'Copy the prompt and paste it into your AI'),
                  h('div', { class: 'row wrap', style: { margin: '8px 0' } },
                    btn('Copy full prompt', () => copy(composed.full, 'Prompt copied: paste it into your AI'), { cls: 'primary sm', icon: 'copy' }),
                    btn('Copilot M365', () => window.open('https://m365.cloud.microsoft/chat', '_blank'), { cls: 'sm', icon: 'export' }),
                    btn('GitHub Copilot', () => window.open('https://github.com/copilot', '_blank'), { cls: 'sm', icon: 'export' })),
                  promptBox(composed)),
                h('div', { class: 'card' }, h('b', null, info.kind === 'condition' ? 'Paste the answer or pick the option directly' : 'Paste the answer'), out,
                  info.kind === 'condition' ? h('div', { class: 'row wrap', style: { marginTop: '8px' } }, ...info.options.map((o) => btn('→ ' + o, () => pending.resolve(o), { cls: 'sm' }))) : null)),
              h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '12px' } },
                btn('Skip step', () => pending.resolve('(step skipped)'), { cls: 'ghost sm' }),
                btn('Complete step and continue', () => { if (!out.value.trim()) { toast('Paste the answer (or click Skip)', 'err'); return; } pending.resolve(out.value); }, { cls: 'primary', icon: 'check' })));
            setPanel(panel);
            setTimeout(() => out.focus(), 30);
            return waitUser();
          }
          const panel = h('div', { class: 'card card-pad' }, h('div', { class: 'row' }, h('span', { class: 'spinner' }), h('b', null, composed.title), h('span', { class: 'muted small' }, ' · calling ' + cfg.provider + '…')), h('div', { style: { marginTop: '10px' } }, promptBox(composed)));
          setPanel(panel);
          return callLLM(cfg, composed, ctrl.signal);
        },
        human: async ({ node, context, step }) => {
          if (autoApprove && cfg.provider !== 'manual') return { approved: true, notes: 'Approved automatically' };
          const notes = h('textarea', { rows: 3, placeholder: 'Comments / requested changes…' });
          const panel = h('div', { class: 'card card-pad', style: { borderColor: 'var(--warn)' } },
            h('div', { class: 'row', style: { marginBottom: '10px' } }, h('span', { style: { fontSize: '22px' } }, '🧑'), h('div', null, h('h3', { style: { margin: 0 } }, step.title), h('div', { class: 'muted small' }, 'Human review' + (node.owner ? ' · ' + node.owner : '')))),
            node.instructions ? h('div', { class: 'callout warn', style: { marginBottom: '12px' } }, '📋', h('div', null, node.instructions)) : null,
            context ? h('div', { class: 'md card card-pad', style: { maxHeight: '420px', overflow: 'auto', marginBottom: '12px' }, html: md(context) }) : null,
            h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Comments'), notes),
            h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
              btn('🔁 Request changes', () => { if (!notes.value.trim()) { toast('Say what to change', 'err'); notes.focus(); return; } pending.resolve({ approved: false, notes: notes.value }); }, { cls: '' }),
              btn('✅ Approve and continue', () => pending.resolve({ approved: true, notes: notes.value }), { cls: 'ok' })));
          setPanel(panel);
          return waitUser();
        },
        choose: async ({ edges, answer }) => {
          const panel = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '◆ Which way next?'),
            h('div', { class: 'muted small', style: { marginBottom: '10px' } }, 'The option was not recognized in the answer. Choose the branch:'),
            answer ? h('div', { class: 'md card card-pad', style: { marginBottom: '10px' }, html: md(answer) }) : null,
            h('div', { class: 'row wrap' }, ...edges.map((e) => btn('→ ' + (e.label || (wf.nodes.find((n) => n.id === e.to) || {}).title || e.to), () => pending.resolve(e), { cls: 'primary sm' }))));
          setPanel(panel);
          return waitUser();
        }
      };
      drawTimeline();
      let run;
      try { run = await C.runWorkflow(S.lib, wf, Object.assign({}, inputs), hooks); }
      catch (e) { toast('Error: ' + e.message, 'err', 6000); running = false; return; }
      running = false;
      liveRun = run; viewing = null; drawTimeline();
      status.innerHTML = '';
      const ok = run.status === 'completed';
      status.append(h('span', { style: { fontSize: '20px' } }, ok ? '🎉' : run.status === 'cancelled' ? '⏹' : '⚠'), h('b', null, ok ? 'Workflow completed' : run.status === 'cancelled' ? 'Run stopped' : 'Error: ' + (run.error || '')),
        h('span', { class: 'muted small' }, ` · ${run.steps.length} steps`), h('div', { class: 'grow' }), btn('Run again', () => setup(), { cls: 'sm', icon: 'refresh' }));
      const report = C.runReport(run, wf);
      const where = await S.saveRun(run, report);
      main.innerHTML = '';
      const produced = C.runFiles(run);
      if (produced.length) main.append(filesCard(run, produced, where));
      main.append(h('div', { class: 'card card-pad' },
        h('div', { class: 'row wrap', style: { marginBottom: '12px' } }, h('h3', { style: { margin: 0 } }, '📄 Report'), h('div', { class: 'grow' }),
          where ? h('span', { class: 'chip st-stable' }, '💾 ' + where) : h('span', { class: 'chip' }, 'Saved in the browser history'),
          btn('Copy', () => copy(report), { cls: 'sm', icon: 'copy' }),
          btn('REPORT.md', () => download(run.id + '-REPORT.md', report), { cls: 'sm', icon: 'download' }),
          btn('run.json', () => download(run.id + '.run.json', JSON.stringify(run, null, 2), 'application/json'), { cls: 'sm', icon: 'download' })),
        h('div', { class: 'md', html: md(report) })));
    }
    return () => { if (running && ctrl) ctrl.abort(); };
  };

  /* ---------- output files ---------- */
  function filesList(files) {
    return h('div', { class: 'attach-list' }, ...files.map((f) => h('div', { class: 'attach-row' },
      h('span', null, '📄'), h('span', { class: 'grow mono', title: f.path }, f.path), h('span', { class: 'muted small' }, f.content.length + ' chars'),
      h('button', { class: 'btn ghost icon sm', title: 'View', onclick: () => viewFile(f) }, icon('eye', 13)),
      h('button', { class: 'btn ghost icon sm', title: 'Download', onclick: () => download(f.path.split('/').pop(), f.content) }, icon('download', 13)))));
  }
  function viewFile(f) {
    modal({ title: f.path, titleIcon: '📄', size: 'wide', body: h('pre', { class: 'code-view', style: { maxHeight: '65vh' } }, f.content),
      foot: (close) => [btn('Copy', () => copy(f.content), { icon: 'copy' }), btn('Download', () => download(f.path.split('/').pop(), f.content), { icon: 'download' }), btn('Close', () => close(), { cls: 'primary' })] });
  }
  function filesCard(run, files, where) {
    const zipIt = () => download(run.id + '-files.zip', AIC.zip(files.map((f) => ({ path: f.path, data: f.content }))));
    const writeRepo = async () => {
      let dir;
      try { dir = await window.showDirectoryPicker({ id: 'aic-run-files', mode: 'readwrite' }); } catch (e) { return; }
      const ok = await AIC.confirmDialog(h('div', null, 'Write ', h('b', null, files.length + ' file(s)'), ' into «', h('b', null, dir.name), '»? Files with the same path will be overwritten.',
        h('ul', { class: 'small mono' }, ...files.map((f) => h('li', null, f.path)))), { title: 'Write generated files', ok: 'Write files' });
      if (!ok) return;
      try { await S.writeFilesTo(dir, files); toast(`✅ ${files.length} file(s) written to ${dir.name}`, 'ok', 4000); } catch (e) { toast('Error: ' + e.message, 'err', 5000); }
    };
    const missing = run.steps.flatMap((s) => (s.missingFiles || []).map((p) => p + ' (' + s.title + ')'));
    return h('div', { class: 'card card-pad' },
      h('div', { class: 'row wrap', style: { marginBottom: '12px' } }, h('h3', { style: { margin: 0 } }, `📄 Generated files (${files.length})`), h('div', { class: 'grow' }),
        where ? h('span', { class: 'chip st-stable' }, '💾 ' + where + '/files') : null,
        btn('Download ZIP', zipIt, { cls: 'sm', icon: 'download' }),
        S.fsSupported ? btn('Write to folder…', writeRepo, { cls: 'sm primary', icon: 'folder', title: 'Pick your repository root' }) : null),
      filesList(files),
      missing.length ? h('div', { class: 'callout warn small', style: { marginTop: '10px' } }, '⚠', h('div', null, 'Declared but not returned by the AI: ', missing.join(', '))) : null);
  }

  function promptBox(c) {
    let mode = 'full';
    const pre = h('pre', null, c.full);
    const seg = h('div', { class: 'btn-group', style: { margin: '6px 0' } });
    [['full', 'Full'], ['system', 'System'], ['user', 'User']].forEach(([k, l]) => seg.append(h('button', { class: 'btn sm' + (k === mode ? ' on' : ''), onclick: (e) => { mode = k; pre.textContent = c[k]; Array.from(seg.children).forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); } }, l)));
    return h('div', null, seg, h('div', { class: 'prompt-box' }, pre, h('button', { class: 'btn sm copy', title: 'Copy', onclick: () => copy(c[mode]) }, icon('copy', 13))));
  }

  /* ======================================================== *
   * Run history
   * ======================================================== */
  V.runs = function (root) {
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '▶ Runs'), h('p', null, 'Launch workflows end to end and browse the history. With the folder connected, each run is saved in runs/<id>/ (run.json + REPORT.md).'))));
    const wfs = S.all('workflow');
    page.append(h('div', { class: 'section-title' }, '🚀 Launch'), wfs.length ? h('div', { class: 'grid cols-auto' }, ...wfs.map((w) => h('div', { class: 'card item-card', style: { '--tc': 'var(--c-workflow)' } },
      h('div', { class: 'ic-head' }, h('div', { class: 'ic-emoji' }, w.icon || '🔀'), h('div', { class: 'grow' }, h('div', { class: 'ic-title' }, w.name), h('div', { class: 'ic-id' }, w.nodes.filter((n) => n.type !== 'note').length + ' nodes'))),
      h('div', { class: 'ic-desc' }, w.description),
      h('div', { class: 'ic-foot' }, btn('Run', () => go('#/run/' + encodeURIComponent(w.id)), { cls: 'sm ok', icon: 'play' }), btn('Edit', () => go('#/workflow/' + encodeURIComponent(w.id)), { cls: 'sm ghost', icon: 'edit' }))))) : h('div', { class: 'card empty' }, 'No workflows yet.'));
    const hist = h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Loading…'));
    page.append(h('div', { class: 'section-title' }, '🕘 History ', h('span', { class: 'muted small' }, '(in this browser)')), hist);
    root.append(page);
    S.idb.runs().then((runs) => {
      runs = (runs || []).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
      hist.innerHTML = '';
      if (!runs.length) { hist.append(h('div', { class: 'empty' }, h('div', { class: 'e-ico' }, '🗒'), 'No runs yet.')); return; }
      hist.append(h('table', { class: 'list-table' }, h('thead', null, h('tr', null, h('th', null, 'Workflow'), h('th', null, 'Status'), h('th', null, 'Steps'), h('th', null, 'When'), h('th', null, ''))),
        h('tbody', null, ...runs.map((r) => h('tr', { onclick: () => showRun(r) },
          h('td', null, h('b', null, r.workflowName)), h('td', null, h('span', { class: 'chip ' + (r.status === 'completed' ? 'st-stable' : r.status === 'error' ? 'st-deprecated' : 'st-draft') }, r.status)),
          h('td', null, r.steps.length), h('td', { class: 'muted small' }, timeAgo(r.startedAt)),
          h('td', null, h('button', { class: 'btn ghost icon sm', title: 'Remove from history', onclick: async (e) => { e.stopPropagation(); if (await confirmDialog('Remove this run from the browser history?')) { await S.idb.delRun(r.id); AIC.app.route(); } } }, icon('trash', 14))))))));
    });
  };
  function showRun(r) {
    const wf = S.get('workflow', r.workflow);
    const report = C.runReport(r, wf);
    modal({
      title: r.workflowName, titleIcon: '📄', size: 'wide', body: h('div', { class: 'md', html: md(report) }),
      foot: (close) => [btn('Download REPORT.md', () => download(r.id + '-REPORT.md', report), { icon: 'download' }), btn('Copy', () => copy(report), { icon: 'copy' }), btn('Close', () => close(), { cls: 'primary' })]
    });
  }
})();
