/* AI Center · util.js — DOM, markdown, dialogs, clipboard, zip */
(function () {
  'use strict';
  const AIC = (window.AIC = window.AIC || {});

  /* ---------- DOM ---------- */
  function h(tag, attrs, ...children) {
    const el = tag === 'frag' ? document.createDocumentFragment() : document.createElement(tag);
    if (attrs && tag !== 'frag') {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach((p) => { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly' || k === 'multiple') el[k] = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    (children || []).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) return append(el, c);
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- Icons (inline SVG) ---------- */
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/>',
    upload: '<path d="M12 21V9m0 0-4 4m4-4 4 4M4 5h16"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    export: '<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    wand: '<path d="m15 4 5 5L9 20H4v-5z"/><path d="M13 6l5 5"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    layout: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    dup: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>'
  };
  function icon(name, size) {
    const s = size || 16;
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
    return span;
  }
  const btn = (label, onClick, opts) => {
    opts = opts || {};
    return h('button', { class: 'btn ' + (opts.cls || ''), type: 'button', title: opts.title || (typeof label === 'string' ? label : ''), onclick: onClick, disabled: opts.disabled },
      opts.icon ? icon(opts.icon, opts.iconSize) : null, label ? h('span', null, label) : null);
  };

  /* ---------- Markdown (safe: escapes HTML) ---------- */
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|#|\.{0,2}\/|[\w-]+\.[\w./-]*$)/i.test(u) && !/^javascript:/i.test(u)) return u;
    return '#';
  }
  function inline(s, opts) {
    const codes = [];
    s = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, a, u) => `<img alt="${a}" src="${safeUrl(u)}" style="max-width:100%">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, t, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    if (!opts || opts.vars !== false) s = s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, '<span class="var">{{$1}}</span>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  }
  function md(src, opts) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    let i = 0; const out = [];
    const isList = (l) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if ((m = l.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)/))) {
        const fence = m[1]; const lang = m[2]; const buf = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code class="lang-${esc(lang)}">${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }
      if (/^\s*$/.test(l)) { i++; continue; }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { out.push(`<h${m[1].length}>${inline(m[2], opts)}</h${m[1].length}>`); i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(`<blockquote>${md(buf.join('\n'), opts)}</blockquote>`);
        continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const row = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = row(l); i += 2;
        const body = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(row(lines[i++]));
        out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c, opts)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c, opts)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }
      if (isList(l)) {
        const buf = [];
        while (i < lines.length && (isList(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && buf.length) || (/^\s*$/.test(lines[i]) && i + 1 < lines.length && (isList(lines[i + 1]) || /^\s{2,}\S/.test(lines[i + 1]))))) buf.push(lines[i++]);
        out.push(list(buf, opts));
        continue;
      }
      if (/^\s*<details>|^\s*<\/?summary>|^\s*<\/details>/.test(l)) {
        const t = l.trim();
        if (t.startsWith('<details>')) out.push('<details>' + (t.includes('<summary>') ? `<summary>${esc(t.replace(/<\/?(details|summary)>/g, ''))}</summary>` : ''));
        else if (t.startsWith('</details>')) out.push('</details>');
        i++; continue;
      }
      const buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6})\s/.test(lines[i]) && !/^\s*(`{3,}|~{3,})/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !isList(lines[i]) && !/^\s*<\/?details>/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${buf.map((x) => inline(x, opts)).join('<br>')}</p>`);
    }
    return out.join('\n');
  }
  function list(lines, opts) {
    const items = [];
    const base = lines[0].match(/^\s*/)[0].length;
    lines.forEach((l) => {
      const ind = l.match(/^\s*/)[0].length;
      const m = l.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
      if (m && ind <= base + 1) items.push({ ordered: /\d/.test(m[1]), text: m[2], sub: [] });
      else if (items.length) items[items.length - 1].sub.push(l);
    });
    const ordered = items.length && items[0].ordered;
    const li = items.map((it) => {
      let t = inline(it.text, opts).replace(/^\[ \]\s/, '<input type="checkbox" disabled> ').replace(/^\[x\]\s/i, '<input type="checkbox" checked disabled> ');
      const sub = it.sub.filter((x) => x.trim());
      return `<li>${t}${sub.length ? md(sub.map((x) => x.replace(new RegExp('^\\s{0,' + (base + 4) + '}'), '')).join('\n'), opts) : ''}</li>`;
    }).join('');
    return ordered ? `<ol>${li}</ol>` : `<ul>${li}</ul>`;
  }

  /* ---------- Toasts ---------- */
  function toast(msg, kind, ms) {
    let wrap = $('.toasts');
    if (!wrap) { wrap = h('div', { class: 'toasts' }); document.body.appendChild(wrap); }
    const t = h('div', { class: 'toast ' + (kind || '') }, msg);
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .2s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 220); }, ms || 2600);
  }

  /* ---------- Modals ---------- */
  const openModals = [];
  function modal(opts) {
    const close = (v) => {
      ov.remove();
      const i = openModals.indexOf(close); if (i >= 0) openModals.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      opts.onClose && opts.onClose(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === close) { e.stopPropagation(); close(); }
    };
    const body = h('div', { class: 'modal-body' }, opts.body);
    const foot = opts.foot ? h('div', { class: 'modal-foot' }, typeof opts.foot === 'function' ? opts.foot(close) : opts.foot) : null;
    const m = h('div', { class: 'modal ' + (opts.size || ''), role: 'dialog', 'aria-modal': 'true' },
      opts.title ? h('div', { class: 'modal-head' }, opts.titleIcon ? h('span', { style: { fontSize: '20px' } }, opts.titleIcon) : null, h('h3', null, opts.title), h('button', { class: 'btn ghost icon close', onclick: () => close(), title: 'Close (Esc)' }, icon('x'))) : null,
      body, foot);
    const ov = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === ov && !opts.sticky) close(); } }, m);
    document.body.appendChild(ov);
    document.addEventListener('keydown', onKey, true);
    openModals.push(close);
    setTimeout(() => { const f = m.querySelector('[autofocus], input, textarea, select'); if (f && opts.focus !== false) f.focus(); }, 20);
    return { close, el: m, body };
  }
  function confirmDialog(msg, opts) {
    opts = opts || {};
    return new Promise((res) => {
      const md_ = modal({
        title: opts.title || 'Confirm', size: 'narrow', body: h('p', { style: { margin: 0 } }, msg),
        foot: (close) => [btn('Cancel', () => close(false), { cls: 'ghost' }), btn(opts.ok || 'OK', () => close(true), { cls: opts.danger ? 'danger' : 'primary' })],
        onClose: (v) => res(!!v)
      });
      void md_;
    });
  }
  function promptDialog(title, value, opts) {
    opts = opts || {};
    return new Promise((res) => {
      const inp = h(opts.multiline ? 'textarea' : 'input', { type: 'text', value: value || '', placeholder: opts.placeholder || '', autofocus: true, rows: 5 });
      let result = null;
      const m = modal({
        title, size: 'narrow',
        body: [opts.help ? h('p', { class: 'muted small', style: { marginTop: 0 } }, opts.help) : null, inp],
        foot: (close) => [btn('Cancel', () => close(), { cls: 'ghost' }), btn(opts.ok || 'OK', () => { result = inp.value; close(); }, { cls: 'primary' })],
        onClose: () => res(result)
      });
      if (!opts.multiline) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { result = inp.value; m.close(); } });
    });
  }
  function popover(anchor, content, opts) {
    opts = opts || {};
    document.querySelectorAll('.popover').forEach((p) => p.remove());
    const p = h('div', { class: 'popover' }, content);
    document.body.appendChild(p);
    const r = anchor.getBoundingClientRect();
    const pw = p.offsetWidth; const ph = p.offsetHeight;
    let left = opts.align === 'right' ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    p.style.left = left + 'px'; p.style.top = top + 'px';
    const off = (e) => { if (!p.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { p.remove(); document.removeEventListener('mousedown', off, true); document.removeEventListener('keydown', key); };
    setTimeout(() => { document.addEventListener('mousedown', off, true); document.addEventListener('keydown', key); }, 0);
    p.close = close;
    return p;
  }
  function menu(anchor, items, opts) {
    const p = popover(anchor, items.filter(Boolean).map((it) => it === '-' ? h('div', { style: { height: '1px', background: 'var(--border)', margin: '4px 0' } }) :
      h('button', { class: 'menu-item', onclick: () => { p.close(); it.onClick(); } },
        it.icon ? (typeof it.icon === 'string' && it.icon.length <= 3 ? h('span', { style: { width: '20px', textAlign: 'center' } }, it.icon) : icon(it.icon)) : null,
        h('div', null, h('div', null, it.label), it.desc ? h('div', { class: 'mi-desc' }, it.desc) : null))), opts);
    return p;
  }

  /* ---------- Clipboard and downloads ---------- */
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    toast(msg || 'Copied to clipboard', 'ok');
  }
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function pickFiles(accept, multiple) {
    return new Promise((res) => {
      const inp = h('input', { type: 'file', accept: accept || '', multiple: !!multiple, style: { display: 'none' } });
      inp.onchange = async () => {
        const files = await Promise.all(Array.from(inp.files).map(async (f) => ({ name: f.name, path: f.webkitRelativePath || f.name, content: await f.text() })));
        inp.remove(); res(files);
      };
      document.body.appendChild(inp); inp.click();
    });
  }

  /** Lets the user pick files or a folder. Returns [{path, file}] (folder paths are relative to the chosen folder). */
  function pickLocal(opts) {
    opts = opts || {};
    return new Promise((res) => {
      const inp = h('input', { type: 'file', multiple: true, style: { display: 'none' } });
      if (opts.folder) { inp.setAttribute('webkitdirectory', ''); inp.setAttribute('directory', ''); }
      inp.onchange = () => {
        const out = Array.from(inp.files).map((f) => {
          let p = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
          if (opts.folder && p.includes('/')) p = p.slice(p.indexOf('/') + 1);
          return { path: p, file: f };
        });
        inp.remove(); res(out);
      };
      document.body.appendChild(inp); inp.click();
    });
  }
  /** Reads the picked text files that match the patterns, applying the core limits. */
  async function readLocalFiles(entries, patterns) {
    const C = AIC.core;
    const byPath = new Map(entries.filter((e) => C.isTextFile(e.path) && e.file.size < 1024 * 1024).map((e) => [e.path, e.file]));
    const m = C.matchPaths(Array.from(byPath.keys()), patterns && patterns.length ? patterns : ['**']);
    const files = [];
    for (const p of m.matched.slice(0, C.FILE_LIMITS.maxFiles + 20)) files.push({ path: p, content: await byPath.get(p).text() });
    const lim = C.limitFiles(files);
    lim.omitted += Math.max(0, m.matched.length - files.length);
    return Object.assign(lim, { unmatched: m.unmatched, total: m.matched.length });
  }

  /* ---------- ZIP (stored, UTF-8) ---------- */
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    const enc = new TextEncoder();
    const parts = []; const central = []; let offset = 0;
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach((f) => {
      const name = enc.encode(f.path);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  /* ---------- PNG icons for M365 (canvas) ---------- */
  function iconPng(ic) {
    return new Promise((res) => {
      const c = document.createElement('canvas'); c.width = c.height = ic.size;
      const x = c.getContext('2d');
      if (ic.outline) {
        x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.stroke();
        x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic.text, 16, 17);
      } else {
        const g = x.createLinearGradient(0, 0, ic.size, ic.size); g.addColorStop(0, ic.color || '#6E56CF'); g.addColorStop(1, '#2FB5D2');
        x.fillStyle = g; x.fillRect(0, 0, ic.size, ic.size);
        x.fillStyle = '#fff'; x.font = `bold ${Math.round(ic.size * 0.38)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(ic.text, ic.size / 2, ic.size / 2 + ic.size * 0.02);
      }
      c.toBlob(async (b) => res(new Uint8Array(await b.arrayBuffer())), 'image/png');
    });
  }

  /* ---------- Misc ---------- */
  function timeAgo(iso) {
    if (!iso) return '';
    const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return iso;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
    return d.toLocaleDateString('en-GB');
  }
  const EMOJIS = '🤖 🧠 💬 🧩 📏 📚 🔌 🔀 🚀 ✨ 🛠️ 🧪 🐞 🔍 📝 📋 📊 📈 🧭 🏗️ 🎯 🧑‍💻 👩‍💼 🧑‍🎨 🛡️ 🔐 ⚙️ 💡 📦 🗂️ 🧾 📣 🤝 ✅ 🔁 🧹 🌐 🗺️ 🧬 ☁️ 🗃️ 📐 🎨 ⏱️ 🧯 📞 ✉️ 📅 💼 🏷️ 🪄 🧱 🔧'.split(' ');
  const typeColor = (t) => `var(--c-${t})`;
  function readTextFileHandle(fh) { return fh.getFile().then((f) => f.text()); }

  Object.assign(AIC, { h, append, $, $$, esc, debounce, icon, btn, md, toast, modal, confirmDialog, promptDialog, popover, menu, copy, download, pickFiles, pickLocal, readLocalFiles, zip, crc32, iconPng, timeAgo, EMOJIS, typeColor, readTextFileHandle });
})();
