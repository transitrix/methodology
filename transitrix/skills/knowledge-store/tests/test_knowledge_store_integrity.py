#!/usr/bin/env python3
"""Deterministic integrity test for the Knowledge Store quality gates.

Runs tools/knowledge_store_lint.py against fixture bundles and synthetic
failure cases. Covers KS-001 through KS-017 — the reference implementation
of Gates 1-6 from patterns/knowledge-store.md.

Run:  python transitrix/skills/knowledge-store/tests/test_knowledge_store_integrity.py
Exit: 0 = all pass; 1 = a check failed.
"""

import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SKILL_DIR)))
LINTER = os.path.join(REPO_ROOT, "tools", "knowledge_store_lint.py")
FIXTURES = os.path.join(HERE, "fixtures", "valid")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def run_linter(root):
    proc = subprocess.run(
        [sys.executable, LINTER, root],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return proc.returncode, proc.stdout + proc.stderr


def part_a_bundle_integrity():
    print("Part A — bundle integrity")
    check(os.path.isfile(LINTER), f"Linter script missing: {LINTER}")
    check(os.path.isdir(FIXTURES), f"Valid fixture missing: {FIXTURES}")
    skill_md = os.path.join(SKILL_DIR, "SKILL.md")
    check(os.path.isfile(skill_md), f"SKILL.md missing: {skill_md}")
    pattern = os.path.join(REPO_ROOT, "patterns", "knowledge-store.md")
    check(os.path.isfile(pattern), f"patterns/knowledge-store.md missing: {pattern}")
    print("  OK\n")


def part_b_valid_fixture():
    print("Part B — valid fixture passes")
    code, out = run_linter(FIXTURES)
    check(code == 0, f"Valid fixture should pass; exit {code}\n{out}")
    check("KS-00" not in out or "Errors: 0" in out, f"Unexpected errors in valid fixture:\n{out}")
    print("  OK\n")


def _with_copy(mutator):
    tmp = tempfile.mkdtemp(prefix="ks-lint-")
    try:
        shutil.copytree(FIXTURES, tmp, dirs_exist_ok=True)
        mutator(tmp)
        return run_linter(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def part_c_gate_violations():
    print("Part C — gate violations (expected failures)")

    def missing_frontmatter(root):
        path = os.path.join(root, "knowledge", "bad-no-fm.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write("# No frontmatter\n")

    code, out = _with_copy(missing_frontmatter)
    check(code != 0 and "KS-001" in out, f"Missing frontmatter should fail KS-001; code={code}\n{out}")

    def wrong_intake_type(root):
        path = os.path.join(root, "_intake", "processed", "2026-07-01-cfo-interview.md")
        text = open(path, encoding="utf-8").read().replace("type: source-document", "type: insight")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(wrong_intake_type)
    check(code != 0 and "KS-003" in out, f"Wrong intake type should fail KS-003; code={code}\n{out}")

    def missing_source(root):
        path = os.path.join(root, "_intake", "processed", "2026-07-01-cfo-interview.md")
        text = open(path, encoding="utf-8").read().replace("source:", "source_removed:")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(missing_source)
    check(code != 0 and "KS-004" in out, f"Missing source should fail KS-004; code={code}\n{out}")

    def missing_confidence(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read().replace("confidence: inferred", "confidence_removed: inferred")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(missing_confidence)
    check(code != 0 and "KS-005" in out, f"Missing confidence should fail KS-005; code={code}\n{out}")

    def dangling_link(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read() + "\nSee also [missing](/knowledge/does-not-exist.md).\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(dangling_link)
    check(code != 0 and "KS-007" in out, f"Dangling link should fail KS-007; code={code}\n{out}")

    print("  OK\n")


def part_d_warnings():
    print("Part D — warnings and info tiers")

    def duplicate_titles(root):
        src = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        dst = os.path.join(root, "knowledge", "order-fulfilment-bottleneck-copy.md")
        shutil.copyfile(src, dst)

    code, out = _with_copy(duplicate_titles)
    check(code == 0 and "KS-008" in out, f"Duplicate titles should warn KS-008; code={code}\n{out}")

    code, out = run_linter(FIXTURES)
    check("KS-009" in out, f"Valid fixture should emit KS-009 blast-radius info:\n{out}")

    def assumed_high_dependents(root):
        # Create a widely-referenced object linked from many others.
        core_vocab_path = os.path.join(root, "knowledge", "core-vocabulary.md")
        with open(core_vocab_path, "w", encoding="utf-8") as f:
            f.write("""---
type: concept
title: Core vocabulary term
description: Widely referenced concept.
source: _intake/processed/2026-07-01-cfo-interview.md
created_at: 2026-07-01
confidence: assumed
tags: [core]
timestamp: 2026-07-01T11:00:00Z
---

# Body

Referenced by many downstream objects.
""")
        for i in range(3):
            path = os.path.join(root, "knowledge", f"dependent-{i}.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"""---
type: insight
title: Dependent object {i}
description: Depends on core vocabulary.
source: _intake/processed/2026-07-01-cfo-interview.md
created_at: 2026-07-01
confidence: observed
tags: [dependent]
timestamp: 2026-07-01T12:00:00Z
---

See [core](/knowledge/core-vocabulary.md).
""")

    code, out = _with_copy(assumed_high_dependents)
    check(code == 0 and "KS-010" in out, f"assumed + dependents should warn KS-010; code={code}\n{out}")

    print("  OK\n")


def part_e_gate5_consistency():
    print("Part E — Gate 5 scoped consistency")

    def bad_mapping(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read()
        text = text.replace("confidence: inferred", "confidence: inferred\nmapping: duplicate")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(bad_mapping)
    check(code != 0 and "KS-011" in out, f"Invalid mapping should fail KS-011; code={code}\n{out}")

    def conflicts_no_target(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read()
        text = text.replace("confidence: inferred", "confidence: inferred\nmapping: conflicts")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(conflicts_no_target)
    check(code != 0 and "KS-012" in out, f"conflicts without target should fail KS-012; code={code}\n{out}")

    def conflicts_no_log(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read()
        text = text.replace(
            "confidence: inferred",
            "confidence: inferred\nmapping: conflicts\n"
            "conflicts_with: /knowledge/warehouse-finance-handoff.md",
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(conflicts_no_log)
    check(code != 0 and "KS-014" in out, f"conflicts without log should fail KS-014; code={code}\n{out}")

    def confidence_ordering(root):
        intake_path = os.path.join(root, "_intake", "processed", "2026-07-01-cfo-interview.md")
        intake_text = open(intake_path, encoding="utf-8").read().replace(
            "confidence: observed", "confidence: inferred"
        )
        with open(intake_path, "w", encoding="utf-8") as f:
            f.write(intake_text)
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read().replace("confidence: inferred", "confidence: observed")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(confidence_ordering)
    check(code == 0 and "KS-013" in out, f"higher confidence than source should warn KS-013; code={code}\n{out}")

    print("  OK\n")


def part_f_gate6_assisted_ingest():
    print("Part F — Gate 6 assisted ingest")

    def draft_missing_status(root):
        drafts = os.path.join(root, "_intake", "drafts")
        os.makedirs(drafts, exist_ok=True)
        path = os.path.join(drafts, "candidate-insight.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write("""---
type: insight
title: Candidate insight
description: Draft without review_status.
source: _intake/processed/2026-07-01-cfo-interview.md
created_at: 2026-07-01
confidence: inferred
tags: [draft]
timestamp: 2026-07-01T10:00:00Z
---

# Body

Draft body.
""")

    code, out = _with_copy(draft_missing_status)
    check(code != 0 and "KS-016" in out, f"Draft missing review_status should fail KS-016; code={code}\n{out}")

    def draft_ambiguous_no_note(root):
        drafts = os.path.join(root, "_intake", "drafts")
        os.makedirs(drafts, exist_ok=True)
        path = os.path.join(drafts, "ambiguous-insight.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write("""---
type: insight
title: Ambiguous insight
description: Needs human judgement.
source: _intake/processed/2026-07-01-cfo-interview.md
created_at: 2026-07-01
confidence: inferred
review_status: ambiguous
tags: [draft]
timestamp: 2026-07-01T10:00:00Z
---

# Body

Unclear mapping.
""")

    code, out = _with_copy(draft_ambiguous_no_note)
    check(code != 0 and "KS-017" in out, f"Ambiguous draft without note should fail KS-017; code={code}\n{out}")

    def promoted_with_review_status(root):
        path = os.path.join(root, "knowledge", "order-fulfilment-bottleneck.md")
        text = open(path, encoding="utf-8").read().replace(
            "confidence: inferred", "confidence: inferred\nreview_status: ready"
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    code, out = _with_copy(promoted_with_review_status)
    check(code != 0 and "KS-015" in out, f"Promoted object with review_status should fail KS-015; code={code}\n{out}")

    print("  OK\n")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    part_a_bundle_integrity()
    part_b_valid_fixture()
    part_c_gate_violations()
    part_d_warnings()
    part_e_gate5_consistency()
    part_f_gate6_assisted_ingest()

    if _failures:
        print("FAILED:")
        for f in _failures:
            print(f"  - {f}")
        sys.exit(1)
    print("All knowledge-store integrity checks passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
