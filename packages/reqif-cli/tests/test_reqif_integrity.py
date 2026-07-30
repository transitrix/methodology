#!/usr/bin/env python3
"""Integration test for the ReqIF domain package's reference implementation —
@transitrix/reqif-cli (notations/packages/reqif.md).

Deterministic, no-API-key guard. Drives the real CLI end-to-end against the
worked example fixture (notations/examples/packages/reqif/):

  A. Validator — the worked example's reqif/ folder validates clean.
  B. Round trip — `roundtrip` exits 0 on the worked example: export then
     re-import produces an identical object set (the epic's round-trip
     success signal, HUB-828's own acceptance criterion).
  C. SpecRelation is a first-class file — its own file under spec-relations/,
     never an inline field on a spec-object file.
  D. Canon citation — at least one spec-object's Transitrix.CanonRef resolves,
     by id, to a REQUIREMENT actually present in the fixture's own canon/ —
     demonstrating the package → canon reference direction.
  E. Validator catches broken input — REQIF-001/003/004 each fire on a
     deliberately malformed fixture built in a temp dir.
  F. Removal is clean — deleting reqif/ and the `packages:` line from a copy
     of the worked example leaves canon/ valid with zero dangling references
     (PACKAGES.md §4.3), scoped to this task's own worked content.

Run:  python packages/reqif-cli/tests/test_reqif_integrity.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("FAIL: PyYAML is required (pip install pyyaml).")

HERE = os.path.dirname(os.path.abspath(__file__))          # packages/reqif-cli/tests
PKG_DIR = os.path.dirname(HERE)                             # packages/reqif-cli
REPO_ROOT = os.path.dirname(os.path.dirname(PKG_DIR))        # repo root
CLI = os.path.join(PKG_DIR, "reqif.mjs")
FIXTURE = Path(REPO_ROOT) / "notations" / "examples" / "packages" / "reqif"
REQIF_DIR = FIXTURE / "reqif"

PKG_ID_RE = re.compile(r"\b(sot|so|sr|sh)-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*\b")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def run_cli(*args):
    return subprocess.run(["node", CLI, *args], capture_output=True, text=True)


def load_yaml(path):
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


# ── Part A — validator clean on the worked example ──────────────────────

def part_a_validate_clean():
    r = run_cli("validate", str(REQIF_DIR))
    check(r.returncode == 0, f"A: validate exited {r.returncode} on the worked example: {r.stderr or r.stdout}")
    check("clean" in r.stdout, f"A: expected a clean validate report, got: {r.stdout!r}")


# ── Part B — round trip ──────────────────────────────────────────────────

def part_b_roundtrip():
    r = run_cli("roundtrip", str(REQIF_DIR))
    check(r.returncode == 0, f"B: roundtrip exited {r.returncode}: {r.stderr or r.stdout}")
    check("PASS" in r.stdout, f"B: expected roundtrip PASS, got: {r.stdout!r}")


# ── Part C — SpecRelation is first-class, not inline ─────────────────────

def part_c_spec_relation_first_class():
    rel_files = list((REQIF_DIR / "spec-relations").glob("*.yaml"))
    if not check(len(rel_files) >= 1, "C: expected at least one spec-relations/*.yaml file"):
        return
    rel = load_yaml(rel_files[0])
    check(rel.get("kind") == "spec-relation", f"C: {rel_files[0]}: kind is not spec-relation")
    check(bool(rel.get("source")) and bool(rel.get("target")), f"C: {rel_files[0]}: missing source/target")
    for so_file in (REQIF_DIR / "spec-objects").glob("*.yaml"):
        so = load_yaml(so_file)
        check("source" not in so and "target" not in so,
              f"C: {so_file}: a spec-object must not carry an inline relation field")


# ── Part D — the package → canon citation resolves within the fixture ────

def part_d_canon_citation_resolves():
    canon_ids = set()
    for f in (FIXTURE / "canon").rglob("*.yaml"):
        data = load_yaml(f)
        if data and data.get("id"):
            canon_ids.add(data["id"])
    found = False
    for f in (REQIF_DIR / "spec-objects").glob("*.yaml"):
        data = load_yaml(f)
        ref = (data.get("values") or {}).get("Transitrix.CanonRef")
        if ref:
            found = True
            check(ref in canon_ids, f"D: {f}: Transitrix.CanonRef {ref!r} does not resolve to a canon element in the fixture")
    check(found, "D: expected at least one spec-object citing a core REQUIREMENT/CONSTRAINT via Transitrix.CanonRef")


# ── Part E — validator catches broken input ───────────────────────────────

def part_e_validator_catches_broken_input():
    with tempfile.TemporaryDirectory(prefix="reqif-broken-") as td:
        broken = Path(td) / "reqif"
        for sub in ("spec-object-types", "spec-objects", "spec-relations", "spec-hierarchies"):
            (broken / sub).mkdir(parents=True)

        (broken / "spec-object-types" / "sot-x-1.yaml").write_text(
            'package: reqif\nkind: spec-object-type\nid: sot-x-1\nname: "X"\n'
            'attributes:\n  - key: "Transitrix.CanonRef"\n    datatype: STRING\n',
            encoding="utf-8",
        )
        (broken / "spec-objects" / "so-x-1.yaml").write_text(
            'package: reqif\nkind: spec-object\nid: so-x-1\ntype: sot-does-not-exist-1\n'
            'values:\n  Transitrix.CanonRef: "not-a-valid-id"\n',
            encoding="utf-8",
        )
        (broken / "spec-relations" / "sr-bad-1.yaml").write_text(
            'package: reqif\nkind: spec-relation\nid: BAD_ID-1\ntype: "elaborates"\n'
            'source: so-missing-1\ntarget: so-x-1\n',
            encoding="utf-8",
        )

        r = run_cli("validate", str(broken))
        combined = (r.stdout or "") + (r.stderr or "")
        check(r.returncode == 1, f"E: expected exit 1 on broken input, got {r.returncode}")
        for code in ("REQIF-001", "REQIF-003", "REQIF-004"):
            check(code in combined, f"E: expected {code} to fire on the broken fixture; got:\n{combined}")


# ── Part F — removal is clean (PACKAGES.md §4.3, scoped to this instance) ─

def part_f_removal_is_clean():
    with tempfile.TemporaryDirectory(prefix="reqif-removal-") as td:
        copy_root = Path(td) / "adopter"
        shutil.copytree(FIXTURE, copy_root)

        # Baseline, before removal: canon/ never references a reqif package id
        # (reversibility rule 1 — package → canon only, never the reverse).
        for f in (copy_root / "canon").rglob("*.yaml"):
            text = f.read_text(encoding="utf-8")
            check(not PKG_ID_RE.search(text), f"F: {f}: canon file references a reqif package id before removal (rule 1 violation)")

        shutil.rmtree(copy_root / "reqif")
        manifest_path = copy_root / "transitrix.yaml"
        text = manifest_path.read_text(encoding="utf-8")
        new_text = re.sub(r"^packages:.*\n", "", text, flags=re.MULTILINE)
        check(new_text != text, "F: expected a `packages:` line in transitrix.yaml to remove")
        manifest_path.write_text(new_text, encoding="utf-8")

        check(not (copy_root / "reqif").exists(), "F: reqif/ folder still present after removal")
        check("packages:" not in manifest_path.read_text(encoding="utf-8"), "F: packages: line still present after removal")

        for f in (copy_root / "canon").rglob("*.yaml"):
            text = f.read_text(encoding="utf-8")
            data = yaml.safe_load(text)
            check(bool(data and data.get("id")), f"F: {f}: canon element unreadable after package removal")
            check(not PKG_ID_RE.search(text), f"F: {f}: canon file references a reqif package id after removal — dangling reference")


if not shutil.which("node"):
    print("SKIP: `node` not found on PATH (the CLI is Node).")
    sys.exit(0)
if not os.path.isfile(CLI):
    sys.exit(f"FAIL: CLI entry point missing: {CLI}")

part_a_validate_clean()
part_b_roundtrip()
part_c_spec_relation_first_class()
part_d_canon_citation_resolves()
part_e_validator_catches_broken_input()
part_f_removal_is_clean()

if _failures:
    print("FAIL - ReqIF package integrity:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - ReqIF package (reqif-cli + worked example) integrity test: all checks passed.")
sys.exit(0)
