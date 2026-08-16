#!/usr/bin/env node
// Architecture Decision Log (ADL) harvest — the central pull job.
//
// Regenerates the enterprise ADL in the central architecture repo from the
// per-repo decision records of every source repo. Derived, idempotent, and
// one-directional: it only ever writes the central index + promoted copies; it
// never touches a source repo. See method/07-decisions.md §5.
//
// Usage:
//   node adl-harvest.mjs --config <harvest.config.yaml> \
//                        --workspace <dir-of-checked-out-source-repos> \
//                        --out <architecture/decision-log dir>
//
// Each source repo named in the config is expected as a sub-directory of
// --workspace (CI or a wrapper clones them). A missing source is warned and
// skipped, not fatal — the index degrades rather than failing the run.
//
// MVP scope: config is parsed with targeted regex over a known flat shape (see
// the template). Exit codes: 0 ok · 1 nothing-harvested warning · 2 error.

import { readFile, readdir, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const args = process.argv.slice(2);
function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const CONFIG = argVal('--config', 'architecture/decision-log/harvest.config.yaml');
const WORKSPACE = argVal('--workspace', '.');
const OUT = argVal('--out', 'architecture/decision-log');

// Matches both id forms (date-slug ADR-YYYY-MM-DD-<slug>.md and legacy
// ADR-NNNN-<slug>.md) — the id itself is opaque here, never parsed or sorted
// numerically; see method/07-decisions.md §3.
const FILE_RE = /^ADR-[^/]+\.md$/;

// --- minimal config parse (flat known shape) -------------------------------

function parseConfig(text) {
  const sources = [];
  const lines = text.split('\n');
  let inSources = false, cur = null;
  const promoteScopes = [];
  let inPromote = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');           // strip comments
    if (/^sources:\s*$/.test(line)) { inSources = true; inPromote = false; continue; }
    if (/^promote:\s*$/.test(line)) { inPromote = true; inSources = false; continue; }
    if (/^[a-z_]+:/i.test(line) && !/^\s/.test(line)) { inSources = false; inPromote = false; }

    if (inSources) {
      const item = line.match(/^\s*-\s*repo:\s*(.+?)\s*$/);
      if (item) { if (cur) sources.push(cur); cur = { repo: item[1].replace(/^["']|["']$/g, ''), path: 'operations/decisions' }; continue; }
      const kv = line.match(/^\s+(repo|path|clone):\s*(.+?)\s*$/);
      if (kv && cur) cur[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
    if (inPromote) {
      const sc = line.match(/^\s+scopes:\s*\[(.*)\]\s*$/);
      if (sc) sc[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean).forEach(s => promoteScopes.push(s));
    }
  }
  if (cur) sources.push(cur);
  return { sources, promoteScopes };
}

// --- front-matter -----------------------------------------------------------

function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: text };
}
function parseFm(fmText) {
  const out = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2].replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
    out[m[1]] = v;
  }
  return out;
}

async function walk(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (FILE_RE.test(e.name)) out.push(full);
  }
  return out;
}

// --- main -------------------------------------------------------------------

async function main() {
  if (!existsSync(CONFIG)) { console.error(`error: config not found: ${CONFIG}`); process.exit(2); }
  const { sources, promoteScopes } = parseConfig(await readFile(CONFIG, 'utf8'));
  if (sources.length === 0) { console.error('error: config lists no sources.'); process.exit(2); }

  const rows = [];          // harvested index rows
  const promoted = [];      // {repo, absFile, base}
  let skipped = 0;

  for (const src of sources) {
    const decisionsDir = join(WORKSPACE, src.repo, src.path);
    if (!existsSync(decisionsDir)) {
      console.warn(`warn: source not found, skipping: ${src.repo} (${decisionsDir})`);
      skipped++;
      continue;
    }
    for (const abs of await walk(decisionsDir)) {
      const { fm: fmText } = splitFrontMatter(await readFile(abs, 'utf8'));
      const fm = parseFm(fmText);
      // fm.id should always be present (check-adl.mjs A1 requires it); this
      // fallback is opaque — the whole filename stem, no numeric assumption —
      // for a record the source repo's own guard hasn't caught yet.
      const localId = fm.id || basename(abs).replace(/\.md$/, '');
      const nsId = `${src.repo}/${localId}`;
      const rel = relative(join(WORKSPACE, src.repo), abs).split('\\').join('/');
      const backlink = src.clone
        ? `${src.clone.replace(/\.git$/, '')}/blob/main/${rel}`
        : rel;
      rows.push({
        nsId, title: fm.title || '(untitled)', date: fm.date || '',
        status: fm.status || '', author: fm.author || '', source: fm.source || '',
        backlink,
      });
      if (fm.scope && promoteScopes.includes(fm.scope))
        promoted.push({ repo: src.repo, absFile: abs, base: basename(abs) });
    }
  }

  rows.sort((a, b) => (b.date.localeCompare(a.date)) || a.nsId.localeCompare(b.nsId));

  // INDEX.md — deterministic output
  const lines = [];
  lines.push('# Architecture Decision Log — enterprise index');
  lines.push('');
  lines.push('> Derived by `scripts/adl-harvest.mjs`. **Do not edit by hand** — regenerated each harvest.');
  lines.push('> Source of truth for each record is its own repository (follow the backlink).');
  lines.push('');
  lines.push(`Harvested ${rows.length} record(s) from ${sources.length - skipped}/${sources.length} source repo(s).`);
  lines.push('');
  lines.push('| ID | Decision | Date | Status | Author | Source |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    const title = `[${r.title.replace(/\|/g, '\\|')}](${r.backlink})`;
    lines.push(`| \`${r.nsId}\` | ${title} | ${r.date} | ${r.status} | ${r.author} | ${r.source.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'INDEX.md'), lines.join('\n'), 'utf8');

  // promoted/ — full copies, rebuilt clean for idempotency
  const promotedDir = join(OUT, 'promoted');
  await rm(promotedDir, { recursive: true, force: true });
  for (const p of promoted) {
    const destDir = join(promotedDir, p.repo);
    await mkdir(destDir, { recursive: true });
    await copyFile(p.absFile, join(destDir, p.base));
  }

  console.log(`ADL harvest: ${rows.length} record(s) indexed, ${promoted.length} promoted, ${skipped} source(s) skipped → ${OUT}/INDEX.md`);
  process.exit(skipped === sources.length ? 1 : 0);
}

main().catch(e => { console.error(`error: ${e.message}`); process.exit(2); });
