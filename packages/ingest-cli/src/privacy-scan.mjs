// `privacy-scan` — the fail-closed pre-admission gate (SKILL.md Step 2b). Runs a
// closed set of deterministic pattern + dictionary detectors over a converted
// document and produces one of CLEAN / STRIPPED / REJECTED / ERROR. A STRIPPED run
// writes a redacted copy; admit-source (field zone only — codex sources are
// laws/regulations, not personal data) refuses to proceed without a passing,
// content-matching scan record for the exact file it is given.
//
// Honesty about limits: this is a regex/dictionary-class detector, not a guarantee.
// It catches shaped tokens (SSN/NI-number patterns, emails, phone numbers, card
// numbers, passport-shaped codes) and a fixed medical-vocabulary list — it does not
// understand context, cannot catch PII that doesn't match a known shape, and can
// both over-flag (a false positive) and miss real PII (a false negative). The
// per-run privacy-report.yaml exists precisely so a human can audit both directions.

import { readFile, writeFile, access } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { hashBytes } from './source-hash.mjs';
import { dump } from './yaml.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

export const DETECTION_CATEGORIES = [
  { code: 'PII-001', category: 'National identifier', examples: 'SSN, NI number, national-ID-shaped tokens' },
  { code: 'PII-002', category: 'Date of birth', examples: 'DOB phrases combined with date-shaped tokens in a personal context' },
  { code: 'PII-003', category: 'Medical / health terms', examples: 'Diagnosis codes, medication names, clinical and diagnostic vocabulary' },
  { code: 'PII-004', category: 'Contact PII beyond allowlist', examples: 'Personal email, personal phone (non-work)' },
  { code: 'PII-005', category: 'Financial personal', examples: 'Credit / debit card numbers, personal bank account numbers' },
  { code: 'PII-006', category: 'Biometric / government identifier', examples: 'Passport numbers, biometric descriptors' },
];

export const DEFAULT_ALLOWLIST = [
  { field: 'first_name', on: ['ACTOR', 'ORG'] },
  { field: 'last_name', on: ['ACTOR', 'ORG'] },
  { field: 'work_phone', on: ['ACTOR', 'ORG'] },
  { field: 'work_email', on: ['ACTOR', 'ORG'] },
];

// ── transitrix.yaml `ingest.privacy_gate` config (hand-rolled, zero-dep — same
// discipline as coverage.mjs's custom coverage_profile block reader) ──────────

function indentOf(line) { return line.match(/^\s*/)[0].length; }

// Find a `key:` header line (block form, no inline value) at/after fromIdx and
// return its body lines up to the first line at or below its own indentation.
function blockUnder(lines, headerRe, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    if (!headerRe.test(raw.trim())) continue;
    const indent = indentOf(raw);
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const ln = lines[j];
      if (ln.trim() === '' || ln.trim().startsWith('#')) { body.push(ln); continue; }
      if (indentOf(ln) <= indent) break;
      body.push(ln);
    }
    return { idx: i, indent, body, endIdx: j };
  }
  return null;
}

export function parsePrivacyGateConfig(manifestText) {
  const defaults = () => ({ enabled: true, onDetection: 'strip', allowlist: DEFAULT_ALLOWLIST.map((a) => ({ ...a })) });
  if (typeof manifestText !== 'string') return defaults();

  const lines = manifestText.replace(/\r\n/g, '\n').split('\n');
  const ingest = blockUnder(lines, /^ingest:\s*$/);
  if (!ingest) return defaults();
  const pg = blockUnder(ingest.body, /^privacy_gate:\s*$/);
  if (!pg) return defaults();

  const cfg = defaults();
  for (let i = 0; i < pg.body.length; i++) {
    const ln = pg.body[i];
    const t = ln.trim();
    if (t === '' || t.startsWith('#')) continue;
    let m;
    if ((m = t.match(/^enabled:\s*(true|false)\b/))) { cfg.enabled = m[1] === 'true'; continue; }
    if ((m = t.match(/^on_detection:\s*(strip|reject)\b/))) { cfg.onDetection = m[1]; continue; }
    if (/^allowlist:\s*$/.test(t)) {
      const allow = blockUnder(pg.body, /^allowlist:\s*$/, i);
      const entries = [];
      let cur = null;
      for (const l2 of allow.body) {
        const t2 = l2.trim();
        let mm;
        if ((mm = t2.match(/^-\s*field:\s*(\S+)\s*$/))) { cur = { field: mm[1], on: [] }; entries.push(cur); continue; }
        if ((mm = t2.match(/^on:\s*\[([^\]]*)\]\s*$/)) && cur) {
          cur.on = mm[1].split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (entries.length) cfg.allowlist = entries;
      i = allow.endIdx - pg.idx - 1; // skip the consumed sub-block
      continue;
    }
  }
  return cfg;
}

// ── Detectors — deterministic pattern + dictionary matching ─────────────────

function luhnValid(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const MEDICAL_TERMS = [
  'diagnosis', 'diagnosed with', 'prescribed', 'prescription', 'medication',
  'chronic condition', 'psychiatric', 'mental health', 'therapy session',
  'clinical history', 'medical history', 'treatment plan', 'insulin', 'chemotherapy',
];

const DETECTORS = [
  {
    code: 'PII-001',
    reason: 'national-ID-shaped token matched (SSN or NI-number pattern)',
    regex: /\b\d{3}-\d{2}-\d{4}\b|\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{6}\s?[A-D]\b/g,
  },
  {
    code: 'PII-002',
    reason: 'date-of-birth phrase combined with a date-shaped token',
    regex: /\b(?:date of birth|d\.?o\.?b\.?|born on)\s*[:\-]?\s*(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi,
  },
  {
    code: 'PII-003',
    reason: 'medical/health vocabulary matched',
    regex: new RegExp(`\\b(?:${MEDICAL_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi'),
  },
  {
    code: 'PII-005',
    reason: 'financial card/account-shaped digit sequence (Luhn-valid)',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    validate: (m) => luhnValid(m.replace(/[ -]/g, '')),
  },
  {
    code: 'PII-006',
    reason: 'passport-number-shaped token matched',
    regex: /\bpassport\s*(?:no\.?|number)?\s*[:\-]?\s*[A-Z0-9]{6,9}\b/gi,
  },
  {
    code: 'PII-004',
    reason: 'personal contact detail (email or phone) not covered by the allowlist',
    regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b|\b\+?\d[\d\- ]{7,14}\d\b/g,
    allowlistable: true,
  },
];

function preview(fragment) {
  return `${fragment.slice(0, 20)}***`;
}

function lineOf(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

function isAllowlistedContext(text, index, allowlist) {
  const line = lineOf(text, index).toLowerCase();
  return allowlist.some((entry) => {
    const label = String(entry.field).toLowerCase();
    return line.includes(label) || line.includes(label.replace(/_/g, ' '));
  });
}

function findMatches(text, def) {
  const out = [];
  const re = new RegExp(def.regex.source, def.regex.flags);
  let m;
  while ((m = re.exec(text))) {
    const val = m[0];
    if (val.length === 0) { re.lastIndex++; continue; }
    if (def.validate && !def.validate(val)) continue;
    out.push({ code: def.code, index: m.index, length: val.length, text: val, reason: def.reason, allowlistable: !!def.allowlistable });
  }
  return out;
}

// Scan `text` against the detector set. Returns { outcome, blockedFragments, redactedText }.
// `config.onDetection`: 'strip' (default) redacts and admits the clean copy; 'reject'
// blocks the whole document. Overlapping matches keep the earliest, highest-priority
// detector (DETECTORS order — PII-004 contact detection runs last so a token already
// claimed by a more specific category, e.g. a card number, is not double-reported).
export function scanText(text, config = {}) {
  const allowlist = config.allowlist || DEFAULT_ALLOWLIST;
  const onDetection = config.onDetection || 'strip';

  const all = [];
  for (const def of DETECTORS) all.push(...findMatches(text, def));
  all.sort((a, b) => a.index - b.index || DETECTORS.findIndex((d) => d.code === a.code) - DETECTORS.findIndex((d) => d.code === b.code));

  const kept = [];
  let lastEnd = -1;
  for (const m of all) {
    if (m.index < lastEnd) continue;
    kept.push(m);
    lastEnd = m.index + m.length;
  }

  const blockedFragments = [];
  const toRedact = [];
  for (const m of kept) {
    const cleared = m.allowlistable && isAllowlistedContext(text, m.index, allowlist);
    const entry = { code: m.code, reason: m.reason, fragment_preview: preview(m.text) };
    if (cleared) { entry.allowlist_cleared = true; blockedFragments.push(entry); continue; }
    blockedFragments.push(entry);
    toRedact.push(m);
  }

  let outcome = 'CLEAN';
  if (toRedact.length > 0) outcome = onDetection === 'reject' ? 'REJECTED' : 'STRIPPED';

  let redactedText = null;
  if (outcome === 'STRIPPED') {
    let out = text;
    for (const m of [...toRedact].sort((a, b) => b.index - a.index)) {
      out = `${out.slice(0, m.index)}[REDACTED:${m.code}]${out.slice(m.index + m.length)}`;
    }
    redactedText = out;
  }

  return { outcome, blockedFragments, redactedText };
}

// ── Sidecar scan records + admit-source's fail-closed check ─────────────────

function sidecarPath(mdPath) { return `${mdPath}.privacy-scan.json`; }

async function readSidecar(mdPath) {
  const p = sidecarPath(mdPath);
  if (!(await exists(p))) return null;
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

async function writeSidecar(mdPath, record) {
  await writeFile(sidecarPath(mdPath), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

export class PrivacyGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrivacyGateError';
    this.privacyGate = true;
  }
}

// Fail-closed check called by admit-source (field zone). Throws PrivacyGateError
// unless `mdPath` carries a passing, content-matching privacy-scan record.
export async function checkPrivacyGate(mdPath) {
  const sidecar = await readSidecar(mdPath);
  if (!sidecar) {
    throw new PrivacyGateError(
      `no privacy-scan record for ${mdPath} — run \`transitrix-ingest privacy-scan ${mdPath}\` first ` +
      '(fail-closed pre-admission gate, SKILL.md Step 2b).'
    );
  }
  const currentHash = hashBytes(await readFile(mdPath));
  if (sidecar.source_sha256 !== currentHash) {
    throw new PrivacyGateError(
      `privacy-scan record for ${mdPath} is stale (content changed since the scan) — re-run privacy-scan.`
    );
  }
  if (sidecar.outcome === 'REJECTED') {
    throw new PrivacyGateError(`${mdPath} was REJECTED by the privacy gate — see privacy-report.yaml; do not admit.`);
  }
  if (sidecar.outcome === 'ERROR') {
    throw new PrivacyGateError(`privacy-scan did not complete for ${mdPath} (${sidecar.error_detail || 'unknown error'}) — fix and re-scan.`);
  }
  if (sidecar.outcome === 'STRIPPED' && sidecar.redacted_file) {
    throw new PrivacyGateError(
      `the privacy gate stripped blocked content from ${mdPath} — admit the redacted copy instead: ${sidecar.redacted_file}.`
    );
  }
  if (sidecar.outcome !== 'CLEAN' && sidecar.outcome !== 'STRIPPED') {
    throw new PrivacyGateError(`privacy-scan record for ${mdPath} carries an unrecognised outcome (${sidecar.outcome}) — re-run privacy-scan.`);
  }
  return sidecar;
}

// ── privacy-report.yaml — per-run aggregate, alongside review-queue.yaml ────

// The human-facing artefact is YAML (privacy-report.yaml, per SKILL.md). To merge
// entries across multiple privacy-scan invocations in one run without a general YAML
// parser, the CLI keeps a parallel JSON run-state file and regenerates the YAML from
// it on every call — the JSON file is an implementation detail, not part of the contract.
function runStatePath(processingDir) { return join(processingDir, '.privacy-report-state.json'); }

async function loadRunState(processingDir) {
  const p = runStatePath(processingDir);
  if (!(await exists(p))) return { run_id: null, scanned: [] };
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return { run_id: null, scanned: [] }; }
}

async function saveRunState(processingDir, state) {
  await writeFile(runStatePath(processingDir), JSON.stringify(state), 'utf8');
}

function summarize(scanned) {
  const summary = { total: scanned.length, clean: 0, stripped: 0, rejected: 0, error: 0 };
  for (const s of scanned) {
    if (s.outcome === 'CLEAN') summary.clean++;
    else if (s.outcome === 'STRIPPED') summary.stripped++;
    else if (s.outcome === 'REJECTED') summary.rejected++;
    else if (s.outcome === 'ERROR') summary.error++;
  }
  return summary;
}

async function updatePrivacyReport(processingDir, entry, config, runId) {
  const state = await loadRunState(processingDir);
  if (!state.run_id) state.run_id = runId;
  const i = state.scanned.findIndex((s) => s.source_file === entry.source_file);
  if (i >= 0) state.scanned[i] = entry; else state.scanned.push(entry);
  await saveRunState(processingDir, state);

  const report = {
    generated_by: 'transitrix-ingest',
    run_id: state.run_id,
    config_snapshot: { enabled: true, on_detection: config.onDetection, allowlist: config.allowlist },
    scanned: state.scanned,
    summary: summarize(state.scanned),
  };
  await writeFile(join(processingDir, 'privacy-report.yaml'), dump(report), 'utf8');
  return report;
}

// ── The `privacy-scan <file>` command's business logic ───────────────────────

export async function runPrivacyScan({ mdPath, processingDir, config, runId }) {
  let content;
  try {
    content = await readFile(mdPath, 'utf8');
  } catch (err) {
    const entry = { source_file: basename(mdPath), outcome: 'ERROR', error_detail: `could not read file: ${err.message}` };
    await writeSidecar(mdPath, { outcome: 'ERROR', scanned_at: new Date().toISOString(), error_detail: entry.error_detail });
    await updatePrivacyReport(processingDir, entry, config, runId);
    return { outcome: 'ERROR', errorDetail: entry.error_detail };
  }

  const { outcome, blockedFragments, redactedText } = scanText(content, config);
  const scannedAt = new Date().toISOString();
  const entry = { source_file: basename(mdPath), outcome };

  if (outcome === 'CLEAN') {
    await writeSidecar(mdPath, { outcome, scanned_at: scannedAt, source_sha256: hashBytes(Buffer.from(content, 'utf8')) });
  } else if (outcome === 'STRIPPED') {
    const redactedPath = join(dirname(mdPath), `${basename(mdPath, extname(mdPath))}.redacted${extname(mdPath) || '.md'}`);
    await writeFile(redactedPath, redactedText, 'utf8');
    const redactedBuf = Buffer.from(redactedText, 'utf8');
    await writeSidecar(mdPath, {
      outcome, scanned_at: scannedAt,
      source_sha256: hashBytes(Buffer.from(content, 'utf8')),
      redacted_file: redactedPath,
    });
    await writeSidecar(redactedPath, {
      outcome, scanned_at: scannedAt,
      source_sha256: hashBytes(redactedBuf),
      derived_from: mdPath,
    });
    entry.redacted_file = redactedPath;
    entry.blocked_fragments = blockedFragments;
  } else if (outcome === 'REJECTED') {
    await writeSidecar(mdPath, { outcome, scanned_at: scannedAt, source_sha256: hashBytes(Buffer.from(content, 'utf8')) });
    entry.blocked_fragments = blockedFragments;
  }

  await updatePrivacyReport(processingDir, entry, config, runId);
  return { outcome, blockedFragments, redactedFile: entry.redacted_file || null };
}
