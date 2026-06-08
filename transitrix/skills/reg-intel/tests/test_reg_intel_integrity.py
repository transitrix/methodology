#!/usr/bin/env python3
"""From-scratch integrity test for the Transitrix Reg-Intel skill + @transitrix/reg-intel-cli.

Deterministic, no-API-key, no-network guard for the CLI increments landed so far
(the rest of the SKILL.md pipeline lands in later increments). Five parts:

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

Run:  python transitrix/skills/reg-intel/tests/test_reg_intel_integrity.py
Exit: 0 = all pass; 1 = a check failed (message localises the problem).
"""

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


part_a_bundle()
part_b_list_due()
part_c_update_scan()
part_d_digest()
part_e_check_signal()

if _failures:
    print("FAIL - Transitrix Reg-Intel skill + CLI test:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Reg-Intel skill + CLI test: all checks passed.")
sys.exit(0)
