/* AI Center · views-workflow.js — visual workflow builder (drag & drop) */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, toast, modal, copy, menu, confirmDialog, typeColor, download } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});
  const go = (x) => AIC.app.go(x);

  const NODE_W = { start: 160, end: 160, note: 220 };
  const nodeW = (n) => NODE_W[n.type] || 230;
  const ATTACHABLE = { step: ['agent', 'prompt', 'skill', 'knowledge', 'mcp'], condition: ['agent', 'skill', 'knowledge'], end: ['agent', 'skill', 'knowledge'], human: [], start: [], note: [] };

  V.workflow = function (root, id) {
    const existing = id && id !== 'new' ? S.get('workflow', id) : null;
    if (id && id !== 'new' && !existing) {
      root.append(h('div', { class: 'page' }, h('div', { class: 'card empty' }, h('div', { class: 'e-ico' }, '🔎'), 'Workflow not found: ', h('code', null, id), h('div', { style: { marginTop: '10px' } }, btn('View workflows', () => go('#/library/workflow'))))));
      return;
    }
    if (!existing && !V._wfSeed) { newWorkflowDialog(root); return; }
    let wf = existing ? C.clone(existing) : V._wfSeed;
    V._wfSeed = null;
    C.normalizeItem(wf);
    const prevKey = existing ? S.keyOf(existing) : null;
    let dirty = !existing;
    let sel = null; // {kind:'node'|'edge', id}
    const view = { x: 40, y: 40, k: 1 };
    const undo = []; const redo = [];
    const dims = {};
    let runState = null;

    /* ---------- state helpers ---------- */
    const snap = () => JSON.stringify({ nodes: wf.nodes, edges: wf.edges, inputs: wf.inputs });
    const commit = () => { undo.push(snap()); if (undo.length > 80) undo.shift(); redo.length = 0; markDirty(); };
    const restore = (s) => { const o = JSON.parse(s); wf.nodes = o.nodes; wf.edges = o.edges; wf.inputs = o.inputs; sel = null; render(); inspector(); markDirty(); };
    const doUndo = () => { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); };
    const doRedo = () => { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); };
    const node = (nid) => wf.nodes.find((n) => n.id === nid);
    const libWith = () => ({ config: S.lib.config, items: [...S.lib.items.filter((i) => !(i.type === 'workflow' && i.id === wf.id)), wf] });
    const newId = (p) => { let i = wf.nodes.length + 1; let nid; do { nid = (p || 'n') + i++; } while (node(nid)); return nid; };
    function markDirty() {
      dirty = true;
      if (saveBtn) { saveBtn.classList.add('primary'); saveBtn.querySelector('span:last-child').textContent = 'Save'; }
      updIssues();
    }

    /* ---------- top bar ---------- */
    const nameIn = h('input', { type: 'text', class: 'wf-name', value: wf.name, oninput: (e) => { wf.name = e.target.value; markDirty(); } });
    const saveBtn = btn(existing ? 'Saved' : 'Save', () => save(), { icon: 'save', cls: existing ? '' : 'primary', title: 'Save (⌘/Ctrl+S)' });
    const issuesBtn = h('button', { class: 'btn sm', onclick: () => showIssues() });
    const exportBtn = h('button', { class: 'btn sm', onclick: () => menu(exportBtn, [
      { icon: '🐙', label: 'Runbook for GitHub Copilot', desc: 'Prompt file /wf-' + (wf.id || '…') + ' (agent mode, E2E)', onClick: () => runbookModal('copilot') },
      { icon: '🟣', label: 'Runbook for Claude Code', desc: '.claude/commands/wf-*.md', onClick: () => runbookModal('claude') },
      { icon: '🟦', label: 'Guide for Copilot M365', desc: 'Step-by-step prompts to copy and paste', onClick: () => runbookModal('m365') },
      { icon: '🌐', label: 'Generic runbook (any agent)', onClick: () => runbookModal('generic') },
      '-',
      { icon: '🧜', label: 'Copy Mermaid diagram', onClick: () => copy(C.mermaid(libWith(), wf)) },
      { icon: 'download', label: 'Download .workflow.json', onClick: () => download((wf.id || 'workflow') + '.workflow.json', C.itemToFile(wf).content, 'application/json') },
      { icon: '⌨️', label: 'CLI command to run it', desc: 'node cli/aic.mjs run …', onClick: () => cliModal() }
    ], { align: 'right' }) }, icon('export', 14), h('span', null, 'Export'), icon('chevron', 12));
    const top = h('div', { class: 'wf-topbar' },
      h('button', { class: 'btn ghost sm icon', title: 'Show/hide side menu', onclick: () => document.getElementById('shell').classList.toggle('focus') }, icon('menu', 15)),
      h('a', { href: '#/library/workflow', class: 'btn ghost sm' }, '←'),
      h('span', { style: { fontSize: '20px' } }, wf.icon || '🔀'),
      nameIn,
      h('span', { class: 'chip st-' + wf.status }, (C.STATUS.find((s) => s.value === wf.status) || {}).label),
      h('div', { class: 'grow' }),
      h('button', { class: 'btn sm ghost icon', title: 'Undo (⌘Z)', onclick: doUndo }, icon('undo', 15)),
      h('button', { class: 'btn sm ghost icon', title: 'Redo (⇧⌘Z)', onclick: doRedo }, icon('redo', 15)),
      btn('Arrange', () => { commit(); C.autoLayout(wf); render(); fit(); }, { cls: 'sm', icon: 'layout', title: 'Automatic layout' }),
      issuesBtn, exportBtn,
      btn('Run', () => runIt(), { cls: 'sm ok', icon: 'play', title: 'Run the workflow step by step' }),
      saveBtn);

    /* ---------- palette ---------- */
    const palSearch = h('input', { type: 'search', placeholder: 'Search pieces…', oninput: () => drawPalette() });
    const palBody = h('div', { class: 'ws-body' });
    const collapsed = new Set();
    function palItem(payload, ico, name, color, title) {
      const el = h('div', { class: 'pal-item', draggable: 'true', title: title || 'Drag it onto the canvas or click to add it after the selected node', style: { '--tc': color } },
        h('span', null, ico), h('span', { class: 'pi-name' }, name));
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('application/x-aic', JSON.stringify(payload)); e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'copy'; });
      el.addEventListener('click', () => addAfterSelection(payload));
      return el;
    }
    function drawPalette() {
      const q = C.norm(palSearch.value);
      palBody.innerHTML = '';
      const group = (key, title, items) => {
        if (!items.length) return;
        const g = h('div', { class: 'pal-group' }, h('div', { class: 'pg-title', onclick: () => { collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key); drawPalette(); } }, collapsed.has(key) ? '▸' : '▾', ' ', title, h('span', { class: 'muted', style: { marginLeft: 'auto' } }, items.length)));
        if (!collapsed.has(key) || q) items.forEach((x) => g.append(x));
        palBody.append(g);
      };
      const ctrl = ['step', 'human', 'condition', 'end', 'start', 'note'].filter((t) => !q || C.norm(C.NODE_TYPES[t].label).includes(q))
        .map((t) => palItem({ kind: 'control', type: t }, C.NODE_TYPES[t].icon, C.NODE_TYPES[t].label, t === 'human' ? 'var(--warn)' : t === 'condition' ? 'var(--info)' : 'var(--border-strong)', C.NODE_TYPES[t].help));
      group('control', 'Flow control', ctrl);
      ['agent', 'prompt', 'skill', 'knowledge', 'mcp'].forEach((t) => {
        const items = S.all(t).filter((it) => !q || C.norm(it.name + ' ' + it.description + ' ' + it.tags.join(' ')).includes(q))
          .map((it) => palItem({ kind: 'item', type: t, id: it.id }, it.icon || C.TYPES[t].icon, it.name, typeColor(t), it.description));
        group(t, C.TYPES[t].label, items);
      });
      if (!palBody.children.length) palBody.append(h('div', { class: 'muted small', style: { padding: '10px' } }, 'No results'));
    }
    const palette = h('div', { class: 'wf-side' }, h('div', { class: 'ws-head' }, palSearch, h('div', { class: 'muted small', style: { marginTop: '6px' } }, 'Drag pieces onto the canvas or drop them on a step to attach them.')), palBody);

    /* ---------- canvas ---------- */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'edges'); svg.setAttribute('width', '16000'); svg.setAttribute('height', '16000');
    svg.setAttribute('viewBox', '-6000 -6000 16000 16000');
    svg.style.left = '-6000px'; svg.style.top = '-6000px';
    const canvas = h('div', { class: 'canvas' }, svg);
    const hint = h('div', { class: 'canvas-hint' }, 'Drag from the ● dots to connect · wheel/drag to pan · ⌘+wheel to zoom');
    const minimap = h('div', { class: 'minimap', title: 'Minimap (click to center)' });
    const zoomLbl = h('span', { class: 'btn sm', style: { pointerEvents: 'none', minWidth: '52px', justifyContent: 'center' } }, '100%');
    const wrap = h('div', { class: 'canvas-wrap' }, canvas, hint,
      h('div', { class: 'canvas-tools' },
        h('button', { class: 'btn sm icon', title: 'Zoom out', onclick: () => zoomAt(0.85) }, icon('zoomOut', 15)), zoomLbl,
        h('button', { class: 'btn sm icon', title: 'Zoom in', onclick: () => zoomAt(1.18) }, icon('zoomIn', 15)),
        h('button', { class: 'btn sm icon', title: 'Fit to view', onclick: () => fit() }, icon('fit', 15))),
      minimap);
    const applyView = () => { canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`; zoomLbl.textContent = Math.round(view.k * 100) + '%'; drawMinimap(); };
    const toCanvas = (cx, cy) => { const r = wrap.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k }; };
    function zoomAt(f, cx, cy) {
      const r = wrap.getBoundingClientRect();
      if (cx === undefined) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
      const p = toCanvas(cx, cy);
      view.k = Math.max(0.25, Math.min(2, view.k * f));
      view.x = cx - r.left - p.x * view.k; view.y = cy - r.top - p.y * view.k;
      applyView();
    }
    function fit(initial) {
      const ns = wf.nodes; if (!ns.length) return;
      const r = wrap.getBoundingClientRect();
      if (!r.width) return;
      const minX = Math.min(...ns.map((n) => n.x)); const minY = Math.min(...ns.map((n) => n.y));
      const maxX = Math.max(...ns.map((n) => n.x + nodeW(n))); const maxY = Math.max(...ns.map((n) => n.y + (dims[n.id] ? dims[n.id].h : 80)));
      const fitK = Math.min((r.width - 120) / (maxX - minX || 1), (r.height - 140) / (maxY - minY || 1));
      const k = Math.max(initial ? 0.6 : 0.25, Math.min(1.1, fitK));
      view.k = k;
      view.x = fitK < k ? 40 - minX * k : (r.width - (maxX - minX) * k) / 2 - minX * k;
      view.y = (r.height - Math.min(maxY - minY, (r.height - 80) / k) * k) / 2 - minY * k + 10;
      applyView();
    }

    /* ---------- node rendering ---------- */
    let issuesByNode = {};
    function nodeEl(n) {
      const t = C.NODE_TYPES[n.type] || C.NODE_TYPES.step;
      const r = C.resolveNode(S.lib, n);
      const el = h('div', { class: `node t-${n.type}${sel && sel.kind === 'node' && sel.id === n.id ? ' sel' : ''}`, dataset: { id: n.id }, style: { left: n.x + 'px', top: n.y + 'px', width: nodeW(n) + 'px' } });
      if (runState && runState[n.id]) { el.classList.add('run-' + runState[n.id]); el.append(h('span', { class: 'n-status' }, { done: '✓ done', running: '… running', error: '✕ error' }[runState[n.id]] || '')); }
      if (n.type === 'note') { el.append(h('div', { class: 'n-text' }, n.text || n.title || 'Note')); return el; }
      const icoBg = n.type === 'step' && r.agent ? { background: `color-mix(in srgb, ${typeColor('agent')} 16%, transparent)` } : null;
      el.append(h('div', { class: 'n-head' },
        h('div', { class: 'n-ico', style: icoBg }, n.type === 'step' ? (r.agent ? (r.agent.icon || '🤖') : r.prompt ? (r.prompt.icon || '💬') : '⚙') : t.icon),
        h('div', { class: 'grow' }, h('div', { class: 'n-kind' }, t.label), h('div', { class: 'n-title' }, n.title || C.nodeLabel(S.lib, n)))));
      const chips = [];
      if (n.type !== 'step' && r.agent) chips.push(h('span', { class: 'chip', title: 'Agent' }, (r.agent.icon || '🤖') + ' ' + r.agent.name));
      if (n.type === 'step' && r.agent && r.prompt) chips.push(h('span', { class: 'chip', title: 'Prompt' }, (r.prompt.icon || '💬') + ' ' + r.prompt.name));
      if (n.type === 'step' && r.agent && !r.prompt && n.title && n.title !== r.agent.name) chips.push(h('span', { class: 'chip', title: 'Agent' }, (r.agent.icon || '🤖') + ' ' + r.agent.name));
      if (n.type === 'step' && !r.agent && r.prompt && n.title && n.title !== r.prompt.name) chips.push(h('span', { class: 'chip', title: 'Prompt' }, (r.prompt.icon || '💬') + ' ' + r.prompt.name));
      C.arr(n.skills).forEach((s) => { const it = S.get('skill', s); chips.push(h('span', { class: 'chip', style: { borderColor: typeColor('skill') }, title: 'Skill' }, '🧩 ' + (it ? it.name : s + ' ⚠'))); });
      C.arr(n.knowledge).forEach((s) => { const it = S.get('knowledge', s); chips.push(h('span', { class: 'chip', style: { borderColor: typeColor('knowledge') }, title: 'Knowledge' }, '📚 ' + (it ? it.name : s + ' ⚠'))); });
      C.arr(n.mcp).forEach((s) => { const it = S.get('mcp', s); chips.push(h('span', { class: 'chip', style: { borderColor: typeColor('mcp') }, title: 'MCP' }, '🔌 ' + (it ? it.name : s + ' ⚠'))); });
      if (n.type === 'condition' && n.question) chips.push(h('span', { class: 'chip', title: n.question }, '❓ ' + n.question.slice(0, 40)));
      if (n.type === 'human') chips.push(h('span', { class: 'chip' }, '⏸ awaits approval'));
      if (n.outputKey) chips.push(h('span', { class: 'chip accent mono', title: 'Output name' }, '→ {{' + n.outputKey + '}}'));
      if (C.arr(n.files).length) chips.push(h('span', { class: 'chip mono', title: C.arr(n.files).join('\n') }, '📄 ' + (C.arr(n.files).length === 1 ? C.arr(n.files)[0] : C.arr(n.files).length + ' files')));
      if (n.type === 'step' && !n.agent && !n.prompt && !n.instructions) chips.push(h('span', { class: 'chip', style: { borderStyle: 'dashed' } }, 'Drop an agent or prompt here'));
      if (chips.length) el.append(h('div', { class: 'n-body' }, ...chips));
      if (n.type !== 'start') el.append(h('div', { class: 'port in', title: 'Input' }));
      if (n.type !== 'end') el.append(h('div', { class: 'port out', title: 'Drag to connect' }));
      if (issuesByNode[n.id]) el.append(h('span', { class: 'n-issue', title: issuesByNode[n.id].join('\n') }, '!'));
      return el;
    }
    function render() {
      Array.from(canvas.querySelectorAll('.node')).forEach((e) => e.remove());
      wf.nodes.forEach((n) => canvas.append(nodeEl(n)));
      Array.from(canvas.querySelectorAll('.node')).forEach((e) => { if (e.offsetWidth) dims[e.dataset.id] = { w: e.offsetWidth, h: e.offsetHeight }; });
      renderEdges();
      drawMinimap();
    }
    const SVGNS = 'http://www.w3.org/2000/svg';
    const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k])); return e; };
    function portPos(n, side) {
      const d = dims[n.id] || { w: nodeW(n), h: 70 };
      return side === 'out' ? { x: n.x + d.w, y: n.y + d.h / 2 } : { x: n.x, y: n.y + d.h / 2 };
    }
    function curve(a, b) {
      const dx = Math.max(50, Math.abs(b.x - a.x) / 2);
      if (b.x < a.x + 20) {
        const dy = Math.max(60, Math.abs(b.y - a.y) / 2 + 60);
        const yMid = Math.max(a.y, b.y) + dy;
        return `M${a.x},${a.y} C${a.x + 80},${a.y} ${a.x + 80},${yMid} ${(a.x + b.x) / 2},${yMid} S${b.x - 80},${b.y} ${b.x},${b.y}`;
      }
      return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
    }
    function renderEdges(ghost) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const defs = sv('defs');
      const mk = (idm, color) => { const m = sv('marker', { id: idm, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }); m.appendChild(sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: color })); defs.appendChild(m); };
      mk('arr', 'var(--border-strong)'); mk('arr-sel', 'var(--accent)');
      svg.appendChild(defs);
      const back = C.backEdges(wf);
      wf.edges.forEach((e) => {
        const a = node(e.from); const b = node(e.to);
        if (!a || !b) return;
        const p1 = portPos(a, 'out'); const p2 = portPos(b, 'in');
        const d = curve(p1, p2);
        const isSel = sel && sel.kind === 'edge' && sel.id === e.id;
        const active = runState && runState[e.from] === 'done' && runState[e.to];
        const hit = sv('path', { d, class: 'edge-hit' });
        hit.addEventListener('mousedown', (ev) => { ev.stopPropagation(); select({ kind: 'edge', id: e.id }); });
        hit.addEventListener('dblclick', (ev) => { ev.stopPropagation(); editEdgeLabel(e); });
        svg.appendChild(hit);
        svg.appendChild(sv('path', { d, class: 'edge' + (isSel ? ' sel' : '') + (back.has(e.id) ? ' back' : '') + (active ? ' active' : ''), 'marker-end': `url(#${isSel ? 'arr-sel' : 'arr'})` }));
        if (e.label) {
          const tmp = sv('path', { d }); svg.appendChild(tmp);
          let mid;
          try { const L = tmp.getTotalLength(); mid = tmp.getPointAtLength(L / 2); } catch (er) { mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; }
          svg.removeChild(tmp);
          const g = sv('g', { class: 'elabel' });
          const w = Math.max(30, e.label.length * 6.6 + 16);
          g.appendChild(sv('rect', { x: mid.x - w / 2, y: mid.y - 11, width: w, height: 22, rx: 11, style: isSel ? 'stroke: var(--accent)' : '' }));
          const tx = sv('text', { x: mid.x, y: mid.y + 4, 'text-anchor': 'middle' }); tx.textContent = e.label; g.appendChild(tx);
          g.addEventListener('mousedown', (ev) => { ev.stopPropagation(); select({ kind: 'edge', id: e.id }); });
          g.addEventListener('dblclick', (ev) => { ev.stopPropagation(); editEdgeLabel(e); });
          svg.appendChild(g);
        }
      });
      if (ghost) svg.appendChild(sv('path', { d: curve(ghost.a, ghost.b), class: 'ghost' }));
    }
    function drawMinimap() {
      if (!wf.nodes.length) { minimap.innerHTML = ''; return; }
      const ns = wf.nodes;
      const minX = Math.min(...ns.map((n) => n.x)) - 40; const minY = Math.min(...ns.map((n) => n.y)) - 40;
      const maxX = Math.max(...ns.map((n) => n.x + nodeW(n))) + 40; const maxY = Math.max(...ns.map((n) => n.y + 90)) + 40;
      const W = 180; const H = 110; const s = Math.min(W / (maxX - minX), H / (maxY - minY));
      const r = wrap.getBoundingClientRect();
      const vx = (-view.x / view.k - minX) * s; const vy = (-view.y / view.k - minY) * s;
      const vw = (r.width / view.k) * s; const vh = (r.height / view.k) * s;
      minimap.innerHTML = `<svg width="${W}" height="${H}">${ns.map((n) => `<rect x="${(n.x - minX) * s}" y="${(n.y - minY) * s}" width="${nodeW(n) * s}" height="${Math.max(4, ((dims[n.id] || {}).h || 70) * s)}" rx="2" fill="${n.type === 'human' ? 'var(--warn)' : n.type === 'condition' ? 'var(--info)' : n.type === 'start' ? 'var(--ok)' : n.type === 'end' ? 'var(--err)' : 'var(--accent)'}" opacity=".6"/>`).join('')}<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="none" stroke="var(--text-3)" stroke-width="1.2" rx="3"/></svg>`;
      minimap.onclick = (e) => {
        const mr = minimap.getBoundingClientRect();
        const cx = (e.clientX - mr.left) / s + minX; const cy = (e.clientY - mr.top) / s + minY;
        view.x = r.width / 2 - cx * view.k; view.y = r.height / 2 - cy * view.k; applyView();
      };
    }

    /* ---------- interaction ---------- */
    let drag = null;
    wrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const port = e.target.closest('.port');
      const nEl = e.target.closest('.node');
      if (port && port.classList.contains('out')) {
        e.preventDefault();
        const n = node(nEl.dataset.id);
        drag = { mode: 'connect', from: n, a: portPos(n, 'out') };
        return;
      }
      if (nEl) {
        e.preventDefault();
        const n = node(nEl.dataset.id);
        if (!sel || sel.id !== n.id) select({ kind: 'node', id: n.id }, true);
        const p = toCanvas(e.clientX, e.clientY);
        drag = { mode: 'node', n, el: canvas.querySelector(`.node[data-id="${CSS.escape(n.id)}"]`), dx: p.x - n.x, dy: p.y - n.y, moved: false, before: snap() };
        return;
      }
      if (e.target.closest('.canvas-tools') || e.target.closest('.minimap')) return;
      drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      wrap.classList.add('panning');
    });
    const onMove = (e) => {
      if (!drag) return;
      if (drag.mode === 'pan') {
        view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy;
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 3) drag.moved = true;
        applyView();
      } else if (drag.mode === 'node') {
        const p = toCanvas(e.clientX, e.clientY);
        const nx = Math.round((p.x - drag.dx) / 10) * 10; const ny = Math.round((p.y - drag.dy) / 10) * 10;
        if (nx !== drag.n.x || ny !== drag.n.y) {
          drag.n.x = nx; drag.n.y = ny; drag.moved = true;
          drag.el.style.left = nx + 'px'; drag.el.style.top = ny + 'px'; drag.el.classList.add('dragging');
          renderEdges();
        }
      } else if (drag.mode === 'connect') {
        const p = toCanvas(e.clientX, e.clientY);
        renderEdges({ a: drag.a, b: p });
        canvas.querySelectorAll('.node.drop-target').forEach((x) => x.classList.remove('drop-target'));
        const t = document.elementFromPoint(e.clientX, e.clientY);
        const tn = t && t.closest && t.closest('.node');
        if (tn && tn.dataset.id !== drag.from.id) tn.classList.add('drop-target');
      }
    };
    const onUp = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      wrap.classList.remove('panning');
      if (d.mode === 'pan' && !d.moved) select(null);
      if (d.mode === 'node') {
        if (d.el) d.el.classList.remove('dragging');
        if (d.moved) { undo.push(d.before); redo.length = 0; markDirty(); drawMinimap(); }
      }
      if (d.mode === 'connect') {
        canvas.querySelectorAll('.node.drop-target').forEach((x) => x.classList.remove('drop-target'));
        const t = document.elementFromPoint(e.clientX, e.clientY);
        const tn = t && t.closest && t.closest('.node');
        if (tn && tn.dataset.id !== d.from.id) {
          const to = node(tn.dataset.id);
          if (to.type === 'start' || to.type === 'note') toast('Cannot connect to that node', 'err');
          else if (wf.edges.some((x) => x.from === d.from.id && x.to === to.id)) toast('Already connected');
          else {
            commit();
            const edge = { id: C.uid('e'), from: d.from.id, to: to.id };
            if (d.from.type === 'condition') edge.label = suggestLabel(d.from);
            if (d.from.type === 'human' && wf.edges.some((x) => x.from === d.from.id)) edge.label = 'changes';
            wf.edges.push(edge);
            select({ kind: 'edge', id: edge.id });
          }
        }
        renderEdges();
      }
    };
    function suggestLabel(n) {
      const used = wf.edges.filter((e) => e.from === n.id).map((e) => C.norm(e.label));
      return ['yes', 'no', 'other'].find((l) => !used.includes(C.norm(l))) || '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
      else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
    }, { passive: false });
    wrap.addEventListener('dblclick', (e) => {
      const nEl = e.target.closest('.node');
      if (nEl) { const ti = inspectorEl.querySelector('input[data-k="title"], textarea[data-k="text"]'); if (ti) { ti.focus(); ti.select(); } return; }
      if (e.target.closest('.canvas-tools,.minimap')) return;
      const p = toCanvas(e.clientX, e.clientY);
      quickAdd(e.clientX, e.clientY, p);
    });
    // drop from the palette
    wrap.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer.types).includes('application/x-aic')) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      wrap.classList.add('drop-hover');
      canvas.querySelectorAll('.node.drop-target').forEach((x) => x.classList.remove('drop-target'));
      const tn = e.target.closest && e.target.closest('.node'); if (tn) tn.classList.add('drop-target');
    });
    wrap.addEventListener('dragleave', (e) => { if (!wrap.contains(e.relatedTarget)) { wrap.classList.remove('drop-hover'); canvas.querySelectorAll('.node.drop-target').forEach((x) => x.classList.remove('drop-target')); } });
    wrap.addEventListener('drop', (e) => {
      e.preventDefault(); wrap.classList.remove('drop-hover');
      canvas.querySelectorAll('.node.drop-target').forEach((x) => x.classList.remove('drop-target'));
      let payload; try { payload = JSON.parse(e.dataTransfer.getData('application/x-aic')); } catch (er) { return; }
      const tn = e.target.closest && e.target.closest('.node');
      const p = toCanvas(e.clientX, e.clientY);
      if (tn && payload.kind === 'item') { if (attach(node(tn.dataset.id), payload)) return; }
      const n = createNode(payload, p.x - 100, p.y - 30);
      if (n) select({ kind: 'node', id: n.id });
    });

    function attach(n, payload) {
      const allowed = ATTACHABLE[n.type] || [];
      if (!allowed.includes(payload.type)) { toast(`Cannot attach a ${C.TYPES[payload.type].singular.toLowerCase()} to «${C.NODE_TYPES[n.type].label}»; a new step is created`); return false; }
      const it = S.get(payload.type, payload.id);
      commit();
      if (payload.type === 'agent') { n.agent = payload.id; toast(`Agent «${it.name}» assigned`); }
      else if (payload.type === 'prompt') { n.prompt = payload.id; if (!n.agent && it.agent) n.agent = it.agent; toast(`Prompt «${it.name}» assigned`); }
      else {
        const key = payload.type === 'skill' ? 'skills' : payload.type;
        n[key] = C.uniq([...C.arr(n[key]), payload.id]);
        toast(`${C.TYPES[payload.type].singular} «${it.name}» added`);
      }
      render(); select({ kind: 'node', id: n.id });
      return true;
    }
    function createNode(payload, x, y) {
      let n;
      if (payload.kind === 'control') {
        n = { id: newId(payload.type === 'start' ? 'start' : payload.type === 'end' ? 'end' : 'n'), type: payload.type, title: payload.type === 'note' ? '' : C.NODE_TYPES[payload.type].label, x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 };
        if (payload.type === 'note') n.text = 'Write a note…';
        if (payload.type === 'step') n.title = 'New step';
        if (payload.type === 'human') n.instructions = 'Review the previous result. Approve to continue or request changes.';
        if (payload.type === 'condition') n.question = '…?';
      } else {
        const it = S.get(payload.type, payload.id);
        if (!it) return null;
        n = { id: newId('n'), type: 'step', title: it.name, x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 };
        if (payload.type === 'agent') n.agent = it.id;
        else if (payload.type === 'prompt') { n.prompt = it.id; if (it.agent) n.agent = it.agent; }
        else if (payload.type === 'skill') n.skills = [it.id];
        else n[payload.type] = [it.id];
      }
      commit();
      wf.nodes.push(n);
      render();
      return n;
    }
    function addAfterSelection(payload) {
      const s = sel && sel.kind === 'node' ? node(sel.id) : null;
      if (s && payload.kind === 'item' && (ATTACHABLE[s.type] || []).includes(payload.type) && ['skill', 'knowledge', 'mcp'].includes(payload.type)) { attach(s, payload); return; }
      const base = s || wf.nodes.filter((n) => n.type !== 'note' && n.type !== 'end').sort((a, b) => b.x - a.x)[0];
      const x = base ? base.x + (dims[base.id] ? dims[base.id].w : 230) + 70 : 100;
      const y = base ? base.y : 120;
      const end = wf.nodes.find((n) => n.type === 'end');
      const n = createNode(payload, x, y);
      if (!n) return;
      if (base && base.type !== 'end' && n.type !== 'note' && n.type !== 'start') {
        // createNode already stored the previous state in history: a single undo reverts node + connections
        const out = wf.edges.filter((e) => e.from === base.id);
        if (out.length === 1 && base.type !== 'condition') {
          const nx = out[0].to; out[0].to = n.id;
          if (n.type !== 'end') wf.edges.push({ id: C.uid('e'), from: n.id, to: nx });
          const shift = (dims[n.id] ? dims[n.id].w : 230) + 70;
          const after = C.reachable(wf, [nx], true);
          wf.nodes.forEach((m) => { if (after.has(m.id) && m.id !== n.id && m.x >= n.x) m.x += shift; });
        } else wf.edges.push({ id: C.uid('e'), from: base.id, to: n.id, label: base.type === 'condition' ? suggestLabel(base) : undefined });
        render();
      }
      select({ kind: 'node', id: n.id });
    }
    function quickAdd(cx, cy, p) {
      const anchor = h('div', { style: { position: 'fixed', left: cx + 'px', top: cy + 'px', width: '1px', height: '1px' } });
      document.body.append(anchor);
      menu(anchor, ['step', 'human', 'condition', 'end', 'note'].map((t) => ({ icon: C.NODE_TYPES[t].icon, label: C.NODE_TYPES[t].label, desc: C.NODE_TYPES[t].help, onClick: () => { const n = createNode({ kind: 'control', type: t }, p.x - 100, p.y - 30); if (n) select({ kind: 'node', id: n.id }); } })));
      setTimeout(() => anchor.remove(), 100);
    }
    function select(s, noRender) {
      sel = s;
      canvas.querySelectorAll('.node').forEach((el) => el.classList.toggle('sel', !!(s && s.kind === 'node' && el.dataset.id === s.id)));
      renderEdges();
      inspector();
      void noRender;
    }
    function deleteSel() {
      if (!sel) return;
      commit();
      if (sel.kind === 'node') { wf.nodes = wf.nodes.filter((n) => n.id !== sel.id); wf.edges = wf.edges.filter((e) => e.from !== sel.id && e.to !== sel.id); }
      else wf.edges = wf.edges.filter((e) => e.id !== sel.id);
      sel = null; render(); inspector();
    }
    function duplicateSel() {
      if (!sel || sel.kind !== 'node') return;
      const n = node(sel.id); if (!n || n.type === 'start') return;
      commit();
      const c = C.clone(n); c.id = newId('n'); c.x += 30; c.y += 40; if (c.outputKey) c.outputKey += '2';
      wf.nodes.push(c); render(); select({ kind: 'node', id: c.id });
    }
    async function editEdgeLabel(e) {
      const v = await AIC.promptDialog('Connection label', e.label || '', { help: 'In decisions it is the option (e.g. «yes», «no»). In human reviews, «changes» marks the rejection path.' });
      if (v === null) return;
      commit(); e.label = v.trim() || undefined; renderEdges(); inspector();
    }

    /* ---------- inspector ---------- */
    const inspectorEl = h('div', { class: 'ws-body' });
    const inspHead = h('div', { class: 'ws-head', style: { fontWeight: 700 } });
    const rightPanel = h('div', { class: 'wf-side right' }, inspHead, inspectorEl);
    const fld = (labelText, el, help) => h('div', { class: 'field' }, h('div', { class: 'lbl' }, labelText), el, help ? h('div', { class: 'help' }, help) : null);
    const txt = (obj, key, opts) => {
      opts = opts || {};
      let before = null;
      const el = h(opts.area ? 'textarea' : 'input', { type: 'text', rows: opts.rows || 4, value: obj[key] || '', placeholder: opts.placeholder || '', 'data-k': key, class: opts.mono ? 'mono' : '',
        onfocus: () => { before = snap(); },
        oninput: (e) => { obj[key] = e.target.value; if (opts.slug) obj[key] = obj[key].replace(/[^\w-]/g, '_'); if (opts.live !== false) refreshNode(); markDirty(); },
        onchange: () => { if (before) { undo.push(before); redo.length = 0; before = null; } } });
      return el;
    };
    function refreshNode() {
      if (!sel || sel.kind !== 'node') return;
      const n = node(sel.id); const old = canvas.querySelector(`.node[data-id="${CSS.escape(n.id)}"]`);
      if (!old) return;
      const fresh = nodeEl(n); old.replaceWith(fresh);
      if (fresh.offsetWidth) dims[n.id] = { w: fresh.offsetWidth, h: fresh.offsetHeight };
      renderEdges();
    }
    function tokensHelp(n, target) {
      const toks = [...wf.inputs.map((i) => ({ t: i.name, d: 'input: ' + (i.label || i.name) })),
        ...wf.nodes.filter((m) => m.outputKey && m.id !== n.id).map((m) => ({ t: m.outputKey, d: 'output of «' + (m.title || m.id) + '»' })),
        { t: 'prev', d: 'output of the previous step' }];
      return h('div', { class: 'chips', style: { marginTop: '6px' } }, h('span', { class: 'small muted' }, 'Insert:'), ...toks.map((x) => h('span', { class: 'chip accent mono', style: { cursor: 'pointer' }, title: x.d, onclick: () => {
        const ta = target(); if (!ta) return; ta.focus(); ta.setRangeText('{{' + x.t + '}}', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input'));
      } }, '{{' + x.t + '}}')));
    }
    function filesField(n) {
      const w = V.tagInput(C.arr(n.files), (v) => { commit(); n.files = v.length ? v : undefined; refreshNode(); }, { list: true, placeholder: 'docs/{{name}}.md and press Enter' });
      return fld('📄 Output files', w, 'Files this step must produce (relative paths, {{variables}} allowed). The AI returns each one in a `file=<path>` block; runs save them to runs/<run>/files/ and agents write them into the repo.');
    }
    function attachRow(type, idv, onRemove) {
      const it = S.get(type, idv);
      return h('div', { class: 'attach-row', style: { borderLeft: `3px solid ${typeColor(type)}` } },
        h('span', null, (it && it.icon) || C.TYPES[type].icon), h('span', { class: 'grow', title: it ? it.description : 'Does not exist' }, it ? it.name : idv + ' ⚠'),
        it ? h('a', { href: '#', class: 'muted', title: 'Open', onclick: (e) => { e.preventDefault(); AIC.app.openItem(it); } }, icon('export', 13)) : null,
        h('button', { class: 'btn ghost icon sm', title: 'Remove', onclick: onRemove }, icon('x', 13)));
    }
    function refSelect(type, value, onChange) {
      return h('select', { onchange: (e) => onChange(e.target.value) }, h('option', { value: '' }, '— None —'),
        ...S.all(type).map((it) => h('option', { value: it.id, selected: it.id === value }, (it.icon || C.TYPES[type].icon) + ' ' + it.name)));
    }
    function listAttach(n, type) {
      const key = type === 'skill' ? 'skills' : type;
      const vals = C.arr(n[key]);
      const box = h('div', { class: 'attach-list' }, ...vals.map((v) => attachRow(type, v, () => { commit(); n[key] = vals.filter((x) => x !== v); refreshNode(); inspector(); })));
      const avail = S.all(type).filter((it) => !vals.includes(it.id));
      const add = h('button', { class: 'btn sm', disabled: !avail.length, onclick: () => menu(add, avail.map((it) => ({ icon: it.icon || C.TYPES[type].icon, label: it.name, desc: it.description.slice(0, 70), onClick: () => { commit(); n[key] = [...vals, it.id]; refreshNode(); inspector(); } }))) }, icon('plus', 13), h('span', null, 'Add'));
      return h('div', null, box, h('div', { style: { marginTop: '6px' } }, add));
    }
    function inspector() {
      inspectorEl.innerHTML = '';
      if (!sel) return inspectWorkflow();
      if (sel.kind === 'edge') return inspectEdge(wf.edges.find((e) => e.id === sel.id));
      const n = node(sel.id); if (!n) { sel = null; return inspectWorkflow(); }
      const T = C.NODE_TYPES[n.type];
      inspHead.innerHTML = ''; inspHead.append(h('div', { class: 'row' }, h('span', null, T.icon), h('span', null, T.label), h('span', { class: 'grow' }), h('span', { class: 'muted small mono' }, n.id)));
      const E = inspectorEl;
      if (n.type === 'note') {
        E.append(fld('Note text', txt(n, 'text', { area: true, rows: 8 })));
      } else {
        E.append(fld('Title', txt(n, 'title')));
      }
      if (n.type === 'start') {
        E.append(h('div', { class: 'callout info small', style: { marginBottom: '12px' } }, 'ℹ️', h('div', null, 'The start node receives the workflow ', h('b', null, 'inputs'), '. Use them in any step as ', h('code', null, '{{name}}'), '.')));
        E.append(inputsEditor());
      }
      if (n.type === 'step') {
        const r = C.resolveNode(S.lib, n);
        E.append(fld('🤖 Agent', refSelect('agent', n.agent, (v) => { commit(); n.agent = v || undefined; if (!n.title || n.title === 'New step') n.title = v ? S.get('agent', v).name : n.title; refreshNode(); inspector(); }), 'Role that executes the step (the agent\'s instructions, skills and knowledge are included).'));
        E.append(fld('💬 Prompt', refSelect('prompt', n.prompt, (v) => { commit(); n.prompt = v || undefined; refreshNode(); inspector(); }), 'Template applied in this step (optional).'));
        if (r.prompt) {
          const vars = C.extractVars(r.prompt.body).filter((v) => !v.name.includes('.'));
          if (vars.length) {
            n.vars = n.vars || {};
            E.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Prompt variables'),
              ...vars.map((v) => h('div', { class: 'row', style: { marginBottom: '5px' } }, h('span', { class: 'chip mono', style: { minWidth: '90px' } }, v.name),
                h('input', { type: 'text', class: 'mono', value: n.vars[v.name] || '', placeholder: wf.inputs.some((i) => i.name === v.name) ? `{{${v.name}}} (input)` : '{{prev}} or text…', oninput: (e) => { n.vars[v.name] = e.target.value; if (!e.target.value) delete n.vars[v.name]; markDirty(); } }))),
              h('div', { class: 'help' }, 'If empty, the input with the same name or the previous step context is used.')));
          }
        }
        const instr = txt(n, 'instructions', { area: true, rows: 6, placeholder: 'What this step must do. You can use {{inputs}} and {{outputs}} from other steps.', live: false });
        E.append(fld('📝 Step instructions', instr), tokensHelp(n, () => instr));
        E.append(h('div', { style: { height: '12px' } }));
        E.append(fld('🎁 Expected deliverable', txt(n, 'deliverable', { placeholder: 'e.g. User story in Gherkin format', live: false })));
        E.append(filesField(n));
        E.append(fld('🧩 Skills', listAttach(n, 'skill')));
        E.append(fld('📚 Knowledge', listAttach(n, 'knowledge')));
        E.append(fld('🔌 MCP tools', listAttach(n, 'mcp')));
        E.append(fld('🔗 Context received', h('select', { onchange: (e) => { commit(); n.context = e.target.value === 'prev' ? undefined : e.target.value; } },
          [['prev', 'Result of the connected steps'], ['all', 'All previous results'], ['none', 'None (inputs only)']].map(([v, l]) => h('option', { value: v, selected: (n.context || 'prev') === v }, l)))));
        E.append(fld('↪ Output name', txt(n, 'outputKey', { mono: true, slug: true, placeholder: 'e.g. story' }), 'Lets other steps reference the result as {{name}}.'));
        if (r.agent || r.skills.length || r.knowledge.length) E.append(h('div', { class: 'callout small', style: { marginTop: '6px' } }, '✨', h('div', null, 'This step inherits from the agent: ', [r.agent ? r.agent.skills.length + ' skills' : '', r.agent ? r.agent.knowledge.length + ' docs' : ''].filter(Boolean).join(' · ') || '—')));
      }
      if (n.type === 'human') {
        E.append(fld('What the person must review', txt(n, 'instructions', { area: true, rows: 5 })));
        E.append(fld('Owner (optional)', txt(n, 'owner', { placeholder: 'e.g. Product Owner' })));
        E.append(h('div', { class: 'callout info small' }, '🔁', h('div', null, 'Connect an output labelled ', h('b', null, '«changes»'), ' to the step to redo. If there is none, rejecting repeats the previous step with the feedback.')));
      }
      if (n.type === 'condition') {
        E.append(fld('❓ Decision criterion', txt(n, 'question', { area: true, rows: 3, placeholder: 'Does the story meet INVEST?' })));
        E.append(fld('🤖 Deciding agent (optional)', refSelect('agent', n.agent, (v) => { commit(); n.agent = v || undefined; refreshNode(); })));
        const outs = wf.edges.filter((e) => e.from === n.id);
        E.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Options (outputs)'),
          outs.length ? h('div', null, ...outs.map((e) => h('div', { class: 'row', style: { marginBottom: '5px' } },
            h('input', { type: 'text', value: e.label || '', placeholder: 'label', oninput: (ev) => { e.label = ev.target.value; renderEdges(); markDirty(); } }),
            h('span', { class: 'muted small', style: { whiteSpace: 'nowrap' } }, '→ ' + ((node(e.to) || {}).title || e.to))))) : h('div', { class: 'muted small' }, 'Connect at least two outputs from the right ● dot.')));
      }
      if (n.type === 'end') {
        E.append(fld('Final consolidation (optional)', txt(n, 'instructions', { area: true, rows: 4, placeholder: 'If filled in, an agent will generate the final summary with these instructions.' })));
        E.append(fld('Final deliverable', txt(n, 'deliverable', { placeholder: 'e.g. PR ready for review' })));
        E.append(filesField(n));
        E.append(fld('🤖 Closing agent (optional)', refSelect('agent', n.agent, (v) => { commit(); n.agent = v || undefined; refreshNode(); })));
      }
      E.append(h('div', { class: 'row', style: { marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' } },
        n.type !== 'start' ? btn('Duplicate', duplicateSel, { cls: 'sm', icon: 'dup' }) : null,
        n.type === 'step' ? btn('View prompt', () => previewStep(n), { cls: 'sm', icon: 'eye' }) : null,
        h('div', { class: 'grow' }),
        btn('Delete', deleteSel, { cls: 'sm danger', icon: 'trash' })));
    }
    function inspectEdge(e) {
      if (!e) return inspectWorkflow();
      inspHead.innerHTML = ''; inspHead.append('🔗 Connection');
      const a = node(e.from); const b = node(e.to);
      inspectorEl.append(h('div', { class: 'muted small', style: { marginBottom: '12px' } }, (a.title || a.id) + ' → ' + (b.title || b.id)));
      const inp = h('input', { type: 'text', value: e.label || '', placeholder: 'no label', oninput: (ev) => { e.label = ev.target.value || undefined; renderEdges(); markDirty(); } });
      inspectorEl.append(fld('Label', inp, a.type === 'condition' ? 'Decision option that leads down this path.' : a.type === 'human' ? 'Use «changes» for the rejection path.' : 'Opcional.'));
      inspectorEl.append(h('div', { class: 'chips', style: { marginBottom: '14px' } }, ...['yes', 'no', 'approved', 'changes', 'other'].map((l) => h('span', { class: 'chip', style: { cursor: 'pointer' }, onclick: () => { commit(); e.label = l; inp.value = l; renderEdges(); } }, l))));
      inspectorEl.append(btn('Delete connection', deleteSel, { cls: 'sm danger', icon: 'trash' }));
    }
    function inputsEditor() {
      const box = h('div', { class: 'field' }, h('div', { class: 'lbl' }, '📥 Workflow inputs'));
      wf.inputs.forEach((inp, i) => {
        box.append(h('div', { class: 'card', style: { padding: '8px', marginBottom: '6px', boxShadow: 'none' } },
          h('div', { class: 'inp-row' },
            h('input', { type: 'text', class: 'mono', value: inp.name, placeholder: 'name', oninput: (e) => { inp.name = C.slugify(e.target.value).replace(/-/g, '_'); markDirty(); }, onblur: (e) => { e.target.value = inp.name; } }),
            h('input', { type: 'text', value: inp.label || '', placeholder: 'Label', oninput: (e) => { inp.label = e.target.value; markDirty(); } }),
            h('label', { class: 'check small', title: 'Required' }, h('input', { type: 'checkbox', checked: !!inp.required, onchange: (e) => { inp.required = e.target.checked; markDirty(); } }), '*'),
            h('button', { class: 'btn ghost icon sm', onclick: () => { commit(); wf.inputs.splice(i, 1); inspector(); } }, icon('x', 13))),
          h('input', { type: 'text', value: inp.description || '', placeholder: 'Help for whoever fills it in', oninput: (e) => { inp.description = e.target.value; markDirty(); } })));
      });
      box.append(btn('Add input', () => { commit(); wf.inputs.push({ name: 'entrada_' + (wf.inputs.length + 1), label: '', required: false }); inspector(); }, { cls: 'sm', icon: 'plus' }));
      return box;
    }
    function inspectWorkflow() {
      inspHead.innerHTML = ''; inspHead.append('🔀 Workflow');
      const E = inspectorEl;
      const nodesN = wf.nodes.filter((n) => n.type !== 'note').length;
      E.append(h('div', { class: 'muted small', style: { marginBottom: '12px' } }, `${nodesN} nodes · ${wf.edges.length} connections · select a node to configure it`));
      ['description', 'icon', 'tags', 'audience', 'targets', 'status', 'version'].forEach((k) => {
        const f = C.FIELDS.workflow.find((x) => x.key === k);
        E.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, f.label), V.fieldWidget(f, wf, () => { markDirty(); if (k === 'name') nameIn.value = wf.name; })));
      });
      E.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'ID / file'), h('input', { type: 'text', class: 'mono', value: wf.id || '', placeholder: 'generated on save', disabled: !!existing, oninput: (e) => { wf.id = C.slugify(e.target.value); markDirty(); } }),
        h('div', { class: 'help mono' }, 'library/workflows/' + (wf.id || '…') + '.workflow.json')));
      E.append(inputsEditor());
      E.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Notas / README'), h('textarea', { rows: 4, value: wf.body || '', oninput: (e) => { wf.body = e.target.value; markDirty(); } })));
      E.append(h('div', { class: 'callout small' }, '⌨️', h('div', null, h('b', null, 'Atajos: '), 'Del delete · ⌘D duplicate · ⌘Z undo · ⌘S save · double-click the canvas to add a node.')));
    }

    /* ---------- validation ---------- */
    function updIssues() {
      if (!issuesBtn) return;
      const issues = C.validateWorkflow(libWith(), wf);
      issuesByNode = {};
      issues.forEach((i) => { if (i.node) (issuesByNode[i.node] = issuesByNode[i.node] || []).push(i.msg); });
      const err = issues.filter((i) => i.level !== 'info').length;
      issuesBtn.innerHTML = '';
      issuesBtn.append(h('span', null, err ? '⚠ ' + err : '✓'), h('span', null, err ? ' avisos' : ' Valid'));
      issuesBtn.style.color = err ? 'var(--warn)' : 'var(--ok)';
      canvas.querySelectorAll('.node').forEach((el) => {
        const b = el.querySelector('.n-issue'); const list = issuesByNode[el.dataset.id];
        if (list && !b) el.append(h('span', { class: 'n-issue', title: list.join('\n') }, '!'));
        else if (!list && b) b.remove();
        else if (list && b) b.title = list.join('\n');
      });
    }
    function showIssues() {
      const issues = C.validateWorkflow(libWith(), wf);
      const m = modal({
        title: 'Workflow validation', titleIcon: '🩺',
        body: issues.length ? h('div', null, ...issues.map((i) => h('div', { class: 'issue', onclick: () => { if (i.node) { m.close(); select({ kind: 'node', id: i.node }); } } }, h('span', { class: 'lvl ' + i.level }), h('div', null, i.msg)))) : h('div', { class: 'callout ok' }, '✅', 'The workflow is valid and ready to run.')
      });
    }

    /* ---------- previews and export ---------- */
    function previewStep(n) {
      const c = C.composeStep(libWith(), wf, n, { inputs: Object.fromEntries(wf.inputs.map((i) => [i.name, `[${i.label || i.name}]`])), results: {} });
      modal({
        title: 'Composed prompt · ' + c.title, titleIcon: '👁', size: 'wide',
        body: h('div', null,
          h('div', { class: 'muted small', style: { marginBottom: '10px' } }, 'This is how the AI will receive the step (with sample values). It includes the agent role, global rules, skills, knowledge, context and task.'),
          h('div', { class: 'tabs' }), h('pre', { class: 'code-view', style: { maxHeight: '60vh' } }, c.full)),
        foot: (close) => [btn('Copy', () => copy(c.full), { icon: 'copy' }), btn('Close', () => close(), { cls: 'primary' })]
      });
    }
    function runbookModal(flavor) {
      const md = C.workflowRunbook(libWith(), Object.assign({}, wf, { id: wf.id || C.slugify(wf.name) }), flavor);
      const file = flavor === 'copilot' ? `.github/prompts/wf-${wf.id}.prompt.md` : flavor === 'claude' ? `.claude/commands/wf-${wf.id}.md` : flavor === 'm365' ? `m365/workflows/${wf.id}.md` : `ai/workflows/${wf.id}.md`;
      const content = flavor === 'copilot' ? C.stringifyFrontmatter({ description: 'Workflow E2E: ' + wf.name, agent: 'agent' }, md) : md;
      let mode = 'md';
      const pre = h('pre', { class: 'code-view', style: { maxHeight: '60vh' } }, content);
      const prev = h('div', { class: 'md card card-pad hidden', style: { maxHeight: '60vh', overflow: 'auto' }, html: AIC.md(md, { vars: false }) });
      const seg = h('div', { class: 'btn-group', style: { marginBottom: '10px' } },
        h('button', { class: 'btn sm on', onclick: (e) => { mode = 'md'; pre.classList.remove('hidden'); prev.classList.add('hidden'); seg.children[0].classList.add('on'); seg.children[1].classList.remove('on'); void e; } }, 'Source'),
        h('button', { class: 'btn sm', onclick: () => { mode = 'prev'; prev.classList.remove('hidden'); pre.classList.add('hidden'); seg.children[1].classList.add('on'); seg.children[0].classList.remove('on'); } }, 'Preview'));
      const how = {
        copilot: ['Save it in your repo as ', h('code', null, file), ' (or use Export). In Copilot Chat (agent mode) type ', h('code', null, '/wf-' + wf.id), '. Copilot coding agent and Copilot CLI can follow it too: «Run the workflow in ', h('code', null, file), '».'],
        claude: ['Save it as ', h('code', null, file), ' and in Claude Code run ', h('code', null, '/wf-' + wf.id + ' <inputs>'), '.'],
        m365: ['Copilot M365 does not chain agents: follow the steps copying each prompt, or use the AI Center ', h('b', null, 'Runner'), ' in manual mode.'],
        generic: ['Give it to any agent (Codex, Cursor, Gemini, ChatGPT with tools…) as its main instruction.']
      }[flavor];
      modal({
        title: 'Runbook E2E', titleIcon: '📜', size: 'wide',
        body: [h('div', { class: 'callout info', style: { marginBottom: '12px' } }, 'ℹ️', h('div', null, ...how)), seg, pre, prev],
        foot: (close) => [btn('Download', () => download(file.split('/').pop(), content), { icon: 'download' }), btn('Copy', () => copy(content), { cls: 'primary', icon: 'copy' }), btn('Close', () => close(), { cls: 'ghost' })]
      });
      void mode;
    }
    function cliModal() {
      const ins = wf.inputs.map((i) => `--input ${i.name}="…"`).join(' ');
      const cmds = [
        ['Copilot CLI (runs tools in your repo)', `node cli/aic.mjs run ${wf.id} ${ins} --provider copilot`],
        ['Claude Code', `node cli/aic.mjs run ${wf.id} ${ins} --provider claude-code`],
        ['GitHub Models (GITHUB_TOKEN)', `node cli/aic.mjs run ${wf.id} ${ins} --provider github --model openai/gpt-4.1`],
        ['Anthropic API (ANTHROPIC_API_KEY)', `node cli/aic.mjs run ${wf.id} ${ins} --provider anthropic`],
        ['Manual (asks you to paste each answer)', `node cli/aic.mjs run ${wf.id} ${ins} --provider manual`]
      ];
      modal({
        title: 'Run from the terminal', titleIcon: '⌨️', size: 'wide',
        body: [h('p', { class: 'muted', style: { marginTop: 0 } }, 'The CLI (Node 18+, no dependencies) uses the same engine as the app. It saves each step and a REPORT.md in ', h('code', null, 'runs/'), '. Add ', h('code', null, '--auto-approve'), ' to skip stopping at human reviews (CI).'),
          ...cmds.map(([l, c]) => h('div', { style: { marginBottom: '10px' } }, h('div', { class: 'small', style: { fontWeight: 600, marginBottom: '4px' } }, l), h('div', { class: 'prompt-box' }, h('pre', null, c), h('button', { class: 'btn sm copy', onclick: () => copy(c) }, icon('copy', 13)))))]
      });
    }

    /* ---------- save / run ---------- */
    async function save() {
      if (!wf.name.trim()) { toast('Give the workflow a name', 'err'); nameIn.focus(); return false; }
      if (!wf.id) wf.id = S.uniqueId('workflow', wf.name);
      const clash = S.get('workflow', wf.id);
      if (clash && S.keyOf(clash) !== prevKey) { toast('There is already a workflow with id ' + wf.id, 'err'); return false; }
      try {
        await S.save(C.clone(wf), prevKey);
        dirty = false;
        saveBtn.classList.remove('primary'); saveBtn.querySelector('span:last-child').textContent = 'Saved';
        toast(S.mode === 'folder' ? '💾 Saved to library/workflows/' + wf.id + '.workflow.json' : 'Saved in this browser', 'ok');
        if (!existing) { AIC.app.dirty = null; go('#/workflow/' + encodeURIComponent(wf.id)); }
        return true;
      } catch (e) { toast('Error: ' + e.message, 'err'); return false; }
    }
    async function runIt() {
      if (dirty || !existing) { if (!(await save())) return; }
      go('#/run/' + encodeURIComponent(wf.id));
    }

    /* ---------- keyboard ---------- */
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (document.querySelector('.overlay')) return;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); deleteSel(); } }
      else if (e.key === 'Escape') select(null);
      else if (e.key === 'f') fit();
    };
    document.addEventListener('keydown', onKey);
    const onResize = () => drawMinimap();
    window.addEventListener('resize', onResize);

    /* ---------- mount ---------- */
    const shell = h('div', { class: 'wf-shell' }, top, h('div', { class: 'wf' }, palette, wrap, rightPanel));
    const appShell = document.getElementById('shell');
    if (appShell && window.innerWidth < 1700) appShell.classList.add('focus');
    root.append(shell);
    drawPalette();
    render();
    updIssues();
    inspector();
    applyView();
    requestAnimationFrame(() => { render(); fit(true); });
    setTimeout(() => { hint.style.transition = 'opacity .6s'; hint.style.opacity = '0'; }, 6000);
    AIC.app.dirty = () => dirty;
    const offStore = S.on((what) => { if (what !== 'prefs') drawPalette(); });
    // lets the runner paint state on the canvas
    V._wfPaint = (state) => { runState = state; render(); };
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', onResize);
      offStore();
      V._wfPaint = null;
      if (appShell) appShell.classList.remove('focus');
    };
  };

  /* ======================================================== *
   * New workflow: blank, from a template or designed with AI
   * ======================================================== */
  function newWorkflowDialog(root) {
    root.append(h('div', { class: 'page' }, h('div', { class: 'empty' }, h('div', { class: 'e-ico' }, '🔀'), 'Creating workflow…')));
    const start = (seed) => { V._wfSeed = seed; AIC.app.route(); };
    const blank = () => C.newItem('workflow', { name: 'New workflow', description: '', author: S.prefs.author, targets: ['copilot', 'm365', 'any'] });
    const templates = S.all('workflow');
    let closedByChoice = false;
    const choose = (fn) => { closedByChoice = true; m.close(); fn(); };
    const card = (ico, title, desc, fn) => h('div', { class: 'card target-card', onclick: () => choose(fn) }, h('div', { class: 't-ico' }, ico), h('div', null, h('div', { style: { fontWeight: 700 } }, title), h('div', { class: 'muted small' }, desc)));
    const m = modal({
      title: 'New workflow', titleIcon: '🔀', size: 'wide',
      body: h('div', null,
        h('div', { class: 'grid cols-3', style: { marginBottom: '18px' } },
          card('📄', 'Blank', 'Start and End ready; drag in the rest.', () => start(blank())),
          card('✨', 'Design with AI', 'Describe the process and let Copilot/Claude propose the flow using your pieces.', () => aiDesign(start)),
          card('📥', 'Import .workflow.json', 'From an existing file.', async () => {
            const files = await AIC.pickFiles('.json', false);
            if (!files.length) { go('#/library/workflow'); return; }
            try { const it = C.itemFromFile('workflows/' + files[0].name.replace(/(\.workflow)?\.json$/, '') + '.workflow.json', files[0].content); it.id = ''; start(it); }
            catch (e) { toast('Invalid file', 'err'); go('#/library/workflow'); }
          })),
        templates.length ? h('div', null, h('div', { class: 'section-title', style: { marginTop: 0 } }, '📚 Start from an existing workflow'),
          h('div', { class: 'grid cols-3' }, ...templates.map((t) => card(t.icon || '🔀', t.name, t.description.slice(0, 110), () => {
            const c = C.clone(t); c.id = ''; c.name = t.name + ' (copy)'; c.status = 'draft'; start(c);
          })))) : null),
      onClose: () => { if (!closedByChoice) go('#/library/workflow'); }
    });
  }
  function aiDesign(start) {
    const cat = (t) => S.all(t).map((i) => `- ${i.id}: ${i.name} — ${i.description}`).join('\n') || '- (none)';
    const desc = h('textarea', { rows: 4, placeholder: 'e.g. From a business idea to a reviewed PR: refine the story with the PO, design the solution, implement with tests, review and document.' });
    const out = h('textarea', { rows: 8, class: 'code', placeholder: 'Paste here the JSON returned by the AI…' });
    const promptFor = () => `You are an expert in designing processes with AI agents. Design a workflow for AI Center with this goal:

"""${desc.value || '(describe the process)'}"""

Prefer these existing pieces (by id):

## Agents
${cat('agent')}

## Prompts
${cat('prompt')}

## Skills
${cat('skill')}

## Knowledge
${cat('knowledge')}

Return ONLY valid JSON with this shape (no extra text):
{
  "name": "…", "description": "…", "icon": "🔀",
  "inputs": [{"name": "snake_case", "label": "…", "description": "…", "required": true}],
  "nodes": [
    {"id": "start", "type": "start", "title": "Start"},
    {"id": "n1", "type": "step", "title": "…", "agent": "<agent id>", "prompt": "<optional prompt id>", "skills": ["<id>"], "knowledge": ["<id>"], "instructions": "Use {{input}} and {{output_of_another_step}}", "deliverable": "…", "outputKey": "snake_case"},
    {"id": "h1", "type": "human", "title": "Review of …", "instructions": "…"},
    {"id": "c1", "type": "condition", "title": "…", "question": "…"},
    {"id": "end", "type": "end", "title": "End", "deliverable": "…"}
  ],
  "edges": [{"from": "start", "to": "n1"}, {"from": "c1", "to": "n2", "label": "yes"}, {"from": "h1", "to": "n1", "label": "changes"}]
}
Rules: include human reviews at critical points, decisions with labelled outputs, and use only existing ids (or leave the field empty).`;
    let accepted = false;
    modal({
      title: 'Design workflow with AI', titleIcon: '✨', size: 'wide',
      body: h('div', null,
        h('div', { class: 'steps-guide' },
          h('div', { class: 'card' }, h('b', null, 'Describe the process'), desc),
          h('div', { class: 'card' }, h('b', null, 'Copy the prompt and paste it into Copilot Chat, Copilot M365, Claude or ChatGPT'), h('div', { style: { marginTop: '8px' } }, btn('Copy design prompt', () => copy(promptFor()), { icon: 'copy', cls: 'primary' }))),
          h('div', { class: 'card' }, h('b', null, 'Paste the resulting JSON'), out))),
      foot: (close) => [btn('Cancel', () => close(), { cls: 'ghost' }), btn('Create on the canvas', () => {
        const raw = out.value.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
        let data;
        try { data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { toast('Invalid JSON: ' + e.message, 'err', 5000); return; }
        const wf = C.normalizeItem(Object.assign(C.newItem('workflow', { author: S.prefs.author }), data, { type: 'workflow', id: '' }));
        wf.edges = wf.edges.map((e) => Object.assign({ id: C.uid('e') }, e));
        wf.nodes.forEach((n) => { if (!n.id) n.id = C.uid('n'); if (n.x === undefined) { n.x = 0; n.y = 0; } });
        C.autoLayout(wf);
        accepted = true; close(); start(wf);
      }, { cls: 'primary', icon: 'sparkle' })],
      onClose: () => { if (!accepted) go('#/library/workflow'); }
    });
  }
})();
