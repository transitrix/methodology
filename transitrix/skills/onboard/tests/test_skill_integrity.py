#!/usr/bin/env python3
"""From-scratch install test for the Transitrix Onboarding Skill.

Deterministic, no-API-key "Skill-correctness" guard. Proves the Skill works
against a clean install: the bundle is intact, every template the SKILL.md
references exists / parses / carries the right canonical header, and the
representative Goals path instantiates into a clean repo and validates.

This is the PR-CI guard. The full LLM-driven persona walk-through (an agent
reading SKILL.md and producing the repo end-to-end) needs an API key and lives
in drive_skill_e2e.py, gated to the weekly cron. See tests/README.md for the
harness-choice rationale and the @transitrix/diagrams stand-in note.

Run:  python transitrix/skills/onboard/tests/test_skill_integrity.py
Exit: 0 = all checks pass; 1 = a check failed (message localises the problem).
"""

import os
import re
import shutil
import sys
import tempfile

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("FAIL: PyYAML is required (pip install pyyaml).")

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The 12 view notations the skill ships a template for (SKILL.md § Templates).
# Filename convention: <short>.<ext>.transitrix.yaml, with `notation: <short>` inside.
# Most notations use <ext> == <short>; DGCA-family notations share the dgca extension.
VIEW_NOTATIONS = [
    "bpmn", "dgca", "goals", "capability-map", "process-map",
    "action", "blocks", "scenarios", "applications", "products",
    "process-blueprint", "action-card",
]
NOTATION_EXT = {short: short for short in VIEW_NOTATIONS}
ROOT_TEMPLATES = ["transitrix.yaml", "AGENTS.md", "copilot-instructions.md"]
CODEX_TEMPLATES = ["codex-external.yaml", "codex-internal.yaml"]
EXTRACTION_FILES = ["01_motivation.md", "02_business.md", "03_application.md", "README.md"]

# Canonical ID grammar (IDS_AND_REFERENCES.md §1): <TYPE>-[<middle>-]<INTEGER>,
# uppercase TYPE, terminal positive integer with no leading zeros.
ID_RE = re.compile(r"^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def _load_yaml(path):
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _frontmatter(md_path):
    """Return the parsed YAML frontmatter of a markdown file (between --- fences)."""
    text = open(md_path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return yaml.safe_load(m.group(1)) if m else None


# ── Part A — bundle integrity (no workspace needed) ──────────────────────────

def check_bundle_integrity():
    tdir = os.path.join(SKILL_DIR, "templates")
    edir = os.path.join(SKILL_DIR, "extraction")

    check(os.path.isfile(os.path.join(SKILL_DIR, "SKILL.md")), "SKILL.md missing from bundle")
    check(os.path.isdir(tdir), "templates/ directory missing from bundle")

    # SKILL.md frontmatter is well-formed and declares the required keys.
    fm = _frontmatter(os.path.join(SKILL_DIR, "SKILL.md"))
    if check(isinstance(fm, dict), "SKILL.md frontmatter does not parse"):
        for key in ("name", "description", "when_to_use", "allowed-tools"):
            check(key in fm, f"SKILL.md frontmatter missing required key: {key}")

    # Root scaffolding + codex + extraction files exist.
    for f in ROOT_TEMPLATES + CODEX_TEMPLATES:
        check(os.path.isfile(os.path.join(tdir, f)), f"template missing: templates/{f}")
    for f in EXTRACTION_FILES:
        check(os.path.isfile(os.path.join(edir, f)), f"extraction file missing: extraction/{f}")

    # Every view-notation template exists, parses, and its notation header matches.
    for short in VIEW_NOTATIONS:
        ext = NOTATION_EXT[short]
        fname = f"{short}.{ext}.transitrix.yaml"
        path = os.path.join(tdir, fname)
        if not check(os.path.isfile(path), f"view template missing: templates/{fname}"):
            continue
        try:
            doc = _load_yaml(path)
        except yaml.YAMLError as e:
            check(False, f"view template does not parse: templates/{fname}: {e}")
            continue
        check(isinstance(doc, dict), f"view template is not a YAML mapping: templates/{fname}")
        if isinstance(doc, dict):
            check(doc.get("notation") == short,
                  f"templates/{fname}: notation header is {doc.get('notation')!r}, expected {short!r} (HDR-002)")

    # Codex templates parse and carry an admission record (no notation header by design).
    for f in CODEX_TEMPLATES:
        path = os.path.join(tdir, f)
        if os.path.isfile(path):
            try:
                doc = _load_yaml(path)
            except yaml.YAMLError as e:
                check(False, f"codex template does not parse: templates/{f}: {e}")
                continue
            check(isinstance(doc, dict) and doc.get("zone") == "codex",
                  f"templates/{f}: missing `zone: codex` admission record")

    # The manifest template is a valid adopter manifest (MANIFEST.md schema).
    man = os.path.join(tdir, "transitrix.yaml")
    if os.path.isfile(man):
        doc = _load_yaml(man)
        for key in ("transitrix", "methodology_version", "notations", "zones"):
            check(isinstance(doc, dict) and key in doc, f"templates/transitrix.yaml missing key: {key}")


# ── Goals structural validation — stand-in for @transitrix/diagrams validateGoals ─
# @transitrix/diagrams is not vendored into this repo (it ships separately), so we
# assert the structural invariants the canonical validateGoals enforces for the
# v2.0 pure-projection shape (notations/views/04-goals.md §6): the view document
# carries only a view_config over standalone GOAL element files; inline `goals[]`
# at document root is a hard error (GOALS-008). Element-level checks (parent
# cycles, type↔level consistency, ID grammar per goal) live on the standalone
# element files and are out of scope for a single-file view validator. When the
# package is available in CI, swap for the real parser (see tests/README.md).

def validate_goals(doc):
    errs = []
    if not isinstance(doc, dict):
        return ["goals document is not a YAML mapping"]
    if doc.get("notation") != "goals":
        errs.append(f"notation header is {doc.get('notation')!r}, expected 'goals' (GOALS-001)")
    gid = doc.get("id")
    if not (gid and ID_RE.match(str(gid))):
        errs.append(f"document id {gid!r} violates the canonical ID grammar (GOALS-002)")
    if not doc.get("name"):
        errs.append("document `name` is missing or empty (GOALS-003)")
    if "methodology_version" not in doc:
        errs.append("`methodology_version` is required from v2.0 (04-goals.md §5)")
    if "goals" in doc:
        errs.append("inline `goals[]` at document root — not accepted from v2.0 (GOALS-008); "
                    "GOAL elements are standalone files under canon/elements/01_motivation/goals/")

    vc = doc.get("view_config")
    if vc is not None and not isinstance(vc, dict):
        return errs + ["view_config is present but is not a YAML mapping"]

    goal_types = (vc or {}).get("goal_types")
    type_levels = {}
    if goal_types is not None:
        if not isinstance(goal_types, list) or not goal_types:
            errs.append("view_config.goal_types[] is present but empty (GOALS-004)")
        else:
            for i, t in enumerate(goal_types):
                if not (isinstance(t, dict) and t.get("name") and isinstance(t.get("level"), int)):
                    errs.append(f"view_config.goal_types[{i}] missing `name` or non-integer `level` (GOALS-004)")
                else:
                    type_levels[t["name"]] = t["level"]
            levels = sorted(t["level"] for t in goal_types
                            if isinstance(t, dict) and isinstance(t.get("level"), int))
            if levels and levels != list(range(len(levels))):
                errs.append(f"view_config.goal_types[].level values {levels} are not contiguous starting at 0 (GOALS-005)")

    scope = (vc or {}).get("scope") or {}
    type_filter = scope.get("type_filter")
    if isinstance(type_filter, list) and type_levels:
        for name in type_filter:
            if name not in type_levels:
                errs.append(f"view_config.scope.type_filter value {name!r} is not declared in goal_types[] (GOALS-007)")

    return errs


# ── Part B — clean install + representative Goals drive ──────────────────────

ZONE_SKELETON = [
    "canon/elements/01_motivation", "canon/elements/02_business",
    "canon/elements/03_application", "canon/elements/04_technology",
    "canon/views/goals", "field/interviews", "codex/external", "codex/internal",
]


def check_clean_install_goals_path():
    work = tempfile.mkdtemp(prefix="transitrix-installtest-")
    try:
        # 1. Plugin install is opaque (Claude Code's `/plugin install …` resolves
        #    a marketplace manifest, fetches the plugin source, and registers
        #    `/<plugin>:<skill>` for the session). Whatever directory the runtime
        #    materialises the plugin into is implementation-detail; this test
        #    treats the bundle source tree as the SKILL_DIR the agent will see.
        #    The plugin manifest lives at the PLUGIN root (transitrix/), not the
        #    skill dir — a multi-skill plugin carries one plugin.json above skills/.
        plugin_json = os.path.join(SKILL_DIR, "..", "..", ".claude-plugin", "plugin.json")
        check(os.path.isfile(plugin_json),
              "plugin manifest missing: transitrix/.claude-plugin/plugin.json")

        # 2. Drive the representative path deterministically against the bundle:
        #    scaffold the zoned skeleton (Step 2) and instantiate the Goals
        #    starter (Step 3) into an empty target repo.
        repo = os.path.join(work, "target-repo")
        for d in ZONE_SKELETON:
            os.makedirs(os.path.join(repo, d), exist_ok=True)
        tdir = os.path.join(SKILL_DIR, "templates")
        for f in ROOT_TEMPLATES:
            dest = os.path.join(repo, ".github") if f == "copilot-instructions.md" else repo
            os.makedirs(dest, exist_ok=True)
            shutil.copyfile(os.path.join(tdir, f), os.path.join(dest, f))
        goals_dest = os.path.join(repo, "canon/views/goals/strategy-2026.goals.transitrix.yaml")
        shutil.copyfile(os.path.join(tdir, "goals.goals.transitrix.yaml"), goals_dest)

        # 4. Assertions.
        check(os.path.isfile(os.path.join(repo, "transitrix.yaml")),
              "skeleton missing transitrix.yaml manifest at repo root")
        check(os.path.isfile(os.path.join(repo, "AGENTS.md")),
              "skeleton missing AGENTS.md at repo root")
        check(os.path.isfile(os.path.join(repo, ".github/copilot-instructions.md")),
              "skeleton missing .github/copilot-instructions.md")
        for d in ("canon", "field", "codex"):
            check(os.path.isdir(os.path.join(repo, d)), f"skeleton missing {d}/ zone")
        check(os.path.isfile(goals_dest), "starter Goals file was not authored")

        if os.path.isfile(goals_dest):
            errs = validate_goals(_load_yaml(goals_dest))
            for e in errs:
                check(False, f"authored Goals file fails validation: {e}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    check_bundle_integrity()
    check_clean_install_goals_path()
    if _failures:
        print(f"FAIL — {len(_failures)} check(s) failed:\n")
        for f in _failures:
            print(f"  ✗ {f}")
        return 1
    print("PASS — Transitrix Onboarding Skill install test: all checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
