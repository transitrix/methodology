// Two-layer review-artifact naming: a stable package
// filename (`review-digest.yaml`) inside a human-facing batch directory. The
// first digest for an org still lands at the flat legacy path
// `_intake/processing/<filename>` — untouched, so an existing single-batch
// workflow keeps working exactly as before. Only once that stable path is
// already occupied does a second, concurrent run get its own dated
// directory: `_intake/processing/<stem>-<scope>-YYYYMMDD-<seq>/<filename>`.
//
// "Occupied" does not simply mean "a file is sitting there": rerunning
// against the SAME flat path on purpose (an idempotent refresh) must keep
// updating it in place. The signal that distinguishes that refresh from a
// genuinely separate concurrent run is `run_id` — if the on-disk scalar
// matches this run's id, it is still the same digest and the flat file is
// updated in place. A different or missing `run_id` means the existing file
// is a different (or unresolved) digest, and this run gets routed to its
// own dated directory instead of overwriting it. Scalars on disk are YAML
// (this CLI's dump always double-quotes strings), so the comparison must
// unquote; a raw regex match against the quoted value would treat a
// same-batch refresh as a new batch.
//
// `scope` is a caller-supplied word (`--scope`), never an org-identifying
// string — it defaults to the generic `batch` when absent or malformed. Same
// mechanism as `@transitrix/ingest-cli`'s `src/batch-path.mjs` (each package
// keeps its own copy — zero cross-package dependencies, by design).

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readTopScalar } from './yaml.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const SAFE_SCOPE_RE = /^[a-z][a-z0-9_-]*$/;

function todayCompact() { return new Date().toISOString().slice(0, 10).replace(/-/g, ''); }

// Resolve the path a batch's stable-filename artifact should be written to.
// Batch identity is determined by explicit `runId` matching against the existing
// file's run_id field (if present). Only a matching run_id allows same-batch
// refresh in place; different or missing run_id means different batch → dated
// directory. Without `runId`, the existing flat path is treated as unresolved
// and a dated directory is created instead. Same mechanism as
// @transitrix/ingest-cli's batch-path.mjs (each package keeps its own copy).
export async function resolveBatchPath({ processingDir, filename, scope, content, runId }) {
  const flat = join(processingDir, filename);
  if (!(await exists(flat))) return flat;

  if (runId !== undefined) {
    const onDisk = await readFile(flat, 'utf8').catch(() => null);
    if (onDisk !== null) {
      const fileRunId = readTopScalar(onDisk, 'run_id');
      if (fileRunId === String(runId)) return flat;
    }
  }

  const stem = filename.replace(/\.[^.]+$/, '');
  const safeScope = typeof scope === 'string' && SAFE_SCOPE_RE.test(scope) ? scope : 'batch';
  const date = todayCompact();
  for (let seq = 1; ; seq++) {
    const dir = join(processingDir, `${stem}-${safeScope}-${date}-${seq}`);
    const candidate = join(dir, filename);
    if (!(await exists(candidate)) && !(await exists(dir))) return candidate;
  }
}
