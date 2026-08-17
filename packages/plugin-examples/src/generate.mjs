#!/usr/bin/env node
/**
 * Regenerates the rendered notation-view SVGs embedded in transitrix/README.md.
 *
 * Reads this repository's own worked examples under notations/examples/<kind>/,
 * runs each through the matching parse/validate + render pipeline from the
 * shared @transitrix/diagrams library (the same rendering code Studio and DSM
 * use — see the root README's "How it works in five lines"), and writes the
 * output to transitrix/examples/<kind>.svg.
 *
 * Deterministic: the same source + the same pinned @transitrix/diagrams
 * version always produce the same bytes. That's what
 * .github/workflows/plugin-examples-drift.yml checks — it re-runs this
 * script into a scratch directory and diffs against what's committed here.
 *
 * Only notation kinds with a real, published SVG renderer in
 * @transitrix/diagrams are covered. Kinds whose webview renderer only
 * produces an HTML fragment (Applications, Products, Process Map,
 * Capability Map's card view, Scenarios), and kinds with no renderer at all
 * (Integration Map; the BPMN layout algorithm is not published — only its
 * SVG body emitter is; Action Card's resolver needs canon element/relation
 * sources this repository's standalone examples don't provide), are not
 * generated here. That is a capability gap, not a bug — nothing is
 * hand-drawn to paper over it.
 *
 * Usage: node packages/plugin-examples/src/generate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { coerceDatesToIsoStrings } from '@transitrix/diagrams/yaml-normalize.js';

import { parseCanonicalGoals } from '@transitrix/diagrams/goals/parse-canonical.js';
import { renderGoalsSvg } from '@transitrix/diagrams/webview/render-goals.js';

import { parseCanonicalFGCA } from '@transitrix/diagrams/fgca/parse-canonical.js';
import { renderFgcaSvg } from '@transitrix/diagrams/webview/render-fgca.js';

import { validateCapabilityMap } from '@transitrix/diagrams/capability-map/validate.js';
import { renderCapabilityTreeSvg } from '@transitrix/diagrams/capability-map/render-capability-tree.js';

import { validateProcessBlueprint } from '@transitrix/diagrams/process-blueprint/validate.js';
import { renderProcessBlueprintSvg } from '@transitrix/diagrams/webview/render-process-blueprint.js';

import { validateActivities } from '@transitrix/diagrams/activities/validate.js';
import { renderActivitiesSvg } from '@transitrix/diagrams/webview/render-activities.js';

import { validateBlocks } from '@transitrix/diagrams/blocks/validate.js';
import { renderBlocksSvg } from '@transitrix/diagrams/webview/render-blocks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const EXAMPLES_DIR = join(REPO_ROOT, 'notations', 'examples');
const OUT_DIR = join(REPO_ROOT, 'transitrix', 'examples');

function loadYaml(relPath) {
  const text = readFileSync(join(EXAMPLES_DIR, relPath), 'utf8');
  return coerceDatesToIsoStrings(yaml.load(text));
}

function fail(kind, errors) {
  const detail = (errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
  throw new Error(`${kind}: source failed validation${detail ? ` — ${detail}` : ''}`);
}

/** Goals — hierarchical tree, notations/04-goals.md. */
function generateGoals() {
  const doc = loadYaml('goals/strategy-2026.goals.transitrix.yaml');
  const result = parseCanonicalGoals(doc);
  if (!result.valid || !result.parsed) fail('goals', result.errors);
  const treeName = typeof doc.name === 'string' ? doc.name : '';
  return renderGoalsSvg(result.parsed, { treeName });
}

/** DGCA/DGA — Driver/Goal/Change/Action chain, notations/02-fgca.md. Self-contained
 * inline example (no canon-projection resolution needed). */
function generateDgca() {
  const doc = loadYaml('dgca/startup.dgca.transitrix.yaml');
  const result = parseCanonicalFGCA(doc);
  if (!result.valid || !result.parsed) fail('dgca', result.errors);
  const title = typeof doc.name === 'string' ? doc.name : '';
  return renderFgcaSvg(result.parsed, { variant: 'dgca', title });
}

/** Capability map — tree view, via the public renderCapabilityTreeSvg entry point. */
function generateCapabilityMap() {
  const doc = loadYaml('capability-map/business.capability-map.transitrix.yaml');
  const v = validateCapabilityMap(doc);
  if (!v.valid) fail('capability-map', v.errors);
  return renderCapabilityTreeSvg(doc.capability_map);
}

/** Process Blueprint — stage x aspect grid, notations/views/diagrams. */
function generateProcessBlueprint() {
  const doc = loadYaml('process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml');
  const v = validateProcessBlueprint(doc);
  if (!v.valid) fail('process-blueprint', v.errors);
  const title = doc.process_blueprint && typeof doc.process_blueprint.name === 'string'
    ? doc.process_blueprint.name
    : '';
  return renderProcessBlueprintSvg(doc, { title });
}

/** Action schedule — network (PSND) view of an Action document.
 * validateActivities normalises the canonical `actions:` root key onto
 * `doc.activities` in place, which is why the render call below reads
 * `doc` (not a separate `.parsed` field). */
function generateActionSchedule() {
  const doc = loadYaml('action/office-relocation.action.transitrix.yaml');
  const v = validateActivities(doc);
  if (!v.valid) fail('action', v.errors);
  const title = typeof doc.name === 'string' ? doc.name : '';
  return renderActivitiesSvg(doc, { title });
}

/** Nested blocks — tree form, notations/08-blocks.md. */
function generateBlocks() {
  const doc = loadYaml('blocks/architecture.blocks.transitrix.yaml');
  const v = validateBlocks(doc);
  if (!v.valid) fail('blocks', v.errors);
  const title = doc.nested_blocks && typeof doc.nested_blocks.name === 'string'
    ? doc.nested_blocks.name
    : '';
  return renderBlocksSvg(doc, { title });
}

const KINDS = [
  { key: 'goals', label: 'Goals', generate: generateGoals },
  { key: 'dgca', label: 'DGCA/DGA', generate: generateDgca },
  { key: 'capability-map', label: 'Capability map', generate: generateCapabilityMap },
  { key: 'process-blueprint', label: 'Process Blueprint', generate: generateProcessBlueprint },
  { key: 'action', label: 'Action schedule', generate: generateActionSchedule },
  { key: 'blocks', label: 'Nested blocks', generate: generateBlocks },
];

export function generateAll(outDir = OUT_DIR) {
  mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const { key, label, generate } of KINDS) {
    const svg = generate();
    if (typeof svg !== 'string' || !svg.startsWith('<svg')) {
      throw new Error(`${key}: renderer did not return a well-formed <svg> document`);
    }
    const out = svg.endsWith('\n') ? svg : `${svg}\n`;
    const outPath = join(outDir, `${key}.svg`);
    writeFileSync(outPath, out, 'utf8');
    written.push({ key, label, outPath });
  }
  return written;
}

// This module is always invoked as a CLI entry point (directly by a maintainer,
// or as a subprocess by the drift-check workflow) — never imported by another
// module — so it runs unconditionally rather than gating on an
// import.meta.url === argv[1] check, which is unreliable across platforms
// (Windows file:// URLs vs. drive-letter argv paths).
//
// Optional first CLI arg overrides the output directory (relative to the
// current working directory) so the drift check can regenerate into a
// scratch location and diff it against the committed transitrix/examples/
// without touching the working tree.
const targetDir = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : OUT_DIR;
const written = generateAll(targetDir);
for (const { key, label, outPath } of written) {
  console.log(`generated ${label} (${key}) -> ${outPath}`);
}
