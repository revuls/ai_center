/* AI Center · views-library.js — inicio, listados, editor y "usar" */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, toast, modal, copy, md, menu, popover, confirmDialog, typeColor, timeAgo, EMOJIS } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});
  const go = (x) => AIC.app.go(x);
  const label = (opts, v) => (opts.find((o) => o.value === v) || {}).label || v;

  /* ======================================================== *
   * Tarjeta de item
   * ======================================================== */
  function itemCard(it) {
    const t = C.TYPES[it.type];
    const fav = h('button', { class: 'fav' + (S.isFav(it) ? ' on' : ''), title: 'Favorito', onclick: (e) => { e.stopPropagation(); S.toggleFav(it); fav.classList.toggle('on'); fav.textContent = S.isFav(it) ? '★' : '☆'; } }, S.isFav(it) ? '★' : '☆');
    const extra = [];
    if (it.type === 'workflow') extra.push(h('span', { class: 'chip' }, `${it.nodes.filter((n) => n.type !== 'note').length} nodos`));
    if (it.type === 'prompt') { const n = C.extractVars(it.body).length; if (n) extra.push(h('span', { class: 'chip' }, `${n} variable${n > 1 ? 's' : ''}`)); }
    if (it.type === 'agent' && it.skills.length) extra.push(h('span', { class: 'chip' }, `🧩 ${it.skills.length}`));
    if (it.type === 'instruction') extra.push(h('span', { class: 'chip mono' }, it.global ? 'global' : (it.applyTo || '**')));
    return h('div', { class: 'card item-card', style: { '--tc': typeColor(it.type) }, onclick: () => AIC.app.openItem(it) },
      fav,
      h('div', { class: 'ic-head' },
        h('div', { class: 'ic-emoji' }, it.icon || t.icon),
        h('div', { class: 'grow' }, h('div', { class: 'ic-title' }, it.name), h('div', { class: 'ic-id' }, t.singular + ' · ' + it.id))),
      h('div', { class: 'ic-desc' }, it.description || h('i', { class: 'muted' }, 'Sin descripción')),
      h('div', { class: 'ic-foot' },
        h('span', { class: 'chip st-' + it.status }, label(C.STATUS, it.status)),
        ...extra,
        ...it.audience.slice(0, 2).map((a) => h('span', { class: 'chip' }, label(C.AUDIENCES, a))),
        ...it.tags.slice(0, 3).map((tg) => h('span', { class: 'chip accent' }, '#' + tg))));
  }
  V.itemCard = itemCard;

  /* ======================================================== *
   * Inicio
   * ======================================================== */
  V.dashboard = function (root) {
    const cfg = S.lib.config;
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'hero' },
      h('div', { class: 'hero-art' }, '✦'),
      h('h1', null, cfg.workspace || 'AI Center'),
      h('p', null, cfg.description || 'El framework del equipo para trabajar con IA: prompts, agentes, skills, conocimiento, herramientas y workflows E2E, todo en ficheros versionables y listo para GitHub Copilot, Copilot M365 y cualquier IA.'),
      h('div', { class: 'actions' },
        btn('Diseñar un workflow', () => go('#/workflow/new'), { cls: 'primary', icon: 'sparkle' }),
        btn('Exportar a Copilot', () => go('#/export'), { icon: 'export' }),
        btn('Guía rápida', () => go('#/guide'), { icon: 'book' }))));

    if (S.mode !== 'folder' && !S.lib.items.length) {
      page.append(h('div', { class: 'callout info', style: { marginBottom: '18px' } }, 'ℹ️',
        h('div', null, h('b', null, 'La librería está vacía. '), 'Conecta la carpeta del framework (la que contiene ', h('code', null, 'library/'), ') para cargar los ficheros, o crea tu primer elemento.')));
    }
    page.append(h('div', { class: 'grid cols-4' }, ...C.TYPE_ORDER.map((t) => h('div', { class: 'card stat', style: { '--tc': typeColor(t) }, onclick: () => go('#/library/' + t) },
      h('div', { class: 's-ico' }, C.TYPES[t].icon), h('div', null, h('div', { class: 's-num' }, S.all(t).length), h('div', { class: 's-lbl' }, C.TYPES[t].label)))),
    (() => {
      const issues = C.lint(S.lib); const err = issues.filter((i) => i.level === 'error').length; const warn = issues.filter((i) => i.level === 'warn').length;
      return h('div', { class: 'card stat', style: { '--tc': err ? 'var(--err)' : warn ? 'var(--warn)' : 'var(--ok)' }, onclick: () => go('#/health') },
        h('div', { class: 's-ico' }, err ? '🩹' : warn ? '🩺' : '💚'), h('div', null, h('div', { class: 's-num' }, err + warn), h('div', { class: 's-lbl' }, err ? `${err} errores · ${warn} avisos` : warn ? 'avisos de calidad' : 'todo en orden')));
    })()));

    const favs = S.prefs.favorites.map((k) => S.lib.items.find((i) => S.keyOf(i) === k)).filter(Boolean);
    const recent = S.prefs.recent.map((r) => S.lib.items.find((i) => S.keyOf(i) === r.k)).filter(Boolean).filter((i) => !favs.includes(i));
    if (favs.length) page.append(h('div', { class: 'section-title' }, '★ Favoritos'), h('div', { class: 'grid cols-auto' }, ...favs.slice(0, 6).map(itemCard)));
    if (recent.length) page.append(h('div', { class: 'section-title' }, '🕘 Recientes'), h('div', { class: 'grid cols-auto' }, ...recent.slice(0, 6).map(itemCard)));
    const wfs = S.all('workflow');
    if (wfs.length) page.append(h('div', { class: 'section-title' }, '🔀 Workflows ', h('span', { class: 'muted small' }, 'listos para ejecutar E2E')), h('div', { class: 'grid cols-auto' }, ...wfs.slice(0, 6).map(itemCard)));

    page.append(h('div', { class: 'section-title' }, '🧭 ¿Qué quieres hacer?'),
      h('div', { class: 'grid cols-3' },
        quick('🧑‍💻', 'Soy developer', 'Agentes y prompts para Copilot en el IDE, instrucciones por lenguaje y workflows de feature, bugfix y PR.', () => go('#/library/all?aud=dev')),
        quick('🎯', 'Soy Product Owner', 'Refinar historias, criterios de aceptación, priorización y release notes; también en Copilot M365.', () => go('#/library/all?aud=po')),
        quick('💼', 'Soy de negocio', 'Prompts listos para Copilot M365 (Outlook, Teams, Word) y agentes declarativos sin código.', () => go('#/library/all?aud=negocio')),
        quick('🔀', 'Automatizar un proceso', 'Arrastra agentes, prompts, skills y revisiones humanas a un lienzo y ejecútalo de principio a fin.', () => go('#/workflow/new')),
        quick('📦', 'Llevarlo a mi repo', 'Genera .github/agents, prompts, skills, instructions, mcp.json y AGENTS.md en un clic.', () => go('#/export')),
        quick('📖', 'Aprender a trabajar con IA', 'Conceptos, cuándo usar cada pieza y buenas prácticas del equipo.', () => go('#/guide'))));
    root.append(page);
    return S.on((what) => { if (what !== 'load' && (location.hash === '' || location.hash === '#/')) AIC.app.route(); });
  };
  function quick(ico, title, desc, onClick) {
    return h('div', { class: 'card card-pad', style: { cursor: 'pointer' }, onclick: onClick },
      h('div', { style: { fontSize: '24px', marginBottom: '6px' } }, ico), h('div', { style: { fontWeight: 700, marginBottom: '4px' } }, title), h('div', { class: 'muted small' }, desc));
  }

  /* ======================================================== *
   * Listado
   * ======================================================== */
  V.list = function (root, typeArg) {
    const [type, qs] = String(typeArg).split('?');
    const params = new URLSearchParams(qs || '');
    const state = { q: '', status: '', aud: params.get('aud') || '', target: '', tag: '', sort: 'name', view: S.prefs.view || 'grid' };
    const page = h('div', { class: 'page' });
    const isType = !!C.TYPES[type];
    const title = isType ? C.TYPES[type].label : type === 'favs' ? 'Favoritos' : 'Toda la librería';
    const desc = isType ? C.TYPES[type].help : type === 'favs' ? 'Tus elementos marcados con ★ (se guardan solo en este navegador).' : 'Todos los elementos del framework.';
    page.append(h('div', { class: 'page-head' },
      h('div', null, h('h1', null, isType ? C.TYPES[type].icon + ' ' : '', title), h('p', null, desc)),
      h('div', { class: 'actions' },
        isType ? btn('Nuevo ' + C.TYPES[type].singular.toLowerCase(), () => go(type === 'workflow' ? '#/workflow/new' : '#/new/' + type), { cls: 'primary', icon: 'plus' }) : null,
        btn('Importar', () => V.importDialog(), { icon: 'upload' }))));
    const allTags = C.uniq(S.lib.items.flatMap((i) => i.tags)).sort();
    const search = h('input', { type: 'search', placeholder: 'Filtrar…', oninput: (e) => { state.q = e.target.value; draw(); } });
    const sel = (opts, key, ph) => h('select', { onchange: (e) => { state[key] = e.target.value; draw(); } }, h('option', { value: '' }, ph), ...opts.map((o) => h('option', { value: o.value, selected: state[key] === o.value }, o.label)));
    const viewBtns = h('div', { class: 'btn-group', style: { marginLeft: 'auto' } },
      h('button', { class: 'btn sm' + (state.view === 'grid' ? ' on' : ''), title: 'Tarjetas', onclick: () => setView('grid') }, icon('layout', 14)),
      h('button', { class: 'btn sm' + (state.view === 'table' ? ' on' : ''), title: 'Tabla', onclick: () => setView('table') }, icon('list', 14)));
    const setView = (v) => { state.view = v; S.prefs.view = v; S.savePrefs(); viewBtns.children[0].classList.toggle('on', v === 'grid'); viewBtns.children[1].classList.toggle('on', v === 'table'); draw(); };
    page.append(h('div', { class: 'toolbar' }, search,
      !isType ? sel(C.TYPE_ORDER.map((t) => ({ value: t, label: C.TYPES[t].label })), 'type', 'Tipo: todos') : null,
      sel(C.AUDIENCES, 'aud', 'Audiencia: todas'), sel(C.TARGETS, 'target', 'IA: todas'), sel(C.STATUS, 'status', 'Estado: todos'),
      allTags.length ? sel(allTags.map((t) => ({ value: t, label: '#' + t })), 'tag', 'Etiqueta: todas') : null,
      sel([{ value: 'name', label: 'Orden: nombre' }, { value: 'updated', label: 'Orden: recientes' }], 'sort', 'Orden'),
      viewBtns));
    const out = h('div');
    page.append(out);
    function draw() {
      let items = S.lib.items;
      if (isType) items = items.filter((i) => i.type === type);
      if (type === 'favs') items = S.prefs.favorites.map((k) => items.find((i) => S.keyOf(i) === k)).filter(Boolean);
      if (state.type) items = items.filter((i) => i.type === state.type);
      if (state.aud) items = items.filter((i) => i.audience.includes(state.aud) || i.audience.includes('todos'));
      if (state.target) items = items.filter((i) => i.targets.includes(state.target) || i.targets.includes('any') || !i.targets.length);
      if (state.status) items = items.filter((i) => i.status === state.status);
      if (state.tag) items = items.filter((i) => i.tags.includes(state.tag));
      if (state.q) { const q = C.norm(state.q); items = items.filter((i) => C.norm([i.name, i.id, i.description, i.tags.join(' '), i.body].join(' ')).includes(q)); }
      items = items.slice().sort(state.sort === 'updated' ? (a, b) => String(b.updated || '').localeCompare(String(a.updated || '')) : (a, b) => String(a.name).localeCompare(String(b.name), 'es'));
      out.innerHTML = '';
      if (!items.length) {
        out.append(h('div', { class: 'card empty' }, h('div', { class: 'e-ico' }, isType ? C.TYPES[type].icon : '🔎'),
          h('div', null, state.q || state.aud || state.status || state.tag ? 'No hay resultados con esos filtros.' : 'Todavía no hay nada aquí.'),
          isType ? h('div', { style: { marginTop: '12px' } }, btn('Crear el primero', () => go(type === 'workflow' ? '#/workflow/new' : '#/new/' + type), { cls: 'primary', icon: 'plus' })) : null));
        return;
      }
      if (state.view === 'table') {
        out.append(h('div', { class: 'card' }, h('table', { class: 'list-table' },
          h('thead', null, h('tr', null, h('th', null, 'Nombre'), h('th', null, 'Tipo'), h('th', null, 'Descripción'), h('th', null, 'Estado'), h('th', null, 'Actualizado'))),
          h('tbody', null, ...items.map((it) => h('tr', { onclick: () => AIC.app.openItem(it) },
            h('td', null, h('b', null, (it.icon || C.TYPES[it.type].icon) + ' ' + it.name), h('div', { class: 'muted small mono' }, it.id)),
            h('td', null, h('span', { class: 'chip type', style: { background: typeColor(it.type) } }, C.TYPES[it.type].singular)),
            h('td', { class: 'small', style: { maxWidth: '480px' } }, it.description),
            h('td', null, h('span', { class: 'chip st-' + it.status }, label(C.STATUS, it.status))),
            h('td', { class: 'small muted' }, it.updated || '')))))));
      } else out.append(h('div', { class: 'grid cols-auto' }, ...items.map(itemCard)));
    }
    draw();
    root.append(page);
    setTimeout(() => search.focus(), 0);
    return S.on(draw);
  };

  /* ======================================================== *
   * Campos del formulario
   * ======================================================== */
  function fieldWidget(f, item, onChange) {
    const set = (v) => { item[f.key] = v; onChange(f.key); };
    const v = item[f.key];
    switch (f.kind) {
      case 'text': return h('input', { type: 'text', value: v || '', placeholder: f.placeholder || '', oninput: (e) => set(e.target.value) });
      case 'readonly': return h('input', { type: 'text', value: v || '—', readOnly: true, disabled: true });
      case 'textarea': return h('textarea', { rows: 3, value: v || '', placeholder: f.placeholder || '', oninput: (e) => set(e.target.value) });
      case 'select': return h('select', { onchange: (e) => set(e.target.value) }, ...f.options.map((o) => h('option', { value: o.value, selected: (v || '') === o.value }, o.label)));
      case 'bool': return h('label', { class: 'check' }, h('span', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!v, onchange: (e) => set(e.target.checked) }), h('span')), h('span', { class: 'small' }, v ? 'Sí' : 'No'));
      case 'emoji': {
        const b = h('button', { class: 'emoji-btn', type: 'button', onclick: () => {
          const p = popover(b, h('div', { class: 'emoji-pop' }, ...EMOJIS.map((em) => h('button', { onclick: () => { set(em); b.textContent = em; p.close(); } }, em)),
            h('button', { title: 'Quitar', onclick: () => { set(''); b.textContent = C.TYPES[item.type].icon; p.close(); } }, '∅')));
        } }, v || C.TYPES[item.type].icon);
        return b;
      }
      case 'multi': {
        const cur = new Set(v || []);
        return h('div', { class: 'multi' }, ...f.options.map((o) => {
          const el = h('span', { class: 'opt' + (cur.has(o.value) ? ' on' : ''), onclick: () => { cur.has(o.value) ? cur.delete(o.value) : cur.add(o.value); el.classList.toggle('on'); set(Array.from(cur)); } }, o.label);
          return el;
        }));
      }
      case 'tags': case 'list': return tagInput(v || [], set, { suggest: f.suggest || (f.key === 'tags' ? C.uniq(S.lib.items.flatMap((i) => i.tags)) : null), list: f.kind === 'list', placeholder: f.kind === 'list' ? 'Escribe y pulsa Enter' : 'Añadir y Enter' });
      case 'ref': {
        const opts = S.all(f.ref).filter((x) => x.id !== item.id || x.type !== item.type);
        return h('select', { onchange: (e) => set(e.target.value) }, h('option', { value: '' }, '— Ninguno —'), ...opts.map((o) => h('option', { value: o.id, selected: v === o.id }, (o.icon || C.TYPES[f.ref].icon) + ' ' + o.name)));
      }
      case 'refs': return refsInput(f.ref, v || [], set, item);
      case 'kv': return kvInput(v || {}, set);
      default: return h('input', { type: 'text', value: v || '', oninput: (e) => set(e.target.value) });
    }
  }
  function tagInput(values, set, opts) {
    opts = opts || {};
    let vals = values.slice();
    const wrap = h('div', { class: 'tag-input', onclick: () => inp.focus() });
    const dl = 'dl-' + Math.random().toString(36).slice(2);
    const inp = h('input', { type: 'text', placeholder: opts.placeholder, list: opts.suggest ? dl : null });
    const draw = () => {
      wrap.innerHTML = '';
      vals.forEach((v, i) => wrap.append(h('span', { class: 'chip' + (opts.list ? '' : ' accent'), title: v }, opts.list ? (v.length > 60 ? v.slice(0, 58) + '…' : v) : v,
        h('span', { class: 'x', onclick: (e) => { e.stopPropagation(); vals.splice(i, 1); set(vals.slice()); draw(); } }, '×'))));
      wrap.append(inp);
      if (opts.suggest) wrap.append(h('datalist', { id: dl }, ...opts.suggest.filter((s) => !vals.includes(s)).map((s) => h('option', { value: s }))));
    };
    const add = () => {
      const parts = opts.list ? [inp.value.trim()] : inp.value.split(',').map((s) => s.trim());
      parts.filter(Boolean).forEach((p) => { if (!vals.includes(p)) vals.push(p); });
      inp.value = ''; set(vals.slice()); draw(); inp.focus();
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || (!opts.list && e.key === ',')) { e.preventDefault(); add(); }
      if (e.key === 'Backspace' && !inp.value && vals.length) { vals.pop(); set(vals.slice()); draw(); inp.focus(); }
    });
    inp.addEventListener('blur', () => { if (inp.value.trim()) add(); });
    inp.addEventListener('change', () => { if (!opts.list && opts.suggest && opts.suggest.includes(inp.value)) add(); });
    draw();
    return wrap;
  }
  function refsInput(type, values, set, self) {
    let vals = values.slice();
    const wrap = h('div', { class: 'col', style: { gap: '6px' } });
    const draw = () => {
      wrap.innerHTML = '';
      const list = h('div', { class: 'chips' });
      vals.forEach((id, i) => {
        const it = S.get(type, id);
        list.append(h('span', { class: 'chip', style: it ? null : { borderColor: 'var(--err)', color: 'var(--err)' }, title: it ? it.description : 'No existe' },
          (it && it.icon) || C.TYPES[type].icon, ' ', it ? it.name : id + ' ⚠',
          h('span', { class: 'x', onclick: () => { vals.splice(i, 1); set(vals.slice()); draw(); } }, '×')));
      });
      const avail = S.all(type).filter((x) => !vals.includes(x.id) && !(self && x.type === self.type && x.id === self.id));
      const add = h('button', { class: 'btn sm', type: 'button', disabled: !avail.length, onclick: () => {
        menu(add, avail.map((x) => ({ icon: x.icon || C.TYPES[type].icon, label: x.name, desc: x.description.slice(0, 80), onClick: () => { vals.push(x.id); set(vals.slice()); draw(); } })));
      } }, icon('plus', 13), h('span', null, avail.length ? 'Añadir' : 'No hay más'));
      wrap.append(list, h('div', null, add));
    };
    draw();
    return wrap;
  }
  function kvInput(obj, set) {
    let rows = Object.entries(obj);
    const wrap = h('div');
    const emit = () => { const o = {}; rows.forEach(([k, v]) => { if (k) o[k] = v; }); set(o); };
    const draw = () => {
      wrap.innerHTML = '';
      rows.forEach((r, i) => wrap.append(h('div', { class: 'kv-row' },
        h('input', { type: 'text', value: r[0], placeholder: 'CLAVE', class: 'mono', oninput: (e) => { r[0] = e.target.value; emit(); } }),
        h('input', { type: 'text', value: r[1], placeholder: '${input:CLAVE}', class: 'mono', oninput: (e) => { r[1] = e.target.value; emit(); } }),
        h('button', { class: 'btn ghost icon sm', type: 'button', onclick: () => { rows.splice(i, 1); emit(); draw(); } }, icon('x', 14)))));
      wrap.append(btn('Añadir', () => { rows.push(['', '']); draw(); }, { cls: 'sm', icon: 'plus' }));
    };
    draw();
    return wrap;
  }
  V.fieldWidget = fieldWidget;
  V.tagInput = tagInput;
  V.refsInput = refsInput;

  /* ======================================================== *
   * Editor
   * ======================================================== */
  const TEMPLATES = {
    prompt: '# Contexto\n{{contexto: Describe la situación}}\n\n# Tarea\nActúa como … y {{tarea}}.\n\n# Requisitos\n- …\n\n# Formato de salida\n- Responde en español.\n- Usa encabezados y listas.\n',
    agent: '# Misión\nEres …. Tu objetivo es ….\n\n# Cómo trabajas\n1. Entiende el contexto y pregunta lo imprescindible.\n2. …\n\n# Reglas\n- Nunca inventes datos; indica supuestos.\n- …\n\n# Formato de salida\n- …\n',
    skill: '# Nombre de la skill\n\n## Cuándo usarla\n- …\n\n## Procedimiento\n1. …\n2. …\n\n## Checklist de calidad\n- [ ] …\n\n## Ejemplo\n…\n',
    instruction: '- Usa …\n- Evita …\n- Antes de …, …\n',
    knowledge: '# Título\n\n## Resumen\n…\n\n## Detalle\n…\n',
    mcp: 'Para qué sirve este servidor, qué herramientas expone y qué permisos necesita.\n'
  };
  V.editor = function (root, type, id, fromQuery) {
    if (!C.TYPES[type]) { root.append(h('div', { class: 'page' }, 'Tipo desconocido')); return; }
    if (type === 'workflow') { go('#/workflow/' + (id || 'new')); return; }
    const existing = id ? S.get(type, id) : null;
    if (id && !existing) { root.append(h('div', { class: 'page' }, h('div', { class: 'card empty' }, h('div', { class: 'e-ico' }, '🔎'), 'No existe ', h('code', null, type + ':' + id), h('div', { style: { marginTop: '10px' } }, btn('Volver', () => go('#/library/' + type)))))); return; }
    let draft = existing ? C.clone(existing) : C.newItem(type, { body: TEMPLATES[type] || '', author: S.prefs.author, targets: (S.lib.config.defaultTargets || []).slice() });
    if (existing && existing._files) draft._files = existing._files;
    const prevKey = existing ? S.keyOf(existing) : null;
    let dirty = false; let idTouched = !!existing;
    const T = C.TYPES[type];
    const page = h('div', { class: 'page' });
    const markDirty = () => { dirty = true; saveBtn.classList.add('primary'); saveBtn.querySelector('span:last-child').textContent = 'Guardar'; };

    const nameIn = h('input', { type: 'text', class: 'title-in', value: draft.name, placeholder: 'Nombre del ' + T.singular.toLowerCase(), oninput: (e) => {
      draft.name = e.target.value;
      if (!idTouched) { draft.id = S.uniqueId(type, draft.name); idIn.value = draft.id; }
      markDirty();
    } });
    const idIn = h('input', { type: 'text', class: 'mono', value: draft.id, placeholder: 'id-del-fichero', oninput: (e) => { idTouched = true; draft.id = C.slugify(e.target.value); markDirty(); }, onblur: () => { idIn.value = draft.id; } });
    const saveBtn = btn(existing ? 'Guardado' : 'Guardar', () => save(), { icon: 'save', cls: existing ? '' : 'primary', title: 'Guardar (⌘/Ctrl+S)' });

    async function save() {
      if (!draft.name.trim()) { toast('Pon un nombre', 'err'); nameIn.focus(); return; }
      if (!draft.id) draft.id = S.uniqueId(type, draft.name);
      const clash = S.get(type, draft.id);
      if (clash && S.keyOf(clash) !== prevKey) { toast('Ya existe un ' + T.singular.toLowerCase() + ' con id «' + draft.id + '»', 'err'); return; }
      try {
        const files = draft._files;
        const copyIt = C.clone(Object.assign({}, draft, { _files: undefined }));
        if (files) copyIt._files = files;
        const saved = await S.save(copyIt, prevKey);
        dirty = false;
        toast(S.mode === 'folder' ? '💾 Guardado en library/' + C.pathFor(saved) : 'Guardado en este navegador (conecta la carpeta para escribir ficheros)', 'ok');
        const target = `#/item/${type}/${encodeURIComponent(saved.id)}`;
        if (location.hash !== target) { AIC.app.dirty = null; go(target); }
        else { saveBtn.classList.remove('primary'); saveBtn.querySelector('span:last-child').textContent = 'Guardado'; }
      } catch (e) { toast('Error al guardar: ' + e.message, 'err', 5000); }
    }

    const moreBtn = h('button', { class: 'btn icon', title: 'Más acciones', onclick: () => menu(moreBtn, [
      { icon: 'dup', label: 'Duplicar', onClick: () => duplicate() },
      { icon: 'download', label: 'Descargar fichero', desc: C.pathFor(Object.assign({}, draft, { id: draft.id || 'nuevo' })), onClick: () => { const f = C.itemToFile(draft); AIC.download(f.path.split('/').pop(), f.content); } },
      { icon: 'copy', label: 'Copiar fichero fuente', onClick: () => copy(C.itemToFile(draft).content) },
      existing ? '-' : null,
      existing ? { icon: 'trash', label: 'Eliminar', onClick: () => del() } : null
    ], { align: 'right' }) }, icon('menu'));
    const duplicate = () => {
      const c = C.clone(draft); c.id = S.uniqueId(type, draft.name + ' copia'); c.name = draft.name + ' (copia)'; c.status = 'draft';
      S.save(c).then((it) => { toast('Duplicado'); AIC.app.openItem(it); });
    };
    const del = async () => {
      const used = C.usagesOf(S.lib, type, existing.id);
      const ok = await confirmDialog(h('div', null, '¿Eliminar «', h('b', null, existing.name), '»? ', S.mode === 'folder' ? 'Se borrará el fichero ' : '', S.mode === 'folder' ? h('code', null, C.pathFor(existing)) : null,
        used.length ? h('div', { class: 'callout warn', style: { marginTop: '10px' } }, '⚠ Lo usan: ' + used.map((u) => u.name).join(', ')) : null), { danger: true, ok: 'Eliminar' });
      if (!ok) return;
      await S.remove(existing); dirty = false; toast('Eliminado'); go('#/library/' + type);
    };

    const useActions = [];
    if (type === 'prompt') useActions.push(btn('Usar', () => V.usePrompt(draft), { icon: 'play', cls: 'primary' }));
    if (type === 'agent') useActions.push(btn('Usar / desplegar', (e) => V.useAgent(draft, e.currentTarget), { icon: 'play' }));

    page.append(h('div', { class: 'editor-head' },
      h('a', { href: '#/library/' + type, class: 'btn ghost sm' }, '← ', T.label),
      h('span', { class: 'chip type', style: { background: typeColor(type) } }, T.singular),
      nameIn,
      h('div', { class: 'actions' }, ...useActions, saveBtn, moreBtn)));

    // ---- panel de metadatos
    const meta = h('div', { class: 'card card-pad meta' });
    const fieldEls = {};
    meta.append(h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'ID / nombre de fichero'), idIn,
      h('div', { class: 'help mono' })));
    const pathHelp = meta.querySelector('.help');
    const updPath = () => { pathHelp.textContent = 'library/' + C.pathFor(Object.assign({}, draft, { id: draft.id || '…' })); };
    updPath();
    idIn.addEventListener('input', updPath);
    nameIn.addEventListener('input', updPath);
    C.FIELDS[type].filter((f) => f.key !== 'name').forEach((f) => {
      const w = fieldWidget(f, draft, (k) => {
        markDirty();
        if (k === 'global' && fieldEls.applyTo) fieldEls.applyTo.classList.toggle('hidden', !!draft.global);
        if (k === 'bool' || f.kind === 'bool') { const s = el.querySelector('.check .small'); if (s) s.textContent = draft[f.key] ? 'Sí' : 'No'; }
      });
      const el = h('div', { class: 'field' },
        h('div', { class: 'lbl' }, f.label, f.required ? h('span', { class: 'req' }, '*') : null), w, f.help ? h('div', { class: 'help' }, f.help) : null);
      fieldEls[f.key] = el;
      meta.append(el);
    });
    if (type === 'instruction' && draft.global && fieldEls.applyTo) fieldEls.applyTo.classList.add('hidden');

    // ---- cuerpo
    let tab = 'edit';
    const ta = h('textarea', { class: 'code', spellcheck: 'false', value: draft.body, placeholder: 'Escribe en Markdown…', oninput: () => { draft.body = ta.value; markDirty(); updVars(); } });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); draft.body = ta.value; markDirty(); }
    });
    const preview = h('div', { class: 'preview md hidden' });
    const outPrev = h('div', { class: 'preview hidden' });
    const varsBox = h('div', { class: 'chips' });
    const updVars = () => {
      varsBox.innerHTML = '';
      if (type !== 'prompt' && type !== 'agent') return;
      const vars = C.extractVars(draft.body);
      if (vars.length) varsBox.append(h('span', { class: 'small muted' }, 'Variables:'), ...vars.map((v) => h('span', { class: 'chip accent var-chip', title: v.placeholder }, v.name)));
      else if (type === 'prompt') varsBox.append(h('span', { class: 'small muted' }, 'Tip: usa {{variable}} o {{variable: ayuda}} para campos rellenables'));
    };
    const updPreview = () => {
      preview.innerHTML = md(draft.body);
      outPrev.innerHTML = '';
      outPrev.append(exportPreview(draft));
    };
    const tabs = h('div', { class: 'body-tabs' });
    const setTab = (t) => {
      tab = t;
      Array.from(tabs.querySelectorAll('button[data-t]')).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
      ta.classList.toggle('hidden', t !== 'edit'); preview.classList.toggle('hidden', t !== 'preview'); outPrev.classList.toggle('hidden', t !== 'out');
      if (t !== 'edit') updPreview();
    };
    const insertMenu = h('button', { class: 'btn sm ghost', onclick: () => menu(insertMenu, snippets(type).map((s) => ({ label: s.label, desc: s.desc, onClick: () => { ta.focus(); ta.setRangeText(s.text, ta.selectionStart, ta.selectionEnd, 'end'); draft.body = ta.value; markDirty(); updVars(); } })), { align: 'right' }) }, icon('wand', 14), h('span', null, 'Insertar'));
    tabs.append(
      h('button', { 'data-t': 'edit', class: 'on', onclick: () => setTab('edit') }, '✏️ ', C.BODY_LABEL[type]),
      h('button', { 'data-t': 'preview', onclick: () => setTab('preview') }, '👁 Vista previa'),
      h('button', { 'data-t': 'out', onclick: () => setTab('out') }, '📦 Cómo se exporta'),
      h('div', { class: 'right' }, varsBox, insertMenu));
    const bodyCard = h('div', { class: 'card body-card' }, tabs, ta, preview, outPrev);

    const side = h('div', { class: 'col', style: { gap: '14px' } }, bodyCard);
    if (existing) {
      const used = C.usagesOf(S.lib, type, existing.id);
      if (used.length) side.append(h('div', { class: 'card card-pad' }, h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, '🔗 Se usa en'), h('div', { class: 'chips' }, ...used.map((u) => h('a', { href: '#', class: 'chip', onclick: (e) => { e.preventDefault(); AIC.app.openItem(u); } }, (u.icon || C.TYPES[u.type].icon) + ' ' + u.name)))));
      if (type === 'skill' && existing._files && Object.keys(existing._files).length) side.append(h('div', { class: 'card card-pad' }, h('div', { style: { fontWeight: 700, marginBottom: '8px' } }, '📎 Recursos de la skill'), ...Object.keys(existing._files).map((r) => h('div', { class: 'mono small' }, '• ' + r))));
      const issues = C.lint({ config: S.lib.config, items: [existing, ...S.lib.items.filter((i) => i !== existing)] }).filter((i) => i.type === type && i.id === existing.id);
      if (issues.length) side.append(h('div', { class: 'card card-pad' }, h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, '🩺 Calidad'), ...issues.map((i) => h('div', { class: 'row small', style: { alignItems: 'flex-start', marginBottom: '4px' } }, h('span', { class: 'lvl ' + i.level, style: { width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flex: 'none' } }), i.msg))));
    }
    page.append(h('div', { class: 'editor' }, meta, side));
    updVars();
    root.append(page);
    if (!existing) setTimeout(() => nameIn.focus(), 0);
    AIC.app.dirty = () => dirty;
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  };

  function snippets(type) {
    const common = [
      { label: 'Variable', desc: '{{nombre: ayuda}}', text: '{{variable: descripción}}' },
      { label: 'Sección de formato de salida', desc: 'Pide estructura concreta', text: '\n# Formato de salida\n- Responde en español.\n- Estructura: …\n- Longitud máxima: …\n' },
      { label: 'Sección de restricciones', desc: 'Límites y reglas', text: '\n# Restricciones\n- No inventes datos: si falta información, pregunta.\n- Indica supuestos explícitamente.\n' },
      { label: 'Ejemplo (few-shot)', desc: 'Entrada → salida esperada', text: '\n# Ejemplo\n**Entrada:** …\n\n**Salida esperada:**\n…\n' },
      { label: 'Checklist', desc: 'Lista de verificación', text: '\n- [ ] …\n- [ ] …\n' },
      { label: 'Referencia a fichero (Copilot)', desc: '#file:ruta', text: '#file:ruta/al/fichero' },
      { label: 'Selección actual (Copilot)', desc: '{{selection}} → ${selection}', text: '{{selection}}' }
    ];
    if (type === 'agent') common.unshift({ label: 'Estructura de agente', desc: 'Misión, proceso, reglas, salida', text: TEMPLATES.agent });
    if (type === 'skill') common.unshift({ label: 'Estructura de skill', desc: 'Cuándo, procedimiento, checklist', text: TEMPLATES.skill });
    return common;
  }

  /* Vista previa de exportación del item actual */
  function exportPreview(item) {
    const lib = { config: S.lib.config, items: [...S.lib.items.filter((i) => !(i.type === item.type && i.id === item.id)), C.normalizeItem(C.clone(Object.assign({}, item, { id: item.id || 'nuevo' }))) ] };
    const id = item.id || 'nuevo';
    const files = [];
    const keep = (arr, pred) => arr.filter(pred).forEach((f) => files.push(f));
    const isMine = (p) => p.includes('/' + id + '.') || p.includes('/' + id + '/') || p.endsWith('/' + id + '.md') || p.includes('/agent-' + id) || p.includes('/skill-' + id);
    if (item.type === 'instruction' && item.global) {
      keep(C.exportCopilot(lib), (f) => f.path === '.github/copilot-instructions.md');
      keep(C.exportClaude(lib), (f) => f.path === 'CLAUDE.md');
    } else if (item.type === 'mcp') {
      keep(C.exportCopilot(lib), (f) => f.path === '.vscode/mcp.json');
      keep(C.exportClaude(lib), (f) => f.path === '.mcp.json');
    } else {
      keep(C.exportCopilot(lib), (f) => isMine(f.path));
      keep(C.exportClaude(lib), (f) => isMine(f.path));
      keep(C.exportCursor(lib), (f) => isMine(f.path) && !f.path.startsWith('docs/'));
      if (item.type === 'agent') keep(C.exportM365(lib, { allAgents: true }), (f) => isMine(f.path) && f.content);
    }
    const wrap = h('div');
    if (!files.length) { wrap.append(h('div', { class: 'muted' }, 'Sin salida de exportación para este elemento.')); return wrap; }
    let cur = 0;
    const code = h('pre', { class: 'code-view' });
    const tabs = h('div', { class: 'chips', style: { marginBottom: '10px' } });
    const show = (i) => { cur = i; code.textContent = files[i].content; Array.from(tabs.children).forEach((c, j) => c.classList.toggle('accent', j === i)); };
    files.forEach((f, i) => tabs.append(h('span', { class: 'chip mono', style: { cursor: 'pointer' }, onclick: () => show(i) }, f.path)));
    wrap.append(tabs, h('div', { class: 'prompt-box' }, code, h('button', { class: 'btn sm copy', onclick: () => copy(files[cur].content) }, icon('copy', 13), h('span', null, 'Copiar'))));
    show(0);
    return wrap;
  }

  /* ======================================================== *
   * Usar un prompt (rellenar variables y copiar)
   * ======================================================== */
  V.usePrompt = function (p) {
    const vars = C.extractVars(p.body).filter((v) => !v.name.includes('.'));
    const values = {};
    const out = h('pre', { class: 'code-view', style: { maxHeight: '340px' } });
    let flavor = 'filled';
    const upd = () => {
      if (flavor === 'filled') out.textContent = C.render(p.body, values, { fallback: (n, ph) => `[${ph || n}]` });
      else if (flavor === 'copilot') out.textContent = C.convertVars(p.body, 'copilot');
      else if (flavor === 'm365') out.textContent = C.convertVars(C.render(p.body, values), 'm365');
      else if (flavor === 'agent') {
        const a = p.agent ? S.get('agent', p.agent) : null;
        const body = C.render(p.body, values, { fallback: (n, ph) => `[${ph || n}]` });
        out.textContent = a ? `${C.composeAgent(S.lib, a)}\n\n---\n\n${body}` : body;
      }
    };
    const fields = vars.map((v) => h('label', { class: 'field' }, h('div', { class: 'lbl mono' }, v.name),
      h('textarea', { rows: 2, placeholder: v.placeholder || '', oninput: (e) => { values[v.name] = e.target.value; upd(); } })));
    const seg = h('div', { class: 'btn-group', style: { marginBottom: '10px' } });
    [['filled', 'Rellenado'], ['m365', 'Copilot M365'], ['copilot', 'Copilot (prompt file)'], ['agent', p.agent ? 'Con su agente' : 'Texto plano']].forEach(([k, l]) => {
      seg.append(h('button', { class: 'btn sm' + (k === flavor ? ' on' : ''), onclick: (e) => { flavor = k; Array.from(seg.children).forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); upd(); } }, l));
    });
    upd();
    modal({
      title: p.name, titleIcon: p.icon || '💬', size: 'wide',
      body: h('div', { class: 'grid', style: { gridTemplateColumns: vars.length ? '1fr 1.4fr' : '1fr', alignItems: 'start' } },
        vars.length ? h('div', null, h('div', { class: 'muted small', style: { marginBottom: '10px' } }, p.description), ...fields) : null,
        h('div', null, seg, out)),
      foot: (close) => [
        h('span', { class: 'muted small', style: { marginRight: 'auto' } }, 'En Copilot (VS Code) también puedes escribir ', h('code', null, '/' + p.id), ' tras exportar.'),
        btn('Abrir Copilot M365', () => window.open('https://m365.cloud.microsoft/chat', '_blank'), { icon: 'export' }),
        btn('Copiar', () => { copy(out.textContent); close(); }, { cls: 'primary', icon: 'copy' })
      ]
    });
  };

  /* ======================================================== *
   * Usar / desplegar un agente
   * ======================================================== */
  V.useAgent = function (a, anchor) {
    menu(anchor, [
      { icon: '📋', label: 'Copiar system prompt completo', desc: 'Instrucciones + skills + conocimiento, para cualquier IA', onClick: () => copy(C.composeAgent(S.lib, C.normalizeItem(C.clone(a)))) },
      { icon: '🟦', label: 'Copilot M365 · Agent Builder', desc: 'Ver los campos para crear el agente sin código', onClick: () => agentBuilderModal(a) },
      { icon: '📦', label: 'Descargar paquete M365 (.zip)', desc: 'manifest + declarativeAgent.json + iconos', onClick: () => V.downloadM365Package(a) },
      { icon: '🐙', label: 'Copiar .agent.md para GitHub Copilot', desc: '.github/agents/' + a.id + '.agent.md', onClick: () => { const f = C.exportCopilot({ config: S.lib.config, items: [...S.lib.items.filter((i) => !(i.type === 'agent' && i.id === a.id)), C.normalizeItem(C.clone(a))] }).find((x) => x.path === `.github/agents/${a.id}.agent.md`); copy(f ? f.content : ''); } }
    ], { align: 'right' });
  };
  function agentBuilderModal(a) {
    const it = C.normalizeItem(C.clone(a));
    const pkg = C.m365Package(S.lib, it);
    const fieldBox = (title, text) => h('div', { style: { marginBottom: '14px' } }, h('div', { class: 'row', style: { marginBottom: '4px' } }, h('b', null, title), h('span', { class: 'muted small' }, text.length + ' car.'), h('div', { class: 'grow' }), btn('Copiar', () => copy(text), { cls: 'sm', icon: 'copy' })), h('pre', { class: 'code-view', style: { maxHeight: '220px' } }, text));
    modal({
      title: 'Crear en Copilot M365 (Agent Builder)', titleIcon: '🟦', size: 'wide',
      body: [
        h('div', { class: 'callout info', style: { marginBottom: '14px' } }, 'ℹ️', h('div', null, 'En Microsoft 365 Copilot ve a ', h('b', null, 'Agentes → Crear agente → Configurar'), ' y copia cada campo. Las skills y el conocimiento se incluyen dentro de las instrucciones (límite 8000 caracteres).')),
        fieldBox('Nombre', it.name), fieldBox('Descripción', it.description), fieldBox('Instrucciones', pkg.declarativeAgent.instructions),
        it.starters.length ? fieldBox('Conversation starters', it.starters.join('\n')) : null,
        (it.sharepointUrls.length || it.capabilities.length) ? h('div', null, h('b', null, 'Conocimiento y capacidades'), h('ul', null, ...it.sharepointUrls.map((u) => h('li', null, '📁 ' + u)), ...it.capabilities.map((c) => h('li', null, '✅ ' + label(C.M365_CAPS, c))))) : null
      ],
      foot: (close) => [btn('Descargar paquete .zip', () => V.downloadM365Package(a), { icon: 'download' }), btn('Abrir Copilot M365', () => window.open('https://m365.cloud.microsoft/chat', '_blank'), { cls: 'primary', icon: 'export' }), btn('Cerrar', () => close(), { cls: 'ghost' })]
    });
  }
  V.downloadM365Package = async function (a) {
    const it = C.normalizeItem(C.clone(a));
    const pkg = C.m365Package(S.lib, it);
    const files = [
      { path: 'manifest.json', data: JSON.stringify(pkg.manifest, null, 2) },
      { path: 'declarativeAgent.json', data: JSON.stringify(pkg.declarativeAgent, null, 2) }
    ];
    for (const ic of pkg.icons) files.push({ path: ic.name, data: await AIC.iconPng(ic) });
    AIC.download(`${it.id}-m365-appPackage.zip`, AIC.zip(files));
    toast('Paquete descargado: súbelo como app personalizada o ábrelo con Agents Toolkit', 'ok', 4000);
  };
})();
