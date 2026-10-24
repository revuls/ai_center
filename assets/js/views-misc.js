/* AI Center · views-misc.js — exportar, salud, ajustes, importar, guía */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, toast, modal, copy, md, download, confirmDialog, typeColor } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  const V = (AIC.views = AIC.views || {});
  const go = (x) => AIC.app.go(x);

  const TARGET_ICO = { copilot: '🐙', m365: '🟦', claude: '🟣', cursor: '⬛', generic: '🌐' };
  const HOWTO = {
    copilot: [
      'Copia el contenido en la raíz de tu repositorio y haz commit.',
      'VS Code: los **custom agents** aparecen en el selector de agentes del chat; los prompts con `/nombre`; los workflows con `/wf-nombre` (modo agente).',
      'Las **skills** (`.github/skills`) e **instructions** se aplican automáticamente; revisa `.vscode/mcp.json` para arrancar los MCP.',
      '**Copilot coding agent** y **Copilot CLI** leen `AGENTS.md` y `.github/copilot-instructions.md`: asígnale un issue «Ejecuta el workflow X».'
    ],
    m365: [
      'Sin código: abre `m365/agents/<id>/AGENT-BUILDER.md` y copia los campos en **Copilot → Agentes → Crear agente**.',
      'Con paquete: comprime `appPackage/` y súbelo como app personalizada en Teams, o ábrelo con **Microsoft 365 Agents Toolkit**.',
      '`m365/PROMPTS.md` contiene los prompts listos para Copilot Chat, Word, Outlook y Teams.',
      'Los workflows se ejecutan guiados desde el **Ejecutor** de AI Center (modo manual).'
    ],
    claude: ['Copia en la raíz del repo. `CLAUDE.md` importa `AGENTS.md`.', 'Subagentes en `.claude/agents`, comandos `/nombre` y `/wf-nombre`, skills en `.claude/skills`, MCP en `.mcp.json`.'],
    cursor: ['Copia en la raíz del repo. Reglas en `.cursor/rules/*.mdc`, comandos en `.cursor/commands`, MCP en `.cursor/mcp.json`.'],
    generic: ['`ai/agents/*.md` contienen system prompts completos para pegar en cualquier IA.', '`ai/workflows/*.md` son runbooks que cualquier agente con herramientas puede seguir de principio a fin.']
  };

  async function materialize(files) {
    const out = [];
    for (const f of files) {
      if (f.icon) out.push({ path: f.path, data: await AIC.iconPng(f.icon) });
      else out.push({ path: f.path, data: f.content });
    }
    return out;
  }
  V.materialize = materialize;

  /* ======================================================== *
   * Exportar
   * ======================================================== */
  V.exporter = function (root) {
    const st = { targets: new Set(['copilot', 'm365']), scope: 'all', tag: '', ids: new Set(), sel: 0 };
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '📦 Exportar a tus IAs'), h('p', null, 'Genera los ficheros nativos de cada herramienta a partir de la librería. Escríbelos directamente en la carpeta de tu repositorio o descárgalos en ZIP. Repite cuando cambie la librería: el resultado es determinista.'))));
    const targets = h('div', { class: 'grid cols-auto', style: { marginBottom: '18px' } });
    Object.keys(C.EXPORTERS).forEach((k) => {
      const E = C.EXPORTERS[k];
      const el = h('div', { class: 'card target-card' + (st.targets.has(k) ? ' on' : ''), onclick: () => { st.targets.has(k) ? st.targets.delete(k) : st.targets.add(k); el.classList.toggle('on'); draw(); } },
        h('div', { class: 't-ico' }, TARGET_ICO[k]), h('div', null, h('div', { style: { fontWeight: 700 } }, E.label), h('div', { class: 'muted small' }, E.desc)));
      targets.append(el);
    });
    page.append(targets);
    const tags = C.uniq(S.lib.items.flatMap((i) => i.tags)).sort();
    const scopeSel = h('select', { style: { width: 'auto' }, onchange: (e) => { st.scope = e.target.value; pickBox.classList.toggle('hidden', st.scope !== 'pick'); tagSel.classList.toggle('hidden', st.scope !== 'tag'); draw(); } },
      h('option', { value: 'all' }, 'Toda la librería (excepto obsoletos)'), h('option', { value: 'tag' }, 'Por etiqueta'), h('option', { value: 'pick' }, 'Selección manual'));
    const tagSel = h('select', { class: 'hidden', style: { width: 'auto' }, onchange: (e) => { st.tag = e.target.value; draw(); } }, h('option', { value: '' }, '—'), ...tags.map((t) => h('option', { value: t }, '#' + t)));
    const pickBox = h('div', { class: 'card card-pad hidden', style: { marginBottom: '14px', maxHeight: '260px', overflow: 'auto' } },
      ...C.TYPE_ORDER.filter((t) => S.all(t).length).map((t) => h('div', { style: { marginBottom: '8px' } }, h('div', { class: 'small', style: { fontWeight: 700, marginBottom: '4px' } }, C.TYPES[t].icon + ' ' + C.TYPES[t].label),
        h('div', { class: 'row wrap' }, ...S.all(t).map((it) => h('label', { class: 'check small', style: { marginRight: '12px' } }, h('input', { type: 'checkbox', onchange: (e) => { const k = S.keyOf(it); e.target.checked ? st.ids.add(k) : st.ids.delete(k); draw(); } }), it.name))))));
    page.append(h('div', { class: 'toolbar' }, h('b', null, 'Alcance:'), scopeSel, tagSel, h('div', { class: 'grow' }),
      btn('Escribir en carpeta…', () => writeFolder(), { cls: 'primary', icon: 'folder', disabled: !S.fsSupported, title: S.fsSupported ? 'Elige la raíz de tu repositorio' : 'Requiere Chrome/Edge' }),
      btn('Descargar ZIP', () => zipIt(), { icon: 'download' })));
    page.append(pickBox);
    const how = h('div');
    const tree = h('div', { class: 'card card-pad tree' });
    const code = h('pre', { class: 'code-view', style: { minHeight: '420px' } });
    const codeWrap = h('div', { class: 'prompt-box' }, code, h('button', { class: 'btn sm copy', onclick: () => { const f = files[st.sel]; if (f && f.content) copy(f.content); } }, icon('copy', 13), h('span', null, 'Copiar')));
    page.append(how, h('div', { class: 'grid', style: { gridTemplateColumns: '340px 1fr', alignItems: 'start' } }, tree, codeWrap));
    root.append(page);
    let files = [];
    function opts() {
      if (st.scope === 'tag') return { tag: st.tag || undefined };
      if (st.scope === 'pick') {
        // incluye dependencias de los seleccionados (skills/conocimiento/mcp de agentes, piezas de workflows)
        const ids = new Set(st.ids);
        const L = S.index();
        const addDeps = (it) => {
          if (!it) return;
          if (it.type === 'agent') { it.skills.forEach((x) => ids.add('skill:' + x)); it.knowledge.forEach((x) => ids.add('knowledge:' + x)); it.mcp.forEach((x) => ids.add('mcp:' + x)); }
          if (it.type === 'prompt' && it.agent) { ids.add('agent:' + it.agent); addDeps(L.get('agent', it.agent)); }
          if (it.type === 'workflow') it.nodes.forEach((n) => { if (n.agent) { ids.add('agent:' + n.agent); addDeps(L.get('agent', n.agent)); } if (n.prompt) ids.add('prompt:' + n.prompt); C.arr(n.skills).forEach((x) => ids.add('skill:' + x)); C.arr(n.knowledge).forEach((x) => ids.add('knowledge:' + x)); C.arr(n.mcp).forEach((x) => ids.add('mcp:' + x)); });
        };
        Array.from(st.ids).forEach((k) => { const [t, i] = k.split(':'); addDeps(L.get(t, i)); });
        S.all('instruction').filter((i) => i.global).forEach((i) => ids.add(S.keyOf(i)));
        return { ids: Array.from(ids) };
      }
      return {};
    }
    function draw() {
      files = C.exportTargets(S.lib, Array.from(st.targets), opts());
      how.innerHTML = '';
      if (st.targets.size) how.append(h('div', { class: 'grid cols-2', style: { marginBottom: '14px' } }, ...Array.from(st.targets).map((t) => h('div', { class: 'callout info' }, h('span', { style: { fontSize: '18px' } }, TARGET_ICO[t]),
        h('div', null, h('b', null, 'Cómo usarlo en ' + C.EXPORTERS[t].label), h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, ...HOWTO[t].map((x) => h('li', { class: 'small', html: md(x).replace(/^<p>|<\/p>$/g, '') }))))))));
      tree.innerHTML = '';
      if (!files.length) { tree.append(h('div', { class: 'muted' }, 'Elige al menos un destino.')); code.textContent = ''; return; }
      tree.append(h('div', { class: 'small muted', style: { marginBottom: '6px' } }, files.length + ' ficheros'));
      let lastDirs = [];
      files.forEach((f, i) => {
        const parts = f.path.split('/');
        const dirs = parts.slice(0, -1);
        dirs.forEach((d, j) => { if (lastDirs[j] !== d) { tree.append(h('div', { class: 'tr dir', style: { paddingLeft: 8 + j * 14 + 'px' } }, '📁 ' + d)); lastDirs = dirs.slice(0, j + 1).concat([]); } });
        lastDirs = dirs;
        tree.append(h('div', { class: 'tr' + (i === st.sel ? ' sel' : ''), style: { paddingLeft: 8 + dirs.length * 14 + 'px' }, onclick: () => { st.sel = i; draw(); } }, f.icon ? '🖼' : '📄', ' ', parts[parts.length - 1]));
      });
      st.sel = Math.min(st.sel, files.length - 1);
      const f = files[st.sel];
      code.textContent = f.icon ? `(Icono PNG ${f.icon.size}×${f.icon.size} generado automáticamente)` : f.content;
    }
    async function writeFolder() {
      if (!files.length) return;
      let dir;
      try { dir = await window.showDirectoryPicker({ id: 'aic-export', mode: 'readwrite' }); } catch (e) { return; }
      const ok = await confirmDialog(h('div', null, 'Se escribirán ', h('b', null, files.length + ' ficheros'), ' en «', h('b', null, dir.name), '». Los ficheros con el mismo nombre se sobrescribirán (los demás no se tocan).'), { title: 'Escribir exportación', ok: 'Escribir' });
      if (!ok) return;
      try { await S.writeFilesTo(dir, await materialize(files)); toast(`✅ ${files.length} ficheros escritos en ${dir.name}`, 'ok', 4000); }
      catch (e) { toast('Error: ' + e.message, 'err', 5000); }
    }
    async function zipIt() {
      if (!files.length) return;
      download(`ai-center-${Array.from(st.targets).join('-')}.zip`, AIC.zip(await materialize(files)));
    }
    draw();
  };

  /* ======================================================== *
   * Salud
   * ======================================================== */
  V.health = function (root) {
    const issues = C.lint(S.lib);
    const err = issues.filter((i) => i.level === 'error'); const warn = issues.filter((i) => i.level === 'warn'); const info = issues.filter((i) => i.level === 'info');
    const score = Math.max(0, Math.round(100 - err.length * 8 - warn.length * 2.5 - info.length * 0.5));
    const color = score > 85 ? 'var(--ok)' : score > 60 ? 'var(--warn)' : 'var(--err)';
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '🩺 Salud de la librería'), h('p', null, 'Validación automática: referencias rotas, descripciones pobres, límites de Copilot M365, formato de skills, secretos en claro, workflows sin salida o con bucles peligrosos…'))));
    const R = 42; const L = 2 * Math.PI * R;
    page.append(h('div', { class: 'grid cols-4', style: { marginBottom: '20px' } },
      h('div', { class: 'card card-pad row', style: { gap: '16px' } },
        h('div', { html: `<svg class="score-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--bg-sunken)" stroke-width="10"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(L * score) / 100} ${L}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" font-size="24" font-weight="800" fill="var(--text)">${score}</text></svg>` }),
        h('div', null, h('div', { style: { fontWeight: 700 } }, 'Puntuación'), h('div', { class: 'muted small' }, score > 85 ? '¡Muy bien!' : score > 60 ? 'Mejorable' : 'Necesita atención'))),
      stat('Errores', err.length, 'var(--err)'), stat('Avisos', warn.length, 'var(--warn)'), stat('Sugerencias', info.length, 'var(--info)')));
    const byStatus = {}; S.lib.items.forEach((i) => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    page.append(h('div', { class: 'row wrap', style: { marginBottom: '16px' } }, h('b', null, 'Estado:'), ...C.STATUS.map((s) => h('span', { class: 'chip st-' + s.value }, s.label + ': ' + (byStatus[s.value] || 0)))));
    const list = h('div', { class: 'card' });
    if (!issues.length) list.append(h('div', { class: 'empty' }, h('div', { class: 'e-ico' }, '💚'), 'Todo en orden. ¡Buen trabajo!'));
    [...err, ...warn, ...info].forEach((i) => {
      const it = S.get(i.type, i.id);
      list.append(h('div', { class: 'issue', onclick: () => it && AIC.app.openItem(it) }, h('span', { class: 'lvl ' + i.level }),
        h('div', { class: 'grow' }, h('div', null, h('b', null, (it && it.icon) || C.TYPES[i.type].icon, ' ', i.name || i.id), h('span', { class: 'muted small' }, ' · ' + C.TYPES[i.type].singular)), h('div', { class: 'small' }, i.msg))));
    });
    page.append(list);
    root.append(page);
    function stat(l, n, c) { return h('div', { class: 'card stat', style: { '--tc': c, cursor: 'default' } }, h('div', { class: 's-ico' }, n ? '●' : '✓'), h('div', null, h('div', { class: 's-num' }, n), h('div', { class: 's-lbl' }, l))); }
  };

  /* ======================================================== *
   * Ajustes
   * ======================================================== */
  V.settings = function (root) {
    const cfg = C.clone(S.lib.config);
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '⚙ Ajustes'), h('p', null, 'La configuración del espacio se guarda en library/ai-center.json (compartida con el equipo). Tus preferencias personales se quedan en este navegador.'))));
    const fld = (l, el, help) => h('div', { class: 'field' }, h('div', { class: 'lbl' }, l), el, help ? h('div', { class: 'help' }, help) : null);
    const inp = (obj, k, ph) => h('input', { type: 'text', value: obj[k] || '', placeholder: ph || '', oninput: (e) => { obj[k] = e.target.value; } });
    const ws = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '🏢 Espacio de trabajo (compartido)'),
      fld('Nombre', inp(cfg, 'workspace', 'AI Center · Equipo X')),
      fld('Descripción', h('textarea', { rows: 2, value: cfg.description || '', oninput: (e) => { cfg.description = e.target.value; } })),
      fld('IAs objetivo por defecto', V.fieldWidget({ key: 'defaultTargets', kind: 'multi', options: C.TARGETS }, cfg, () => {})),
      h('div', { class: 'section-title' }, '🟦 Datos para paquetes de Copilot M365'),
      fld('Organización (developer.name)', inp(cfg, 'organization', 'Mi Empresa')),
      fld('Web', inp(cfg, 'websiteUrl', 'https://…')), fld('Privacidad', inp(cfg, 'privacyUrl', 'https://…/privacy')), fld('Términos de uso', inp(cfg, 'termsUrl', 'https://…/terms')),
      fld('Color de acento', h('input', { type: 'text', value: cfg.accentColor || '#6E56CF', oninput: (e) => { cfg.accentColor = e.target.value; } })),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Guardar espacio', async () => { await S.saveConfig(cfg); toast('Configuración guardada', 'ok'); }, { cls: 'primary', icon: 'save' })));
    const me = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '👤 Preferencias personales'),
      fld('Tu nombre (autoría por defecto)', h('input', { type: 'text', value: S.prefs.author, oninput: (e) => { S.prefs.author = e.target.value; S.savePrefs(); } })),
      fld('Tema', h('select', { onchange: (e) => { S.prefs.theme = e.target.value; S.savePrefs(); AIC.app.applyTheme(); AIC.app.renderTopbar(); } }, ...[['auto', 'Automático (sistema)'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => h('option', { value: v, selected: S.prefs.theme === v }, l)))),
      fld('Clave de API guardada', h('div', { class: 'row' }, h('span', { class: 'small muted' }, S.prefs.llm.apiKey && S.prefs.llm.remember ? '•••• guardada en este navegador' : 'Ninguna'), S.prefs.llm.apiKey ? btn('Olvidar', () => { S.prefs.llm.apiKey = ''; S.prefs.llm.remember = false; S.savePrefs(); toast('Clave olvidada'); AIC.app.route(); }, { cls: 'sm' }) : null)));
    const storage = h('div', { class: 'card card-pad' }, h('h3', { style: { marginTop: 0 } }, '💾 Ficheros y copias'),
      h('p', { class: 'small muted', style: { marginTop: 0 } }, S.mode === 'folder' ? `Conectado a «${S.rootDir.name}». Todo se guarda en ficheros y se regenera library/library.bundle.js automáticamente.` : 'Sin carpeta conectada: estás viendo library/library.bundle.js. Conecta la carpeta para editar los ficheros directamente.'),
      h('div', { class: 'row wrap' },
        S.fsSupported ? btn(S.mode === 'folder' ? 'Cambiar carpeta' : 'Conectar carpeta', () => S.connectFolder().then(() => { toast('Carpeta conectada', 'ok'); AIC.app.route(); }).catch((e) => e.name !== 'AbortError' && toast(e.message, 'err')), { icon: 'folder', cls: 'primary' }) : null,
        btn('Descargar librería (ZIP)', () => V.downloadLibraryZip(), { icon: 'download' }),
        btn('Descargar library.bundle.js', () => download('library.bundle.js', C.serializeBundle(S.lib), 'text/javascript'), { icon: 'download', title: 'Para compartir la librería sin carpeta: colócalo en library/' }),
        btn('Importar…', () => V.importDialog(), { icon: 'upload' }),
        S.mode !== 'folder' && S.localChanges() ? btn('Descartar borradores locales', async () => { if (await confirmDialog('Se perderán los cambios hechos en este navegador que no estén en ficheros.', { danger: true, ok: 'Descartar' })) { S.clearOverlay(); S.loadFromBundle(); S.emit('load'); toast('Borradores descartados'); } }, { cls: 'danger' }) : null));
    page.append(h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, ws, h('div', { class: 'col', style: { gap: '14px' } }, me, storage)));
    root.append(page);
  };

  V.downloadLibraryZip = function () {
    const files = C.libraryToFiles(S.lib).map((f) => ({ path: 'library/' + f.path, data: f.content }));
    files.push({ path: 'library/library.bundle.js', data: C.serializeBundle(S.lib) });
    download(`ai-center-library-${C.today()}.zip`, AIC.zip(files));
    toast('Descomprime el ZIP sobre la carpeta del framework (sustituye library/)', 'ok', 4500);
  };

  /* ======================================================== *
   * Importar
   * ======================================================== */
  function fromCopilotVars(text) { return String(text || '').replace(/\$\{input:([\w-]+)(?::([^}]*))?\}/g, (_, n, ph) => ph ? `{{${n}: ${ph}}}` : `{{${n}}}`).replace(/\$\{selection\}/g, '{{selection}}').replace(/\$\{file\}/g, '{{file}}'); }
  function normalizeImported(f, defaultType) {
    let p = (f.path || f.name).replace(/\\/g, '/');
    if (/\.chatmode\.md$/i.test(p)) p = p.replace(/\.chatmode\.md$/i, '.agent.md');
    if (/\.mdc$/i.test(p)) p = p.replace(/\.mdc$/i, '.instructions.md');
    if (/(^|\/)copilot-instructions\.md$/i.test(p)) p = 'instructions/copilot-global.instructions.md';
    let content = f.content;
    if (/\.(prompt|agent)\.md$/i.test(p)) content = fromCopilotVars(content);
    if (/(^|\/)SKILL\.md$/.test(p)) { const m = p.match(/([^/]+)\/SKILL\.md$/); p = 'skills/' + (m ? m[1] : C.slugify(f.name)) + '/SKILL.md'; }
    else if (!C.classifyPath(p) && /\.md$/i.test(p)) {
      const base = p.split('/').pop().replace(/\.md$/i, '');
      const ext = { knowledge: '.md', prompt: '.prompt.md', agent: '.agent.md', instruction: '.instructions.md' }[defaultType];
      p = (defaultType === 'knowledge' ? 'knowledge/' : '') + C.slugify(base) + ext;
    } else {
      const c = C.classifyPath(p);
      if (c && c.type !== 'skill-file' && c.type !== 'knowledge') p = C.pathFor({ type: c.type, id: c.id });
    }
    return { path: p, content };
  }
  V.importDialog = function () {
    let staged = [];
    let defType = 'knowledge';
    const list = h('div', { style: { maxHeight: '300px', overflow: 'auto', marginTop: '12px' } });
    const dz = h('div', { class: 'dropzone' }, h('div', { style: { fontSize: '30px' } }, '📥'), h('div', null, 'Arrastra aquí ficheros o carpetas'),
      h('div', { class: 'small', style: { marginTop: '4px' } }, '.prompt.md · .agent.md · .chatmode.md · .instructions.md · SKILL.md · .mdc · .workflow.json · .mcp.json · library.bundle.js · copias JSON'),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
        btn('Elegir ficheros', async () => addFiles(await AIC.pickFiles('.md,.mdc,.json,.js,.txt', true)), { cls: 'sm' }),
        btn('Elegir carpeta', async () => {
          if (S.fsSupported) { try { const d = await window.showDirectoryPicker({ id: 'aic-import' }); addFiles(await readDir(d, '')); } catch (e) { /* cancel */ } }
          else toast('Usa Chrome/Edge para importar carpetas', 'err');
        }, { cls: 'sm' })));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('hover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('hover'));
    dz.addEventListener('drop', async (e) => {
      e.preventDefault(); dz.classList.remove('hover');
      const out = [];
      const items = Array.from(e.dataTransfer.items || []);
      for (const it of items) {
        const entry = it.webkitGetAsEntry && it.webkitGetAsEntry();
        if (entry) out.push(...await readEntry(entry, ''));
      }
      addFiles(out);
    });
    const typeSel = h('select', { style: { width: 'auto' }, onchange: (e) => { defType = e.target.value; redraw(); } }, ...[['knowledge', 'Conocimiento'], ['prompt', 'Prompt'], ['agent', 'Agente'], ['instruction', 'Instrucción']].map(([v, l]) => h('option', { value: v }, l)));
    let raw = [];
    function addFiles(files) {
      files.forEach((f) => {
        if (/\.js$/i.test(f.name || f.path) && /AIC_BUNDLE/.test(f.content)) { try { C.parseBundle(f.content).files.forEach((x) => raw.push({ path: x.path, content: x.content, keep: true })); } catch (e) { toast('Bundle inválido', 'err'); } return; }
        if (/\.json$/i.test(f.name || f.path) && /"ai-center-(bundle|backup)"/.test(f.content)) { try { JSON.parse(f.content).files.forEach((x) => raw.push({ path: x.path, content: x.content, keep: true })); } catch (e) { /* */ } return; }
        raw.push(f);
      });
      redraw();
    }
    function redraw() {
      staged = raw.map((f) => f.keep ? f : normalizeImported(f, defType));
      const lib = C.libraryFromFiles(staged);
      list.innerHTML = '';
      if (!lib.items.length) { if (raw.length) list.append(h('div', { class: 'muted small' }, 'No se reconoció ningún elemento.')); return; }
      list.append(h('div', { class: 'small muted', style: { marginBottom: '6px' } }, lib.items.length + ' elementos detectados'));
      lib.items.forEach((it) => list.append(h('div', { class: 'row small', style: { padding: '4px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { class: 'chip type', style: { background: typeColor(it.type) } }, C.TYPES[it.type].singular), h('b', null, it.name), h('span', { class: 'muted mono' }, it.id),
        S.get(it.type, it.id) ? h('span', { class: 'chip st-draft' }, 'sobrescribe') : h('span', { class: 'chip st-stable' }, 'nuevo'))));
    }
    modal({
      title: 'Importar a la librería', titleIcon: '📥', size: 'wide',
      body: h('div', null, h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Puedes importar ficheros de AI Center o directamente los de GitHub Copilot (.github/agents, prompts, instructions, chatmodes, skills), Claude o Cursor. Las variables ${input:x} se convierten a {{x}}.'),
        dz, h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', { class: 'small' }, 'Los .md sin sufijo se importan como:'), typeSel), list),
      foot: (close) => [btn('Cancelar', () => close(), { cls: 'ghost' }), btn('Importar', async () => {
        if (!staged.length) { toast('Añade ficheros', 'err'); return; }
        const n = await S.importFiles(staged);
        toast(`✅ ${n} elementos importados`, 'ok'); close();
      }, { cls: 'primary', icon: 'upload' })]
    });
  };
  async function readDir(dir, prefix) {
    const out = [];
    for await (const [name, hd] of dir.entries()) {
      if (name.startsWith('.') && !['.github', '.claude', '.cursor'].includes(name)) continue;
      if (name === 'node_modules') continue;
      if (hd.kind === 'directory') out.push(...await readDir(hd, prefix + name + '/'));
      else if (/\.(md|mdc|json|js)$/i.test(name)) { const f = await hd.getFile(); if (f.size < 768 * 1024) out.push({ name, path: prefix + name, content: await f.text() }); }
    }
    return out;
  }
  function readEntry(entry, prefix) {
    return new Promise((res) => {
      if (entry.isFile) entry.file(async (f) => res(/\.(md|mdc|json|js)$/i.test(f.name) ? [{ name: f.name, path: prefix + f.name, content: await f.text() }] : []), () => res([]));
      else if (entry.isDirectory) {
        const reader = entry.createReader(); const all = [];
        const read = () => reader.readEntries(async (ents) => {
          if (!ents.length) { const nested = await Promise.all(all.map((e) => readEntry(e, prefix + entry.name + '/'))); res(nested.flat()); return; }
          all.push(...ents); read();
        }, () => res([]));
        read();
      } else res([]);
    });
  }

  /* ======================================================== *
   * Guía
   * ======================================================== */
  V.guide = function (root, section) {
    const G = AIC.GUIDE || [];
    const cur = G.find((g) => g.id === section) || G[0];
    const page = h('div', { class: 'page' });
    page.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '📖 Guía y buenas prácticas'), h('p', null, 'Cómo trabajar con IA en el equipo usando AI Center, GitHub Copilot y Copilot M365.'))));
    const nav = h('div', { class: 'card', style: { padding: '8px', position: 'sticky', top: '0' } }, ...G.map((g) => h('a', { href: '#/guide/' + g.id, class: 'menu-item' + (g === cur ? ' sel' : ''), style: { textDecoration: 'none' } }, h('span', null, g.icon), h('span', null, g.title))));
    const content = h('div', { class: 'card card-pad md', html: cur ? md(cur.md, { vars: false }) : 'Sin contenido' });
    page.append(h('div', { class: 'grid', style: { gridTemplateColumns: '260px 1fr', alignItems: 'start' } }, nav, content));
    root.append(page);
  };
})();
