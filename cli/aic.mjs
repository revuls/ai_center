#!/usr/bin/env node
/**
 * AI Center · CLI (Node 18+, no dependencies)
 * Uses the same core as the app (assets/js/core.js).
 *
 *   node cli/aic.mjs help
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const C = require('../assets/js/core.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- arguments ---------------- */
const argv = process.argv.slice(2);
const flags = { input: [] };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split(/=(.*)/s);
    const val = v !== undefined ? v : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    if (k === 'input' || k === 'i') flags.input.push(val); else flags[k] = val;
  } else pos.push(a);
}
const cmd = pos.shift() || 'help';
const LIB_DIR = path.resolve(flags.lib || path.join(ROOT, 'library'));

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, m: (s) => `\x1b[35m${s}\x1b[0m`, cy: (s) => `\x1b[36m${s}\x1b[0m`
};
const die = (msg) => { console.error(c.r('✖ ' + msg)); process.exit(1); };

/* ---------------- files ---------------- */
/** Reads the library. Every file inside a skill folder is kept (text or binary); elsewhere only text files. */
function readTree(dir, prefix = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === '.DS_Store' || name === '.git' || name === 'node_modules' || (!prefix && name === 'library.bundle.js')) continue;
    if (name.startsWith('.') && !/^skills\/[^/]+\//.test(prefix)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    const rel = prefix + name;
    if (st.isDirectory()) { out.push(...readTree(full, rel + '/')); continue; }
    const inSkill = /^skills\/[^/]+\/./.test(rel) && !/^skills\/[^/]+\/SKILL\.md$/i.test(rel);
    if (inSkill) {
      if (st.size > C.RESOURCE_MAX_BYTES) { console.error(c.y(`⚠ skipped ${rel}: larger than ${C.RESOURCE_MAX_BYTES / 1024 / 1024} MB`)); continue; }
      out.push({ path: rel, content: C.contentFromBytes(fs.readFileSync(full)) });
    } else if (st.size < 768 * 1024 && (C.isTextFile(name) || /\.(mdc|ini|bat)$/i.test(name))) out.push({ path: rel, content: fs.readFileSync(full, 'utf8') });
  }
  return out;
}
function loadLib() { return C.libraryFromFiles(readTree(LIB_DIR)); }
/** Relative paths of the text files under `base` (ignored folders skipped). */
function listFiles(base, prefix = '', out = []) {
  for (const name of fs.readdirSync(path.join(base, prefix))) {
    const rel = prefix ? prefix + '/' + name : name;
    if (C.IGNORED_DIRS.includes(name) || (name.startsWith('.') && !['.github', '.claude', '.cursor', '.gitignore'].includes(name))) continue;
    const st = fs.statSync(path.join(base, rel));
    if (st.isDirectory()) listFiles(base, rel, out);
    else if (C.isTextFile(rel) && st.size < 1024 * 1024) out.push(rel);
  }
  return out;
}
/** Reads the files under `base` that match the patterns, applying the core limits. */
function readMatching(base, patterns) {
  const m = C.matchPaths(listFiles(base), patterns);
  const lim = C.limitFiles(m.matched.map((p) => ({ path: p, content: fs.readFileSync(path.join(base, p), 'utf8') })));
  return Object.assign(lim, { unmatched: m.unmatched });
}
/** Value for a file/folder input: `@path` (or any value when the input type is file/folder). */
function readInputPath(raw, input) {
  const p = path.resolve(String(raw).replace(/^@/, ''));
  if (!fs.existsSync(p)) die(`Input «${input.name}»: path not found: ${p}`);
  if (fs.statSync(p).isDirectory()) {
    const res = readMatching(p, [input.pattern || '**']);
    if (!res.files.length) die(`Input «${input.name}»: no text files in ${p}${input.pattern ? ' matching ' + input.pattern : ''}`);
    return C.fileValue(res.files, res);
  }
  const rel = path.relative(process.cwd(), p);
  return C.fileValue([{ path: !rel || rel.startsWith('..') ? path.basename(p) : rel, content: fs.readFileSync(p, 'utf8') }]);
}
/** Writes a file (string, Buffer/Uint8Array or stored { b64 } content); scripts keep their executable bit. */
function writeOut(base, rel, data) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const isStored = data && typeof data === 'object' && !(data instanceof Uint8Array);
  fs.writeFileSync(full, isStored ? C.contentToData(data) : data);
  if (typeof data === 'string' && C.isExecutable(rel, data)) fs.chmodSync(full, 0o755);
}

/* ---------------- minimal PNG for M365 icons ---------------- */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xEDB88320 ^ (x >>> 1) : x >>> 1; t[n] = x >>> 0; } return t; })();
const crc32 = (buf) => { let x = 0xFFFFFFFF; for (const b of buf) x = CRC[(x ^ b) & 0xFF] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; };
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) { const p = pixel(x, y); p.forEach((v, i) => { raw[y * (size * 4 + 1) + 1 + x * 4 + i] = v; }); }
  }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function iconPng(ic) {
  const hex = (ic.color || '#6E56CF').replace('#', '');
  const a = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  const b = [0x2f, 0xb5, 0xd2];
  const s = ic.size;
  if (ic.outline) return png(s, (x, y) => { const d = Math.hypot(x - s / 2 + 0.5, y - s / 2 + 0.5); return d < s / 2 - 2 && d > s / 2 - 4.5 ? [255, 255, 255, 255] : (d < s / 6 ? [255, 255, 255, 255] : [0, 0, 0, 0]); });
  return png(s, (x, y) => { const t = (x + y) / (2 * s); return [...a.map((v, i) => Math.round(v + (b[i] - v) * t)), 255]; });
}

/* ---------------- interaction ---------------- */
let rl = null;
const lineQueue = []; const waiters = []; let stdinClosed = false;
function ensureRl() {
  if (rl) return;
  rl = readline.createInterface({ input: process.stdin, terminal: process.stdin.isTTY });
  rl.on('line', (l) => { const w = waiters.shift(); if (w) w(l); else lineQueue.push(l); });
  rl.on('close', () => { stdinClosed = true; while (waiters.length) waiters.shift()(''); });
}
const ask = (q) => { ensureRl(); if (q) process.stdout.write(q); if (lineQueue.length) return Promise.resolve(lineQueue.shift()); if (stdinClosed) return Promise.resolve(''); return new Promise((res) => waiters.push(res)); };
async function readMultiline(prompt) {
  console.log(prompt + c.dim(' (finish with a line containing only EOF)'));
  const lines = [];
  for (;;) { const l = await ask(''); if (l.trim() === 'EOF' || (stdinClosed && !lineQueue.length && l === '')) break; lines.push(l); }
  return lines.join('\n');
}

/* ---------------- LLM providers ---------------- */
function runProc(bin, args, opts) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, Object.assign({ stdio: ['ignore', 'pipe', 'pipe'] }, opts));
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; if (flags.verbose) process.stdout.write(c.dim(String(d))); });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => reject(e.code === 'ENOENT' ? new Error(`«${bin}» not found in PATH`) : e));
    p.on('close', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`${bin} exited with code ${code}: ${err.slice(-600)}`)));
  });
}
const AGENTIC_NOTE = '\n\n---\nYou are working inside the current repository and can use your tools (read/edit files, run commands). When you finish this step, answer with the complete step deliverable in Markdown.';
function makeLLM(provider, runDir) {
  const model = flags.model;
  return async (composed, info) => {
    const tag = String(info.run.steps.length).padStart(2, '0');
    fs.writeFileSync(path.join(runDir, `${tag}-${C.slugify(composed.title)}.prompt.md`), composed.full);
    console.log(`\n${c.m('◆')} ${c.b(composed.title)} ${c.dim('· ' + provider + (composed.agent ? ' · agent ' + composed.agent : ''))}`);
    switch (provider) {
      case 'manual': {
        console.log(c.dim('─'.repeat(60)));
        console.log(composed.full);
        console.log(c.dim('─'.repeat(60)));
        if (info.kind === 'condition') console.log(c.y('Options: ' + info.options.join(' · ')));
        return readMultiline(c.cy('Paste your AI answer:'));
      }
      case 'anthropic': {
        const key = process.env.ANTHROPIC_API_KEY || die('Missing ANTHROPIC_API_KEY');
        const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, system: composed.system, messages: [{ role: 'user', content: composed.user }] }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ? d.error.message : 'HTTP ' + r.status);
        return d.content.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
      }
      case 'openai': case 'github': case 'ollama': case 'azure': {
        let url; const headers = { 'content-type': 'application/json' }; const body = { messages: [{ role: 'system', content: composed.system }, { role: 'user', content: composed.user }] };
        if (provider === 'azure') {
          const ep = process.env.AZURE_OPENAI_ENDPOINT || die('Missing AZURE_OPENAI_ENDPOINT');
          const dep = model || process.env.AZURE_OPENAI_DEPLOYMENT || die('Pass --model <deployment> or set AZURE_OPENAI_DEPLOYMENT');
          url = `${ep.replace(/\/$/, '')}/openai/deployments/${dep}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'}`;
          headers['api-key'] = process.env.AZURE_OPENAI_API_KEY || die('Missing AZURE_OPENAI_API_KEY');
        } else {
          const base = provider === 'github' ? 'https://models.github.ai/inference' : provider === 'ollama' ? (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1') : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
          url = base.replace(/\/$/, '') + '/chat/completions';
          const key = provider === 'github' ? (process.env.GITHUB_TOKEN || die('Missing GITHUB_TOKEN (with models:read permission)')) : provider === 'openai' ? (process.env.OPENAI_API_KEY || '') : '';
          if (key) headers.Authorization = 'Bearer ' + key;
          body.model = model || (provider === 'github' ? 'openai/gpt-4.1' : provider === 'ollama' ? 'llama3.1' : (process.env.OPENAI_MODEL || 'gpt-4.1'));
        }
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((d.error && (d.error.message || JSON.stringify(d.error))) || 'HTTP ' + r.status);
        return d.choices[0].message.content;
      }
      case 'copilot': {
        const extra = (process.env.AIC_COPILOT_ARGS || '--allow-all-tools').split(/\s+/).filter(Boolean);
        const args = ['-p', composed.full + AGENTIC_NOTE, ...extra];
        if (model) args.push('--model', model);
        return runProc(process.env.AIC_COPILOT_BIN || 'copilot', args, { cwd: flags.cwd ? path.resolve(flags.cwd) : process.cwd() });
      }
      case 'claude-code': {
        const extra = (process.env.AIC_CLAUDE_ARGS || '--permission-mode acceptEdits').split(/\s+/).filter(Boolean);
        const args = ['-p', composed.user + AGENTIC_NOTE, '--append-system-prompt', composed.system, '--output-format', 'text', ...extra];
        if (model) args.push('--model', model);
        return runProc(process.env.AIC_CLAUDE_BIN || 'claude', args, { cwd: flags.cwd ? path.resolve(flags.cwd) : process.cwd() });
      }
      default: die('Unknown provider: ' + provider + ' (manual|anthropic|openai|github|azure|ollama|copilot|claude-code)');
    }
  };
}

/* ---------------- commands ---------------- */
const HELP = `
${c.b('AI Center · CLI')}  ${c.dim('v' + C.VERSION)}

${c.b('Usage')}  node cli/aic.mjs <command> [options]

  ${c.cy('list')} [type]                      List the library (workflow, agent, prompt, skill, instruction, knowledge, mcp)
  ${c.cy('lint')}                             Validate the library (exit code 1 on errors)
  ${c.cy('bundle')}                           Regenerate library/library.bundle.js (to open index.html without a server)
  ${c.cy('export')} <target...|all> [--out dir] [--tag t]
                                   Targets: copilot · m365 · claude · cursor · generic
  ${c.cy('runbook')} <workflow> [--flavor copilot|claude|m365|generic]
                                   Print the E2E runbook of a workflow
  ${c.cy('run')} <workflow> [--input key=value ...] [--provider p] [--model m] [--auto-approve] [--cwd dir] [--write-files dir]
                                   Run a workflow end to end. Output files go to runs/<run>/files/;
                                   --write-files also writes them into <dir> (e.g. your repository)
                                   File/folder inputs: --input spec=@docs/spec.md · --input refs=@docs/
                                   Step context files are read from --context-dir (default --cwd or .);
                                   agentic providers read them themselves (force with --inline-context)
                                   Providers: manual (default) · copilot (Copilot CLI) · claude-code · anthropic
                                              github (GitHub Models) · openai · azure · ollama
  ${c.cy('new')} <type> "<name>"               Create an item from a template
  ${c.cy('agents-md')}                        Regenerate the framework AGENTS.md (for agents working in this repo)

${c.b('Global options')}
  --lib <dir>    Library folder (default ./library)
  --verbose      Show agent output in real time

${c.b('Examples')}
  node cli/aic.mjs export copilot --out ../my-repo
  node cli/aic.mjs run feature-e2e --input idea="Export invoices to PDF" --provider copilot --cwd ../my-repo
  GITHUB_TOKEN=… node cli/aic.mjs run bugfix --provider github --auto-approve
`;

async function main() {
  switch (cmd) {
    case 'help': case '-h': case '--help': console.log(HELP); break;

    case 'list': {
      const lib = loadLib();
      const types = pos[0] ? [pos[0]] : C.TYPE_ORDER;
      types.forEach((t) => {
        const items = lib.items.filter((i) => i.type === t);
        if (!items.length) return;
        console.log('\n' + c.b(`${C.TYPES[t].icon} ${C.TYPES[t].label} (${items.length})`));
        items.forEach((i) => console.log(`  ${c.cy(i.id.padEnd(28))} ${i.name} ${c.dim('· ' + i.status)}`));
      });
      console.log();
      break;
    }

    case 'lint': {
      const lib = loadLib();
      const issues = C.lint(lib);
      const col = { error: c.r, warn: c.y, info: c.cy };
      issues.forEach((i) => console.log(`${col[i.level]((i.level.toUpperCase()).padEnd(6))} ${c.b(i.type + ':' + i.id)} ${i.msg}`));
      const e = issues.filter((i) => i.level === 'error').length;
      console.log(`\n${lib.items.length} items · ${e ? c.r(e + ' errors') : c.g('0 errors')} · ${issues.filter((i) => i.level === 'warn').length} warnings · ${issues.filter((i) => i.level === 'info').length} suggestions`);
      process.exit(e ? 1 : 0);
      break;
    }

    case 'bundle': {
      const lib = loadLib();
      fs.writeFileSync(path.join(LIB_DIR, 'library.bundle.js'), C.serializeBundle(lib));
      console.log(c.g('✔') + ` library.bundle.js regenerated (${lib.items.length} items)`);
      break;
    }

    case 'export': {
      const lib = loadLib();
      let targets = pos.length ? pos : ['copilot'];
      if (targets.includes('all')) targets = Object.keys(C.EXPORTERS);
      const out = path.resolve(flags.out || path.join(ROOT, 'dist'));
      const files = C.exportTargets(lib, targets, { tag: flags.tag });
      files.forEach((f) => writeOut(out, f.path, f.icon ? iconPng(f.icon) : f.content));
      console.log(c.g('✔') + ` ${files.length} files (${targets.join(', ')}) → ${out}`);
      break;
    }

    case 'runbook': {
      const lib = loadLib();
      const wf = lib.items.find((i) => i.type === 'workflow' && i.id === pos[0]) || die('Workflow not found: ' + pos[0]);
      console.log(C.workflowRunbook(lib, wf, flags.flavor || 'generic'));
      break;
    }

    case 'run': {
      const lib = loadLib();
      const wf = lib.items.find((i) => i.type === 'workflow' && i.id === pos[0]) || die('Workflow not found: ' + (pos[0] || '(give an id)') + '. Use: node cli/aic.mjs list workflow');
      const errors = C.validateWorkflow(lib, wf).filter((i) => i.level === 'error');
      if (errors.length) die('The workflow has errors:\n  ' + errors.map((e) => e.msg).join('\n  '));
      const inputs = {};
      flags.input.forEach((kv) => { const [k, v] = String(kv).split(/=(.*)/s); inputs[k] = v; });
      for (const i of wf.inputs) {
        const isPath = i.type === 'file' || i.type === 'folder';
        if (!inputs[i.name] && i.required) inputs[i.name] = await ask(`${c.cy('?')} ${i.label || i.name}${isPath ? c.dim(' [' + i.type + ' path]') : ''}${i.description ? c.dim(' (' + i.description + ')') : ''}: `);
        if (inputs[i.name] && (isPath || String(inputs[i.name]).startsWith('@'))) {
          inputs[i.name] = readInputPath(inputs[i.name], i);
          console.log(c.dim(`  📎 ${i.name}: ${C.inputText(inputs[i.name])}`));
        }
      }
      for (const k of Object.keys(inputs)) if (typeof inputs[k] === 'string' && inputs[k].startsWith('@') && !wf.inputs.some((i) => i.name === k)) inputs[k] = readInputPath(inputs[k], { name: k });
      const agentic = ['copilot', 'claude-code'].includes(flags.provider);
      const ctxBase = path.resolve(flags['context-dir'] || flags.cwd || '.');
      const provider = flags.provider || 'manual';
      const runsDir = path.resolve(flags.runs || path.join(ROOT, 'runs'));
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const runDir = path.join(runsDir, `${stamp}-${wf.id}`);
      fs.mkdirSync(runDir, { recursive: true });
      const writeTo = flags['write-files'] ? path.resolve(flags['write-files'] === true ? '.' : flags['write-files']) : null;
      const saveFiles = (files) => files.forEach((f) => {
        const rel = C.safeRelPath(f.path);
        if (!rel) return;
        writeOut(path.join(runDir, 'files'), rel, f.content);
        if (writeTo) {
          const target = path.resolve(writeTo, rel);
          if (target.startsWith(writeTo + path.sep)) writeOut(writeTo, rel, f.content);
        }
        console.log(c.dim('    📄 ' + rel + (writeTo ? ' → ' + path.relative(process.cwd(), path.join(writeTo, rel)) : '')));
      });
      console.log(`\n${c.b('▶ ' + wf.name)} ${c.dim('· provider ' + provider + ' · ' + path.relative(process.cwd(), runDir))}`);
      let n = 0;
      const run = await C.runWorkflow(lib, wf, inputs, {
        llm: makeLLM(provider, runDir),
        readFiles: agentic && !flags['inline-context'] ? undefined : async (patterns) => {
          const res = readMatching(ctxBase, patterns);
          console.log(c.dim(`    📂 context: ${res.files.length} file(s) from ${path.relative(process.cwd(), ctxBase) || '.'}${res.omitted ? ` (${res.omitted} omitted by limits)` : ''}`));
          return res;
        },
        human: async ({ node, context, step }) => {
          console.log(`\n${c.y('🧑 Human review:')} ${c.b(step.title)}${node.owner ? c.dim(' · ' + node.owner) : ''}`);
          if (node.instructions) console.log(c.dim(node.instructions));
          if (flags['auto-approve']) { console.log(c.g('  ✔ approved automatically')); return { approved: true, notes: 'auto-approve' }; }
          if (context) console.log(c.dim('─'.repeat(60)) + '\n' + context.slice(0, 4000) + (context.length > 4000 ? c.dim('\n…(see the run files)') : '') + '\n' + c.dim('─'.repeat(60)));
          const a = (await ask(c.cy('Approve? [Y]es / [c]hanges: '))).trim().toLowerCase();
          if (a.startsWith('c') || a.startsWith('n')) return { approved: false, notes: await ask(c.cy('What needs to change? ')) };
          return { approved: true, notes: await ask(c.dim('Comment (optional): ')) };
        },
        choose: async ({ edges, answer, options }) => {
          console.log(c.y('Option not recognized in: ') + c.dim(String(answer).split('\n')[0]));
          options.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
          const k = parseInt(await ask(c.cy('Choose an option: ')), 10) - 1;
          return edges[k] || edges[0];
        },
        onEvent: (type, d) => {
          if (type === 'step:done') {
            n++;
            fs.writeFileSync(path.join(runDir, `${String(n).padStart(2, '0')}-${C.slugify(d.title)}.md`), `# ${d.title}\n\n${d.decision ? `> Decision: ${d.decision}\n\n` : ''}${d.output || ''}\n`);
            console.log(`${c.g('  ✔')} ${d.title}${d.decision ? c.dim(' → ' + d.decision) : ''}`);
            if (d.files) saveFiles(d.files);
            if (d.missingFiles) console.log(c.y('    ⚠ missing files: ' + d.missingFiles.join(', ')));
          }
          if (type === 'step:error') console.log(c.r('  ✖ ' + d.title + ': ' + d.error));
          if (type === 'warn') console.log(c.y('  ⚠ ' + d.message));
        }
      });
      fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2));
      fs.writeFileSync(path.join(runDir, 'REPORT.md'), C.runReport(run, wf));
      const produced = C.runFiles(run);
      if (produced.length) console.log(`\n${c.b('📄 ' + produced.length + ' file(s)')} ${c.dim('→ ' + path.relative(process.cwd(), path.join(runDir, 'files')) + (writeTo ? ' and ' + (path.relative(process.cwd(), writeTo) || '.') : ''))}`);
      console.log(`\n${run.status === 'completed' ? c.g('🎉 Completed') : c.r('⚠ ' + run.status + (run.error ? ': ' + run.error : ''))} · report: ${path.relative(process.cwd(), path.join(runDir, 'REPORT.md'))}`);
      if (rl) rl.close();
      process.exit(run.status === 'completed' ? 0 : 1);
      break;
    }

    case 'agents-md': {
      const lib = loadLib();
      const intro = '<!-- Generated with: node cli/aic.mjs agents-md -->\n\n';
      const how = `\n## How to run a workflow of this framework\n\n1. Read the workflow JSON in \`library/workflows/<id>.workflow.json\` or, better, its runbook: \`node cli/aic.mjs runbook <id>\`.\n2. Follow the runbook step by step adopting each agent's role (\`library/agents/\`), applying its skills (\`library/skills/\`) and its knowledge (\`library/knowledge/\`).\n3. Stop at human reviews.\n4. To run it automatically: \`node cli/aic.mjs run <id> --provider copilot|claude-code|anthropic|github\`.\n\n## Maintaining the library\n\n- Edit files in \`library/\` following the format in \`docs/FORMAT.md\`.\n- Then: \`node cli/aic.mjs lint && node cli/aic.mjs bundle\`.\n`;
      fs.writeFileSync(path.join(ROOT, 'AGENTS.md'), intro + C.agentsMd(lib, 'library') + how);
      console.log(c.g('✔') + ' AGENTS.md regenerated');
      break;
    }

    case 'new': {
      const type = pos[0]; const name = pos.slice(1).join(' ');
      if (!C.TYPES[type] || !name) die('Usage: new <type> "<name>"');
      const it = C.newItem(type, { id: C.slugify(name), name, description: 'TODO: describe when to use it.', body: '# ' + name + '\n\nTODO\n' });
      const f = C.itemToFile(it);
      const full = path.join(LIB_DIR, f.path);
      if (fs.existsSync(full)) die('Already exists: ' + f.path);
      writeOut(LIB_DIR, f.path, f.content);
      console.log(c.g('✔') + ' Created library/' + f.path);
      break;
    }

    default: console.log(HELP); process.exit(1);
  }
}
main().catch((e) => { console.error(c.r('✖ ' + (e.stack || e.message))); process.exit(1); });
