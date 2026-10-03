"""Synthetic controls over the shipped collector and both command-line entry points."""
import copy
import importlib.util
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import yaml

SKILL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("health_profile", SKILL / "health_profile.py")
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)
POLICY = {"confidence_decay": {"defaults": {"fresh_days": 30, "stale_days": 90, "floor": 0.3}}}
ELEMENT = {"notation": "goal", "id": "GOAL-EXAMPLE-1", "zone": "canon",
           "admitted_at": "2026-01-01", "admitted_by": "example-reviewer",
           "gate_checks": {"uniqueness": "pass", "consistency": "pass", "completeness": "pass"}}


class HealthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.write("transitrix.yaml", POLICY)
        self.element_path = "canon/elements/goals/GOAL-EXAMPLE-1.yaml"
        self.write(self.element_path, ELEMENT)

    def write(self, name, data):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data), encoding="utf-8")
        return path

    def scan(self, effective="2026-04-01", **kwargs):
        return health.HealthProfileScanner(self.root, effective, **kwargs).scan()

    def indicator(self, name="freshness", **kwargs):
        return self.scan(**kwargs)["indicators"][name]

    def test_checkout_and_synchronization_cannot_refresh(self):
        before = self.indicator()
        self.assertEqual(before["evidence"][0]["status"], "stale")
        os.utime(self.root / self.element_path, (0, 0))
        self.assertEqual(before, self.indicator())
        os.utime(self.root / self.element_path, None)
        self.assertEqual(before, self.indicator())

    def test_gate_qualified_reaffirmation_refreshes(self):
        self.assertEqual(self.indicator()["numerator"], 0)
        data = copy.deepcopy(ELEMENT)
        data["admitted_at"] = "2026-03-31"
        self.write(self.element_path, data)
        self.assertEqual(self.indicator()["numerator"], 1)
        data["gate_checks"]["consistency"] = "pending_review"
        self.write(self.element_path, data)
        self.assertEqual(self.indicator()["unknown"], 1)
        self.assertIsNone(self.indicator()["numerator"])

    def test_missing_policy_is_unavailable(self):
        self.write("transitrix.yaml", {})
        self.assertEqual(self.indicator()["status"], "unavailable")

    def test_missing_date_and_future_date_are_unknown(self):
        for value in (None, "2026-04-02", "not-a-date", "2026-02-30"):
            with self.subTest(value=value):
                data = dict(ELEMENT, admitted_at=value)
                self.write(self.element_path, data)
                self.assertEqual(self.indicator()["unknown"], 1)

    def test_policy_bounds_and_type_override(self):
        for invalid in ({"fresh_days": 90, "stale_days": 30, "floor": .3},
                        {"fresh_days": 30}, {"fresh_days": True, "stale_days": 90, "floor": .3}):
            self.write("transitrix.yaml", {"confidence_decay": {"defaults": invalid}})
            self.assertEqual(self.indicator()["status"], "unavailable")
        self.write("transitrix.yaml", {"confidence_decay": {**POLICY["confidence_decay"],
                   "by_type": {"GOAL": {"fresh_days": 100, "stale_days": 200}}}})
        self.assertEqual(self.indicator()["evidence"][0]["status"], "fresh")

    def test_aging_uses_contract_formula(self):
        row = self.indicator(effective="2026-03-02")["evidence"][0]
        self.assertEqual(row["age_days"], 60)
        self.assertAlmostEqual(row["freshness"], .65)

    def test_proposed_is_excluded(self):
        self.write(self.element_path, dict(ELEMENT, admission_state="proposed"))
        data = self.indicator()
        self.assertEqual(data["status"], "not_applicable")
        self.assertEqual(data["denominator"], 0)
        self.assertEqual(len(data["exclusions"]), 1)

    def test_duplicate_ids_remain_visible_and_ambiguous(self):
        self.write("canon/elements/duplicate.yml", ELEMENT)
        data = self.scan()["indicators"]
        self.assertEqual(data["denominator"]["numerator"], 1)
        self.assertEqual(data["denominator"]["denominator"], 2)
        self.assertIn(ELEMENT["id"], data["denominator"]["duplicates"])
        self.assertEqual(data["validity"]["status"], "unavailable")
        self.assertEqual(data["freshness"]["unknown"], 1)

    def test_yaml_yml_parse_failures_and_unsupported_markers(self):
        self.write("canon/elements/second.yml", dict(ELEMENT, id="GOAL-EXAMPLE-2"))
        self.write("views/example.transitrix.yaml", {"notation": "unknown"})
        self.write("ordinary.yaml", {"note": "notation: is just prose"})
        (self.root / "broken.yaml").write_text("broken: [", encoding="utf-8")
        data = self.indicator("denominator")
        self.assertEqual(len(data["files"]["read"]), 2)
        self.assertEqual(len(data["files"]["unread_marker"]), 2)
        self.assertIn("ordinary.yaml", data["files"]["foreign"])
        self.assertEqual(len(data["collection_failures"]), 1)
        self.assertEqual(data["discovered"], sum(map(len, data["files"].values())))

    def test_scope_exclusion_and_multiple_scope_selection(self):
        scope = self.write("organisations/example/SCOPE.yaml", {"exclude": [r"^canon/elements/"]})
        data = self.indicator("denominator")
        self.assertEqual(data["files"]["out_of_scope"], [self.element_path])
        self.assertEqual(data["denominator"], 0)
        self.write("organisations/second/SCOPE.yaml", {})
        with self.assertRaisesRegex(ValueError, "multiple"):
            self.scan()
        self.assertEqual(self.scan(scope=scope)["indicators"]["denominator"]["denominator"], 0)

    def test_invalid_scope_does_not_silently_expand_population(self):
        for value in ({"exclude": "canon"}, {"exclude": [23]}, ["canon"]):
            self.write("organisations/example/SCOPE.yaml", value)
            with self.assertRaises(ValueError):
                self.scan()

    def test_nested_catalogue_and_symlink_are_excluded(self):
        self.write("nested/transitrix.yaml", {})
        self.write("nested/canon/elements/other.yaml", dict(ELEMENT, id="GOAL-OTHER-1"))
        (self.root / "loop").symlink_to(self.root, target_is_directory=True)
        (self.root / "linked.yaml").symlink_to(self.root / self.element_path)
        data = self.indicator("denominator")
        self.assertEqual(data["numerator"], 1)
        self.assertEqual(data["files"]["out_of_scope"], ["linked.yaml"])
        self.assertEqual(set(data["skipped_trees"]), {"loop", "nested", "linked.yaml"})

    def test_existing_atomicity_check_positive_negative(self):
        self.assertEqual(self.indicator("validity")["numerator"], 1)
        self.write(self.element_path, dict(ELEMENT, relations=[]))
        result = self.indicator("validity")
        self.assertEqual(result["numerator"], 0)
        self.assertIn("ATOMICITY", result["findings"][0]["message"])

    def test_existing_reference_check_positive_negative(self):
        self.write("canon/relations/REL-EXAMPLE-1.yaml", {"notation": "relation", "id": "REL-EXAMPLE-1",
                   "from": ELEMENT["id"], "to": ELEMENT["id"]})
        self.assertEqual(self.indicator("connectedness")["numerator"], 1)
        self.write(self.element_path, dict(ELEMENT, parent="GOAL-MISSING-1"))
        data = self.indicator("connectedness")
        self.assertEqual(data["numerator"], 0)
        self.assertIn("GOAL-MISSING-1", data["findings"][0]["message"])

    def test_unsupported_reference_shape_is_not_success(self):
        self.write(self.element_path, dict(ELEMENT, parent={"id": "GOAL-OTHER-1"}))
        data = self.indicator("connectedness")
        self.assertEqual(data["status"], "partial")
        self.assertIsNone(data["numerator"])

    def test_empty_denominators_are_not_success(self):
        self.assertEqual(self.indicator("connectedness")["status"], "not_applicable")
        (self.root / self.element_path).unlink()
        for key in ("denominator", "validity", "freshness", "connectedness"):
            self.assertEqual(self.indicator(key)["status"], "not_applicable")

    def test_unsupported_business_and_workflow_metrics(self):
        data = self.scan()["indicators"]
        for key in ("coverage", "assertion_queue"):
            self.assertEqual(data[key]["status"], "unavailable")
            self.assertIsNone(data[key]["numerator"])
        self.assertEqual(len(data), 6)

    def test_provenance_changes_with_content_not_mtime(self):
        before = self.scan()["context"]
        os.utime(self.root / self.element_path, None)
        self.assertEqual(before["input_sha256"], self.scan()["context"]["input_sha256"])
        self.write(self.element_path, dict(ELEMENT, admitted_at="2026-03-31"))
        self.assertNotEqual(before["input_sha256"], self.scan()["context"]["input_sha256"])
        self.assertEqual(before["effective_date"], "2026-04-01")
        self.assertIn("sha256", before["validator"])

    def test_both_clis_match_and_findings_exit_zero(self):
        self.write(self.element_path, dict(ELEMENT, relations=[]))
        reports = []
        for command in ([sys.executable, str(SKILL / "health_profile.py")], ["node", str(SKILL / "scan.mjs")]):
            run = subprocess.run([*command, "--repo", str(self.root), "--effective-date", "2026-04-01", "--format", "json"],
                                 capture_output=True, text=True, env={**os.environ, "PYTHON": sys.executable})
            self.assertEqual(run.returncode, 0, run.stderr)
            data = json.loads(run.stdout)
            del data["context"]["observed_at"]
            reports.append(data)
        self.assertEqual(reports[0], reports[1])
        self.assertEqual(reports[0]["indicators"]["validity"]["status"], "findings")

    def test_copied_checkout_keeps_freshness(self):
        with tempfile.TemporaryDirectory() as other:
            target = Path(other) / "checkout"
            shutil.copytree(self.root, target, copy_function=shutil.copyfile)
            copied = health.HealthProfileScanner(target, "2026-04-01").scan()
            self.assertEqual(copied["indicators"]["freshness"], self.indicator())

    def test_no_reference_opportunities_is_not_applicable(self):
        self.write(self.element_path, dict(ELEMENT, goals=[]))
        self.assertEqual(self.indicator("connectedness")["status"], "not_applicable")
        self.assertEqual(self.indicator("connectedness")["denominator"], 0)

    def test_copied_skill_without_validator_is_explicit(self):
        with tempfile.TemporaryDirectory() as other:
            target = Path(other) / "transitrix" / "skills" / "health-profile"
            target.mkdir(parents=True)
            shutil.copyfile(SKILL / "health_profile.py", target / "health_profile.py")
            run = subprocess.run([sys.executable, str(target / "health_profile.py"), "--repo", str(self.root), "--format", "json"],
                                 text=True, capture_output=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            data = json.loads(run.stdout)
            self.assertEqual(data["indicators"]["validity"]["status"], "unavailable")
            self.assertEqual(data["indicators"]["connectedness"]["status"], "unavailable")

    def test_symlink_configuration_does_not_escape_catalogue(self):
        with tempfile.TemporaryDirectory() as other:
            outside = Path(other) / "scope.yaml"
            outside.write_text("exclude: []", encoding="utf-8")
            link = self.root / "scope.yaml"
            link.symlink_to(outside)
            with self.assertRaises(ValueError):
                self.scan(scope=link)

    def test_cli_output_and_invalid_root(self):
        output = self.root / "report.md"
        run = subprocess.run([sys.executable, str(SKILL / "health_profile.py"), "--repo", str(self.root), "--out", str(output)], capture_output=True)
        self.assertEqual(run.returncode, 0)
        self.assertIn("six", health.__doc__)
        self.assertIn("Informational snapshot", output.read_text())
        (self.root / "transitrix.yaml").unlink()
        run = subprocess.run(["node", str(SKILL / "scan.mjs"), "--repo", str(self.root)], capture_output=True,
                             env={**os.environ, "PYTHON": sys.executable})
        self.assertEqual(run.returncode, 2)


class DeclaredPilotTests(unittest.TestCase):
    """Compare consumer-authored expectations with both existing CLI entry points."""

    def test_declared_synthetic_cases(self):
        fixture = json.loads((SKILL / "examples" / "synthetic-pilot.json").read_text())
        self.assertEqual(fixture["kind"], "synthetic-only")
        for case in fixture["cases"]:
            with self.subTest(case=case["id"]), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                files = {**fixture["base_files"], **case["replace_files"]}
                for name in case["remove_files"]:
                    del files[name]
                for name, data in files.items():
                    path = root / name
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text(yaml.safe_dump(data, sort_keys=True), encoding="utf-8")
                reports = []
                for command in ([sys.executable, str(SKILL / "health_profile.py")],
                                ["node", str(SKILL / "scan.mjs")]):
                    run = subprocess.run([*command, "--repo", str(root), "--effective-date",
                                          fixture["effective_date"], "--format", "json"],
                                         capture_output=True, text=True,
                                         env={**os.environ, "PYTHON": sys.executable})
                    self.assertEqual(run.returncode, 0, run.stderr)
                    report = json.loads(run.stdout)
                    for indicator, fields in case["expected"]["indicators"].items():
                        for field, value in fields.items():
                            self.assertEqual(report["indicators"][indicator][field], value,
                                             f"{case['id']}: {indicator}.{field}")
                    inventory = report["indicators"]["denominator"]
                    self.assertEqual(inventory["files"]["out_of_scope"],
                                     case["expected"]["out_of_scope"])
                    self.assertEqual(inventory["collection_failures"], [])
                    self.assertEqual(inventory["files"]["unread_marker"], [])
                    self.assertEqual(sorted(row["id"] for row in
                                            report["indicators"]["freshness"]["exclusions"]),
                                     case["expected"]["freshness_excluded_ids"])
                    context = report["context"]
                    self.assertEqual(context["rules"], fixture["profile"])
                    self.assertEqual(context["effective_date"], fixture["effective_date"])
                    self.assertTrue(context["observed_at"])
                    self.assertTrue(context["input_sha256"])
                    self.assertTrue(context["collector_sha256"])
                    self.assertTrue(context["validator"]["sha256"])
                    del context["observed_at"]
                    reports.append(report)
                self.assertEqual(reports[0], reports[1])


if __name__ == "__main__":
    unittest.main()
