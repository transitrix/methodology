#!/usr/bin/env python3
"""From-scratch pipeline test for the Transitrix Ingest skill + @transitrix/ingest-cli.

Deterministic, no-API-key guard. Three parts:

  A. Bundle integrity — SKILL.md frontmatter, the three JSON schemas parse, the
     three layer prompts + READMEs exist, the _intake template is present.
  B. CLI pipeline drive — runs the real CLI end-to-end on a fixture
     (scaffold-intake -> convert -> field-artefact -> emit-candidates -> validate
     -> review-queue) and asserts the outputs: a conformant field artefact with a
     proposed source_quality, candidate files, a review queue with the gate closed,
     the two-axes rule (a candidate carrying source_quality is flagged), and THE ONE
     RULE — canon/ is never written.
  C. IG-5 regressions — the three rehearsal-found defects: capability V/H ID is
     accepted, a non-closed rel_kind is flagged, derived_from merges across sources.

This is the PR-CI guard. The LLM-driven walk-through lives in drive_ingest_e2e.py,
gated to the weekly cron. See tests/README.md.

Run:  python transitrix/skills/ingest/tests/test_ingest_integrity.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("FAIL: PyYAML is required (pip install pyyaml).")

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)                                  # transitrix/skills/ingest
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SKILL_DIR)))
CLI = os.path.join(REPO_ROOT, "packages", "ingest-cli", "ingest.mjs")
FIXTURES = os.path.join(HERE, "fixtures")

ID_RE = re.compile(r"^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$")
SOURCE_HASH_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
SOURCE_QUALITY = {"authoritative", "corroborated", "single_source", "unverified"}

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def frontmatter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return yaml.safe_load(m.group(1)) if m else None


# ── Part A — bundle integrity ───────────────────────────────────

def part_a_bundle():
    skill = os.path.join(SKILL_DIR, "SKILL.md")
    if check(os.path.isfile(skill), "SKILL.md missing from bundle"):
        fm = frontmatter(skill)
        if check(isinstance(fm, dict), "SKILL.md frontmatter does not parse"):
            for key in ("name", "description", "when_to_use", "allowed-tools"):
                check(key in fm, f"SKILL.md frontmatter missing required key: {key}")

    for short in ("field-artefact", "candidate", "review-queue"):
        p = os.path.join(SKILL_DIR, "schemas", f"{short}.schema.json")
        if check(os.path.isfile(p), f"schema missing: schemas/{short}.schema.json"):
            try:
                json.load(open(p, encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                check(False, f"schema does not parse: schemas/{short}.schema.json: {e}")

    for prompt in ("01_motivation", "02_business", "03_application"):
        p = os.path.join(SKILL_DIR, "prompts", f"{prompt}.md")
        if check(os.path.isfile(p), f"prompt missing: prompts/{prompt}.md"):
            check(isinstance(frontmatter(p), dict), f"prompt frontmatter does not parse: prompts/{prompt}.md")

    check(os.path.isfile(os.path.join(SKILL_DIR, "prompts", "README.md")), "prompts/README.md missing")
    check(os.path.isfile(os.path.join(SKILL_DIR, "templates", "_intake.README.md")), "templates/_intake.README.md missing")
    check(os.path.isfile(CLI), "CLI entry point missing: packages/ingest-cli/ingest.mjs")


# ── Part B — CLI pipeline drive ──────────────────────────────────

def run_cli(*args):
    return subprocess.run(["node", CLI, *args], capture_output=True, text=True)


def part_b_pipeline():
    if not shutil.which("node"):
        print("SKIP Part B: `node` not found on PATH (the CLI is Node).")
        return
    if not check(os.path.isfile(CLI), "cannot drive the pipeline: CLI missing"):
        return

    work = tempfile.mkdtemp(prefix="ingest-integrity-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)

        r = run_cli("scaffold-intake", org)
        check(r.returncode == 0, f"scaffold-intake failed: {r.stderr.strip()}")

        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write("transitrix: 1\nmethodology_version: \"0.5.0\"\ncoverage_profile: full\n")

        raw_src = os.path.join(FIXTURES, "raw", "INTERVIEW-sample.md")
        expected_hash = "sha256:" + hashlib.sha256(open(raw_src, "rb").read()).hexdigest()
        shutil.copy(raw_src, os.path.join(org, "_intake", "inbox", "INTERVIEW-sample.md"))

        r = run_cli("convert", os.path.join(org, "_intake", "inbox", "INTERVIEW-sample.md"))
        check(r.returncode == 0, f"convert failed: {r.stderr.strip()}")
        md = os.path.join(org, "_intake", "processing", "INTERVIEW-sample.md")
        check(os.path.isfile(md), "convert did not produce processing/INTERVIEW-sample.md")

        r = run_cli("field-artefact", md, "--type", "INTERVIEW", "--role", "Head of Operations",
                    "--date", "2026-04-15", "--slug", "ops", "--admitted-at", "2026-04-16",
                    "--captured-by", "integrity-test")
        check(r.returncode == 0, f"field-artefact failed: {r.stderr.strip()}")
        art = os.path.join(org, "field", "interviews", "INTERVIEW-ops-20260415-1.yaml")
        if check(os.path.isfile(art), "field artefact was not created"):
            d = yaml.safe_load(open(art, encoding="utf-8"))
            check(d.get("zone") == "field", "field artefact zone is not 'field'")
            check(bool(ID_RE.match(d.get("id", ""))), f"field artefact id violates ID grammar: {d.get('id')}")
            check(d.get("source_quality") in SOURCE_QUALITY, f"source_quality not in the closed set: {d.get('source_quality')}")
            check(isinstance(d.get("notes"), str) and d["notes"].strip(), "field artefact body block (notes) missing")
            check(str(d.get("raw_source", "")).startswith("_intake/processed/"), "raw_source not retained under _intake/processed/")
            sh = d.get("source_hash", "")
            check(bool(SOURCE_HASH_RE.match(sh)), f"source_hash missing or malformed: {sh!r}")
            check(sh == expected_hash, f"source_hash does not match raw bytes: got {sh!r}, expected {expected_hash!r}")

        r = run_cli("emit-candidates", art, "--from", os.path.join(FIXTURES, "extraction-result.json"))
        check(r.returncode == 0, f"emit-candidates failed: {r.stderr.strip()}")
        cand_dir = os.path.join(org, "_intake", "processing", "candidates")
        cand_files = [f for f in os.listdir(cand_dir)] if os.path.isdir(cand_dir) else []
        check(len(cand_files) >= 1, "emit-candidates produced no candidate files")
        # relation-conservatism: the medium relation is held back as a suggestion.
        sugg = os.path.join(org, "_intake", "processing", "relation-suggestions.json")
        if check(os.path.isfile(sugg), "relation-suggestions.json missing"):
            s = json.load(open(sugg, encoding="utf-8"))
            check(any(x.get("rel_kind") == "contributes_to" for x in s), "medium relation was not held back as a suggestion")

        r = run_cli("validate", cand_dir)
        check(r.returncode == 0, f"validate flagged the clean fixture candidates (exit {r.returncode}): {r.stdout}")

        r = run_cli("review-queue", cand_dir)
        check(r.returncode == 0, f"review-queue failed: {r.stderr.strip()}")
        rq = os.path.join(org, "_intake", "processing", "review-queue.yaml")
        if check(os.path.isfile(rq), "review-queue.yaml was not created"):
            q = yaml.safe_load(open(rq, encoding="utf-8"))
            check(q.get("gate", {}).get("admits_to_canon") is False, "review queue gate.admits_to_canon must be False")
            check(isinstance(q.get("candidates"), list) and len(q["candidates"]) >= 1, "review queue lists no candidates")
            check(len(q.get("relation_suggestions", [])) >= 1, "review queue did not carry the held-back suggestion")
            fas = q.get("field_artefacts") or []
            check(any(fa.get("source_hash") == expected_hash for fa in fas),
                  "review queue did not carry the field artefact's source_hash through")

        # THE ONE RULE: the pipeline must never create canon/.
        check(not os.path.exists(os.path.join(org, "canon")), "pipeline created canon/ — it must only propose")

        # Two-axes guard: a candidate carrying source_quality is flagged, not accepted.
        with open(os.path.join(cand_dir, "BAD-AXES.json"), "w", encoding="utf-8") as fh:
            json.dump({"kind": "element", "id": "GOAL-BAD-1", "name": "leak", "element_type": "GOAL",
                       "source_quality": "authoritative", "derived_from": ["INTERVIEW-ops-20260415-1"],
                       "admitted_to": "pending", "extraction_confidence": "high"}, fh)
        r = run_cli("validate", cand_dir)
        check(r.returncode == 1 and "source_quality" in (r.stdout + r.stderr),
              "validate did not flag a candidate that leaks source_quality (two-axes rule)")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part C — IG-5 regressions (rehearsal-found defects) ──────────────────

def part_c_ig5():
    """Capability V/H ID accepted, closed-REL-kind flag, derived_from merge."""
    if not shutil.which("node"):
        print("SKIP Part C: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-ig5-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        cdir = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(cdir, exist_ok=True)

        def cand(name, obj):
            with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
                json.dump(obj, fh)

        fid = "INTERVIEW-x-20260101-1"
        cand("CAP.json", {"kind": "element", "id": "CAPABILITY-V1.2", "name": "Cap",
                          "element_type": "CAPABILITY", "derived_from": [fid],
                          "admitted_to": "pending", "extraction_confidence": "high"})
        cand("RELbad.json", {"kind": "relation", "rel_kind": "contributes_to",
                             "from": "FACTOR-A-1", "to": "GOAL-B-1", "derived_from": [fid],
                             "admitted_to": "pending", "extraction_confidence": "high"})
        cand("RELok.json", {"kind": "relation", "rel_kind": "stakeholding",
                            "from": "STAKEHOLDER-A-1", "to": "GOAL-B-1", "derived_from": [fid],
                            "admitted_to": "pending", "extraction_confidence": "high"})

        r = run_cli("validate", cdir)
        out = r.stdout + r.stderr
        check("violates the ID grammar: CAPABILITY-V1.2" not in out,
              "IG-5a: capability V/H address (CAPABILITY-V1.2) wrongly flagged for ID grammar")
        check("contributes_to" in out and "closed REL kind" in out,
              "IG-5c: a non-closed rel_kind (contributes_to) was not flagged")
        check("stakeholding" not in out,
              "IG-5c: a valid closed rel_kind (stakeholding) was wrongly flagged")

        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        for f in ("INTERVIEW-a-20260101-1", "INTERVIEW-b-20260101-1"):
            with open(os.path.join(fdir, f + ".yaml"), "w", encoding="utf-8") as fh:
                fh.write('id: "%s"\nname: "x"\ntype: "INTERVIEW"\nzone: "field"\nnotes: "x"\n' % f)
        res = os.path.join(work, "res.json")
        mdir = os.path.join(org, "_intake", "processing", "merge")

        def emit(field_id, conf):
            with open(res, "w", encoding="utf-8") as fh:
                json.dump({"elements": [{"id": "GOAL-SHARED-1", "name": "Shared",
                                         "element_type": "GOAL", "extraction_confidence": conf}],
                           "relations": []}, fh)
            return run_cli("emit-candidates", os.path.join(fdir, field_id + ".yaml"),
                           "--from", res, "--candidates-dir", mdir)

        emit("INTERVIEW-a-20260101-1", "medium")
        emit("INTERVIEW-b-20260101-1", "high")
        merged = json.load(open(os.path.join(mdir, "GOAL-SHARED-1.json"), encoding="utf-8"))
        check(sorted(merged.get("derived_from", [])) == ["INTERVIEW-a-20260101-1", "INTERVIEW-b-20260101-1"],
              "IG-5b: derived_from not merged across two sources: %r" % merged.get("derived_from"))
        check(merged.get("extraction_confidence") == "high",
              "IG-5b: merge did not keep the stronger extraction_confidence: %r" % merged.get("extraction_confidence"))
    finally:
        shutil.rmtree(work, ignore_errors=True)


part_a_bundle()
part_b_pipeline()
part_c_ig5()

if _failures:
    print("FAIL - Transitrix Ingest skill integrity:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Ingest skill + CLI pipeline test: all checks passed.")
sys.exit(0)
