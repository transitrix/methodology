#!/usr/bin/env python3
"""Test suite for knowledge object freshness computation (FRESHNESS-001).

Tests the validator's ability to flag stale knowledge objects anchored on
the `timestamp` field, using per-repo thresholds from `confidence_decay.knowledge`
in transitrix.yaml. Verifies both positive cases (stale objects flagged) and
negative cases (fresh/no objects stay silent).

Per CONTRACT §11.3 §11.7 and task transitrix-hq#695.

Run:  python tools/tests/test_knowledge_freshness.py
Exit: 0 = all checks pass; 1 = a check failed.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, date

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LINTER = os.path.join(REPO_ROOT, "tools", "knowledge_store_lint.py")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def _write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def _decode(raw_bytes):
    return raw_bytes.decode("utf-8", errors="replace")


def _run_linter(work_dir):
    """Run knowledge_store_lint.py in the given directory."""
    r = subprocess.run(
        [sys.executable, LINTER, work_dir],
        capture_output=True,
        env=dict(os.environ),
    )
    return r.returncode, _decode(r.stdout) + _decode(r.stderr)


def _stale_date(days_ago):
    """Return an ISO 8601 date string for N days ago."""
    past = date.today() - timedelta(days=days_ago)
    return past.isoformat()


def _fresh_date(days_ago):
    """Return an ISO 8601 date string for N days ago."""
    past = date.today() - timedelta(days=days_ago)
    return past.isoformat()


# ── Test 1: Stale knowledge object is flagged ──────────────────────────────

def test_stale_knowledge_object():
    """A knowledge object older than stale_days threshold generates FRESHNESS-001."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-stale-")
    try:
        # Create a knowledge object with timestamp 800 days ago (default stale_days=730)
        _write(
            os.path.join(work, "knowledge", "old-concept.md"),
            f"""---
type: knowledge-object
title: Old Concept
timestamp: {_stale_date(800)}
confidence: observed
source: /concept/old.md
---

This concept is stale."""
        )
        code, out = _run_linter(work)
        check(
            "FRESHNESS-001" in out,
            f"Stale object should generate FRESHNESS-001, got: {out}"
        )
        check(
            "stale" in out.lower(),
            f"Output should mention staleness, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 2: Fresh knowledge object is not flagged ──────────────────────────

def test_fresh_knowledge_object():
    """A knowledge object within fresh_days does not generate FRESHNESS-001."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-fresh-")
    try:
        # Create a knowledge object with timestamp 100 days ago (default fresh_days=180)
        _write(
            os.path.join(work, "knowledge", "new-concept.md"),
            f"""---
type: knowledge-object
title: New Concept
timestamp: {_fresh_date(100)}
confidence: observed
source: /concept/new.md
---

This concept is fresh."""
        )
        code, out = _run_linter(work)
        check(
            "FRESHNESS-001" not in out,
            f"Fresh object should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 3: Knowledge object in transition zone (between fresh and stale) ─

def test_knowledge_object_in_transition():
    """An object in the transition zone (fresh_days < age < stale_days)
    should not generate FRESHNESS-001 (only stale_days triggers the warning)."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-transition-")
    try:
        # Create a knowledge object 450 days ago (between 180 and 730)
        _write(
            os.path.join(work, "knowledge", "medium-concept.md"),
            f"""---
type: knowledge-object
title: Medium Concept
timestamp: {_fresh_date(450)}
confidence: observed
source: /concept/medium.md
---

This concept is medium-aged."""
        )
        code, out = _run_linter(work)
        check(
            "FRESHNESS-001" not in out,
            f"Object in transition zone should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 4: Empty store stays silent ───────────────────────────────────────

def test_empty_store_silent():
    """A repository with no knowledge objects should not crash and should stay silent."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-empty-")
    try:
        # Don't create any knowledge objects
        code, out = _run_linter(work)
        check(
            code == 0,
            f"Empty store should exit 0, got {code}: {out}"
        )
        check(
            "No knowledge-store objects found" in out,
            f"Empty store should report no objects, got: {out}"
        )
        check(
            "FRESHNESS-001" not in out,
            f"Empty store should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 5: Multiple stale objects all flagged ─────────────────────────────

def test_multiple_stale_objects():
    """Multiple stale objects should each generate their own FRESHNESS-001 warning."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-multi-stale-")
    try:
        _write(
            os.path.join(work, "knowledge", "old1.md"),
            f"""---
type: knowledge-object
title: Old Concept 1
timestamp: {_stale_date(800)}
confidence: observed
source: /concept/old1.md
---

First stale object."""
        )
        _write(
            os.path.join(work, "knowledge", "old2.md"),
            f"""---
type: knowledge-object
title: Old Concept 2
timestamp: {_stale_date(900)}
confidence: observed
source: /concept/old2.md
---

Second stale object."""
        )
        code, out = _run_linter(work)
        # Count FRESHNESS-001 occurrences
        count = out.count("FRESHNESS-001")
        check(
            count >= 2,
            f"Should have at least 2 FRESHNESS-001 warnings, got {count}: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 6: Custom thresholds in transitrix.yaml ───────────────────────────

def test_custom_thresholds():
    """Custom freshness thresholds in transitrix.yaml should be respected."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-custom-")
    try:
        # Write transitrix.yaml with custom thresholds: stale after 365 days
        _write(
            os.path.join(work, "transitrix.yaml"),
            """confidence_decay:
  defaults: {fresh_days: 180, stale_days: 730, floor: 0.3}
  knowledge: {fresh_days: 30, stale_days: 90, floor: 0.3}"""
        )
        # Create a knowledge object 100 days old (stale by custom threshold but not by default)
        _write(
            os.path.join(work, "knowledge", "concept.md"),
            f"""---
type: knowledge-object
title: Custom Threshold Test
timestamp: {_stale_date(100)}
confidence: observed
source: /concept/test.md
---

This object is old by custom threshold (90 days) but fresh by default (730 days)."""
        )
        code, out = _run_linter(work)
        check(
            "FRESHNESS-001" in out,
            f"Custom stale_days=90 should flag 100-day-old object, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 7: Missing timestamp is handled gracefully ────────────────────────

def test_missing_timestamp():
    """A knowledge object without a timestamp should not crash the validator."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-no-ts-")
    try:
        _write(
            os.path.join(work, "knowledge", "no-timestamp.md"),
            """---
type: knowledge-object
title: Object Without Timestamp
confidence: observed
source: /concept/no-ts.md
---

This object has no timestamp field."""
        )
        code, out = _run_linter(work)
        check(
            code == 0,
            f"Missing timestamp should not crash (exit 0), got {code}: {out}"
        )
        check(
            "FRESHNESS-001" not in out,
            f"Missing timestamp should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 8: Invalid timestamp is handled gracefully ────────────────────────

def test_invalid_timestamp():
    """An invalid timestamp should not crash the validator."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-bad-ts-")
    try:
        _write(
            os.path.join(work, "knowledge", "bad-timestamp.md"),
            """---
type: knowledge-object
title: Object With Invalid Timestamp
timestamp: "not-a-date"
confidence: observed
source: /concept/bad-ts.md
---

This object has an invalid timestamp."""
        )
        code, out = _run_linter(work)
        check(
            code == 0,
            f"Invalid timestamp should not crash (exit 0), got {code}: {out}"
        )
        check(
            "FRESHNESS-001" not in out,
            f"Invalid timestamp should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 9: Intake objects are not freshness-checked ──────────────────────

def test_intake_objects_not_checked():
    """Intake (source-document) objects should not generate freshness warnings."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-intake-")
    try:
        _write(
            os.path.join(work, "_intake", "processed", "old-source.md"),
            f"""---
type: source-document
title: Old Source Document
timestamp: {_stale_date(800)}
source: /documents/old-source.pdf
---

This is an old source document."""
        )
        code, out = _run_linter(work)
        # Intake objects should not trigger FRESHNESS-001
        check(
            "FRESHNESS-001" not in out,
            f"Intake objects should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 10: Draft objects are not freshness-checked ──────────────────────

def test_draft_objects_not_checked():
    """Draft objects should not generate freshness warnings."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-draft-")
    try:
        _write(
            os.path.join(work, "_intake", "drafts", "old-draft.md"),
            f"""---
type: knowledge-object
title: Old Draft
timestamp: {_stale_date(800)}
confidence: assumed
source: /concept/draft.md
review_status: ready
---

This is an old draft."""
        )
        code, out = _run_linter(work)
        # Draft objects should not trigger FRESHNESS-001
        check(
            "FRESHNESS-001" not in out,
            f"Draft objects should not generate FRESHNESS-001, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 11: Mixed store (fresh, stale, no-timestamp) ──────────────────────

def test_mixed_store():
    """A mixed store should flag only the stale objects."""
    work = tempfile.mkdtemp(prefix="knowledge-freshness-mixed-")
    try:
        # Fresh object
        _write(
            os.path.join(work, "knowledge", "fresh.md"),
            f"""---
type: knowledge-object
title: Fresh Concept
timestamp: {_fresh_date(100)}
confidence: observed
source: /concept/fresh.md
---

Fresh concept."""
        )
        # Stale object
        _write(
            os.path.join(work, "knowledge", "stale.md"),
            f"""---
type: knowledge-object
title: Stale Concept
timestamp: {_stale_date(800)}
confidence: observed
source: /concept/stale.md
---

Stale concept."""
        )
        # No timestamp
        _write(
            os.path.join(work, "knowledge", "no-ts.md"),
            """---
type: knowledge-object
title: No Timestamp Concept
confidence: observed
source: /concept/no-ts.md
---

No timestamp."""
        )
        code, out = _run_linter(work)
        # Should have exactly 1 FRESHNESS-001 (for the stale one)
        count = out.count("FRESHNESS-001")
        check(
            count == 1,
            f"Mixed store should have exactly 1 FRESHNESS-001 (for stale), got {count}: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    test_stale_knowledge_object()
    test_fresh_knowledge_object()
    test_knowledge_object_in_transition()
    test_empty_store_silent()
    test_multiple_stale_objects()
    test_custom_thresholds()
    test_missing_timestamp()
    test_invalid_timestamp()
    test_intake_objects_not_checked()
    test_draft_objects_not_checked()
    test_mixed_store()

    if _failures:
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")
        print(f"FAIL: {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"  - {f}")
        return 1
    print("PASS: all freshness tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
