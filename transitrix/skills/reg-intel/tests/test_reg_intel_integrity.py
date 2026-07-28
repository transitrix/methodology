#!/usr/bin/env python3
"""From-scratch integrity test for the Transitrix Reg-Intel skill + @transitrix/reg-intel-cli.

Deterministic, no-API-key, no-network guard for the CLI increments landed so far
(coverage-in-validate + cosmetic-diff land later). Eleven parts:

  A. Bundle integrity — SKILL.md + README.md present and frontmatter parses; the CLI
     package.json parses and declares its bin; the entry point exists; `--version`
     prints; `--help` lists the implemented subcommands.
  B. list-due (the "when") — a fixture codex tree drives the scheduler: a source past
     its next_scan_due is due; a future one is not; a monitoring source with no scan
     block is `never_scanned` (due); a static source's monitor_instead counterpart is
     surfaced as its own target. One run filters by date — not N schedules.
  C. update-scan (Step 8) — writes the codex scan block with correct cadence math
     (clamping month-ends), sets change/review flags, preserves every other field, and
     refuses a static (monitoring_needed: false) artefact and a missing cadence.
  D. digest (Step 9, the human gate) — the digest schema parses; the digest groups
     staged SEGMENT / candidate / AMENDMENT artefacts by codex source (candidates via
     derived_from -> segment), surfaces orphans under (unassociated), tallies, and is
     always gated (admits_to_canon: false) — even on an empty run.
  E. check-signal (Step 2, the change-signal gate) — compares an observed signal to the
     last-seen value in the operations signal-cache: first observation is 'moved' and
     writes the cache (scan NOT bumped); an unchanged signal bumps the scan cadence; a
     changed signal is 'moved' with the prior value; no signal refuses unless
     --accept-no-signal; a static artefact is rejected.
  F. fetch-snapshot (Step 3) — snapshots the caller-fetched bytes to _intake/snapshots/
     and fingerprints them: first harvest is 'captured'; identical bytes are
     'bytes_identical'; markup/whitespace/tracker churn with unchanged normative text is
     'cosmetic_change'; a substantive change is 'changed'; a binary format falls back to
     byte-level 'changed'; the committed operations cache detects identical bytes even
     after _intake/ is wiped (cross-checkout); --from required; a static artefact rejected.
  G. segment (Step 4) — shapes the segment agent result into proposed SEGMENT-* field
     artefacts: source + source_hash from the snapshot, text_hash from the excerpt,
     ids per source slug, a locator-less segment skipped, the proposed admission record;
     the digest counts them; --from required; ordinals continue across runs.
  H. classify (Step 5) — shapes the classify agent result into proposed REQUIREMENT-* /
     CONSTRAINT-* candidates: kind→TYPE, derived_from cites the SEGMENT, obligation_level
     + category carried, low-confidence keeps ambiguous_alt (both classifications),
     bad-kind / no-derived_from skipped, proposed record with gate_checks pending; the
     digest counts them; --from required.
  I. validate (Step 6) — runs staged SEGMENTs + candidates through the contract checks
     (23-segment.md SEGMENT-001..008, ID grammar, candidate field rules): a conformant
     batch passes; a non-codex source flags SEGMENT-002, a bad hash SEGMENT-006, a
     candidate with no derived_from CAND-002; flags-not-drops, exit 1 when review needed.
  J. amendment (Step 7) — emits a proposed AMENDMENT-* recording source drift: source +
     detected_at, segment_refs auto-collected from this source's staged SEGMENTs only,
     likely_impacted hints, motivates [] on first emission; the digest counts it;
     --change required; a static (monitoring_needed: false) source is rejected.
  K. operational templates — the templates/ bundle is present (daily driver, systemd
     service + timer, fetch-recipes, snapshots README); the daily driver invokes the
     live run-loop commands and is valid bash; fetch-recipes states the API-first rule
     and names the check-signal methods; the timer defines an OnCalendar schedule.
  L. #837 batch naming — the first digest of a run lands at the flat legacy
     review-digest.yaml path unchanged; a second, concurrent digest does not overwrite
     it and instead lands under a dated review-digest-<scope>-YYYYMMDD-<seq>/
     directory (--scope defaults to "batch"), same mechanism as ingest-cli's
     review-queue naming.

Run:  python transitrix/skills/reg-intel/tests/test_reg_intel_integrity.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

import datetime
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
SKILL_DIR = os.path.dirname(HERE)                                  # transitrix/skills/reg-intel
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SKILL_DIR)))
CLI = os.path.join(REPO_ROOT, "packages", "reg-intel-cli", "reg-intel.mjs")
PKG = os.path.join(REPO_ROOT, "packages", "reg-intel-cli", "package.json")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def frontmatter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return yaml.safe_load(m.group(1)) if m else None


def run_cli(*args):
    return subprocess.run(["node", CLI, *args], capture_output=True, text=True)


# ── Part A — bundle integrity ────────────────────────────────────

def part_a_bundle():
    skill = os.path.join(SKILL_DIR, "SKILL.md")
    if check(os.path.isfile(skill), "SKILL.md missing from bundle"):
        fm = frontmatter(skill)
        if check(isinstance(fm, dict), "SKILL.md frontmatter does not parse"):
            for key in ("name", "description", "when_to_use", "allowed-tools"):
                check(key in fm, f"SKILL.md frontmatter missing required key: {key}")
    check(os.path.isfile(os.path.join(SKILL_DIR, "README.md")), "README.md missing from bundle")

    if check(os.path.isfile(PKG), "CLI package.json missing"):
        try:
            pkg = json.load(open(PKG, encoding="utf-8"))
            check(pkg.get("name") == "@transitrix/reg-intel-cli", "package name is not @transitrix/reg-intel-cli")
            check("transitrix-reg-intel" in (pkg.get("bin") or {}), "package.json does not declare the transitrix-reg-intel bin")
        except Exception as e:  # noqa: BLE001
            check(False, f"package.json does not parse: {e}")
    check(os.path.isfile(CLI), "CLI entry point missing: packages/reg-intel-cli/reg-intel.mjs")

    if not shutil.which("node"):
        print("SKIP Part A (CLI run): `node` not found on PATH.")
        return
    r = run_cli("--version")
    check(r.returncode == 0 and re.match(r"^\d+\.\d+\.\d+", r.stdout.strip()), f"--version did not print a version: {r.stdout!r}")
    r = run_cli("--help")
    check("list-due" in r.stdout and "update-scan" in r.stdout, "--help does not list the implemented subcommands")


# ── fixture codex tree ───────────────────────────────────────────

def _codex_org(work):
    org = os.path.join(work, "org")
    for sub in ("codex/external/eu", "codex/external/us", "codex/internal"):
        os.makedirs(os.path.join(org, sub), exist_ok=True)
    with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
        fh.write('transitrix: 1\nmethodology_version: "0.5.0"\n')

    def w(rel, body):
        with open(os.path.join(org, rel), "w", encoding="utf-8") as fh:
            fh.write(body)

    # A — due (next_scan_due in the past).
    w("codex/external/eu/REGULATION-A-1.yaml",
      'id: "REGULATION-A-1"\ntype: "REGULATION"\nname: "Reg A"\nzone: "codex"\n'
      'source_url: "https://example.eu/a"\nmonitoring_needed: true\n'
      'scan:\n  last_scanned_at: "2026-04-01"\n  next_scan_due: "2026-05-01"\n'
      '  scan_frequency: monthly\n  change_detected: false\n  change_description: null\n  review_needed: false\n')
    # B — not due (future).
    w("codex/external/us/REGULATION-B-1.yaml",
      'id: "REGULATION-B-1"\ntype: "REGULATION"\nname: "Reg B"\nmonitoring_needed: true\n'
      'scan:\n  last_scanned_at: "2026-06-01"\n  next_scan_due: "2026-12-01"\n'
      '  scan_frequency: quarterly\n  change_detected: false\n  change_description: null\n  review_needed: false\n')
    # C — monitoring, never scanned (no scan block) → due.
    w("codex/internal/POLICY-C-1.yaml",
      'id: "POLICY-C-1"\ntype: "POLICY"\nname: "Policy C"\nmonitoring_needed: true\n')
    # D — static, points at a live counterpart via monitor_instead.
    w("codex/external/us/REGULATION-D-1.yaml",
      'id: "REGULATION-D-1"\ntype: "REGULATION"\nname: "Final Rule D"\nmonitoring_needed: false\n'
      'monitor_instead:\n  - id: "REGULATION-CFR-1"\n    name: "21 CFR Part 809"\n    url: "https://ecfr.gov/x"\n')
    return org


# ── Part B — list-due ────────────────────────────────────────────

def part_b_list_due():
    if not shutil.which("node"):
        print("SKIP Part B: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-due-")
    try:
        org = _codex_org(work)
        r = run_cli("list-due", org, "--as-of", "2026-06-08", "--json")
        check(r.returncode == 0, f"B: list-due failed: {r.stderr.strip()}")
        try:
            due = json.loads(r.stdout)
        except Exception as e:  # noqa: BLE001
            return check(False, f"B: list-due --json did not emit JSON: {e}: {r.stdout!r}")
        by = {d.get("id"): d for d in due}

        check("REGULATION-A-1" in by and by["REGULATION-A-1"]["reason"] == "due",
              "B: a source past next_scan_due must be due")
        check("REGULATION-B-1" not in by, "B: a source with a future next_scan_due must NOT be due")
        check("POLICY-C-1" in by and by["POLICY-C-1"]["reason"] == "never_scanned",
              "B: a monitoring source with no scan block must be due (never_scanned)")
        check("REGULATION-CFR-1" in by and by["REGULATION-CFR-1"]["reason"] == "monitor_instead"
              and by["REGULATION-CFR-1"].get("via") == "REGULATION-D-1",
              "B: a static source's monitor_instead counterpart must be surfaced as a target")
        # The static parent itself is never a target.
        check("REGULATION-D-1" not in by, "B: a monitoring_needed: false artefact must not itself be a scan target")

        # As-of before A's due date → A drops out (one run filters by date).
        r = run_cli("list-due", org, "--as-of", "2026-04-15", "--json")
        early = {d.get("id") for d in json.loads(r.stdout)}
        check("REGULATION-A-1" not in early, "B: --as-of before next_scan_due must exclude the source (date filter)")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part C — update-scan ─────────────────────────────────────────

def part_c_update_scan():
    if not shutil.which("node"):
        print("SKIP Part C: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-scan-")
    try:
        org = _codex_org(work)
        a_file = os.path.join(org, "codex", "external", "eu", "REGULATION-A-1.yaml")

        r = run_cli("update-scan", a_file, "--today", "2026-06-08", "--change", "Article 3 amended", "--review")
        check(r.returncode == 0, f"C: update-scan failed: {r.stderr.strip()}")
        d = yaml.safe_load(open(a_file, encoding="utf-8"))
        scan = d.get("scan", {})
        check(scan.get("last_scanned_at") == "2026-06-08", "C: last_scanned_at not set to --today")
        check(scan.get("next_scan_due") == "2026-07-08", f"C: monthly cadence math wrong: {scan.get('next_scan_due')}")
        check(scan.get("scan_frequency") == "monthly", "C: scan_frequency must be preserved from the existing block")
        check(scan.get("change_detected") is True and scan.get("change_description") == "Article 3 amended",
              "C: --change must set change_detected + change_description")
        check(scan.get("review_needed") is True, "C: --review must set review_needed: true")
        # Every other field is preserved untouched.
        for k, v in {"id": "REGULATION-A-1", "type": "REGULATION", "name": "Reg A",
                     "zone": "codex", "source_url": "https://example.eu/a", "monitoring_needed": True}.items():
            check(d.get(k) == v, f"C: update-scan must not modify other fields — {k} changed to {d.get(k)!r}")

        # Month-end clamp: Jan 31 + monthly → Feb 28.
        b_file = os.path.join(org, "codex", "external", "us", "REGULATION-B-1.yaml")
        run_cli("update-scan", b_file, "--today", "2026-01-31", "--frequency", "monthly")
        sb = yaml.safe_load(open(b_file, encoding="utf-8")).get("scan", {})
        check(sb.get("next_scan_due") == "2026-02-28", f"C: month-end clamp wrong: {sb.get('next_scan_due')}")

        # No scan block + no --frequency → error (cadence is required).
        c_file = os.path.join(org, "codex", "internal", "POLICY-C-1.yaml")
        r = run_cli("update-scan", c_file, "--today", "2026-06-08")
        check(r.returncode != 0 and "scan_frequency is required" in (r.stdout + r.stderr),
              "C: a first scan with no --frequency must error, not guess a cadence")
        # …then with --frequency it appends a fresh block.
        r = run_cli("update-scan", c_file, "--today", "2026-06-08", "--frequency", "weekly")
        check(r.returncode == 0 and yaml.safe_load(open(c_file, encoding="utf-8"))["scan"]["next_scan_due"] == "2026-06-15",
              "C: update-scan --frequency must append a fresh scan block")

        # Static artefact (monitoring_needed: false) rejects a scan block.
        s_file = os.path.join(org, "codex", "external", "us", "REGULATION-D-1.yaml")
        r = run_cli("update-scan", s_file, "--today", "2026-06-08", "--frequency", "weekly")
        check(r.returncode != 0 and "monitoring_needed: true" in (r.stdout + r.stderr),
              "C: a static (monitoring_needed: false) artefact must reject a scan block")

        # Resolve by CODEX-ID (run with cwd inside the org).
        r = subprocess.run(["node", CLI, "update-scan", "REGULATION-A-1", "--today", "2026-06-09"],
                           capture_output=True, text=True, cwd=org)
        check(r.returncode == 0, f"C: update-scan by CODEX-ID (cwd in org) failed: {(r.stdout + r.stderr).strip()}")
        check(yaml.safe_load(open(a_file, encoding="utf-8"))["scan"]["last_scanned_at"] == "2026-06-09",
              "C: update-scan by CODEX-ID did not resolve + write the right file")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part D — digest (Step 9, the human gate) ─────────────────────

def part_d_digest():
    if not shutil.which("node"):
        print("SKIP Part D: `node` not found.")
        return

    # The digest schema ships with the bundle and parses.
    schema = os.path.join(SKILL_DIR, "schemas", "review-digest.schema.json")
    if check(os.path.isfile(schema), "review-digest.schema.json missing from bundle"):
        try:
            import json as _json
            _json.load(open(schema, encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            check(False, f"review-digest.schema.json does not parse: {e}")

    work = tempfile.mkdtemp(prefix="regintel-digest-")
    try:
        org = _codex_org(work)
        proc = os.path.join(org, "_intake", "processing")
        for sub in ("segments", "candidates", "amendments"):
            os.makedirs(os.path.join(proc, sub), exist_ok=True)

        def w(rel, body):
            with open(os.path.join(proc, rel), "w", encoding="utf-8") as fh:
                fh.write(body)

        # Give REGULATION-A-1 a scan block + a full set of run artefacts.
        run_cli("update-scan", os.path.join(org, "codex", "external", "eu", "REGULATION-A-1.yaml"),
                "--today", "2026-06-08", "--change", "Art 3 changed", "--review")
        w("segments/SEGMENT-a-1.yaml",
          'id: "SEGMENT-a-1"\nsource: "REGULATION-A-1"\nlocator: "Art.3(1)"\nextraction_confidence: high\nzone: "field"\n')
        w("candidates/REQUIREMENT-a-1.yaml",
          'id: "REQUIREMENT-a-1"\nderived_from: [SEGMENT-a-1]\nextraction_confidence: medium\nadmission_state: proposed\n')
        w("candidates/CONSTRAINT-a-1.yaml",
          'id: "CONSTRAINT-a-1"\nderived_from:\n  - SEGMENT-a-1\nextraction_confidence: high\n')
        w("amendments/AMENDMENT-a-1.yaml",
          'id: "AMENDMENT-a-1"\nsource: "REGULATION-A-1"\nchange_description: "Article 3 amended"\nsegment_refs: [SEGMENT-a-1]\n')
        # An orphan segment with no source must surface, not vanish.
        w("segments/SEGMENT-orphan-1.yaml", 'id: "SEGMENT-orphan-1"\nlocator: "§1"\nextraction_confidence: low\n')

        r = run_cli("digest", org, "--run-id", "run-1", "--as-of", "2026-06-08")
        check(r.returncode == 0, f"D: digest failed: {r.stderr.strip()}")
        dg = yaml.safe_load(open(os.path.join(proc, "review-digest.yaml"), encoding="utf-8"))

        check(dg.get("gate", {}).get("admits_to_canon") is False, "D: digest gate.admits_to_canon must be False")
        check(dg.get("run_id") == "run-1" and dg.get("as_of") == "2026-06-08", "D: digest run_id / as_of not carried")
        by = {s["id"]: s for s in dg.get("sources", [])}

        a = by.get("REGULATION-A-1")
        if check(a is not None, "D: REGULATION-A-1 must appear as a source in the digest"):
            check(a.get("scan", {}).get("review_needed") is True, "D: source scan block (review_needed) must be carried")
            check([s["id"] for s in a["segments"]] == ["SEGMENT-a-1"], "D: SEGMENT must group under its source")
            cands = sorted((c["id"], c["kind"]) for c in a["candidates"])
            check(cands == [("CONSTRAINT-a-1", "constraint"), ("REQUIREMENT-a-1", "requirement")],
                  f"D: candidates must group under the source via derived_from->segment, with kinds; got {cands}")
            check([m["id"] for m in a["amendments"]] == ["AMENDMENT-a-1"], "D: AMENDMENT must group under its source")

        check("(unassociated)" in by and [s["id"] for s in by["(unassociated)"]["segments"]] == ["SEGMENT-orphan-1"],
              "D: an artefact with no resolvable source must surface under (unassociated), never be dropped")

        t = dg.get("tally", {})
        check(t.get("proposed", {}) == {"SEGMENT": 2, "REQUIREMENT": 1, "CONSTRAINT": 1, "AMENDMENT": 1},
              f"D: tally.proposed wrong: {t.get('proposed')}")
        check(t.get("review_needed") == 1, f"D: tally.review_needed wrong: {t.get('review_needed')}")

        # An empty run (no artefacts) still produces a valid, gated digest.
        work2 = tempfile.mkdtemp(prefix="regintel-digest-empty-")
        try:
            org2 = _codex_org(work2)
            r = run_cli("digest", org2, "--as-of", "2026-06-08")
            check(r.returncode == 0, "D: digest on an empty run must succeed")
            dg2 = yaml.safe_load(open(os.path.join(org2, "_intake", "processing", "review-digest.yaml"), encoding="utf-8"))
            check(dg2.get("tally", {}).get("proposed", {}).get("SEGMENT") == 0, "D: empty run must tally zero segments")
            check(dg2.get("gate", {}).get("admits_to_canon") is False, "D: empty digest still gates")
        finally:
            shutil.rmtree(work2, ignore_errors=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part E — check-signal (Step 2, the change-signal gate) ───────

def part_e_check_signal():
    if not shutil.which("node"):
        print("SKIP Part E: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-signal-")
    try:
        org = _codex_org(work)
        a_file = os.path.join(org, "codex", "external", "eu", "REGULATION-A-1.yaml")  # monthly, due 2026-05-01
        cache = os.path.join(org, "operations", "state", "reg-intel", "signal-cache.json")

        def scan_of(f):
            return yaml.safe_load(open(f, encoding="utf-8")).get("scan", {})

        before_due = scan_of(a_file).get("next_scan_due")

        # First observation, no cache yet → moved; cache is written to the operations
        # state location; the scan block is NOT bumped (the full pass does Step 8).
        r = run_cli("check-signal", a_file, "--observed", "etag-v1", "--method", "etag", "--today", "2026-06-08", "--json")
        check(r.returncode == 0, f"E: check-signal failed: {r.stderr.strip()}")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "moved" and res.get("proceed") is True, "E: first observation must be 'moved'")
        check(os.path.isfile(cache), "E: signal cache must be written under operations/state/reg-intel/")
        c = json.load(open(cache, encoding="utf-8"))
        check(c.get("sources", {}).get("REGULATION-A-1", {}).get("value") == "etag-v1",
              "E: the cache must record the observed signal value")
        check(scan_of(a_file).get("next_scan_due") == before_due, "E: a moved signal must NOT bump the scan block (that is Step 8)")

        # Same value again → unchanged; the scan block IS bumped (monthly cadence).
        r = run_cli("check-signal", a_file, "--observed", "etag-v1", "--method", "etag", "--today", "2026-06-08", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "unchanged" and res.get("proceed") is False, "E: an unchanged signal must be 'unchanged' (no proceed)")
        check(scan_of(a_file).get("next_scan_due") == "2026-07-08", f"E: unchanged must bump next_scan_due by the cadence; got {scan_of(a_file).get('next_scan_due')}")
        check(scan_of(a_file).get("change_detected") is False, "E: unchanged must leave change_detected false")

        # A new value → moved again, with the prior value reported.
        r = run_cli("check-signal", a_file, "--observed", "etag-v2", "--method", "etag", "--today", "2026-06-09", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "moved" and res.get("previous") == "etag-v1",
              f"E: a changed signal must be 'moved' with previous=etag-v1; got {res}")

        # No observed value + no opt-in → refuse (never guess).
        r = run_cli("check-signal", a_file, "--today", "2026-06-08")
        check(r.returncode != 0 and "no observed signal" in (r.stdout + r.stderr),
              "E: check-signal with no signal and no --accept-no-signal must refuse")
        # --accept-no-signal → degrade to proceed.
        r = run_cli("check-signal", a_file, "--accept-no-signal", "--today", "2026-06-08", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "no_signal" and res.get("proceed") is True, "E: --accept-no-signal must degrade to no_signal/proceed")

        # A static (monitoring_needed: false) artefact has no signal gate.
        s_file = os.path.join(org, "codex", "external", "us", "REGULATION-D-1.yaml")
        r = run_cli("check-signal", s_file, "--observed", "x", "--today", "2026-06-08")
        check(r.returncode != 0 and "monitoring_needed: true" in (r.stdout + r.stderr),
              "E: check-signal must reject a monitoring_needed: false artefact")

        # Resolve by CODEX-ID (cwd in org).
        r = subprocess.run(["node", CLI, "check-signal", "POLICY-C-1", "--observed", "v", "--today", "2026-06-08", "--json"],
                           capture_output=True, text=True, cwd=org)
        check(r.returncode == 0 and json.loads(r.stdout).get("id") == "POLICY-C-1",
              f"E: check-signal by CODEX-ID failed: {(r.stdout + r.stderr).strip()}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part F — fetch-snapshot (Step 3) ─────────────────────────────

def part_f_fetch_snapshot():
    if not shutil.which("node"):
        print("SKIP Part F: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-snap-")
    try:
        org = _codex_org(work)
        a_file = os.path.join(org, "codex", "external", "eu", "REGULATION-A-1.yaml")
        snapdir = os.path.join(org, "_intake", "snapshots")
        v1 = os.path.join(work, "v1.html"); open(v1, "w", encoding="utf-8").write("<html>Article 3 v1</html>")
        v2 = os.path.join(work, "v2.html"); open(v2, "w", encoding="utf-8").write("<html>Article 3 v2 CHANGED</html>")

        # First harvest → captured; snapshot written; source_hash present.
        r = run_cli("fetch-snapshot", a_file, "--from", v1, "--today", "2026-06-08", "--json")
        check(r.returncode == 0, f"F: fetch-snapshot failed: {r.stderr.strip()}")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "captured", "F: first harvest must be 'captured'")
        check(re.match(r"^sha256:[0-9a-f]{64}$", res.get("source_hash", "")), f"F: source_hash malformed: {res.get('source_hash')!r}")
        check(os.path.isfile(os.path.join(snapdir, "REGULATION-A-1-2026-06-08.html")), "F: snapshot must be written under _intake/snapshots/")

        # Same bytes, later date → bytes_identical (signal moved, bytes unchanged).
        r = run_cli("fetch-snapshot", a_file, "--from", v1, "--today", "2026-07-08", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "bytes_identical" and res.get("proceed") is False,
              "F: re-snapshot of identical bytes must be 'bytes_identical' (no proceed)")

        # Changed bytes → changed.
        r = run_cli("fetch-snapshot", a_file, "--from", v2, "--today", "2026-08-08", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "changed" and res.get("proceed") is True, "F: changed bytes must be 'changed' (proceed)")

        # Cross-run: wipe _intake/snapshots; the committed operations cache still detects
        # identical bytes (the reason snapshot state is committed, not in transient _intake/).
        shutil.rmtree(snapdir, ignore_errors=True)
        r = run_cli("fetch-snapshot", a_file, "--from", v2, "--today", "2026-09-08", "--json")
        res = json.loads(r.stdout)
        check(res.get("outcome") == "bytes_identical",
              "F: with _intake/ wiped, the committed cache must still detect identical bytes (cross-checkout)")

        # --from required (network-free CLI).
        r = run_cli("fetch-snapshot", a_file, "--today", "2026-06-08")
        check(r.returncode != 0 and "--from" in (r.stdout + r.stderr), "F: fetch-snapshot must require --from")

        # Static artefact rejected.
        s_file = os.path.join(org, "codex", "external", "us", "REGULATION-D-1.yaml")
        r = run_cli("fetch-snapshot", s_file, "--from", v1, "--today", "2026-06-08")
        check(r.returncode != 0 and "monitoring_needed: true" in (r.stdout + r.stderr),
              "F: fetch-snapshot must reject a monitoring_needed: false artefact")

        # Cosmetic-vs-substantive (isolated org so it does not perturb the sequence above).
        work_c = tempfile.mkdtemp(prefix="regintel-cosmetic-")
        try:
            orgc = _codex_org(work_c)
            cf = os.path.join(orgc, "codex", "external", "eu", "REGULATION-A-1.yaml")
            c1 = os.path.join(work_c, "c1.html"); open(c1, "w", encoding="utf-8").write(
                '<html><body><p class="a">Each controller shall maintain a record.</p></body></html>')
            # same visible text; differs in whitespace, class, a tracker id, a comment, a script.
            c2 = os.path.join(work_c, "c2.html"); open(c2, "w", encoding="utf-8").write(
                '<html>\n <body>\n  <!-- build 4471 -->\n  <p class="b" data-id="x9f8e7d6c5b4a3f21">'
                'Each controller shall maintain a record.</p>\n  <script>track()</script>\n </body>\n</html>')
            c3 = os.path.join(work_c, "c3.html"); open(c3, "w", encoding="utf-8").write(
                '<html><body><p>Each controller shall maintain a DETAILED record within 30 days.</p></body></html>')
            run_cli("fetch-snapshot", cf, "--from", c1, "--today", "2026-06-08")
            r = json.loads(run_cli("fetch-snapshot", cf, "--from", c2, "--today", "2026-06-09", "--json").stdout)
            check(r.get("outcome") == "cosmetic_change" and r.get("proceed") is False,
                  f"F: markup/whitespace/tracker churn with unchanged normative text must be 'cosmetic_change'; got {r.get('outcome')}")
            r = json.loads(run_cli("fetch-snapshot", cf, "--from", c3, "--today", "2026-06-10", "--json").stdout)
            check(r.get("outcome") == "changed" and r.get("proceed") is True,
                  "F: a substantive normative-text change must be 'changed'")
            # Binary/unknown format → no normalisation → byte-level 'changed', never a wrong 'cosmetic'.
            b1 = os.path.join(work_c, "a.pdf"); open(b1, "wb").write(bytes([1, 2, 3, 4]))
            b2 = os.path.join(work_c, "b.pdf"); open(b2, "wb").write(bytes([1, 2, 3, 5]))
            run_cli("fetch-snapshot", cf, "--from", b1, "--ext", "pdf", "--today", "2026-07-01")
            r = json.loads(run_cli("fetch-snapshot", cf, "--from", b2, "--ext", "pdf", "--today", "2026-07-02", "--json").stdout)
            check(r.get("outcome") == "changed", "F: a binary format must fall back to byte-level 'changed' (no cosmetic verdict)")
        finally:
            shutil.rmtree(work_c, ignore_errors=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part G — segment (Step 4, shape the agent result) ────────────

def part_g_segment():
    if not shutil.which("node"):
        print("SKIP Part G: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-segment-")
    try:
        org = _codex_org(work)
        snapdir = os.path.join(org, "_intake", "snapshots")
        os.makedirs(snapdir, exist_ok=True)
        snap = os.path.join(snapdir, "REGULATION-GDPR-2016-1-2026-06-08.html")
        open(snap, "w", encoding="utf-8").write("<html>Art 30</html>")
        res = os.path.join(work, "segres.json")
        json.dump({"segments": [
            {"locator": "Art.30(1)", "text_excerpt": "Each controller shall maintain a record.",
             "obligation_signal": "shall", "extraction_confidence": "high"},
            {"locator": "Art.30(1)(b)", "text_excerpt": "the purposes of the processing;",
             "obligation_signal": "shall", "extraction_confidence": "medium"},
            {"locator": None, "text_excerpt": "orphan — no locator"},
        ]}, open(res, "w", encoding="utf-8"))

        r = run_cli("segment", snap, "--from", res, "--today", "2026-06-08")
        check(r.returncode == 0, f"G: segment failed: {r.stderr.strip()}")
        sdir = os.path.join(org, "_intake", "processing", "segments")
        files = sorted(f for f in os.listdir(sdir)) if os.path.isdir(sdir) else []
        check(files == ["SEGMENT-gdpr_2016-1.yaml", "SEGMENT-gdpr_2016-2.yaml"],
              f"G: segment must emit 2 SEGMENTs (the locator-less one skipped), ids per source slug; got {files}")

        d = yaml.safe_load(open(os.path.join(sdir, "SEGMENT-gdpr_2016-1.yaml"), encoding="utf-8"))
        check(d.get("type") == "SEGMENT" and d.get("zone") == "field", "G: SEGMENT type/zone")
        check(d.get("source") == "REGULATION-GDPR-2016-1", "G: source derived from the snapshot filename")
        check(d.get("locator") == "Art.30(1)", "G: locator carried")
        check(d.get("admission_state") == "proposed" and d.get("proposed_by") == "reg-intel-scanner",
              "G: SEGMENT must be emitted proposed, by the scanner")
        check(d.get("gate_checks", {}).get("provenance") == "pending_review", "G: gate_checks.provenance pending_review")
        check(re.match(r"^sha256:[0-9a-f]{64}$", d.get("text_hash", "")), "G: text_hash computed from the excerpt")
        check(re.match(r"^sha256:[0-9a-f]{64}$", d.get("source_hash", "")), "G: source_hash from the snapshot bytes")
        check(d.get("extraction_confidence") == "high", "G: extraction_confidence (review flag) carried")

        # The digest already built consumes the staged SEGMENTs end-to-end.
        r = run_cli("digest", org, "--as-of", "2026-06-08")
        dg = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-digest.yaml"), encoding="utf-8"))
        check(dg.get("tally", {}).get("proposed", {}).get("SEGMENT") == 2, "G: the digest must count the 2 staged SEGMENTs")

        # --from is required.
        r = run_cli("segment", snap, "--today", "2026-06-08")
        check(r.returncode != 0 and "--from" in (r.stdout + r.stderr), "G: segment must require --from")

        # Ordinals continue on a second run (append, not overwrite).
        r = run_cli("segment", snap, "--from", res, "--today", "2026-06-09")
        files2 = sorted(os.listdir(sdir))
        check("SEGMENT-gdpr_2016-3.yaml" in files2 and "SEGMENT-gdpr_2016-4.yaml" in files2,
              f"G: a second run must continue the ordinal sequence; got {files2}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part H — classify (Step 5, REQUIREMENT/CONSTRAINT candidates) ─

def part_h_classify():
    if not shutil.which("node"):
        print("SKIP Part H: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-classify-")
    try:
        org = _codex_org(work)
        sdir = os.path.join(org, "_intake", "processing", "segments")
        os.makedirs(sdir, exist_ok=True)
        # A staged SEGMENT the candidates derive from.
        open(os.path.join(sdir, "SEGMENT-gdpr_2016-1.yaml"), "w", encoding="utf-8").write(
            'id: "SEGMENT-gdpr_2016-1"\ntype: "SEGMENT"\nsource: "REGULATION-GDPR-2016-1"\nlocator: "Art.30(1)"\nzone: "field"\n')
        res = os.path.join(work, "cls.json")
        json.dump({"candidates": [
            {"kind": "requirement", "category": "DOCUMENTATION", "obligation_level": "SHALL",
             "derived_from": ["SEGMENT-gdpr_2016-1"], "source_text": "Each controller shall maintain a record.",
             "extraction_confidence": "high"},
            {"kind": "constraint", "category": "PRODUCT", "obligation_level": "SHALL_NOT",
             "derived_from": ["SEGMENT-gdpr_2016-1"], "source_text": "A device may not be distributed without approval.",
             "extraction_confidence": "medium"},
            {"kind": "requirement", "derived_from": ["SEGMENT-gdpr_2016-1"], "source_text": "ambiguous",
             "extraction_confidence": "low", "ambiguous_alt": {"kind": "constraint", "category": "DEFINITIONAL"}},
            {"kind": "bogus", "derived_from": ["SEGMENT-gdpr_2016-1"], "source_text": "x"},
            {"kind": "requirement", "derived_from": [], "source_text": "no derived_from"},
        ]}, open(res, "w", encoding="utf-8"))

        r = run_cli("classify", sdir, "--from", res, "--today", "2026-06-08")
        check(r.returncode == 0, f"H: classify failed: {r.stderr.strip()}")
        cdir = os.path.join(org, "_intake", "processing", "candidates")
        files = sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []
        check(files == ["CONSTRAINT-gdpr_2016-1.yaml", "REQUIREMENT-gdpr_2016-1.yaml", "REQUIREMENT-gdpr_2016-2.yaml"],
              f"H: classify must emit 2 REQUIREMENT + 1 CONSTRAINT (bogus + no-derived_from skipped); got {files}")

        req = yaml.safe_load(open(os.path.join(cdir, "REQUIREMENT-gdpr_2016-1.yaml"), encoding="utf-8"))
        check(req.get("notation") == "requirement" and req.get("zone") == "canon", "H: candidate notation/zone")
        check(req.get("admission_state") == "proposed" and req.get("proposed_by") == "reg-intel-scanner",
              "H: candidate must be proposed, by the scanner")
        check(req.get("derived_from") == ["SEGMENT-gdpr_2016-1"], "H: derived_from cites the SEGMENT")
        check(req.get("obligation_level") == "SHALL" and req.get("category") == "DOCUMENTATION", "H: obligation_level + category carried")
        check(req.get("gate_checks", {}).get("uniqueness") == "pending", "H: gate_checks left pending for the human")

        # The low-confidence candidate keeps both classifications via ambiguous_alt.
        low = yaml.safe_load(open(os.path.join(cdir, "REQUIREMENT-gdpr_2016-2.yaml"), encoding="utf-8"))
        check(low.get("extraction_confidence") == "low" and low.get("ambiguous_alt", {}).get("kind") == "constraint",
              "H: a low-confidence candidate must surface ambiguous_alt (both classifications)")
        # A high-confidence candidate carries no ambiguous_alt.
        check("ambiguous_alt" not in req, "H: a confident candidate must not carry ambiguous_alt")

        # End-to-end: the digest counts the candidates under their source (via SEGMENT).
        r = run_cli("digest", org, "--as-of", "2026-06-08")
        dg = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-digest.yaml"), encoding="utf-8"))
        prop = dg.get("tally", {}).get("proposed", {})
        check(prop.get("REQUIREMENT") == 2 and prop.get("CONSTRAINT") == 1,
              f"H: the digest must count the candidates; got {prop}")

        # --from is required.
        r = run_cli("classify", sdir, "--today", "2026-06-08")
        check(r.returncode != 0 and "--from" in (r.stdout + r.stderr), "H: classify must require --from")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part I — validate (Step 6, contract checks) ──────────────────

def part_i_validate():
    if not shutil.which("node"):
        print("SKIP Part I: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-validate-")
    try:
        org = _codex_org(work)  # carries REGULATION-A-1 (a codex artefact)
        seg = os.path.join(org, "_intake", "processing", "segments")
        cand = os.path.join(org, "_intake", "processing", "candidates")
        os.makedirs(seg, exist_ok=True)
        os.makedirs(cand, exist_ok=True)

        txt = "Each controller shall maintain a record."
        thash = "sha256:" + hashlib.sha256(txt.encode("utf-8")).hexdigest()
        # valid SEGMENT — source resolves to the codex REGULATION-A-1, hash matches.
        open(os.path.join(seg, "SEGMENT-a-1.yaml"), "w", encoding="utf-8").write(
            f'id: "SEGMENT-a-1"\ntype: "SEGMENT"\nname: "x"\nsource: "REGULATION-A-1"\nlocator: "Art.1"\n'
            f'text_excerpt: "{txt}"\ntext_hash: "{thash}"\nextracted_at: "2026-06-08"\nzone: "field"\n'
            'gate_checks:\n  provenance: pending_review\n')
        # broken SEGMENT — source TYPE not codex (SEGMENT-002), bad text_hash (SEGMENT-006).
        open(os.path.join(seg, "SEGMENT-bad-1.yaml"), "w", encoding="utf-8").write(
            'id: "SEGMENT-bad-1"\ntype: "SEGMENT"\nname: "y"\nsource: "GOAL-X-1"\nlocator: "§1"\n'
            'text_hash: "nothex"\nextracted_at: "2026-06-08"\nzone: "field"\n'
            'gate_checks:\n  provenance: pending_review\n')
        # valid candidate.
        open(os.path.join(cand, "REQUIREMENT-a-1.yaml"), "w", encoding="utf-8").write(
            'notation: "requirement"\nid: "REQUIREMENT-a-1"\nname: "x"\ndescription: "x"\n'
            'derived_from:\n  - SEGMENT-a-1\nobligation_level: SHALL\nextraction_confidence: high\n'
            'zone: "canon"\nadmission_state: proposed\nproposed_at: "2026-06-08"\n')
        # broken candidate — no derived_from (CAND-002), bad obligation_level (CAND-004).
        open(os.path.join(cand, "CONSTRAINT-bad-1.yaml"), "w", encoding="utf-8").write(
            'notation: "constraint"\nid: "CONSTRAINT-bad-1"\nname: "x"\ndescription: "x"\n'
            'obligation_level: MUSTNT\nzone: "canon"\nadmission_state: proposed\nproposed_at: "2026-06-08"\n')

        r = run_cli("validate", org, "--json")
        check(r.returncode == 1, f"I: validate must exit 1 when artefacts need review (got {r.returncode})")
        res = json.loads(r.stdout)
        by = {it["id"]: it for it in res["items"]}
        check(not by["SEGMENT-a-1"]["flags"], "I: a conformant SEGMENT must pass clean")
        check(not by["REQUIREMENT-a-1"]["flags"], "I: a conformant candidate must pass clean")
        codes = lambda i: {f["code"] for f in by[i]["flags"]}
        check("SEGMENT-002" in codes("SEGMENT-bad-1"), "I: a non-codex source TYPE must flag SEGMENT-002")
        check("SEGMENT-006" in codes("SEGMENT-bad-1"), "I: a malformed text_hash must flag SEGMENT-006")
        check("CAND-002" in codes("CONSTRAINT-bad-1"), "I: a candidate with no derived_from must flag CAND-002")
        check(res["errors"] >= 2 and res["warnings"] >= 2, f"I: tally must count errors + warnings; got {res['errors']}/{res['warnings']}")

        # A clean-only batch exits 0.
        os.remove(os.path.join(seg, "SEGMENT-bad-1.yaml"))
        os.remove(os.path.join(cand, "CONSTRAINT-bad-1.yaml"))
        r = run_cli("validate", org)
        check(r.returncode == 0, f"I: a clean batch must exit 0; got {r.returncode}: {(r.stdout + r.stderr)}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Part J — amendment (Step 7, source drift) ────────────────────

def part_j_amendment():
    if not shutil.which("node"):
        print("SKIP Part J: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-amend-")
    try:
        org = _codex_org(work)  # REGULATION-A-1 is a monitoring codex artefact
        a_file = os.path.join(org, "codex", "external", "eu", "REGULATION-A-1.yaml")
        seg = os.path.join(org, "_intake", "processing", "segments")
        os.makedirs(seg, exist_ok=True)
        # Two SEGMENTs of REGULATION-A-1 (auto segment_refs) + one of another source (excluded).
        for sid, src in [("SEGMENT-a-1", "REGULATION-A-1"), ("SEGMENT-a-2", "REGULATION-A-1"), ("SEGMENT-z-1", "LAW-OTHER-1")]:
            open(os.path.join(seg, f"{sid}.yaml"), "w", encoding="utf-8").write(
                f'id: "{sid}"\ntype: "SEGMENT"\nsource: "{src}"\nlocator: "x"\nzone: "field"\n')

        r = run_cli("amendment", a_file, "--change", "Art.1 wording tightened",
                    "--likely-impacted", "REQUIREMENT-X-1,PROCESS-Y-1", "--amended-at", "2026-05-21", "--today", "2026-06-08")
        check(r.returncode == 0, f"J: amendment failed: {r.stderr.strip()}")
        adir = os.path.join(org, "_intake", "processing", "amendments")
        files = sorted(os.listdir(adir)) if os.path.isdir(adir) else []
        check(files == ["AMENDMENT-a-1.yaml"], f"J: one AMENDMENT expected; got {files}")
        a = yaml.safe_load(open(os.path.join(adir, "AMENDMENT-a-1.yaml"), encoding="utf-8"))
        check(a.get("type") == "AMENDMENT" and a.get("zone") == "field", "J: AMENDMENT type/zone")
        check(a.get("source") == "REGULATION-A-1" and a.get("detected_at") == "2026-06-08", "J: source + detected_at")
        check(sorted(a.get("segment_refs", [])) == ["SEGMENT-a-1", "SEGMENT-a-2"],
              f"J: segment_refs must auto-collect this source's staged SEGMENTs only; got {a.get('segment_refs')}")
        check(a.get("likely_impacted") == ["REQUIREMENT-X-1", "PROCESS-Y-1"], "J: likely_impacted hints carried")
        check(a.get("motivates") == [], "J: motivates must be empty on first emission")
        check(a.get("admission_state") == "proposed" and a.get("proposed_by") == "reg-intel-scanner", "J: proposed by the scanner")

        # The digest counts the AMENDMENT under its source.
        r = run_cli("digest", org, "--as-of", "2026-06-08")
        dg = yaml.safe_load(open(os.path.join(org, "_intake", "processing", "review-digest.yaml"), encoding="utf-8"))
        check(dg.get("tally", {}).get("proposed", {}).get("AMENDMENT") == 1, "J: the digest must count the AMENDMENT")

        # Guards: --change required; a static (monitoring_needed: false) source rejected.
        r = run_cli("amendment", a_file, "--today", "2026-06-08")
        check(r.returncode != 0 and "change_description is required" in (r.stdout + r.stderr), "J: amendment must require --change")
        s_file = os.path.join(org, "codex", "external", "us", "REGULATION-D-1.yaml")
        r = run_cli("amendment", s_file, "--change", "x", "--today", "2026-06-08")
        check(r.returncode != 0 and "monitoring_needed: true" in (r.stdout + r.stderr), "J: amendment must reject a static source")
    finally:
        shutil.rmtree(work, ignore_errors=True)


part_a_bundle()
part_b_list_due()
part_c_update_scan()
part_d_digest()
part_e_check_signal()
part_f_fetch_snapshot()
part_g_segment()
part_h_classify()
part_i_validate()
part_j_amendment()


# ── Part K — operational templates bundle ────────────────────────

def part_k_templates():
    tdir = os.path.join(SKILL_DIR, "templates")
    for name in ("README.md", "_intake.snapshots.README.md", "reg-intel-daily.sh",
                 "reg-intel-daily.service", "reg-intel-daily.timer", "fetch-recipes.md"):
        check(os.path.isfile(os.path.join(tdir, name)), f"K: templates/{name} missing")

    daily = os.path.join(tdir, "reg-intel-daily.sh")
    if os.path.isfile(daily):
        s = open(daily, encoding="utf-8").read()
        # The driver must drive the run loop through the live CLI commands.
        for cmd in ("list-due", "check-signal", "fetch-snapshot", "update-scan", "validate", "digest"):
            check(cmd in s, f"K: reg-intel-daily.sh must invoke `{cmd}`")
        check("set -euo pipefail" in s, "K: reg-intel-daily.sh should be a strict bash script")
        check(s.startswith("#!/usr/bin/env bash"), "K: reg-intel-daily.sh needs a bash shebang")

    recipes = os.path.join(tdir, "fetch-recipes.md")
    if os.path.isfile(recipes):
        rs = open(recipes, encoding="utf-8").read()
        check("Prefer APIs" in rs or "prefer APIs" in rs.lower(), "K: fetch-recipes must state the API-first rule")
        for m in ("etag", "last_modified", "api_version", "amended_date", "fragment_hash"):
            check(m in rs, f"K: fetch-recipes must name the check-signal method {m}")

    timer = os.path.join(tdir, "reg-intel-daily.timer")
    if os.path.isfile(timer):
        check("OnCalendar" in open(timer, encoding="utf-8").read(), "K: the timer must define an OnCalendar schedule")


part_k_templates()


# ── Part L — #837 batch naming (non-destructive digest default) ─

def part_l_batch_naming():
    """The first digest lands at the flat legacy path; a second, concurrent digest
    does not overwrite it and lands under its own dated batch directory."""
    if not shutil.which("node"):
        print("SKIP Part L: `node` not found.")
        return
    work = tempfile.mkdtemp(prefix="regintel-batch-")
    try:
        org = _codex_org(work)
        proc = os.path.join(org, "_intake", "processing")
        today = datetime.datetime.utcnow().strftime("%Y%m%d")

        r = run_cli("digest", org, "--as-of", "2026-06-08")
        check(r.returncode == 0, f"L: first digest failed: {r.stderr.strip()}")
        flat = os.path.join(proc, "review-digest.yaml")
        check(os.path.isfile(flat), "L: first digest must land at the flat legacy path")
        before = yaml.safe_load(open(flat, encoding="utf-8"))

        # Second, concurrent digest — the flat path is still there (unresolved) — must
        # NOT be overwritten; lands under its own dated batch directory.
        r = run_cli("digest", org, "--as-of", "2026-06-08", "--scope", "daily")
        check(r.returncode == 0, f"L: second digest failed: {r.stderr.strip()}")
        after = yaml.safe_load(open(flat, encoding="utf-8"))
        check(before == after, "L: the flat legacy review-digest.yaml must not be overwritten by a concurrent run")
        dated_file = os.path.join(proc, f"review-digest-daily-{today}-1", "review-digest.yaml")
        check(os.path.isfile(dated_file), f"L: second digest must land under a dated batch directory: {dated_file}")

        # A third, concurrent digest with no --scope defaults to scope "batch" — never
        # an org-identifying string.
        r = run_cli("digest", org, "--as-of", "2026-06-08")
        check(r.returncode == 0, f"L: third digest failed: {r.stderr.strip()}")
        default_scope_file = os.path.join(proc, f"review-digest-batch-{today}-1", "review-digest.yaml")
        check(os.path.isfile(default_scope_file),
              f"L: a --scope-less concurrent digest must default to scope 'batch': {default_scope_file}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


part_l_batch_naming()

if _failures:
    print("FAIL - Transitrix Reg-Intel skill + CLI test:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Reg-Intel skill + CLI test: all checks passed.")
sys.exit(0)
