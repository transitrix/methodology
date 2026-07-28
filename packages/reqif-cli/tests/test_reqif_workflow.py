#!/usr/bin/env python3
"""Integration test for the ReqIF package's experimental surface — workflow
state, revision history, and suspect links (notations/packages/reqif.md
§2.9; vkgeorgia/strategy#813, task #829).

Deterministic, no-API-key guard. Drives the real CLI end-to-end against a
temp-dir copy of the worked fixture
(notations/examples/packages/reqif-workflow/) — the checked-in fixture is
never mutated:

  A. Validator — the worked example's reqif/ folder validates clean as
     checked in (workflow_state / revision on so-battery-shutdown-req-1 are
     grammar-valid; the rationale object's implicit default is `draft`).
  B. Workflow-state transitions are enforced — the single legal next step
     (`reviewed` -> `approved`) succeeds; skipping a state (`draft` ->
     `approved` on the rationale object, still implicitly `draft`) is
     rejected, exit 1, and leaves the object's state unchanged on disk.
  C. Revision history is queryable — `revise` bumps the revision counter and
     snapshots the pre-change values; `history` reports both the old and the
     new text, oldest first.
  D. Suspect links fire, and are distinguishable from "no relation exists" —
     the relation onto the just-revised object is reported `SUSPECT`; a
     relation whose target does not resolve at all never appears in the
     `suspect` report (a different, absence, case).
  E. Validator catches broken workflow/revision input — REQIF-008 (bad
     workflow_state) and REQIF-009 (non-integer revision / recorded_target_revision)
     each fire on a deliberately malformed fixture.

Run:  python packages/reqif-cli/tests/test_reqif_workflow.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("FAIL: PyYAML is required (pip install pyyaml).")

HERE = os.path.dirname(os.path.abspath(__file__))           # packages/reqif-cli/tests
PKG_DIR = os.path.dirname(HERE)                              # packages/reqif-cli
REPO_ROOT = os.path.dirname(os.path.dirname(PKG_DIR))         # repo root
CLI = os.path.join(PKG_DIR, "reqif.mjs")
FIXTURE = Path(REPO_ROOT) / "notations" / "examples" / "packages" / "reqif-workflow"
REQIF_DIR = FIXTURE / "reqif"

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def run_cli(*args):
    return subprocess.run(["node", CLI, *args], capture_output=True, text=True)


def load_yaml(path):
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def fresh_copy():
    td = tempfile.mkdtemp(prefix="reqif-workflow-")
    dst = Path(td) / "reqif"
    shutil.copytree(REQIF_DIR, dst)
    return dst


# ── Part A — validator clean on the worked example, as checked in ────────

def part_a_validate_clean():
    r = run_cli("validate", str(REQIF_DIR))
    check(r.returncode == 0, f"A: validate exited {r.returncode} on the worked example: {r.stderr or r.stdout}")
    check("clean" in r.stdout, f"A: expected a clean validate report, got: {r.stdout!r}")


# ── Part B — workflow-state transitions enforced ──────────────────────────

def part_b_transition_enforced():
    d = fresh_copy()

    r = run_cli("transition", str(d), "so-battery-shutdown-req-1", "approved")
    check(r.returncode == 0, f"B: expected the legal 'reviewed'->'approved' transition to succeed, got exit {r.returncode}: {r.stderr or r.stdout}")
    so = load_yaml(d / "spec-objects" / "so-battery-shutdown-req-1.yaml")
    check(so.get("workflow_state") == "approved", f"B: expected workflow_state 'approved' after transition, got {so.get('workflow_state')!r}")

    # so-battery-shutdown-rationale-1 carries no workflow_state -> implicit 'draft'.
    before = load_yaml(d / "spec-objects" / "so-battery-shutdown-rationale-1.yaml")
    check("workflow_state" not in before, "B: expected the rationale object to start with no workflow_state (implicit draft)")

    r2 = run_cli("transition", str(d), "so-battery-shutdown-rationale-1", "approved")
    check(r2.returncode == 1, f"B: expected skipping 'draft'->'approved' to be rejected (exit 1), got {r2.returncode}: {r2.stderr or r2.stdout}")
    after = load_yaml(d / "spec-objects" / "so-battery-shutdown-rationale-1.yaml")
    check("workflow_state" not in after, "B: a rejected transition must not modify the object's file on disk")

    shutil.rmtree(d.parent, ignore_errors=True)


# ── Part C — revision history queryable ───────────────────────────────────

def part_c_revise_and_history():
    d = fresh_copy()
    original = load_yaml(d / "spec-objects" / "so-battery-shutdown-req-1.yaml")
    old_text = original["values"]["ReqIF.Text"]
    new_text = "The system shall save all open state and power down gracefully once battery level falls below 8 percent."

    r = run_cli("revise", str(d), "so-battery-shutdown-req-1", "ReqIF.Text", new_text)
    check(r.returncode == 0, f"C: expected revise to succeed, got exit {r.returncode}: {r.stderr or r.stdout}")

    revised = load_yaml(d / "spec-objects" / "so-battery-shutdown-req-1.yaml")
    check(revised.get("revision") == 2, f"C: expected revision 2 after one revise, got {revised.get('revision')!r}")
    check(revised["values"]["ReqIF.Text"] == new_text, "C: expected the object's current text to be the revised text")
    revisions = revised.get("revisions") or []
    check(len(revisions) == 1, f"C: expected exactly one snapshot in revisions, got {len(revisions)}")
    if revisions:
        check(revisions[0]["values"]["ReqIF.Text"] == old_text, "C: expected the snapshot to hold the pre-revise text")

    h = run_cli("history", str(d), "so-battery-shutdown-req-1")
    check(h.returncode == 0, f"C: expected history to succeed, got exit {h.returncode}: {h.stderr or h.stdout}")
    check(old_text in h.stdout, "C: expected history output to include the old (superseded) text")
    check(new_text in h.stdout, "C: expected history output to include the current text")

    shutil.rmtree(d.parent, ignore_errors=True)


# ── Part D — suspect links fire, distinguishable from "no relation" ──────

def part_d_suspect_links():
    d = fresh_copy()

    before = run_cli("suspect", str(d))
    check(before.returncode == 0, f"D: expected suspect to succeed, got exit {before.returncode}: {before.stderr or before.stdout}")
    check("SUSPECT" not in before.stdout, f"D: expected no suspect relation before any revise, got:\n{before.stdout}")
    check("sr-battery-elaborates-1" in before.stdout, "D: expected the relation to be reported (not suspect) before any revise")

    run_cli("revise", str(d), "so-battery-shutdown-req-1", "ReqIF.Text", "Revised text for suspect-link demonstration.")

    after = run_cli("suspect", str(d))
    check(after.returncode == 0, f"D: expected suspect to succeed after revise, got exit {after.returncode}: {after.stderr or after.stdout}")
    check("SUSPECT" in after.stdout, f"D: expected sr-battery-elaborates-1 to be flagged SUSPECT after revising its target, got:\n{after.stdout}")

    # A relation whose target does not resolve at all is a different failure
    # mode (REQIF-004) and must never be reported by `suspect` — so a suspect
    # link is never visually indistinguishable from "no relation exists".
    (d / "spec-relations" / "sr-dangling-1.yaml").write_text(
        'package: reqif\nkind: spec-relation\nid: sr-dangling-1\ntype: "elaborates"\n'
        'source: so-battery-shutdown-rationale-1\ntarget: so-does-not-exist-1\n',
        encoding="utf-8",
    )
    dangling = run_cli("suspect", str(d))
    check("sr-dangling-1" not in dangling.stdout, "D: a relation with an unresolvable target must not appear in the suspect report")

    shutil.rmtree(d.parent, ignore_errors=True)


# ── Part E — validator catches broken workflow/revision input ────────────

def part_e_validator_catches_broken_input():
    with tempfile.TemporaryDirectory(prefix="reqif-workflow-broken-") as td:
        broken = Path(td) / "reqif"
        for sub in ("spec-object-types", "spec-objects", "spec-relations", "spec-hierarchies"):
            (broken / sub).mkdir(parents=True)

        (broken / "spec-object-types" / "sot-x-1.yaml").write_text(
            'package: reqif\nkind: spec-object-type\nid: sot-x-1\nname: "X"\n'
            'attributes:\n  - key: "ReqIF.Text"\n    datatype: STRING\n',
            encoding="utf-8",
        )
        (broken / "spec-objects" / "so-x-1.yaml").write_text(
            'package: reqif\nkind: spec-object\nid: so-x-1\ntype: sot-x-1\n'
            'workflow_state: "not-a-real-state"\nrevision: "two"\n'
            'values:\n  ReqIF.Text: "hello"\n',
            encoding="utf-8",
        )
        (broken / "spec-objects" / "so-y-1.yaml").write_text(
            'package: reqif\nkind: spec-object\nid: so-y-1\ntype: sot-x-1\n'
            'values:\n  ReqIF.Text: "world"\n',
            encoding="utf-8",
        )
        (broken / "spec-relations" / "sr-x-1.yaml").write_text(
            'package: reqif\nkind: spec-relation\nid: sr-x-1\ntype: "elaborates"\n'
            'source: so-y-1\ntarget: so-x-1\nrecorded_target_revision: "one"\n',
            encoding="utf-8",
        )

        r = run_cli("validate", str(broken))
        combined = (r.stdout or "") + (r.stderr or "")
        check(r.returncode == 1, f"E: expected exit 1 on broken input, got {r.returncode}")
        for code in ("REQIF-008", "REQIF-009"):
            check(code in combined, f"E: expected {code} to fire on the broken fixture; got:\n{combined}")


if not shutil.which("node"):
    print("SKIP: `node` not found on PATH (the CLI is Node).")
    sys.exit(0)
if not os.path.isfile(CLI):
    sys.exit(f"FAIL: CLI entry point missing: {CLI}")

part_a_validate_clean()
part_b_transition_enforced()
part_c_revise_and_history()
part_d_suspect_links()
part_e_validator_catches_broken_input()

if _failures:
    print("FAIL - ReqIF package workflow-state/revisions/suspect-links integration test:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - ReqIF package experimental surface (workflow-state, revisions, suspect links): all checks passed.")
sys.exit(0)
