// Two-layer review-artifact naming (vkgeorgia/strategy#837): a stable package
// filename (`review-digest.yaml`) inside a human-facing batch directory. The
// first digest for an org still lands at the flat legacy path
// `_intake/processing/<filename>` — untouched, so an existing single-batch
// workflow keeps working exactly as before. Only once that stable path is
// already occupied — and nothing here ever moves a resolved digest away, so
// "the file exists" is the only signal available and is read as "unresolved"
// — does a second, concurrent run get its own dated directory:
// `_intake/processing/<stem>-<scope>-YYYYMMDD-<seq>/<filename>`.
//
// `scope` is a caller-supplied word (`--scope`), never an org-identifying
// string — it defaults to the generic `batch` when absent or malformed. Same
// mechanism as `@transitrix/ingest-cli`'s `src/batch-path.mjs` (each package
// keeps its own copy — zero cross-package dependencies, by design).

import { access } from 'node:fs/promises';
import { join } from 'node:path';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const SAFE_SCOPE_RE = /^[a-z][a-z0-9_-]*$/;

function todayCompact() { return new Date().toISOString().slice(0, 10).replace(/-/g, ''); }

// Resolve the path a batch's stable-filename artifact should be written to.
// Non-destructive: never returns a path that already exists.
export async function resolveBatchPath({ processingDir, filename, scope }) {
  const flat = join(processingDir, filename);
  if (!(await exists(flat))) return flat;

  const stem = filename.replace(/\.[^.]+$/, '');
  const safeScope = typeof scope === 'string' && SAFE_SCOPE_RE.test(scope) ? scope : 'batch';
  const date = todayCompact();
  for (let seq = 1; ; seq++) {
    const dir = join(processingDir, `${stem}-${safeScope}-${date}-${seq}`);
    const candidate = join(dir, filename);
    if (!(await exists(candidate)) && !(await exists(dir))) return candidate;
  }
}
