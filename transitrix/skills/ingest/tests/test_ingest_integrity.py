#!/usr/bin/env python3
"""From-scratch pipeline test for the Transitrix Ingest skill + @transitrix/ingest-cli.

Deterministic, no-API-key guard. Eight parts:

  A. Bundle integrity — SKILL.md frontmatter, the three JSON schemas parse, the
     three layer prompts + READMEs exist, the _intake template is present.
  B. CLI pipeline drive — runs the real CLI end-to-end on a fixture
     (scaffold-intake -> convert -> field-artefact -> emit-candidates -> validate
     -> review-queue) and asserts the outputs: a conformant field artefact with a
     proposed source_quality, candidate files, a review queue with the gate closed,
     the two-axes rule (a candidate carrying source_quality is flagged), and THE ONE
     RULE — canon/ is never written.
  C. IG-5 regressions — capability V/H ID is accepted, a non-closed rel_kind is
     flagged, derived_from merges across sources.
  D. IG-1 assertion candidate — emit shapes an assertion; a valid one passes,
     bad subject TYPE / status / non-REQUIREMENT about are flagged.
  E. IG-2 codex artefact — codex-artefact emits a faithful law/policy source
     artefact (no source_quality); downstream REQUIREMENT/ASSERTION candidates cite it.
  F. IG-3 admit-source — admit-source --zone field|codex dispatches; the
     field-artefact / codex-artefact aliases still work; a bad --zone is rejected.
  G. #164 coverage_profile resolution — a short-form preset (`core`) resolves
     membership per CP-003 (not blanket out_of_profile); a custom `extends:` + delta
     map resolves the added TYPE in-profile; an unresolved profile emits a visible
     WARNING instead of silently defaulting to full.
  H. #165 idempotency — review-queue excludes candidates already admitted to canon
     (matched by id for elements/assertions, by (type, from, to) triple for relations),
     so a re-run does not re-list already-admitted items.

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


# ── Part C — IG-5 regressions ──────────────────────────────────

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


# ── Part D — IG-1 assertion candidate kind ───────────────────────

def part_d_ig1():
    """Assertion candidate: emit shaping, valid passes, bad subject/status/about flagged."""
    if not shutil.which("node"):
        print("SKIP Part D: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-ig1-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        fid = "INTERVIEW-law-20260101-1"
        with open(os.path.join(fdir, fid + ".yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "%s"\nname: "x"\ntype: "INTERVIEW"\nzone: "field"\nnotes: "x"\n' % fid)

        res = os.path.join(work, "res.json")
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({"elements": [], "relations": [],
                       "assertions": [{"id": "ASSERTION-FLEXLINE-CERT-1",
                                       "about": "REQUIREMENT-CERT-1", "subject": "PRODUCT-FLEXLINE-1",
                                       "status": "under_review", "realised_via": ["CAPABILITY-V1.2"],
                                       "extraction_confidence": "medium"}]}, fh)
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        run_cli("emit-candidates", os.path.join(fdir, fid + ".yaml"), "--from", res, "--candidates-dir", cdir)

        shaped = json.load(open(os.path.join(cdir, "ASSERTION-FLEXLINE-CERT-1.json"), encoding="utf-8"))
        check(shaped.get("kind") == "assertion" and shaped.get("admitted_to") == "pending"
              and shaped.get("derived_from") == [fid] and shaped.get("subject") == "PRODUCT-FLEXLINE-1",
              "IG-1: emit-candidates did not shape an assertion candidate correctly: %r" % shaped)

        # A valid assertion (PRODUCT subject, closed status, REQUIREMENT about) validates clean.
        r = run_cli("validate", cdir)
        check(r.returncode == 0, "IG-1: a valid assertion candidate was flagged: %s" % (r.stdout + r.stderr))

        def cand(name, obj):
            with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
                json.dump(obj, fh)
        base = {"kind": "assertion", "derived_from": [fid], "admitted_to": "pending",
                "extraction_confidence": "high"}
        cand("A_badsubj.json", {**base, "id": "ASSERTION-X-1", "about": "REQUIREMENT-C-1",
                                "subject": "GOAL-Z-1", "status": "compliant"})
        cand("A_badstatus.json", {**base, "id": "ASSERTION-Y-1", "about": "REQUIREMENT-C-1",
                                  "subject": "PROCESS-P-1", "status": "maybe"})
        cand("A_badabout.json", {**base, "id": "ASSERTION-W-1", "about": "GOAL-G-1",
                                 "subject": "CAPABILITY-V1", "status": "compliant"})
        r = run_cli("validate", cdir)
        out = r.stdout + r.stderr
        check("ASSERT-003" in out, "IG-1: bad assertion subject TYPE not flagged (ASSERT-003)")
        check("assertion status must be" in out, "IG-1: bad assertion status not flagged")
        check("ASSERT-002" in out, "IG-1: assertion about non-REQUIREMENT not flagged (ASSERT-002)")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part E — IG-2 codex artefact emitter ─────────────────────────

def part_e_ig2():
    """Faithful codex LAW artefact + downstream REQUIREMENT/ASSERTION candidates citing it."""
    if not shutil.which("node"):
        print("SKIP Part E: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-ig2-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        inbox = os.path.join(org, "_intake", "inbox")
        proc = os.path.join(org, "_intake", "processing")
        raw = os.path.join(inbox, "LAW-conveyor.txt")
        with open(raw, "wb") as fh:
            fh.write(b"Article 3 - certification required before market placement.\n")
        expected_hash = "sha256:" + hashlib.sha256(open(raw, "rb").read()).hexdigest()
        with open(os.path.join(proc, "LAW-conveyor.md"), "w", encoding="utf-8") as fh:
            fh.write("# Regulation\nArticle 3 - certification required before market placement.\n")

        r = run_cli("codex-artefact", os.path.join(proc, "LAW-conveyor.md"),
                    "--type", "LAW", "--jurisdiction", "eu", "--effective-date", "2026-01-01",
                    "--source-authority", "FICTIONAL", "--slug", "conveyor-safety",
                    "--admitted-at", "2026-06-07", "--monitoring")
        check(r.returncode == 0, "IG-2: codex-artefact failed: %s" % (r.stderr or r.stdout))

        art = os.path.join(org, "codex", "external", "eu", "LAW-conveyor_safety-1.yaml")
        if check(os.path.isfile(art), "IG-2: codex artefact not written under codex/external/eu/"):
            d = yaml.safe_load(open(art, encoding="utf-8"))
            check(d.get("zone") == "codex", "IG-2: codex artefact zone is not 'codex'")
            check(d.get("type") == "LAW", "IG-2: codex artefact type")
            check(d.get("jurisdiction") == "eu", "IG-2: jurisdiction must match the folder (CODEX-001)")
            check(d.get("effective_date") == "2026-01-01", "IG-2: effective_date")
            check(d.get("gate_checks", {}).get("source_authority") == "FICTIONAL", "IG-2: gate_checks.source_authority")
            check("source_quality" not in d, "IG-2: a codex artefact must NOT carry source_quality (authoritative by construction)")
            check(d.get("source_hash") == expected_hash, "IG-2: source_hash mismatch")
            check(str(d.get("snapshot_file", "")).startswith("sources/snapshot_"), "IG-2: snapshot_file under sources/")
            check(d.get("monitoring_needed") is True, "IG-2: monitoring_needed")

        check(os.path.isdir(os.path.join(org, "codex", "external", "eu", "sources")), "IG-2: codex sources/ folder missing")
        check(not os.path.exists(raw), "IG-2: raw source was not moved into codex sources/")
        check(not os.path.exists(os.path.join(org, "canon")), "IG-2: codex emit must not create canon/")

        # Downstream: derive REQUIREMENT + ASSERTION candidates that cite the codex LAW.
        res = os.path.join(work, "res.json")
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({"elements": [{"id": "REQUIREMENT-CONVEYOR-CERT-1", "name": "Hold a certificate",
                                     "element_type": "REQUIREMENT", "extraction_confidence": "high"}],
                       "relations": [],
                       "assertions": [{"id": "ASSERTION-FLEXLINE-CERT-1", "about": "REQUIREMENT-CONVEYOR-CERT-1",
                                       "subject": "PRODUCT-FLEXLINE-1", "status": "under_review",
                                       "extraction_confidence": "medium"}]}, fh)
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        r = run_cli("emit-candidates", art, "--from", res, "--candidates-dir", cdir)
        check(r.returncode == 0, "IG-2: emit-candidates from a codex artefact failed: %s" % (r.stderr or r.stdout))

        req = json.load(open(os.path.join(cdir, "REQUIREMENT-CONVEYOR-CERT-1.json"), encoding="utf-8"))
        ass = json.load(open(os.path.join(cdir, "ASSERTION-FLEXLINE-CERT-1.json"), encoding="utf-8"))
        check(req.get("derived_from") == ["LAW-conveyor_safety-1"],
              "IG-2: REQUIREMENT candidate does not cite the codex LAW: %r" % req.get("derived_from"))
        check(ass.get("kind") == "assertion" and ass.get("derived_from") == ["LAW-conveyor_safety-1"],
              "IG-2: ASSERTION candidate does not cite the codex LAW: %r" % ass.get("derived_from"))
        r = run_cli("validate", cdir)
        check(r.returncode == 0, "IG-2: codex-derived candidates did not validate clean: %s" % (r.stdout + r.stderr))
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part F — IG-3 admit-source unify + aliases ─────────────────────

def part_f_ig3():
    """admit-source --zone field|codex dispatch; field-artefact alias still works."""
    if not shutil.which("node"):
        print("SKIP Part F: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-ig3-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')
        inbox = os.path.join(org, "_intake", "inbox")
        proc = os.path.join(org, "_intake", "processing")

        def drop(stem, body):
            with open(os.path.join(inbox, stem + ".txt"), "w", encoding="utf-8") as fh:
                fh.write(body + "\n")
            with open(os.path.join(proc, stem + ".md"), "w", encoding="utf-8") as fh:
                fh.write("# " + stem + "\n" + body + "\n")

        drop("INT", "note")
        r = run_cli("admit-source", "--zone", "field", os.path.join(proc, "INT.md"),
                    "--type", "INTERVIEW", "--role", "Ops", "--date", "2026-01-01",
                    "--slug", "ops", "--admitted-at", "2026-01-02")
        check(r.returncode == 0, "IG-3: admit-source --zone field failed: %s" % (r.stderr or r.stdout))
        check(os.path.isfile(os.path.join(org, "field", "interviews", "INTERVIEW-ops-20260101-1.yaml")),
              "IG-3: admit-source --zone field did not write a field artefact")

        drop("LAW", "law")
        r = run_cli("admit-source", "--zone", "codex", os.path.join(proc, "LAW.md"),
                    "--type", "LAW", "--jurisdiction", "eu", "--effective-date", "2026-01-01",
                    "--slug", "road", "--admitted-at", "2026-01-02")
        check(r.returncode == 0, "IG-3: admit-source --zone codex failed: %s" % (r.stderr or r.stdout))
        check(os.path.isfile(os.path.join(org, "codex", "external", "eu", "LAW-road-1.yaml")),
              "IG-3: admit-source --zone codex did not write a codex artefact")

        drop("INT2", "note2")
        r = run_cli("field-artefact", os.path.join(proc, "INT2.md"),
                    "--type", "INTERVIEW", "--role", "Ops2", "--date", "2026-01-01",
                    "--slug", "ops2", "--admitted-at", "2026-01-02")
        check(r.returncode == 0, "IG-3: deprecated field-artefact alias broke: %s" % (r.stderr or r.stdout))
        check(os.path.isfile(os.path.join(org, "field", "interviews", "INTERVIEW-ops2-20260101-1.yaml")),
              "IG-3: field-artefact alias did not write a field artefact")

        r = run_cli("admit-source", "--zone", "bogus", os.path.join(proc, "INT.md"),
                    "--type", "INTERVIEW", "--role", "x", "--date", "2026-01-01")
        check(r.returncode == 1 and "zone must be field|codex" in (r.stdout + r.stderr),
              "IG-3: a bad --zone was not rejected")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part G — #164 coverage_profile resolution ─────────────────────

def _coverage_org(manifest_body):
    """Scaffold an org with a given coverage_profile manifest and a fixed candidate set.
    Returns (org, work) — caller cleans up work."""
    work = tempfile.mkdtemp(prefix="ingest-cp-")
    org = os.path.join(work, "org")
    os.makedirs(org)
    run_cli("scaffold-intake", org)
    with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
        fh.write(manifest_body)
    cdir = os.path.join(org, "_intake", "processing", "candidates")
    os.makedirs(cdir, exist_ok=True)
    fid = "INTERVIEW-x-20260101-1"
    cset = {
        "CAP.json": {"kind": "element", "id": "CAPABILITY-X-1", "name": "Cap", "element_type": "CAPABILITY"},
        "TS.json": {"kind": "element", "id": "TARGET_STATE-X-1", "name": "TS", "element_type": "TARGET_STATE"},
        "RELemp.json": {"kind": "relation", "rel_kind": "employment", "from": "ACTOR-A-1", "to": "ROLE-B-1"},
        "RELcon.json": {"kind": "relation", "rel_kind": "contracting", "from": "STAKEHOLDER-A-1", "to": "GOAL-B-1"},
        "ASSERT.json": {"kind": "assertion", "id": "ASSERTION-X-1", "about": "REQUIREMENT-C-1",
                        "subject": "PRODUCT-P-1", "status": "compliant"},
    }
    for name, obj in cset.items():
        obj.update({"derived_from": [fid], "admitted_to": "pending", "extraction_confidence": "high"})
        with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
            json.dump(obj, fh)
    return org, work, cdir


def _flags(org):
    q = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-queue.yaml"), encoding="utf-8"))
    by = {os.path.basename(c["ref"]): c.get("coverage_flag") for c in q["candidates"]}
    return q, by


def part_g_coverage():
    """review-queue resolves preset + custom-profile membership; no silent full fallback."""
    if not shutil.which("node"):
        print("SKIP Part G: `node` not found.")
        return

    # G1 — short-form preset `core`: membership resolved per CP-003 (not blanket out).
    org, work, cdir = _coverage_org('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: core\n')
    try:
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, f"G1: review-queue failed: {r.stderr.strip()}")
        q, by = _flags(org)
        check(q.get("coverage_profile") == "core", f"G1: queue coverage_profile should be 'core', got {q.get('coverage_profile')!r}")
        check(by.get("CAP.json") == "in_profile", "G1: CAPABILITY is in `core` — must be in_profile")
        check(by.get("TS.json") == "out_of_profile", "G1: TARGET_STATE is not in `core` — must be out_of_profile")
        check(by.get("RELemp.json") == "in_profile", "G1: employment REL is in `core` — must be in_profile")
        check(by.get("RELcon.json") == "out_of_profile", "G1: contracting REL is not in `core` — must be out_of_profile")
        check(by.get("ASSERT.json") == "in_profile", "G1: ASSERTION is never profile-bounded (§2.1) — must be in_profile")
        check(not q.get("coverage_warning"), "G1: a resolvable preset must not emit a coverage warning")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    # G2 — custom map: core + TARGET_STATE delta → TARGET_STATE now in profile.
    org, work, cdir = _coverage_org(
        'transitrix: 1\nmethodology_version: "0.5.0"\n'
        'coverage_profile:\n  extends: core\n  pinned_to: "0.5.0"\n  layers:\n'
        '    05_implementation:\n      elements:\n        add: [TARGET_STATE]\n')
    try:
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, f"G2: review-queue failed: {r.stderr.strip()}")
        q, by = _flags(org)
        check(q.get("coverage_profile") == "extends:core", f"G2: coverage_profile should be 'extends:core', got {q.get('coverage_profile')!r}")
        check(by.get("TS.json") == "in_profile", "G2: TARGET_STATE added via the custom delta — must be in_profile (CP-003)")
        check(by.get("CAP.json") == "in_profile", "G2: CAPABILITY inherited from core — must be in_profile")
        check(by.get("RELcon.json") == "out_of_profile", "G2: contracting still out — must be out_of_profile")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    # G3 — unknown preset: NO silent full fallback — a visible warning is emitted.
    org, work, cdir = _coverage_org('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: bogus\n')
    try:
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, f"G3: review-queue failed: {r.stderr.strip()}")
        check("WARNING" in (r.stdout + r.stderr) and "could not be resolved" in (r.stdout + r.stderr),
              "G3: an unresolved profile must emit a visible CLI warning, not silently default to full")
        q, by = _flags(org)
        check(bool(q.get("coverage_warning")), "G3: the review queue must carry a coverage_warning for an unresolved profile")
        check(by.get("TS.json") == "in_profile",
              "G3: an unresolved profile defaults permissively to full (no silent drop), but warns")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part H — review-queue idempotency against canon (#165) ────────

def part_h_idempotent():
    """review-queue excludes candidates already admitted to canon (by id / REL triple)."""
    if not shutil.which("node"):
        print("SKIP Part H: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-idem-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        cdir = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(cdir, exist_ok=True)
        fid = "INTERVIEW-x-20260101-1"

        def cand(name, obj):
            with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
                json.dump(obj, fh)

        # Source A candidates (will be admitted) + a relation candidate.
        cand("A_elem.json", {"kind": "element", "id": "GOAL-A-1", "name": "A",
                             "element_type": "GOAL", "derived_from": [fid],
                             "admitted_to": "pending", "extraction_confidence": "high"})
        cand("A_rel.json", {"kind": "relation", "rel_kind": "stakeholding",
                            "from": "STAKEHOLDER-A-1", "to": "GOAL-A-1", "derived_from": [fid],
                            "admitted_to": "pending", "extraction_confidence": "high"})
        # Source B candidate (never admitted) — must remain in the queue.
        cand("B_elem.json", {"kind": "element", "id": "GOAL-B-1", "name": "B",
                             "element_type": "GOAL", "derived_from": [fid],
                             "admitted_to": "pending", "extraction_confidence": "high"})

        def queue():
            r = run_cli("review-queue", cdir)
            check(r.returncode == 0, f"G: review-queue failed: {r.stderr.strip()}")
            return yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-queue.yaml"), encoding="utf-8"))

        q1 = queue()
        ids1 = sorted(os.path.basename(c["ref"]) for c in q1["candidates"])
        check(ids1 == ["A_elem.json", "A_rel.json", "B_elem.json"],
              f"G: before admission the queue should list all three candidates, got {ids1}")
        check(not q1.get("excluded_admitted"), "G: nothing should be excluded before admission")

        # Simulate the human admission gate: write A's element + relation into canon/.
        gdir = os.path.join(org, "canon", "elements", "01_motivation", "goals")
        rdir = os.path.join(org, "canon", "relations")
        os.makedirs(gdir, exist_ok=True)
        os.makedirs(rdir, exist_ok=True)
        with open(os.path.join(gdir, "GOAL-A-1.yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "GOAL-A-1"\nname: "A"\ntype: "GOAL"\nzone: "canon"\n')
        # An admitted relation carries `type` (not `rel_kind`) and its own REL id.
        with open(os.path.join(rdir, "REL-A-1.yaml"), "w", encoding="utf-8") as fh:
            fh.write('notation: "relation"\nid: "REL-A-1"\ntype: "stakeholding"\n'
                     'from: "STAKEHOLDER-A-1"\nto: "GOAL-A-1"\nzone: "canon"\n')

        q2 = queue()
        ids2 = sorted(os.path.basename(c["ref"]) for c in q2["candidates"])
        check(ids2 == ["B_elem.json"],
              f"G: after admitting A the queue should list only B's candidate, got {ids2}")
        excluded = sorted(os.path.basename(c["ref"]) for c in q2.get("excluded_admitted", []))
        check(excluded == ["A_elem.json", "A_rel.json"],
              f"G: A's element + relation should be reported excluded, got {excluded}")
        # Idempotent: a second re-run is stable.
        q3 = queue()
        check(sorted(os.path.basename(c["ref"]) for c in q3["candidates"]) == ["B_elem.json"],
              "G: a re-run must not re-list candidates already admitted to canon")
        # THE ONE RULE still holds — the queue reads canon but never writes a new zone.
        check(os.path.isdir(os.path.join(org, "canon")), "G: test setup should have created canon/")
    finally:
        shutil.rmtree(work, ignore_errors=True)


part_a_bundle()
part_b_pipeline()
part_c_ig5()
part_d_ig1()
part_e_ig2()
part_f_ig3()
part_g_coverage()
part_h_idempotent()

if _failures:
    print("FAIL - Transitrix Ingest skill integrity:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Ingest skill + CLI pipeline test: all checks passed.")
sys.exit(0)
