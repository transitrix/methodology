#!/usr/bin/env python3
"""From-scratch integrity test for the Transitrix Reg-Intel skill + @transitrix/reg-intel-cli.

Deterministic, no-API-key, no-network guard for the SCHEDULER CORE — the first
increment of the CLI (the rest of the SKILL.md pipeline lands in later increments).
Three parts:

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


part_a_bundle()
part_b_list_due()
part_c_update_scan()

if _failures:
    print("FAIL - Transitrix Reg-Intel skill + CLI scheduler-core test:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Reg-Intel skill + CLI scheduler-core test: all checks passed.")
sys.exit(0)
