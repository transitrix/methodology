#!/usr/bin/env python3
"""Synthetic documents fixtures: real dispatch, DOCS rules, removal and silence.

Tests install the packed validator and its dependencies in a temporary adopter.
Requires npm registry access, or a populated npm cache.
"""
import copy
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
PACKAGE = ROOT / "packages/documents-cli"
INGEST = ROOT / "packages/ingest-cli/ingest.mjs"
EXAMPLE = ROOT / "notations/examples/packages/documents"
VERSION = yaml.safe_load((ROOT / "notations/CURRENT_VERSION.yaml").read_text())["methodology_version"]


def run(*args, cwd=ROOT, env=None):
    result = subprocess.run([str(a) for a in args], cwd=cwd, env=env, capture_output=True, text=True)
    return result.returncode, result.stdout + result.stderr


def success(*args, **kwargs):
    code, output = run(*args, **kwargs)
    assert code == 0, output
    return output


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in root.rglob("*") if p.is_file()}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(value, sort_keys=False), encoding="utf-8")


def core_validate(root):
    report = yaml.safe_load(success("node", INGEST, "repo-check", root))
    assert report["integrity"]["canon_elements_scanned"] == 2, report
    assert report["integrity"]["red_flags"] == [], report
    assert report["profile_completeness"]["out_of_profile_types"] == [], report
    env = dict(os.environ, REPO_ROOT=str(root))
    output = success("python3", ROOT / "tools/lint.py", env=env)
    assert "Validation PASSED" in output, output


def main():
    success("node", "--test", ROOT / "packages/ingest-cli/src/packages.test.mjs")
    success("python3", ROOT / "packages/reqif-cli/tests/test_reqif_integrity.py")
    print("PASS regressions: generic package tests and ReqIF integrity")
    with tempfile.TemporaryDirectory(prefix="documents-test-") as temp:
        temp = Path(temp)
        # Verify the distributable, not a fake validator or source-tree symlink.
        packed = json.loads(success("npm", "pack", "--json", "--pack-destination", temp, cwd=PACKAGE))
        root = temp / "adopter"
        root.mkdir()
        success("npm", "install", "--ignore-scripts", "--no-audit", "--no-fund",
                "--prefix", root, temp / packed[0]["filename"])
        manifest = f'transitrix: 1\nmethodology_version: "{VERSION}"\ncoverage_profile: core\n'
        (root / "transitrix.yaml").write_text(manifest + "packages: [documents]\n")
        # Two admitted synthetic goals, including an actual core-to-core reference.
        for n in (1, 2):
            goal = {"notation": "goal", "id": f"GOAL-synthetic-{n}",
                    "name": f"Synthetic goal {n}", "level": n - 1,
                    "description": "Synthetic documents validation fixture.",
                    "zone": "canon", "admitted_at": "2026-09-01",
                    "admitted_by": "synthetic-test", "valid_from": "2026-09-01",
                    "valid_to": None, "gate_checks": {k: "pass" for k in
                        ("uniqueness", "consistency", "completeness")}}
            if n == 2:
                goal["parent"] = "GOAL-synthetic-1"
            write(root / f"canon/elements/01_motivation/goals/GOAL-synthetic-{n}.yaml", goal)
        shutil.copytree(EXAMPLE / "document-types", root / "documents/document-types")
        shutil.copytree(EXAMPLE / "documents", root / "documents/documents")
        docpath = root / "documents/documents/doc-srs-v2-1.yaml"
        doc = yaml.safe_load(docpath.read_text())
        doc["values"]["Title"] = "Synthetic requirements document"
        doc["canon_refs"] = ["GOAL-synthetic-1", "CAPABILITY-V1.2", "REQUIREMENT-unresolved-1"]
        write(docpath, doc)
        baseline = snapshot(root)
        core_validate(root)
        output = success("node", INGEST, "check-packages", root)
        assert "documents  validator passed" in output and "3 record(s), 0 error(s)" in output, output
        assert "PKG-001" not in output and "1 validator(s) ran" in output, output
        assert snapshot(root) == baseline
        print("PASS declared: packed validator discovered; 3 records clean; core validates; no writes")

        cases = [
            ("DOCS-001", "wrong kind ID", lambda d: d.update(id="doct-wrong-1")),
            ("DOCS-002", "duplicate ID", lambda d: d.update(id="doc-srs-v1-1")),
            ("DOCS-003", "missing type", lambda d: d.update(type="doct-missing-1")),
            ("DOCS-004", "unknown value", lambda d: d["values"].update(Unknown="value")),
            ("DOCS-004", "missing required", lambda d: d["values"].pop("Title")),
            ("DOCS-005", "package citation", lambda d: d.update(canon_refs=["doc-srs-v1-1"])),
            ("DOCS-005", "middle underscore", lambda d: d.update(canon_refs=["GOAL-bad_name-1"])),
            ("DOCS-006", "invalid calendar date", lambda d: d.update(issued_at="2026-02-30T10:00:00Z")),
            ("DOCS-006", "non-UTC timestamp", lambda d: d.update(issued_at="2026-09-01T10:00:00+01:00")),
            ("DOCS-006", "invalid version", lambda d: d.update(version="01.2.3")),
            ("DOCS-007", "unknown status", lambda d: d.update(status="approved")),
        ]
        for rule, name, mutate in cases:
            bad = copy.deepcopy(doc)
            mutate(bad)
            write(docpath, bad)
            code, output = run("node", INGEST, "check-packages", root)
            assert code == 1 and f"{rule} error documents/doc-srs-v2-1.yaml" in output, output
            assert set(re.findall(r"DOCS-\d{3}", output)) == {rule}, output
            print(f"PASS {rule} error: {name}")
        write(docpath, doc)
        # Optional fields absent, required entries present (null still counts as
        # an entry under DOCS-004), all statuses, SemVer and documented 1.0 form.
        for status, version in zip(("draft", "issued", "superseded", "archived"),
                                   ("1.0", "2.1.3", "1.2.3-rc.1+build.2", "0.0.0")):
            valid = copy.deepcopy(doc)
            valid.update(status=status, version=version, issued_at="2024-02-29T10:00:00Z")
            valid.pop("canon_refs")
            valid["values"].pop("CoverageArea", None)
            valid["values"]["Title"] = None
            write(docpath, valid)
            success("node", INGEST, "check-packages", root)
        print("PASS DOCS-001–007 positive: distinct valid IDs, resolved type, required entries, optional omission, grammar-only citations, dates/versions/statuses")
        # Both published compatibility versions and full SemVer remain literal
        # data; no normalization or migration is a validation side effect.
        for version in ("1.0", "2.0", "0.0", "2.1.3", "1.2.3-0", "1.2.3-rc.1+build.2", "1.2.3+001"):
            valid = copy.deepcopy(doc)
            valid["version"] = version
            write(docpath, valid)
            before_version = docpath.read_bytes()
            success("node", INGEST, "check-packages", root)
            assert docpath.read_bytes() == before_version
        for version in ("1", "1.2.3.4", "01.0", "1.00", "01.2.3", "1.02.3", "1.2.03",
                        "1.0-rc.1", "1.0+build", "1.2.3-01", "1.2.3-", "1.2.3+", "1.2.3-rc..1",
                        "1.2.3+build..1", "1.2.3-rc_1", " 1.2.3", "1.2.3 ", 1.0, None):
            bad = copy.deepcopy(doc)
            bad["version"] = version
            write(docpath, bad)
            code, output = run("node", INGEST, "check-packages", root)
            assert code == 1 and "DOCS-006 error documents/doc-srs-v2-1.yaml" in output, output
            assert set(re.findall(r"DOCS-\d{3}", output)) == {"DOCS-006"}, output
        print("PASS DOCS-006 versions: 7 valid preserved strings; 19 invalid counts, components, suffixes and scalar types rejected")

        for bad in ("package: [", "package: documents\npackage: documents\n", "[]\n"):
            docpath.write_text(bad)
            code, output = run("node", INGEST, "check-packages", root)
            assert code == 1 and "INPUT error" in output, output
        print("PASS malformed YAML/schema: actionable input failure through dispatch")
        write(docpath, doc)

        print(success("node", PACKAGE / "tests/test_events.mjs", root))

        canon_before = snapshot(root / "canon")
        shutil.rmtree(root / "documents")
        (root / "transitrix.yaml").write_text(manifest)
        after_removal = snapshot(root)
        core_validate(root)
        output = success("node", INGEST, "check-packages", root)
        assert "no packages declared" in output and "DOCS-" not in output and "validator" not in output, output
        assert snapshot(root) == after_removal
        assert snapshot(root / "canon") == canon_before
        assert not any(re.search(rb"\b(?:doc|doct)-", data) for data in canon_before.values())
        print("PASS removal: delete documents/ + declaration; actual core/package validation passes; core bytes retained")

        # A separate never-declared repository contains deliberately broken
        # package content and an installed validator: neither is activated.
        silent = temp / "never-declared"
        shutil.copytree(root, silent)
        write(silent / "documents/documents/doc-invalid-1.yaml", {"package": "documents", "kind": "document", "id": "invalid"})
        write(silent / "documents/events/issue-invalid-1.yaml", {"package": "documents", "kind": "issuance-event", "id": "invalid"})
        before = snapshot(silent)
        core_validate(silent)
        output = success("node", INGEST, "check-packages", silent)
        assert "no packages declared" in output and "DOCS-" not in output and "validator" not in output, output
        assert snapshot(silent) == before
        print("PASS undeclared: broken documents ignored, no package types admitted, no package warnings; byte-identical after real validation")

        # Shipped packages coexist through unchanged generic dispatch.
        packed_reqif = json.loads(success("npm", "pack", "--json", "--pack-destination", temp,
                                          cwd=ROOT / "packages/reqif-cli"))
        success("npm", "install", "--ignore-scripts", "--no-audit", "--no-fund",
                "--prefix", root, temp / packed_reqif[0]["filename"])
        shutil.copytree(EXAMPLE / "document-types", root / "documents/document-types")
        shutil.copytree(EXAMPLE / "documents", root / "documents/documents")
        shutil.copytree(ROOT / "notations/examples/packages/reqif/reqif", root / "reqif")
        (root / "transitrix.yaml").write_text(manifest + "packages: [documents, reqif]\n")
        output = success("node", INGEST, "check-packages", root)
        assert "documents  validator passed" in output and "reqif  validator passed" in output, output
        assert "2 validator(s) ran, 0 failed" in output, output
        print("PASS coexistence: installed documents + reqif both validate through generic dispatch")


if __name__ == "__main__":
    main()
