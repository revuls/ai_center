/*!
 * AI Center · core.js
 * Core shared by the app (browser, file://) and the CLI (Node).
 * No dependencies. Contains: data model, file format (YAML frontmatter / JSON),
 * templates, workflow engine, prompt composition, validation and exporters
 * (GitHub Copilot, Copilot M365, Claude Code, Cursor, generic AGENTS.md).
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
   * Model
   * ------------------------------------------------------------------ */
  const TYPES = {
    workflow: {
      key: 'workflow', label: 'Workflows', singular: 'Workflow', dir: 'workflows', ext: '.workflow.json', format: 'json', icon: '🔀',
      help: 'End-to-end flows that chain agents, prompts, skills, knowledge and human reviews. Designed by drag and drop and executable by agents.'
    },
    agent: {
      key: 'agent', label: 'Agents', singular: 'Agent', dir: 'agents', ext: '.agent.md', format: 'md', icon: '🤖',
      help: 'Specialized roles (persona + instructions + tools + skills + knowledge). Exported as Copilot custom agents, M365 declarative agents or Claude subagents.'
    },
    prompt: {
      key: 'prompt', label: 'Prompts', singular: 'Prompt', dir: 'prompts', ext: '.prompt.md', format: 'md', icon: '💬',
      help: 'Reusable templates with {{variables}}. Exported as Copilot prompt files (/command), Claude commands or ready-to-paste text for Copilot M365.'
    },
    skill: {
      key: 'skill', label: 'Skills', singular: 'Skill', dir: 'skills', ext: '/SKILL.md', format: 'skill', icon: '🧩',
      help: 'Packaged capabilities (open Agent Skills standard, SKILL.md) that an agent loads when needed: procedures, checklists, scripts and resources.'
    },
    instruction: {
      key: 'instruction', label: 'Instructions', singular: 'Instruction', dir: 'instructions', ext: '.instructions.md', format: 'md', icon: '📏',
      help: 'Rules the AI must always follow (global) or for certain files (applyTo). Exported to copilot-instructions.md, *.instructions.md, CLAUDE.md or Cursor rules.'
    },
    knowledge: {
      key: 'knowledge', label: 'Knowledge', singular: 'Document', dir: 'knowledge', ext: '.md', format: 'md', icon: '📚',
      help: 'Business and technical context: glossary, architecture, Definition of Done, processes… Injected into agents and workflow steps.'
    },
    mcp: {
      key: 'mcp', label: 'MCP Tools', singular: 'MCP server', dir: 'mcp', ext: '.mcp.json', format: 'json', icon: '🔌',
      help: 'Model Context Protocol servers that give agents tools (GitHub, Jira, browser, databases…). Exported to .vscode/mcp.json, .mcp.json or .cursor/mcp.json.'
    }
  };
  const TYPE_ORDER = ['workflow', 'agent', 'prompt', 'skill', 'instruction', 'knowledge', 'mcp'];

  const AUDIENCES = [
    { value: 'all', label: 'Everyone' },
    { value: 'dev', label: 'Development' },
    { value: 'po', label: 'Product (PO)' },
    { value: 'qa', label: 'QA' },
    { value: 'architecture', label: 'Architecture' },
    { value: 'ux', label: 'Design / UX' },
    { value: 'business', label: 'Business' },
    { value: 'data', label: 'Data' },
    { value: 'ops', label: 'DevOps / Platform' }
  ];
  const TARGETS = [
    { value: 'copilot', label: 'GitHub Copilot' },
    { value: 'm365', label: 'Copilot M365' },
    { value: 'claude', label: 'Claude / Claude Code' },
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'cursor', label: 'Cursor' },
    { value: 'any', label: 'Any AI' }
  ];
  const STATUS = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In review' },
    { value: 'stable', label: 'Stable' },
    { value: 'deprecated', label: 'Deprecated' }
  ];
  const PROMPT_MODES = [
    { value: '', label: '— (default)' },
    { value: 'ask', label: 'ask · ask questions' },
    { value: 'edit', label: 'edit · edit files' },
    { value: 'agent', label: 'agent · agent mode' }
  ];
  const KNOWLEDGE_KINDS = [
    { value: 'glossary', label: 'Glossary' },
    { value: 'architecture', label: 'Architecture' },
    { value: 'process', label: 'Process' },
    { value: 'guideline', label: 'Guideline / best practices' },
    { value: 'domain', label: 'Business domain' },
    { value: 'template', label: 'Template' },
    { value: 'reference', label: 'Reference' }
  ];
  const COPILOT_TOOLS = ['search', 'edit', 'runCommands', 'runTasks', 'runTests', 'fetch', 'githubRepo', 'problems', 'changes', 'usages', 'testFailure', 'todos', 'new', 'extensions', 'vscodeAPI', 'openSimpleBrowser', 'think'];
  const M365_CAPS = [
    { value: 'WebSearch', label: 'Web search' },
    { value: 'OneDriveAndSharePoint', label: 'OneDrive and SharePoint' },
    { value: 'GraphConnectors', label: 'Copilot connectors' },
    { value: 'Email', label: 'Email' },
    { value: 'TeamsMessages', label: 'Teams messages' },
    { value: 'Meetings', label: 'Meetings' },
    { value: 'People', label: 'People' },
    { value: 'CodeInterpreter', label: 'Code interpreter' },
    { value: 'GraphicArt', label: 'Image generation' }
  ];
  const MCP_TRANSPORTS = [
    { value: 'stdio', label: 'stdio (local process)' },
    { value: 'http', label: 'http (remote)' },
    { value: 'sse', label: 'sse (remote, legacy)' }
  ];

  const NODE_TYPES = {
    start: { label: 'Start', icon: '▶', help: 'Entry point. Receives the workflow inputs.' },
    step: { label: 'Step', icon: '⚙', help: 'Work done by an agent/prompt with skills, knowledge and tools.' },
    human: { label: 'Human review', icon: '🧑', help: 'Approval gate. The agent stops until a person approves or requests changes.' },
    condition: { label: 'Decision', icon: '◆', help: 'Branches the flow based on a criterion. Connection labels are the options.' },
    end: { label: 'End', icon: '■', help: 'Closes the flow and produces the final deliverable.' },
    note: { label: 'Note', icon: '✎', help: 'Free annotation on the canvas. Not executed.' }
  };

  const F = (key, label, kind, extra) => Object.assign({ key, label, kind }, extra || {});
  const HEAD = [
    F('name', 'Name', 'text', { required: true }),
    F('description', 'Description', 'textarea', { required: true, help: 'What it does and when to use it. Agents and Copilot read it to decide when to apply it.' }),
    F('icon', 'Icon', 'emoji')
  ];
  const TAIL = [
    F('tags', 'Tags', 'tags'),
    F('audience', 'Audience', 'multi', { options: AUDIENCES }),
    F('targets', 'Target AIs', 'multi', { options: TARGETS }),
    F('status', 'Status', 'select', { options: STATUS }),
    F('version', 'Version', 'text', { placeholder: '1.0.0' }),
    F('author', 'Author', 'text'),
    F('updated', 'Updated', 'readonly')
  ];
  const FIELDS = {
    prompt: [...HEAD,
      F('mode', 'Copilot mode', 'select', { options: PROMPT_MODES, help: 'Chat mode used when the prompt file runs in Copilot.' }),
      F('agent', 'Linked agent', 'ref', { ref: 'agent', help: 'Optional. The prompt runs with this agent (custom agent in Copilot).' }),
      F('model', 'Preferred model', 'text', { placeholder: 'e.g. Claude Sonnet 5.5, GPT-5…' }),
      F('tools', 'Tools (Copilot)', 'tags', { suggest: COPILOT_TOOLS }),
      ...TAIL],
    agent: [...HEAD,
      F('model', 'Preferred model', 'text', { placeholder: 'e.g. Claude Opus 5.5' }),
      F('tools', 'Tools (Copilot)', 'tags', { suggest: COPILOT_TOOLS }),
      F('skills', 'Skills', 'refs', { ref: 'skill' }),
      F('knowledge', 'Knowledge', 'refs', { ref: 'knowledge' }),
      F('mcp', 'MCP servers', 'refs', { ref: 'mcp' }),
      F('handoffs', 'Handoffs to other agents', 'refs', { ref: 'agent', help: 'Handoff buttons in Copilot to pass the work to the next agent.' }),
      F('starters', 'Conversation starters', 'list', { help: 'Initial suggestions (Copilot M365). One per line.' }),
      F('capabilities', 'M365 capabilities', 'multi', { options: M365_CAPS }),
      F('sharepointUrls', 'SharePoint/OneDrive sources (M365)', 'list', { help: 'Site or folder URLs the M365 agent will use as knowledge.' }),
      ...TAIL],
    skill: [...HEAD,
      F('license', 'License', 'text'),
      F('allowedTools', 'Allowed tools', 'tags'),
      ...TAIL],
    instruction: [...HEAD,
      F('global', 'Global (whole repository)', 'bool', { help: 'Global ones go to copilot-instructions.md / CLAUDE.md / AGENTS.md.' }),
      F('applyTo', 'Applies to (glob)', 'text', { placeholder: '**/*.ts, src/api/**' }),
      ...TAIL],
    knowledge: [...HEAD,
      F('kind', 'Kind', 'select', { options: KNOWLEDGE_KINDS }),
      F('source', 'Source / URL', 'text'),
      ...TAIL],
    mcp: [...HEAD,
      F('transport', 'Transport', 'select', { options: MCP_TRANSPORTS }),
      F('command', 'Command', 'text', { placeholder: 'npx' }),
      F('args', 'Arguments', 'list'),
      F('url', 'URL', 'text', { placeholder: 'https://…' }),
      F('env', 'Environment variables', 'kv', { help: 'Use ${input:NAME} to ask the user for secrets (never store secrets in files).' }),
      F('headers', 'HTTP headers', 'kv'),
      ...TAIL],
    workflow: [...HEAD, ...TAIL]
  };
  const BODY_LABEL = {
    prompt: 'Prompt template',
    agent: 'Agent instructions (system prompt)',
    skill: 'Skill content (SKILL.md)',
    instruction: 'Instructions',
    knowledge: 'Content',
    mcp: 'Usage notes',
    workflow: 'Workflow notes / README'
  };

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */
  const slugify = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'untitled';
  const uniq = (a) => Array.from(new Set((a || []).filter((x) => x !== undefined && x !== null && x !== '')));
  const arr = (v) => Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
  const today = () => new Date().toISOString().slice(0, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const uid = (p) => (p || 'n') + Math.random().toString(36).slice(2, 8);

  function hashHex(str, len) {
    // Deterministic hash (extended FNV-1a) → hex. Used for stable IDs (M365 manifest).
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
   * YAML (subset sufficient for frontmatter) and frontmatter
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
   * Item ⇄ file
   * ------------------------------------------------------------------ */
  function pathFor(item) {
    const t = TYPES[item.type];
    if (!t) throw new Error('Unknown type: ' + item.type);
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
      try { data = JSON.parse(text); } catch (e) { data = { name: c.id, description: '⚠ Invalid JSON: ' + e.message }; }
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
   * Library (virtual file system)
   * ------------------------------------------------------------------ */
  const DEFAULT_CONFIG = { workspace: 'AI Center', description: 'The team framework for working with AI', defaultTargets: ['copilot', 'm365', 'any'] };

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
    return '/* AI Center · library.bundle.js\n * Snapshot generated automatically from the files in /library.\n' +
      ' * Lets you open index.html with a double click (file://) and browse the library without a server.\n * DO NOT edit by hand: edit the .md/.json files or use the app.\n */\n' +
      'window.AIC_BUNDLE = ' + JSON.stringify(payload, null, 1) + ';\n';
  }
  function parseBundle(text) {
    const m = String(text).match(/window\.AIC_BUNDLE\s*=\s*([\s\S]*);\s*$/);
    return JSON.parse(m ? m[1] : text);
  }
  function sortItems(items) {
    return items.slice().sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || String(a.name).localeCompare(String(b.name), 'en'));
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
        { id: 'start', type: 'start', title: 'Start', x: 60, y: 180 },
        { id: 'end', type: 'end', title: 'End', x: 640, y: 180 }
      ];
      it.inputs = [{ name: 'goal', label: 'Goal', description: 'What do you want to achieve?', required: true }];
    }
    if (type === 'mcp' && !partial?.transport) it.transport = 'stdio';
    return it;
  }
  /** Reverse references: who uses this item? */
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
   * Templates
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
  /** Converts {{var}} into each tool's syntax. */
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
   * Workflow graph
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
  /** Linear order (topological, ignoring loop-backs) for runbooks and views. */
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
  /** Automatic layered layout (left → right). */
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
  const REJECT_RE = /reject|change|rework|redo|back|retry|\bko\b|^no$|not approved|rechaz|cambio|volver|repet|rehacer|no aprob/i;
  const isReject = (label) => REJECT_RE.test(norm(label || ''));
  function nodeLabel(lib, n) {
    if (n.title) return n.title;
    const L = indexLib(lib);
    if (n.agent && L.get('agent', n.agent)) return L.get('agent', n.agent).name;
    if (n.prompt && L.get('prompt', n.prompt)) return L.get('prompt', n.prompt).name;
    return NODE_TYPES[n.type] ? NODE_TYPES[n.type].label : n.id;
  }

  /* ------------------------------------------------------------------ *
   * Output files: a step can declare files it must produce. The AI returns
   * each one as a fenced block tagged `file=<path>`; the engine extracts them.
   * ------------------------------------------------------------------ */
  /** Normalizes a relative path and rejects anything that could escape the target folder. */
  function safeRelPath(p) {
    let s = String(p || '').trim().replace(/\\/g, '/').replace(/^["'`]|["'`]$/g, '');
    if (!s || /^[a-zA-Z]:/.test(s) || s.startsWith('/') || s.startsWith('~')) return null;
    const parts = [];
    for (const seg of s.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..' || /[\u0000-\u001f<>:"|?*]/.test(seg)) return null;
      parts.push(seg);
    }
    return parts.length ? parts.join('/') : null;
  }
  /** Declared output files of a node, with {{variables}} resolved. */
  function nodeFiles(node, ctx) {
    return arr(node.files).map((p) => render(p, ctx || {}, { fallback: (n) => n })).map((p) => p.trim()).filter(Boolean);
  }
  const FILE_BLOCK_RE = /^(`{3,}|~{3,})[^\n]*?\bfile=(?:"([^"\n]+)"|'([^'\n]+)'|([^\s`]+))[^\n]*\n([\s\S]*?)\n?^\1[ \t]*$/gm;
  /** Extracts `file=<path>` fenced blocks from an AI answer. Unsafe paths are reported, never returned as files. */
  function extractFiles(text) {
    const files = []; const rejected = [];
    String(text || '').replace(/\r\n/g, '\n').replace(FILE_BLOCK_RE, (m, fence, p1, p2, p3, body) => {
      const raw = p1 || p2 || p3;
      const path = safeRelPath(raw);
      if (!path) { rejected.push(raw); return m; }
      const content = body.endsWith('\n') ? body : body + '\n';
      const i = files.findIndex((f) => f.path === path);
      if (i >= 0) files[i] = { path, content }; else files.push({ path, content });
      return m;
    });
    return { files, rejected };
  }
  function filesInstructions(paths) {
    return 'Produce these files (paths relative to the repository root):\n\n' + paths.map((p) => `- \`${p}\``).join('\n') +
      '\n\nReturn **each file complete** in its own fenced block that opens with four backticks, the language and `file=<path>`, for example:\n\n' +
      '`````text\n````markdown file=' + paths[0] + '\n…file content…\n````\n`````\n\n' +
      'If you have tools that write files, also write them at those paths. Do not omit any file and do not truncate their content.';
  }

  /* ------------------------------------------------------------------ *
   * Input files: files/folders passed to a workflow as inputs ({{name}})
   * or attached to a step as context (contextFiles: globs / folders).
   * The core only selects, limits and formats; reading is done by the host
   * (browser picker, CLI file system) through hooks.readFiles.
   * ------------------------------------------------------------------ */
  const FILE_LIMITS = { maxFiles: 60, maxFileChars: 60000, maxTotalChars: 240000 };
  const IGNORED_DIRS = ['.git', 'node_modules', 'dist', 'build', 'out', 'target', 'vendor', '.next', '.nuxt', '.venv', 'venv', '__pycache__', 'coverage', '.idea', '.vscode-test', 'runs', 'ai-runs'];
  const TEXT_FILE_RE = /(\.(md|mdx|markdown|txt|rst|adoc|json|jsonc|ya?ml|toml|ini|cfg|conf|properties|env\.example|csv|tsv|xml|html?|css|scss|less|js|jsx|mjs|cjs|ts|tsx|vue|svelte|py|ipynb|java|kt|kts|scala|groovy|gradle|cs|fs|vb|go|rb|php|rs|swift|m|mm|c|h|cc|cpp|hpp|sql|graphql|gql|proto|sh|bash|zsh|ps1|bat|cmd|tf|hcl|bicep|dockerfile|r|dart|lua|pl|ex|exs|erl|clj|elm|hs|ml|feature|http|prisma)|(^|\/)(dockerfile|makefile|readme|license|codeowners|\.gitignore|\.editorconfig))$/i;
  const isTextFile = (p) => TEXT_FILE_RE.test(String(p));
  const isIgnoredPath = (p) => String(p).split('/').some((seg) => IGNORED_DIRS.includes(seg));
  /** Glob → RegExp. Supports **, *, ?, {a,b}. */
  function globToRegex(glob) {
    let re = ''; let i = 0;
    const g = String(glob);
    while (i < g.length) {
      const c = g[i];
      if (c === '*') {
        if (g[i + 1] === '*') { i += 2; if (g[i] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; continue; }
        re += '[^/]*';
      } else if (c === '?') re += '[^/]';
      else if (c === '{') { const end = g.indexOf('}', i); if (end > i) { re += '(?:' + g.slice(i + 1, end).split(',').map((x) => x.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')).join('|') + ')'; i = end + 1; continue; } re += '\\{'; }
      else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
      i++;
    }
    return new RegExp('^' + re + '$');
  }
  /** Normalizes a context pattern (relative, no ..). Returns null when unsafe. */
  function safePattern(p) {
    const s = String(p || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
    if (!s || s === '.' || s === './') return '**';
    if (/^[a-zA-Z]:/.test(s) || s.startsWith('/') || s.startsWith('~') || s.split('/').includes('..')) return null;
    return s;
  }
  /** Which of `paths` match the patterns. A pattern without wildcards matches that file or everything under that folder. */
  function matchPaths(paths, patterns) {
    const pats = arr(patterns).map(safePattern).filter(Boolean);
    const unmatched = [];
    const set = new Set();
    pats.forEach((p) => {
      const glob = /[*?{]/.test(p);
      const dir = p.replace(/\/+$/, '');
      const re = glob ? globToRegex(p) : null;
      let hit = false;
      paths.forEach((path) => {
        if (glob ? re.test(path) : (path === dir || path.startsWith(dir + '/'))) { set.add(path); hit = true; }
      });
      if (!hit) unmatched.push(p);
    });
    return { matched: Array.from(set).filter((p) => !isIgnoredPath(p)).sort(), unmatched };
  }
  /** Applies size limits. files: [{path, content}] */
  function limitFiles(files, limits) {
    const L = Object.assign({}, FILE_LIMITS, limits || {});
    const out = []; let total = 0; let omitted = 0; let truncated = false;
    files.forEach((f) => {
      if (out.length >= L.maxFiles || total >= L.maxTotalChars) { omitted++; return; }
      let content = String(f.content || '');
      const room = Math.min(L.maxFileChars, L.maxTotalChars - total);
      if (content.length > room) { content = content.slice(0, room) + '\n… [truncated]'; truncated = true; }
      total += content.length;
      out.push({ path: f.path, content });
    });
    return { files: out, omitted, truncated: truncated || omitted > 0, chars: total };
  }
  const EXT_LANG = { md: 'markdown', mdx: 'markdown', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx', py: 'python', rb: 'ruby', cs: 'csharp', yml: 'yaml', sh: 'bash', ps1: 'powershell', kt: 'kotlin', rs: 'rust' };
  function langOf(p) { const e = (String(p).split('.').pop() || '').toLowerCase(); return EXT_LANG[e] || (e.length <= 10 ? e : ''); }
  /** Formats files as Markdown: a heading per file and its content in a 4-backtick block. */
  function formatFiles(files, info) {
    const body = files.map((f) => `### \`${f.path}\`\n\n\`\`\`\`${langOf(f.path)}\n${String(f.content).replace(/\n$/, '')}\n\`\`\`\``).join('\n\n');
    const note = info && (info.omitted || info.truncated) ? `\n\n_⚠ Limited to ${files.length} file(s)${info.omitted ? `, ${info.omitted} omitted` : ''}; some content may be truncated._` : '';
    return body + note;
  }
  /** Value of a file/folder input: renders as the files' content; {{name.paths}} gives the list. */
  function fileValue(files, info) {
    const lim = info && info.files ? info : limitFiles(files);
    return { kind: 'files', output: formatFiles(lim.files, lim), paths: lim.files.map((f) => f.path).join(', '), count: lim.files.length, omitted: lim.omitted || 0 };
  }
  const isFileValue = (v) => !!(v && typeof v === 'object' && v.kind === 'files');
  /** Short text for an input value (file inputs show their paths). */
  function inputText(v) {
    if (isFileValue(v)) return `${v.count} file(s): ${String(v.paths).split(', ').slice(0, 12).join(', ')}${v.count > 12 ? ', …' : ''}`;
    return v === undefined || v === null || v === '' ? '—' : String(v);
  }
  /** Context patterns of a node with {{variables}} resolved; a variable may hold several comma/line-separated paths. */
  function contextPatterns(node, ctx) {
    return arr(node.contextFiles).flatMap((p) => render(p, ctx || {}, { fallback: '' }).split(/[,\n]+/)).map((p) => p.trim()).filter(Boolean);
  }
  /** Names of inputs referenced as {{name}} somewhere in the workflow (instructions, vars, deliverables, prompts). */
  function referencedNames(lib, wf) {
    const L = indexLib(lib); const names = new Set();
    const scan = (t) => extractVars(t).forEach((v) => names.add(v.name.split('.')[0]));
    (wf.nodes || []).forEach((n) => {
      scan(n.instructions); scan(n.deliverable); scan(n.question);
      Object.values(n.vars || {}).forEach(scan);
      const p = n.prompt && L.get('prompt', n.prompt);
      if (p) extractVars(p.body).forEach((v) => { if (!(n.vars && n.vars[v.name])) names.add(v.name); });
    });
    return names;
  }

  /* ------------------------------------------------------------------ *
   * Prompt composition for running a step
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
    if (r.agent) sys.push(`# Role: ${r.agent.name}\n\n${r.agent.description ? '_' + r.agent.description + '_\n\n' : ''}${render(r.agent.body, ctx)}`.trim());
    else sys.push('# Role\n\nYou are an expert assistant who rigorously executes one step of an AI workflow. You produce complete, concrete, ready-to-use deliverables.');
    if (globals.length) sys.push('# Team rules\n\n' + globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n'));
    if (r.skills.length) sys.push('# Skills\n\nApply these skills when relevant:\n\n' + r.skills.map((s) => `## Skill: ${s.name}\n\n_${s.description}_\n\n${s.body.trim()}`).join('\n\n'));
    if (r.knowledge.length) sys.push('# Reference knowledge\n\n' + r.knowledge.map((k) => `## ${k.name}\n\n${k.body.trim()}`).join('\n\n'));
    if (r.mcp.length) sys.push('# Available tools\n\n' + r.mcp.map((m) => `- **${m.name}** (MCP \`${m.id}\`): ${m.description}`).join('\n'));

    const usr = [];
    usr.push(`# ${wf.name} · ${title}`);
    if (wf.description) usr.push(section('Workflow goal', wf.description));
    const inputs = state.inputs || {};
    const inLines = (wf.inputs || []).map((i) => inputs[i.name] ? `- **${i.label || i.name}**: ${inputText(inputs[i.name])}` : '').filter(Boolean);
    if (inLines.length) usr.push(section('Inputs', inLines.join('\n')));
    const refs = referencedNames(lib, wf);
    (wf.inputs || []).forEach((i) => {
      const v = inputs[i.name];
      if (isFileValue(v) && !refs.has(i.name)) usr.push(section(`Input files: ${i.label || i.name}`, v.output));
    });
    const cf = contextPatterns(node, ctx);
    if (extra.contextFiles && extra.contextFiles.files.length) {
      usr.push(section('Context files', formatFiles(extra.contextFiles.files, extra.contextFiles) +
        (extra.contextFiles.unmatched && extra.contextFiles.unmatched.length ? `\n\n_No files matched: ${extra.contextFiles.unmatched.map((p) => '`' + p + '`').join(', ')}_` : '')));
    } else if (cf.length) {
      usr.push(section('Read these files first', 'Before starting, read these files/folders from the repository (globs allowed) and use them as context:\n\n' + cf.map((p) => '- `' + p + '`').join('\n')));
    }
    const mode = node.context || 'prev';
    if (mode !== 'none') {
      const list = mode === 'all'
        ? (wf.nodes || []).filter((n) => state.results && state.results[n.id] && n.id !== node.id && n.type !== 'start')
        : ctx._prevNodes.filter((n) => n.type !== 'start');
      const txt = list.map((n) => `### ${n.title || nodeLabel(lib, n)}\n\n${String(state.results[n.id].output || '').trim()}`).filter((x) => x.trim()).join('\n\n');
      if (txt) usr.push(section(mode === 'all' ? 'Results of previous steps' : 'Result of the previous step', txt));
    }
    if (state.feedback && state.feedback[node.id]) usr.push(section('⚠ Review feedback (incorporate it)', state.feedback[node.id]));
    if (node.instructions) usr.push(section('Your task', render(node.instructions, ctx, { fallback: (n) => `«${n}»` })));
    if (r.prompt) {
      const vars = {};
      extractVars(r.prompt.body).forEach((v) => {
        const mapped = node.vars && node.vars[v.name];
        if (mapped) vars[v.name] = render(mapped, ctx, { fallback: '' });
      });
      const body = render(r.prompt.body, Object.assign({}, ctx, vars), { fallback: (n, ph) => `«${ph || n} (take it from the inputs or the previous context)»` });
      usr.push(section(node.instructions ? 'Prompt to apply' : 'Your task', body));
    }
    if (!node.instructions && !r.prompt && node.type === 'step') usr.push(section('Your task', `Perform the workflow step «${title}» using your role and the available context.`));
    if (node.deliverable) usr.push(section('Expected deliverable', render(node.deliverable, ctx)));
    const outFiles = nodeFiles(node, ctx);
    if (outFiles.length && (node.type === 'step' || node.type === 'end')) usr.push(section('Output files', filesInstructions(outFiles)));
    if (extra.options) {
      usr.push(section('Decision', `${node.instructions ? '' : (node.question || 'Evaluate the context and decide how to continue.') + '\n\n'}Answer on the **first line** with only one of these options: ${extra.options.map((o) => `\`${o}\``).join(', ')}. Then briefly justify it.`));
    }
    if (node.type === 'end') usr.push(section('Wrap-up', 'Consolidate a final summary of the workflow: deliverables, decisions made, risks and next steps.'));

    const system = sys.filter(Boolean).join('\n\n');
    const user = usr.filter(Boolean).join('\n\n');
    return {
      title, system, user,
      full: `${system}\n\n---\n\n${user}`,
      agent: r.agent ? r.agent.id : null,
      prompt: r.prompt ? r.prompt.id : null,
      skills: r.skills.map((s) => s.id), knowledge: r.knowledge.map((k) => k.id), mcp: r.mcp.map((m) => m.id),
      model: (r.agent && r.agent.model) || (r.prompt && r.prompt.model) || '',
      files: outFiles
    };
  }
  /** Composed prompt for using an agent on its own (outside workflows). */
  function composeAgent(lib, agent) {
    const fake = { id: 'agent', name: agent.name, nodes: [{ id: 'x', type: 'step', agent: agent.id }], edges: [] };
    return composeStep(lib, fake, fake.nodes[0], {}).system;
  }

  /* ------------------------------------------------------------------ *
   * E2E execution engine (shared by the browser and the CLI)
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
    /** Reads the step's context files through the host (hooks.readFiles). Without a reader, agents are told to read them. */
    const loadContext = async (node, step) => {
      const pats = contextPatterns(node, buildContext(wf, node, run));
      if (!pats.length || !hooks.readFiles) return null;
      const res = await hooks.readFiles(pats, { node, run });
      if (!res) return null;
      step.contextFiles = res.files.map((f) => f.path);
      if (res.unmatched && res.unmatched.length) emit('warn', { message: `«${step.title}»: no files matched ${res.unmatched.join(', ')}` });
      return res;
    };
    const maxVisits = hooks.maxVisits || 5;
    let guard = 0;
    emit('run:start', run);
    while (queue.length) {
      if (hooks.signal && hooks.signal.aborted) { run.status = 'cancelled'; break; }
      if (++guard > 400) { run.status = 'error'; run.error = 'Too many iterations (infinite loop?)'; break; }
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
      if (visits[id] > maxVisits) { emit('warn', { message: `«${node.title || id}» exceeded ${maxVisits} iterations; skipped.` }); continue; }
      const step = { nodeId: id, type: node.type, title: node.title || nodeLabel(lib, node), attempt: visits[id], status: 'running', startedAt: new Date().toISOString() };
      run.steps.push(step);
      emit('step:start', step);
      let next = out[id];
      try {
        if (node.type === 'start') {
          step.output = (wf.inputs || []).map((i) => `- **${i.label || i.name}**: ${inputText(run.inputs[i.name])}`).join('\n') || 'Workflow start.';
        } else if (node.type === 'human') {
          const ctx = buildContext(wf, node, run);
          const context = ctx._prevNodes.map((n) => `### ${n.title || nodeLabel(lib, n)}\n\n${run.results[n.id].output || ''}`).join('\n\n');
          step.context = context;
          const res = hooks.human ? await hooks.human({ node, run, step, context, edges: out[id] }) : { approved: true, notes: 'Approved automatically' };
          step.decision = res.approved ? 'approved' : 'changes requested';
          step.notes = res.notes || '';
          step.output = res.output || (res.approved ? `✅ Approved. ${res.notes || ''}`.trim() : `🔁 Changes requested: ${res.notes || ''}`);
          const rejects = out[id].filter((e) => isReject(e.label));
          if (res.approved) next = out[id].filter((e) => !isReject(e.label));
          else {
            next = rejects.length ? rejects : (inc[id] || []).map((e) => ({ id: 'retry-' + e.from, from: id, to: e.from }));
            next.forEach((e) => { run.feedback[e.to] = res.notes || 'Review and improve the result.'; done.delete(e.to); });
          }
        } else if (node.type === 'condition') {
          const options = out[id].map((e) => e.label || (nodes[e.to] && nodes[e.to].title) || e.to);
          const composed = composeStep(lib, wf, node, run, { options, contextFiles: await loadContext(node, step) });
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
            const composed = composeStep(lib, wf, Object.assign({}, node, { context: 'all' }), run, { contextFiles: await loadContext(node, step) });
            step.prompt = composed;
            step.output = await hooks.llm(composed, { node, step, run, kind: 'end' });
          } else {
            step.output = run.steps.filter((s) => s.type === 'step' && s.output).map((s) => `## ${s.title}\n\n${s.output}`).join('\n\n');
          }
          run.final = step.output;
        } else {
          const composed = composeStep(lib, wf, node, run, { contextFiles: await loadContext(node, step) });
          step.prompt = composed;
          if (!hooks.llm) throw new Error('No execution engine configured');
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
      if ((node.type === 'step' || (node.type === 'end' && step.prompt)) && step.output) {
        const ex = extractFiles(step.output);
        const expected = step.prompt && step.prompt.files ? step.prompt.files.map(safeRelPath).filter(Boolean) : [];
        if (ex.files.length) step.files = ex.files;
        if (ex.rejected.length) { step.rejectedFiles = ex.rejected; emit('warn', { message: `«${step.title}»: ignored unsafe file paths: ${ex.rejected.join(', ')}` }); }
        const missing = expected.filter((p) => !ex.files.some((f) => f.path === p));
        if (missing.length) step.missingFiles = missing;
        if (step.files) emit('step:files', step);
      }
      run.results[id] = { output: step.output, title: step.title, key: node.outputKey || '', files: (step.files || []).map((f) => f.path) };
      done.add(id);
      emit('step:done', step);
      next.forEach((e) => { if (!queue.includes(e.to)) queue.push(e.to); });
    }
    if (run.status === 'running') run.status = 'completed';
    run.finishedAt = new Date().toISOString();
    emit('run:done', run);
    return run;
  }
  /** Latest version of every file produced during a run (later steps/attempts win). */
  function runFiles(run) {
    const map = new Map();
    (run.steps || []).forEach((s) => (s.files || []).forEach((f) => map.set(f.path, { path: f.path, content: f.content, step: s.title, attempt: s.attempt || 1 })));
    return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
  }
  function runReport(run, wf) {
    const lines = [`# Run report · ${run.workflowName}`, '',
      `- **Status**: ${run.status}`, `- **Started**: ${run.startedAt}`, `- **Finished**: ${run.finishedAt || '—'}`, ''];
    const ins = Object.keys(run.inputs || {});
    if (ins.length) { lines.push('## Inputs', ''); ins.forEach((k) => lines.push(`- **${k}**: ${inputText(run.inputs[k])}`)); lines.push(''); }
    lines.push('## Steps', '');
    run.steps.forEach((s, i) => {
      lines.push(`### ${i + 1}. ${s.title}${s.attempt > 1 ? ` (attempt ${s.attempt})` : ''}`, '');
      lines.push(`_${(NODE_TYPES[s.type] || {}).label || s.type} · ${s.status}${s.decision ? ' · decision: ' + s.decision : ''}_`, '');
      if (s.notes) lines.push(`> ${s.notes}`, '');
      if (s.output && s.type !== 'start') lines.push(String(s.output).trim(), '');
      if (s.error) lines.push(`**Error:** ${s.error}`, '');
    });
    const all = runFiles(run);
    if (all.length) {
      lines.push('## Generated files', '');
      all.forEach((f) => lines.push(`- \`${f.path}\` — ${f.step}${f.attempt > 1 ? ` (attempt ${f.attempt})` : ''}`));
      lines.push('');
    }
    const missing = run.steps.filter((s) => s.missingFiles && s.missingFiles.length);
    if (missing.length) {
      lines.push('## Missing files', '', '_Declared by the step but not returned by the AI:_', '');
      missing.forEach((s) => s.missingFiles.forEach((p) => lines.push(`- \`${p}\` — ${s.title}`)));
      lines.push('');
    }
    if (run.final) lines.push('## Final result', '', run.final, '');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Validation (library health)
   * ------------------------------------------------------------------ */
  function validateWorkflow(lib, wf) {
    const issues = [];
    const L = indexLib(lib);
    const add = (level, msg, node) => issues.push({ level, type: 'workflow', id: wf.id, name: wf.name, msg, node: node ? node.id : undefined });
    const ex = execNodes(wf);
    if (!ex.length) { add('warn', 'The workflow is empty.'); return issues; }
    if (!ex.some((n) => n.type === 'start')) add('warn', 'It has no Start node.');
    if (!ex.some((n) => n.type === 'end')) add('info', 'It has no End node (recommended to consolidate the deliverable).');
    const { out, inc } = wfMaps(wf);
    const reach = reachable(wf, startNodes(wf).map((n) => n.id));
    ex.forEach((n) => {
      const label = `«${n.title || nodeLabel(lib, n)}»`;
      if (!reach.has(n.id)) add('warn', `${label} is not reachable from the start.`, n);
      if (n.type !== 'end' && !out[n.id].length) add('warn', `${label} has no outgoing connection.`, n);
      if (n.type !== 'start' && !inc[n.id].length) add('warn', `${label} has no incoming connection.`, n);
      if (n.agent && !L.get('agent', n.agent)) add('error', `${label} uses a missing agent: ${n.agent}`, n);
      if (n.prompt && !L.get('prompt', n.prompt)) add('error', `${label} uses a missing prompt: ${n.prompt}`, n);
      arr(n.skills).forEach((s) => { if (!L.get('skill', s)) add('error', `${label} uses a missing skill: ${s}`, n); });
      arr(n.knowledge).forEach((s) => { if (!L.get('knowledge', s)) add('error', `${label} uses missing knowledge: ${s}`, n); });
      arr(n.mcp).forEach((s) => { if (!L.get('mcp', s)) add('error', `${label} uses a missing MCP server: ${s}`, n); });
      if (n.type === 'step' && !n.agent && !n.prompt && !n.instructions) add('warn', `${label} has no agent, prompt or instructions.`, n);
      if (n.type === 'condition' && out[n.id].length < 2) add('warn', `${label} is a decision with fewer than 2 outputs.`, n);
      if (n.type === 'condition' && out[n.id].some((e) => !e.label)) add('info', `${label}: label the decision outputs (e.g. «yes» / «no»).`, n);
      arr(n.files).forEach((p) => { if (!safeRelPath(render(p, {}, { fallback: 'x' }))) add('error', `${label}: invalid output file path «${p}» (use a relative path without ..).`, n); });
      arr(n.contextFiles).forEach((p) => { if (!safePattern(render(p, {}, { fallback: 'x' }))) add('error', `${label}: invalid context path «${p}» (use a relative path or glob without ..).`, n); });
      if (arr(n.files).length && !['step', 'end'].includes(n.type)) add('warn', `${label}: only steps and the end node can produce output files.`, n);
    });
    const back = backEdges(wf);
    (wf.edges || []).forEach((e) => {
      if (!back.has(e.id)) return;
      const src = wf.nodes.find((n) => n.id === e.from);
      if (src && !['human', 'condition'].includes(src.type)) add('warn', `There is a loop back from «${src.title || src.id}» without a decision or human review: it might never end.`, src);
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
      if (seen[key]) add('error', 'Duplicate ID.');
      seen[key] = true;
      if (!it.description || it.description.length < 15) add('warn', 'Add a clear description (when to use it): it helps people and agents pick it.');
      if (it.type !== 'workflow' && !String(it.body || '').trim() && it.type !== 'mcp') add('warn', 'The content is empty.');
      if (it.status === 'deprecated') add('info', 'Marked as deprecated.');
      if (it.type === 'agent') {
        it.skills.forEach((s) => { if (!L.get('skill', s)) add('error', `Missing skill: ${s}`); });
        it.knowledge.forEach((s) => { if (!L.get('knowledge', s)) add('error', `Missing knowledge: ${s}`); });
        it.mcp.forEach((s) => { if (!L.get('mcp', s)) add('error', `Missing MCP server: ${s}`); });
        it.handoffs.forEach((s) => { if (!L.get('agent', s)) add('error', `Handoff to a missing agent: ${s}`); });
        if (it.targets.includes('m365')) {
          const len = m365Instructions(lib, it).length;
          if (len > 8000) add('warn', `The Copilot M365 instructions are ${len} characters long (max 8000). They will be trimmed on export.`);
          if (!it.starters.length) add('info', 'Add conversation starters for Copilot M365.');
        }
      }
      if (it.type === 'prompt' && it.agent && !L.get('agent', it.agent)) add('error', `Missing agent: ${it.agent}`);
      if (it.type === 'skill') {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id) || it.id.length > 64) add('error', 'A skill id must be lowercase with hyphens (max 64) per the Agent Skills standard.');
        if (it.description.length > 1024) add('warn', 'A skill description must not exceed 1024 characters.');
      }
      if (it.type === 'instruction' && !it.global && !it.applyTo) add('info', 'No applyTo: it will apply to all files (**).');
      if (it.type === 'mcp') {
        if (it.transport === 'stdio' && !it.command) add('error', 'stdio server without a command.');
        if (it.transport !== 'stdio' && !it.url) add('error', 'Remote server without a URL.');
        Object.entries(Object.assign({}, it.env, it.headers)).forEach(([k, v]) => {
          if (/(token|key|secret|password|pwd)/i.test(k) && v && !/\$\{/.test(String(v))) add('error', `«${k}» looks like a plain-text secret. Use \${input:${k}} or an environment variable.`);
        });
      }
      if (it.type === 'workflow') issues.push(...validateWorkflow(lib, it));
    });
    return issues;
  }

  /* ------------------------------------------------------------------ *
   * Exporters
   * ------------------------------------------------------------------ */
  const fmFile = (data, body) => {
    const clean = {};
    Object.keys(data).forEach((k) => { if (!isEmpty(data[k])) clean[k] = data[k]; });
    return stringifyFrontmatter(clean, body);
  };
  const header = (what) => `<!-- Generated by AI Center ${VERSION} · ${what}. Edit the source in /library and export again. -->\n\n`;
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
    if (skills.length) body += '\n\n## Skills\n\nLoad and apply these skills when relevant:\n\n' + skills.map((s) => `- [${s.name}](${rel(selfPath, P.skill(s.id))}) — ${s.description}`).join('\n');
    if (know.length) body += '\n\n## Reference knowledge\n\nRead these documents before answering:\n\n' + know.map((k) => `- [${k.name}](${rel(selfPath, P.knowledge(k.id))}) — ${k.description}`).join('\n');
    if (mcp.length) body += '\n\n## MCP tools\n\n' + mcp.map((m) => `- **${m.name}** (\`${m.id}\`): ${m.description}`).join('\n');
    if (a.handoffs.length) body += '\n\n## Handoffs\n\nWhen you finish your part, suggest continuing with:\n\n' + a.handoffs.map((h) => L.get('agent', h)).filter(Boolean).map((h) => `- **${h.name}** — ${h.description}`).join('\n');
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
  /** Runbook: the workflow as instructions an agent can execute (E2E). */
  function workflowRunbook(lib, wf, flavor) {
    flavor = flavor || 'generic';
    const P = paths(flavor);
    const selfPath = P.workflow(wf.id);
    const link = (path, label) => flavor === 'm365' ? `**${label}**` : `[${label}](${rel(selfPath, path)})`;
    const order = linearize(wf);
    const num = {}; order.forEach((n, i) => { num[n.id] = i + 1; });
    const { out } = wfMaps(wf);
    const nodesById = Object.fromEntries(order.map((n) => [n.id, n]));
    const runDir = `ai-runs/${wf.id}`;
    const L2 = [];
    L2.push(`# 🔀 Workflow: ${wf.name}`, '');
    if (wf.description) L2.push(`> ${wf.description.replace(/\n/g, '\n> ')}`, '');
    if (flavor === 'm365') {
      L2.push('## How to run it in Copilot M365', '',
        'Copilot M365 does not chain agents automatically: copy the prompt of each step in order (or use the AI Center **Runner**, which does it for you and saves the result). Paste the output of the previous step where indicated.', '');
    } else {
      L2.push('## Instructions for the orchestrator agent', '',
        'You are going to run this workflow **end to end (E2E)**. Rules:', '',
        '1. Create a task list (todo list) with all the steps and tick them off as you go.',
        '2. Run the steps **in order**, following the transitions given in «Next».',
        '3. In each step **adopt the role of the indicated agent**: read its definition and apply its instructions, skills and reference knowledge.',
        `4. Save each step's deliverable in \`${runDir}/NN-<step>.md\` and use it as context for the next ones.`,
        '5. At **🧑 Human review** steps, STOP: show a summary and wait for explicit approval. If changes are requested, go back to the indicated step incorporating the feedback.',
        '6. At **◆ Decisions**, evaluate the criterion, choose a branch and explain why.',
        `7. When finished, create \`${runDir}/SUMMARY.md\` with deliverables, decisions, risks and next steps.`,
        '8. Do not make up data: if essential information is missing, ask for it.', '');
    }
    if ((wf.inputs || []).length) {
      L2.push('## Inputs', '');
      wf.inputs.forEach((i) => {
        const v = flavor === 'copilot' ? '${input:' + i.name + ':' + (i.description || i.label || i.name).replace(/[{}:]/g, ' ') + '}'
          : flavor === 'claude' ? (wf.inputs.length === 1 ? '$ARGUMENTS' : '(ask the user if it is not in $ARGUMENTS)')
            : `[${(i.label || i.name).toUpperCase()}]`;
        const kind = i.type === 'file' ? ' (file path — read its content)' : i.type === 'folder' ? ` (folder path — read the files${i.pattern ? ' matching `' + i.pattern + '`' : ''} inside it)` : '';
        L2.push(`- **${i.label || i.name}**${i.required ? ' (required)' : ''}${kind}: ${v}${i.description && flavor !== 'copilot' ? ` — ${i.description}` : ''}`);
      });
      L2.push('');
    }
    if (flavor !== 'm365') L2.push('## Flow map', '', '```mermaid', mermaid(lib, wf), '```', '');
    L2.push('## Steps', '');
    order.forEach((n) => {
      const r = resolveNode(lib, n);
      const t = n.title || nodeLabel(lib, n);
      const icon = (NODE_TYPES[n.type] || {}).icon || '';
      L2.push(`### Step ${num[n.id]} · ${icon} ${t}`, '');
      const meta = [`- **Type**: ${(NODE_TYPES[n.type] || {}).label || n.type}`];
      if (r.agent) meta.push(`- **Agent**: ${link(P.agent(r.agent.id), r.agent.name)}`);
      if (r.skills.length) meta.push(`- **Skills**: ${r.skills.map((s) => link(P.skill(s.id), s.name)).join(', ')}`);
      if (r.knowledge.length) meta.push(`- **Knowledge**: ${r.knowledge.map((k) => link(P.knowledge(k.id), k.name)).join(', ')}`);
      if (r.mcp.length) meta.push(`- **Tools**: ${r.mcp.map((m) => '`' + m.id + '`').join(', ')}`);
      if (arr(n.contextFiles).length) meta.push(`- **Read first**: ${arr(n.contextFiles).map((p) => '`' + p + '`').join(', ')}${arr(n.contextFiles).some((p) => p.includes('{{')) ? ' (`{{name}}` = paths given in that input, if any)' : ''}${flavor === 'm365' ? ' (attach or paste these files)' : ''}`);
      if (n.type !== 'start' && n.type !== 'end' && n.type !== 'human' && flavor !== 'm365') meta.push(`- **Save to**: \`${runDir}/${String(num[n.id]).padStart(2, '0')}-${slugify(t)}.md\``);
      L2.push(meta.join('\n'), '');
      if (n.type === 'start') L2.push('Collect and confirm the inputs. If a required one is missing, ask for it before continuing.', '');
      if (n.instructions) L2.push('**Instructions**', '', String(n.instructions).trim(), '');
      if (n.type === 'condition' && n.question) L2.push(`**Criterion**: ${n.question}`, '');
      if (n.type === 'human') L2.push(`**🧑 Checkpoint**: ${n.instructions ? '' : 'Present the previous results and '}STOP until you receive explicit approval.`, '');
      if (r.prompt) {
        const body = convertVars(r.prompt.body, 'plain');
        L2.push(`**Prompt** (${flavor === 'm365' ? r.prompt.name : link(P.prompt(r.prompt.id), r.prompt.name)})`, '', '````markdown', body.trim(), '````', '');
      }
      if (flavor === 'm365' && n.type === 'step') {
        const c = composeStep(lib, wf, n, { inputs: {}, results: {} });
        L2.push('<details><summary>Full prompt to paste into Copilot</summary>', '', '````markdown', convertVars(c.full, 'm365').replace(/«([^»]+)»/g, '[$1]'), '````', '', '</details>', '');
      }
      if (n.deliverable) L2.push(`**Deliverable**: ${n.deliverable}`, '');
      const rf = arr(n.files);
      if (rf.length && (n.type === 'step' || n.type === 'end')) {
        L2.push(flavor === 'm365'
          ? `**Output files**: ask Copilot to return each file in its own block and save them as ${rf.map((p) => '`' + p + '`').join(', ')}.`
          : `**Output files** — create or update these files (paths relative to the repository root; \`{{name}}\` = value of that input or step output):\n\n${rf.map((p) => '- `' + p + '`').join('\n')}`, '');
      }
      const outs = (out[n.id] || []);
      if (outs.length) {
        const txt = outs.map((e) => {
          const tgt = nodesById[e.to];
          const dest = tgt ? `Step ${num[e.to]} (${tgt.title || nodeLabel(lib, tgt)})` : e.to;
          return e.label ? `if «${e.label}» → ${dest}` : `→ ${dest}`;
        });
        L2.push(`**Next**: ${txt.join(' · ')}`, '');
      } else if (n.type === 'end') L2.push('**End of the workflow.** Produce the final summary.', '');
    });
    return L2.join('\n');
  }
  function agentsMd(lib, flavor, opts) {
    const { by } = pick(lib, opts);
    const P = paths(flavor);
    const g = by('instruction').filter((i) => i.global);
    const cfg = lib.config || DEFAULT_CONFIG;
    const L = [`# AGENTS.md · ${cfg.workspace}`, '',
      '> Guide for AI agents (GitHub Copilot coding agent, Copilot CLI, Claude Code, Codex, Cursor…). Generated by AI Center: edit the source in `/library`.', ''];
    if (g.length) { L.push('## Team rules', ''); g.forEach((i) => L.push(`### ${i.name}`, '', i.body.trim(), '')); }
    const agents = by('agent');
    if (agents.length) {
      L.push('## Specialized agents', '', 'Adopt the right role for the task:', '', '| Agent | When to use it | Definition |', '|---|---|---|');
      agents.forEach((a) => L.push(`| ${a.icon || '🤖'} ${a.name} | ${a.description.replace(/\|/g, '/').replace(/\n/g, ' ')} | [\`${P.agent(a.id)}\`](${P.agent(a.id)}) |`));
      L.push('');
    }
    const wfs = by('workflow');
    if (wfs.length) {
      L.push('## E2E executable workflows', '', 'When asked to run a workflow, open its runbook and follow it step by step (including the human review stops):', '');
      wfs.forEach((w) => L.push(`- **${w.name}** — ${w.description.replace(/\n/g, ' ')} → [\`${P.workflow(w.id)}\`](${P.workflow(w.id)})`));
      L.push('');
    }
    const sk = by('skill');
    if (sk.length) { L.push('## Skills', ''); sk.forEach((s) => L.push(`- **${s.name}** — ${s.description} → [\`${P.skill(s.id)}\`](${P.skill(s.id)})`)); L.push(''); }
    const kn = by('knowledge');
    if (kn.length) { L.push('## Reference knowledge', ''); kn.forEach((k) => L.push(`- [${k.name}](${P.knowledge(k.id)}) — ${k.description}`)); L.push(''); }
    const pr = by('prompt');
    if (pr.length) { L.push('## Reusable prompts', ''); pr.forEach((p) => L.push(`- **${p.name}** — ${p.description} → \`${P.prompt(p.id)}\``)); L.push(''); }
    const sc = by('instruction').filter((i) => !i.global);
    if (sc.length) { L.push('## Instructions per file type', ''); sc.forEach((i) => L.push(`- \`${i.applyTo || '**'}\` → **${i.name}**: ${i.description}`)); L.push(''); }
    return L.join('\n');
  }
  function m365Instructions(lib, a) {
    const L = indexLib(lib);
    const txt = a.body.trim();
    const skills = a.skills.map((id) => L.get('skill', id)).filter(Boolean);
    const know = a.knowledge.map((id) => L.get('knowledge', id)).filter(Boolean);
    const globals = (lib.items || []).filter((i) => i.type === 'instruction' && i.global && (!i.targets.length || i.targets.includes('m365') || i.targets.includes('any')));
    let extra = '';
    if (skills.length) extra += '\n\n# Procedures\n\n' + skills.map((s) => `## ${s.name}\n${s.body.trim()}`).join('\n\n');
    if (know.length) extra += '\n\n# Context\n\n' + know.map((k) => `## ${k.name}\n${k.body.trim()}`).join('\n\n');
    if (globals.length) extra += '\n\n# Rules\n\n' + globals.map((g) => g.body.trim()).join('\n\n');
    return (txt + extra).replace(/\n{3,}/g, '\n\n');
  }
  function m365Fit(lib, a) {
    const full = m365Instructions(lib, a);
    if (full.length <= 8000) return full;
    const L = indexLib(lib);
    let short = a.body.trim();
    const skills = a.skills.map((id) => L.get('skill', id)).filter(Boolean);
    if (skills.length) short += '\n\n# Available procedures\n' + skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    return short.length > 8000 ? short.slice(0, 7950) + '\n…' : short;
  }
  function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function exportCopilot(lib, opts) {
    const { by, L } = pick(lib, opts);
    const P = paths('copilot');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    const globals = by('instruction').filter((i) => i.global);
    let ci = header('GitHub Copilot · repository instructions') + `# Team instructions for GitHub Copilot\n\n`;
    ci += globals.length ? globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n') : '_No global instructions._';
    const ag = by('agent'); const wf = by('workflow');
    if (ag.length || wf.length) {
      ci += '\n\n## Available AI resources\n\n';
      if (ag.length) ci += '**Custom agents** (chat agent picker):\n' + ag.map((a) => `- \`${a.id}\` — ${a.name}: ${a.description}`).join('\n') + '\n\n';
      if (wf.length) ci += '**E2E workflows** (type `/wf-<id>` in the chat):\n' + wf.map((w) => `- \`/wf-${w.id}\` — ${w.name}`).join('\n') + '\n';
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
      const handoffs = a.handoffs.map((h) => L.get('agent', h)).filter(Boolean).map((h) => ({ label: `Continue with ${h.name}`, agent: h.id, prompt: `Continue from the previous work in your role as ${h.name}.`, send: false }));
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
      add(P.workflow(w.id), fmFile({ description: `E2E workflow: ${w.name}`, agent: 'agent' }, workflowRunbook(lib, w, 'copilot')));
      add(`docs/ai/workflows/${w.id}.workflow.json`, itemToFile(w).content);
    });
    add('AGENTS.md', agentsMd(lib, 'copilot', opts));
    return files;
  }
  function exportClaude(lib, opts) {
    const { by } = pick(lib, opts);
    const P = paths('claude');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    const globals = by('instruction').filter((i) => i.global);
    add('CLAUDE.md', `# Project instructions\n\n${globals.map((g) => `## ${g.name}\n\n${g.body.trim()}`).join('\n\n')}\n\n## Agents, skills and workflows\n\n@AGENTS.md\n`);
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
    by('workflow').forEach((w) => add(P.workflow(w.id), fmFile({ description: `E2E workflow: ${w.name}`, 'argument-hint': (w.inputs || []).map((i) => `[${i.name}]`).join(' ') || undefined }, workflowRunbook(lib, w, 'claude'))));
    add('AGENTS.md', agentsMd(lib, 'claude', opts));
    return files;
  }
  function exportCursor(lib, opts) {
    const { by } = pick(lib, opts);
    const P = paths('cursor');
    const files = [];
    const add = (path, content) => files.push({ path, content });
    by('instruction').forEach((i) => add(`.cursor/rules/${i.id}.mdc`, fmFile({ description: i.description, globs: i.global ? undefined : (i.applyTo || '**'), alwaysApply: i.global ? true : false }, i.body)));
    by('agent').forEach((a) => { const path = P.agent(a.id); add(path, fmFile({ description: `${a.name} role: ${a.description}`, alwaysApply: false }, `# ${a.name}\n\n${agentBodyFor(lib, a, 'cursor', path)}`)); });
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
      '## Option A · No code (Agent Builder in Microsoft 365 Copilot)', '',
      '1. Open **Microsoft 365 Copilot** → **Agents** → **Create agent** → **Configure** tab.',
      '2. Copy each field below into its place.',
      '3. Under **Knowledge** add the SharePoint/OneDrive sites listed and enable the capabilities.',
      '4. Test it in the right-hand panel and click **Create**. Share it with your team.', '',
      '### Name', '', '```text', a.name, '```', '',
      '### Description', '', '```text', a.description, '```', '',
      '### Instructions', '', '```text', pkg.declarativeAgent.instructions, '```', '',
      '### Conversation starters', '', ...(a.starters.length ? a.starters.map((s) => `- ${s}`) : ['_(none)_']), '',
      '### Knowledge and capabilities', '', ...(a.sharepointUrls.map((u) => `- 📁 ${u}`)), ...(a.capabilities.map((c) => `- ✅ ${c}`)), (a.sharepointUrls.length || a.capabilities.length) ? '' : '_(none)_', '',
      '## Option B · Package (Microsoft 365 Agents Toolkit / app upload)', '',
      '- The `appPackage/` folder contains `manifest.json`, `declarativeAgent.json` and the icons.',
      '- Zip it (files at the root of the zip) and upload it in Teams → **Apps** → **Manage your apps** → **Upload a custom app**, or open it with **Agents Toolkit** in VS Code to validate and provision it.',
      '- Review `developer.*Url` in the manifest before publishing to the whole organization.', ''].join('\n');
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
      const L = ['# 💬 Prompts for Copilot M365', '', '> Copy the prompt, replace the [BRACKETS] and paste it into Copilot (Chat, Word, Outlook, Teams…). Tip: save them in your Copilot prompt gallery.', ''];
      prompts.forEach((p) => L.push(`## ${p.icon || '💬'} ${p.name}`, '', `_${p.description}_`, '', '```text', convertVars(p.body, 'm365').trim(), '```', ''));
      add('m365/PROMPTS.md', L.join('\n'));
    }
    by('workflow').forEach((w) => add(`m365/workflows/${w.id}.md`, workflowRunbook(lib, w, 'm365')));
    add('m365/README.md', ['# Copilot M365 · Package generated by AI Center', '',
      '- `agents/<id>/AGENT-BUILDER.md` → create the agent without code by copy and paste.',
      '- `agents/<id>/appPackage/` → declarative agent package (manifest 1.19 + declarative agent v1.5) for Agents Toolkit or custom app upload.',
      '- `PROMPTS.md` → prompts ready for Copilot Chat, Word, Outlook, Teams.',
      '- `workflows/` → step-by-step flows. To run them guided, use the AI Center Runner in manual mode.', ''].join('\n'));
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
    copilot: { label: 'GitHub Copilot', desc: '.github/ (instructions, prompts, agents, skills), .vscode/mcp.json, AGENTS.md and workflows as /wf-*', fn: exportCopilot },
    m365: { label: 'Copilot M365', desc: 'Declarative agents (manifest + declarativeAgent.json + icons), Agent Builder guide, prompts and guided workflows', fn: exportM365 },
    claude: { label: 'Claude Code', desc: 'CLAUDE.md, .claude/agents, .claude/commands, .claude/skills, .mcp.json', fn: exportClaude },
    cursor: { label: 'Cursor', desc: '.cursor/rules/*.mdc, .cursor/commands, .cursor/mcp.json', fn: exportCursor },
    generic: { label: 'Any AI', desc: 'ai/ with plain-text prompts and system prompts, runbooks and AGENTS.md', fn: exportGeneric }
  };
  function exportTargets(lib, targets, opts) {
    const seen = new Map();
    (targets || []).forEach((t) => {
      if (!EXPORTERS[t]) return;
      EXPORTERS[t].fn(lib, opts).forEach((f) => {
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
    resolveNode, composeStep, composeAgent, runWorkflow, runReport, runFiles,
    safeRelPath, nodeFiles, extractFiles,
    FILE_LIMITS, IGNORED_DIRS, isTextFile, isIgnoredPath, globToRegex, safePattern, matchPaths, limitFiles, formatFiles, fileValue, isFileValue, inputText, referencedNames, contextPatterns,
    lint, validateWorkflow,
    workflowRunbook, agentsMd, mermaid, m365Package, m365Instructions, agentBuilderGuide,
    exportCopilot, exportClaude, exportCursor, exportM365, exportGeneric, exportTargets
  };
});
