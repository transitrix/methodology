// Domain-package declaration parsing, PKG-001/PKG-002 validation, and
// validator-entry-point discovery (notations/PACKAGES.md §1, §7, §4.2).
//
// Two declared classes, per PACKAGES.md §7:
//   - shipped      — a bare `packages:` list entry naming a package the pinned
//                     methodology_version ships (§7.1). Its validator entry
//                     point is looked up in SHIPPED_PACKAGES below — a plain
//                     name -> path table, the same posture as
//                     coverage-presets.mjs's name -> membership table. This
//                     file never encodes what a shipped package's validator
//                     checks, only where it lives.
//   - external     — a map entry (`name`, `version`, `compatible_with`,
//                     `validator`) declaring a package maintained outside a
//                     core release (§7.2). `validator` is a path, relative to
//                     the adopter repo root, to the package's own entry
//                     point script — declared by the adopter, not core.
//
// Discovery is package-agnostic (§4.2): this module resolves a path and, if
// it exists, runs it as a subprocess. It never parses a validator's checks or
// output beyond exit code + stdout — the same boundary coverage.mjs keeps
// around a coverage preset's membership, never its meaning.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { clean, parseInlineList } from './coverage.mjs';

const execFileAsync = promisify(execFile);

// Packages shipped with core (PACKAGES.md §7.1). A shipped package's own
// validator ships as a separate npm package, never bundled into
// @transitrix/ingest-cli (§4.2) — discovery only checks whether that npm
// package happens to be installed in the adopter repo's node_modules/.
export const SHIPPED_PACKAGES = {
  reqif: {
    npmPackage: '@transitrix/reqif-cli',
    bin: 'reqif.mjs',
    validatorArgs: (folder) => ['validate', folder],
  },
};

export const SHIPPED_PACKAGE_NAMES = new Set(Object.keys(SHIPPED_PACKAGES));

const EXTERNAL_REQUIRED_FIELDS = ['name', 'version', 'compatible_with', 'validator'];

// ── Declaration parsing ──────────────────────────────────────────

// Parse the `packages:` declaration out of manifest text into normalised
// entries. Each entry is one of:
//   { kind: 'shipped',   name, raw }
//   { kind: 'external',  name, version, compatible_with, validator, distribution, raw }
//   { kind: 'malformed', raw, reason }
// Zero-dependency, purpose-built reader for this one constrained shape (same
// posture as coverage.mjs's parseProfileDecl) — not a general YAML parser.
export function parsePackagesDecl(text) {
  if (typeof text !== 'string') return [];
  const norm = text.replace(/\r\n/g, '\n');

  // Inline form: `packages: [reqif]` / `packages: []`.
  const inlineM = norm.match(/^packages:[ \t]*(\[[^\]]*\])[ \t]*(#.*)?$/m);
  if (inlineM) {
    return parseInlineList(inlineM[1]).map((name) => ({ kind: 'shipped', name, raw: name }));
  }

  // Block form: `packages:\n  - reqif\n  - name: foo\n    version: "1.0.0"\n    ...`.
  const lines = norm.split('\n');
  const idx = lines.findIndex((l) => /^packages:[ \t]*$/.test(l));
  if (idx < 0) return [];

  const block = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trim() === '' || ln.trim().startsWith('#')) continue;
    if (/^\S/.test(ln)) break; // next top-level key ends the block
    block.push(ln);
  }

  const entries = [];
  let cur = null;
  const flush = () => { if (cur) { entries.push(finalizeEntry(cur)); cur = null; } };

  for (const ln of block) {
    const itemM = ln.match(/^[ \t]*-[ \t]*(.*)$/);
    if (itemM) {
      flush();
      const rest = itemM[1].trim();
      if (!rest) { cur = { fields: {}, raw: '' }; continue; }
      const kv = rest.match(/^([a-z_]+):[ \t]*(.*)$/);
      if (kv) {
        cur = { fields: {}, raw: rest };
        if (kv[2].trim()) cur.fields[kv[1]] = clean(kv[2]);
      } else {
        entries.push({ kind: 'shipped', name: clean(rest), raw: rest });
      }
      continue;
    }
    // Continuation line inside a map item: `    key: value`.
    const kv = ln.match(/^[ \t]+([a-z_]+):[ \t]*(.*)$/);
    if (kv && cur) {
      cur.fields[kv[1]] = clean(kv[2]);
      cur.raw += `, ${kv[1]}: ${kv[2].trim()}`;
    }
  }
  flush();
  return entries;
}

function finalizeEntry(item) {
  const f = item.fields;
  if (!f.name) return { kind: 'malformed', raw: item.raw, reason: 'map entry under `packages:` is missing required key `name`' };
  const missing = EXTERNAL_REQUIRED_FIELDS.filter((k) => !f[k]);
  if (missing.length > 0) {
    return { kind: 'malformed', raw: item.raw, name: f.name, reason: `externally-distributed package "${f.name}" is missing required field(s): ${missing.join(', ')}` };
  }
  return {
    kind: 'external',
    name: f.name,
    version: f.version,
    compatible_with: f.compatible_with,
    validator: f.validator,
    distribution: f.distribution || 'external',
    raw: item.raw,
  };
}

// ── PKG-001 / PKG-002 validation ─────────────────────────────────

// Minimal semver comparator — major.minor.patch only (no pre-release), which
// is all methodology_version and compatible_with ever carry.
function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function cmpSemver(a, b) {
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] - b[i]; }
  return 0;
}

// `compatible_with` is a space-separated list of comparator terms, e.g.
// ">=3.1.0 <4.0.0". Every term must hold for the version to satisfy the range.
function satisfiesRange(version, range) {
  const v = parseSemver(version);
  if (!v) return null; // version itself unparseable — caller reports separately
  const terms = String(range).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  for (const term of terms) {
    const m = term.match(/^(>=|<=|>|<|=)(\d+\.\d+\.\d+)/);
    if (!m) return null; // malformed term — caller reports separately
    const bound = parseSemver(m[2]);
    const c = cmpSemver(v, bound);
    const ok = { '>=': c >= 0, '<=': c <= 0, '>': c > 0, '<': c < 0, '=': c === 0 }[m[1]];
    if (!ok) return false;
  }
  return true;
}

// Validate parsed `packages:` entries. Returns [{ rule: 'PKG-001'|'PKG-002', name?, message }].
// `methodologyVersion` is the repo's own pinned core version (for PKG-002).
export function validatePackagesDecl(entries, { methodologyVersion } = {}) {
  const findings = [];
  for (const e of entries) {
    if (e.kind === 'malformed') {
      findings.push({ rule: 'PKG-001', name: e.name, message: e.reason });
      continue;
    }
    if (e.kind === 'shipped') {
      if (!SHIPPED_PACKAGE_NAMES.has(e.name)) {
        findings.push({
          rule: 'PKG-001',
          name: e.name,
          message: `"${e.name}" is not a package shipped by the pinned methodology_version (known: ${[...SHIPPED_PACKAGE_NAMES].join(', ') || '(none)'}) — a typo, or this is meant to be declared as an externally-distributed package (PACKAGES.md §7.2).`,
        });
      }
      continue;
    }
    // external
    if (!parseSemver(e.version)) {
      findings.push({ rule: 'PKG-001', name: e.name, message: `externally-distributed package "${e.name}" has a malformed \`version\` ("${e.version}") — expected major.minor.patch.` });
    }
    const sat = methodologyVersion ? satisfiesRange(methodologyVersion, e.compatible_with) : null;
    if (sat === null && e.compatible_with) {
      findings.push({ rule: 'PKG-002', name: e.name, message: `externally-distributed package "${e.name}" has a malformed \`compatible_with\` range ("${e.compatible_with}") — expected comparator terms like ">=3.1.0 <4.0.0".` });
    } else if (sat === false) {
      findings.push({ rule: 'PKG-002', name: e.name, message: `externally-distributed package "${e.name}" declares compatible_with "${e.compatible_with}", which does not admit this repo's methodology_version "${methodologyVersion}".` });
    }
  }
  return findings;
}

// ── Validator entry-point discovery ──────────────────────────────

// Resolve each declared package's validator entry point, if present on disk.
// Package-agnostic: never branches on package name beyond a name -> path
// lookup, never inspects a validator's content.
export function resolveValidatorEntryPoints(orgRoot, entries) {
  return entries.map((e) => {
    if (e.kind === 'malformed') return { name: e.name || '(malformed)', present: false };
    if (e.kind === 'shipped') {
      const reg = SHIPPED_PACKAGES[e.name];
      if (!reg) return { name: e.name, present: false };
      const npmParts = reg.npmPackage.split('/'); // e.g. ['@transitrix', 'reqif-cli']
      const entryPoint = join(orgRoot, 'node_modules', ...npmParts, reg.bin);
      return { name: e.name, present: existsSync(entryPoint), entryPoint, args: reg.validatorArgs(join(orgRoot, e.name)) };
    }
    const entryPoint = join(orgRoot, e.validator);
    return { name: e.name, present: existsSync(entryPoint), entryPoint, args: [join(orgRoot, e.name)] };
  });
}

// Run every present validator entry point as a subprocess
// (`node <entryPoint> <args...>`). Core never parses the validator's checks —
// only its exit code and stdout. An absent entry point is silently skipped
// (§5 absence is silence extends to "declared but not installed/present").
export async function runPackageValidators(orgRoot, entries) {
  const resolved = resolveValidatorEntryPoints(orgRoot, entries);
  const results = [];
  for (const r of resolved) {
    if (!r.present) { results.push({ name: r.name, ran: false }); continue; }
    try {
      const { stdout } = await execFileAsync(process.execPath, [r.entryPoint, ...r.args]);
      results.push({ name: r.name, ran: true, ok: true, output: stdout.trim() });
    } catch (err) {
      results.push({ name: r.name, ran: true, ok: false, output: String(err.stdout || err.message || '').trim() });
    }
  }
  return results;
}
