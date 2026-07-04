#!/usr/bin/env python3
"""True end-to-end LLM drive of the Transitrix Onboarding Skill.

Unlike test_skill_integrity.py (deterministic, no key), this script drives the
Skill the way a real newcomer would: it installs the bundle into an ephemeral
HOME, then hands an agent a synthetic persona prompt ("model a Goals tree for a
2026 strategy") and lets it execute the six-step SKILL.md flow with no
human-in-the-loop. It then runs the SAME structural assertions as the
deterministic test against the produced repo.

This is the weekly-cron path — it needs an API key and the `claude` CLI. It is
NOT run in PR CI (see tests/README.md and the workflow). It skips gracefully —
exit 0 — when the key or the CLI is absent, so it never red-flags CI for an
infra reason; the cron run with the secret is where it actually exercises.

Run:  ANTHROPIC_API_KEY=… python transitrix/skills/onboard/tests/drive_skill_e2e.py
"""

import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_skill_integrity as guard  # reuse install layout + validate_goals

PERSONA_PROMPT = (
    "Use the Transitrix onboarding skill. I'm a first-time user. Set up a new "
    "Transitrix repo in ./target-repo for an organisation called 'northwind', "
    "and create a starter Goals tree for our 2026 strategy. Pick sensible "
    "placeholder goals; don't ask me questions — proceed end to end."
)


def _skip(reason):
    print(f"SKIP — e2e LLM drive not run: {reason}")
    print("       (this is expected in PR CI; the weekly cron runs it with the API-key secret.)")
    return 0


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _skip("ANTHROPIC_API_KEY not set")
    if shutil.which("claude") is None:
        return _skip("`claude` CLI not found on PATH")

    work = tempfile.mkdtemp(prefix="transitrix-e2e-")
    try:
        # Clean ephemeral HOME with the skill bundle pre-staged. The plugin
        # marketplace install path (`/plugin marketplace add transitrix/methodology`
        # + `/plugin install transitrix@transitrix-methodology`) is exercised by
        # users; here we drop the bundle directly into Claude Code's standalone
        # skills directory so the agent can pick it up without a live marketplace
        # round-trip. The PERSONA_PROMPT triggers the skill by intent, not by
        # slash-command name, so either install path produces the same drive.
        home = os.path.join(work, "home")
        installed = os.path.join(home, ".claude", "skills", "onboard")
        os.makedirs(os.path.dirname(installed), exist_ok=True)
        shutil.copytree(guard.SKILL_DIR, installed)

        env = dict(os.environ, HOME=home)
        # Headless, non-interactive run inside the temp workspace.
        proc = subprocess.run(
            ["claude", "-p", PERSONA_PROMPT, "--dangerously-skip-permissions"],
            cwd=work, env=env, capture_output=True, text=True, timeout=900,
        )
        sys.stdout.write(proc.stdout[-4000:] if proc.stdout else "")
        if proc.returncode != 0:
            print(f"FAIL — agent run exited {proc.returncode}\n{proc.stderr[-2000:]}")
            return 1

        # Verdict: the agent must have produced a parseable, valid Goals file.
        repo = os.path.join(work, "target-repo")
        import glob
        hits = glob.glob(os.path.join(repo, "**", "*.goals.transitrix.yaml"), recursive=True)
        if not hits:
            print(f"FAIL — no *.goals.transitrix.yaml authored under {repo}")
            return 1
        errs = guard.validate_goals(guard._load_yaml(hits[0]))
        if errs:
            print(f"FAIL — authored Goals file ({hits[0]}) fails validation:")
            for e in errs:
                print(f"  ✗ {e}")
            return 1
        for root_file in ("transitrix.yaml", "AGENTS.md"):
            if not os.path.isfile(os.path.join(repo, root_file)):
                print(f"FAIL — repo skeleton missing {root_file}")
                return 1
        print(f"PASS — agent drove the skill end-to-end; valid Goals tree at {hits[0]}")
        return 0
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
