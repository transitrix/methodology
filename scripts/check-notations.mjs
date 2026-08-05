#!/usr/bin/env node
// Notations doc-lint — mechanical front-door rot checks.
//
// Companion to the tracked audit NOTATIONS_AUDIT.md: the audit holds the
// judgement calls a linter can't make (conceptual drift, open shape decisions);
// this script holds the mechanical invariants that silently rot. Keep them
// disjoint — if a check here starts needing human judgement, it belongs in the
// audit, not here.
//
// Checks:
//   E1  extension + location — every notations/examples/**/*.yaml is named
//       <name>.<short>.transitrix.yaml where <short> is a notation in the
//       catalogue (notations/README.md §Views), and its parent dir is <short>.
//       Catches `.bpmn.yaml`-style drift and misfiled examples.
//   E2  header — each example carries a top-level `notation: <short>` whose
//       value matches its file extension.
//   L1  links — every relative Markdown link in notations/**/*.md resolves to
//       an existing file (anchors and external URLs are skipped).
//   V1  version — every concrete `methodology_version:` pin in the repo equals
//       the single source of truth (notations/CURRENT_VERSION.yaml,
//       per CONTRACT.md §10), except explicitly allowlisted placeholders.
//
// Exit codes:
//   0 — clean
//   1 — findings
//   2 — script-internal error (file missing, parse failure)

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, resolve, posix } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');
const CATALOGUE_PATH = join(REPO_ROOT, 'notations', 'README.md');
const EXAMPLES_DIR = join(REPO_ROOT, 'notations', 'examples');
const NOTATIONS_DIR = join(REPO_ROOT, 'notations');
const VERSION_SOT = join(REPO_ROOT, 'notations', 'CURRENT_VERSION.yaml');

// Files that legitimately carry a non-SoT methodology_version (placeholders).
const VERSION_PIN_ALLOWLIST = new Set([
  'transitrix/skills/onboard/templates/transitrix.yaml', // "pin a real release once the adopter chooses one"
  'migrations/0.6-to-0.7/README.md',                    // documents the target version, not the current pin
  'migrations/0.7-to-1.0/README.md',                    // documents the source version, not the current pin
  'migrations/0.7-to-1.0/fixtures/before/canon/views/compliance-impact/retail.compliance-impact.transitrix.yaml',  // pre-migration fixture
  'migrations/0.7-to-1.0/fixtures/after/canon/views/compliance-impact/retail.compliance-impact.transitrix.yaml',   // post-migration fixture
  'migrations/1.0-to-2.0/README.md',                    // documents the target version, not the current pin
  'migrations/3.1-to-4.0/README.md',                    // documents the target version, not the current pin
  'migrations/1.0-to-2.0/fixtures/after/canon/views/goals/strategy-2026.goals.transitrix.yaml',   // post-migration fixture
  'migrations/1.0-to-2.0/fixtures/after/canon/views/action/platform-launch.action.transitrix.yaml', // post-migration fixture
  'migrations/2.1-to-3.0/fixtures/before/canon/views/design-controls-trace-matrix/example.design-controls-trace-matrix.transitrix.yaml', // pre-migration fixture
  'migrations/2.1-to-3.0/fixtures/after/_archived/design-controls-3.0-migration/canon/views/design-controls-trace-matrix/example.design-controls-trace-matrix.transitrix.yaml', // post-migration fixture (archived content, pre-bump)
]);

// Directories never walked.
const SKIP_DIRS = new Set(['.git', 'node_modules', '0. archive']);

// --- fs helpers ------------------------------------------------------------

async function walk(dir, filterExt) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, filterExt)));
    } else if (!filterExt || e.name.endsWith(filterExt)) {
      out.push(full);
    }
  }
  return out;
}

function relPosix(absPath) {
  return relative(REPO_ROOT, absPath).split('\\').join('/');
}

// --- catalogue parse -------------------------------------------------------

// Pull the view-notation catalogue from notations/README.md §Views.
// Returns Map<short, extension>.
async function parseCatalogue() {
  const text = await readFile(CATALOGUE_PATH, 'utf8');
  const lines = text.split('\n');
  const headingIdx = lines.findIndex(l => /^##\s+Views\s*$/.test(l));
  if (headingIdx < 0) throw new Error('notations/README.md: "## Views" section not found');

  const out = new Map();
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break; // next section
    const line = lines[i];
    if (!line.startsWith('| [')) continue; // catalogue data row
    const codes = [...line.matchAll(/`([^`]+)`/g)].map(m => m[1]);
    const short = codes.find(c => /^[a-z][a-z0-9-]*$/.test(c));
    const ext = codes.find(c => /^\*\.[a-z0-9-]+\.transitrix\.yaml$/.test(c));
    if (short && ext) out.set(short, ext.slice(1)); // strip leading '*'
  }
  if (out.size === 0) throw new Error('notations/README.md: catalogue table parsed empty');
  return out;
}

// --- checks ----------------------------------------------------------------

// Build inverted index: extensionShort → Set<notationShort> for notations that
// share an extension (e.g. dgca family: dgca, goals, activities all → 'dgca').
function buildExtensionFamilies(catalogue) {
  const families = new Map(); // extShort → Set<notationShort>
  for (const [notation, ext] of catalogue) {
    // ext is like '.dgca.transitrix.yaml'; strip leading dot and trailing suffix
    const extShort = ext.replace(/^\./, '').replace(/\.transitrix\.yaml$/, '');
    if (!families.has(extShort)) families.set(extShort, new Set());
    families.get(extShort).add(notation);
  }
  return families;
}

// E1 + E2: example files.
async function checkExamples(catalogue, failures) {
  const families = buildExtensionFamilies(catalogue);
  const files = (await walk(EXAMPLES_DIR, '.yaml'));
  for (const abs of files) {
    const rel = relPosix(abs);
    const base = posix.basename(rel);
    const parentDir = posix.basename(posix.dirname(rel));

    // Skip companion element files nested inside a notation subdirectory
    // (e.g. notations/examples/dgca/elements/DRIVER-1.yaml). E1/E2 apply only
    // to view files one level inside a notation dir (<notation>/<file>).
    const relWithinExamples = rel.slice('notations/examples/'.length);
    if (relWithinExamples.split('/').length !== 2) continue;

    // E1 — name must be <name>.<short>.transitrix.yaml with a known short.
    const m = base.match(/^[^.]+\.([a-z0-9-]+)\.transitrix\.yaml$/);
    if (!m) {
      failures.push({
        check: 'E1',
        message: `${rel}: not named <name>.<short>.transitrix.yaml (non-canonical extension).`,
      });
      continue;
    }
    const extShort = m[1];
    if (!catalogue.has(extShort)) {
      failures.push({
        check: 'E1',
        message: `${rel}: extension short "${extShort}" is not a notation in notations/README.md §Views.`,
      });
      continue;
    }
    // Valid parent dirs: any notation short that maps to this same extension
    // (covers the DGCA family: dgca/, goals/, activities/ are all valid for .dgca.).
    const validDirs = families.get(extShort) ?? new Set([extShort]);
    if (!validDirs.has(parentDir)) {
      failures.push({
        check: 'E1',
        message: `${rel}: filed under "${parentDir}/" but extension is "${extShort}" — move it to examples/${extShort}/ or a family sub-dir (${[...validDirs].join(', ')}).`,
      });
    }

    // E2 — top-level `notation:` must be a member of the extension's family.
    const text = await readFile(abs, 'utf8');
    const nm = text.match(/^notation:\s*"?([a-z0-9-]+)"?\s*$/m);
    if (!nm) {
      failures.push({
        check: 'E2',
        message: `${rel}: missing a top-level \`notation:\` header (expected one of: ${[...validDirs].join(', ')}).`,
      });
    } else if (!validDirs.has(nm[1])) {
      failures.push({
        check: 'E2',
        message: `${rel}: \`notation: ${nm[1]}\` is not valid for extension ".${extShort}.transitrix.yaml" (accepted: ${[...validDirs].join(', ')}).`,
      });
    }
  }
}

// L1: relative markdown links in notations/**/*.md must resolve.
async function checkLinks(failures) {
  const files = await walk(NOTATIONS_DIR, '.md');
  // Inline links only: no newline in the link text or the target, so we never
  // splice an unrelated `[` and `](…)` across prose into a phantom link.
  const linkRe = /\[[^\]\n]*\]\(([^)\n]+)\)/g;
  for (const abs of files) {
    const rel = relPosix(abs);
    const text = await readFile(abs, 'utf8');
    let m;
    while ((m = linkRe.exec(text)) !== null) {
      let target = m[1].trim();
      // Skip external, anchor-only, mailto, and template placeholders.
      if (/^(https?:|mailto:|#|<)/.test(target)) continue;
      target = target.split('#')[0]; // drop anchor
      if (!target) continue; // was anchor-only
      if (target.includes('<') || target.includes('>')) continue; // placeholder like <id>.yaml
      // Only validate things that look like a local file/dir reference — a path
      // segment (`/`) or a file extension. Bare words in parenthetical prose
      // (`(factor)`, `(set_name)`) are not links.
      if (!target.includes('/') && !/\.[a-z0-9]+$/i.test(target)) continue;
      const resolved = resolve(dirname(abs), target);
      if (!existsSync(resolved)) {
        failures.push({
          check: 'L1',
          message: `${rel}: broken relative link → \`${m[1]}\` (resolves to ${relPosix(resolved)}, not found).`,
        });
      }
    }
  }
}

// V1: concrete methodology_version pins must equal the SoT.
async function checkVersion(failures) {
  const sotText = await readFile(VERSION_SOT, 'utf8');
  const sotMatch = sotText.match(/^methodology_version:\s*"?([^"\s#]+)"?/m);
  if (!sotMatch) throw new Error(`${relPosix(VERSION_SOT)}: methodology_version (source of truth) not found`);
  const sot = sotMatch[1];

  const files = (await walk(REPO_ROOT, '.yaml')).concat(await walk(REPO_ROOT, '.md'));
  // A concrete pin is a value assignment, not prose; match `methodology_version: "X"`.
  const pinRe = /^[ \t]*methodology_version:\s*"([^"]+)"/m;
  for (const abs of files) {
    const rel = relPosix(abs);
    if (VERSION_PIN_ALLOWLIST.has(rel)) continue;
    const text = await readFile(abs, 'utf8');
    const pm = text.match(pinRe);
    if (!pm) continue;
    if (pm[1] !== sot) {
      failures.push({
        check: 'V1',
        message: `${rel}: methodology_version "${pm[1]}" ≠ source of truth "${sot}" (${relPosix(VERSION_SOT)}). ` +
          `Bump it, or allowlist the file in scripts/check-notations.mjs if it is an intentional placeholder.`,
      });
    }
  }
}

// --- C1: notation count lint -----------------------------------------------
//
// Derives A (diagram views), C (report-config views), and E (element notations)
// from the filesystem, then verifies that every stated count in
// notations/README.md and transitrix/.claude-plugin/plugin.json matches.
//
// Classification is structural, not textual: a view spec's class is which
// folder it lives in — notations/views/diagrams/, /reports/, or /documents/.
// Moving a spec between those folders changes its class and, if the stated
// counts aren't updated to match, fails this check. A file without a
// top-level `notation:` header (e.g. a folder README) is not a spec and is
// not counted. `deprecated` specs are excluded from every class count.

const VIEWS_DIR    = join(REPO_ROOT, 'notations', 'views');
const ELEMENTS_DIR = join(REPO_ROOT, 'notations', 'elements');
const PLUGIN_JSON  = join(REPO_ROOT, 'transitrix', '.claude-plugin', 'plugin.json');

// Pure — no I/O. filesByClass: { diagrams: [{deprecated}], reports: [...], documents: [...] }.
export function deriveClassCounts(filesByClass) {
  const counts = {};
  for (const [cls, files] of Object.entries(filesByClass)) {
    counts[cls] = files.filter(f => !f.deprecated).length;
  }
  return counts;
}

// Pure — no I/O. Extracts the stated "Diagram views (A = N)" / "Report views
// (C = N)" / "Document views (D = N)" counts from the README prose. Returns
// null for a count whose pattern isn't found.
export function parseStatedViewCounts(readmeText) {
  const dm = readmeText.match(/Diagram views\s*\(A\s*=\s*(\d+)\)/);
  const rm = readmeText.match(/Report views\s*\(C\s*=\s*(\d+)\)/);
  const cm = readmeText.match(/Document views\s*\(D\s*=\s*(\d+)\)/);
  return {
    diagrams: dm ? parseInt(dm[1], 10) : null,
    reports: rm ? parseInt(rm[1], 10) : null,
    documents: cm ? parseInt(cm[1], 10) : null,
  };
}

// Lists the view specs in one class folder — files with a top-level
// `notation:` header only (excludes a folder README or other non-spec file).
async function readClassDir(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const text = await readFile(join(dir, e.name), 'utf8');
    if (!/^notation:\s*/m.test(text)) continue;
    const statusM = text.match(/^status:\s*"?(\w+)"?/m);
    const removedInM = text.match(/^removed_in:\s*"?([^"\s]*)"?/m);
    out.push({
      name: e.name,
      deprecated: statusM ? statusM[1] === 'deprecated' : false,
      removedIn: removedInM ? removedInM[1] : null,
    });
  }
  return out;
}

// Pure — no I/O. specs: [{ name, deprecated, removedIn }] as read from a spec
// directory's front matter. CONTRACT.md §10.6: a spec marked
// status: "deprecated" must also carry removed_in: — a deprecation with no
// stated end is not a deprecation.
export function deriveDeprecationFailures(specs, dirLabel) {
  const failures = [];
  for (const s of specs) {
    if (s.deprecated && !s.removedIn) {
      failures.push({
        check: 'DEP1',
        message: `${dirLabel}/${s.name}: status: "deprecated" with no removed_in: — a deprecation names its removal release (CONTRACT.md §10.6).`,
      });
    }
  }
  return failures;
}

async function checkNotationCounts(failures) {
  const filesByClass = {
    diagrams: await readClassDir(join(VIEWS_DIR, 'diagrams')),
    reports: await readClassDir(join(VIEWS_DIR, 'reports')),
    documents: await readClassDir(join(VIEWS_DIR, 'documents')),
  };
  const counts = deriveClassCounts(filesByClass);

  for (const [cls, files] of Object.entries(filesByClass)) {
    failures.push(...deriveDeprecationFailures(files, `notations/views/${cls}`));
  }

  const elemCount = (await readdir(ELEMENTS_DIR, { withFileTypes: true }))
    .filter(e => e.isFile() && e.name.endsWith('.md')).length;

  // Verify stated counts. `null` means the pattern wasn't found in the file.
  function check(stated, actual, file, pattern) {
    if (stated === null) {
      failures.push({ check: 'C1', message: `${file}: ${pattern} not found — add it so the lint can guard this count.` });
    } else if (stated !== actual) {
      failures.push({ check: 'C1', message: `${file}: ${pattern} states ${stated} but filesystem has ${actual}.` });
    }
  }

  const readmeText = await readFile(CATALOGUE_PATH, 'utf8');
  const stated = parseStatedViewCounts(readmeText);
  check(stated.diagrams, counts.diagrams, 'notations/README.md', '"Diagram views (A = N)"');
  check(stated.reports, counts.reports, 'notations/README.md', '"Report views (C = N)"');
  check(stated.documents, counts.documents, 'notations/README.md', '"Document views (D = N)"');
  const em = readmeText.match(/The\s+\*\*(\d+)\*\*\s+element\s+notations/);
  check(em ? parseInt(em[1], 10) : null, elemCount, 'notations/README.md', '"The **N** element notations"');

  // plugin.json — only verify counts that are actually stated there.
  let pluginText;
  try { pluginText = await readFile(PLUGIN_JSON, 'utf8'); } catch { return; }
  const desc = JSON.parse(pluginText).description || '';
  const pdm = desc.match(/(\d+)\s+diagram\s+view/);
  if (pdm && parseInt(pdm[1], 10) !== counts.diagrams) {
    failures.push({ check: 'C1', message: `transitrix/.claude-plugin/plugin.json: description states ${pdm[1]} diagram views but filesystem has ${counts.diagrams}.` });
  }
  const prm = desc.match(/(\d+)\s+report\s+view/);
  if (prm && parseInt(prm[1], 10) !== counts.reports) {
    failures.push({ check: 'C1', message: `transitrix/.claude-plugin/plugin.json: description states ${prm[1]} report views but filesystem has ${counts.reports}.` });
  }
}

// --- DOC1: no standard identifiers in a document-view spec -----------------
//
// Every document-view layout (MRD, SRS today; SDD planned) is required to
// never document, default to, or emit a "standard identifier" — a named
// specification number or numbering convention (e.g. a value that looks like
// `iso-29148` or `ieee-830`) — as a supported or default field value. This
// check scans notations/views/documents/*.md for a documented *value* that
// looks like one, inside a fields-table row. A narrative mention of a
// standard's full name in prose (not a table row, not a code-span value) is
// not what this guards against and is deliberately not flagged.

const STANDARD_ID_VALUE_RE = /^(iso|ieee)[-_][a-z0-9._-]*$/i;

// Pure — no I/O. Returns the list of offending code-span values (e.g.
// ["iso-29148"]) found inside Markdown table rows in `text`. A code-span
// appearing outside a table row (prose) is not inspected.
export function findStandardIdentifierEmissions(text) {
  const found = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue; // only table-row lines
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const value = m[1].trim();
      if (STANDARD_ID_VALUE_RE.test(value)) found.push(value);
    }
  }
  return found;
}

async function checkNoStandardIdentifiers(failures) {
  const dir = join(VIEWS_DIR, 'documents');
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const abs = join(dir, e.name);
    const text = await readFile(abs, 'utf8');
    for (const value of findStandardIdentifierEmissions(text)) {
      failures.push({
        check: 'DOC1',
        message: `${relPosix(abs)}: documents \`${value}\` as a field-table value — no document-view layout may document, default to, or emit a standard identifier.`,
      });
    }
  }
}

// --- main ------------------------------------------------------------------

async function main() {
  const failures = [];
  let catalogue;
  try {
    catalogue = await parseCatalogue();
    await checkExamples(catalogue, failures);
    await checkLinks(failures);
    await checkVersion(failures);
    await checkNotationCounts(failures);
    await checkNoStandardIdentifiers(failures);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }

  if (failures.length > 0) {
    console.error(`\nNotations doc-lint — ${failures.length} finding(s):\n`);
    for (const f of failures.sort((a, b) => a.check.localeCompare(b.check))) {
      console.error(`  - [${f.check}] ${f.message}`);
    }
    console.error(
      `\nThese are mechanical invariants. Fix the offending file, or — if the ` +
      `invariant itself is wrong — change the check and say why in the PR.\n`
    );
    process.exit(1);
  }

  console.log(
    `Notations doc-lint clean — ${catalogue.size} view notations; examples, ` +
    `internal links, methodology_version pins, and notation counts all consistent.`
  );
  process.exit(0);
}

// Guard so `import { deriveClassCounts } from './check-notations.mjs'` (the
// unit tests in check-notations.test.mjs) doesn't also run the CLI.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => {
    console.error(`error: ${e.message}`);
    process.exit(2);
  });
}
