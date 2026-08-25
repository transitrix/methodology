// Shipped coverage presets — the §3 / §3.1 tables of COVERAGE_PROFILES.md, encoded
// so the CLI can resolve preset membership instead of guessing. These are pinned to a
// methodology version (see VERSION below): the same preset name resolves to a
// different vocabulary in a different methodology release (§3, §7). When the
// methodology bumps and re-states a preset, update this table in lockstep.
//
// Stored per layer (so a custom profile can `disabled:`/`remove:` a whole layer and
// resolve correctly); the resolver flattens to membership sets. `full` is the sentinel
// "everything" — it carries no allowlist because every registry TYPE / REL kind is in.
//
// RELEASE DISCIPLINE: on EVERY methodology release — PATCH included — update
// PRESETS_VERSION to match the new methodology_version, and re-state each preset's
// element + relation lists against COVERAGE_PROFILES.md §3 / §3.1 for that release.
//
// PATCH is included because repo-check compares this string to the adopter's declared
// `methodology_version` for exact equality (repo-check.mjs — `tooling.ok`), so any
// divergence at all, of any bump size, reports a false stale-CLI mismatch. That is not
// hypothetical: this constant sat at 2.1.0 across the 3.2.0 → 3.6.0 releases, leaving
// `tooling.ok` permanently false for every correctly pinned adopter (transitrix-hq#199).
//
// Both halves of the step are now mechanical rather than remembered — `PRESETS1` in
// scripts/check-notations.mjs fails CI when PRESETS_VERSION diverges from
// notations/CURRENT_VERSION.yaml, or when the tables below stop matching the §3 / §3.1
// tables they encode. A release PR that bumps the pin and not this file cannot go green.

export const PRESETS_VERSION = '3.7.0';

export const LAYERS = ['01_motivation', '02_business', '03_application', '04_technology', '05_implementation'];

// elements + relations per layer. Layers with nothing in a preset are simply absent.
export const PRESETS = {
  minimal: {
    elements: {
      '01_motivation': ['DRIVER', 'GOAL'],
      '05_implementation': ['ACTION'],
    },
    relations: {
      '01_motivation': ['goal_parent'],
      '05_implementation': ['action_goal'],
    },
  },
  core: {
    elements: {
      '01_motivation': ['DRIVER', 'GOAL', 'CONSTRAINT', 'REQUIREMENT', 'STAKEHOLDER'],
      '02_business': ['CAPABILITY', 'PROCESS', 'ACTOR', 'ROLE', 'RULE'],
      '03_application': ['APPLICATION', 'INTEGRATION'],
      '05_implementation': ['ACTION', 'CHANGE', 'MILESTONE'],
    },
    relations: {
      '01_motivation': ['goal_parent', 'stakeholding', 'depends_on'],
      '02_business': ['parent', 'process_parent', 'unit_parent', 'employment'],
      '05_implementation': ['action_goal'],
    },
  },
  // `full` is intentionally the sentinel — see resolveProfile(). No allowlist needed.
  full: 'ALL',
};

export const PRESET_NAMES = new Set(Object.keys(PRESETS));
