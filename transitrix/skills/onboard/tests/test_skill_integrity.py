#!/usr/bin/env python3
"""From-scratch install test for the Transitrix Onboarding Skill (strategy#56).

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

# The 14 view notations the skill ships a template for (SKILL.md § Templates).
# Filename convention: <short>.<short>.transitrix.yaml, with `notation: <short>` inside.
VIEW_NOTATIONS = [
    "bpmn", "fgca", "fga", "goals", "capability-map", "process-map",
    "activities", "blocks", "scenarios", "applications", "products",
    "issues", "process-blueprint", "activity-card",
]
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
        fname = f"{short}.{short}.transitrix.yaml"
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
# assert the structural invariants the canonical validateGoals enforces. When the
# package is available in CI, replace this with the real parser (see tests/README.md).

def validate_goals(doc):
    errs = []
    if not isinstance(doc, dict):
        return ["goals document is not a YAML mapping"]
    if doc.get("notation") != "goals":
        errs.append(f"notation header is {doc.get('notation')!r}, expected 'goals' (HDR-002)")
    type_levels = {t["name"]: t["level"] for t in doc.get("goal_types", []) if isinstance(t, dict)}
    if not type_levels:
        errs.append("goal_types[] is missing or empty")
    goals = doc.get("goals", [])
    if not isinstance(goals, list) or not goals:
        return errs + ["goals[] is missing or empty"]
    by_id = {g.get("id"): g for g in goals if isinstance(g, dict)}
    for g in goals:
        gid = g.get("id")
        if not (gid and ID_RE.match(str(gid))):
            errs.append(f"goal id {gid!r} violates the canonical ID grammar")
        if not g.get("name"):
            errs.append(f"goal {gid!r} missing name")
        gtype, level = g.get("type"), g.get("level")
        if gtype not in type_levels:
            errs.append(f"goal {gid!r} type {gtype!r} not declared in goal_types[]")
        elif level != type_levels[gtype]:
            errs.append(f"goal {gid!r} level {level} != goal_types[{gtype!r}].level {type_levels[gtype]}")
        parent = g.get("parent")
        if parent is not None:
            if parent not in by_id:
                errs.append(f"goal {gid!r} parent {parent!r} does not resolve in this document")
            elif isinstance(level, int) and isinstance(by_id[parent].get("level"), int):
                if level != by_id[parent]["level"] + 1:
                    errs.append(f"goal {gid!r} level {level} is not parent level + 1 (GOALS-012)")
    if not any(g.get("parent") is None for g in goals):
        errs.append("goals tree has no root (every goal has a parent)")
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
