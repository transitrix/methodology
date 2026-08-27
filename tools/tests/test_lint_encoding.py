#!/usr/bin/env python3
"""Windows legacy-code-page regression test for tools/lint.py.

The script prints non-ASCII status glyphs straight to stdout/stderr.
Under a legacy Windows console code page (e.g. cp1252 — the default when
stdout isn't a UTF-8-configured terminal), that used to crash mid-report with
a UnicodeEncodeError, even on a fully valid repo. Forces PYTHONIOENCODING to a
legacy code page for the subprocess so the regression reproduces
deterministically on any OS, and drives the script down its happy, error, and
warning-reporting paths so all of the glyphs are exercised, not just the
easy ones.

Run:  python tools/tests/test_lint_encoding.py
Exit: 0 = all checks pass; 1 = a check failed.
"""

import os
import shutil
import subprocess
import sys
import tempfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LINT = os.path.join(REPO_ROOT, "tools", "lint.py")
LEGACY_CODE_PAGE = "cp1252"

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def _legacy_env():
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = LEGACY_CODE_PAGE
    return env


def _write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def _decode(raw_bytes):
    return raw_bytes.decode("utf-8", errors="replace")


def _run(script, *args, env_root=None):
    env = _legacy_env()
    if env_root is not None:
        env["REPO_ROOT"] = env_root
    r = subprocess.run([sys.executable, script, *args], capture_output=True, env=env)
    return r.returncode, _decode(r.stdout) + _decode(r.stderr)


# ── lint.py: clean repo — happy path (search/scan/check/summary/pass glyphs) ─

def check_lint_clean():
    work = tempfile.mkdtemp(prefix="lint-encoding-clean-")
    try:
        _write(os.path.join(work, "canon", "elements", "app.yaml"), "id: APP-1\nname: Test App\n")
        code, out = _run(LINT, env_root=work)
        check(code == 0, f"lint.py clean repo: expected exit 0, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py clean repo crashed on encoding: {out}")
        check("PASSED" in out, f"lint.py clean repo: missing success report: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── lint.py: atomicity violation — error-reporting path ─────────────────────

def check_lint_error():
    work = tempfile.mkdtemp(prefix="lint-encoding-error-")
    try:
        _write(
            os.path.join(work, "canon", "elements", "app.yaml"),
            "id: APP-1\nname: Test App\nrelations:\n  - REL-1\n",
        )
        code, out = _run(LINT, env_root=work)
        check(code == 1, f"lint.py error repo: expected exit 1, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py error repo crashed on encoding: {out}")
        # Phase 3+ errors are only counted, not detailed, in the final summary
        # (a separate pre-existing gap — see PR description) — assert on what
        # the script actually prints today.
        check("Validation FAILED" in out, f"lint.py error repo: missing error report: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── lint.py: policy warning — warning-reporting path ─────────────────────────

def check_lint_warning():
    work = tempfile.mkdtemp(prefix="lint-encoding-warning-")
    try:
        _write(
            os.path.join(work, "canon", "elements", "app.yaml"),
            "id: APP-1\nname: Test App\nmetadata:\n  status: Active\n",
        )
        code, out = _run(LINT, env_root=work)
        check(code == 0, f"lint.py warning repo: expected exit 0, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py warning repo crashed on encoding: {out}")
        check("POLICY" in out, f"lint.py warning repo: missing warning report: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── lint.py: referential integrity — relation missing 'to' ────────────────────

def check_lint_rel_missing_to():
    work = tempfile.mkdtemp(prefix="lint-encoding-rel-missing-to-")
    try:
        _write(
            os.path.join(work, "canon", "elements", "app.yaml"),
            "id: APP-1\nname: Test App\n",
        )
        _write(
            os.path.join(work, "canon", "relations", "rel1.yaml"),
            "id: REL-1\nfrom: APP-1\n",
        )
        code, out = _run(LINT, env_root=work)
        check(code == 1, f"lint.py rel missing 'to': expected exit 1, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py rel missing 'to' crashed on encoding: {out}")
        check("missing required 'to' field" in out, f"lint.py rel missing 'to': expected error message: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── lint.py: referential integrity — relation with missing target element ─────

def check_lint_rel_missing_target_element():
    work = tempfile.mkdtemp(prefix="lint-encoding-rel-missing-elem-")
    try:
        _write(
            os.path.join(work, "canon", "elements", "app.yaml"),
            "id: APP-1\nname: Test App\n",
        )
        _write(
            os.path.join(work, "canon", "relations", "rel1.yaml"),
            "id: REL-1\nfrom: APP-1\nto: APP-999\n",
        )
        code, out = _run(LINT, env_root=work)
        check(code == 1, f"lint.py rel bad target: expected exit 1, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py rel bad target crashed on encoding: {out}")
        check("Target element 'APP-999' not found" in out, f"lint.py rel bad target: expected error message: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── lint.py: referential integrity — relation with deprecated 'source' field ───

def check_lint_rel_deprecated_source():
    work = tempfile.mkdtemp(prefix="lint-encoding-rel-deprecated-source-")
    try:
        _write(
            os.path.join(work, "canon", "elements", "app.yaml"),
            "id: APP-1\nname: Test App\n",
        )
        _write(
            os.path.join(work, "canon", "relations", "rel1.yaml"),
            "id: REL-1\nsource: APP-1\ntarget: APP-1\n",
        )
        code, out = _run(LINT, env_root=work)
        check(code == 1, f"lint.py deprecated source: expected exit 1, got {code}: {out}")
        check("UnicodeEncodeError" not in out, f"lint.py deprecated source crashed on encoding: {out}")
        check("deprecated" in out.lower(), f"lint.py deprecated source: expected deprecation error: {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    check_lint_clean()
    check_lint_error()
    check_lint_warning()
    check_lint_rel_missing_to()
    check_lint_rel_missing_target_element()
    check_lint_rel_deprecated_source()

    if _failures:
        # Use errors="replace" to handle emoji in captured output under legacy encoding
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")
        print(f"FAIL: {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"  - {f}")
        return 1
    print("PASS: all encoding regression checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
