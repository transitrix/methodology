// `workflow-status` — on-demand visibility into every human gate the Team
// Operations + ingest conventions define: ADR / WI status, canon element
// status, REQUIREMENT/CONSTRAINT review-overdue, and ingest batches awaiting
// review. One invocation, one report. Read-only — never writes a zone, an
// operations record, or a batch.
//
// Phases and counts only. Time is deliberately out of scope here (no age, no
// threshold, no "oldest" figure).
//
// Reuses existing logic rather than reimplementing it: the REQUIREMENT/
// CONSTRAINT overdue scan is check-stale's; the ingest-batch scan reads what
// `review-queue` already writes (a `review-queue.yaml` file), rather than
// recomputing admission state.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { readTopScalar } from './yaml.mjs';
import { checkStale } from './check-stale.mjs';
import { isUnresolvedPath } from './unresolved.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function listMdFiles(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  return entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => join(dir, e.name));
}

async function walkYaml(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkYaml(p));
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

async function walkAll(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkAll(p));
    else out.push(p);
  }
  return out;
}

// A markdown record's YAML front matter (between the leading `---` fences), or
// null if the file has none. Minimal — sufficient for the flat ADR/WI header
// (method/07-decisions.md §2 / method/06-team-operations.md §3.1); reuses yaml.mjs's readTopScalar against the slice.
function frontMatterOf(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? m[1] : null;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

// operations/decisions/ADR-*.md — status: proposed|accepted|superseded
// (method/07-decisions.md §2.1), author:agent proposed broken out as its own phase
// (method/07-decisions.md §2.1). ADR ids are opaque strings throughout — both
// ADR-NNNN and ADR-YYYY-MM-DD-<slug> forms work
// without special-casing, since only `status`/`author` front-matter fields
// are read here, never the id's shape.
async function scanAdr(root) {
  const dir = join(root, 'operations', 'decisions');
  if (!(await exists(dir))) return null;
  const counts = { proposed_agent: 0, proposed_human: 0, accepted: 0, superseded: 0, unknown: 0 };
  const ids = { proposed_agent: [], proposed_human: [], accepted: [], superseded: [], unknown: [] };
  for (const file of await listMdFiles(dir)) {
    const text = await readFile(file, 'utf8');
    const fm = frontMatterOf(text);
    const id = (fm && readTopScalar(fm, 'id')) || relative(root, file);
    const status = fm && readTopScalar(fm, 'status');
    const author = (fm && readTopScalar(fm, 'author')) || 'human-architect';
    let phase;
    if (status === 'proposed') phase = author === 'agent' ? 'proposed_agent' : 'proposed_human';
    else if (status === 'accepted') phase = 'accepted';
    else if (status === 'superseded') phase = 'superseded';
    else phase = 'unknown';
    counts[phase]++;
    ids[phase].push(id);
  }
  return { counts, ids };
}

// operations/work-items/WI-*.md — status: proposed|in_progress|blocked|done|closed
// (method/06-team-operations.md §3.1).
async function scanWi(root) {
  const dir = join(root, 'operations', 'work-items');
  if (!(await exists(dir))) return null;
  const counts = { proposed: 0, in_progress: 0, blocked: 0, done: 0, closed: 0, unknown: 0 };
  const ids = { proposed: [], in_progress: [], blocked: [], done: [], closed: [], unknown: [] };
  for (const file of await listMdFiles(dir)) {
    const text = await readFile(file, 'utf8');
    const fm = frontMatterOf(text);
    const id = (fm && readTopScalar(fm, 'id')) || relative(root, file);
    const status = fm && readTopScalar(fm, 'status');
    const phase = Object.prototype.hasOwnProperty.call(counts, status) && status !== 'unknown' ? status : 'unknown';
    counts[phase]++;
    ids[phase].push(id);
  }
  return { counts, ids };
}

// canon/** elements — top-level `status:` scalar (ELEMENT_PRIMITIVES.md §7:
// "organisation-defined workflow state", optional). Most admitted elements in
// a real repo carry no `status:` at all — that is a normal, not malformed,
// outcome for an optional field, and lands in `unknown` alongside a value
// outside {draft, active, deprecated} (matched case-insensitively) — the
// AC's own rule: missing or out-of-vocabulary is never silently dropped or
// bucketed into a valid phase.
async function scanCanon(root) {
  const dir = join(root, 'canon');
  const counts = { Draft: 0, Active: 0, Deprecated: 0, unknown: 0 };
  const ids = { Draft: [], Active: [], Deprecated: [], unknown: [] };
  for (const file of await walkYaml(dir)) {
    if (isUnresolvedPath(file)) continue; // §13 holding area is not typed canon (UNRES-004)
    const text = await readFile(file, 'utf8');
    const id = readTopScalar(text, 'id') || relative(root, file);
    const raw = readTopScalar(text, 'status');
    const norm = raw ? raw.toLowerCase() : null;
    let phase;
    if (norm === 'draft') phase = 'Draft';
    else if (norm === 'active') phase = 'Active';
    else if (norm === 'deprecated') phase = 'Deprecated';
    else phase = 'unknown';
    counts[phase]++;
    ids[phase].push(id);
  }
  return { counts, ids };
}

// _intake/processing/** — any `review-queue.yaml` (ingest) or `review-digest.yaml`
// (reg-intel) found is a batch awaiting review. Reads what `review-queue` /
// `digest` already write rather than recomputing admission state; there is
// currently no move-away-when-resolved step for a whole batch (only the raw
// source moves to _intake/processed/ — intake.mjs), so this counts every such
// file on disk as open. A batch may sit at the flat legacy path (id
// `(default)`) or under its own dated directory —
// the directory name (minus the trailing filename) becomes the display id.
async function scanForPackage(root, filename) {
  const dir = join(root, '_intake', 'processing');
  if (!(await exists(dir))) return null;
  const re = new RegExp(`(^|[\\\\/])${filename.replace(/\./g, '\\.')}$`);
  const files = (await walkAll(dir)).filter(f => re.test(f));
  const ids = files.map(f => {
    const rel = relative(dir, f).replace(/\\/g, '/');
    return rel === filename ? '(default)' : rel.replace(new RegExp(`/${filename.replace(/\./g, '\\.')}$`), '');
  });
  return { count: ids.length, ids };
}

// Assemble the full report model: { repo, sections: [{ object, rows: [{ phase, count, ids, terminal }] }] }.
// A source whose folder is entirely absent contributes no section (degrades
// gracefully); a source that is present but empty still contributes every
// phase as a zero-count row, so an empty queue is visibly empty.
export async function computeWorkflowStatus(orgRoot) {
  const root = resolve(orgRoot);
  const sections = [];

  const adr = await scanAdr(root);
  if (adr) {
    sections.push({
      object: 'ADR',
      rows: [
        { phase: 'proposed (author: agent)', count: adr.counts.proposed_agent, ids: adr.ids.proposed_agent, terminal: false },
        { phase: 'proposed (human)', count: adr.counts.proposed_human, ids: adr.ids.proposed_human, terminal: false },
        { phase: 'accepted', count: adr.counts.accepted, ids: adr.ids.accepted, terminal: true },
        { phase: 'superseded', count: adr.counts.superseded, ids: adr.ids.superseded, terminal: false },
        { phase: 'unknown', count: adr.counts.unknown, ids: adr.ids.unknown, terminal: false },
      ],
    });
  }

  const wi = await scanWi(root);
  if (wi) {
    sections.push({
      object: 'Work Item',
      rows: [
        { phase: 'proposed', count: wi.counts.proposed, ids: wi.ids.proposed, terminal: false },
        { phase: 'in_progress', count: wi.counts.in_progress, ids: wi.ids.in_progress, terminal: false },
        { phase: 'blocked', count: wi.counts.blocked, ids: wi.ids.blocked, terminal: false },
        { phase: 'done', count: wi.counts.done, ids: wi.ids.done, terminal: true },
        { phase: 'closed', count: wi.counts.closed, ids: wi.ids.closed, terminal: true },
        { phase: 'unknown', count: wi.counts.unknown, ids: wi.ids.unknown, terminal: false },
      ],
    });
  }

  // Canon element status and REQUIREMENT/CONSTRAINT review-overdue both read
  // canon/ — gated on the same existence check so the two sections appear or
  // are omitted together.
  if (await exists(join(root, 'canon'))) {
    const canon = await scanCanon(root);
    sections.push({
      object: 'Canon element',
      rows: [
        { phase: 'Draft', count: canon.counts.Draft, ids: canon.ids.Draft, terminal: false },
        { phase: 'Active', count: canon.counts.Active, ids: canon.ids.Active, terminal: true },
        { phase: 'Deprecated', count: canon.counts.Deprecated, ids: canon.ids.Deprecated, terminal: false },
        { phase: 'unknown', count: canon.counts.unknown, ids: canon.ids.unknown, terminal: false },
      ],
    });

    const { stale } = await checkStale(root);
    sections.push({
      object: 'REQUIREMENT/CONSTRAINT',
      rows: [
        { phase: 'review overdue', count: stale.length, ids: stale.map(s => s.id), terminal: false },
      ],
    });
  }

  const batches = await scanForPackage(root, 'review-queue.yaml');
  if (batches) {
    sections.push({
      object: 'Ingest batch',
      rows: [
        { phase: 'awaiting review', count: batches.count, ids: batches.ids, terminal: false },
      ],
    });
  }

  const digests = await scanForPackage(root, 'review-digest.yaml');
  if (digests) {
    sections.push({
      object: 'Reg-intel digest',
      rows: [
        { phase: 'awaiting review', count: digests.count, ids: digests.ids, terminal: false },
      ],
    });
  }

  return { repo: root, sections };
}

// Default Markdown rendering — one table, then a detail list of ids in every
// non-terminal phase with at least one record (omitted entirely with
// `dataFree`, per the data-free contract: no id, name, filename, or path).
export function renderMarkdown(model, { dataFree = false } = {}) {
  const lines = [];
  lines.push(dataFree ? `Workflow status — as of ${todayIso()}` : `Workflow status — ${model.repo}, as of ${todayIso()}`);
  lines.push('');
  lines.push('| Object | Phase | Count |');
  lines.push('|---|---|---:|');
  for (const section of model.sections) {
    for (const row of section.rows) lines.push(`| ${section.object} | ${row.phase} | ${row.count} |`);
  }

  if (!dataFree) {
    const detail = [];
    for (const section of model.sections) {
      for (const row of section.rows) {
        if (row.terminal || row.ids.length === 0) continue;
        detail.push(`${section.object} — ${row.phase}:`);
        for (const id of row.ids) detail.push(`  ${id}`);
      }
    }
    if (detail.length) {
      lines.push('');
      lines.push('Open items:');
      lines.push(...detail);
    }
  }
  return lines.join('\n') + '\n';
}

// The same model as a plain object for `--format yaml` (or programmatic use).
// Identical counts to the Markdown rendering by construction — both read the
// same `model.sections`.
export function toReportObject(model, { dataFree = false } = {}) {
  return {
    generated_by: '@transitrix/ingest-cli',
    ...(dataFree ? {} : { repo: model.repo }),
    as_of: todayIso(),
    objects: model.sections.map(s => ({
      object: s.object,
      phases: s.rows.map(r => ({
        phase: r.phase,
        count: r.count,
        ...(dataFree ? {} : { ids: r.ids }),
      })),
    })),
  };
}
