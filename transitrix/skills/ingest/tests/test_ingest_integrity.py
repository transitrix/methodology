#!/usr/bin/env python3
"""From-scratch pipeline test for the Transitrix Ingest skill + @transitrix/ingest-cli.

Deterministic, no-API-key guard. Nine parts:

  A. Bundle integrity — SKILL.md frontmatter, the four JSON schemas parse, the
     four layer prompts + READMEs exist, the _intake template is present.
  B. CLI pipeline drive — runs the real CLI end-to-end on a fixture
     (scaffold-intake -> convert -> privacy-scan -> field-artefact -> emit-candidates
     -> validate -> review-queue) and asserts the outputs: a conformant field artefact with a
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
  I. #168 placement — resolve-placement reports a TYPE's ELEMENT_PRIMITIVES §4 mode +
     layer + folder; review-queue annotates each element candidate with its placement
     (equals resolve consistently); check-placement flags an admitted element sitting
     outside its §4 folder.
  N. F8 entity resolution — emit-candidates attaches entity_match when a candidate's
     name matches an existing canon element by primary name or alias; genuinely new
     candidates get no proposal; review-queue surfaces entity_match_proposals.
  P. #434 preset version currency — repo-check reports a version match (no false-negative)
     for a repo correctly pinned to the CLI's built-in preset version (read from
     coverage-presets.mjs, so this stays current across release bumps).
  Q. origin pass-through + REQ-004 — emit-candidates carries origin through for all three
     valid values (legislative/process-product/project-product); validate enforces REQ-004
     (closed vocabulary) on the candidate origin field.
  R. #807 privacy gate — privacy-scan CLEAN/STRIPPED/REJECTED outcomes; admit-source
     (field zone) refuses with no scan record, refuses a stale record, and refuses the
     original after STRIPPED (must admit the redacted copy); the epic's name+email+phone
     reproduction is not admitted verbatim; privacy-report.yaml never leaks a fragment
     verbatim; `enabled: false` is an explicit adopter opt-out.
  S. workflow-status (vkgeorgia/strategy#824) — one invocation reports every human gate's
     phase + count (ADR/WI/canon element/REQUIREMENT-CONSTRAINT-overdue/ingest batch);
     author:agent ADRs counted separately from human-proposed; --data-free strips ids/paths;
     --format yaml matches the default table's counts; an out-of-vocabulary or missing phase
     value lands in `unknown`, never dropped; absent sources degrade to an omitted section.

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


def cli_presets_version():
    """Read PRESETS_VERSION from the CLI source directly, so this test tracks
    it automatically instead of going stale at the next methodology release bump."""
    src = open(os.path.join(REPO_ROOT, "packages", "ingest-cli", "src", "coverage-presets.mjs"),
                encoding="utf-8").read()
    m = re.search(r"export const PRESETS_VERSION\s*=\s*['\"]([^'\"]+)['\"]", src)
    if not m:
        raise RuntimeError("could not find PRESETS_VERSION in coverage-presets.mjs")
    return m.group(1)


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

    for short in ("field-artefact", "candidate", "review-queue", "privacy-report"):
        p = os.path.join(SKILL_DIR, "schemas", f"{short}.schema.json")
        if check(os.path.isfile(p), f"schema missing: schemas/{short}.schema.json"):
            try:
                json.load(open(p, encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                check(False, f"schema does not parse: schemas/{short}.schema.json: {e}")

    for prompt in ("01_motivation", "02_business", "03_application", "04_implementation"):
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

        r = run_cli("privacy-scan", md)
        check(r.returncode == 0 and "CLEAN" in r.stdout,
              f"privacy-scan should report CLEAN for the clean fixture: {r.stdout}{r.stderr}")

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
                             "from": "DRIVER-A-1", "to": "GOAL-B-1", "derived_from": [fid],
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

        # F13 — the review queue resolves the codex source (not only field/): the LAW the
        # candidates cite is surfaced as a found, authoritative codex artefact.
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, "F13: review-queue failed on codex-derived candidates: %s" % (r.stderr or r.stdout))
        rq = os.path.join(org, "_intake", "processing", "review-queue.yaml")
        if check(os.path.isfile(rq), "F13: review-queue.yaml was not created"):
            q = yaml.safe_load(open(rq, encoding="utf-8"))
            fas = q.get("field_artefacts") or []
            law = next((fa for fa in fas if fa.get("id") == "LAW-conveyor_safety-1"), None)
            if check(law is not None, "F13: review queue did not list the cited codex LAW source"):
                check(law.get("zone") == "codex", "F13: codex source not marked zone:codex (got %r)" % law.get("zone"))
                check(law.get("found") is True, "F13: codex source did not resolve (found != True)")
                check(law.get("authoritative") is True, "F13: codex source not marked authoritative")
                check("proposed_source_quality" not in law,
                      "F13: codex source must carry no proposed_source_quality (authoritative by construction)")
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
        run_cli("privacy-scan", os.path.join(proc, "INT.md"))
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
        run_cli("privacy-scan", os.path.join(proc, "INT2.md"))
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


# ── Part I — #168 materialisation/placement resolution ────────────

def part_i_placement():
    """resolve-placement + review-queue placement + check-placement flag misplaced."""
    if not shutil.which("node"):
        print("SKIP Part I: `node` not found.")
        return

    # I1 — resolve-placement reports §4 mode + layer + folder per TYPE.
    cases = {
        "PRODUCT": ("standalone", "02_business/products/"),
        "APPLICATION": ("standalone", "03_application/applications/"),
        "ACTOR": ("standalone", "02_business/actors/"),
        "ROLE": ("standalone", "02_business/roles/"),
        "PROCESS": ("standalone", "02_business/processes/"),
        "INTEGRATION": ("view-defined", "03_application/integrations/"),
    }
    for t, (mode, folder) in cases.items():
        r = run_cli("resolve-placement", t)
        out = r.stdout + r.stderr
        check(r.returncode == 0 and ("mode: " + mode) in out and folder in out,
              f"I1: resolve-placement {t} should report mode {mode} + folder {folder}; got {out.strip()!r}")
    # An unknown / non-catalogue TYPE has no §4 placement.
    r = run_cli("resolve-placement", "INTERVIEW")
    check(r.returncode == 1, "I1: a non-catalogue TYPE (INTERVIEW) must have no §4 placement")

    # I2 — review-queue annotates element candidates with their §4 placement; equals
    # of equal standing (actor/role/process/product) resolve consistently (own folders).
    work = tempfile.mkdtemp(prefix="ingest-place-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(cdir, exist_ok=True)
        fid = "INTERVIEW-x-20260101-1"
        equals = {
            "ACTOR.json": ("ACTOR-A-1", "ACTOR", "02_business/actors/"),
            "ROLE.json": ("ROLE-A-1", "ROLE", "02_business/roles/"),
            "PROC.json": ("PROCESS-A-1", "PROCESS", "02_business/processes/"),
            "PROD.json": ("PRODUCT-A-1", "PRODUCT", "02_business/products/"),
        }
        for name, (eid, etype, _folder) in equals.items():
            with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
                json.dump({"kind": "element", "id": eid, "name": eid, "element_type": etype,
                           "derived_from": [fid], "admitted_to": "pending",
                           "extraction_confidence": "high"}, fh)
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, f"I2: review-queue failed: {r.stderr.strip()}")
        q = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-queue.yaml"), encoding="utf-8"))
        by = {os.path.basename(c["ref"]): c for c in q["candidates"]}
        for name, (_eid, _etype, folder) in equals.items():
            pl = by.get(name, {}).get("placement")
            check(isinstance(pl, dict) and pl.get("mode") == "standalone" and pl.get("folder") == folder,
                  f"I2: {name} should carry placement mode=standalone folder={folder}; got {pl!r}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    # I3 — check-placement flags an admitted standalone element outside its §4 folder.
    work = tempfile.mkdtemp(prefix="ingest-place3-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(os.path.join(org, "_intake", "inbox"), exist_ok=True)

        def admit(rel, fname, body):
            d = os.path.join(org, "canon", "elements", rel)
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, fname), "w", encoding="utf-8") as fh:
                fh.write(body)

        # Correct placements first → clean.
        admit("02_business/products", "PRODUCT-FLEXLINE-1.yaml", 'id: "PRODUCT-FLEXLINE-1"\n')
        admit("02_business/actors", "ACTOR-ACME-1.yaml", 'id: "ACTOR-ACME-1"\n')
        r = run_cli("check-placement", org)
        check(r.returncode == 0, f"I3: a correctly-placed canon should pass check-placement; got: {(r.stdout + r.stderr).strip()}")

        # Misplace an APPLICATION under products/ → flagged.
        admit("02_business/products", "APPLICATION-CRM-1.yaml", 'id: "APPLICATION-CRM-1"\n')
        r = run_cli("check-placement", org)
        out = r.stdout + r.stderr
        check(r.returncode == 1 and "APPLICATION-CRM-1" in out and "03_application/applications/" in out,
              f"I3: a standalone element outside its §4 folder must be flagged; got: {out.strip()!r}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part J — F1 duplicate-source detection ───────────────────────

def part_j_duplicate_source():
    """admit-source dedups by source_hash (skip w/o --force, admit w/ --force);
    processed/ basename collisions don't clobber; review-queue surfaces duplicate-by-hash."""
    if not shutil.which("node"):
        print("SKIP Part J: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-f1-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        inbox = os.path.join(org, "_intake", "inbox")
        processed = os.path.join(org, "_intake", "processed")
        fdir = os.path.join(org, "field", "interviews")

        def yamls():
            return sorted(f for f in os.listdir(fdir) if f.endswith(".yaml")) if os.path.isdir(fdir) else []

        def drop_and_admit(content, *extra):
            # (re)drop the raw under a fixed basename, convert (passthrough), admit
            with open(os.path.join(inbox, "src.md"), "w", encoding="utf-8") as fh:
                fh.write(content)
            run_cli("convert", os.path.join(inbox, "src.md"))
            md = os.path.join(org, "_intake", "processing", "src.md")
            run_cli("privacy-scan", md)
            return run_cli("admit-source", md, "--zone", "field", "--type", "INTERVIEW",
                           "--role", "ops", "--date", "2026-01-01", "--slug", "ops",
                           "--admitted-at", "2026-01-02", *extra)

        # 1. First admit → exactly one artefact.
        r = drop_and_admit("AAA\n")
        check(r.returncode == 0, "F1: first admit failed: %s" % (r.stderr or r.stdout))
        check(len(yamls()) == 1, "F1: first admit should mint exactly one field artefact, got %r" % yamls())

        # 2. Re-admit identical content WITHOUT --force → skipped, no second artefact.
        r = drop_and_admit("AAA\n")
        out = r.stdout + r.stderr
        check(r.returncode == 0, "F1: a duplicate re-ingest must not error (exit %d): %s" % (r.returncode, out))
        check("skip" in out.lower() and "force" in out.lower(),
              "F1: duplicate was not reported as skipped: %r" % out)
        check(len(yamls()) == 1, "F1: a duplicate must not mint a second artefact, got %r" % yamls())

        # 3. Re-admit identical content WITH --force → a second artefact (distinct id).
        r = drop_and_admit("AAA\n", "--force")
        check(r.returncode == 0, "F1: --force admit failed: %s" % (r.stderr or r.stdout))
        ids = [os.path.splitext(x)[0] for x in yamls()]
        check(len(ids) == 2, "F1: --force should mint a second artefact, got %r" % ids)

        # processed/ basename collision: the original raw is retained unchanged, the
        # second lands under a disambiguated name (not clobbered).
        psrc = os.path.join(processed, "src.md")
        check(os.path.isfile(psrc) and open(psrc, encoding="utf-8").read() == "AAA\n",
              "F1: original processed/src.md must survive the collision unchanged")
        check(len([f for f in os.listdir(processed) if f.startswith("src")]) >= 2,
              "F1: the second raw must be retained under a disambiguated name")

        # 4. review-queue surfaces the two same-hash artefacts as a duplicate cluster.
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(cdir, exist_ok=True)
        with open(os.path.join(cdir, "GOAL-DUP-1.json"), "w", encoding="utf-8") as fh:
            json.dump({"kind": "element", "id": "GOAL-DUP-1", "name": "x", "element_type": "GOAL",
                       "derived_from": ids, "admitted_to": "pending",
                       "extraction_confidence": "high"}, fh)
        r = run_cli("review-queue", cdir)
        check(r.returncode == 0, "F1: review-queue failed: %s" % (r.stderr or r.stdout))
        q = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-queue.yaml"), encoding="utf-8"))
        dups = q.get("duplicate_sources") or []
        check(any(sorted(c.get("ids", [])) == sorted(ids) for c in dups),
              "F1: review-queue did not surface the duplicate-by-hash cluster: %r" % dups)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part K — F3 suggest-profile (discovery) ──────────────────────

def part_k_suggest_profile():
    """suggest-profile proposes a delta for out-of-profile TYPEs (read-only); an
    in-profile TYPE is not flagged; under `full` nothing is proposed."""
    if not shutil.which("node"):
        print("SKIP Part K: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-f3-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: core\n')

        cdir = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(cdir, exist_ok=True)
        fid = "INTERVIEW-x-20260101-1"

        def cand(name, obj):
            with open(os.path.join(cdir, name), "w", encoding="utf-8") as fh:
                json.dump({**obj, "derived_from": [fid], "admitted_to": "pending",
                           "extraction_confidence": "high"}, fh)

        # PRODUCT is out of `core`; GOAL is in `core`.
        cand("PRODUCT.json", {"kind": "element", "id": "PRODUCT-X-1", "name": "x", "element_type": "PRODUCT"})
        cand("GOAL.json", {"kind": "element", "id": "GOAL-X-1", "name": "g", "element_type": "GOAL"})

        r = run_cli("suggest-profile", cdir)
        check(r.returncode == 0, "F3: suggest-profile failed: %s" % (r.stderr or r.stdout))
        rep = yaml.safe_load(r.stdout)
        oop = {e["type"] for e in rep.get("out_of_profile", {}).get("elements", [])}
        check("PRODUCT" in oop, "F3: PRODUCT (out of core) was not surfaced: %r" % sorted(oop))
        check("GOAL" not in oop, "F3: GOAL (in core) must not be surfaced as out-of-profile")
        delta = rep.get("proposed_delta") or {}
        check(delta.get("extends") == "core", "F3: proposed delta should extend the active base: %r" % delta.get("extends"))
        add = (delta.get("layers", {}).get("02_business", {}).get("elements", {}) or {}).get("add", [])
        check("PRODUCT" in add, "F3: PRODUCT not placed under 02_business in the proposed delta: %r" % delta)

        # Under `full`, nothing is out of profile → no delta proposed.
        org2 = os.path.join(work, "org2")
        os.makedirs(org2)
        run_cli("scaffold-intake", org2)
        with open(os.path.join(org2, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')
        cdir2 = os.path.join(org2, "_intake", "processing", "candidates")
        os.makedirs(cdir2, exist_ok=True)
        with open(os.path.join(cdir2, "PRODUCT.json"), "w", encoding="utf-8") as fh:
            json.dump({"kind": "element", "id": "PRODUCT-Y-1", "name": "y", "element_type": "PRODUCT",
                       "derived_from": [fid], "admitted_to": "pending", "extraction_confidence": "high"}, fh)
        r = run_cli("suggest-profile", cdir2)
        check(r.returncode == 0, "F3: suggest-profile (full) failed: %s" % (r.stderr or r.stdout))
        rep2 = yaml.safe_load(r.stdout)
        check(not rep2.get("out_of_profile", {}).get("elements"),
              "F3: under `full` no element should be out of profile")
        check("proposed_delta" not in rep2, "F3: under `full` no delta should be proposed")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part L — F2 repo-check (data-free doctor) ────────────────────

def part_l_repo_check():
    """repo-check emits a data-free health report: per-zone/TYPE counts, adoption level,
    integrity flags (invalid ids, misplaced canon elements); never names an object."""
    if not shutil.which("node"):
        print("SKIP Part L: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-f2-")
    try:
        org = os.path.join(work, "org")
        goals = os.path.join(org, "canon", "elements", "01_motivation", "goals")
        os.makedirs(goals)
        os.makedirs(os.path.join(org, "field", "interviews"))
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: core\n')
        for gid in ("GOAL-A-1", "GOAL-B-1"):
            with open(os.path.join(goals, gid + ".yaml"), "w", encoding="utf-8") as fh:
                fh.write('id: "%s"\nname: "x"\nzone: "canon"\n' % gid)
        # A PRODUCT sitting in goals/ → misplaced; a leading-zero field id → invalid.
        with open(os.path.join(goals, "PRODUCT-MIS-1.yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "PRODUCT-MIS-1"\nname: "z"\nzone: "canon"\n')
        with open(os.path.join(org, "field", "interviews", "bad.yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "INTERVIEW-007"\nname: "b"\nzone: "field"\n')

        r = run_cli("repo-check", org)
        check(r.returncode == 0, "F2: repo-check failed: %s" % (r.stderr or r.stdout))
        rep = yaml.safe_load(r.stdout)

        check(rep.get("manifest_present") is True, "F2: manifest_present should be True")
        check(rep.get("methodology_version") == "0.5.0", "F2: methodology_version not read: %r" % rep.get("methodology_version"))
        check(rep.get("coverage_profile") == "core", "F2: coverage_profile not resolved: %r" % rep.get("coverage_profile"))
        ct = rep.get("zones", {}).get("canon", {}).get("types", {})
        check(ct.get("GOAL") == 2 and ct.get("PRODUCT") == 1, "F2: canon TYPE counts wrong: %r" % ct)
        integ = rep.get("integrity", {})
        check(integ.get("invalid_ids") == 1, "F2: invalid_ids should be 1 (the leading-zero field id): %r" % integ.get("invalid_ids"))
        check(integ.get("misplaced_canon_elements") == 1, "F2: misplaced_canon_elements should be 1: %r" % integ.get("misplaced_canon_elements"))
        check(bool(rep.get("adoption_level")), "F2: adoption_level missing")
        # Data-free guarantee: the report must not carry any object id/name.
        blob = json.dumps(rep)
        for leak in ("GOAL-A-1", "GOAL-B-1", "PRODUCT-MIS-1", "INTERVIEW-007"):
            check(leak not in blob, "F2: report leaked an object id (%s) — must be data-free" % leak)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part M — F14 ID-grammar: emit-time surfacing + date-stamp middles ─

def part_m_id_grammar():
    """F14: emit-candidates surfaces an ID-grammar violation at emit time; a zero-padded
    ISO-date MIDDLE segment is valid (the no-leading-zero ban is terminal-only)."""
    if not shutil.which("node"):
        print("SKIP Part M: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-f14-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')
        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        # The field id itself carries zero-padded ISO-date middles (04, 15) — must be valid.
        fid = "INTERVIEW-ops-2026-04-15-1"
        with open(os.path.join(fdir, fid + ".yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "%s"\nname: "x"\ntype: "INTERVIEW"\nzone: "field"\nnotes: "x"\n' % fid)

        res = os.path.join(work, "res.json")
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({"elements": [
                {"id": "GOAL-CHURN-001", "name": "bad", "element_type": "GOAL", "extraction_confidence": "high"},
                {"id": "CHANGE-rollout-2026-04-15-1", "name": "ok", "element_type": "CHANGE", "extraction_confidence": "high"},
            ], "relations": [], "assertions": []}, fh)
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        r = run_cli("emit-candidates", os.path.join(fdir, fid + ".yaml"), "--from", res, "--candidates-dir", cdir)
        out = r.stdout + r.stderr
        # F14(a): the terminal-leading-zero id is surfaced as a warning at emit time.
        # (Assert without the section sign — Windows subprocess decoding mangles non-ASCII.)
        check("WARNING" in out and "GOAL-CHURN-001" in out and "ID grammar" in out,
              "F14(a): emit-candidates did not warn on the invalid id at emit time: %r" % out)
        # F14(b): a zero-padded ISO-date MIDDLE segment is valid — never warned.
        check("CHANGE-rollout-2026-04-15-1" not in out,
              "F14(b): a zero-padded ISO-date MIDDLE segment must be valid, not warned: %r" % out)

        # validate agrees: terminal-leading-zero flagged, date-stamped id is not a grammar violation.
        r = run_cli("validate", cdir)
        vout = r.stdout + r.stderr
        check("violates the ID grammar: GOAL-CHURN-001" in vout,
              "F14(a): validate did not flag the terminal-leading-zero id")
        check("violates the ID grammar: CHANGE-rollout-2026-04-15-1" not in vout,
              "F14(b): the date-stamped id must not be flagged for ID grammar")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part N – F8 entity resolution: entity-match proposals ──

def part_n_entity_resolution():
    """F8: emit-candidates proposes an entity match when a new candidate's name matches
    an existing canon element's name or alias; review-queue surfaces entity_match_proposals.
    A candidate whose name matches nothing in canon gets no proposal (no false positives).
    Corroboration (candidate id == existing id) is not flagged as a match."""
    if not shutil.which("node"):
        print("SKIP Part N: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-f8-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')

        # Canon element with a name and two aliases.
        canon_dir = os.path.join(org, "canon", "elements", "02_business", "actors")
        os.makedirs(canon_dir, exist_ok=True)
        with open(os.path.join(canon_dir, "ACTOR-ACME-1.yaml"), "w", encoding="utf-8") as fh:
            fh.write(
                'notation: actor\nid: ACTOR-ACME-1\nname: "Acme Logistics"\n'
                'aliases:\n  - "ACME"\n  - "Acme Logistics Ltd."\n'
                'zone: canon\nadmitted_at: "2026-01-01"\nadmitted_by: "v.test"\n'
                'gate_checks:\n  uniqueness: pass\n  consistency: pass\n  completeness: pass\n'
                'valid_from: "2026-01-01"\nvalid_to: null\n'
            )

        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        fid = "INTERVIEW-partner-2026-06-09-1"
        with open(os.path.join(fdir, fid + ".yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "%s"\nname: "Partner interview"\ntype: "INTERVIEW"\nzone: "field"\nnotes: "x"\n' % fid)

        res = os.path.join(work, "res.json")
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({"elements": [
                # Matches by primary name -- should get entity_match (matched_on: name)
                {"id": "ACTOR-NEW-1", "name": "Acme Logistics", "element_type": "ACTOR", "extraction_confidence": "high"},
                # Matches by alias -- should get entity_match (matched_on: alias)
                {"id": "ACTOR-NEW-2", "name": "ACME", "element_type": "ACTOR", "extraction_confidence": "high"},
                # Genuinely new -- no entity_match
                {"id": "ACTOR-NEW-3", "name": "Totally New Actor", "element_type": "ACTOR", "extraction_confidence": "high"},
            ], "relations": [], "assertions": []}, fh)

        cdir = os.path.join(org, "_intake", "processing", "candidates")
        run_cli("emit-candidates", os.path.join(fdir, fid + ".yaml"), "--from", res, "--candidates-dir", cdir)

        # Verify entity_match on candidate JSON files.
        name_cand_path = os.path.join(cdir, "ACTOR-NEW-1.json")
        alias_cand_path = os.path.join(cdir, "ACTOR-NEW-2.json")
        new_cand_path  = os.path.join(cdir, "ACTOR-NEW-3.json")
        name_cand  = json.loads(open(name_cand_path,  encoding="utf-8").read())
        alias_cand = json.loads(open(alias_cand_path, encoding="utf-8").read())
        new_cand   = json.loads(open(new_cand_path,   encoding="utf-8").read())

        check("entity_match" in name_cand and name_cand["entity_match"]["proposed_existing_id"] == "ACTOR-ACME-1",
              "F8: emit-candidates did not attach entity_match for a name-matched candidate")
        check(name_cand.get("entity_match", {}).get("matched_on") == "name",
              "F8: matched_on should be 'name' for a primary-name match")
        check("entity_match" in alias_cand and alias_cand["entity_match"]["proposed_existing_id"] == "ACTOR-ACME-1",
              "F8: emit-candidates did not attach entity_match for an alias-matched candidate")
        check(alias_cand.get("entity_match", {}).get("matched_on") == "alias",
              "F8: matched_on should be 'alias' for an alias match")
        check("entity_match" not in new_cand,
              "F8: emit-candidates must not propose entity_match for a genuinely new element")

        # Review-queue surfaces entity_match_proposals.
        rq_path = os.path.join(org, "_intake", "processing", "review-queue.yaml")
        run_cli("review-queue", cdir)
        with open(rq_path, encoding="utf-8") as fh:
            rq_text = fh.read()

        check("entity_match_proposals" in rq_text,
              "F8: review-queue did not emit an entity_match_proposals section")
        check("ACTOR-ACME-1" in rq_text,
              "F8: review-queue entity_match_proposals must name the proposed_existing_id")
        # Both the name-match and alias-match should appear (2 proposals).
        check(rq_text.count("ACTOR-ACME-1") >= 2,
              "F8: expected at least 2 entity_match_proposals (one per matched candidate)")
        # The queue candidates must also carry entity_match inline for the matching ones.
        check(rq_text.count("entity_match") >= 3,
              "F8: review-queue should carry entity_match on 2 candidates + entity_match_proposals block")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part O — extensions carry-through + canon/unresolved/ emission ──

def part_o_unresolved_extensions():
    if not shutil.which("node"):
        print("SKIP Part O: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-unres-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.6.0"\ncoverage_profile: full\n')

        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        fid = "INTERVIEW-eq-20260101-1"
        with open(os.path.join(fdir, fid + ".yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "%s"\nname: "x"\ntype: "INTERVIEW"\nzone: "field"\nadmitted_at: "2026-06-01"\nnotes: "x"\n' % fid)

        res = os.path.join(work, "res.json")
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({
                "elements": [
                    {"id": "PRODUCT-WIDGET-1", "name": "Widget Pro", "element_type": "PRODUCT",
                     "extraction_confidence": "high",
                     "extensions": {"materials": ["Steel 316L", "Rubber gasket B12"],
                                    "source_table": "product_equipment_matrix"}}
                ],
                "relations": [],
                "unresolved": [
                    {"ingest_field": "materials", "related_to": ["PRODUCT-WIDGET-1"],
                     "data": ["Steel 316L", "Rubber gasket B12"]},
                    {"ingest_field": "mystery_column", "data": "an object of unknown type"},
                    {"data": "missing ingest_field — must be dropped"},
                ],
            }, fh)

        r = run_cli("emit-candidates", os.path.join(fdir, fid + ".yaml"), "--from", res, "--ingest-date", "2026-06-10")
        check(r.returncode == 0, "Part O: emit-candidates failed: %s" % r.stderr.strip())

        # Mechanism 1 (CONTRACT §12): extensions ride onto the candidate verbatim.
        cand = os.path.join(org, "_intake", "processing", "candidates", "PRODUCT-WIDGET-1.json")
        if check(os.path.isfile(cand), "Part O: PRODUCT candidate not emitted"):
            c = json.load(open(cand, encoding="utf-8"))
            check(isinstance(c.get("extensions"), dict) and c["extensions"].get("materials"),
                  "Part O: extensions not carried onto the candidate")
        # validate must pass an extended candidate clean (EXT-001 pass-through).
        r = run_cli("validate", os.path.join(org, "_intake", "processing", "candidates"))
        check(r.returncode == 0,
              "Part O: validate flagged an extended candidate (EXT-001 broken): %s" % (r.stdout + r.stderr))

        # Mechanism 2 (CONTRACT §13): two well-formed untyped objects are parked in
        # canon/unresolved/; the third (missing ingest_field) is dropped, not emitted.
        udir = os.path.join(org, "canon", "unresolved")
        ufiles = sorted(f for f in os.listdir(udir)) if os.path.isdir(udir) else []
        check(ufiles == ["UNRES-001.yaml", "UNRES-002.yaml"],
              "Part O: expected UNRES-001/002 in canon/unresolved/, got %r" % ufiles)
        if ufiles:
            u = yaml.safe_load(open(os.path.join(udir, "UNRES-001.yaml"), encoding="utf-8"))
            for key in ("ingest_status", "ingest_source", "ingest_field", "ingest_date", "data"):
                check(key in u, "Part O: UNRES-001 missing required field %s" % key)
            check(u.get("ingest_status") == "unresolved", "Part O: ingest_status must be 'unresolved'")
            check("admitted_by" not in u and "gate_checks" not in u,
                  "Part O: an emitted holding entry must be NON-admitted (no admission record)")

        # THE ONE RULE: emit must not write ADMITTED canon — only the holding area.
        check(not os.path.isdir(os.path.join(org, "canon", "elements")),
              "Part O: emit-candidates created canon/elements/ — must never write admitted canon")
        check(not os.path.isdir(os.path.join(org, "canon", "views")),
              "Part O: emit-candidates created canon/views/ — must never write admitted canon")

        # UNRES-004: typed canon walkers must SKIP the holding area.
        r = run_cli("check-placement", org)
        check("0 catalogue element(s) scanned" in (r.stdout + r.stderr),
              "Part O: check-placement counted an unresolved entry as a typed element (UNRES-004)")
        r = run_cli("repo-check", org)
        rc = yaml.safe_load(r.stdout)
        check(rc["zones"]["canon"]["files"] == 0,
              "Part O: repo-check counted unresolved entries in the typed canon tally (UNRES-004): %r" % rc["zones"]["canon"])
        check(rc["integrity"]["unresolved_holding"] == 2,
              "Part O: repo-check did not report 2 unresolved holding entries: %r" % rc["integrity"].get("unresolved_holding"))

        # EXT-002: an extensions key shadowing a defined field is flagged (routes to review).
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        with open(os.path.join(cdir, "EXT-COLLIDE.json"), "w", encoding="utf-8") as fh:
            json.dump({"kind": "element", "id": "PRODUCT-Y-1", "name": "Y", "element_type": "PRODUCT",
                       "derived_from": [fid], "admitted_to": "pending", "extraction_confidence": "high",
                       "extensions": {"name": "shadow"}}, fh)
        r = run_cli("validate", cdir)
        check(r.returncode == 1 and "EXT-002" in (r.stdout + r.stderr),
              "Part O: validate did not flag EXT-002 for an extensions key shadowing a defined field")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part P — #434 regression: preset version currency ────────────

def part_p_preset_version_currency():
    """repo-check reports a version match for a repo pinned to the CLI's built-in
    preset version (read from coverage-presets.mjs, not hardcoded). Regression for
    the false-negative mismatch caused by stale built-in presets frozen at an old
    methodology version."""
    if not shutil.which("node"):
        print("SKIP Part P: `node` not found.")
        return
    version = cli_presets_version()
    work = tempfile.mkdtemp(prefix="ingest-p434-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "%s"\ncoverage_profile: core\n' % version)

        r = run_cli("repo-check", org)
        check(r.returncode == 0, "P: repo-check failed on a %s repo: %s" % (version, r.stderr or r.stdout))
        rep = yaml.safe_load(r.stdout)

        tooling = rep.get("tooling", {})
        check(tooling.get("methodology_version_match") is True,
              "P: repo-check must report methodology_version_match: true for a %s repo "
              "(false-negative regression from stale built-in presets); got tooling=%r" % (version, tooling))
        check(tooling.get("ok") is True,
              "P: repo-check tooling.ok must be true for a %s repo; got tooling=%r" % (version, tooling))
        red_flags = rep.get("integrity", {}).get("red_flags", [])
        version_flags = [f for f in red_flags if "does not match" in f and "CLI built-in" in f]
        check(len(version_flags) == 0,
              "P: repo-check must not emit a version-mismatch red flag for a %s repo; "
              "got red_flags=%r" % (version, red_flags))
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part Q — origin pass-through + REQ-004 validation (task #439) ─

def part_q_origin_classification():
    """emit-candidates carries origin through for REQUIREMENT elements; validate enforces
    REQ-004 (closed vocabulary) on the origin field; all three valid values pass clean."""
    if not shutil.which("node"):
        print("SKIP Part Q: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-origin-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.7.0"\ncoverage_profile: full\n')

        fdir = os.path.join(org, "field", "interviews")
        os.makedirs(fdir, exist_ok=True)
        fid = "INTERVIEW-q-20260703-1"
        with open(os.path.join(fdir, fid + ".yaml"), "w", encoding="utf-8") as fh:
            fh.write('id: "%s"\nname: "x"\ntype: "INTERVIEW"\nzone: "field"\nnotes: "x"\n' % fid)

        res = os.path.join(work, "res.json")
        # Three requirements — one per valid origin value; no invalid origin yet.
        with open(res, "w", encoding="utf-8") as fh:
            json.dump({"elements": [
                {"id": "REQUIREMENT-LEG-1", "name": "Annual regulatory report",
                 "element_type": "REQUIREMENT", "extraction_confidence": "high",
                 "origin": "legislative"},
                {"id": "REQUIREMENT-PROC-1", "name": "SOP output specification",
                 "element_type": "REQUIREMENT", "extraction_confidence": "high",
                 "origin": "process-product"},
                {"id": "REQUIREMENT-PROJ-1", "name": "Deliverable acceptance criteria",
                 "element_type": "REQUIREMENT", "extraction_confidence": "high",
                 "origin": "project-product"},
                # Non-REQUIREMENT element — must NOT carry origin.
                {"id": "GOAL-COMPLIANCE-1", "name": "Compliance goal",
                 "element_type": "GOAL", "extraction_confidence": "high"},
            ], "relations": [], "assertions": []}, fh)

        cdir = os.path.join(org, "_intake", "processing", "candidates")
        r = run_cli("emit-candidates", os.path.join(fdir, fid + ".yaml"), "--from", res, "--candidates-dir", cdir)
        check(r.returncode == 0, "Q: emit-candidates failed: %s" % r.stderr.strip())

        # origin carried through for each valid value.
        for cid, expected_origin in [
            ("REQUIREMENT-LEG-1", "legislative"),
            ("REQUIREMENT-PROC-1", "process-product"),
            ("REQUIREMENT-PROJ-1", "project-product"),
        ]:
            path = os.path.join(cdir, cid + ".json")
            if check(os.path.isfile(path), "Q: candidate not emitted: %s" % cid):
                c = json.load(open(path, encoding="utf-8"))
                check(c.get("origin") == expected_origin,
                      "Q: origin not carried through for %s (got %r)" % (cid, c.get("origin")))

        # GOAL candidate must NOT carry origin.
        goal_path = os.path.join(cdir, "GOAL-COMPLIANCE-1.json")
        if check(os.path.isfile(goal_path), "Q: GOAL candidate not emitted"):
            gc = json.load(open(goal_path, encoding="utf-8"))
            check("origin" not in gc, "Q: non-REQUIREMENT candidate must not carry origin")

        # All three valid-origin REQUIREMENTs pass validate clean.
        r = run_cli("validate", cdir)
        check(r.returncode == 0,
              "Q: valid-origin candidates were flagged by validate: %s" % (r.stdout + r.stderr))

        # REQ-004: an invalid origin value is flagged.
        with open(os.path.join(cdir, "REQ-BADORIGIN.json"), "w", encoding="utf-8") as fh:
            json.dump({"kind": "element", "id": "REQUIREMENT-BAD-1", "name": "Bad origin",
                       "element_type": "REQUIREMENT", "origin": "contractual",
                       "derived_from": [fid], "admitted_to": "pending",
                       "extraction_confidence": "high"}, fh)
        r = run_cli("validate", cdir)
        out = r.stdout + r.stderr
        check(r.returncode == 1 and "REQ-004" in out,
              "Q: validate did not flag REQ-004 for an invalid origin value (got: %r)" % out)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part R — #807 privacy pre-admission gate ──────────────────────

def part_r_privacy_gate():
    """privacy-scan CLEAN/STRIPPED/REJECTED; admit-source (field) refuses with no scan
    record, a stale record, or the un-redacted original after STRIPPED; the epic's
    name+email+phone reproduction is not admitted verbatim; enabled:false opts out."""
    if not shutil.which("node"):
        print("SKIP Part R: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-privacy-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(org)
        run_cli("scaffold-intake", org)
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n')
        inbox = os.path.join(org, "_intake", "inbox")
        proc = os.path.join(org, "_intake", "processing")

        # R1 — a clean document scans CLEAN.
        with open(os.path.join(inbox, "clean.md"), "w", encoding="utf-8") as fh:
            fh.write("The Head of Operations described rising churn over two quarters.\n")
        run_cli("convert", os.path.join(inbox, "clean.md"))
        clean_md = os.path.join(proc, "clean.md")
        r = run_cli("privacy-scan", clean_md)
        check(r.returncode == 0 and "CLEAN" in r.stdout, f"R1: clean fixture should scan CLEAN: {r.stdout}{r.stderr}")

        # R2 — admit-source refuses a document with NO privacy-scan record.
        with open(os.path.join(inbox, "unscanned.md"), "w", encoding="utf-8") as fh:
            fh.write("Unscanned note.\n")
        run_cli("convert", os.path.join(inbox, "unscanned.md"))
        unscanned_md = os.path.join(proc, "unscanned.md")
        r = run_cli("admit-source", "--zone", "field", unscanned_md,
                    "--type", "OBSERVATION", "--role", "ROLE-OPS-1", "--date", "2026-07-14")
        check(r.returncode == 1 and "no privacy-scan record" in (r.stdout + r.stderr),
              f"R2: admit-source must refuse a document with no privacy-scan record: {r.stdout}{r.stderr}")
        check(not os.path.isdir(os.path.join(org, "field", "observations")),
              "R2: a refused document must not be admitted")

        # R3 — the epic's reproduction: full name + personal email + personal phone.
        repro = ("Contact: Jane Doe\nEmail: jane.doe@personalmail.example\n"
                 "Phone: +1 555-123-4567\n")
        with open(os.path.join(inbox, "repro.md"), "w", encoding="utf-8") as fh:
            fh.write(repro)
        run_cli("convert", os.path.join(inbox, "repro.md"))
        repro_md = os.path.join(proc, "repro.md")
        r = run_cli("privacy-scan", repro_md)
        check(r.returncode == 0 and "STRIPPED" in r.stdout,
              f"R3: name+email+phone fixture should be STRIPPED (default on_detection: strip): {r.stdout}{r.stderr}")
        redacted = os.path.join(proc, "repro.redacted.md")
        check(os.path.isfile(redacted), "R3: STRIPPED must write a redacted copy")
        redacted_text = open(redacted, encoding="utf-8").read()
        check("jane.doe@personalmail.example" not in redacted_text and "555-123-4567" not in redacted_text,
              "R3: the redacted copy must not carry the blocked email/phone verbatim")

        # admit-source on the ORIGINAL (still carrying the blocked fragments) is refused...
        r = run_cli("admit-source", "--zone", "field", repro_md,
                    "--type", "OBSERVATION", "--role", "ROLE-OPS-1", "--date", "2026-07-14")
        check(r.returncode == 1 and "admit the redacted copy instead" in (r.stdout + r.stderr),
              f"R3: admit-source on the original after STRIPPED must be refused: {r.stdout}{r.stderr}")

        # ...but succeeds on the redacted copy, and the admitted artefact carries no PII verbatim.
        r = run_cli("admit-source", "--zone", "field", redacted,
                    "--type", "OBSERVATION", "--role", "ROLE-OPS-1", "--date", "2026-07-14",
                    "--slug", "repro")
        check(r.returncode == 0, f"R3: admit-source on the redacted copy should succeed: {r.stdout}{r.stderr}")
        art = os.path.join(org, "field", "observations", "OBSERVATION-repro-20260714-1.yaml")
        if check(os.path.isfile(art), "R3: the redacted-copy admission did not write a field artefact"):
            body = open(art, encoding="utf-8").read()
            check("jane.doe@personalmail.example" not in body and "555-123-4567" not in body,
                  "R3: the admitted field artefact must not carry the blocked PII verbatim")

        # R4 — a stale scan (content changed after scanning) is refused, not silently trusted.
        with open(os.path.join(inbox, "stale.md"), "w", encoding="utf-8") as fh:
            fh.write("Original content.\n")
        run_cli("convert", os.path.join(inbox, "stale.md"))
        stale_md = os.path.join(proc, "stale.md")
        run_cli("privacy-scan", stale_md)
        with open(stale_md, "a", encoding="utf-8") as fh:
            fh.write("Changed after scanning.\n")
        r = run_cli("admit-source", "--zone", "field", stale_md,
                    "--type", "OBSERVATION", "--role", "ROLE-OPS-1", "--date", "2026-07-14")
        check(r.returncode == 1 and "stale" in (r.stdout + r.stderr),
              f"R4: a stale privacy-scan record must be refused, not trusted: {r.stdout}{r.stderr}")

        # R5 — on_detection: reject blocks the whole document (REJECTED, no redacted copy);
        # privacy-report.yaml records it and never leaks a fragment verbatim.
        org2 = os.path.join(work, "org2")
        os.makedirs(org2)
        run_cli("scaffold-intake", org2)
        with open(os.path.join(org2, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n'
                     'ingest:\n  privacy_gate:\n    enabled: true\n    on_detection: reject\n')
        with open(os.path.join(org2, "_intake", "inbox", "bad.md"), "w", encoding="utf-8") as fh:
            fh.write(repro)
        run_cli("convert", os.path.join(org2, "_intake", "inbox", "bad.md"))
        bad_md = os.path.join(org2, "_intake", "processing", "bad.md")
        r = run_cli("privacy-scan", bad_md)
        check(r.returncode == 1 and "REJECTED" in r.stdout,
              f"R5: on_detection: reject should produce REJECTED, not STRIPPED: {r.stdout}{r.stderr}")
        check(not os.path.isfile(os.path.join(org2, "_intake", "processing", "bad.redacted.md")),
              "R5: REJECTED must not write a redacted copy")
        report_path = os.path.join(org2, "_intake", "processing", "privacy-report.yaml")
        if check(os.path.isfile(report_path), "R5: privacy-report.yaml was not written"):
            rep = yaml.safe_load(open(report_path, encoding="utf-8"))
            check(rep.get("summary", {}).get("rejected") == 1,
                  f"R5: privacy-report summary.rejected should be 1: {rep.get('summary')}")
            scanned = rep.get("scanned", [])
            check(any(s.get("outcome") == "REJECTED" for s in scanned), "R5: privacy-report did not record the REJECTED scan")
            for s in scanned:
                for frag in (s.get("blocked_fragments") or []):
                    check("jane.doe@personalmail.example" not in frag.get("fragment_preview", ""),
                          "R5: privacy-report fragment_preview must never carry verbatim PII")

        # R6 — enabled: false is an explicit adopter opt-out: admit-source proceeds
        # with NO privacy-scan record at all.
        org3 = os.path.join(work, "org3")
        os.makedirs(org3)
        run_cli("scaffold-intake", org3)
        with open(os.path.join(org3, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write('transitrix: 1\nmethodology_version: "0.5.0"\ncoverage_profile: full\n'
                     'ingest:\n  privacy_gate:\n    enabled: false\n')
        with open(os.path.join(org3, "_intake", "inbox", "off.md"), "w", encoding="utf-8") as fh:
            fh.write("Note.\n")
        run_cli("convert", os.path.join(org3, "_intake", "inbox", "off.md"))
        off_md = os.path.join(org3, "_intake", "processing", "off.md")
        r = run_cli("admit-source", "--zone", "field", off_md,
                    "--type", "OBSERVATION", "--role", "ROLE-OPS-1", "--date", "2026-07-14")
        check(r.returncode == 0,
              f"R6: enabled:false must let admit-source proceed without a privacy-scan record: {r.stdout}{r.stderr}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part S — workflow-status (vkgeorgia/strategy#824) ────────────

def part_s_workflow_status():
    """workflow-status reports every human gate's phase + count in one invocation:
    ADR (author:agent proposed broken out from human-proposed), Work Item, canon
    element status, REQUIREMENT/CONSTRAINT review-overdue, ingest batch awaiting
    review. --data-free strips ids/paths; --format yaml matches the default
    Markdown table's counts; a missing/out-of-vocabulary phase value lands in an
    `unknown` row rather than being dropped; no output field carries a date/age;
    running twice with no repo change is byte-identical; exit code is always 0."""
    if not shutil.which("node"):
        print("SKIP Part S: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="ingest-workflow-status-")
    try:
        org = os.path.join(work, "org")
        decisions = os.path.join(org, "operations", "decisions")
        work_items = os.path.join(org, "operations", "work-items")
        goals = os.path.join(org, "canon", "elements", "01_motivation", "goals")
        reqs = os.path.join(org, "canon", "elements", "01_motivation", "requirements")
        processing = os.path.join(org, "_intake", "processing")
        for d in (decisions, work_items, goals, reqs, processing):
            os.makedirs(d)

        def write(path, text):
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)

        write(os.path.join(decisions, "ADR-0001-x.md"),
              "---\nid: ADR-0001\ntitle: x\nstatus: accepted\ndate: \"2026-01-01\"\n---\n\n## Context\n")
        write(os.path.join(decisions, "ADR-0002-y.md"),
              "---\nid: ADR-0002\ntitle: y\nstatus: proposed\nauthor: agent\ndate: \"2026-01-02\"\n---\n\n## Context\n")
        write(os.path.join(decisions, "ADR-0003-z.md"),
              "---\nid: ADR-0003\ntitle: z\nstatus: proposed\ndate: \"2026-01-03\"\n---\n\n## Context\n")
        write(os.path.join(decisions, "ADR-0004-w.md"),
              "---\nid: ADR-0004\ntitle: w\nstatus: withdrawn\ndate: \"2026-01-04\"\n---\n\n## Context\n")

        write(os.path.join(work_items, "WI-0001-a.md"),
              "---\nid: WI-0001\ntitle: a\nstatus: in_progress\nopened: \"2026-01-01\"\n---\n\n## Outcome\n")
        write(os.path.join(work_items, "WI-0002-b.md"),
              "---\nid: WI-0002\ntitle: b\nstatus: done\nopened: \"2026-01-01\"\nclosed: \"2026-01-05\"\n---\n\n## Outcome\n")
        write(os.path.join(work_items, "WI-0003-c.md"),
              "---\nid: WI-0003\ntitle: c\nstatus: cancelled\nopened: \"2026-01-01\"\n---\n\n## Outcome\n")

        write(os.path.join(goals, "GOAL-ACTIVE-1.yaml"), 'id: "GOAL-ACTIVE-1"\nname: "x"\nstatus: active\n')
        write(os.path.join(goals, "GOAL-NOSTATUS-1.yaml"), 'id: "GOAL-NOSTATUS-1"\nname: "y"\n')
        write(os.path.join(reqs, "REQUIREMENT-OVERDUE-1.yaml"),
              'id: "REQUIREMENT-OVERDUE-1"\nname: "z"\nnext_review_at: "2020-01-01"\n')

        write(os.path.join(processing, "review-queue.yaml"), "generated_by: \"@transitrix/ingest-cli\"\n")

        r = run_cli("workflow-status", org)
        check(r.returncode == 0, "S: workflow-status failed: %s" % (r.stderr or r.stdout))
        md_out = r.stdout

        check("ADR" in md_out and "Work Item" in md_out and "Canon element" in md_out
              and "REQUIREMENT/CONSTRAINT" in md_out and "Ingest batch" in md_out,
              "S: one invocation must cover all five sources: %r" % md_out)
        check("| ADR | proposed (author: agent) | 1 |" in md_out,
              "S: author:agent proposed ADR must be its own row, distinct from human-proposed: %r" % md_out)
        check("| ADR | proposed (human) | 1 |" in md_out,
              "S: human-authored proposed ADR must be counted separately: %r" % md_out)
        check("| ADR | unknown | 1 |" in md_out,
              "S: an ADR status outside the vocabulary (withdrawn) must land in unknown, not be dropped: %r" % md_out)
        check("| Work Item | unknown | 1 |" in md_out,
              "S: a WI status outside the vocabulary (cancelled) must land in unknown, not be dropped: %r" % md_out)
        # 2, not 1: GOAL-NOSTATUS-1 has no status: field, and REQUIREMENT-OVERDUE-1
        # is *also* a canon element with no status: field — the canon-element
        # section scans every canon/** element regardless of TYPE, a separate
        # dimension from the REQUIREMENT/CONSTRAINT overdue-review section below.
        check("| Canon element | unknown | 2 |" in md_out,
              "S: canon elements with no status: field must land in unknown, not be dropped or defaulted: %r" % md_out)
        check("| REQUIREMENT/CONSTRAINT | review overdue | 1 |" in md_out,
              "S: the overdue REQUIREMENT must be counted (reusing check-stale's scan): %r" % md_out)
        check("| Ingest batch | awaiting review | 1 |" in md_out,
              "S: the ingest batch with a review-queue.yaml must be counted: %r" % md_out)
        check("ADR-0002" in md_out,
              "S: default output must list ids in open (non-terminal) phases: %r" % md_out)
        check("ADR-0001" not in md_out,
              "S: an id in a terminal phase (accepted) must not appear in the open-items detail: %r" % md_out)
        check(not re.search(r"\b\d+\s*(day|hour)s?\b", md_out, re.I),
              "S: no output field may carry an age/duration: %r" % md_out)

        # --data-free: no id, name, filename, or path anywhere in the output.
        r = run_cli("workflow-status", org, "--data-free")
        check(r.returncode == 0, "S: --data-free run failed: %s" % (r.stderr or r.stdout))
        for leak in ("ADR-0001", "ADR-0002", "WI-0001", "GOAL-ACTIVE-1", "REQUIREMENT-OVERDUE-1", org):
            check(leak not in r.stdout, "S: --data-free leaked %r" % leak)

        # --format yaml must carry the identical counts as the default Markdown table.
        r = run_cli("workflow-status", org, "--format", "yaml")
        check(r.returncode == 0, "S: --format yaml failed: %s" % (r.stderr or r.stdout))
        rep = yaml.safe_load(r.stdout)
        counts = {}
        for obj in rep.get("objects", []):
            for ph in obj.get("phases", []):
                counts[(obj["object"], ph["phase"])] = ph["count"]
        check(counts.get(("ADR", "proposed (author: agent)")) == 1, "S: yaml/md count mismatch (ADR agent-proposed)")
        check(counts.get(("ADR", "proposed (human)")) == 1, "S: yaml/md count mismatch (ADR human-proposed)")
        check(counts.get(("Work Item", "in_progress")) == 1, "S: yaml/md count mismatch (WI in_progress)")
        check(counts.get(("Canon element", "Active")) == 1, "S: yaml/md count mismatch (canon Active)")
        check(counts.get(("REQUIREMENT/CONSTRAINT", "review overdue")) == 1, "S: yaml/md count mismatch (overdue)")
        check(counts.get(("Ingest batch", "awaiting review")) == 1, "S: yaml/md count mismatch (ingest batch)")

        # Running twice with no repo change yields identical output.
        r2 = run_cli("workflow-status", org)
        check(r2.stdout == md_out, "S: two runs with no repo change produced different output")

        # A repo with none of the five sources degrades gracefully — omitted
        # sections, not an error — and still exits 0.
        empty_org = os.path.join(work, "empty")
        os.makedirs(empty_org)
        r = run_cli("workflow-status", empty_org)
        check(r.returncode == 0, "S: an empty repo must still exit 0: %s" % (r.stderr or r.stdout))
        check("ADR" not in r.stdout and "Work Item" not in r.stdout and "Canon element" not in r.stdout
              and "Ingest batch" not in r.stdout,
              "S: absent sources must produce an omitted section, not a zero-row placeholder: %r" % r.stdout)
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
part_i_placement()
part_j_duplicate_source()
part_k_suggest_profile()
part_l_repo_check()
part_m_id_grammar()
part_n_entity_resolution()
part_o_unresolved_extensions()
part_p_preset_version_currency()
part_q_origin_classification()
part_r_privacy_gate()
part_s_workflow_status()

if _failures:
    print("FAIL - Transitrix Ingest skill integrity:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Ingest skill + CLI pipeline test: all checks passed.")
sys.exit(0)
