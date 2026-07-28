// Load / write a `reqif/` package folder ↔ the in-memory object model.
// notations/packages/reqif.md §2.3 — one object per file, four subfolders.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { dump, load } from './yaml.mjs';

const SUBFOLDER = {
  'spec-object-type': 'spec-object-types',
  'spec-object': 'spec-objects',
  'spec-relation': 'spec-relations',
  'spec-hierarchy': 'spec-hierarchies',
};

async function readKindFolder(dir, kind) {
  const sub = join(dir, SUBFOLDER[kind]);
  let names;
  try { names = await readdir(sub); } catch { return []; }
  const out = [];
  for (const name of names.filter(n => n.endsWith('.yaml')).sort()) {
    const text = await readFile(join(sub, name), 'utf8');
    out.push(load(text));
  }
  return out;
}

// Reads the four kind subfolders under `dir` into a model:
// { specObjectTypes, specObjects, specRelations, specHierarchies }.
export async function loadPackage(dir) {
  const [specObjectTypes, specObjects, specRelations, specHierarchies] = await Promise.all([
    readKindFolder(dir, 'spec-object-type'),
    readKindFolder(dir, 'spec-object'),
    readKindFolder(dir, 'spec-relation'),
    readKindFolder(dir, 'spec-hierarchy'),
  ]);
  return { specObjectTypes, specObjects, specRelations, specHierarchies };
}

// Writes a model back out to `dir`, one file per object, named by its id.
export async function writePackage(dir, model) {
  const groups = [
    ['spec-object-type', model.specObjectTypes],
    ['spec-object', model.specObjects],
    ['spec-relation', model.specRelations],
    ['spec-hierarchy', model.specHierarchies],
  ];
  for (const [kind, items] of groups) {
    const sub = join(dir, SUBFOLDER[kind]);
    await mkdir(sub, { recursive: true });
    for (const item of items) {
      await writeFile(join(sub, `${item.id}.yaml`), dump(item), 'utf8');
    }
  }
}

// Deep-sorts a model's four arrays by id so two models built from the same
// object set compare equal regardless of read/write order (directory listing
// order, XML section order, etc.).
export function normalizeModel(model) {
  const byId = (a, b) => String(a.id).localeCompare(String(b.id));
  return {
    specObjectTypes: [...model.specObjectTypes].sort(byId),
    specObjects: [...model.specObjects].sort(byId),
    specRelations: [...model.specRelations].sort(byId),
    specHierarchies: [...model.specHierarchies].sort(byId),
  };
}

// Order-independent-for-maps, order-dependent-for-arrays deep equality — used
// by the `roundtrip` command to assert "identical object set" (reqif.md §6)
// without being tripped up by incidental key-insertion-order differences
// between a YAML-loaded object and one reconstructed from parsed XML.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}
