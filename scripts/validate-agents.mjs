#!/usr/bin/env node
// Validates the agent-native execution layer so the board can't silently drift.
// Checks: agents.json parses; every listed page exists and embeds a valid
// #agent-spec; each page's open_actions count matches its embedded actions;
// action ids referenced in the board resolve; llms.txt links point to real files.
// Exit non-zero on any problem so it can gate CI / pre-commit.
//
//   node scripts/validate-agents.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errs = [];
const warns = [];
const err = (m) => errs.push(m);
const warn = (m) => warns.push(m);
const rel = (p) => p.replace(/^\//, '');

// ── 1. Board parses ────────────────────────────────────────────────────────
const boardPath = join(ROOT, 'agents.json');
let board;
try {
  board = JSON.parse(readFileSync(boardPath, 'utf8'));
} catch (e) {
  console.error(`❌ agents.json is invalid JSON: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(board.pages)) err('agents.json: missing "pages" array');
if (!Array.isArray(board.actions)) err('agents.json: missing "actions" array');

const boardActionIds = new Set((board.actions || []).map((a) => a.id));
const ALLOWED_STATUS = new Set(['pending', 'blocked', 'done']);

// board action shape
for (const a of board.actions || []) {
  if (!a.id) err('agents.json action missing "id"');
  if (!ALLOWED_STATUS.has(a.status)) err(`action "${a.id}": bad status "${a.status}"`);
  if (!a.do) err(`action "${a.id}": missing "do" instruction`);
  if (a.status === 'blocked' && !a.blocked_by) warn(`action "${a.id}": blocked but no "blocked_by"`);
}

// ── 2. Each page: exists, embeds valid spec, counts match ──────────────────
const SPEC_RE = /<script type="application\/json" id="agent-spec">([\s\S]*?)<\/script>/;
for (const p of board.pages || []) {
  const file = join(ROOT, rel(p.path));
  if (!existsSync(file)) { err(`page ${p.path}: file not found`); continue; }
  const html = readFileSync(file, 'utf8');
  const m = html.match(SPEC_RE);
  if (!m) { err(`page ${p.path}: no #agent-spec block`); continue; }
  let spec;
  try { spec = JSON.parse(m[1]); }
  catch (e) { err(`page ${p.path}: #agent-spec invalid JSON — ${e.message}`); continue; }

  const specCount = Array.isArray(spec.actions) ? spec.actions.length : null;
  if (specCount === null) { err(`page ${p.path}: spec has no "actions" array`); continue; }
  if (typeof p.open_actions === 'number' && p.open_actions !== specCount)
    err(`page ${p.path}: board open_actions=${p.open_actions} but spec has ${specCount}`);
  if (spec.page?.path && spec.page.path !== p.path)
    err(`page ${p.path}: spec self-path "${spec.page.path}" mismatches board`);
  if (spec.board && spec.board !== '/agents.json')
    warn(`page ${p.path}: spec "board" is "${spec.board}" (expected /agents.json)`);

  for (const a of spec.actions) {
    if (!ALLOWED_STATUS.has(a.status)) err(`${p.path} action "${a.id}": bad status "${a.status}"`);
    if (!boardActionIds.has(a.id)) warn(`${p.path} action "${a.id}" not present in agents.json board`);
  }
}

// ── 3. llms.txt links resolve (local paths only) ───────────────────────────
const llmsPath = join(ROOT, 'llms.txt');
if (existsSync(llmsPath)) {
  const txt = readFileSync(llmsPath, 'utf8');
  const re = /\((https?:\/\/velvetrope2you\.com(\/[^)\s]*)?)\)/g;
  let mm;
  while ((mm = re.exec(txt))) {
    const path = mm[2] && mm[2] !== '/' ? rel(mm[2]) : 'index.html';
    if (!existsSync(join(ROOT, path))) warn(`llms.txt: links to missing file "${mm[2] || '/'}"`);
  }
} else {
  warn('llms.txt not found');
}

// ── Report ─────────────────────────────────────────────────────────────────
for (const w of warns) console.warn(`⚠️  ${w}`);
if (errs.length) {
  for (const e of errs) console.error(`❌ ${e}`);
  console.error(`\n${errs.length} error(s), ${warns.length} warning(s).`);
  process.exit(1);
}
const total = (board.actions || []).length;
const open = (board.actions || []).filter((a) => a.status !== 'done').length;
console.log(`✅ agent layer valid — ${board.pages.length} pages, ${total} board actions (${open} open), ${warns.length} warning(s).`);
