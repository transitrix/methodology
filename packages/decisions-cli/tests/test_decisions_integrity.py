#!/usr/bin/env python3
"""Integration test for the shared human-gate admission decision contract's
reference implementation — @transitrix/decisions-cli (hub ADR
architecture/methodology/2026-07-28-ingest-admission-decision-contract.md).

Deterministic, no-API-key, no-network guard. Drives the real CLI end-to-end
against synthetic fixtures for both source gates it must answer:

  A. Ingest review-queue.yaml — list-undecided / record / apply on a
     pre-canon JSON candidate: apply reports not_admission_state_bearing
     rather than silently skipping it or fabricating a transition.
  B. Reg-intel review-digest.yaml — list-undecided / record / apply across
     a SEGMENT, four REQUIREMENT candidates, and an AMENDMENT:
       - accept -> admission_state: active (+ admitted_at/by, gate_checks
         all pass, reviewer_authority default expert_confirmed);
       - reject -> admission_state: rejected (+ rejected_at/by/reason);
       - defer  -> no_transition; artefact untouched (ADR §3);
       - ADMIT-007: a tool `by` may only carry ai_reviewed, a human `by`
         may only carry expert_confirmed — both mismatches are refused,
         not silently coerced.
  C. `record` validation — reject without --reason, an unknown --decision,
     and --reviewer-authority on a non-accept row are all refused.
  D. Re-running `apply` is safe: an already-active/rejected artefact comes
     back not_proposed rather than being re-transitioned or crashing.
  E. Schema conformance — the decisions.reviewed.yaml `apply` just read
     back satisfies schemas/decisions-reviewed.schema.json's required
     top-level keys, the decisions[] row shape, and its enums.

Run:  python packages/decisions-cli/tests/test_decisions_integrity.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

import json
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

HERE = os.path.dirname(os.path.abspath(__file__))           # packages/decisions-cli/tests
PKG_DIR = os.path.dirname(HERE)                              # packages/decisions-cli
CLI = os.path.join(PKG_DIR, "decisions.mjs")
SCHEMA_PATH = os.path.join(PKG_DIR, "schemas", "decisions-reviewed.schema.json")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def run_cli(*args):
    return subprocess.run(["node", CLI, *args], capture_output=True, text=True)


def write(path, text):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding="utf-8")


def load_yaml(path):
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def read_text(path):
    return Path(path).read_text(encoding="utf-8")


# ── Part A — ingest review-queue.yaml: list-undecided / record / apply ───

def part_a_ingest_review_queue():
    with tempfile.TemporaryDirectory(prefix="decisions-ingest-") as td:
        org = Path(td)
        processing = org / "_intake" / "processing"
        cand_dir = processing / "candidates"
        cand_dir.mkdir(parents=True)

        cand1 = cand_dir / "cand-1.json"
        cand2 = cand_dir / "cand-2.json"
        cand1.write_text(json.dumps({"kind": "element", "element_type": "PRODUCT", "admitted_to": "pending"}), encoding="utf-8")
        cand2.write_text(json.dumps({"kind": "relation", "admitted_to": "pending"}), encoding="utf-8")

        # review-queue.yaml candidates carry the candidate file's *resolved*
        # (absolute) path as `ref`, per review-queue.mjs's loadCandidates
        # (join(candidatesDir, name)) when the CLI is invoked with an
        # absolute candidates dir — the real-world invocation shape.
        ref1, ref2 = str(cand1), str(cand2)
        write(processing / "review-queue.yaml", (
            'generated_by: "@transitrix/ingest-cli"\n'
            f'org_root: "{org}"\n'
            'field_artefacts: []\n'
            'candidates:\n'
            f'  - ref: "{ref1}"\n'
            '    kind: "element"\n'
            f'  - ref: "{ref2}"\n'
            '    kind: "relation"\n'
        ))

        r = run_cli("list-undecided", str(org))
        check(r.returncode == 1, f"A: list-undecided expected exit 1 (items pending), got {r.returncode}: {r.stderr}")
        check("total: 2  decided: 0  undecided: 2" in r.stdout, f"A: expected 2 undecided, got: {r.stdout!r}")

        r = run_cli("record", str(org), "--item-ref", ref1, "--decision", "accept", "--by", "v.reviewer", "--at", "2026-07-29", "--kind", "element")
        check(r.returncode == 0, f"A: record (accept) failed: {r.stderr or r.stdout}")

        decisions_path = processing / "decisions.reviewed.yaml"
        check(decisions_path.is_file(), "A: decisions.reviewed.yaml was not created")
        doc = load_yaml(decisions_path)
        check(len(doc.get("decisions", [])) == 1, f"A: expected 1 decision row after first record, got {doc.get('decisions')}")
        check(doc["gate"]["admits_to_canon"] is False, "A: gate.admits_to_canon must be false")

        # Idempotent upsert: a second record for the same item_ref replaces, not duplicates.
        r = run_cli("record", str(org), "--item-ref", ref1, "--decision", "accept", "--by", "v.reviewer", "--at", "2026-07-29", "--kind", "element")
        check(r.returncode == 0, f"A: second record (upsert) failed: {r.stderr or r.stdout}")
        doc = load_yaml(decisions_path)
        check(len(doc.get("decisions", [])) == 1, f"A: upsert must not duplicate the row, got {doc.get('decisions')}")

        r = run_cli("list-undecided", str(org))
        check("total: 2  decided: 1  undecided: 1" in r.stdout, f"A: expected 1 undecided after recording ref1, got: {r.stdout!r}")

        r = run_cli("apply", str(org))
        check(r.returncode == 1, f"A: apply expected exit 1 (not_admission_state_bearing counts as unapplied), got {r.returncode}: {r.stderr}")
        check("not_admission_state_bearing" in r.stdout, f"A: expected not_admission_state_bearing outcome for a pre-canon ingest candidate, got: {r.stdout!r}")

        # The pre-canon JSON candidate must be left byte-identical — apply never
        # fabricates a transition it cannot ground in an admission_state field.
        check(json.loads(cand1.read_text(encoding="utf-8")) == {"kind": "element", "element_type": "PRODUCT", "admitted_to": "pending"},
              "A: apply must not modify a not_admission_state_bearing candidate file")


# ── Fixtures for Part B — an admission_state: proposed artefact ──────────

def proposed_artefact_yaml(kind_zone="canon"):
    return (
        f"zone: {kind_zone}\n"
        "admission_state: proposed\n"
        'proposed_at: "2026-07-27"\n'
        "proposed_by: reg-intel-scanner\n"
        "gate_checks:\n"
        "  uniqueness: pass\n"
        "  consistency: pass\n"
        "  completeness: pending_review\n"
    )


# ── Part B — reg-intel review-digest.yaml: full accept/reject/defer + ADMIT-007 ──

def part_b_reg_intel_review_digest():
    # Deliberately not a `with TemporaryDirectory()` block: the returned org root
    # must survive into Part D / E, which re-run `apply` and inspect this same
    # batch. main() removes it via cleanup_org() once Part E is done.
    org = Path(tempfile.mkdtemp(prefix="decisions-reg-intel-"))
    processing = org / "_intake" / "processing"

    write(processing / "segments" / "SEGMENT-gdpr-1.yaml", proposed_artefact_yaml("field"))
    for ref in ("REQUIREMENT-gdpr-3", "REQUIREMENT-gdpr-4", "REQUIREMENT-gdpr-5", "REQUIREMENT-gdpr-6"):
        write(processing / "candidates" / f"{ref}.yaml", proposed_artefact_yaml("canon"))
    write(processing / "amendments" / "AMENDMENT-gdpr-1.yaml", proposed_artefact_yaml("field"))

    write(processing / "review-digest.yaml", (
        'generated_by: "@transitrix/reg-intel-cli"\n'
        f'org_root: "{org}"\n'
        "sources:\n"
        "  - id: CODEX-gdpr-1\n"
        "    segments:\n"
        "      - id: SEGMENT-gdpr-1\n"
        "    candidates:\n"
        "      - id: REQUIREMENT-gdpr-3\n"
        "        kind: requirement\n"
        "      - id: REQUIREMENT-gdpr-4\n"
        "        kind: requirement\n"
        "      - id: REQUIREMENT-gdpr-5\n"
        "        kind: requirement\n"
        "      - id: REQUIREMENT-gdpr-6\n"
        "        kind: requirement\n"
        "    amendments:\n"
        "      - id: AMENDMENT-gdpr-1\n"
    ))

    r = run_cli("list-undecided", str(org))
    check("total: 6  decided: 0  undecided: 6" in r.stdout, f"B: expected 6 undecided gate items, got: {r.stdout!r}")

    def record(item_ref, decision, by, reason=None, reviewer_authority=None):
        args = [str(org), "--item-ref", item_ref, "--decision", decision, "--by", by, "--at", "2026-07-29"]
        if reason:
            args += ["--reason", reason]
        if reviewer_authority:
            args += ["--reviewer-authority", reviewer_authority]
        r = run_cli("record", *args)
        check(r.returncode == 0, f"B: record {item_ref} ({decision}) failed: {r.stderr or r.stdout}")

    record("SEGMENT-gdpr-1", "reject", "j.reviewer", reason="duplicate of existing segment")
    record("REQUIREMENT-gdpr-3", "accept", "j.reviewer", reason="matches Art. 17 obligation")
    record("REQUIREMENT-gdpr-4", "accept", "reg-intel-scanner", reviewer_authority="expert_confirmed")  # mismatch: tool + expert_confirmed
    record("REQUIREMENT-gdpr-5", "accept", "j.reviewer", reviewer_authority="ai_reviewed")              # mismatch: human + ai_reviewed
    record("REQUIREMENT-gdpr-6", "accept", "reg-intel-scanner", reviewer_authority="ai_reviewed")        # valid: tool + ai_reviewed
    record("AMENDMENT-gdpr-1", "defer", "j.reviewer")

    r = run_cli("list-undecided", str(org))
    check("total: 6  decided: 6  undecided: 0" in r.stdout, f"B: expected all 6 decided, got: {r.stdout!r}")

    r = run_cli("apply", str(org))
    out = r.stdout
    check(r.returncode == 1, f"B: apply expected exit 1 (2 ADMIT-007 mismatches unapplied), got {r.returncode}: {r.stderr}")

    def outcome_for(item_ref):
        for line in out.splitlines():
            if line.startswith(item_ref):
                return line
        return None

    seg_line = outcome_for("SEGMENT-gdpr-1")
    check(seg_line is not None and "rejected" in seg_line, f"B: SEGMENT-gdpr-1 expected outcome rejected, got: {seg_line!r}")
    seg_doc = read_text(processing / "segments" / "SEGMENT-gdpr-1.yaml")
    check('admission_state: "rejected"' in seg_doc, f"B: SEGMENT-gdpr-1.yaml not flipped to rejected:\n{seg_doc}")
    check('rejected_by: "j.reviewer"' in seg_doc and "rejection_reason:" in seg_doc, f"B: SEGMENT-gdpr-1.yaml missing rejected_by/rejection_reason:\n{seg_doc}")

    req3_line = outcome_for("REQUIREMENT-gdpr-3")
    check(req3_line is not None and " active" in req3_line, f"B: REQUIREMENT-gdpr-3 expected outcome active, got: {req3_line!r}")
    req3_doc = read_text(processing / "candidates" / "REQUIREMENT-gdpr-3.yaml")
    check('admission_state: "active"' in req3_doc, f"B: REQUIREMENT-gdpr-3.yaml not flipped to active:\n{req3_doc}")
    check('admitted_by: "j.reviewer"' in req3_doc, f"B: REQUIREMENT-gdpr-3.yaml missing admitted_by:\n{req3_doc}")
    check('reviewer_authority: "expert_confirmed"' in req3_doc, f"B: REQUIREMENT-gdpr-3.yaml expected default expert_confirmed:\n{req3_doc}")
    check('completeness: "pass"' in req3_doc, f"B: REQUIREMENT-gdpr-3.yaml gate_checks not flipped to pass:\n{req3_doc}")

    req4_line = outcome_for("REQUIREMENT-gdpr-4")
    check(req4_line is not None and "admit_007_mismatch" in req4_line, f"B: REQUIREMENT-gdpr-4 expected admit_007_mismatch, got: {req4_line!r}")
    req4_doc = read_text(processing / "candidates" / "REQUIREMENT-gdpr-4.yaml")
    check("admission_state: proposed" in req4_doc, "B: REQUIREMENT-gdpr-4.yaml must stay proposed after a refused ADMIT-007 combo")

    req5_line = outcome_for("REQUIREMENT-gdpr-5")
    check(req5_line is not None and "admit_007_mismatch" in req5_line, f"B: REQUIREMENT-gdpr-5 expected admit_007_mismatch, got: {req5_line!r}")
    req5_doc = read_text(processing / "candidates" / "REQUIREMENT-gdpr-5.yaml")
    check("admission_state: proposed" in req5_doc, "B: REQUIREMENT-gdpr-5.yaml must stay proposed after a refused ADMIT-007 combo")

    req6_line = outcome_for("REQUIREMENT-gdpr-6")
    check(req6_line is not None and " active" in req6_line, f"B: REQUIREMENT-gdpr-6 expected outcome active, got: {req6_line!r}")
    req6_doc = read_text(processing / "candidates" / "REQUIREMENT-gdpr-6.yaml")
    check('admitted_by: "reg-intel-scanner"' in req6_doc, f"B: REQUIREMENT-gdpr-6.yaml missing tool admitted_by:\n{req6_doc}")
    check('reviewer_authority: "ai_reviewed"' in req6_doc, f"B: REQUIREMENT-gdpr-6.yaml expected ai_reviewed:\n{req6_doc}")

    amend_line = outcome_for("AMENDMENT-gdpr-1")
    check(amend_line is not None and "no_transition" in amend_line, f"B: AMENDMENT-gdpr-1 expected no_transition (defer), got: {amend_line!r}")
    amend_doc = read_text(processing / "amendments" / "AMENDMENT-gdpr-1.yaml")
    check("admission_state: proposed" in amend_doc, "B: a deferred artefact must remain proposed — defer is audit-only (ADR §3)")

    return org  # handed to Part D / E — same batch, already applied once


# ── Part C — `record` validation guards ───────────────────────────────────

def part_c_record_validation():
    with tempfile.TemporaryDirectory(prefix="decisions-validate-") as td:
        org = Path(td)
        processing = org / "_intake" / "processing"
        write(processing / "review-queue.yaml", (
            'generated_by: "@transitrix/ingest-cli"\n'
            f'org_root: "{org}"\n'
            "field_artefacts: []\n"
            "candidates:\n"
            '  - ref: "cand-x"\n'
            '    kind: "element"\n'
        ))

        r = run_cli("record", str(org), "--item-ref", "cand-x", "--decision", "reject", "--by", "v.reviewer", "--at", "2026-07-29")
        check(r.returncode == 1, f"C: record reject without --reason expected exit 1, got {r.returncode}")
        check("--reason is required" in (r.stderr or ""), f"C: expected a --reason-required message, got: {r.stderr!r}")

        r = run_cli("record", str(org), "--item-ref", "cand-x", "--decision", "maybe", "--by", "v.reviewer", "--at", "2026-07-29")
        check(r.returncode == 1, f"C: record with an invalid --decision expected exit 1, got {r.returncode}")
        check("accept|reject|defer" in (r.stderr or ""), f"C: expected the decision enum in the error, got: {r.stderr!r}")

        r = run_cli("record", str(org), "--item-ref", "cand-x", "--decision", "reject", "--by", "v.reviewer", "--at", "2026-07-29", "--reason", "x", "--reviewer-authority", "expert_confirmed")
        check(r.returncode == 1, f"C: --reviewer-authority on a reject expected exit 1, got {r.returncode}")
        check("only meaningful with --decision accept" in (r.stderr or ""), f"C: expected the accept-only message, got: {r.stderr!r}")


# ── Part D — re-running `apply` is safe (already-transitioned artefacts) ──

def part_d_apply_is_idempotent(org):
    r = run_cli("apply", str(org))
    check(r.returncode == 1, f"D: second apply run expected exit 1 (still 2 ADMIT-007 mismatches), got {r.returncode}: {r.stderr}")
    lines = r.stdout.splitlines()

    def outcome_for(item_ref):
        for line in lines:
            if line.startswith(item_ref):
                return line
        return None

    req3_line = outcome_for("REQUIREMENT-gdpr-3")
    check(req3_line is not None and "not_proposed" in req3_line, f"D: re-applying an already-active artefact expected not_proposed, got: {req3_line!r}")
    seg_line = outcome_for("SEGMENT-gdpr-1")
    check(seg_line is not None and "not_proposed" in seg_line, f"D: re-applying an already-rejected artefact expected not_proposed, got: {seg_line!r}")


# ── Part E — schema conformance of the on-disk decisions.reviewed.yaml ────

def part_e_schema_conformance(org):
    schema = json.loads(Path(SCHEMA_PATH).read_text(encoding="utf-8"))
    doc = load_yaml(org / "_intake" / "processing" / "decisions.reviewed.yaml")

    for key in schema["required"]:
        check(key in doc, f"E: decisions.reviewed.yaml missing schema-required top-level key {key!r}")

    check(doc.get("gate", {}).get("admits_to_canon") is False, "E: gate.admits_to_canon must be false (schema const)")

    row_required = schema["properties"]["decisions"]["items"]["required"]
    decision_enum = schema["properties"]["decisions"]["items"]["properties"]["decision"]["enum"]
    authority_enum = schema["properties"]["decisions"]["items"]["properties"]["reviewer_authority"]["enum"]
    rows = doc.get("decisions", [])
    check(len(rows) == 6, f"E: expected 6 decision rows recorded in Part B, got {len(rows)}")
    for row in rows:
        for key in row_required:
            check(key in row, f"E: decision row {row.get('item_ref')} missing schema-required key {key!r}")
        check(row["decision"] in decision_enum, f"E: decision row {row.get('item_ref')} has decision {row['decision']!r} outside the schema enum")
        if "reviewer_authority" in row:
            check(row["reviewer_authority"] in authority_enum, f"E: decision row {row.get('item_ref')} has reviewer_authority {row['reviewer_authority']!r} outside the schema enum")


if not shutil.which("node"):
    print("SKIP: `node` not found on PATH (the CLI is Node).")
    sys.exit(0)
if not os.path.isfile(CLI):
    sys.exit(f"FAIL: CLI entry point missing: {CLI}")
if not os.path.isfile(SCHEMA_PATH):
    sys.exit(f"FAIL: schema missing: {SCHEMA_PATH}")

part_a_ingest_review_queue()
_reg_intel_org = part_b_reg_intel_review_digest()
part_c_record_validation()
part_d_apply_is_idempotent(_reg_intel_org)
part_e_schema_conformance(_reg_intel_org)
shutil.rmtree(_reg_intel_org, ignore_errors=True)

if _failures:
    print("FAIL - decisions-cli integrity:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - decisions-cli (shared admission decision package) integrity test: all checks passed.")
sys.exit(0)
