#!/usr/bin/env python3
"""True end-to-end LLM drive for the Transitrix Ingest skill (weekly cron only).

An agent reads SKILL.md and runs the ingest pipeline over the fixture document,
end-to-end. Unlike the deterministic integrity test (which calls the CLI directly),
this exercises the agent actually following the protocol.

Gated and best-effort:
  - Skips green (exit 0) when ANTHROPIC_API_KEY or the `claude` CLI is absent.
  - The skill shells out to `@transitrix/ingest-cli`. Until that package is published
    to npm, this harness makes the local package resolvable with `npm install -g`;
    if that is not possible it skips green with a clear message.

Run:  ANTHROPIC_API_KEY=... python transitrix/skills/ingest/tests/drive_ingest_e2e.py
Exit: 0 = passed OR skipped (prerequisite absent); 1 = the drive ran but failed.
"""

import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SKILL_DIR)))
CLI_PKG = os.path.join(REPO_ROOT, "packages", "ingest-cli")
FIXTURE = os.path.join(HERE, "fixtures", "raw", "INTERVIEW-sample.md")


def skip(msg):
    print(f"SKIP drive_ingest_e2e: {msg}")
    sys.exit(0)


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        skip("ANTHROPIC_API_KEY not set.")
    if not shutil.which("claude"):
        skip("`claude` CLI not found.")
    if not shutil.which("node") or not shutil.which("npm"):
        skip("node/npm not found (the ingest CLI is Node).")

    # Make the unpublished CLI resolvable as `@transitrix/ingest-cli` for `npx`.
    try:
        subprocess.run(["npm", "install", "-g", CLI_PKG], check=True,
                       capture_output=True, text=True)
    except Exception as e:  # noqa: BLE001
        skip(f"could not install the local CLI globally ({e}); pending npm publication.")

    work = tempfile.mkdtemp(prefix="ingest-e2e-")
    try:
        org = os.path.join(work, "org")
        os.makedirs(os.path.join(org, "_intake", "inbox"))
        with open(os.path.join(org, "transitrix.yaml"), "w", encoding="utf-8") as fh:
            fh.write("transitrix: 1\ncoverage_profile: full\n")
        shutil.copy(FIXTURE, os.path.join(org, "_intake", "inbox", "INTERVIEW-sample.md"))

        prompt = (
            "You are in a Transitrix adopter repo at "
            f"{org}. Read the ingest skill protocol at {os.path.join(SKILL_DIR, 'SKILL.md')} "
            "and run the full pipeline over _intake/inbox/INTERVIEW-sample.md "
            "(type INTERVIEW, role 'Head of Operations', date 2026-04-15). "
            "Use the @transitrix/ingest-cli commands. Proceed end-to-end without asking. "
            "Do not write anything into a canon/ directory."
        )
        proc = subprocess.run(
            ["claude", "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True, text=True, cwd=org, timeout=900,
        )
        sys.stdout.write(proc.stdout[-2000:] if proc.stdout else "")

        rq = os.path.join(org, "_intake", "processing", "review-queue.yaml")
        if not os.path.isfile(rq):
            print("FAIL: the agent did not produce a review-queue.yaml.")
            sys.exit(1)
        try:
            import yaml
            q = yaml.safe_load(open(rq, encoding="utf-8"))
            if q.get("gate", {}).get("admits_to_canon") is not False:
                print("FAIL: review queue gate is not closed.")
                sys.exit(1)
        except ImportError:
            pass
        if os.path.exists(os.path.join(org, "canon")):
            print("FAIL: the agent created canon/ — the skill must only propose.")
            sys.exit(1)
        print("PASS - ingest e2e: the agent ran the pipeline and produced a gated review queue.")
        sys.exit(0)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
