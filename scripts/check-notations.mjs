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
//   T1  document sources — every `.ttrs` file is named <basename>.<kind>.ttrs,
//       and no file ends `.trs` (the near-miss: one keystroke away, a different
//       widely used format). Reported in words, not as an unknown-file error.
//   V1  version — every concrete `methodology_version:` pin in the repo equals
//       the single source of truth (notations/CURRENT_VERSION.yaml,
//       per CONTRACT.md §10), except explicitly allowlisted placeholders.
//   VOC1 vocabulary — every live element TYPE in notations/vocabulary.yaml's
//       `element_types` has exactly one matching row in ELEMENT_PRIMITIVES.md
//       §4 (same mode/layer/folder), and vice versa. A deprecated alias
//       carries no row of its own in §4 (matching FACTOR/ACTIVITY precedent)
//       and is excluded from the comparison. Fails closed: a missing or
//       unparseable artefact is a failure, not a skip.
//   VOC2 vocabulary — every live relation kind in notations/vocabulary.yaml's
//       `relation_types` has exactly one matching row in elements/17-relations.md
//       §3 (same endpoint TYPE sets, same ACTOR subtype narrowing where either
//       side names one), and vice versa. A deprecated alias carries no row of
//       its own (matching activity_goal precedent) and is excluded from the
//       comparison. Fails closed: a missing or unparseable artefact is a
//       failure, not a skip.
//   VOC3 vocabulary — every value_vocabularies entry in notations/vocabulary.yaml
//       with a non-null `spec` has every one of its values appear somewhere in
//       that spec as (part of) a code span; an entry that also names a `rule`
//       has that rule's row in the same spec cross-checked so the row's own
//       enumerated values match `values` exactly. An entry with `spec: null`
//       (a pipeline-internal set with no owning spec) is not checked. Fails
//       closed: a missing or unparseable artefact, or a named rule with no
//       matching row, is a failure, not a skip.
//   VOC4 vocabulary — every rule_codes entry in notations/vocabulary.yaml has
//       exactly one matching row (same severity) in its own named `spec`, and
//       every rule-code-shaped row found anywhere under notations/**/*.md
//       (`| \`CODE\` | severity | ... |`) names a code present in rule_codes —
//       except a code named in `deferred.rule_codes`, which narrows the check
//       to exactly that code, and whose own `review_by` is itself checked for
//       expiry. A code owned by one spec but restated in another (CONTRACT.md
//       restates many) is not required to be the only row, but a restated
//       severity must still agree. Fails closed: a missing or unparseable
//       artefact is a failure, not a skip.
//   ID1  example-ID grammar — every ID-shaped token (a candidate whose TYPE
//       prefix is registered in IDS_AND_REFERENCES.md §3) found in a fenced
//       code block or a backtick span under method/**/*.md and
//       notations/**/*.md satisfies §1's grammar (CAPABILITY's V/H address
//       excepted, §2). A token that is itself a known rule code
//       (vocabulary.yaml rule_codes / deferred.rule_codes — several rule-code
//       prefixes collide with a registered TYPE, e.g. ACTION-005, TERM-002)
//       is not an element ID and is excluded. IDS_AND_REFERENCES.md and
//       CONVENTIONS.md are excluded from the scan — both carry a deliberate
//       ✓/✗ comparison table documenting invalid forms as negative examples.
//   LAYER1 layer enumeration (extends VOC1's reach) — a contiguous group of
//       three or more distinct `NN_<word>/` layer-folder tokens under
//       method/**/*.md or notations/**/*.md (a directory tree, a table) is
//       read as an attempt to enumerate the full layer set and must equal it
//       exactly — no fewer, no extra. A single incidental folder citation
//       (one element spec naming its own home folder) is not a "list" and is
//       not checked.
//   DUALHOME1 no dual-home tables (extends VOC1/VOC2's reach) — a Markdown
//       table in method/**/*.md sharing two or more identical data rows with
//       a table in notations/**/*.md is restating that table rather than
//       pointing to it, which is exactly how the two drift apart unnoticed.
//   SIZE1 per-file soft ceiling (warn-only) — a method/*.md file over 250
//       lines or with more than nine `##` sections warns. Never fails the
//       build — see main()'s separate warnings collection.
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
const METHOD_DIR = join(REPO_ROOT, 'method');
const PACKAGES_SPEC_DIR = join(REPO_ROOT, 'notations', 'packages');
const VERSION_SOT = join(REPO_ROOT, 'notations', 'CURRENT_VERSION.yaml');
const VOCABULARY_PATH = join(REPO_ROOT, 'notations', 'vocabulary.yaml');
const ELEMENT_PRIMITIVES_PATH = join(REPO_ROOT, 'notations', 'ELEMENT_PRIMITIVES.md');
const RELATIONS_SPEC_PATH = join(REPO_ROOT, 'notations', 'elements', '17-relations.md');
const IDS_AND_REFERENCES_PATH = join(REPO_ROOT, 'notations', 'IDS_AND_REFERENCES.md');
const CONVENTIONS_PATH = join(REPO_ROOT, 'notations', 'CONVENTIONS.md');
// Both files carry a deliberate ✓/✗ (or "invalid" — labelled) comparison
// table teaching the grammar by counter-example; ID1 would otherwise flag
// the ✗ side as a live violation.
const ID1_EXCLUDED_FILES = new Set([IDS_AND_REFERENCES_PATH, CONVENTIONS_PATH]);

// Files that legitimately carry a non-SoT methodology_version (placeholders).
const VERSION_PIN_ALLOWLIST = new Set([
  'transitrix/skills/onboard/templates/transitrix.yaml', // "pin a real release once the adopter chooses one"
  'migrations/0.6-to-0.7/README.md',                    // documents the target version, not the current pin
  'migrations/0.7-to-1.0/README.md',                    // documents the source version, not the current pin
  'migrations/0.7-to-1.0/fixtures/before/canon/views/compliance-impact/retail.compliance-impact.transitrix.yaml',  // pre-migration fixture
  'migrations/0.7-to-1.0/fixtures/after/canon/views/compliance-impact/retail.compliance-impact.transitrix.yaml',   // post-migration fixture
  'migrations/1.0-to-2.0/README.md',                    // documents the target version, not the current pin
  'migrations/3.1-to-4.0/README.md',                    // documents the target version, not the current pin
  'migrations/3.1-to-4.0/fixtures/before/strategy.fga.transitrix.yaml',   // pre-migration fixture
  'migrations/3.1-to-4.0/fixtures/after/strategy.dgca.transitrix.yaml',   // post-migration fixture
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

// L1: relative markdown links in notations/**/*.md and method/**/*.md must resolve.
async function checkLinks(failures) {
  const files = (await walk(NOTATIONS_DIR, '.md')).concat(await walk(METHOD_DIR, '.md'));
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

// --- PKGDOC1: every package spec states its core-envelope answer -----------
//
// PACKAGES.md §6 requires each shipped package's own spec to state, plainly,
// whether its objects carry the core envelope — "required, not implied";
// silence is not a valid value. This is a doc-lint invariant, not a runtime
// one: an adopter repo never carries a package's spec, only its data, so
// there is nothing for @transitrix/ingest-cli to check here — this is
// checked once, at the source, over notations/packages/*.md.

// Pure — no I/O. Returns null when `text` states a plain Yes/No core-envelope
// answer (citing CONTRACT.md when the answer is "No"), or a reason string
// when it doesn't.
export function checkPackageEnvelopeStatement(text) {
  const headingRe = /^##\s+\d+\.\s+Core envelope statement\s*$/m;
  const m = text.match(headingRe);
  if (!m) return 'missing a "## N. Core envelope statement" section (PACKAGES.md §6\'s required envelope row).';
  const rest = text.slice(text.indexOf(m[0]) + m[0].length);
  const nextHeadingIdx = rest.search(/^##\s/m);
  const section = nextHeadingIdx >= 0 ? rest.slice(0, nextHeadingIdx) : rest;
  const answerM = section.match(/\*\*(Yes|No)\.\*\*/);
  if (!answerM) return 'Core envelope statement section does not open with a plain **Yes.**/**No.** answer.';
  if (answerM[1] === 'No' && !/CONTRACT\.md/.test(section)) {
    return 'Core envelope statement answers "No" but does not cite CONTRACT.md for why not.';
  }
  return null;
}

async function checkPackageEnvelopeStatements(failures) {
  let entries;
  try { entries = await readdir(PACKAGES_SPEC_DIR, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const abs = join(PACKAGES_SPEC_DIR, e.name);
    const text = await readFile(abs, 'utf8');
    const reason = checkPackageEnvelopeStatement(text);
    if (reason) failures.push({ check: 'PKGDOC1', message: `${relPosix(abs)}: ${reason}` });
  }
}

// --- VOC1: vocabulary.yaml element_types vs ELEMENT_PRIMITIVES.md §4 -------
//
// notations/vocabulary.yaml is the source of truth (packages/ingest-cli/src/
// placement.mjs derives its PLACEMENT table from it); ELEMENT_PRIMITIVES.md §4
// is the prose description of the same registry. This check keeps the two
// from drifting apart unnoticed — it does not regenerate either side.
//
// Deliberately narrow parsers (not a general YAML/Markdown reader), matching
// exactly the shapes these two files use — the same trade-off documented in
// packages/ingest-cli/src/vocabulary.mjs.

const LAYER_WORD_TO_FOLDER = {
  motivation: '01_motivation',
  business: '02_business',
  application: '03_application',
  technology: '04_technology',
  implementation: '05_implementation',
};

// Pure — no I/O. Parses the `element_types:` block of vocabulary.yaml into
// Map<TYPE, {mode, layer, folder}>, live entries only (deprecated aliases live
// in a separate `deprecated_element_types:` block and are not returned here).
// Throws on a block that isn't found or doesn't parse — a corrupted or
// missing artefact must fail this check, never pass silently.
export function parseVocabularyElementTypes(text) {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^element_types:\s*$/.test(l));
  if (startIdx < 0) throw new Error('vocabulary.yaml: "element_types:" block not found');

  const out = new Map();
  let current = null;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedent to column 0 — block ended
    const typeM = line.match(/^  ([A-Z][A-Z0-9_]*):\s*$/);
    if (typeM) {
      current = { mode: null, layer: null, folder: null };
      out.set(typeM[1], current);
      continue;
    }
    if (/^  #/.test(line) || /^\s*$/.test(line)) continue; // comment / blank
    const fieldM = line.match(/^    (mode|layer|folder|promotable):\s*(.+?)\s*$/);
    if (fieldM && current) {
      const [, key, rawVal] = fieldM;
      if (key === 'mode' || key === 'layer' || key === 'folder') current[key] = rawVal;
      continue;
    }
    // Any other shape inside the block (a nested comment mid-entry aside) is
    // tolerated only if blank/comment; anything else is a parse failure.
    if (!/^\s*#/.test(line)) {
      throw new Error(`vocabulary.yaml: unrecognised line in element_types block: "${line}"`);
    }
  }
  if (out.size === 0) throw new Error('vocabulary.yaml: element_types block parsed empty');
  return out;
}

// Pure — no I/O. Parses ELEMENT_PRIMITIVES.md §4's mode table into
// Map<TYPE, {mode, layer, folder}> — `layer` normalised to its NN_layer form
// so it compares directly against vocabulary.yaml's `layer` field.
export function parseElementPrimitivesTable(text) {
  const headingIdx = text.indexOf('\n## 4. Materialisation decision per TYPE');
  if (headingIdx < 0) throw new Error('ELEMENT_PRIMITIVES.md: "## 4. Materialisation decision per TYPE" not found');
  const nextHeadingIdx = text.indexOf('\n## 5.', headingIdx);
  const section = nextHeadingIdx > 0 ? text.slice(headingIdx, nextHeadingIdx) : text.slice(headingIdx);

  const out = new Map();
  for (const line of section.split('\n')) {
    if (!line.startsWith('| `')) continue; // only TYPE data rows (header/separator rows don't start with a backtick)
    const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length < 5) continue;
    const typeM = cells[0].match(/^`([A-Z][A-Z0-9_]*)`$/);
    if (!typeM) continue;
    const modeM = cells[1].match(/^(standalone|view-defined|contained)/);
    if (!modeM) throw new Error(`ELEMENT_PRIMITIVES.md §4: row for ${typeM[1]} has no recognisable mode in "${cells[1]}"`);
    const layerWord = cells[3].trim();
    const layer = LAYER_WORD_TO_FOLDER[layerWord] || layerWord;
    const folderM = cells[4].match(/`([^`]+)`/);
    const folder = folderM ? folderM[1] : cells[4];
    out.set(typeM[1], { mode: modeM[1], layer, folder });
  }
  if (out.size === 0) throw new Error('ELEMENT_PRIMITIVES.md §4: table parsed empty');
  return out;
}

async function checkVocabularyElementTypes(failures) {
  let vocText, primitivesText;
  try {
    vocText = await readFile(VOCABULARY_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC1', message: `${relPosix(VOCABULARY_PATH)}: not found — the vocabulary artefact must ship, never fall back silently.` });
    return;
  }
  try {
    primitivesText = await readFile(ELEMENT_PRIMITIVES_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC1', message: `${relPosix(ELEMENT_PRIMITIVES_PATH)}: not found.` });
    return;
  }

  let voc, table;
  try {
    voc = parseVocabularyElementTypes(vocText);
  } catch (e) {
    failures.push({ check: 'VOC1', message: `${relPosix(VOCABULARY_PATH)}: ${e.message}` });
    return;
  }
  try {
    table = parseElementPrimitivesTable(primitivesText);
  } catch (e) {
    failures.push({ check: 'VOC1', message: `${relPosix(ELEMENT_PRIMITIVES_PATH)}: ${e.message}` });
    return;
  }

  const allTypes = new Set([...voc.keys(), ...table.keys()]);
  for (const type of allTypes) {
    const v = voc.get(type);
    const t = table.get(type);
    if (!v) {
      failures.push({ check: 'VOC1', message: `${type} has a row in ELEMENT_PRIMITIVES.md §4 but no entry in notations/vocabulary.yaml element_types.` });
      continue;
    }
    if (!t) {
      failures.push({ check: 'VOC1', message: `${type} is in notations/vocabulary.yaml element_types but has no row in ELEMENT_PRIMITIVES.md §4.` });
      continue;
    }
    for (const field of ['mode', 'layer', 'folder']) {
      if (v[field] !== t[field]) {
        failures.push({
          check: 'VOC1',
          message: `${type}.${field}: vocabulary.yaml says "${v[field]}", ELEMENT_PRIMITIVES.md §4 says "${t[field]}".`,
        });
      }
    }
  }
}

// --- VOC2: vocabulary.yaml relation_types vs elements/17-relations.md §3 ---
//
// Same shape as VOC1, one layer over: notations/vocabulary.yaml is the source
// of truth; elements/17-relations.md §3 is the prose enum table. This check
// keeps the two from drifting apart unnoticed — it does not regenerate either
// side. Deliberately narrow parsers matching exactly the shapes these two
// files use, same trade-off as VOC1 and packages/ingest-cli/src/vocabulary.mjs.

// Pure — no I/O. Parses the `relation_types:` block of vocabulary.yaml into
// Map<kind, {from, fromSubtype, to, toSubtype}> — `from`/`to` are TYPE-name
// arrays, `fromSubtype`/`toSubtype` are ACTOR `type` value arrays or `null`
// when unrestricted. Live entries only (`deprecated_relation_types:` is a
// separate block, not returned). Throws on a block that isn't found or
// doesn't parse.
export function parseVocabularyRelationTypes(text) {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^relation_types:\s*$/.test(l));
  if (startIdx < 0) throw new Error('vocabulary.yaml: "relation_types:" block not found');

  const out = new Map();
  let current = null;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedent to column 0 — block ended
    const kindM = line.match(/^  ([a-z][a-z0-9_]*):\s*$/);
    if (kindM) {
      current = { from: null, fromSubtype: null, to: null, toSubtype: null };
      out.set(kindM[1], current);
      continue;
    }
    if (/^  #/.test(line) || /^\s*$/.test(line)) continue; // comment / blank
    const fieldM = line.match(/^    (from|to|from_subtype|to_subtype):\s*\[([^\]]*)\]\s*$/);
    if (fieldM && current) {
      const [, key, rawList] = fieldM;
      const values = rawList.split(',').map(v => v.trim()).filter(Boolean);
      const camelKey = key === 'from' ? 'from' : key === 'to' ? 'to' : key === 'from_subtype' ? 'fromSubtype' : 'toSubtype';
      current[camelKey] = values;
      continue;
    }
    if (!/^\s*#/.test(line)) {
      throw new Error(`vocabulary.yaml: unrecognised line in relation_types block: "${line}"`);
    }
  }
  if (out.size === 0) throw new Error('vocabulary.yaml: relation_types block parsed empty');
  return out;
}

// Pure — no I/O. Parses one "Endpoint TYPEs" table cell — e.g.
// "`ACTOR(business_unit)` or `ROLE` → `BUSINESS_SERVICE`" — into
// {from: {types, actorSubtype}, to: {types, actorSubtype}}. Only the code
// spans matter; the divider word ("or" / "\|") and any trailing plain-text
// note (e.g. "(V/H sub-grammar applies)") are outside a code span and never
// examined, so they are ignored rather than mis-parsed.
function parseEndpointTypesCell(cell) {
  const sides = cell.split('→');
  if (sides.length !== 2) throw new Error(`unrecognised Endpoint TYPEs cell (no single "→"): "${cell}"`);
  return { from: parseEndpointSide(sides[0]), to: parseEndpointSide(sides[1]) };
}

function parseEndpointSide(raw) {
  const spans = [...raw.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  if (spans.length === 0) throw new Error(`unrecognised endpoint side (no code span): "${raw}"`);
  const types = [];
  let actorSubtype = null;
  for (const span of spans) {
    const m = span.match(/^([A-Z][A-Z0-9_]*)(?:\(([a-z_]+(?:\|[a-z_]+)*)\))?$/);
    if (!m) throw new Error(`unrecognised endpoint type expression: "${span}"`);
    const [, typeName, subtypeList] = m;
    types.push(typeName);
    if (subtypeList) {
      if (typeName !== 'ACTOR') throw new Error(`unexpected subtype qualifier on non-ACTOR type: "${span}"`);
      actorSubtype = subtypeList.split('|');
    }
  }
  return { types, actorSubtype };
}

// Pure — no I/O. Parses elements/17-relations.md §3's relation `type` enum
// table into Map<kind, {from: {types, actorSubtype}, to: {types, actorSubtype}}>.
export function parseRelationsEnumTable(text) {
  const headingIdx = text.indexOf('\n## 3. Relation `type` enum');
  if (headingIdx < 0) throw new Error('17-relations.md: "## 3. Relation `type` enum" not found');
  let nextHeadingIdx = text.indexOf('\n### 3.1', headingIdx);
  if (nextHeadingIdx < 0) nextHeadingIdx = text.indexOf('\n## 4.', headingIdx);
  const section = nextHeadingIdx > 0 ? text.slice(headingIdx, nextHeadingIdx) : text.slice(headingIdx);

  const out = new Map();
  for (const line of section.split('\n')) {
    if (!line.startsWith('| `')) continue; // only kind data rows (header/separator rows don't start with a backtick)
    // A GFM table escapes a literal "|" inside a cell as "\|" — split only on
    // unescaped pipes, then unescape within each cell (this table's Endpoint
    // TYPEs column carries both a subtype alternation and a multi-TYPE list
    // this way, e.g. "ACTOR(person\|business_unit)" and "`GOAL` \| `ACTION`").
    const cells = line.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|')).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length < 3) continue;
    const kindM = cells[0].match(/^`([a-z][a-z0-9_]*)`$/);
    if (!kindM || kindM[1] === 'type') continue; // 'type' is the header row's code-styled label, not a kind
    out.set(kindM[1], parseEndpointTypesCell(cells[2]));
  }
  if (out.size === 0) throw new Error('17-relations.md §3: table parsed empty');
  return out;
}

function sameSet(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

async function checkVocabularyRelationTypes(failures) {
  let vocText, relationsText;
  try {
    vocText = await readFile(VOCABULARY_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC2', message: `${relPosix(VOCABULARY_PATH)}: not found — the vocabulary artefact must ship, never fall back silently.` });
    return;
  }
  try {
    relationsText = await readFile(RELATIONS_SPEC_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC2', message: `${relPosix(RELATIONS_SPEC_PATH)}: not found.` });
    return;
  }

  let voc, table;
  try {
    voc = parseVocabularyRelationTypes(vocText);
  } catch (e) {
    failures.push({ check: 'VOC2', message: `${relPosix(VOCABULARY_PATH)}: ${e.message}` });
    return;
  }
  try {
    table = parseRelationsEnumTable(relationsText);
  } catch (e) {
    failures.push({ check: 'VOC2', message: `${relPosix(RELATIONS_SPEC_PATH)}: ${e.message}` });
    return;
  }

  const allKinds = new Set([...voc.keys(), ...table.keys()]);
  for (const kind of allKinds) {
    const v = voc.get(kind);
    const t = table.get(kind);
    if (!v) {
      failures.push({ check: 'VOC2', message: `${kind} has a row in 17-relations.md §3 but no entry in notations/vocabulary.yaml relation_types.` });
      continue;
    }
    if (!t) {
      failures.push({ check: 'VOC2', message: `${kind} is in notations/vocabulary.yaml relation_types but has no row in 17-relations.md §3.` });
      continue;
    }
    if (!sameSet(v.from, t.from.types)) {
      failures.push({ check: 'VOC2', message: `${kind}.from: vocabulary.yaml says [${(v.from || []).join(', ')}], 17-relations.md §3 says [${t.from.types.join(', ')}].` });
    }
    if (!sameSet(v.to, t.to.types)) {
      failures.push({ check: 'VOC2', message: `${kind}.to: vocabulary.yaml says [${(v.to || []).join(', ')}], 17-relations.md §3 says [${t.to.types.join(', ')}].` });
    }
    if (!sameSet(v.fromSubtype, t.from.actorSubtype)) {
      failures.push({ check: 'VOC2', message: `${kind}.from_subtype: vocabulary.yaml says ${v.fromSubtype ? `[${v.fromSubtype.join(', ')}]` : 'unrestricted'}, 17-relations.md §3 says ${t.from.actorSubtype ? `[${t.from.actorSubtype.join(', ')}]` : 'unrestricted'}.` });
    }
    if (!sameSet(v.toSubtype, t.to.actorSubtype)) {
      failures.push({ check: 'VOC2', message: `${kind}.to_subtype: vocabulary.yaml says ${v.toSubtype ? `[${v.toSubtype.join(', ')}]` : 'unrestricted'}, 17-relations.md §3 says ${t.to.actorSubtype ? `[${t.to.actorSubtype.join(', ')}]` : 'unrestricted'}.` });
    }
  }
}

// --- VOC3: vocabulary.yaml value_vocabularies vs their owning specs --------
//
// Same source-of-truth direction as VOC1/VOC2: notations/vocabulary.yaml is
// authored correctly, and this check keeps a spec's prose from drifting away
// from it unnoticed — it does not regenerate either side. Deliberately narrow
// parsers matching exactly the shapes these files use, same trade-off as
// VOC1/VOC2.
//
// A spec states a closed enum in one of a few code-span shapes this repo
// actually uses: a single span with pipe-separated values
// ("`a \| b \| c`" in a table cell, "`a | b | c`" in prose), a single span
// with a brace-set ("`{A, B, C}`"), or several single-value spans divided by
// plain text ("`a`, `b`, `c`" or "`a` / `b` / `c`"). decomposeSpan()
// normalises all of them to a flat value list.

// Pure. Splits one backtick span's inner text into its member values —
// a brace-set ("{A, B, C}") or a pipe list ("a \| b" / "a | b") decompose to
// several values; anything else is already exactly one value.
export function decomposeSpan(raw) {
  const s = raw.trim();
  if (s.startsWith('{') && s.endsWith('}')) {
    return s.slice(1, -1).split(',').map(v => v.trim()).filter(Boolean);
  }
  if (s.includes('|')) {
    return s.replace(/\\\|/g, '|').split('|').map(v => v.trim()).filter(Boolean);
  }
  return [s];
}

// Pure. Every backtick code span in `text`, decomposed and flattened — used
// to build the "does this value appear anywhere in the spec" candidate set.
// Fenced code blocks are stripped first so a ``` ... ``` region (whose odd
// number of backticks would otherwise pair unpredictably with prose backticks
// around it) can never be misread as spanning into surrounding text.
function allSpanValues(text) {
  const stripped = text.replace(/```[\s\S]*?```/g, '');
  const spans = [...stripped.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  return new Set(spans.flatMap(decomposeSpan));
}

// Pure — no I/O. Parses the `value_vocabularies:` block of vocabulary.yaml
// into Map<key, {values, spec, rule}> — `spec` and `rule` are `null` when the
// artefact says so. Throws on a block that isn't found or doesn't parse.
export function parseVocabularyValueVocabularies(text) {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^value_vocabularies:\s*$/.test(l));
  if (startIdx < 0) throw new Error('vocabulary.yaml: "value_vocabularies:" block not found');

  const out = new Map();
  let current = null;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedent to column 0 — block ended
    const keyM = line.match(/^  ([A-Za-z][A-Za-z0-9_.]*):\s*$/);
    if (keyM) {
      current = { values: null, spec: null, rule: null };
      out.set(keyM[1], current);
      continue;
    }
    if (/^\s*$/.test(line)) continue; // blank
    const valuesM = line.match(/^    values:\s*\[([^\]]*)\]\s*$/);
    if (valuesM && current) {
      current.values = valuesM[1].split(',').map(v => v.trim()).filter(Boolean);
      continue;
    }
    const specM = line.match(/^    spec:\s*(\S+)\s*$/);
    if (specM && current) {
      current.spec = specM[1] === 'null' ? null : specM[1];
      continue;
    }
    const ruleM = line.match(/^    rule:\s*(\S+)\s*$/);
    if (ruleM && current) {
      current.rule = ruleM[1] === 'null' ? null : ruleM[1];
      continue;
    }
    if (!/^\s*#/.test(line)) {
      throw new Error(`vocabulary.yaml: unrecognised line in value_vocabularies block: "${line}"`);
    }
  }
  if (out.size === 0) throw new Error('vocabulary.yaml: value_vocabularies block parsed empty');
  return out;
}

// Pure. Finds `code`'s row in a rule_codes-style table (`| \`CODE\` | severity
// | message |`) and returns the decomposed value set the message's own
// "not one of …" / "not in …" enumeration states — the same shape VOC1/VOC2
// use for a spec's data rows, applied to whichever single row names this
// rule. Returns null when the row isn't found; throws when the row is found
// but names no recognisable enumeration (fails closed rather than silently
// treating an unparseable row as agreement).
export function parseRuleRowValues(specText, code) {
  const re = new RegExp('^\\|\\s*`' + code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`\\s*\\|.*\\|\\s*$', 'm');
  const rowM = specText.match(re);
  if (!rowM) return null;
  const row = rowM[0];
  const markerM = row.match(/not one of|not in/);
  if (!markerM) {
    throw new Error(`${code}: row found but names no "not one of" / "not in" enumeration to cross-check: "${row}"`);
  }
  const remainder = row.slice(markerM.index + markerM[0].length);
  const spans = [...remainder.matchAll(/`([^`]+)`/g)].map(m => m[1]);
  if (spans.length === 0) {
    throw new Error(`${code}: row's enumeration has no code span to read values from: "${row}"`);
  }
  return new Set(spans.flatMap(decomposeSpan));
}

async function checkVocabularyValueVocabularies(failures) {
  let vocText;
  try {
    vocText = await readFile(VOCABULARY_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC3', message: `${relPosix(VOCABULARY_PATH)}: not found — the vocabulary artefact must ship, never fall back silently.` });
    return;
  }

  let voc;
  try {
    voc = parseVocabularyValueVocabularies(vocText);
  } catch (e) {
    failures.push({ check: 'VOC3', message: `${relPosix(VOCABULARY_PATH)}: ${e.message}` });
    return;
  }

  const specTextCache = new Map();
  for (const [key, entry] of voc) {
    if (entry.spec === null) continue; // pipeline-internal set — no owning spec to check

    const specPath = join(REPO_ROOT, ...entry.spec.split('/'));
    let specText = specTextCache.get(entry.spec);
    if (specText === undefined) {
      try {
        specText = await readFile(specPath, 'utf8');
      } catch {
        specText = null;
      }
      specTextCache.set(entry.spec, specText);
    }
    if (specText === null) {
      failures.push({ check: 'VOC3', message: `${key}: spec "${entry.spec}" not found.` });
      continue;
    }

    const found = allSpanValues(specText);
    for (const v of entry.values || []) {
      if (!found.has(v)) {
        failures.push({ check: 'VOC3', message: `${key}: value "${v}" does not appear anywhere in ${entry.spec} as a code span.` });
      }
    }

    if (entry.rule) {
      let ruleValues;
      try {
        ruleValues = parseRuleRowValues(specText, entry.rule);
      } catch (e) {
        failures.push({ check: 'VOC3', message: `${key}: ${e.message}` });
        continue;
      }
      if (ruleValues === null) {
        failures.push({ check: 'VOC3', message: `${key}: rule "${entry.rule}" has no matching row in ${entry.spec} to cross-check.` });
        continue;
      }
      if (!sameSet([...ruleValues], entry.values)) {
        failures.push({ check: 'VOC3', message: `${key}: vocabulary.yaml values [${(entry.values || []).join(', ')}] do not match ${entry.rule}'s row in ${entry.spec}, which states [${[...ruleValues].join(', ')}].` });
      }
    }
  }
}

// --- VOC4: vocabulary.yaml rule_codes vs the codes specs actually use ------
//
// Same source-of-truth direction as VOC1/VOC2/VOC3: notations/vocabulary.yaml
// rule_codes is authored correctly, and this check keeps a spec's rule-code
// rows from drifting away from it unnoticed — it does not regenerate either
// side. A rule-code row is any GFM table row of the shape
// "| `CODE` | severity | ... |" (severity one of rule.severity's closed
// set) — the same row shape parseRuleRowValues (VOC3) already reads a single
// named row from, generalised here to every row in every spec.
//
// Two directions:
//   - every rule_codes entry's code has a row in its own `spec`, at the same
//     severity.
//   - every rule-code-shaped row found anywhere under notations/**/*.md names
//     a code present in rule_codes. A code owned by one spec but restated in
//     another (CONTRACT.md restates many it does not own, per its own file
//     comment) is not required to be the only row for that code — but the
//     restated severity must still agree with the owning entry.
//
// `deferred.rule_codes` narrows this check to exactly the named code — e.g.
// COMPIMP-010, which genuinely carries two rows at two severities in its
// spec and cannot be represented as one rule_codes entry until renumbered.
// An expired `review_by` is itself a VOC4 failure, so a deferred item cannot
// sit forever unnoticed.

const RULE_ROW_RE = /^\|\s*`([A-Z][A-Z0-9-]*)`\s*\|\s*(error|warning|info|deprecation)\s*\|/;

// Pure — no I/O. Parses the `rule_codes:` block of vocabulary.yaml into
// Map<code, {severity, spec}>. Throws on a block that isn't found or doesn't
// parse.
export function parseVocabularyRuleCodes(text) {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^rule_codes:\s*$/.test(l));
  if (startIdx < 0) throw new Error('vocabulary.yaml: "rule_codes:" block not found');

  const out = new Map();
  let current = null;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedent to column 0 — block ended
    const codeM = line.match(/^  ([A-Z][A-Z0-9-]*):\s*$/);
    if (codeM) {
      current = { severity: null, spec: null };
      out.set(codeM[1], current);
      continue;
    }
    if (/^  #/.test(line) || /^\s*$/.test(line)) continue; // comment / blank
    const fieldM = line.match(/^    (severity|spec):\s*(\S+)\s*$/);
    if (fieldM && current) {
      current[fieldM[1]] = fieldM[2];
      continue;
    }
    if (!/^\s*#/.test(line)) {
      throw new Error(`vocabulary.yaml: unrecognised line in rule_codes block: "${line}"`);
    }
  }
  if (out.size === 0) throw new Error('vocabulary.yaml: rule_codes block parsed empty');
  return out;
}

// Pure — no I/O. Parses `deferred.rule_codes` into Map<code, {reviewBy}> —
// `reason` is prose for the human reading the file and is not read back.
// Returns an empty Map when `deferred:` or `deferred.rule_codes:` is absent —
// unlike the blocks above, a deferred list is optional.
export function parseVocabularyDeferredRuleCodes(text) {
  const lines = text.split(/\r?\n/);
  const topIdx = lines.findIndex(l => /^deferred:\s*$/.test(l));
  if (topIdx < 0) return new Map();
  const subIdx = lines.findIndex((l, i) => i > topIdx && /^  rule_codes:\s*$/.test(l));
  if (subIdx < 0) return new Map();

  const out = new Map();
  let current = null;
  for (let i = subIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 && !/^\s/.test(line)) break; // dedent to column 0 — block ended
    if (/^  \S/.test(line)) break; // dedent to "deferred:"'s own key level — rule_codes sub-block ended
    const codeM = line.match(/^    ([A-Z][A-Z0-9-]*):\s*$/);
    if (codeM) {
      current = { reviewBy: null };
      out.set(codeM[1], current);
      continue;
    }
    const reviewM = line.match(/^      review_by:\s*"([^"]+)"\s*$/);
    if (reviewM && current) {
      current.reviewBy = reviewM[1];
      continue;
    }
    // `reason:` and its folded (">-") continuation lines are prose, not a
    // field this check reads — tolerated at the entry's field indent and
    // deeper; only an unrecognised line at a shallower indent is a failure.
    if (/^\s*$/.test(line) || /^\s{6,}/.test(line)) continue;
    throw new Error(`vocabulary.yaml: unrecognised line in deferred.rule_codes block: "${line}"`);
  }
  for (const [code, entry] of out) {
    if (!entry.reviewBy) throw new Error(`vocabulary.yaml: deferred.rule_codes.${code} has no review_by date`);
  }
  return out;
}

async function checkVocabularyRuleCodes(failures) {
  let vocText;
  try {
    vocText = await readFile(VOCABULARY_PATH, 'utf8');
  } catch {
    failures.push({ check: 'VOC4', message: `${relPosix(VOCABULARY_PATH)}: not found — the vocabulary artefact must ship, never fall back silently.` });
    return;
  }

  let rules, deferred;
  try {
    rules = parseVocabularyRuleCodes(vocText);
  } catch (e) {
    failures.push({ check: 'VOC4', message: `${relPosix(VOCABULARY_PATH)}: ${e.message}` });
    return;
  }
  try {
    deferred = parseVocabularyDeferredRuleCodes(vocText);
  } catch (e) {
    failures.push({ check: 'VOC4', message: `${relPosix(VOCABULARY_PATH)}: ${e.message}` });
    return;
  }

  // A time-boxed exemption past its own date is a VOC4 failure — deferred
  // never means indefinite.
  const today = new Date().toISOString().slice(0, 10);
  for (const [code, entry] of deferred) {
    if (entry.reviewBy < today) {
      failures.push({ check: 'VOC4', message: `deferred.rule_codes.${code}: review_by ${entry.reviewBy} has passed — resolve or renew the exemption.` });
    }
  }

  // One pass over every notations/**/*.md, collecting every rule-code-shaped
  // row, grouped by file. Map<relSpecPath, Map<code, severity[]>>.
  const mdFiles = await walk(NOTATIONS_DIR, '.md');
  const rowsByFile = new Map();
  for (const abs of mdFiles) {
    const rel = relPosix(abs);
    const text = await readFile(abs, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(RULE_ROW_RE);
      if (!m) continue;
      const [, code, severity] = m;
      if (!rowsByFile.has(rel)) rowsByFile.set(rel, new Map());
      const fileRows = rowsByFile.get(rel);
      if (!fileRows.has(code)) fileRows.set(code, []);
      fileRows.get(code).push(severity);
    }
  }

  // Direction 1: every rule_codes entry has a matching row in its own spec.
  for (const [code, entry] of rules) {
    if (!existsSync(join(REPO_ROOT, ...entry.spec.split('/')))) {
      failures.push({ check: 'VOC4', message: `${code}: spec "${entry.spec}" not found.` });
      continue;
    }
    const severities = rowsByFile.get(entry.spec)?.get(code);
    if (!severities) {
      failures.push({ check: 'VOC4', message: `${code} is in notations/vocabulary.yaml rule_codes naming ${entry.spec} but has no matching row there.` });
      continue;
    }
    if (!severities.every(s => s === entry.severity)) {
      failures.push({ check: 'VOC4', message: `${code}: vocabulary.yaml says severity "${entry.severity}", ${entry.spec} says [${severities.join(', ')}].` });
    }
  }

  // Direction 2: every rule-code-shaped row anywhere under notations/ names a
  // code present in rule_codes (or deferred); a restatement's severity must
  // still agree with the owning entry.
  for (const [rel, fileRows] of rowsByFile) {
    for (const [code, severities] of fileRows) {
      const entry = rules.get(code);
      if (!entry) {
        if (deferred.has(code)) continue; // time-boxed exemption; expiry already checked above
        failures.push({ check: 'VOC4', message: `${rel} has a row for ${code}, not present in notations/vocabulary.yaml rule_codes (and not in deferred.rule_codes).` });
        continue;
      }
      if (entry.spec === rel) continue; // owning file — already checked in direction 1
      if (!severities.every(s => s === entry.severity)) {
        failures.push({ check: 'VOC4', message: `${code}: ${rel} restates it at severity [${severities.join(', ')}], vocabulary.yaml says "${entry.severity}".` });
      }
    }
  }
}

// T1: document-source file naming.
//
// `.trs` is one keystroke away from `.ttrs` and is a different, widely used
// format. A file ending `.trs` where a document source is expected must be
// reported as that near-miss in words — a bare "unknown file" would send the
// author looking for the wrong problem (CONTRACT.md §3).
//
// Pure: takes the repo-relative paths, returns the findings. Exported for the
// unit tests; the walk that feeds it lives in checkDocumentSources below.
export function findDocumentSourceFailures(relPaths) {
  const failures = [];
  for (const rel of relPaths) {
    const base = posix.basename(rel);

    if (base.endsWith('.trs')) {
      failures.push({
        check: 'T1',
        message: `${rel}: ends ".trs" — the document-source extension is ".ttrs" (".trs" is a different, widely used format, one keystroke away). Rename it, or move it out of the tree if it really is a .trs file.`,
      });
      continue;
    }

    if (!base.endsWith('.ttrs')) continue;

    // `<basename>.<kind>.ttrs` — the middle segment is the document kind.
    if (!/^[^.]+\.[a-z0-9-]+\.ttrs$/.test(base)) {
      failures.push({
        check: 'T1',
        message: `${rel}: not named <basename>.<kind>.ttrs — the middle segment is the document kind (e.g. product.mrd.ttrs).`,
      });
    }
  }
  return failures;
}

async function checkDocumentSources(failures) {
  const all = await walk(REPO_ROOT, null);
  failures.push(...findDocumentSourceFailures(all.map(relPosix)));
}

// --- ID1: example-ID grammar over method/ and notations/ -------------------
//
// notations/IDS_AND_REFERENCES.md §1 is the canonical ID grammar; §3 is the
// TYPE registry that defines which prefixes this grammar governs at all. A
// candidate token whose TYPE prefix isn't registered there (an ADR/WI id, a
// rule-code prefix with no element-TYPE homonym) is simply not an ID this
// check has jurisdiction over — see method/02-repository.md §1.1, which
// states plainly that `operations/` ids are "deliberately outside the
// canonical TYPE registry". A handful of rule codes DO collide with a
// registered TYPE name (ACTION-005, TERM-002, DGCA-001, …); those are
// excluded by exact match against vocabulary.yaml's rule_codes (VOC4 already
// owns validating that registry, so ID1 only reads it).

// Pure — no I/O. Parses "## 3. TYPE registry" through "## 4." of
// IDS_AND_REFERENCES.md into the Set of every registered TYPE prefix, across
// every §3.x subsection (element types, view-level types, field/codex
// artefacts, assertion/verification/validation). Throws on a missing section
// or an empty parse — a corrupted or missing artefact must fail this check,
// never pass silently.
export function parseIdTypeRegistry(text) {
  const startIdx = text.indexOf('\n## 3. TYPE registry');
  if (startIdx < 0) throw new Error('IDS_AND_REFERENCES.md: "## 3. TYPE registry" not found');
  const endIdx = text.indexOf('\n## 4.', startIdx);
  const section = endIdx > 0 ? text.slice(startIdx, endIdx) : text.slice(startIdx);
  const out = new Set();
  for (const line of section.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const m = line.match(/^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|/);
    if (m) out.add(m[1]);
  }
  if (out.size === 0) throw new Error('IDS_AND_REFERENCES.md §3: TYPE registry parsed empty');
  return out;
}

// Pure. Validates one candidate token (already known to start `TYPE-`)
// against §1's grammar, with §2's CAPABILITY V/H exception. Returns
// { valid: true } or { valid: false, reason }.
export function validateIdToken(token) {
  const m = token.match(/^([A-Z][A-Z0-9_]*)-(.+)$/);
  if (!m) return { valid: false, reason: 'not shaped like TYPE-<…> (an uppercase TYPE prefix followed by "-" is required)' };
  const [, type, rest] = m;

  if (type === 'CAPABILITY') {
    if (!/^[VH][1-9]\d*(?:\.[1-9]\d*){0,2}$/.test(rest)) {
      return { valid: false, reason: 'CAPABILITY id does not match the V/H diagram-address form, depth ≤ 3, no leading zeros (§2)' };
    }
    return { valid: true };
  }

  const segments = rest.split('-');
  const terminal = segments[segments.length - 1];
  if (!/^[1-9]\d*$/.test(terminal)) {
    return { valid: false, reason: `terminal segment "${terminal}" is not a positive integer with no leading zeros (§1)` };
  }
  return { valid: true };
}

// Candidate ID token: an uppercase TYPE prefix, then one or more
// hyphen-separated groups (letters/digits/underscore), each optionally
// extended by `.<digits>` repeats — enough to capture a full CAPABILITY V/H
// address (`V1.2.3`) while stopping before a non-numeric suffix. That
// asymmetry is deliberate: every real trailing suffix this repo actually
// writes after an ID (`.yaml`, `.history.yaml`, a directive `.field.path`
// accessor) starts with a letter, never a digit, so `\.[0-9]+` never
// over-consumes into one.
const ID_TOKEN_RE = /\b[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+(?:\.[0-9]+)*)+\b/g;

// Pure. Scans `text` for ID-shaped candidates inside a fenced code block
// (the whole line is fair game — it's code, not prose) or inside a single-
// backtick span outside a fence (the markdown sense of "inline literal" /
// "table cell" — this repo backtick-quotes every ID it documents). Skips a
// match that is itself a placeholder by this repo's own conventions: wrapped
// in `<…>` (`<STEP-id>`, `<REQUIREMENT-HINT>`) or immediately followed by the
// `-…` family-prefix ellipsis (`NEED-VALIDATION-COVERAGE-…`). Returns
// [{ token, line }] with 1-based line numbers.
export function findIdCandidates(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  let inFence = false;
  const scan = (segment, line) => {
    for (const m of segment.matchAll(ID_TOKEN_RE)) {
      const before = segment[m.index - 1];
      const afterIdx = m.index + m[0].length;
      const after = segment[afterIdx];
      if (before === '<' && after === '>') continue; // <STEP-id>-style placeholder
      if (after === '…' || segment.slice(afterIdx, afterIdx + 2) === '-…') continue; // family-prefix marker
      out.push({ token: m[0], line });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      scan(line, i + 1);
    } else {
      for (const spanM of line.matchAll(/`([^`]+)`/g)) {
        scan(spanM[1], i + 1);
      }
    }
  }
  return out;
}

async function checkIdGrammar(failures) {
  let registryText;
  try {
    registryText = await readFile(IDS_AND_REFERENCES_PATH, 'utf8');
  } catch {
    failures.push({ check: 'ID1', message: `${relPosix(IDS_AND_REFERENCES_PATH)}: not found.` });
    return;
  }
  let registry;
  try {
    registry = parseIdTypeRegistry(registryText);
  } catch (e) {
    failures.push({ check: 'ID1', message: `${relPosix(IDS_AND_REFERENCES_PATH)}: ${e.message}` });
    return;
  }

  const ruleCodes = new Set();
  try {
    const vocText = await readFile(VOCABULARY_PATH, 'utf8');
    for (const code of parseVocabularyRuleCodes(vocText).keys()) ruleCodes.add(code);
    for (const code of parseVocabularyDeferredRuleCodes(vocText).keys()) ruleCodes.add(code);
  } catch {
    // vocabulary.yaml's own well-formedness is VOC4's job; ID1 degrades to
    // "no rule-code exclusions" rather than duplicating that failure here.
  }

  const files = (await walk(NOTATIONS_DIR, '.md')).concat(await walk(METHOD_DIR, '.md'));
  const seen = new Set();
  for (const abs of files) {
    if (ID1_EXCLUDED_FILES.has(abs)) continue; // documents invalid forms on purpose
    const rel = relPosix(abs);
    const text = await readFile(abs, 'utf8');
    for (const { token, line } of findIdCandidates(text)) {
      const type = token.slice(0, token.indexOf('-'));
      if (!registry.has(type)) continue; // not a TYPE this grammar governs
      if (ruleCodes.has(token)) continue; // a rule code, not an element id
      if (token === 'CAPABILITY-V' || token === 'CAPABILITY-H') continue; // schema placeholder, e.g. CAPABILITY-V[N]
      const key = `${rel} ${token}`;
      if (seen.has(key)) continue;
      const result = validateIdToken(token);
      if (!result.valid) {
        seen.add(key);
        failures.push({ check: 'ID1', message: `${rel}:${line}: \`${token}\` — ${result.reason}.` });
      }
    }
  }
}

// --- LAYER1: layer/folder enumeration (extends VOC1's reach) ---------------
//
// The known defect this guards: a repository-tree listing of
// canon/elements/NN_<layer>/ folders that silently drops one — exactly what
// happened to 04_technology/ before it was restored (transitrix-hq#188).
// Scoped deliberately to *fenced code blocks* only (a directory-tree
// diagram), not prose or Markdown tables: this repo's spec tables
// legitimately cite two, three, or four layer folders as one row's metadata
// (a TYPE catalogue row, a worked-example file listing) without attempting
// to enumerate the layer set at all — every such table produced a false
// positive when tried. A fenced tree, by construction, is always attempting
// completeness. A single isolated folder citation (fewer than three
// distinct tokens) is not an enumeration and is not checked.

const LAYER_FOLDER_RE = /\b(0[1-9]_[a-z]+)\b/g;

// Pure. Finds every `NN_word` token inside a fenced code block in `text`
// (one candidate hit per line — a line citing two or more *different*
// folders is a table row rendered inside a fence, not a tree entry, and
// contributes no hit). Consecutive hits within 3 lines of each other form a
// group; a repeated folder starts a fresh group instead of extending the
// current one, since a genuine tree never lists the same folder twice.
// Returns only groups with three or more distinct folder tokens — the
// threshold that separates "this tree is trying to list the layers" from
// an incidental single mention.
export function findLayerEnumerationGroups(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) continue;
    const lineMatches = [...lines[i].matchAll(LAYER_FOLDER_RE)];
    if (lineMatches.length === 0) continue;
    if (new Set(lineMatches.map(m => m[1])).size > 1) continue; // multiple different folders on one line
    hits.push({ folder: lineMatches[0][1], line: i + 1 });
  }
  const groups = [];
  let current = null;
  for (const hit of hits) {
    const startsNew = !current || hit.line - current.endLine > 3 || current.folders.has(hit.folder);
    if (startsNew) {
      current = { startLine: hit.line, endLine: hit.line, folders: new Set([hit.folder]) };
      groups.push(current);
    } else {
      current.endLine = hit.line;
      current.folders.add(hit.folder);
    }
  }
  return groups.filter(g => g.folders.size >= 3);
}

async function checkLayerEnumeration(failures) {
  const canonical = new Set(Object.values(LAYER_WORD_TO_FOLDER));
  const files = (await walk(NOTATIONS_DIR, '.md')).concat(await walk(METHOD_DIR, '.md'));
  for (const abs of files) {
    const rel = relPosix(abs);
    const text = await readFile(abs, 'utf8');
    for (const group of findLayerEnumerationGroups(text)) {
      const missing = [...canonical].filter(f => !group.folders.has(f));
      const extra = [...group.folders].filter(f => !canonical.has(f));
      if (missing.length || extra.length) {
        const parts = [];
        if (missing.length) parts.push(`missing [${missing.join(', ')}]`);
        if (extra.length) parts.push(`unexpected [${extra.join(', ')}]`);
        failures.push({
          check: 'LAYER1',
          message: `${rel}:${group.startLine}-${group.endLine}: layer-folder list is incomplete — ${parts.join(', ')} (registry: [${[...canonical].join(', ')}]).`,
        });
      }
    }
  }
}

// --- DUALHOME1: no dual-home tables (extends VOC1/VOC2's reach) ------------
//
// The known defect this guards: method/ restating a notations/ table in full
// (former §3a's ArchiMate vocabulary reference, former §6.1's per-notation
// location catalogue) instead of pointing to it — two copies of the same
// table drift apart the moment one is edited and the other isn't. A shared
// row is compared by its full rendered text (every cell), so two tables that
// happen to share one incidental value (a lone "Yes" / "No" cell) are not a
// false positive — it takes two or more identical whole rows to report.

// Pure. Finds every GFM table in `text` (a `|…|` row, a `|---|` separator
// row, then its data rows) and returns [{ startLine, rows }] — `rows` are
// the trimmed data-row lines (1-based `startLine` points at the header row).
export function parseMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const startLine = i + 1;
      const rows = [];
      let j = i + 2;
      while (j < lines.length && /^\|.*\|\s*$/.test(lines[j])) {
        rows.push(lines[j].trim());
        j++;
      }
      tables.push({ startLine, rows });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

async function checkDualHomeTables(failures) {
  const methodTables = [];
  for (const abs of await walk(METHOD_DIR, '.md')) {
    const text = await readFile(abs, 'utf8');
    for (const t of parseMarkdownTables(text)) methodTables.push({ file: relPosix(abs), ...t });
  }
  const notationsTables = [];
  for (const abs of await walk(NOTATIONS_DIR, '.md')) {
    const text = await readFile(abs, 'utf8');
    for (const t of parseMarkdownTables(text)) notationsTables.push({ file: relPosix(abs), ...t });
  }

  for (const mt of methodTables) {
    const mRows = new Set(mt.rows);
    for (const nt of notationsTables) {
      let overlap = 0;
      for (const row of nt.rows) if (mRows.has(row)) overlap++;
      if (overlap >= 2) {
        failures.push({
          check: 'DUALHOME1',
          message: `${mt.file}:${mt.startLine} shares ${overlap} row(s) with ${nt.file}:${nt.startLine} — restating a notations/ table in method/ risks drift; replace with a pointer.`,
        });
      }
    }
  }
}

// --- SIZE1: per-file soft ceiling (warn-only, method/ only) ----------------
//
// Never fails the build — main() collects these into a separate `warnings`
// list that is printed but never affects the exit code.

// Pure. Returns the soft-ceiling warnings for one method/ file: over 250
// lines, or more than nine top-level (`## `) sections.
export function findSizeCeilingWarnings(text, rel) {
  const lines = text.split(/\r?\n/);
  const warnings = [];
  if (lines.length > 250) {
    warnings.push({ check: 'SIZE1', message: `${rel}: ${lines.length} lines (soft ceiling 250) — consider dividing further.` });
  }
  const sectionCount = lines.filter(l => /^## (?!#)/.test(l)).length;
  if (sectionCount > 9) {
    warnings.push({ check: 'SIZE1', message: `${rel}: ${sectionCount} "##" sections (soft ceiling 9) — consider dividing further.` });
  }
  return warnings;
}

async function checkSizeCeiling(warnings) {
  for (const abs of await walk(METHOD_DIR, '.md')) {
    const text = await readFile(abs, 'utf8');
    warnings.push(...findSizeCeilingWarnings(text, relPosix(abs)));
  }
}

// --- main ------------------------------------------------------------------

async function main() {
  const failures = [];
  const warnings = [];
  let catalogue;
  try {
    catalogue = await parseCatalogue();
    await checkExamples(catalogue, failures);
    await checkLinks(failures);
    await checkVersion(failures);
    await checkNotationCounts(failures);
    await checkNoStandardIdentifiers(failures);
    await checkPackageEnvelopeStatements(failures);
    await checkVocabularyElementTypes(failures);
    await checkVocabularyRelationTypes(failures);
    await checkVocabularyValueVocabularies(failures);
    await checkVocabularyRuleCodes(failures);
    await checkDocumentSources(failures);
    await checkIdGrammar(failures);
    await checkLayerEnumeration(failures);
    await checkDualHomeTables(failures);
    await checkSizeCeiling(warnings);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }

  if (warnings.length > 0) {
    console.warn(`\nNotations doc-lint — ${warnings.length} warning(s) (do not fail the build):\n`);
    for (const w of warnings) {
      console.warn(`  - [${w.check}] ${w.message}`);
    }
    console.warn('');
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
