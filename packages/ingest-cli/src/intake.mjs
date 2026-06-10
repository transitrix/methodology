// _intake/ pipeline workspace — scaffolding and the inbox -> processing ->
// processed flow. _intake/ is operational, NOT a zone (CONTRACT.md §5 zones stay
// parallel beside it). All moves are deterministic; nothing here touches canon/.

import { mkdir, rename, access, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';

export const INTAKE = '_intake';
export const STAGES = ['inbox', 'processing', 'processed'];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

// Create _intake/{inbox,processing,processed} under orgRoot. Idempotent — never
// overwrites existing content. Returns { created: [...], existing: [...] }.
//
// _intake/ is a PER-USER, PRIVATE workspace: its working files are git-ignored
// and not shared (CONTRACT §13.1 — model content lives in shared canon/, never
// here). A committed `.gitkeep` in each stage keeps the folder skeleton in
// version control while `.gitignore` ignores the contents; the adopter's
// .gitignore pairs `_intake/<stage>/*` with `!_intake/**/.gitkeep`.
export async function scaffoldIntake(orgRoot) {
  const root = resolve(orgRoot);
  const created = [];
  const existing = [];
  for (const stage of STAGES) {
    const dir = join(root, INTAKE, stage);
    if (await exists(dir)) existing.push(join(INTAKE, stage));
    else { await mkdir(dir, { recursive: true }); created.push(join(INTAKE, stage)); }
    // Always ensure the .gitkeep exists (idempotent — never clobbers content).
    const keep = join(dir, '.gitkeep');
    if (!(await exists(keep))) await writeFile(keep, '', 'utf8');
  }
  return { created, existing };
}

// Walk upward from a path to find the org root that holds an `_intake/` dir.
// Returns the org root, or null if none is found before the filesystem root.
export async function findOrgRoot(fromPath) {
  let dir = resolve(fromPath);
  // If fromPath is a file, start at its directory.
  if (await exists(dir)) {
    try {
      const { stat } = await import('node:fs/promises');
      if ((await stat(dir)).isFile()) dir = dirname(dir);
    } catch { /* fall through */ }
  }
  for (;;) {
    if (await exists(join(dir, INTAKE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function stageDir(orgRoot, stage) {
  if (!STAGES.includes(stage)) throw new Error(`unknown intake stage: ${stage}`);
  return join(resolve(orgRoot), INTAKE, stage);
}

// Move a file between intake stages, preserving its basename. Returns the new path.
export async function moveBetweenStages(orgRoot, fromStage, toStage, fileBasename) {
  const src = join(stageDir(orgRoot, fromStage), fileBasename);
  const dst = join(stageDir(orgRoot, toStage), fileBasename);
  await mkdir(dirname(dst), { recursive: true });
  await rename(src, dst);
  return dst;
}

// Read the adopter manifest (transitrix.yaml) text at the org root, if present.
// Returns the raw string or null. (Parsing is the caller's concern.)
export async function readManifestText(orgRoot) {
  const p = join(resolve(orgRoot), 'transitrix.yaml');
  if (!(await exists(p))) return null;
  return readFile(p, 'utf8');
}

export { basename };
