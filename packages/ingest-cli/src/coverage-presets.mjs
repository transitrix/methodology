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
// RELEASE DISCIPLINE: on every methodology MINOR or MAJOR bump, update PRESETS_VERSION
// to match the new methodology_version and re-state each preset's element + relation
// lists against COVERAGE_PROFILES.md §3 / §3.1 for that release. This is a manual
// release step — run `node packages/ingest-cli/ingest.mjs repo-check <repo>` on a repo
// pinned to the new version to confirm no false-negative mismatch before tagging.

export const PRESETS_VERSION = '2.1.0';

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
      '02_business': ['parent', 'unit_parent', 'employment'],
      '05_implementation': ['action_goal'],
    },
  },
  // `full` is intentionally the sentinel — see resolveProfile(). No allowlist needed.
  full: 'ALL',
};

export const PRESET_NAMES = new Set(Object.keys(PRESETS));
