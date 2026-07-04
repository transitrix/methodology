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
import { fileURLToPath } from 'node:url';
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

// --- main ------------------------------------------------------------------

async function main() {
  const failures = [];
  let catalogue;
  try {
    catalogue = await parseCatalogue();
    await checkExamples(catalogue, failures);
    await checkLinks(failures);
    await checkVersion(failures);
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
    `internal links, and methodology_version pins all consistent.`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(`error: ${e.message}`);
  process.exit(2);
});
