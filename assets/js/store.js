/* AI Center · store.js — estado y persistencia 100% en ficheros
 *
 * Modos:
 *  - folder : carpeta conectada con File System Access API (Chrome/Edge). Lee y escribe los .md/.json
 *             de /library y regenera library/library.bundle.js en cada cambio.
 *  - bundle : sin carpeta conectada. Se carga library/library.bundle.js (funciona con doble clic, file://).
 *             Los cambios se guardan como borrador en este navegador hasta que conectes la carpeta
 *             o descargues un ZIP.
 */
(function () {
  'use strict';
  const AIC = (window.AIC = window.AIC || {});
  const C = AIC.core;

  /* ---------- IndexedDB mínimo (handles de carpeta y ejecuciones) ---------- */
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        let req;
        try { req = indexedDB.open('ai-center', 2); } catch (e) { return rej(e); }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs', { keyPath: 'id' });
        };
        req.onsuccess = () => { this.db = req.result; res(this.db); };
        req.onerror = () => rej(req.error);
      });
    },
    async tx(store, mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode); const s = t.objectStore(store);
        const r = fn(s);
        t.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
        t.onerror = () => rej(t.error);
      });
    },
    get(k) { return this.tx('kv', 'readonly', (s) => s.get(k)).catch(() => undefined); },
    set(k, v) { return this.tx('kv', 'readwrite', (s) => s.put(v, k)).catch(() => undefined); },
    del(k) { return this.tx('kv', 'readwrite', (s) => s.delete(k)).catch(() => undefined); },
    putRun(r) { return this.tx('runs', 'readwrite', (s) => s.put(r)).catch(() => undefined); },
    delRun(id) { return this.tx('runs', 'readwrite', (s) => s.delete(id)).catch(() => undefined); },
    runs() { return this.tx('runs', 'readonly', (s) => s.getAll()).catch(() => []); }
  };

  /* ---------- Preferencias (por usuario/navegador) ---------- */
  const PREFS_KEY = 'aic.prefs';
  const OVERLAY_KEY = 'aic.overlay';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  const prefs = Object.assign({ theme: 'auto', favorites: [], recent: [], author: '', llm: { provider: 'manual', model: '', baseUrl: '', apiKey: '', remember: false }, view: 'grid' }, ls.get(PREFS_KEY, {}));
  function savePrefs() {
    const copy = JSON.parse(JSON.stringify(prefs));
    if (!copy.llm.remember) copy.llm.apiKey = '';
    ls.set(PREFS_KEY, copy);
  }

  const TEXT_EXT = /\.(md|mdc|markdown|txt|json|ya?ml|js|mjs|cjs|ts|py|sh|ps1|bat|csv|html|css|xml|toml|ini|sql|rb|go|java|cs|env\.example)$/i;
  const keyOf = (it) => it.type + ':' + it.id;

  const store = {
    lib: { config: Object.assign({}, C.DEFAULT_CONFIG), items: [] },
    mode: 'bundle',
    rootDir: null,      // carpeta elegida por el usuario
    libDir: null,       // carpeta /library
    overlay: ls.get(OVERLAY_KEY, { items: {}, deleted: [] }),
    bundleInfo: null,
    pendingReconnect: null,
    prefs, savePrefs, idb,
    listeners: new Set(),
    fsSupported: typeof window.showDirectoryPicker === 'function',

    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit(what) { Array.from(this.listeners).forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } }); },

    /* ---------- Carga ---------- */
    async init() {
      this.loadFromBundle();
      if (this.fsSupported) {
        const handle = await idb.get('rootDir');
        if (handle) {
          try {
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') { await this.useRoot(handle, { silent: true }); return; }
            this.pendingReconnect = handle;
          } catch (e) { /* handle inválido */ }
        }
      }
      this.emit('load');
    },
    loadFromBundle() {
      const b = window.AIC_BUNDLE;
      let lib = { config: Object.assign({}, C.DEFAULT_CONFIG), items: [] };
      if (b && Array.isArray(b.files)) { lib = C.libraryFromFiles(b.files); this.bundleInfo = { generatedAt: b.generatedAt, count: b.files.length }; }
      // aplica borradores locales
      const del = new Set(this.overlay.deleted || []);
      lib.items = lib.items.filter((i) => !del.has(keyOf(i)));
      Object.values(this.overlay.items || {}).forEach((it) => {
        const n = C.normalizeItem(it);
        const idx = lib.items.findIndex((x) => keyOf(x) === keyOf(n));
        if (idx >= 0) lib.items[idx] = n; else lib.items.push(n);
      });
      if (this.overlay.config) lib.config = Object.assign(lib.config, this.overlay.config);
      this.lib = lib;
      this.mode = 'bundle';
    },
    localChanges() { return Object.keys(this.overlay.items || {}).length + (this.overlay.deleted || []).length + (this.overlay.config ? 1 : 0); },
    saveOverlay() { ls.set(OVERLAY_KEY, this.overlay); },
    clearOverlay() { this.overlay = { items: {}, deleted: [] }; this.saveOverlay(); },

    /* ---------- Carpeta ---------- */
    async connectFolder() {
      if (!this.fsSupported) throw new Error('Tu navegador no permite escribir en carpetas. Usa Chrome o Edge (o descarga ZIP).');
      const handle = await window.showDirectoryPicker({ id: 'ai-center', mode: 'readwrite' });
      await this.useRoot(handle);
    },
    async reconnect() {
      const h = this.pendingReconnect;
      if (!h) return this.connectFolder();
      const perm = await h.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('Permiso denegado');
      this.pendingReconnect = null;
      await this.useRoot(h);
    },
    async disconnect() {
      await idb.del('rootDir');
      this.rootDir = this.libDir = null;
      this.loadFromBundle();
      this.emit('load');
    },
    async useRoot(handle, opts) {
      opts = opts || {};
      let libDir = null; let root = handle;
      try { libDir = await handle.getDirectoryHandle('library'); } catch (e) { /* no existe */ }
      if (!libDir) {
        const looksLikeLib = await hasAny(handle, ['ai-center.json', 'agents', 'prompts', 'workflows', 'skills']);
        if (looksLikeLib && handle.name === 'library') { libDir = handle; root = handle; }
        else {
          libDir = await handle.getDirectoryHandle('library', { create: true });
          if (!opts.silent) AIC.toast && AIC.toast('Creada la carpeta library/ en «' + handle.name + '»');
        }
      }
      this.rootDir = root; this.libDir = libDir;
      await idb.set('rootDir', handle);
      const files = await readTree(libDir, '');
      const lib = C.libraryFromFiles(files);
      const hadChanges = this.localChanges();
      const wasEmpty = !lib.items.length;
      const previous = this.lib;
      this.lib = lib;
      this.mode = 'folder';
      if (wasEmpty && previous.items.length) {
        // carpeta nueva → sembrar con lo que había (bundle + borradores)
        this.lib = { config: previous.config, items: previous.items };
        await this.writeAll();
        this.clearOverlay();
        AIC.toast && AIC.toast('Librería inicializada en la carpeta (' + previous.items.length + ' elementos)', 'ok');
      } else if (hadChanges && !opts.silent) {
        const ok = await AIC.confirmDialog(`Tienes ${hadChanges} cambio(s) guardados solo en este navegador. ¿Escribirlos ahora en la carpeta?`, { title: 'Borradores locales', ok: 'Guardar en ficheros' });
        if (ok) {
          for (const it of Object.values(this.overlay.items)) await this.save(C.normalizeItem(it), null, { quiet: true });
          for (const k of this.overlay.deleted) { const [type, id] = k.split(':'); const it = this.get(type, id); if (it) await this.remove(it, { quiet: true }); }
          if (this.overlay.config) await this.saveConfig(Object.assign(this.lib.config, this.overlay.config));
        }
        this.clearOverlay();
      }
      await this.writeBundle();
      this.emit('load');
    },
    async refresh() {
      if (this.mode !== 'folder') { this.loadFromBundle(); this.emit('load'); return; }
      const files = await readTree(this.libDir, '');
      this.lib = C.libraryFromFiles(files);
      this.emit('load');
    },

    /* ---------- Consultas ---------- */
    all(type) { return type ? this.lib.items.filter((i) => i.type === type) : this.lib.items; },
    get(type, id) { return this.lib.items.find((i) => i.type === type && i.id === id) || null; },
    index() { return C.indexLib(this.lib); },
    uniqueId(type, base, except) {
      let id = C.slugify(base); let n = 2;
      while (this.lib.items.some((i) => i.type === type && i.id === id && i !== except)) id = C.slugify(base) + '-' + n++;
      return id;
    },

    /* ---------- Escritura ---------- */
    async save(item, prevKey, opts) {
      opts = opts || {};
      item.updated = C.today();
      if (!item.author && prefs.author) item.author = prefs.author;
      C.normalizeItem(item);
      const key = keyOf(item);
      const prev = prevKey && prevKey !== key ? this.lib.items.find((i) => keyOf(i) === prevKey) : null;
      const idx = this.lib.items.findIndex((i) => keyOf(i) === (prevKey || key));
      if (idx >= 0) this.lib.items[idx] = item; else this.lib.items.push(item);
      if (prev && prev !== item) this.lib.items = this.lib.items.filter((i) => i !== prev);
      if (this.mode === 'folder') {
        if (prevKey && prevKey !== key) await this.deleteFiles(prevKey);
        await writeFile(this.libDir, C.pathFor(item), C.itemToFile(item).content);
        if (item.type === 'skill' && item._files) for (const r of Object.keys(item._files)) await writeFile(this.libDir, `skills/${item.id}/${r}`, item._files[r]);
        this.scheduleBundle();
      } else {
        if (prevKey && prevKey !== key) { delete this.overlay.items[prevKey]; this.overlay.deleted = C.uniq([...(this.overlay.deleted || []), prevKey]); }
        this.overlay.items[key] = stripRuntime(item);
        this.overlay.deleted = (this.overlay.deleted || []).filter((k) => k !== key);
        this.saveOverlay();
      }
      if (!opts.quiet) this.emit('change');
      return item;
    },
    async remove(item, opts) {
      const key = keyOf(item);
      this.lib.items = this.lib.items.filter((i) => keyOf(i) !== key);
      if (this.mode === 'folder') { await this.deleteFiles(key); this.scheduleBundle(); }
      else { delete this.overlay.items[key]; this.overlay.deleted = C.uniq([...(this.overlay.deleted || []), key]); this.saveOverlay(); }
      prefs.favorites = prefs.favorites.filter((k) => k !== key); savePrefs();
      if (!opts || !opts.quiet) this.emit('change');
    },
    async deleteFiles(key) {
      const [type, id] = key.split(':');
      try {
        if (type === 'skill') { const d = await this.libDir.getDirectoryHandle('skills'); await d.removeEntry(id, { recursive: true }); }
        else {
          const p = C.pathFor({ type, id }).split('/');
          let d = this.libDir;
          for (const part of p.slice(0, -1)) d = await d.getDirectoryHandle(part);
          await d.removeEntry(p[p.length - 1]);
        }
      } catch (e) { /* ya no existía */ }
    },
    async saveConfig(cfg) {
      this.lib.config = Object.assign({}, this.lib.config, cfg);
      if (this.mode === 'folder') { await writeFile(this.libDir, 'ai-center.json', JSON.stringify(this.lib.config, null, 2) + '\n'); this.scheduleBundle(); }
      else { this.overlay.config = this.lib.config; this.saveOverlay(); }
      this.emit('change');
    },
    async writeAll() {
      for (const f of C.libraryToFiles(this.lib)) await writeFile(this.libDir, f.path, f.content);
    },
    scheduleBundle: null,
    async writeBundle() {
      if (this.mode !== 'folder' || !this.libDir) return;
      try { await writeFile(this.libDir, 'library.bundle.js', C.serializeBundle(this.lib)); this.bundleInfo = { generatedAt: new Date().toISOString() }; }
      catch (e) { console.warn('No se pudo escribir el bundle', e); }
    },
    async importFiles(files, opts) {
      opts = opts || {};
      const lib = C.libraryFromFiles(files);
      let n = 0;
      for (const it of lib.items) {
        const exists = this.get(it.type, it.id);
        if (exists && opts.skipExisting) continue;
        await this.save(it, null, { quiet: true }); n++;
      }
      this.emit('change');
      return n;
    },
    /** Escribe ficheros arbitrarios (exportaciones) en una carpeta elegida. */
    async writeFilesTo(dirHandle, files) {
      for (const f of files) await writeFile(dirHandle, f.path, f.data !== undefined ? f.data : f.content);
    },
    async saveRun(run, report) {
      await idb.putRun(run);
      if (this.mode === 'folder' && this.rootDir) {
        try {
          const base = (this.rootDir === this.libDir ? '_runs/' : 'runs/') + run.id;
          await writeFile(this.rootDir, base + '/run.json', JSON.stringify(run, null, 2));
          await writeFile(this.rootDir, base + '/INFORME.md', report);
          return base;
        } catch (e) { console.warn(e); }
      }
      return null;
    },
    toggleFav(it) {
      const k = keyOf(it);
      prefs.favorites = prefs.favorites.includes(k) ? prefs.favorites.filter((x) => x !== k) : [k, ...prefs.favorites];
      savePrefs(); this.emit('prefs');
    },
    isFav(it) { return prefs.favorites.includes(keyOf(it)); },
    touch(it) {
      const k = keyOf(it);
      prefs.recent = [{ k, at: Date.now() }, ...prefs.recent.filter((r) => r.k !== k)].slice(0, 12);
      savePrefs();
    },
    keyOf
  };
  store.scheduleBundle = AIC.debounce(() => store.writeBundle(), 500);

  function stripRuntime(it) { const o = JSON.parse(JSON.stringify(it)); delete o._path; return o; }
  async function hasAny(dir, names) {
    for (const n of names) {
      try { await dir.getFileHandle(n); return true; } catch (e) { /* */ }
      try { await dir.getDirectoryHandle(n); return true; } catch (e) { /* */ }
    }
    return false;
  }
  async function readTree(dir, prefix) {
    const out = [];
    for await (const [name, h] of dir.entries()) {
      if (name.startsWith('.') || name === 'node_modules' || name === 'library.bundle.js') continue;
      const p = prefix + name;
      if (h.kind === 'directory') out.push(...await readTree(h, p + '/'));
      else if (TEXT_EXT.test(name) || /SKILL\.md$/.test(name)) {
        const f = await h.getFile();
        if (f.size < 768 * 1024) out.push({ path: p, content: await f.text() });
      }
    }
    return out;
  }
  async function writeFile(dir, path, data) {
    const parts = path.split('/').filter(Boolean);
    let d = dir;
    for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
    const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close();
  }

  AIC.store = store;
})();
