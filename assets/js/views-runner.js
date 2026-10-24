/* AI Center · views-runner.js — ejecución E2E de workflows e historial */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, toast, modal, copy, md, download, confirmDialog, timeAgo } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});
  const go = (x) => AIC.app.go(x);

  const PROVIDERS = [
    { value: 'manual', label: '✋ Manual (copiar y pegar)', desc: 'Funciona con Copilot M365, Copilot Chat, ChatGPT, Claude… Copias el prompt de cada paso, pegas la respuesta y el flujo continúa.' },
    { value: 'simulate', label: '🧪 Simulación', desc: 'Recorre el flujo con salidas de ejemplo para validar el diseño sin gastar tokens.' },
    { value: 'anthropic', label: '🟣 Anthropic API', desc: 'Llama a Claude directamente desde el navegador con tu clave.' },
    { value: 'openai', label: '🟢 OpenAI-compatible', desc: 'OpenAI, GitHub Models, Ollama, LM Studio, vLLM… (base URL + clave).' },
    { value: 'azure', label: '🔷 Azure OpenAI', desc: 'Endpoint + deployment de tu recurso de Azure OpenAI.' }
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
    throw new Error('Proveedor no soportado: ' + p);
  }
  V.callLLM = callLLM;

  /* ======================================================== *
   * Ejecutor
   * ======================================================== */
  V.runner = function (root, wfId) {
    const wf = S.get('workflow', wfId);
    const page = h('div', { class: 'page' });
    root.append(page);
    if (!wf) { page.append(h('div', { class: 'card empty' }, h('div', { class: 'e-ico' }, '🔎'), 'Workflow no encontrado.', h('div', { style: { marginTop: '10px' } }, btn('Ver workflows', () => go('#/library/workflow'))))); return; }
    const cfg = Object.assign({ provider: 'manual', model: '', baseUrl: '', apiKey: '', apiVersion: '2024-10-21', remember: false }, S.prefs.llm);
    const inputs = {};
    let autoApprove = false;
    let ctrl = null;
    let running = false;

    const head = h('div', { class: 'page-head' },
      h('div', null, h('h1', null, '▶ Ejecutar · ', wf.icon || '🔀', ' ', wf.name), h('p', null, wf.description)),
      h('div', { class: 'actions' }, btn('Editar workflow', () => go('#/workflow/' + encodeURIComponent(wf.id)), { icon: 'edit' })));
    page.append(head);
    const issues = C.validateWorkflow(S.lib, wf).filter((i) => i.level === 'error');
    if (issues.length) page.append(h('div', { class: 'callout err', style: { marginBottom: '14px' } }, '⛔', h('div', null, h('b', null, 'El workflow tiene errores: '), issues.map((i) => i.msg).join(' · '))));

    const body = h('div');
    page.append(body);
    setup();

    function setup() {
      body.innerHTML = '';
      const left = h('div', { class: 'card card-pad' });
      left.append(h('h3', { style: { marginTop: 0 } }, '📥 Entradas'));
      if (!wf.inputs.length) left.append(h('div', { class: 'muted small' }, 'Este workflow no necesita entradas.'));
      wf.inputs.forEach((i) => left.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, i.label || i.name, i.required ? h('span', { class: 'req' }, '*') : null, h('span', { class: 'muted mono', style: { fontWeight: 400 } }, '{{' + i.name + '}}')),
        h('textarea', { rows: 3, placeholder: i.description || '', value: inputs[i.name] || '', oninput: (e) => { inputs[i.name] = e.target.value; } }))));

      const right = h('div', { class: 'card card-pad' });
      right.append(h('h3', { style: { marginTop: 0 } }, '⚙ Motor de ejecución'));
      const provBox = h('div', { class: 'col' });
      const cfgBox = h('div', { style: { marginTop: '12px' } });
      const drawCfg = () => {
        cfgBox.innerHTML = '';
        const p = cfg.provider;
        if (p === 'anthropic' || p === 'openai' || p === 'azure') {
          if (p !== 'anthropic') cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, p === 'azure' ? 'Endpoint' : 'Base URL'),
            h('input', { type: 'url', value: cfg.baseUrl, placeholder: p === 'azure' ? 'https://mi-recurso.openai.azure.com' : 'https://api.openai.com/v1 · https://models.github.ai/inference · http://localhost:11434/v1', oninput: (e) => { cfg.baseUrl = e.target.value; } })));
          cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, p === 'azure' ? 'Deployment' : 'Modelo'),
            h('input', { type: 'text', value: cfg.model, placeholder: p === 'anthropic' ? 'claude-sonnet-5-5' : p === 'azure' ? 'gpt-4o' : 'gpt-4.1 · openai/gpt-4.1 · llama3.1', oninput: (e) => { cfg.model = e.target.value; } })));
          cfgBox.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Clave de API'),
            h('input', { type: 'password', value: cfg.apiKey, autocomplete: 'off', placeholder: 'Se queda en este navegador', oninput: (e) => { cfg.apiKey = e.target.value; } }),
            h('label', { class: 'check small', style: { marginTop: '6px' } }, h('input', { type: 'checkbox', checked: cfg.remember, onchange: (e) => { cfg.remember = e.target.checked; } }), 'Recordar la clave en este navegador (nunca se guarda en ficheros)')));
          cfgBox.append(h('div', { class: 'callout small' }, '🔐', h('div', null, 'La llamada sale directamente de tu navegador al proveedor. Si el proveedor bloquea CORS, usa la CLI: ', h('code', null, `node cli/aic.mjs run ${wf.id}`), '.')));
        }
        if (p !== 'manual') cfgBox.append(h('label', { class: 'check', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: autoApprove, onchange: (e) => { autoApprove = e.target.checked; } }), 'Aprobar automáticamente las revisiones humanas'));
      };
      PROVIDERS.forEach((p) => provBox.append(h('label', { class: 'card target-card' + (cfg.provider === p.value ? ' on' : ''), style: { padding: '10px 12px' }, onclick: () => { cfg.provider = p.value; Array.from(provBox.children).forEach((c, i) => c.classList.toggle('on', PROVIDERS[i].value === p.value)); drawCfg(); } },
        h('div', null, h('div', { style: { fontWeight: 650 } }, p.label), h('div', { class: 'muted small' }, p.desc)))));
      right.append(provBox, cfgBox);
      drawCfg();

      const order = C.linearize(wf);
      const plan = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '🗺 Plan'), ...order.map((n, i) => h('div', { class: 'row small', style: { marginBottom: '4px' } }, h('span', { class: 'tl-dot', style: { width: '20px', height: '20px', fontSize: '10px' } }, i + 1), h('span', null, (C.NODE_TYPES[n.type] || {}).icon, ' ', n.title || C.nodeLabel(S.lib, n)))));
      body.append(h('div', { class: 'grid', style: { gridTemplateColumns: '1.1fr 1fr', alignItems: 'start' } }, h('div', { class: 'col', style: { gap: '14px' } }, left, plan), right));
      body.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '16px' } }, btn('Iniciar ejecución', () => start(), { cls: 'primary', icon: 'play' })));
    }

    async function start() {
      const missing = wf.inputs.filter((i) => i.required && !String(inputs[i.name] || '').trim());
      if (missing.length) { toast('Faltan entradas: ' + missing.map((m) => m.label || m.name).join(', '), 'err'); return; }
      if (['anthropic', 'openai', 'azure'].includes(cfg.provider) && !cfg.apiKey && cfg.provider !== 'openai') { toast('Introduce la clave de API', 'err'); return; }
      Object.assign(S.prefs.llm, cfg); S.savePrefs();
      running = true;
      ctrl = new AbortController();
      body.innerHTML = '';
      const timeline = h('div', { class: 'card timeline' });
      const main = h('div', { class: 'col', style: { gap: '14px' } });
      const status = h('div', { class: 'row' }, h('span', { class: 'spinner' }), h('b', null, 'Ejecutando…'), h('div', { class: 'grow' }), btn('Detener', () => { ctrl.abort(); if (pending) pending.reject(Object.assign(new Error('Ejecución detenida'), { name: 'AbortError' })); }, { cls: 'sm danger', icon: 'stop' }));
      body.append(h('div', { class: 'runner' }, timeline, h('div', { class: 'col', style: { gap: '14px' } }, h('div', { class: 'card card-pad' }, status), main)));
      const order = C.linearize(wf);
      let pending = null;
      let viewing = null;
      let liveRun = null;
      const drawTimeline = () => {
        timeline.innerHTML = '';
        timeline.append(h('div', { class: 'small muted', style: { padding: '6px 10px' } }, 'Progreso'));
        const doneIds = new Set((liveRun ? liveRun.steps : []).map((s) => s.nodeId));
        (liveRun ? liveRun.steps : []).forEach((s, i) => timeline.append(h('div', { class: 'tl-step ' + s.status + (viewing === i ? ' cur' : ''), onclick: () => { viewing = i; drawTimeline(); showStep(s); } },
          h('span', { class: 'tl-dot' }, s.status === 'done' ? '✓' : s.status === 'error' ? '!' : i + 1),
          h('div', { class: 'grow' }, h('div', { style: { fontWeight: 600, fontSize: '13px' } }, s.title, s.attempt > 1 ? ` (×${s.attempt})` : ''), h('div', { class: 'muted small' }, (C.NODE_TYPES[s.type] || {}).label, s.decision ? ' · ' + s.decision : '')))));
        order.filter((n) => !doneIds.has(n.id)).forEach((n) => timeline.append(h('div', { class: 'tl-step skipped' }, h('span', { class: 'tl-dot' }, '·'), h('div', { class: 'grow muted', style: { fontSize: '13px' } }, n.title || C.nodeLabel(S.lib, n)))));
      };
      const showStep = (s) => {
        main.innerHTML = '';
        main.append(h('div', { class: 'card card-pad' }, h('div', { class: 'row', style: { marginBottom: '10px' } }, h('h3', { style: { margin: 0 } }, s.title), h('div', { class: 'grow' }), h('span', { class: 'chip' }, s.status), btn('Volver al paso actual', () => { viewing = null; drawTimeline(); if (currentPanel) { main.innerHTML = ''; main.append(currentPanel); } }, { cls: 'sm ghost' })),
          s.prompt ? promptBox(s.prompt) : null,
          s.output ? h('div', { style: { marginTop: '12px' } }, h('div', { class: 'lbl small muted' }, 'Salida'), h('div', { class: 'md card card-pad', html: md(s.output) })) : null));
      };
      let currentPanel = null;
      const setPanel = (el) => { currentPanel = el; if (viewing === null) { main.innerHTML = ''; main.append(el); } };
      const waitUser = () => new Promise((resolve, reject) => { pending = { resolve, reject }; });

      const hooks = {
        signal: ctrl.signal,
        onEvent: (type, d, run) => {
          liveRun = run;
          if (type === 'step:start' || type === 'step:done' || type === 'step:error') drawTimeline();
          if (type === 'warn') toast(d.message);
        },
        llm: async (composed, info) => {
          if (cfg.provider === 'simulate') {
            await new Promise((r) => setTimeout(r, 450));
            if (info.kind === 'condition') return info.options[0] + '\n\n(simulación: se elige la primera opción)';
            return `**[Simulación] ${composed.title}**\n\nAquí iría el entregable del paso generado por ${composed.agent ? 'el agente `' + composed.agent + '`' : 'la IA'}${composed.skills.length ? ', aplicando las skills ' + composed.skills.join(', ') : ''}.`;
          }
          if (cfg.provider === 'manual') {
            const out = h('textarea', { class: 'code', rows: 10, placeholder: 'Pega aquí la respuesta de la IA…' });
            const panel = h('div', { class: 'card card-pad' },
              h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '20px' } }, info.kind === 'condition' ? '◆' : '⚙'), h('h3', { style: { margin: 0 } }, composed.title), h('div', { class: 'grow' }),
                composed.agent ? h('span', { class: 'chip' }, '🤖 ' + (S.get('agent', composed.agent) || {}).name) : null, composed.model ? h('span', { class: 'chip' }, composed.model) : null),
              h('div', { class: 'steps-guide', style: { marginTop: '8px' } },
                h('div', { class: 'card' }, h('b', null, 'Copia el prompt y pégalo en tu IA'),
                  h('div', { class: 'row wrap', style: { margin: '8px 0' } },
                    btn('Copiar prompt completo', () => copy(composed.full, 'Prompt copiado: pégalo en tu IA'), { cls: 'primary sm', icon: 'copy' }),
                    btn('Copilot M365', () => window.open('https://m365.cloud.microsoft/chat', '_blank'), { cls: 'sm', icon: 'export' }),
                    btn('GitHub Copilot', () => window.open('https://github.com/copilot', '_blank'), { cls: 'sm', icon: 'export' })),
                  promptBox(composed)),
                h('div', { class: 'card' }, h('b', null, info.kind === 'condition' ? 'Pega la respuesta o elige directamente la opción' : 'Pega la respuesta'), out,
                  info.kind === 'condition' ? h('div', { class: 'row wrap', style: { marginTop: '8px' } }, ...info.options.map((o) => btn('→ ' + o, () => pending.resolve(o), { cls: 'sm' }))) : null)),
              h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '12px' } },
                btn('Saltar paso', () => pending.resolve('(paso omitido)'), { cls: 'ghost sm' }),
                btn('Completar paso y continuar', () => { if (!out.value.trim()) { toast('Pega la respuesta (o pulsa Saltar)', 'err'); return; } pending.resolve(out.value); }, { cls: 'primary', icon: 'check' })));
            setPanel(panel);
            setTimeout(() => out.focus(), 30);
            return waitUser();
          }
          const panel = h('div', { class: 'card card-pad' }, h('div', { class: 'row' }, h('span', { class: 'spinner' }), h('b', null, composed.title), h('span', { class: 'muted small' }, ' · llamando a ' + cfg.provider + '…')), h('div', { style: { marginTop: '10px' } }, promptBox(composed)));
          setPanel(panel);
          return callLLM(cfg, composed, ctrl.signal);
        },
        human: async ({ node, context, step }) => {
          if (autoApprove && cfg.provider !== 'manual') return { approved: true, notes: 'Aprobado automáticamente' };
          const notes = h('textarea', { rows: 3, placeholder: 'Comentarios / cambios solicitados…' });
          const panel = h('div', { class: 'card card-pad', style: { borderColor: 'var(--warn)' } },
            h('div', { class: 'row', style: { marginBottom: '10px' } }, h('span', { style: { fontSize: '22px' } }, '🧑'), h('div', null, h('h3', { style: { margin: 0 } }, step.title), h('div', { class: 'muted small' }, 'Revisión humana' + (node.owner ? ' · ' + node.owner : '')))),
            node.instructions ? h('div', { class: 'callout warn', style: { marginBottom: '12px' } }, '📋', h('div', null, node.instructions)) : null,
            context ? h('div', { class: 'md card card-pad', style: { maxHeight: '420px', overflow: 'auto', marginBottom: '12px' }, html: md(context) }) : null,
            h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Comentarios'), notes),
            h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
              btn('🔁 Pedir cambios', () => { if (!notes.value.trim()) { toast('Indica qué cambiar', 'err'); notes.focus(); return; } pending.resolve({ approved: false, notes: notes.value }); }, { cls: '' }),
              btn('✅ Aprobar y continuar', () => pending.resolve({ approved: true, notes: notes.value }), { cls: 'ok' })));
          setPanel(panel);
          return waitUser();
        },
        choose: async ({ edges, answer }) => {
          const panel = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '◆ ¿Por dónde seguimos?'),
            h('div', { class: 'muted small', style: { marginBottom: '10px' } }, 'No se reconoció la opción en la respuesta. Elige la rama:'),
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
      status.append(h('span', { style: { fontSize: '20px' } }, ok ? '🎉' : run.status === 'cancelled' ? '⏹' : '⚠'), h('b', null, ok ? 'Workflow completado' : run.status === 'cancelled' ? 'Ejecución detenida' : 'Error: ' + (run.error || '')),
        h('span', { class: 'muted small' }, ` · ${run.steps.length} pasos`), h('div', { class: 'grow' }), btn('Ejecutar de nuevo', () => setup(), { cls: 'sm', icon: 'refresh' }));
      const report = C.runReport(run, wf);
      const where = await S.saveRun(run, report);
      main.innerHTML = '';
      main.append(h('div', { class: 'card card-pad' },
        h('div', { class: 'row wrap', style: { marginBottom: '12px' } }, h('h3', { style: { margin: 0 } }, '📄 Informe'), h('div', { class: 'grow' }),
          where ? h('span', { class: 'chip st-stable' }, '💾 ' + where) : h('span', { class: 'chip' }, 'Guardado en el historial del navegador'),
          btn('Copiar', () => copy(report), { cls: 'sm', icon: 'copy' }),
          btn('INFORME.md', () => download(run.id + '-INFORME.md', report), { cls: 'sm', icon: 'download' }),
          btn('run.json', () => download(run.id + '.run.json', JSON.stringify(run, null, 2), 'application/json'), { cls: 'sm', icon: 'download' })),
        h('div', { class: 'md', html: md(report) })));
    }
    return () => { if (running && ctrl) ctrl.abort(); };
  };

  function promptBox(c) {
    let mode = 'full';
    const pre = h('pre', null, c.full);
    const seg = h('div', { class: 'btn-group', style: { margin: '6px 0' } });
    [['full', 'Completo'], ['system', 'System'], ['user', 'Usuario']].forEach(([k, l]) => seg.append(h('button', { class: 'btn sm' + (k === mode ? ' on' : ''), onclick: (e) => { mode = k; pre.textContent = c[k]; Array.from(seg.children).forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); } }, l)));
    return h('div', null, seg, h('div', { class: 'prompt-box' }, pre, h('button', { class: 'btn sm copy', title: 'Copiar', onclick: () => copy(c[mode]) }, icon('copy', 13))));
  }

  /* ======================================================== *
   * Historial de ejecuciones
   * ======================================================== */
  V.runs = function (root) {
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '▶ Ejecuciones'), h('p', null, 'Lanza workflows de principio a fin y consulta el historial. Con la carpeta conectada, cada ejecución se guarda en runs/<id>/ (run.json + INFORME.md).'))));
    const wfs = S.all('workflow');
    page.append(h('div', { class: 'section-title' }, '🚀 Lanzar'), wfs.length ? h('div', { class: 'grid cols-auto' }, ...wfs.map((w) => h('div', { class: 'card item-card', style: { '--tc': 'var(--c-workflow)' } },
      h('div', { class: 'ic-head' }, h('div', { class: 'ic-emoji' }, w.icon || '🔀'), h('div', { class: 'grow' }, h('div', { class: 'ic-title' }, w.name), h('div', { class: 'ic-id' }, w.nodes.filter((n) => n.type !== 'note').length + ' nodos'))),
      h('div', { class: 'ic-desc' }, w.description),
      h('div', { class: 'ic-foot' }, btn('Ejecutar', () => go('#/run/' + encodeURIComponent(w.id)), { cls: 'sm ok', icon: 'play' }), btn('Editar', () => go('#/workflow/' + encodeURIComponent(w.id)), { cls: 'sm ghost', icon: 'edit' }))))) : h('div', { class: 'card empty' }, 'No hay workflows todavía.'));
    const hist = h('div', { class: 'card' }, h('div', { class: 'empty' }, 'Cargando…'));
    page.append(h('div', { class: 'section-title' }, '🕘 Historial ', h('span', { class: 'muted small' }, '(en este navegador)')), hist);
    root.append(page);
    S.idb.runs().then((runs) => {
      runs = (runs || []).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
      hist.innerHTML = '';
      if (!runs.length) { hist.append(h('div', { class: 'empty' }, h('div', { class: 'e-ico' }, '🗒'), 'Aún no hay ejecuciones.')); return; }
      hist.append(h('table', { class: 'list-table' }, h('thead', null, h('tr', null, h('th', null, 'Workflow'), h('th', null, 'Estado'), h('th', null, 'Pasos'), h('th', null, 'Cuándo'), h('th', null, ''))),
        h('tbody', null, ...runs.map((r) => h('tr', { onclick: () => showRun(r) },
          h('td', null, h('b', null, r.workflowName)), h('td', null, h('span', { class: 'chip ' + (r.status === 'completed' ? 'st-stable' : r.status === 'error' ? 'st-deprecated' : 'st-draft') }, r.status)),
          h('td', null, r.steps.length), h('td', { class: 'muted small' }, timeAgo(r.startedAt)),
          h('td', null, h('button', { class: 'btn ghost icon sm', title: 'Borrar del historial', onclick: async (e) => { e.stopPropagation(); if (await confirmDialog('¿Borrar esta ejecución del historial del navegador?')) { await S.idb.delRun(r.id); AIC.app.route(); } } }, icon('trash', 14))))))));
    });
  };
  function showRun(r) {
    const wf = S.get('workflow', r.workflow);
    const report = C.runReport(r, wf);
    modal({
      title: r.workflowName, titleIcon: '📄', size: 'wide', body: h('div', { class: 'md', html: md(report) }),
      foot: (close) => [btn('Descargar INFORME.md', () => download(r.id + '-INFORME.md', report), { icon: 'download' }), btn('Copiar', () => copy(report), { icon: 'copy' }), btn('Cerrar', () => close(), { cls: 'primary' })]
    });
  }
})();
