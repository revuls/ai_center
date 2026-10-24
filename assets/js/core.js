/*!
 * AI Center · core.js
 * Núcleo compartido entre la app (navegador, file://) y la CLI (Node).
 * Sin dependencias. Contiene: modelo de datos, formato de ficheros (frontmatter YAML / JSON),
 * plantillas, motor de workflows, composición de prompts, validación y exportadores
 * (GitHub Copilot, Copilot M365, Claude Code, Cursor, AGENTS.md genérico).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIC = root.AIC || {};
  root.AIC.core = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';

  /* ------------------------------------------------------------------ *
   * Modelo
   * ------------------------------------------------------------------ */
  const TYPES = {
    workflow: {
      key: 'workflow', label: 'Workflows', singular: 'Workflow', dir: 'workflows', ext: '.workflow.json', format: 'json', icon: '🔀',
      help: 'Flujos de trabajo E2E que encadenan agentes, prompts, skills, conocimiento y revisiones humanas. Se diseñan arrastrando piezas y los pueden ejecutar agentes.'
    },
    agent: {
      key: 'agent', label: 'Agentes', singular: 'Agente', dir: 'agents', ext: '.agent.md', format: 'md', icon: '🤖',
      help: 'Roles especializados (persona + instrucciones + herramientas + skills + conocimiento). Se exportan como custom agents de Copilot, agentes declarativos de M365 o subagentes de Claude.'
    },
    prompt: {
      key: 'prompt', label: 'Prompts', singular: 'Prompt', dir: 'prompts', ext: '.prompt.md', format: 'md', icon: '💬',
      help: 'Plantillas reutilizables con variables {{variable}}. Se exportan como prompt files de Copilot (/comando), comandos de Claude o texto listo para Copilot M365.'
    },
    skill: {
      key: 'skill', label: 'Skills', singular: 'Skill', dir: 'skills', ext: '/SKILL.md', format: 'skill', icon: '🧩',
      help: 'Capacidades empaquetadas (formato estándar Agent Skills, SKILL.md) que un agente carga cuando las necesita: procedimientos, checklists, scripts y recursos.'
    },
    instruction: {
      key: 'instruction', label: 'Instrucciones', singular: 'Instrucción', dir: 'instructions', ext: '.instructions.md', format: 'md', icon: '📏',
      help: 'Normas que la IA debe seguir siempre (globales) o para ciertos ficheros (applyTo). Se exportan a copilot-instructions.md, *.instructions.md, CLAUDE.md o reglas de Cursor.'
    },
    knowledge: {
      key: 'knowledge', label: 'Conocimiento', singular: 'Documento', dir: 'knowledge', ext: '.md', format: 'md', icon: '📚',
      help: 'Contexto de negocio y técnico: glosario, arquitectura, Definition of Done, procesos… Se inyecta en agentes y pasos de workflows.'
    },
    mcp: {
      key: 'mcp', label: 'Herramientas MCP', singular: 'Servidor MCP', dir: 'mcp', ext: '.mcp.json', format: 'json', icon: '🔌',
      help: 'Servidores Model Context Protocol que dan herramientas a los agentes (GitHub, Jira, navegador, BBDD…). Se exportan a .vscode/mcp.json, .mcp.json o .cursor/mcp.json.'
    }
  };
  const TYPE_ORDER = ['workflow', 'agent', 'prompt', 'skill', 'instruction', 'knowledge', 'mcp'];

  const AUDIENCES = [
    { value: 'todos', label: 'Todos' },
    { value: 'dev', label: 'Desarrollo' },
    { value: 'po', label: 'Producto (PO)' },
    { value: 'qa', label: 'QA' },
    { value: 'arquitectura', label: 'Arquitectura' },
    { value: 'ux', label: 'Diseño / UX' },
    { value: 'negocio', label: 'Negocio' },
    { value: 'datos', label: 'Datos' },
    { value: 'ops', label: 'DevOps / Plataforma' }
  ];
  const TARGETS = [
    { value: 'copilot', label: 'GitHub Copilot' },
    { value: 'm365', label: 'Copilot M365' },
    { value: 'claude', label: 'Claude / Claude Code' },
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'cursor', label: 'Cursor' },
    { value: 'any', label: 'Cualquier IA' }
  ];
  const STATUS = [
    { value: 'draft', label: 'Borrador' },
    { value: 'review', label: 'En revisión' },
    { value: 'stable', label: 'Estable' },
    { value: 'deprecated', label: 'Obsoleto' }
  ];
  const PROMPT_MODES = [
    { value: '', label: '— (por defecto)' },
    { value: 'ask', label: 'ask · preguntar' },
    { value: 'edit', label: 'edit · editar ficheros' },
    { value: 'agent', label: 'agent · modo agente' }
  ];
  const KNOWLEDGE_KINDS = [
    { value: 'glossary', label: 'Glosario' },
    { value: 'architecture', label: 'Arquitectura' },
    { value: 'process', label: 'Proceso' },
    { value: 'guideline', label: 'Guía / buenas prácticas' },
    { value: 'domain', label: 'Dominio de negocio' },
    { value: 'template', label: 'Plantilla' },
    { value: 'reference', label: 'Referencia' }
  ];
  const COPILOT_TOOLS = ['search', 'edit', 'runCommands', 'runTasks', 'runTests', 'fetch', 'githubRepo', 'problems', 'changes', 'usages', 'testFailure', 'todos', 'new', 'extensions', 'vscodeAPI', 'openSimpleBrowser', 'think'];
  const M365_CAPS = [
    { value: 'WebSearch', label: 'Búsqueda web' },
    { value: 'OneDriveAndSharePoint', label: 'OneDrive y SharePoint' },
    { value: 'GraphConnectors', label: 'Copilot connectors' },
    { value: 'Email', label: 'Correo' },
    { value: 'TeamsMessages', label: 'Mensajes de Teams' },
    { value: 'Meetings', label: 'Reuniones' },
    { value: 'People', label: 'Personas' },
    { value: 'CodeInterpreter', label: 'Intérprete de código' },
    { value: 'GraphicArt', label: 'Generación de imágenes' }
  ];
  const MCP_TRANSPORTS = [
    { value: 'stdio', label: 'stdio (proceso local)' },
    { value: 'http', label: 'http (remoto)' },
    { value: 'sse', label: 'sse (remoto, legado)' }
  ];

  const NODE_TYPES = {
    start: { label: 'Inicio', icon: '▶', help: 'Punto de entrada. Recibe las entradas del workflow.' },
    step: { label: 'Paso', icon: '⚙', help: 'Trabajo ejecutado por un agente/prompt con skills, conocimiento y herramientas.' },
    human: { label: 'Revisión humana', icon: '🧑', help: 'Puerta de aprobación. El agente se detiene hasta que una persona aprueba o pide cambios.' },
    condition: { label: 'Decisión', icon: '◆', help: 'Bifurca el flujo según un criterio. Las etiquetas de las conexiones son las opciones.' },
    end: { label: 'Fin', icon: '■', help: 'Cierre del flujo y entregable final.' },
    note: { label: 'Nota', icon: '✎', help: 'Anotación libre en el lienzo. No se ejecuta.' }
  };

  const F = (key, label, kind, extra) => Object.assign({ key, label, kind }, extra || {});
  const HEAD = [
    F('name', 'Nombre', 'text', { required: true }),
    F('description', 'Descripción', 'textarea', { required: true, help: 'Qué hace y cuándo usarlo. Los agentes y Copilot la usan para decidir cuándo aplicarlo.' }),
    F('icon', 'Icono', 'emoji')
  ];
  const TAIL = [
    F('tags', 'Etiquetas', 'tags'),
    F('audience', 'Audiencia', 'multi', { options: AUDIENCES }),
    F('targets', 'IAs objetivo', 'multi', { options: TARGETS }),
    F('status', 'Estado', 'select', { options: STATUS }),
    F('version', 'Versión', 'text', { placeholder: '1.0.0' }),
    F('author', 'Autor/a', 'text'),
    F('updated', 'Actualizado', 'readonly')
  ];
  const FIELDS = {
    prompt: [...HEAD,
      F('mode', 'Modo en Copilot', 'select', { options: PROMPT_MODES, help: 'Modo de chat con el que se abre el prompt file en Copilot.' }),
      F('agent', 'Agente asociado', 'ref', { ref: 'agent', help: 'Opcional. El prompt se ejecuta con este agente (custom agent en Copilot).' }),
      F('model', 'Modelo preferido', 'text', { placeholder: 'p. ej. Claude Sonnet 5.5, GPT-5…' }),
      F('tools', 'Herramientas (Copilot)', 'tags', { suggest: COPILOT_TOOLS }),
      ...TAIL],
    agent: [...HEAD,
      F('model', 'Modelo preferido', 'text', { placeholder: 'p. ej. Claude Opus 5.5' }),
      F('tools', 'Herramientas (Copilot)', 'tags', { suggest: COPILOT_TOOLS }),
      F('skills', 'Skills', 'refs', { ref: 'skill' }),
      F('knowledge', 'Conocimiento', 'refs', { ref: 'knowledge' }),
      F('mcp', 'Servidores MCP', 'refs', { ref: 'mcp' }),
      F('handoffs', 'Traspasos a otros agentes', 'refs', { ref: 'agent', help: 'Botones de handoff en Copilot para pasar el trabajo al siguiente agente.' }),
      F('starters', 'Conversation starters', 'list', { help: 'Sugerencias iniciales (Copilot M365). Una por línea.' }),
      F('capabilities', 'Capacidades M365', 'multi', { options: M365_CAPS }),
      F('sharepointUrls', 'Fuentes SharePoint/OneDrive (M365)', 'list', { help: 'URLs de sitios o carpetas que el agente M365 usará como conocimiento.' }),
      ...TAIL],
    skill: [...HEAD,
      F('license', 'Licencia', 'text'),
      F('allowedTools', 'Herramientas permitidas', 'tags'),
      ...TAIL],
    instruction: [...HEAD,
      F('global', 'Global (todo el repositorio)', 'bool', { help: 'Las globales van a copilot-instructions.md / CLAUDE.md / AGENTS.md.' }),
      F('applyTo', 'Aplica a (glob)', 'text', { placeholder: '**/*.ts, src/api/**' }),
      ...TAIL],
    knowledge: [...HEAD,
      F('kind', 'Tipo', 'select', { options: KNOWLEDGE_KINDS }),
      F('source', 'Fuente / URL', 'text'),
      ...TAIL],
    mcp: [...HEAD,
      F('transport', 'Transporte', 'select', { options: MCP_TRANSPORTS }),
      F('command', 'Comando', 'text', { placeholder: 'npx' }),
      F('args', 'Argumentos', 'list'),
      F('url', 'URL', 'text', { placeholder: 'https://…' }),
      F('env', 'Variables de entorno', 'kv', { help: 'Usa ${input:NOMBRE} para pedir secretos al usuario (nunca guardes secretos en ficheros).' }),
      F('headers', 'Cabeceras HTTP', 'kv'),
      ...TAIL],
    workflow: [...HEAD, ...TAIL]
  };
  const BODY_LABEL = {
    prompt: 'Plantilla del prompt',
    agent: 'Instrucciones del agente (system prompt)',
    skill: 'Contenido de la skill (SKILL.md)',
    instruction: 'Instrucciones',
    knowledge: 'Contenido',
    mcp: 'Notas de uso',
    workflow: 'Notas / README del workflow'
  };

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */
  const slugify = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'sin-nombre';
  const uniq = (a) => Array.from(new Set((a || []).filter((x) => x !== undefined && x !== null && x !== '')));
  const arr = (v) => Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
  const today = () => new Date().toISOString().slice(0, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const uid = (p) => (p || 'n') + Math.random().toString(36).slice(2, 8);

  function hashHex(str, len) {
    // Hash determinista (FNV-1a extendido) → hex. Útil para IDs estables (manifest M365).
    let out = '';
    let seed = 0;
    while (out.length < len) {
      let h = 0x811c9dc5 ^ seed;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      out += (h >>> 0).toString(16).padStart(8, '0');
      seed++;
    }
    return out.slice(0, len);
  }
  function stableUuid(str) {
    const h = hashHex(str, 32).split('');
    h[12] = '4';
    h[16] = '89ab'[parseInt(h[16], 16) % 4];
    const s = h.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
  }

  /* ------------------------------------------------------------------ *
   * YAML (subconjunto suficiente para frontmatter) y frontmatter
   * ------------------------------------------------------------------ */
  function splitInline(s) {
    const parts = []; let cur = ''; let depth = 0; let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '[' || c === '{') depth++;
      if (c === ']' || c === '}') depth--;
      if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim() !== '') parts.push(cur);
    return parts.map((p) => p.trim());
  }
  function unquote(s) {
    s = s.trim();
    if (s[0] === '"' && s[s.length - 1] === '"') { try { return JSON.parse(s); } catch (e) { return s.slice(1, -1); } }
    if (s[0] === "'" && s[s.length - 1] === "'") return s.slice(1, -1).replace(/''/g, "'");
    return s;
  }
  function yamlScalar(raw) {
    let s = String(raw).trim();
    if (s === '') return '';
    if (s[0] === '"') {
      const m = s.match(/^"((?:[^"\\]|\\.)*)"/);
      if (m) { try { return JSON.parse('"' + m[1] + '"'); } catch (e) { return m[1]; } }
      return s.slice(1);
    }
    if (s[0] === "'") {
      const m = s.match(/^'((?:[^']|'')*)'/);
      return m ? m[1].replace(/''/g, "'") : s.slice(1);
    }
    if (s[0] === '[') return splitInline(s.slice(1, s.lastIndexOf(']'))).map(yamlScalar);
    if (s[0] === '{') {
      const o = {};
      const inner = s.slice(1, s.lastIndexOf('}')).trim();
      if (!inner) return o;
      splitInline(inner).forEach((p) => { const i = p.indexOf(':'); if (i > 0) o[unquote(p.slice(0, i))] = yamlScalar(p.slice(i + 1)); });
      return o;
    }
    s = s.replace(/\s+#.*$/, '');
    if (/^true$/i.test(s)) return true;
    if (/^false$/i.test(s)) return false;
    if (/^(null|~)$/i.test(s)) return null;
    if (/^-?(0|[1-9]\d*)$/.test(s) && s.length < 15) return Number(s);
    return s;
  }
  function parseYaml(src) {
    const lines = String(src || '').replace(/\t/g, '  ').split(/\r?\n/);
    let i = 0;
    const indentOf = (l) => l.match(/^ */)[0].length;
    const isBlank = (l) => /^\s*$/.test(l) || /^\s*#/.test(l);
    const isItem = (l) => /^\s*-(\s|$)/.test(l);
    const skip = () => { while (i < lines.length && isBlank(lines[i])) i++; };

    function parseNode(ind) {
      skip();
      if (i >= lines.length) return null;
      const ci = indentOf(lines[i]);
      if (ci < ind) return null;
      return isItem(lines[i]) ? parseList(ci) : parseMap(ci);
    }
    function parseList(ind) {
      const out = [];
      for (;;) {
        skip();
        if (i >= lines.length) break;
        const l = lines[i]; const ci = indentOf(l);
        if (ci !== ind || !isItem(l)) break;
        const rest = l.slice(ci + 1).replace(/^\s/, '');
        if (rest.trim() === '') { i++; out.push(parseNode(ind + 1)); }
        else if (/^("[^"]*"|'[^']*'|[^\s'"\[{#][^:]*?):(\s|$)/.test(rest)) {
          lines[i] = ' '.repeat(ci + 2) + rest;
          out.push(parseMap(ci + 2));
        } else { i++; out.push(yamlScalar(rest)); }
      }
      return out;
    }
    function parseMap(ind) {
      const obj = {};
      for (;;) {
        skip();
        if (i >= lines.length) break;
        const l = lines[i]; const ci = indentOf(l);
        if (ci !== ind || isItem(l)) break;
        const m = l.slice(ci).match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*)|\s*$)/);
        if (!m) { i++; continue; }
        const key = unquote(m[1]);
        const v = (m[2] || '').trim();
        i++;
        if (/^[|>][-+]?\d*$/.test(v)) {
          const folded = v[0] === '>';
          const buf = [];
          while (i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > ind)) { buf.push(lines[i]); i++; }
          while (buf.length && buf[buf.length - 1].trim() === '') buf.pop();
          const min = buf.filter((x) => x.trim()).reduce((a, x) => Math.min(a, indentOf(x)), Infinity);
          let text = buf.map((x) => x.slice(min === Infinity ? 0 : min)).join('\n');
          if (folded) text = text.replace(/([^\n])\n(?!\n)/g, '$1 ');
          obj[key] = text;
        } else if (v === '' || /^#/.test(v)) {
          skip();
          if (i < lines.length && (indentOf(lines[i]) > ind || (indentOf(lines[i]) === ind && isItem(lines[i])))) obj[key] = parseNode(indentOf(lines[i]));
          else obj[key] = null;
        } else obj[key] = yamlScalar(v);
      }
      return obj;
    }
    const res = parseNode(0);
    return res && typeof res === 'object' && !Array.isArray(res) ? res : {};
  }
  function yq(s) {
    if (typeof s === 'boolean' || typeof s === 'number') return String(s);
    if (s === null || s === undefined) return '""';
    s = String(s);
    if (s === '') return '""';
    if (/^\s|\s$|^[-?:,\[\]{}#&*!|>'"%@`]|:\s|:$|\s#|^(true|false|null|yes|no|on|off|~)$|^[-+]?[\d.]+$|\n|\\/i.test(s)) return JSON.stringify(s);
    return s;
  }
  function yqInline(s) {
    const q = yq(s);
    if (typeof s === 'string' && q[0] !== '"' && /[,\[\]{}]/.test(q)) return JSON.stringify(s);
    return q;
  }
  function toYaml(obj, ind) {
    ind = ind || 0;
    const pad = ' '.repeat(ind);
    let out = '';
    for (const k of Object.keys(obj || {})) {
      const v = obj[k];
      if (v === undefined) continue;
      const key = /^[\w.\-]+$/.test(k) ? k : JSON.stringify(k);
      if (Array.isArray(v)) {
        if (!v.length) { out += `${pad}${key}: []\n`; continue; }
        if (v.every((x) => x === null || typeof x !== 'object')) {
          const inline = '[' + v.map(yqInline).join(', ') + ']';
          if (inline.length + ind + key.length < 96) { out += `${pad}${key}: ${inline}\n`; continue; }
          out += `${pad}${key}:\n` + v.map((x) => `${pad}  - ${yq(x)}\n`).join('');
        } else {
          out += `${pad}${key}:\n`;
          for (const it of v) {
            if (it && typeof it === 'object' && !Array.isArray(it)) {
              const sub = toYaml(it, ind + 4).split('\n').filter((x) => x !== '');
              if (!sub.length) { out += `${pad}  - {}\n`; continue; }
              sub[0] = pad + '  - ' + sub[0].trimStart();
              out += sub.join('\n') + '\n';
            } else out += `${pad}  - ${yq(it)}\n`;
          }
        }
      } else if (v && typeof v === 'object') {
        if (!Object.keys(v).length) { out += `${pad}${key}: {}\n`; continue; }
        out += `${pad}${key}:\n` + toYaml(v, ind + 2);
      } else if (typeof v === 'string' && v.includes('\n') && !/^\s/.test(v)) {
        out += `${pad}${key}: |\n` + v.replace(/\s+$/, '').split('\n').map((l) => (l ? pad + '  ' + l : '')).join('\n') + '\n';
      } else out += `${pad}${key}: ${yq(v)}\n`;
    }
    return out;
  }
  function parseFrontmatter(text) {
    text = String(text || '').replace(/^﻿/, '');
    const m = text.match(/^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
    if (!m) return { data: {}, body: text };
    let data = {};
    try { data = parseYaml(m[1] || '') || {}; } catch (e) { data = {}; }
    return { data, body: (m[2] || '').replace(/^\s*\n/, '') };
  }
  function stringifyFrontmatter(data, body) {
    const y = toYaml(data);
    return (y ? `---\n${y}---\n\n` : '') + String(body || '').replace(/\s+$/, '') + '\n';
  }

  /* ------------------------------------------------------------------ *
   * Item ⇄ fichero
   * ------------------------------------------------------------------ */
  function pathFor(item) {
    const t = TYPES[item.type];
    if (!t) throw new Error('Tipo desconocido: ' + item.type);
    if (item.type === 'skill') return `skills/${item.id}/SKILL.md`;
    return `${t.dir}/${item.id}${t.ext}`;
  }
  function classifyPath(p) {
    p = String(p).replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^library\//, '');
    let m;
    if ((m = p.match(/^skills\/([^/]+)\/SKILL\.md$/i))) return { type: 'skill', id: m[1] };
    if ((m = p.match(/^skills\/([^/]+)\/(.+)$/))) return { type: 'skill-file', id: m[1], rel: m[2] };
    if ((m = p.match(/(?:^|\/)([^/]+)\.prompt\.md$/i))) return { type: 'prompt', id: m[1] };
    if ((m = p.match(/(?:^|\/)([^/]+)\.agent\.md$/i))) return { type: 'agent', id: m[1] };
    if ((m = p.match(/(?:^|\/)([^/]+)\.instructions\.md$/i))) return { type: 'instruction', id: m[1] };
    if ((m = p.match(/(?:^|\/)([^/]+)\.mcp\.json$/i))) return { type: 'mcp', id: m[1] };
    if ((m = p.match(/(?:^|\/)([^/]+)\.workflow\.json$/i))) return { type: 'workflow', id: m[1] };
    if ((m = p.match(/^knowledge\/(.+)\.md$/i))) return { type: 'knowledge', id: m[1].replace(/\//g, '--') };
    if (p === 'ai-center.json') return { type: 'config' };
    return null;
  }
  const KNOWN = new Set(['type', 'id', 'body']);
  function knownKeys(type) { return new Set([...KNOWN, ...FIELDS[type].map((f) => f.key)]); }

  function normalizeItem(item) {
    const t = item.type;
    FIELDS[t].forEach((f) => {
      if (['tags', 'list', 'refs', 'multi'].includes(f.kind)) item[f.key] = arr(item[f.key]).map(String);
      if (f.kind === 'kv' && (!item[f.key] || typeof item[f.key] !== 'object')) item[f.key] = {};
      if (f.kind === 'bool') item[f.key] = item[f.key] === true || item[f.key] === 'true';
    });
    item.name = item.name || item.id;
    item.description = item.description || '';
    item.body = item.body || '';
    if (!item.status) item.status = 'draft';
    if (t === 'workflow') {
      item.inputs = Array.isArray(item.inputs) ? item.inputs : [];
      item.nodes = Array.isArray(item.nodes) ? item.nodes : [];
      item.edges = Array.isArray(item.edges) ? item.edges : [];
    }
    if (t === 'mcp' && !item.transport) item.transport = item.url ? 'http' : 'stdio';
    return item;
  }

  function itemFromFile(path, text) {
    const c = classifyPath(path);
    if (!c || c.type === 'skill-file' || c.type === 'config') return null;
    let item;
    if (TYPES[c.type].format === 'json') {
      let data = {};
      try { data = JSON.parse(text); } catch (e) { data = { name: c.id, description: '⚠ JSON inválido: ' + e.message }; }
      item = Object.assign({}, data, { type: c.type, id: c.id });
      item.body = data.notes || '';
      delete item.notes;
    } else if (c.type === 'skill') {
      const { data, body } = parseFrontmatter(text);
      const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
      item = { type: 'skill', id: c.id, body };
      Object.keys(data).forEach((k) => { if (!['name', 'metadata', 'allowed-tools'].includes(k)) item[k] = data[k]; });
      Object.keys(meta).forEach((k) => { item[k === 'title' ? 'name' : k] = meta[k]; });
      if (data['allowed-tools']) item.allowedTools = arr(Array.isArray(data['allowed-tools']) ? data['allowed-tools'] : String(data['allowed-tools']).split(/[\s,]+/));
      if (!item.name) item.name = data.name || c.id;
    } else {
      const { data, body } = parseFrontmatter(text);
      item = Object.assign({}, data, { type: c.type, id: c.id, body });
    }
    item._path = pathFor(item);
    return normalizeItem(item);
  }

  function itemToFile(item) {
    const t = item.type;
    const keys = knownKeys(t);
    const data = {};
    FIELDS[t].forEach((f) => {
      const v = item[f.key];
      if (isEmpty(v) || (f.kind === 'bool' && !v)) return;
      data[f.key] = v;
    });
    Object.keys(item).forEach((k) => { if (!keys.has(k) && k[0] !== '_' && !isEmpty(item[k])) data[k] = item[k]; });
    let content;
    if (TYPES[t].format === 'json') {
      const out = {};
      if (t === 'workflow') {
        Object.assign(out, data, { inputs: item.inputs || [], nodes: item.nodes || [], edges: item.edges || [] });
      } else Object.assign(out, data);
      if (item.body) out.notes = item.body;
      content = JSON.stringify(out, null, 2) + '\n';
    } else if (t === 'skill') {
      const meta = {};
      ['name', 'icon', 'tags', 'audience', 'targets', 'status', 'version', 'author', 'updated'].forEach((k) => {
        const v = data[k];
        if (isEmpty(v)) return;
        meta[k === 'name' ? 'title' : k] = Array.isArray(v) ? v.join(', ') : String(v);
      });
      const fm = { name: item.id, description: data.description || '' };
      if (data.license) fm.license = data.license;
      if (!isEmpty(item.allowedTools)) fm['allowed-tools'] = item.allowedTools;
      Object.keys(data).forEach((k) => { if (!keys.has(k)) fm[k] = data[k]; });
      fm.metadata = meta;
      content = stringifyFrontmatter(fm, item.body);
    } else {
      content = stringifyFrontmatter(data, item.body);
    }
    return { path: pathFor(item), content };
  }

  /* ------------------------------------------------------------------ *
   * Librería (sistema de ficheros virtual)
   * ------------------------------------------------------------------ */
  const DEFAULT_CONFIG = { workspace: 'AI Center', description: 'Framework de trabajo con IA del equipo', defaultTargets: ['copilot', 'm365', 'any'] };

  function libraryFromFiles(files) {
    const items = [];
    const skillFiles = {};
    let config = Object.assign({}, DEFAULT_CONFIG);
    (files || []).forEach((f) => {
      const c = classifyPath(f.path);
      if (!c) return;
      if (c.type === 'config') { try { config = Object.assign(config, JSON.parse(f.content)); } catch (e) { /* ignore */ } return; }
      if (c.type === 'skill-file') { (skillFiles[c.id] = skillFiles[c.id] || {})[c.rel] = f.content; return; }
      const it = itemFromFile(f.path, f.content);
      if (it) items.push(it);
    });
    items.forEach((it) => { if (it.type === 'skill' && skillFiles[it.id]) it._files = skillFiles[it.id]; });
    return { config, items };
  }
  function libraryToFiles(lib) {
    const files = [{ path: 'ai-center.json', content: JSON.stringify(lib.config || DEFAULT_CONFIG, null, 2) + '\n' }];
    sortItems(lib.items).forEach((it) => {
      files.push(itemToFile(it));
      if (it.type === 'skill' && it._files) Object.keys(it._files).forEach((rel) => files.push({ path: `skills/${it.id}/${rel}`, content: it._files[rel] }));
    });
    return files;
  }
  function serializeBundle(lib) {
    const payload = { format: 'ai-center-bundle', version: VERSION, generatedAt: new Date().toISOString(), files: libraryToFiles(lib) };
    return '/* AI Center · library.bundle.js\n * Instantánea generada automáticamente a partir de los ficheros de /library.\n' +
      ' * Permite abrir index.html con doble clic (file://) y ver la librería sin servidor.\n * NO editar a mano: edita los ficheros .md/.json o usa la app.\n */\n' +
      'window.AIC_BUNDLE = ' + JSON.stringify(payload, null, 1) + ';\n';
  }
  function parseBundle(text) {
    const m = String(text).match(/window\.AIC_BUNDLE\s*=\s*([\s\S]*);\s*$/);
    return JSON.parse(m ? m[1] : text);
  }
  function sortItems(items) {
    return items.slice().sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || String(a.name).localeCompare(String(b.name), 'es'));
  }
  function indexLib(lib) {
    const map = new Map();
    (lib.items || []).forEach((it) => map.set(it.type + ':' + it.id, it));
    return {
      get: (type, id) => map.get(type + ':' + id) || null,
      of: (type) => (lib.items || []).filter((i) => i.type === type)
    };
  }
  function newItem(type, partial) {
    const base = { type, id: '', name: '', description: '', body: '', status: 'draft', version: '1.0.0', updated: today() };
    const it = normalizeItem(Object.assign(base, partial || {}));
    if (type === 'workflow' && !it.nodes.length) {
      it.nodes = [
        { id: 'start', type: 'start', title: 'Inicio', x: 60, y: 180 },
        { id: 'end', type: 'end', title: 'Fin', x: 640, y: 180 }
      ];
      it.inputs = [{ name: 'objetivo', label: 'Objetivo', description: '¿Qué quieres conseguir?', required: true }];
    }
    if (type === 'mcp' && !partial?.transport) it.transport = 'stdio';
    return it;
  }
  /** Referencias inversas: ¿quién usa este item? */
  function usagesOf(lib, type, id) {
    const out = [];
    (lib.items || []).forEach((it) => {
      if (it.type === 'agent') {
        if ((type === 'skill' && it.skills.includes(id)) || (type === 'knowledge' && it.knowledge.includes(id)) ||
          (type === 'mcp' && it.mcp.includes(id)) || (type === 'agent' && it.handoffs.includes(id))) out.push(it);
      }
      if (it.type === 'prompt' && type === 'agent' && it.agent === id) out.push(it);
      if (it.type === 'workflow') {
        const hit = it.nodes.some((n) => (type === 'agent' && n.agent === id) || (type === 'prompt' && n.prompt === id) ||
          (type === 'skill' && arr(n.skills).includes(id)) || (type === 'knowledge' && arr(n.knowledge).includes(id)) || (type === 'mcp' && arr(n.mcp).includes(id)));
        if (hit) out.push(it);
      }
    });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Plantillas
   * ------------------------------------------------------------------ */
  const VAR_RE = /\{\{\s*([a-zA-Z_ÁÉÍÓÚáéíóúñÑ][\wÁÉÍÓÚáéíóúñÑ.\-]*)\s*(?::\s*([^}]*?))?\s*\}\}/g;
  function extractVars(text) {
    const seen = new Map();
    String(text || '').replace(VAR_RE, (_, name, ph) => {
      if (!seen.has(name)) seen.set(name, { name, placeholder: (ph || '').trim() });
      else if (ph && !seen.get(name).placeholder) seen.get(name).placeholder = ph.trim();
      return _;
    });
    return Array.from(seen.values());
  }
  function lookup(ctx, path) {
    if (ctx && Object.prototype.hasOwnProperty.call(ctx, path)) return ctx[path];
    return String(path).split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), ctx);
  }
  function render(tpl, ctx, opts) {
    opts = opts || {};
    return String(tpl || '').replace(VAR_RE, (m, name, ph) => {
      let v = lookup(ctx || {}, name);
      if (v && typeof v === 'object' && 'output' in v) v = v.output;
      if (v === undefined || v === null || v === '') {
        if (typeof opts.fallback === 'function') return opts.fallback(name, ph, m);
        return opts.fallback !== undefined ? opts.fallback : m;
      }
      return String(v);
    });
  }
  /** Convierte {{var}} a la sintaxis de cada herramienta. */
  function convertVars(text, flavor) {
    const vars = extractVars(text).filter((v) => !v.name.includes('.'));
    let i = 0;
    const pos = {};
    vars.forEach((v) => { pos[v.name] = ++i; });
    return String(text || '').replace(VAR_RE, (m, name, ph) => {
      if (name.includes('.')) return m;
      const n = norm(name);
      if (flavor === 'copilot') {
        if (['selection', 'seleccion'].includes(n)) return '${selection}';
        if (['file', 'fichero', 'archivo'].includes(n)) return '${file}';
        return ph ? '${input:' + name + ':' + ph.trim() + '}' : '${input:' + name + '}';
      }
      if (flavor === 'claude') return vars.length === 1 ? '$ARGUMENTS' : '$' + pos[name];
      if (flavor === 'm365' || flavor === 'plain') return '[' + (ph ? ph.trim() : name.replace(/[_-]/g, ' ').toUpperCase()) + ']';
      return m;
    });
  }

  /* ------------------------------------------------------------------ *
   * Grafo de workflows
   * ------------------------------------------------------------------ */
  function wfMaps(wf) {
    const out = {}; const inc = {};
    (wf.nodes || []).forEach((n) => { out[n.id] = []; inc[n.id] = []; });
    (wf.edges || []).forEach((e) => { if (out[e.from] && inc[e.to]) { out[e.from].push(e); inc[e.to].push(e); } });
    return { out, inc };
  }
  function execNodes(wf) { return (wf.nodes || []).filter((n) => n.type !== 'note'); }
  function startNodes(wf) {
    const s = execNodes(wf).filter((n) => n.type === 'start');
    if (s.length) return s;
    const { inc } = wfMaps(wf);
    return execNodes(wf).filter((n) => !inc[n.id].length);
  }
  function backEdges(wf) {
    const { out } = wfMaps(wf);
    const color = {}; const back = new Set();
    const visit = (id) => {
      color[id] = 1;
      (out[id] || []).forEach((e) => {
        if (color[e.to] === 1) back.add(e.id);
        else if (!color[e.to]) visit(e.to);
      });
      color[id] = 2;
    };
    startNodes(wf).forEach((n) => { if (!color[n.id]) visit(n.id); });
    execNodes(wf).forEach((n) => { if (!color[n.id]) visit(n.id); });
    return back;
  }
  /** Orden lineal (topológico, ignorando retornos) para runbooks y vistas. */
  function linearize(wf) {
    const nodes = execNodes(wf);
    const back = backEdges(wf);
    const { inc, out } = wfMaps(wf);
    const deg = {};
    nodes.forEach((n) => { deg[n.id] = inc[n.id].filter((e) => !back.has(e.id)).length; });
    const byPos = (a, b) => (a.x || 0) - (b.x || 0) || (a.y || 0) - (b.y || 0);
    const ready = nodes.filter((n) => deg[n.id] === 0).sort((a, b) => (a.type === 'start' ? -1 : b.type === 'start' ? 1 : byPos(a, b)));
    const order = []; const seen = new Set();
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    while (ready.length) {
      const n = ready.shift();
      if (seen.has(n.id)) continue;
      seen.add(n.id); order.push(n);
      out[n.id].filter((e) => !back.has(e.id)).forEach((e) => {
        deg[e.to]--;
        if (deg[e.to] === 0 && byId[e.to]) { ready.push(byId[e.to]); ready.sort((a, b) => (a.type === 'end') - (b.type === 'end') || byPos(a, b)); }
      });
    }
    nodes.forEach((n) => { if (!seen.has(n.id)) order.push(n); });
    return order;
  }
  function reachable(wf, fromIds, skipBack) {
    const { out } = wfMaps(wf);
    const back = skipBack ? backEdges(wf) : new Set();
    const seen = new Set(); const stack = [...fromIds];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      (out[id] || []).forEach((e) => { if (!back.has(e.id)) stack.push(e.to); });
    }
    return seen;
  }
  /** Distribución automática por capas (izquierda → derecha). */
  function autoLayout(wf, opts) {
    opts = Object.assign({ dx: 290, dy: 150, x0: 60, y0: 60 }, opts || {});
    const order = linearize(wf);
    const back = backEdges(wf);
    const { inc } = wfMaps(wf);
    const layer = {};
    order.forEach((n) => {
      const preds = inc[n.id].filter((e) => !back.has(e.id)).map((e) => layer[e.from]).filter((v) => v !== undefined);
      layer[n.id] = preds.length ? Math.max(...preds) + 1 : 0;
    });
    const cols = {};
    order.forEach((n) => { (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n); });
    const maxRows = Math.max(1, ...Object.values(cols).map((c) => c.length));
    Object.keys(cols).forEach((l) => {
      const col = cols[l];
      const offset = ((maxRows - col.length) * opts.dy) / 2;
      col.forEach((n, i) => { n.x = opts.x0 + Number(l) * opts.dx; n.y = opts.y0 + offset + i * opts.dy; });
    });
    const notes = (wf.nodes || []).filter((n) => n.type === 'note');
    notes.forEach((n, i) => { n.x = opts.x0 + i * 240; n.y = opts.y0 + maxRows * opts.dy + 20; });
    return wf;
  }
  const REJECT_RE = /rechaz|reject|cambio|volver|repet|rehacer|\bko\b|^no$|no aprob/i;
  const isReject = (label) => REJECT_RE.test(norm(label || ''));
  function nodeLabel(lib, n) {
    if (n.title) return n.title;
    const L = indexLib(lib);
    if (n.agent && L.get('agent', n.agent)) return L.get('agent', n.agent).name;
    if (n.prompt && L.get('prompt', n.prompt)) return L.get('prompt', n.prompt).name;
    return NODE_TYPES[n.type] ? NODE_TYPES[n.type].label : n.id;
  }

  /* ------------------------------------------------------------------ *
   * Composición de prompts para ejecutar un paso
   * ------------------------------------------------------------------ */
  function resolveNode(lib, node) {
    const L = indexLib(lib);
    const prompt = node.prompt ? L.get('prompt', node.prompt) : null;
    let agent = node.agent ? L.get('agent', node.agent) : null;
    if (!agent && prompt && prompt.agent) agent = L.get('agent', prompt.agent);
    const skills = uniq([...(agent ? agent.skills : []), ...arr(node.skills)]).map((id) => L.get('skill', id)).filter(Boolean);
    const knowledge = uniq([...(agent ? agent.knowledge : []), ...arr(node.knowledge)]).map((id) => L.get('knowledge', id)).filter(Boolean);
    const mcp = uniq([...(agent ? agent.mcp : []), ...arr(node.mcp)]).map((id) => L.get('mcp', id)).filter(Boolean);
    return { agent, prompt, skills, knowledge, mcp };
  }
  function buildContext(wf, node, state) {
    state = state || {};
    const inputs = state.inputs || {};
    const results = state.results || {};
    const ctx = Object.assign({}, inputs, { inputs, steps: {} });
    (wf.nodes || []).forEach((n) => {
      const r = results[n.id];
      if (!r) return;
      ctx.steps[n.id] = r;
      if (n.outputKey) { ctx[n.outputKey] = r.output; ctx.steps[n.outputKey] = r; }
    });
    const { inc } = wfMaps(wf);
    const prevNodes = (inc[node.id] || []).map((e) => (wf.nodes || []).find((n) => n.id === e.from)).filter((n) => n && results[n.id]);
    ctx.prev = prevNodes.map((n) => results[n.id].output).filter(Boolean).join('\n\n');
    ctx._prevNodes = prevNodes;
    return ctx;
  }
  function section(title, body) { return body && String(body).trim() ? `## ${title}\n\n${String(body).trim()}` : ''; }

  function composeStep(lib, wf, node, state, extra) {
    extra = extra || {};
    state = state || {};
    const r = resolveNode(lib, node);
    const ctx = buildContext(wf, node, state);
    const globals = (lib.items || []).filter((i) => i.type === 'instruction' && i.global);
    const title = node.title || nodeLabel(lib, node);

    const sys = [];
    if (r.agent) sys.push(`# Rol: ${r.agent.name}\n\n${r.agent.description ? '_' + r.agent.description + '_\n\n' : ''}${render(r.agent.body, ctx)}`.trim());
    else sys.push('# Rol\n\nEres un asistente experto que ejecuta con rigor un paso de un workflow de trabajo con IA. Produces entregables completos, concretos y listos para usar.');
    if (globals.length) sys.push('# Normas del equipo\n\n' + globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n'));
    if (r.skills.length) sys.push('# Skills\n\nAplica estas skills cuando sean relevantes:\n\n' + r.skills.map((s) => `## Skill: ${s.name}\n\n_${s.description}_\n\n${s.body.trim()}`).join('\n\n'));
    if (r.knowledge.length) sys.push('# Conocimiento de referencia\n\n' + r.knowledge.map((k) => `## ${k.name}\n\n${k.body.trim()}`).join('\n\n'));
    if (r.mcp.length) sys.push('# Herramientas disponibles\n\n' + r.mcp.map((m) => `- **${m.name}** (MCP \`${m.id}\`): ${m.description}`).join('\n'));

    const usr = [];
    usr.push(`# ${wf.name} · ${title}`);
    if (wf.description) usr.push(section('Objetivo del workflow', wf.description));
    const inputs = state.inputs || {};
    const inLines = (wf.inputs || []).map((i) => inputs[i.name] ? `- **${i.label || i.name}**: ${inputs[i.name]}` : '').filter(Boolean);
    if (inLines.length) usr.push(section('Entradas', inLines.join('\n')));
    const mode = node.context || 'prev';
    if (mode !== 'none') {
      const list = mode === 'all'
        ? (wf.nodes || []).filter((n) => state.results && state.results[n.id] && n.id !== node.id && n.type !== 'start')
        : ctx._prevNodes.filter((n) => n.type !== 'start');
      const txt = list.map((n) => `### ${n.title || nodeLabel(lib, n)}\n\n${String(state.results[n.id].output || '').trim()}`).filter((x) => x.trim()).join('\n\n');
      if (txt) usr.push(section(mode === 'all' ? 'Resultados de los pasos anteriores' : 'Resultado del paso anterior', txt));
    }
    if (state.feedback && state.feedback[node.id]) usr.push(section('⚠ Feedback de la revisión (incorpóralo)', state.feedback[node.id]));
    if (node.instructions) usr.push(section('Tu tarea', render(node.instructions, ctx, { fallback: (n) => `«${n}»` })));
    if (r.prompt) {
      const vars = {};
      extractVars(r.prompt.body).forEach((v) => {
        const mapped = node.vars && node.vars[v.name];
        if (mapped) vars[v.name] = render(mapped, ctx, { fallback: '' });
      });
      const body = render(r.prompt.body, Object.assign({}, ctx, vars), { fallback: (n, ph) => `«${ph || n} (tómalo de las entradas o del contexto anterior)»` });
      usr.push(section(node.instructions ? 'Prompt a aplicar' : 'Tu tarea', body));
    }
    if (!node.instructions && !r.prompt && node.type === 'step') usr.push(section('Tu tarea', `Realiza el paso «${title}» del workflow usando tu rol y el contexto disponible.`));
    if (node.deliverable) usr.push(section('Entregable esperado', render(node.deliverable, ctx)));
    if (extra.options) {
      usr.push(section('Decisión', `${node.instructions ? '' : (node.question || 'Evalúa el contexto y decide cómo continuar.') + '\n\n'}Responde en la **primera línea** únicamente con una de estas opciones: ${extra.options.map((o) => `\`${o}\``).join(', ')}. Después justifica brevemente.`));
    }
    if (node.type === 'end') usr.push(section('Cierre', 'Consolida un resumen final del workflow: entregables, decisiones tomadas, riesgos y próximos pasos.'));

    const system = sys.filter(Boolean).join('\n\n');
    const user = usr.filter(Boolean).join('\n\n');
    return {
      title, system, user,
      full: `${system}\n\n---\n\n${user}`,
      agent: r.agent ? r.agent.id : null,
      prompt: r.prompt ? r.prompt.id : null,
      skills: r.skills.map((s) => s.id), knowledge: r.knowledge.map((k) => k.id), mcp: r.mcp.map((m) => m.id),
      model: (r.agent && r.agent.model) || (r.prompt && r.prompt.model) || ''
    };
  }
  /** Prompt compuesto para usar un agente "suelto" (fuera de workflows). */
  function composeAgent(lib, agent) {
    const fake = { id: 'agent', name: agent.name, nodes: [{ id: 'x', type: 'step', agent: agent.id }], edges: [] };
    return composeStep(lib, fake, fake.nodes[0], {}).system;
  }

  /* ------------------------------------------------------------------ *
   * Motor de ejecución E2E (navegador y CLI comparten este código)
   * hooks: llm(composed, info) → Promise<string>
   *        human({node, run, context, options}) → Promise<{approved, notes, output?}>
   *        choose({node, edges, answer}) → Promise<edge>
   *        onEvent(type, payload, run)
   * ------------------------------------------------------------------ */
  function matchOption(answer, edges, nodesById) {
    const first = norm(String(answer || '').split('\n').find((l) => l.trim()) || '').replace(/[`*_"'.:]/g, '').trim();
    if (!first) return null;
    const label = (e) => norm(e.label || (nodesById[e.to] && nodesById[e.to].title) || e.to);
    return edges.find((e) => label(e) === first) || edges.find((e) => first.startsWith(label(e))) || edges.find((e) => first.includes(label(e))) || null;
  }
  async function runWorkflow(lib, wf, inputs, hooks) {
    hooks = hooks || {};
    const run = {
      format: 'ai-center-run', id: new Date().toISOString().replace(/[:.]/g, '-') + '-' + wf.id,
      workflow: wf.id, workflowName: wf.name, startedAt: new Date().toISOString(),
      inputs: inputs || {}, status: 'running', steps: [], results: {}, feedback: {}, final: ''
    };
    const emit = (t, d) => { try { hooks.onEvent && hooks.onEvent(t, d, run); } catch (e) { /* ignore */ } };
    const { out, inc } = wfMaps(wf);
    const back = backEdges(wf);
    const nodes = Object.fromEntries((wf.nodes || []).map((n) => [n.id, n]));
    const queue = startNodes(wf).map((n) => n.id);
    const visits = {}; const done = new Set();
    const maxVisits = hooks.maxVisits || 5;
    let guard = 0;
    emit('run:start', run);
    while (queue.length) {
      if (hooks.signal && hooks.signal.aborted) { run.status = 'cancelled'; break; }
      if (++guard > 400) { run.status = 'error'; run.error = 'Demasiadas iteraciones (¿bucle infinito?)'; break; }
      let idx = queue.findIndex((id) => {
        const others = queue.filter((q) => q !== id);
        const pend = reachable(wf, others, true);
        return (inc[id] || []).filter((e) => !back.has(e.id)).every((e) => done.has(e.from) || !pend.has(e.from));
      });
      if (idx < 0) idx = 0;
      const id = queue.splice(idx, 1)[0];
      const node = nodes[id];
      if (!node || node.type === 'note') continue;
      visits[id] = (visits[id] || 0) + 1;
      if (visits[id] > maxVisits) { emit('warn', { message: `«${node.title || id}» superó ${maxVisits} iteraciones; se omite.` }); continue; }
      const step = { nodeId: id, type: node.type, title: node.title || nodeLabel(lib, node), attempt: visits[id], status: 'running', startedAt: new Date().toISOString() };
      run.steps.push(step);
      emit('step:start', step);
      let next = out[id];
      try {
        if (node.type === 'start') {
          step.output = (wf.inputs || []).map((i) => `- **${i.label || i.name}**: ${run.inputs[i.name] || '—'}`).join('\n') || 'Inicio del workflow.';
        } else if (node.type === 'human') {
          const ctx = buildContext(wf, node, run);
          const context = ctx._prevNodes.map((n) => `### ${n.title || nodeLabel(lib, n)}\n\n${run.results[n.id].output || ''}`).join('\n\n');
          step.context = context;
          const res = hooks.human ? await hooks.human({ node, run, step, context, edges: out[id] }) : { approved: true, notes: 'Aprobado automáticamente' };
          step.decision = res.approved ? 'aprobado' : 'cambios solicitados';
          step.notes = res.notes || '';
          step.output = res.output || (res.approved ? `✅ Aprobado. ${res.notes || ''}`.trim() : `🔁 Cambios solicitados: ${res.notes || ''}`);
          const rejects = out[id].filter((e) => isReject(e.label));
          if (res.approved) next = out[id].filter((e) => !isReject(e.label));
          else {
            next = rejects.length ? rejects : (inc[id] || []).map((e) => ({ id: 'retry-' + e.from, from: id, to: e.from }));
            next.forEach((e) => { run.feedback[e.to] = res.notes || 'Revisa y mejora el resultado.'; done.delete(e.to); });
          }
        } else if (node.type === 'condition') {
          const options = out[id].map((e) => e.label || (nodes[e.to] && nodes[e.to].title) || e.to);
          const composed = composeStep(lib, wf, node, run, { options });
          step.prompt = composed;
          const answer = hooks.llm ? await hooks.llm(composed, { node, step, run, kind: 'condition', options }) : '';
          step.output = answer;
          let chosen = matchOption(answer, out[id], nodes);
          if (!chosen && hooks.choose && out[id].length > 1) chosen = await hooks.choose({ node, edges: out[id], answer, options });
          if (!chosen) chosen = out[id][0];
          next = chosen ? [chosen] : [];
          step.decision = chosen ? (chosen.label || (nodes[chosen.to] && nodes[chosen.to].title)) : '';
        } else if (node.type === 'end') {
          if ((node.instructions || hooks.llmOnEnd) && hooks.llm) {
            const composed = composeStep(lib, wf, Object.assign({}, node, { context: 'all' }), run);
            step.prompt = composed;
            step.output = await hooks.llm(composed, { node, step, run, kind: 'end' });
          } else {
            step.output = run.steps.filter((s) => s.type === 'step' && s.output).map((s) => `## ${s.title}\n\n${s.output}`).join('\n\n');
          }
          run.final = step.output;
        } else {
          const composed = composeStep(lib, wf, node, run);
          step.prompt = composed;
          if (!hooks.llm) throw new Error('No hay motor de ejecución configurado');
          step.output = await hooks.llm(composed, { node, step, run, kind: 'step' });
          delete run.feedback[id];
        }
        step.status = 'done';
      } catch (e) {
        step.status = 'error'; step.error = e && e.message ? e.message : String(e);
        run.status = (e && e.name === 'AbortError') ? 'cancelled' : 'error';
        run.error = step.error;
        emit('step:error', step);
        break;
      }
      step.finishedAt = new Date().toISOString();
      run.results[id] = { output: step.output, title: step.title, key: node.outputKey || '' };
      done.add(id);
      emit('step:done', step);
      next.forEach((e) => { if (!queue.includes(e.to)) queue.push(e.to); });
    }
    if (run.status === 'running') run.status = 'completed';
    run.finishedAt = new Date().toISOString();
    emit('run:done', run);
    return run;
  }
  function runReport(run, wf) {
    const lines = [`# Informe de ejecución · ${run.workflowName}`, '',
      `- **Estado**: ${run.status}`, `- **Inicio**: ${run.startedAt}`, `- **Fin**: ${run.finishedAt || '—'}`, ''];
    const ins = Object.keys(run.inputs || {});
    if (ins.length) { lines.push('## Entradas', ''); ins.forEach((k) => lines.push(`- **${k}**: ${run.inputs[k]}`)); lines.push(''); }
    lines.push('## Pasos', '');
    run.steps.forEach((s, i) => {
      lines.push(`### ${i + 1}. ${s.title}${s.attempt > 1 ? ` (intento ${s.attempt})` : ''}`, '');
      lines.push(`_${(NODE_TYPES[s.type] || {}).label || s.type} · ${s.status}${s.decision ? ' · decisión: ' + s.decision : ''}_`, '');
      if (s.notes) lines.push(`> ${s.notes}`, '');
      if (s.output && s.type !== 'start') lines.push(String(s.output).trim(), '');
      if (s.error) lines.push(`**Error:** ${s.error}`, '');
    });
    if (run.final) lines.push('## Resultado final', '', run.final, '');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Validación (salud de la librería)
   * ------------------------------------------------------------------ */
  function validateWorkflow(lib, wf) {
    const issues = [];
    const L = indexLib(lib);
    const add = (level, msg, node) => issues.push({ level, type: 'workflow', id: wf.id, name: wf.name, msg, node: node ? node.id : undefined });
    const ex = execNodes(wf);
    if (!ex.length) { add('warn', 'El workflow está vacío.'); return issues; }
    if (!ex.some((n) => n.type === 'start')) add('warn', 'No tiene nodo de Inicio.');
    if (!ex.some((n) => n.type === 'end')) add('info', 'No tiene nodo de Fin (recomendado para consolidar el entregable).');
    const { out, inc } = wfMaps(wf);
    const reach = reachable(wf, startNodes(wf).map((n) => n.id));
    ex.forEach((n) => {
      const label = `«${n.title || nodeLabel(lib, n)}»`;
      if (!reach.has(n.id)) add('warn', `${label} no es alcanzable desde el inicio.`, n);
      if (n.type !== 'end' && !out[n.id].length) add('warn', `${label} no tiene salida.`, n);
      if (n.type !== 'start' && !inc[n.id].length) add('warn', `${label} no tiene entrada.`, n);
      if (n.agent && !L.get('agent', n.agent)) add('error', `${label} usa un agente inexistente: ${n.agent}`, n);
      if (n.prompt && !L.get('prompt', n.prompt)) add('error', `${label} usa un prompt inexistente: ${n.prompt}`, n);
      arr(n.skills).forEach((s) => { if (!L.get('skill', s)) add('error', `${label} usa una skill inexistente: ${s}`, n); });
      arr(n.knowledge).forEach((s) => { if (!L.get('knowledge', s)) add('error', `${label} usa conocimiento inexistente: ${s}`, n); });
      arr(n.mcp).forEach((s) => { if (!L.get('mcp', s)) add('error', `${label} usa un MCP inexistente: ${s}`, n); });
      if (n.type === 'step' && !n.agent && !n.prompt && !n.instructions) add('warn', `${label} no tiene agente, prompt ni instrucciones.`, n);
      if (n.type === 'condition' && out[n.id].length < 2) add('warn', `${label} es una decisión con menos de 2 salidas.`, n);
      if (n.type === 'condition' && out[n.id].some((e) => !e.label)) add('info', `${label}: etiqueta las salidas de la decisión (p. ej. «sí» / «no»).`, n);
    });
    const back = backEdges(wf);
    (wf.edges || []).forEach((e) => {
      if (!back.has(e.id)) return;
      const src = wf.nodes.find((n) => n.id === e.from);
      if (src && !['human', 'condition'].includes(src.type)) add('warn', `Hay un bucle que vuelve desde «${src.title || src.id}» sin decisión ni revisión humana: podría no terminar.`, src);
    });
    return issues;
  }
  function lint(lib) {
    const issues = [];
    const L = indexLib(lib);
    const seen = {};
    (lib.items || []).forEach((it) => {
      const add = (level, msg) => issues.push({ level, type: it.type, id: it.id, name: it.name, msg });
      const key = it.type + ':' + it.id;
      if (seen[key]) add('error', 'ID duplicado.');
      seen[key] = true;
      if (!it.description || it.description.length < 15) add('warn', 'Añade una descripción clara (cuándo usarlo): ayuda a personas y agentes a elegirlo.');
      if (it.type !== 'workflow' && !String(it.body || '').trim() && it.type !== 'mcp') add('warn', 'El contenido está vacío.');
      if (it.status === 'deprecated') add('info', 'Marcado como obsoleto.');
      if (it.type === 'agent') {
        it.skills.forEach((s) => { if (!L.get('skill', s)) add('error', `Skill inexistente: ${s}`); });
        it.knowledge.forEach((s) => { if (!L.get('knowledge', s)) add('error', `Conocimiento inexistente: ${s}`); });
        it.mcp.forEach((s) => { if (!L.get('mcp', s)) add('error', `MCP inexistente: ${s}`); });
        it.handoffs.forEach((s) => { if (!L.get('agent', s)) add('error', `Handoff a agente inexistente: ${s}`); });
        if (it.targets.includes('m365')) {
          const len = m365Instructions(lib, it).length;
          if (len > 8000) add('warn', `Las instrucciones para Copilot M365 ocupan ${len} caracteres (máx. 8000). Se recortarán al exportar.`);
          if (!it.starters.length) add('info', 'Añade conversation starters para Copilot M365.');
        }
      }
      if (it.type === 'prompt' && it.agent && !L.get('agent', it.agent)) add('error', `Agente inexistente: ${it.agent}`);
      if (it.type === 'skill') {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id) || it.id.length > 64) add('error', 'El id de una skill debe ser minúsculas con guiones (máx. 64) según el estándar Agent Skills.');
        if (it.description.length > 1024) add('warn', 'La descripción de una skill no debe superar 1024 caracteres.');
      }
      if (it.type === 'instruction' && !it.global && !it.applyTo) add('info', 'Sin applyTo: se aplicará a todos los ficheros (**).');
      if (it.type === 'mcp') {
        if (it.transport === 'stdio' && !it.command) add('error', 'Servidor stdio sin comando.');
        if (it.transport !== 'stdio' && !it.url) add('error', 'Servidor remoto sin URL.');
        Object.entries(Object.assign({}, it.env, it.headers)).forEach(([k, v]) => {
          if (/(token|key|secret|password|pwd)/i.test(k) && v && !/\$\{/.test(String(v))) add('error', `«${k}» parece un secreto en claro. Usa \${input:${k}} o una variable de entorno.`);
        });
      }
      if (it.type === 'workflow') issues.push(...validateWorkflow(lib, it));
    });
    return issues;
  }

  /* ------------------------------------------------------------------ *
   * Exportadores
   * ------------------------------------------------------------------ */
  const fmFile = (data, body) => {
    const clean = {};
    Object.keys(data).forEach((k) => { if (!isEmpty(data[k])) clean[k] = data[k]; });
    return stringifyFrontmatter(clean, body);
  };
  const header = (what) => `<!-- Generado por AI Center ${VERSION} · ${what}. Edita el original en /library y vuelve a exportar. -->\n\n`;
  function pick(lib, opts) {
    opts = opts || {};
    let items = (lib.items || []).filter((i) => i.status !== 'deprecated');
    if (opts.ids && opts.ids.length) {
      const set = new Set(opts.ids);
      items = items.filter((i) => set.has(i.type + ':' + i.id));
    }
    if (opts.tag) items = items.filter((i) => i.tags.includes(opts.tag));
    if (opts.target) items = items.filter((i) => !i.targets.length || i.targets.includes(opts.target) || i.targets.includes('any'));
    const by = (t) => items.filter((i) => i.type === t);
    return { items, by, L: indexLib(lib) };
  }
  function paths(flavor) {
    const P = {
      copilot: {
        agent: (id) => `.github/agents/${id}.agent.md`, prompt: (id) => `.github/prompts/${id}.prompt.md`,
        skill: (id) => `.github/skills/${id}/SKILL.md`, knowledge: (id) => `docs/ai/knowledge/${id}.md`, workflow: (id) => `.github/prompts/wf-${id}.prompt.md`
      },
      claude: {
        agent: (id) => `.claude/agents/${id}.md`, prompt: (id) => `.claude/commands/${id}.md`,
        skill: (id) => `.claude/skills/${id}/SKILL.md`, knowledge: (id) => `docs/ai/knowledge/${id}.md`, workflow: (id) => `.claude/commands/wf-${id}.md`
      },
      cursor: {
        agent: (id) => `.cursor/rules/agent-${id}.mdc`, prompt: (id) => `.cursor/commands/${id}.md`,
        skill: (id) => `.cursor/rules/skill-${id}.mdc`, knowledge: (id) => `docs/ai/knowledge/${id}.md`, workflow: (id) => `.cursor/commands/wf-${id}.md`
      },
      generic: {
        agent: (id) => `ai/agents/${id}.md`, prompt: (id) => `ai/prompts/${id}.md`,
        skill: (id) => `ai/skills/${id}/SKILL.md`, knowledge: (id) => `docs/ai/knowledge/${id}.md`, workflow: (id) => `ai/workflows/${id}.md`
      },
      library: {
        agent: (id) => `library/agents/${id}.agent.md`, prompt: (id) => `library/prompts/${id}.prompt.md`,
        skill: (id) => `library/skills/${id}/SKILL.md`, knowledge: (id) => `library/knowledge/${id}.md`, workflow: (id) => `library/workflows/${id}.workflow.json`
      }
    };
    return P[flavor] || P.generic;
  }
  function rel(from, to) {
    const a = from.split('/').slice(0, -1); const b = to.split('/');
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/') || './';
  }
  function agentBodyFor(lib, a, flavor, selfPath) {
    const L = indexLib(lib);
    const P = paths(flavor);
    let body = a.body.trim();
    const skills = a.skills.map((id) => L.get('skill', id)).filter(Boolean);
    const know = a.knowledge.map((id) => L.get('knowledge', id)).filter(Boolean);
    const mcp = a.mcp.map((id) => L.get('mcp', id)).filter(Boolean);
    if (skills.length) body += '\n\n## Skills\n\nCarga y aplica estas skills cuando sean relevantes:\n\n' + skills.map((s) => `- [${s.name}](${rel(selfPath, P.skill(s.id))}) — ${s.description}`).join('\n');
    if (know.length) body += '\n\n## Conocimiento de referencia\n\nConsulta estos documentos antes de responder:\n\n' + know.map((k) => `- [${k.name}](${rel(selfPath, P.knowledge(k.id))}) — ${k.description}`).join('\n');
    if (mcp.length) body += '\n\n## Herramientas MCP\n\n' + mcp.map((m) => `- **${m.name}** (\`${m.id}\`): ${m.description}`).join('\n');
    if (a.handoffs.length) body += '\n\n## Traspasos\n\nCuando termines tu parte, propone continuar con:\n\n' + a.handoffs.map((h) => L.get('agent', h)).filter(Boolean).map((h) => `- **${h.name}** — ${h.description}`).join('\n');
    return body;
  }
  function mcpServers(list, flavor) {
    const servers = {}; const inputs = [];
    list.forEach((m) => {
      const fix = (o) => {
        const r = {};
        Object.keys(o || {}).forEach((k) => {
          let v = String(o[k]);
          v = v.replace(/\$\{input:([\w-]+)\}/g, (_, n) => {
            if (flavor === 'copilot') { if (!inputs.some((i) => i.id === n)) inputs.push({ id: n, type: 'promptString', description: `${n} (${m.name})`, password: /token|key|secret|pass/i.test(n) }); return '${input:' + n + '}'; }
            return '${' + n + '}';
          });
          r[k] = v;
        });
        return r;
      };
      const s = m.transport === 'stdio'
        ? { type: 'stdio', command: m.command, args: m.args }
        : { type: m.transport === 'sse' ? 'sse' : 'http', url: m.url };
      if (!isEmpty(m.env)) s.env = fix(m.env);
      if (!isEmpty(m.headers)) s.headers = fix(m.headers);
      servers[m.id] = s;
    });
    return flavor === 'copilot' ? { servers, inputs } : { mcpServers: servers };
  }
  function mermaid(lib, wf) {
    const esc = (s) => String(s || '').replace(/["\[\]{}()<>|#]/g, ' ').replace(/\s+/g, ' ').trim();
    const mid = (id) => 'n_' + String(id).replace(/[^\w]/g, '_');
    const shape = (n) => {
      const t = esc(n.title || nodeLabel(lib, n));
      const id = mid(n.id);
      if (n.type === 'start' || n.type === 'end') return `${id}(["${t}"])`;
      if (n.type === 'condition') return `${id}{"${t}"}`;
      if (n.type === 'human') return `${id}[/"🧑 ${t}"/]`;
      return `${id}["${t}"]`;
    };
    const lines = ['flowchart LR'];
    execNodes(wf).forEach((n) => lines.push('  ' + shape(n)));
    (wf.edges || []).forEach((e) => lines.push(`  ${mid(e.from)} -->${e.label ? '|' + esc(e.label) + '|' : ''} ${mid(e.to)}`));
    return lines.join('\n');
  }
  /** Runbook: el workflow como instrucciones ejecutables por un agente (E2E). */
  function workflowRunbook(lib, wf, flavor) {
    flavor = flavor || 'generic';
    const P = paths(flavor);
    const selfPath = P.workflow(wf.id);
    const link = (path, label) => flavor === 'm365' ? `**${label}**` : `[${label}](${rel(selfPath, path)})`;
    const order = linearize(wf);
    const num = {}; order.forEach((n, i) => { num[n.id] = i + 1; });
    const { out } = wfMaps(wf);
    const nodesById = Object.fromEntries(order.map((n) => [n.id, n]));
    const L = indexLib(lib);
    const runDir = `ai-runs/${wf.id}`;
    const L2 = [];
    L2.push(`# 🔀 Workflow: ${wf.name}`, '');
    if (wf.description) L2.push(`> ${wf.description.replace(/\n/g, '\n> ')}`, '');
    if (flavor === 'm365') {
      L2.push('## Cómo ejecutarlo en Copilot M365', '',
        'Copilot M365 no encadena agentes automáticamente: copia el prompt de cada paso en orden (o usa el **Ejecutor** de AI Center, que lo hace por ti y guarda el resultado). Pega en cada paso la salida del anterior donde se indica.', '');
    } else {
      L2.push('## Instrucciones para el agente orquestador', '',
        'Vas a ejecutar este workflow **de principio a fin (E2E)**. Reglas:', '',
        '1. Crea una lista de tareas (todo list) con todos los pasos y ve marcándolos.',
        '2. Ejecuta los pasos **en orden**, siguiendo las transiciones indicadas en «Siguiente».',
        '3. En cada paso **adopta el rol del agente indicado**: lee su definición y aplica sus instrucciones, skills y conocimiento de referencia.',
        `4. Guarda el entregable de cada paso en \`${runDir}/NN-<paso>.md\` y úsalo como contexto de los siguientes.`,
        '5. En los pasos **🧑 Revisión humana**, DETENTE: muestra un resumen y espera aprobación explícita. Si piden cambios, vuelve al paso indicado incorporando el feedback.',
        '6. En las **◆ Decisiones**, evalúa el criterio, elige una rama y explica por qué.',
        `7. Al terminar, genera \`${runDir}/RESUMEN.md\` con entregables, decisiones, riesgos y próximos pasos.`,
        '8. No inventes datos: si falta información imprescindible, pregúntala.', '');
    }
    if ((wf.inputs || []).length) {
      L2.push('## Entradas', '');
      wf.inputs.forEach((i) => {
        const v = flavor === 'copilot' ? '${input:' + i.name + ':' + (i.description || i.label || i.name).replace(/[{}:]/g, ' ') + '}'
          : flavor === 'claude' ? (wf.inputs.length === 1 ? '$ARGUMENTS' : `(pídelo al usuario si no viene en $ARGUMENTS)`)
            : `[${(i.label || i.name).toUpperCase()}]`;
        L2.push(`- **${i.label || i.name}**${i.required ? ' (obligatorio)' : ''}: ${v}${i.description && flavor !== 'copilot' ? ` — ${i.description}` : ''}`);
      });
      L2.push('');
    }
    if (flavor !== 'm365') L2.push('## Mapa del flujo', '', '```mermaid', mermaid(lib, wf), '```', '');
    L2.push('## Pasos', '');
    order.forEach((n) => {
      const r = resolveNode(lib, n);
      const t = n.title || nodeLabel(lib, n);
      const icon = (NODE_TYPES[n.type] || {}).icon || '';
      L2.push(`### Paso ${num[n.id]} · ${icon} ${t}`, '');
      const meta = [`- **Tipo**: ${(NODE_TYPES[n.type] || {}).label || n.type}`];
      if (r.agent) meta.push(`- **Agente**: ${link(P.agent(r.agent.id), r.agent.name)}`);
      if (r.skills.length) meta.push(`- **Skills**: ${r.skills.map((s) => link(P.skill(s.id), s.name)).join(', ')}`);
      if (r.knowledge.length) meta.push(`- **Conocimiento**: ${r.knowledge.map((k) => link(P.knowledge(k.id), k.name)).join(', ')}`);
      if (r.mcp.length) meta.push(`- **Herramientas**: ${r.mcp.map((m) => '`' + m.id + '`').join(', ')}`);
      if (n.type !== 'start' && n.type !== 'end' && n.type !== 'human' && flavor !== 'm365') meta.push(`- **Guardar en**: \`${runDir}/${String(num[n.id]).padStart(2, '0')}-${slugify(t)}.md\``);
      L2.push(meta.join('\n'), '');
      if (n.type === 'start') L2.push('Recoge y confirma las entradas. Si falta alguna obligatoria, pídela antes de continuar.', '');
      if (n.instructions) L2.push('**Instrucciones**', '', String(n.instructions).trim(), '');
      if (n.type === 'condition' && n.question) L2.push(`**Criterio**: ${n.question}`, '');
      if (n.type === 'human') L2.push(`**🧑 Punto de control**: ${n.instructions ? '' : 'Presenta los resultados anteriores y '}DETENTE hasta recibir aprobación explícita.`, '');
      if (r.prompt) {
        const body = convertVars(r.prompt.body, flavor === 'copilot' ? 'plain' : 'plain');
        L2.push(`**Prompt** (${flavor === 'm365' ? r.prompt.name : link(P.prompt(r.prompt.id), r.prompt.name)})`, '', '````markdown', body.trim(), '````', '');
      }
      if (flavor === 'm365' && n.type === 'step') {
        const c = composeStep(lib, wf, n, { inputs: {}, results: {} });
        L2.push('<details><summary>Prompt completo para pegar en Copilot</summary>', '', '````markdown', convertVars(c.full, 'm365').replace(/«([^»]+)»/g, '[$1]'), '````', '', '</details>', '');
      }
      if (n.deliverable) L2.push(`**Entregable**: ${n.deliverable}`, '');
      const outs = (out[n.id] || []);
      if (outs.length) {
        const txt = outs.map((e) => {
          const tgt = nodesById[e.to];
          const dest = tgt ? `Paso ${num[e.to]} (${tgt.title || nodeLabel(lib, tgt)})` : e.to;
          return e.label ? `si «${e.label}» → ${dest}` : `→ ${dest}`;
        });
        L2.push(`**Siguiente**: ${txt.join(' · ')}`, '');
      } else if (n.type === 'end') L2.push('**Fin del workflow.** Genera el resumen final.', '');
    });
    return L2.join('\n');
  }
  function agentsMd(lib, flavor, opts) {
    const { by } = pick(lib, opts);
    const P = paths(flavor);
    const g = by('instruction').filter((i) => i.global);
    const cfg = lib.config || DEFAULT_CONFIG;
    const L = [`# AGENTS.md · ${cfg.workspace}`, '',
      '> Guía para agentes de IA (GitHub Copilot coding agent, Copilot CLI, Claude Code, Codex, Cursor…). Generado por AI Center: edita el original en `/library`.', ''];
    if (g.length) { L.push('## Normas del equipo', ''); g.forEach((i) => L.push(`### ${i.name}`, '', i.body.trim(), '')); }
    const agents = by('agent');
    if (agents.length) {
      L.push('## Agentes especializados', '', 'Adopta el rol adecuado según la tarea:', '', '| Agente | Cuándo usarlo | Definición |', '|---|---|---|');
      agents.forEach((a) => L.push(`| ${a.icon || '🤖'} ${a.name} | ${a.description.replace(/\|/g, '/').replace(/\n/g, ' ')} | [\`${P.agent(a.id)}\`](${P.agent(a.id)}) |`));
      L.push('');
    }
    const wfs = by('workflow');
    if (wfs.length) {
      L.push('## Workflows ejecutables E2E', '', 'Cuando te pidan ejecutar un workflow, abre su runbook y síguelo paso a paso (incluidas las paradas de revisión humana):', '');
      wfs.forEach((w) => L.push(`- **${w.name}** — ${w.description.replace(/\n/g, ' ')} → [\`${P.workflow(w.id)}\`](${P.workflow(w.id)})`));
      L.push('');
    }
    const sk = by('skill');
    if (sk.length) { L.push('## Skills', ''); sk.forEach((s) => L.push(`- **${s.name}** — ${s.description} → [\`${P.skill(s.id)}\`](${P.skill(s.id)})`)); L.push(''); }
    const kn = by('knowledge');
    if (kn.length) { L.push('## Conocimiento de referencia', ''); kn.forEach((k) => L.push(`- [${k.name}](${P.knowledge(k.id)}) — ${k.description}`)); L.push(''); }
    const pr = by('prompt');
    if (pr.length) { L.push('## Prompts reutilizables', ''); pr.forEach((p) => L.push(`- **${p.name}** — ${p.description} → \`${P.prompt(p.id)}\``)); L.push(''); }
    const sc = by('instruction').filter((i) => !i.global);
    if (sc.length) { L.push('## Instrucciones por tipo de fichero', ''); sc.forEach((i) => L.push(`- \`${i.applyTo || '**'}\` → **${i.name}**: ${i.description}`)); L.push(''); }
    return L.join('\n');
  }
  function m365Instructions(lib, a) {
    const L = indexLib(lib);
    let txt = a.body.trim();
    const skills = a.skills.map((id) => L.get('skill', id)).filter(Boolean);
    const know = a.knowledge.map((id) => L.get('knowledge', id)).filter(Boolean);
    const globals = (lib.items || []).filter((i) => i.type === 'instruction' && i.global && (!i.targets.length || i.targets.includes('m365') || i.targets.includes('any')));
    let extra = '';
    if (skills.length) extra += '\n\n# Procedimientos\n\n' + skills.map((s) => `## ${s.name}\n${s.body.trim()}`).join('\n\n');
    if (know.length) extra += '\n\n# Contexto\n\n' + know.map((k) => `## ${k.name}\n${k.body.trim()}`).join('\n\n');
    if (globals.length) extra += '\n\n# Normas\n\n' + globals.map((g) => g.body.trim()).join('\n\n');
    return (txt + extra).replace(/\n{3,}/g, '\n\n');
  }
  function m365Fit(lib, a) {
    const full = m365Instructions(lib, a);
    if (full.length <= 8000) return full;
    const L = indexLib(lib);
    let short = a.body.trim();
    const skills = a.skills.map((id) => L.get('skill', id)).filter(Boolean);
    if (skills.length) short += '\n\n# Procedimientos disponibles\n' + skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    return short.length > 8000 ? short.slice(0, 7950) + '\n…' : short;
  }
  function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function exportCopilot(lib, opts) {
    const { by, L } = pick(lib, opts);
    const P = paths('copilot');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    const globals = by('instruction').filter((i) => i.global);
    let ci = header('GitHub Copilot · instrucciones del repositorio') + `# Instrucciones del equipo para GitHub Copilot\n\n`;
    ci += globals.length ? globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n') : '_Sin instrucciones globales._';
    const ag = by('agent'); const wf = by('workflow');
    if (ag.length || wf.length) {
      ci += '\n\n## Recursos de IA disponibles\n\n';
      if (ag.length) ci += '**Custom agents** (selector de agentes del chat):\n' + ag.map((a) => `- \`${a.id}\` — ${a.name}: ${a.description}`).join('\n') + '\n\n';
      if (wf.length) ci += '**Workflows E2E** (escribe `/wf-<id>` en el chat):\n' + wf.map((w) => `- \`/wf-${w.id}\` — ${w.name}`).join('\n') + '\n';
    }
    add('.github/copilot-instructions.md', ci + '\n');
    by('instruction').filter((i) => !i.global).forEach((i) => add(`.github/instructions/${i.id}.instructions.md`, fmFile({ description: i.description, applyTo: i.applyTo || '**' }, i.body)));
    by('prompt').forEach((p) => {
      const agent = p.agent && L.get('agent', p.agent) ? p.agent : (p.mode || undefined);
      add(P.prompt(p.id), fmFile({ description: p.description, agent, model: p.model, tools: p.tools }, convertVars(p.body, 'copilot')));
    });
    ag.forEach((a) => {
      const path = P.agent(a.id);
      const tools = uniq([...a.tools, ...a.mcp.filter((m) => L.get('mcp', m)).map((m) => `${m}/*`)]);
      const handoffs = a.handoffs.map((h) => L.get('agent', h)).filter(Boolean).map((h) => ({ label: `Continuar con ${h.name}`, agent: h.id, prompt: `Continúa a partir del trabajo anterior en tu rol de ${h.name}.`, send: false }));
      add(path, fmFile({ name: a.name, description: a.description, tools, model: a.model, handoffs }, agentBodyFor(lib, a, 'copilot', path)));
    });
    by('skill').forEach((s) => {
      add(P.skill(s.id), fmFile({ name: s.id, description: s.description, license: s.license, 'allowed-tools': s.allowedTools }, s.body));
      Object.keys(s._files || {}).forEach((r) => add(`.github/skills/${s.id}/${r}`, s._files[r]));
    });
    by('knowledge').forEach((k) => add(P.knowledge(k.id), `# ${k.name}\n\n${k.description ? '> ' + k.description + '\n\n' : ''}${k.body.trim()}\n`));
    const mcps = by('mcp');
    if (mcps.length) add('.vscode/mcp.json', JSON.stringify(mcpServers(mcps, 'copilot'), null, 2) + '\n');
    wf.forEach((w) => {
      add(P.workflow(w.id), fmFile({ description: `Workflow E2E: ${w.name}`, agent: 'agent' }, workflowRunbook(lib, w, 'copilot')));
      add(`docs/ai/workflows/${w.id}.workflow.json`, itemToFile(w).content);
    });
    add('AGENTS.md', agentsMd(lib, 'copilot', opts));
    return files;
  }
  function exportClaude(lib, opts) {
    const { by, L } = pick(lib, opts);
    const P = paths('claude');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    const globals = by('instruction').filter((i) => i.global);
    add('CLAUDE.md', `# Instrucciones del proyecto\n\n${globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n')}\n\n## Agentes, skills y workflows\n\n@AGENTS.md\n`);
    by('instruction').filter((i) => !i.global).forEach((i) => add(`.claude/rules/${i.id}.md`, fmFile({ description: i.description, paths: i.applyTo ? arr(i.applyTo) : undefined }, i.body)));
    by('agent').forEach((a) => {
      const path = P.agent(a.id);
      const m = norm(a.model);
      const model = m.includes('opus') ? 'opus' : m.includes('haiku') ? 'haiku' : m.includes('sonnet') ? 'sonnet' : undefined;
      add(path, fmFile({ name: a.id, description: a.description, model }, agentBodyFor(lib, a, 'claude', path)));
    });
    by('prompt').forEach((p) => {
      const vars = extractVars(p.body).filter((v) => !v.name.includes('.'));
      add(P.prompt(p.id), fmFile({ description: p.description, 'argument-hint': vars.length ? vars.map((v) => `[${v.name}]`).join(' ') : undefined }, convertVars(p.body, 'claude')));
    });
    by('skill').forEach((s) => {
      add(P.skill(s.id), fmFile({ name: s.id, description: s.description, license: s.license, 'allowed-tools': s.allowedTools }, s.body));
      Object.keys(s._files || {}).forEach((r) => add(`.claude/skills/${s.id}/${r}`, s._files[r]));
    });
    by('knowledge').forEach((k) => add(P.knowledge(k.id), `# ${k.name}\n\n${k.description ? '> ' + k.description + '\n\n' : ''}${k.body.trim()}\n`));
    const mcps = by('mcp');
    if (mcps.length) add('.mcp.json', JSON.stringify(mcpServers(mcps, 'claude'), null, 2) + '\n');
    by('workflow').forEach((w) => add(P.workflow(w.id), fmFile({ description: `Workflow E2E: ${w.name}`, 'argument-hint': (w.inputs || []).map((i) => `[${i.name}]`).join(' ') || undefined }, workflowRunbook(lib, w, 'claude'))));
    add('AGENTS.md', agentsMd(lib, 'claude', opts));
    void L;
    return files;
  }
  function exportCursor(lib, opts) {
    const { by } = pick(lib, opts);
    const P = paths('cursor');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    by('instruction').forEach((i) => add(`.cursor/rules/${i.id}.mdc`, fmFile({ description: i.description, globs: i.global ? undefined : (i.applyTo || '**'), alwaysApply: i.global ? true : false }, i.body)));
    by('agent').forEach((a) => { const path = P.agent(a.id); add(path, fmFile({ description: `Rol ${a.name}: ${a.description}`, alwaysApply: false }, `# ${a.name}\n\n${agentBodyFor(lib, a, 'cursor', path)}`)); });
    by('skill').forEach((s) => add(P.skill(s.id), fmFile({ description: s.description, alwaysApply: false }, s.body)));
    by('prompt').forEach((p) => add(P.prompt(p.id), convertVars(p.body, 'plain')));
    by('knowledge').forEach((k) => add(P.knowledge(k.id), `# ${k.name}\n\n${k.body.trim()}\n`));
    const mcps = by('mcp');
    if (mcps.length) add('.cursor/mcp.json', JSON.stringify(mcpServers(mcps, 'cursor'), null, 2) + '\n');
    by('workflow').forEach((w) => add(P.workflow(w.id), workflowRunbook(lib, w, 'cursor')));
    add('AGENTS.md', agentsMd(lib, 'cursor', opts));
    return files;
  }
  function m365Package(lib, a, opts) {
    opts = opts || {};
    const cfg = lib.config || DEFAULT_CONFIG;
    const appId = stableUuid('aic-m365-' + (cfg.workspace || '') + '-' + a.id);
    const instructions = m365Fit(lib, a);
    const caps = (a.capabilities.length ? a.capabilities : []).map((c) => {
      if (c === 'OneDriveAndSharePoint' && a.sharepointUrls.length) return { name: c, items_by_url: a.sharepointUrls.map((u) => ({ url: u })) };
      if (c === 'WebSearch' && opts.webSites) return { name: c, sites: opts.webSites };
      return { name: c };
    });
    const da = {
      $schema: 'https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.5/schema.json',
      version: 'v1.5',
      name: trunc(a.name, 100),
      description: trunc(a.description, 1000),
      instructions,
      conversation_starters: a.starters.slice(0, 12).map((s) => ({ title: trunc(s.split(/[.:?¿!¡]/)[0] || s, 50), text: s }))
    };
    if (caps.length) da.capabilities = caps;
    const manifest = {
      $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json',
      manifestVersion: '1.19',
      version: a.version && /^\d+\.\d+\.\d+$/.test(a.version) ? a.version : '1.0.0',
      id: appId,
      developer: {
        name: trunc(cfg.organization || cfg.workspace || 'AI Center', 32),
        websiteUrl: cfg.websiteUrl || 'https://www.example.com',
        privacyUrl: cfg.privacyUrl || 'https://www.example.com/privacy',
        termsOfUseUrl: cfg.termsUrl || 'https://www.example.com/terms'
      },
      icons: { color: 'color.png', outline: 'outline.png' },
      name: { short: trunc(a.name, 30), full: trunc(a.name, 100) },
      description: { short: trunc(a.description, 80), full: trunc(a.description, 4000) },
      accentColor: cfg.accentColor || '#6E56CF',
      copilotAgents: { declarativeAgents: [{ id: 'declarativeAgent', file: 'declarativeAgent.json' }] },
      permissions: ['identity'],
      validDomains: []
    };
    const initials = a.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    return { manifest, declarativeAgent: da, icons: [{ name: 'color.png', size: 192, text: initials, color: manifest.accentColor }, { name: 'outline.png', size: 32, text: initials[0] || 'A', outline: true }] };
  }
  function agentBuilderGuide(lib, a) {
    const pkg = m365Package(lib, a);
    return [`# ${a.icon || '🤖'} ${a.name} · Copilot M365 Agent Builder`, '',
      '## Opción A · Sin código (Agent Builder en Microsoft 365 Copilot)', '',
      '1. Abre **Microsoft 365 Copilot** → **Agentes** → **Crear agente** → pestaña **Configurar**.',
      '2. Copia cada campo de abajo en su sitio.',
      '3. En **Conocimiento** añade los sitios de SharePoint/OneDrive indicados y activa las capacidades.',
      '4. Prueba en el panel derecho y pulsa **Crear**. Compártelo con tu equipo.', '',
      '### Nombre', '', '```text', a.name, '```', '',
      '### Descripción', '', '```text', a.description, '```', '',
      '### Instrucciones', '', '```text', pkg.declarativeAgent.instructions, '```', '',
      '### Conversation starters', '', ...(a.starters.length ? a.starters.map((s) => `- ${s}`) : ['_(ninguno)_']), '',
      '### Conocimiento y capacidades', '', ...(a.sharepointUrls.map((u) => `- 📁 ${u}`)), ...(a.capabilities.map((c) => `- ✅ ${c}`)), (a.sharepointUrls.length || a.capabilities.length) ? '' : '_(ninguno)_', '',
      '## Opción B · Paquete (Microsoft 365 Agents Toolkit / subida de app)', '',
      '- La carpeta `appPackage/` contiene `manifest.json`, `declarativeAgent.json` e iconos.',
      '- Comprímela (los ficheros en la raíz del zip) y súbela en Teams → **Aplicaciones** → **Administrar aplicaciones** → **Cargar una aplicación personalizada**, o ábrela con **Agents Toolkit** en VS Code para validar y provisionar.',
      '- Revisa `developer.*Url` en el manifest antes de publicar a toda la organización.', ''].join('\n');
  }
  function exportM365(lib, opts) {
    opts = opts || {};
    const { by } = pick(lib, opts);
    const files = [];
    const add = (path, content) => files.push({ path, content });
    const agents = by('agent').filter((a) => opts.allAgents || !a.targets.length || a.targets.includes('m365') || a.targets.includes('any'));
    agents.forEach((a) => {
      const pkg = m365Package(lib, a, opts);
      const base = `m365/agents/${a.id}`;
      add(`${base}/appPackage/manifest.json`, JSON.stringify(pkg.manifest, null, 2) + '\n');
      add(`${base}/appPackage/declarativeAgent.json`, JSON.stringify(pkg.declarativeAgent, null, 2) + '\n');
      pkg.icons.forEach((ic) => files.push({ path: `${base}/appPackage/${ic.name}`, icon: ic }));
      add(`${base}/AGENT-BUILDER.md`, agentBuilderGuide(lib, a));
    });
    const prompts = by('prompt');
    if (prompts.length) {
      const L = ['# 💬 Prompts para Copilot M365', '', '> Copia el prompt, sustituye los [CORCHETES] y pégalo en Copilot (Chat, Word, Outlook, Teams…). Consejo: guárdalos en tu galería de prompts de Copilot.', ''];
      prompts.forEach((p) => L.push(`## ${p.icon || '💬'} ${p.name}`, '', `_${p.description}_`, '', '```text', convertVars(p.body, 'm365').trim(), '```', ''));
      add('m365/PROMPTS.md', L.join('\n'));
    }
    by('workflow').forEach((w) => add(`m365/workflows/${w.id}.md`, workflowRunbook(lib, w, 'm365')));
    add('m365/README.md', ['# Copilot M365 · Paquete generado por AI Center', '',
      '- `agents/<id>/AGENT-BUILDER.md` → crea el agente sin código copiando y pegando.',
      '- `agents/<id>/appPackage/` → paquete de agente declarativo (manifest 1.19 + declarative agent v1.5) para Agents Toolkit o carga de app personalizada.',
      '- `PROMPTS.md` → prompts listos para Copilot Chat, Word, Outlook, Teams.',
      '- `workflows/` → flujos paso a paso. Para ejecutarlos guiado, usa el Ejecutor de AI Center en modo manual.', ''].join('\n'));
    return files;
  }
  function exportGeneric(lib, opts) {
    const { by } = pick(lib, opts);
    const P = paths('generic');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    by('prompt').forEach((p) => add(P.prompt(p.id), `# ${p.name}\n\n> ${p.description}\n\n${convertVars(p.body, 'plain').trim()}\n`));
    by('agent').forEach((a) => add(P.agent(a.id), `# ${a.name} · system prompt\n\n> ${a.description}\n\n${composeAgent(lib, a)}\n`));
    by('skill').forEach((s) => add(P.skill(s.id), fmFile({ name: s.id, description: s.description }, s.body)));
    by('knowledge').forEach((k) => add(P.knowledge(k.id), `# ${k.name}\n\n${k.body.trim()}\n`));
    by('workflow').forEach((w) => add(P.workflow(w.id), workflowRunbook(lib, w, 'generic')));
    add('AGENTS.md', agentsMd(lib, 'generic', opts));
    return files;
  }
  const EXPORTERS = {
    copilot: { label: 'GitHub Copilot', desc: '.github/ (instructions, prompts, agents, skills), .vscode/mcp.json, AGENTS.md y workflows como /wf-*', fn: exportCopilot },
    m365: { label: 'Copilot M365', desc: 'Agentes declarativos (manifest + declarativeAgent.json + iconos), guía para Agent Builder, prompts y workflows guiados', fn: exportM365 },
    claude: { label: 'Claude Code', desc: 'CLAUDE.md, .claude/agents, .claude/commands, .claude/skills, .mcp.json', fn: exportClaude },
    cursor: { label: 'Cursor', desc: '.cursor/rules/*.mdc, .cursor/commands, .cursor/mcp.json', fn: exportCursor },
    generic: { label: 'Cualquier IA', desc: 'ai/ con prompts y system prompts en texto plano, runbooks y AGENTS.md', fn: exportGeneric }
  };
  function exportTargets(lib, targets, opts) {
    const seen = new Map();
    (targets || []).forEach((t) => {
      if (!EXPORTERS[t]) return;
      EXPORTERS[t].fn(lib, opts).forEach((f) => {
        if (seen.has(f.path) && f.path === 'AGENTS.md') return;
        if (!seen.has(f.path)) seen.set(f.path, f);
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  return {
    VERSION, TYPES, TYPE_ORDER, AUDIENCES, TARGETS, STATUS, PROMPT_MODES, KNOWLEDGE_KINDS, COPILOT_TOOLS, M365_CAPS, MCP_TRANSPORTS,
    NODE_TYPES, FIELDS, BODY_LABEL, DEFAULT_CONFIG, EXPORTERS,
    slugify, uniq, arr, today, clone, norm, uid, isEmpty, stableUuid,
    parseYaml, toYaml, parseFrontmatter, stringifyFrontmatter,
    pathFor, classifyPath, itemFromFile, itemToFile, normalizeItem, newItem,
    libraryFromFiles, libraryToFiles, serializeBundle, parseBundle, sortItems, indexLib, usagesOf,
    extractVars, render, convertVars,
    wfMaps, startNodes, backEdges, linearize, autoLayout, reachable, isReject, nodeLabel,
    resolveNode, composeStep, composeAgent, runWorkflow, runReport,
    lint, validateWorkflow,
    workflowRunbook, agentsMd, mermaid, m365Package, m365Instructions, agentBuilderGuide,
    exportCopilot, exportClaude, exportCursor, exportM365, exportGeneric, exportTargets
  };
});
