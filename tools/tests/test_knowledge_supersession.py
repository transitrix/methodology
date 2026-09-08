#!/usr/bin/env python3
"""Test suite for knowledge object supersession validation (KS-018, KS-019, KS-020).

Tests the validator's ability to enforce bidirectional supersession pointers
and detect identity mismatches. Verifies that re-curation follows the pattern:
create new object + add `supersedes` field pointing to old, add `superseded_by`
field to old object pointing to new.

Per patterns/knowledge-store.md Gate 2.1 and task transitrix-hq#696.

Run:  python tools/tests/test_knowledge_supersession.py
Exit: 0 = all checks pass; 1 = a check failed.
"""

import os
import shutil
import subprocess
import sys
import tempfile

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


# ── Test 1: Valid bidirectional supersession pair ────────────────────────

def test_valid_supersession_pair():
    """A valid supersession pair (both objects point to each other) should pass."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-valid-")
    try:
        # Old object with superseded_by
        _write(
            os.path.join(work, "knowledge", "old-concept.md"),
            """---
type: knowledge-object
title: Old Concept
confidence: observed
source: /concept/old.md
superseded_by: /knowledge/new-concept.md
---

Old concept - superseded."""
        )
        # New object with supersedes
        _write(
            os.path.join(work, "knowledge", "new-concept.md"),
            """---
type: knowledge-object
title: New Concept
confidence: observed
source: /concept/new.md
supersedes: /knowledge/old-concept.md
---

New concept - replaces old."""
        )
        code, out = _run_linter(work)
        check(
            "KS-018" not in out and "KS-019" not in out and "KS-020" not in out,
            f"Valid pair should have no supersession errors, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 2: KS-018 - Unresolved supersedes target ───────────────────────

def test_ks018_unresolved_target():
    """KS-018 should flag when supersedes points to non-existent object."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-ks018-")
    try:
        _write(
            os.path.join(work, "knowledge", "new-concept.md"),
            """---
type: knowledge-object
title: New Concept
confidence: observed
source: /concept/new.md
supersedes: /knowledge/nonexistent.md
---

This object claims to supersede something that doesn't exist."""
        )
        code, out = _run_linter(work)
        check(
            "KS-018" in out,
            f"Should flag unresolved supersedes with KS-018, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 3: KS-019 - Incomplete bidirectional pointer ────────────────────

def test_ks019_incomplete_pointer_from_new():
    """KS-019 should warn when new object supersedes but old doesn't have superseded_by."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-ks019-new-")
    try:
        # Old object WITHOUT superseded_by
        _write(
            os.path.join(work, "knowledge", "old-concept.md"),
            """---
type: knowledge-object
title: Old Concept
confidence: observed
source: /concept/old.md
---

Old concept - no pointer back."""
        )
        # New object WITH supersedes
        _write(
            os.path.join(work, "knowledge", "new-concept.md"),
            """---
type: knowledge-object
title: New Concept
confidence: observed
source: /concept/new.md
supersedes: /knowledge/old-concept.md
---

New concept - points back but old doesn't."""
        )
        code, out = _run_linter(work)
        check(
            "KS-019" in out,
            f"Should flag incomplete bidirectional pointer with KS-019, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 4: KS-019 - Incomplete bidirectional pointer (reverse) ──────────

def test_ks019_incomplete_pointer_from_old():
    """KS-019 should warn when old object has superseded_by but new doesn't have supersedes."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-ks019-old-")
    try:
        # Old object WITH superseded_by
        _write(
            os.path.join(work, "knowledge", "old-concept.md"),
            """---
type: knowledge-object
title: Old Concept
confidence: observed
source: /concept/old.md
superseded_by: /knowledge/new-concept.md
---

Old concept - points forward."""
        )
        # New object WITHOUT supersedes
        _write(
            os.path.join(work, "knowledge", "new-concept.md"),
            """---
type: knowledge-object
title: New Concept
confidence: observed
source: /concept/new.md
---

New concept - doesn't point back."""
        )
        code, out = _run_linter(work)
        check(
            "KS-019" in out,
            f"Should flag incomplete bidirectional pointer with KS-019, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 5: KS-020 - Pointer identity mismatch ─────────────────────────

def test_ks020_pointer_mismatch():
    """KS-020 should error when new object's supersedes doesn't match old object's superseded_by."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-ks020-")
    try:
        # Object A
        _write(
            os.path.join(work, "knowledge", "concept-a.md"),
            """---
type: knowledge-object
title: Concept A
confidence: observed
source: /concept/a.md
---

Concept A."""
        )
        # Object B claims to supersede A but says it's superseded by C
        _write(
            os.path.join(work, "knowledge", "concept-b.md"),
            """---
type: knowledge-object
title: Concept B
confidence: observed
source: /concept/b.md
supersedes: /knowledge/concept-a.md
superseded_by: /knowledge/concept-c.md
---

Concept B."""
        )
        # Object C (to make the mismatch detectable)
        _write(
            os.path.join(work, "knowledge", "concept-c.md"),
            """---
type: knowledge-object
title: Concept C
confidence: observed
source: /concept/c.md
supersedes: /knowledge/concept-b.md
---

Concept C."""
        )
        # Now make A's superseded_by point to C instead of B (mismatch)
        _write(
            os.path.join(work, "knowledge", "concept-a.md"),
            """---
type: knowledge-object
title: Concept A
confidence: observed
source: /concept/a.md
superseded_by: /knowledge/concept-c.md
---

Concept A."""
        )
        code, out = _run_linter(work)
        # This tests the mismatch detection
        check(
            "KS-020" in out or "KS-019" in out,
            f"Should flag pointer mismatch, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 6: No supersession fields is valid ────────────────────────────

def test_no_supersession_valid():
    """Knowledge objects without supersession fields should be valid."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-none-")
    try:
        _write(
            os.path.join(work, "knowledge", "standalone.md"),
            """---
type: knowledge-object
title: Standalone Concept
confidence: observed
source: /concept/standalone.md
---

This is a standalone knowledge object with no supersession."""
        )
        code, out = _run_linter(work)
        check(
            "KS-018" not in out and "KS-019" not in out and "KS-020" not in out,
            f"Objects without supersession should pass, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 7: Draft objects with supersession (should still validate) ─────

def test_draft_supersession():
    """Draft objects should also have supersession validation."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-draft-")
    try:
        _write(
            os.path.join(work, "_intake", "drafts", "draft-new.md"),
            """---
type: knowledge-object
title: Draft New
confidence: assumed
review_status: ready
supersedes: /knowledge/nonexistent.md
---

Draft with unresolved supersedes."""
        )
        code, out = _run_linter(work)
        check(
            "KS-018" in out,
            f"Drafts should also validate supersession, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 8: Path normalization (with/without leading /) ────────────────

def test_path_normalization():
    """Supersession paths should work with or without leading slashes."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-paths-")
    try:
        # Old object with relative path (no leading /)
        _write(
            os.path.join(work, "knowledge", "old.md"),
            """---
type: knowledge-object
title: Old
confidence: observed
source: /concept/old.md
superseded_by: knowledge/new.md
---

Old."""
        )
        # New object with absolute path (leading /)
        _write(
            os.path.join(work, "knowledge", "new.md"),
            """---
type: knowledge-object
title: New
confidence: observed
source: /concept/new.md
supersedes: /knowledge/old.md
---

New."""
        )
        code, out = _run_linter(work)
        # Both forms should resolve correctly
        check(
            "KS-018" not in out,
            f"Path normalization should work, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ── Test 9: Multiple supersession pairs in same repo ────────────────────

def test_multiple_supersession_pairs():
    """Repository can have multiple independent supersession pairs."""
    work = tempfile.mkdtemp(prefix="knowledge-supersession-multi-")
    try:
        # Pair 1: concept-old -> concept-new
        _write(
            os.path.join(work, "knowledge", "concept-old.md"),
            """---
type: knowledge-object
title: Concept Old
confidence: observed
source: /source/concept.md
superseded_by: /knowledge/concept-new.md
---

Old concept."""
        )
        _write(
            os.path.join(work, "knowledge", "concept-new.md"),
            """---
type: knowledge-object
title: Concept New
confidence: observed
source: /source/concept-new.md
supersedes: /knowledge/concept-old.md
---

New concept."""
        )
        # Pair 2: process-old -> process-new
        _write(
            os.path.join(work, "knowledge", "process-old.md"),
            """---
type: knowledge-object
title: Process Old
confidence: observed
source: /source/process.md
superseded_by: /knowledge/process-new.md
---

Old process."""
        )
        _write(
            os.path.join(work, "knowledge", "process-new.md"),
            """---
type: knowledge-object
title: Process New
confidence: observed
source: /source/process-new.md
supersedes: /knowledge/process-old.md
---

New process."""
        )
        code, out = _run_linter(work)
        check(
            "KS-018" not in out and "KS-019" not in out and "KS-020" not in out,
            f"Multiple valid pairs should all pass, got: {out}"
        )
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    test_valid_supersession_pair()
    test_ks018_unresolved_target()
    test_ks019_incomplete_pointer_from_new()
    test_ks019_incomplete_pointer_from_old()
    test_ks020_pointer_mismatch()
    test_no_supersession_valid()
    test_draft_supersession()
    test_path_normalization()
    test_multiple_supersession_pairs()

    if _failures:
        for stream in (sys.stdout, sys.stderr):
            if hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")
        print(f"FAIL: {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"  - {f}")
        return 1
    print("PASS: all supersession tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
