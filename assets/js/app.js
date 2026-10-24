/* AI Center · app.js — shell, navegación, paleta de comandos */
(function () {
  'use strict';
  const AIC = window.AIC;
  const { h, icon, btn, $, toast, modal, menu } = AIC;
  const C = AIC.core;
  const S = AIC.store;
  AIC.views = AIC.views || {};

  const app = {
    cleanup: null,
    dirty: null,          // función → true si hay cambios sin guardar en la vista
    suppressHash: false,
    lastHash: location.hash,

    async start() {
      this.applyTheme();
      this.renderShell();
      S.on((what) => { this.renderNav(); this.renderBanner(); if (what === 'load') this.route(); });
      window.addEventListener('hashchange', () => this.onHash());
      window.addEventListener('beforeunload', (e) => { if (this.dirty && this.dirty()) { e.preventDefault(); e.returnValue = ''; } });
      document.addEventListener('keydown', (e) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); this.palette(); }
      });
      await S.init();
    },

    /* ---------- Tema ---------- */
    applyTheme() {
      const t = S.prefs.theme;
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
      else delete document.documentElement.dataset.theme;
    },
    toggleTheme() {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      S.prefs.theme = dark ? 'light' : 'dark'; S.savePrefs(); this.applyTheme(); this.renderTopbar();
    },

    /* ---------- Shell ---------- */
    renderShell() {
      const root = $('#app');
      root.innerHTML = '';
      this.el = {
        nav: h('nav', { class: 'nav' }),
        storage: h('div', { class: 'storage' }),
        banner: h('div'),
        topbar: h('header', { class: 'topbar' }),
        view: h('div', { class: 'view', id: 'view' })
      };
      root.appendChild(h('div', { class: 'app', id: 'shell' },
        h('aside', { class: 'sidebar' },
          h('div', { class: 'brand', onclick: () => this.go('#/') },
            h('div', { class: 'brand-logo' }, 'AI'),
            h('div', null, h('div', { class: 'brand-name' }, 'AI Center'), h('div', { class: 'brand-sub', id: 'ws-name' }, S.lib.config.workspace))),
          this.el.nav, this.el.storage),
        h('main', { class: 'main' }, this.el.banner, this.el.topbar, this.el.view)));
      this.renderNav(); this.renderTopbar(); this.renderBanner();
    },
    renderNav() {
      const nav = this.el.nav; nav.innerHTML = '';
      const cur = location.hash || '#/';
      const link = (href, ico, label, count, color) => h('a', { href, class: (cur === href || (href !== '#/' && cur.startsWith(href + '/')) || (href !== '#/' && cur === href)) ? 'active' : '' },
        color ? h('span', { class: 'dot', style: { background: color } }) : h('span', { class: 'nav-ico' }, typeof ico === 'string' && ico.length < 4 ? ico : icon(ico)),
        h('span', null, label), count !== undefined ? h('span', { class: 'count' }, count) : null);
      const favs = S.prefs.favorites.filter((k) => S.lib.items.some((i) => S.keyOf(i) === k)).length;
      nav.append(
        link('#/', 'home', 'Inicio'),
        link('#/library/favs', 'star', 'Favoritos', favs || undefined),
        link('#/library/all', 'layout', 'Todo', S.lib.items.length),
        h('div', { class: 'nav-section' }, 'Librería'),
        ...C.TYPE_ORDER.map((t) => link('#/library/' + t, C.TYPES[t].icon, C.TYPES[t].label, S.all(t).length)),
        h('div', { class: 'nav-section' }, 'Ejecutar y compartir'),
        link('#/runs', 'play', 'Ejecuciones'),
        link('#/export', 'export', 'Exportar a IAs'),
        link('#/health', 'pulse', 'Salud', (() => { const n = C.lint(S.lib).filter((i) => i.level === 'error').length; return n || undefined; })()),
        h('div', { class: 'nav-section' }, 'Ayuda'),
        link('#/guide', 'book', 'Guía y buenas prácticas'),
        link('#/settings', 'settings', 'Ajustes')
      );
      const wsn = $('#ws-name'); if (wsn) wsn.textContent = S.lib.config.workspace;
      // almacenamiento
      const st = this.el.storage; st.innerHTML = '';
      st.className = 'storage' + (S.mode === 'folder' ? ' connected' : '');
      if (S.mode === 'folder') {
        st.append(h('div', { class: 'st-title' }, h('span', { class: 'st-dot' }), 'Carpeta conectada'),
          h('div', { class: 'st-desc' }, '📁 ', S.rootDir.name, S.rootDir !== S.libDir ? ' / library' : '', ' · guardado automático en ficheros'),
          h('div', { class: 'row' }, btn('Recargar', () => S.refresh().then(() => toast('Recargado desde disco')), { cls: 'sm', icon: 'refresh' }), btn('Desconectar', () => S.disconnect(), { cls: 'sm ghost' })));
      } else {
        const n = S.localChanges();
        st.append(h('div', { class: 'st-title' }, h('span', { class: 'st-dot' }), S.pendingReconnect ? 'Carpeta sin permiso' : 'Modo lectura (bundle)'),
          h('div', { class: 'st-desc' }, S.pendingReconnect ? `Pulsa para volver a conectar «${S.pendingReconnect.name}».` : (n ? `${n} cambio(s) solo en este navegador.` : 'Conecta la carpeta del framework para guardar en ficheros.')),
          S.fsSupported
            ? btn(S.pendingReconnect ? 'Reconectar carpeta' : 'Conectar carpeta', () => this.connect(), { cls: 'sm primary', icon: 'folder' })
            : h('div', { class: 'small muted' }, '⚠ Este navegador no permite escribir carpetas: usa Chrome/Edge o exporta en ZIP.'));
      }
    },
    renderTopbar() {
      const tb = this.el.topbar; tb.innerHTML = '';
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      tb.append(
        h('button', { class: 'btn ghost icon', style: { display: window.innerWidth < 820 ? '' : 'none' }, onclick: () => $('#shell').classList.toggle('nav-open') }, icon('menu')),
        h('button', { class: 'search-btn', onclick: () => this.palette() }, icon('search'), h('span', null, 'Buscar prompts, agentes, workflows… o acciones'), h('kbd', null, navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K')),
        h('div', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: (e) => this.newMenu(e.currentTarget) }, icon('plus'), h('span', null, 'Nuevo'), icon('chevron', 14)),
        h('button', { class: 'btn ghost icon', title: 'Cambiar tema', onclick: () => this.toggleTheme() }, icon(dark ? 'sun' : 'moon'))
      );
    },
    renderBanner() {
      const b = this.el.banner; b.innerHTML = '';
      if (S.mode !== 'folder' && S.localChanges()) {
        b.append(h('div', { class: 'banner' }, '💾', h('span', null, `Tienes ${S.localChanges()} cambio(s) guardados solo en este navegador.`),
          S.fsSupported ? btn('Guardar en carpeta', () => this.connect(), { cls: 'sm primary', icon: 'folder' }) : null,
          btn('Descargar ZIP de la librería', () => AIC.views.downloadLibraryZip(), { cls: 'sm', icon: 'download' })));
      }
    },
    async connect() {
      try { S.pendingReconnect ? await S.reconnect() : await S.connectFolder(); toast('Carpeta conectada: los cambios se guardan en ficheros', 'ok'); }
      catch (e) { if (e.name !== 'AbortError') toast(e.message, 'err', 5000); }
    },
    newMenu(anchor) {
      menu(anchor, [
        ...C.TYPE_ORDER.map((t) => ({ icon: C.TYPES[t].icon, label: C.TYPES[t].singular, desc: C.TYPES[t].help.split('.')[0], onClick: () => this.go(t === 'workflow' ? '#/workflow/new' : '#/new/' + t) })),
        '-',
        { icon: 'upload', label: 'Importar ficheros…', desc: '.md, .json, SKILL.md, bundle o backup', onClick: () => AIC.views.importDialog() }
      ], { align: 'right' });
    },

    /* ---------- Router ---------- */
    go(hash) { if (location.hash === hash) this.route(); else location.hash = hash; },
    async onHash() {
      if (this.suppressHash) { this.suppressHash = false; return; }
      if (this.dirty && this.dirty()) {
        const ok = await AIC.confirmDialog('Hay cambios sin guardar. ¿Salir igualmente?', { title: 'Cambios sin guardar', ok: 'Salir sin guardar', danger: true });
        if (!ok) { this.suppressHash = true; location.hash = this.lastHash; return; }
      }
      this.route();
    },
    route() {
      const hash = location.hash || '#/';
      this.lastHash = hash;
      const parts = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
      if (this.cleanup) { try { this.cleanup(); } catch (e) { /* */ } this.cleanup = null; }
      this.dirty = null;
      document.querySelectorAll('.popover').forEach((p) => p.remove());
      $('#shell') && $('#shell').classList.remove('nav-open');
      const v = this.el.view; v.innerHTML = ''; v.scrollTop = 0;
      v.style.overflow = '';
      const V = AIC.views;
      let r;
      try {
        switch (parts[0]) {
          case '': r = V.dashboard(v); break;
          case 'library': r = V.list(v, parts[1] || 'all'); break;
          case 'item': r = V.editor(v, parts[1], parts[2]); break;
          case 'new': r = V.editor(v, parts[1], null, parts[2]); break;
          case 'workflow': v.style.overflow = 'hidden'; r = V.workflow(v, parts[1]); break;
          case 'run': r = V.runner(v, parts[1], parts[2]); break;
          case 'runs': r = V.runs(v); break;
          case 'export': r = V.exporter(v); break;
          case 'health': r = V.health(v); break;
          case 'settings': r = V.settings(v); break;
          case 'guide': r = V.guide(v, parts[1]); break;
          default: r = V.dashboard(v);
        }
      } catch (e) {
        console.error(e);
        v.append(h('div', { class: 'page' }, h('div', { class: 'callout err' }, '⚠ ', h('div', null, h('b', null, 'Error al mostrar la vista. '), e.message))));
      }
      if (typeof r === 'function') this.cleanup = r;
      this.renderNav();
    },
    openItem(it) {
      S.touch(it);
      this.go(it.type === 'workflow' ? '#/workflow/' + encodeURIComponent(it.id) : `#/item/${it.type}/${encodeURIComponent(it.id)}`);
    },

    /* ---------- Paleta de comandos ---------- */
    palette() {
      if (document.querySelector('.palette')) return;
      const inp = h('input', { type: 'text', placeholder: 'Escribe para buscar… (↑↓ para moverte, Enter para abrir)', autofocus: true });
      const results = h('div', { class: 'results' });
      const actions = [
        ...C.TYPE_ORDER.map((t) => ({ label: 'Nuevo ' + C.TYPES[t].singular.toLowerCase(), ico: C.TYPES[t].icon, run: () => this.go(t === 'workflow' ? '#/workflow/new' : '#/new/' + t) })),
        { label: 'Exportar a GitHub Copilot / M365 / Claude…', ico: '📦', run: () => this.go('#/export') },
        { label: 'Revisar salud de la librería', ico: '🩺', run: () => this.go('#/health') },
        { label: 'Ver ejecuciones', ico: '▶️', run: () => this.go('#/runs') },
        { label: 'Importar ficheros', ico: '📥', run: () => AIC.views.importDialog() },
        { label: S.mode === 'folder' ? 'Recargar desde disco' : 'Conectar carpeta', ico: '📁', run: () => S.mode === 'folder' ? S.refresh() : this.connect() },
        { label: 'Cambiar tema claro/oscuro', ico: '🌓', run: () => this.toggleTheme() },
        { label: 'Guía y buenas prácticas', ico: '📖', run: () => this.go('#/guide') },
        { label: 'Ajustes', ico: '⚙️', run: () => this.go('#/settings') }
      ];
      let sel = 0; let flat = [];
      const draw = () => {
        const q = C.norm(inp.value);
        const score = (it) => {
          const hay = C.norm([it.name, it.id, it.description, ...(it.tags || [])].join(' '));
          if (!q) return 1;
          if (C.norm(it.name).startsWith(q)) return 3;
          if (C.norm(it.name).includes(q)) return 2;
          return q.split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0;
        };
        const items = S.lib.items.map((it) => ({ it, s: score(it) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, q ? 30 : 8).map((x) => x.it);
        const acts = actions.filter((a) => !q || C.norm(a.label).includes(q)).slice(0, q ? 6 : 5);
        flat = [...items.map((it) => ({ label: it.name, ico: it.icon || C.TYPES[it.type].icon, sub: C.TYPES[it.type].singular + ' · ' + it.description, run: () => this.openItem(it) })), ...acts];
        sel = Math.min(sel, Math.max(0, flat.length - 1));
        results.innerHTML = '';
        let i = 0;
        const row = (x) => {
          const idx = i++;
          return h('button', { class: 'menu-item' + (idx === sel ? ' sel' : ''), onmouseenter: () => { sel = idx; mark(); }, onclick: () => { m.close(); x.run(); } },
            h('span', { style: { width: '22px', textAlign: 'center', fontSize: '16px' } }, x.ico),
            h('div', { class: 'grow' }, h('div', null, x.label), x.sub ? h('div', { class: 'mi-desc', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, x.sub) : null));
        };
        if (items.length) results.append(h('div', { class: 'group' }, q ? 'Resultados' : 'Recientes y destacados'), ...flat.slice(0, items.length).map(row));
        if (acts.length) results.append(h('div', { class: 'group' }, 'Acciones'), ...flat.slice(items.length).map(row));
        if (!flat.length) results.append(h('div', { class: 'empty' }, 'Sin resultados para «' + inp.value + '»'));
      };
      const mark = () => Array.from(results.querySelectorAll('.menu-item')).forEach((el, i) => el.classList.toggle('sel', i === sel));
      inp.addEventListener('input', () => { sel = 0; draw(); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(flat.length - 1, sel + 1); mark(); results.querySelectorAll('.menu-item')[sel]?.scrollIntoView({ block: 'nearest' }); }
        if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); results.querySelectorAll('.menu-item')[sel]?.scrollIntoView({ block: 'nearest' }); }
        if (e.key === 'Enter' && flat[sel]) { e.preventDefault(); m.close(); flat[sel].run(); }
      });
      const m = modal({ body: [inp, results], size: 'palette' });
      m.el.classList.add('palette');
      m.body.style.padding = '0';
      draw();
    }
  };

  AIC.app = app;
  document.addEventListener('DOMContentLoaded', () => app.start().catch((e) => { console.error(e); toast('Error al iniciar: ' + e.message, 'err', 6000); }));
})();
