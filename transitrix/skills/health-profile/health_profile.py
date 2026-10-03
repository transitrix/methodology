#!/usr/bin/env python3
"""Informational, evidence-bound subset of the six-indicator health profile."""
import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys

import yaml

RULES = "health-profile/2"
REFERENCE_FIELDS = ("parent", "goals", "delivers_changes", "predecessors", "owner_role")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def iso_date(value):
    # CONTRACT dates are quoted ISO calendar dates; do not silently coerce YAML dates.
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("expected a quoted YYYY-MM-DD date")
    return date.fromisoformat(value)


def result(status, population, numerator=None, denominator=None, **details):
    return dict(status=status, population=population, numerator=numerator,
                denominator=denominator, **details)


def git_read(root, *args):
    try:
        p = subprocess.run(["git", "-C", str(root), *args], capture_output=True,
                           text=True, timeout=5, check=False)
        return p.stdout.strip() if p.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


class HealthProfileScanner:
    def __init__(self, repo_path, effective_date=None, scope=None):
        self.root = Path(repo_path).resolve()
        self.effective_date = iso_date(effective_date or datetime.now(timezone.utc).date().isoformat())
        self.scope = Path(scope).resolve() if scope else None
        self.files = {k: [] for k in ("read", "out_of_scope", "unread_marker", "foreign")}
        self.failures = []
        self.records = []
        self.hashes = {}
        self.skipped = []

    def read_yaml(self, path):
        if path.is_symlink():
            raise ValueError("configuration or input must not be a symbolic link")
        raw = path.read_bytes()
        self.hashes[path.relative_to(self.root).as_posix()] = digest(raw)
        return yaml.safe_load(raw.decode("utf-8"))

    def scan(self):
        if not (self.root / "transitrix.yaml").is_file():
            raise ValueError("--repo must name a catalogue root containing transitrix.yaml")
        manifest = self.read_yaml(self.root / "transitrix.yaml")
        if not isinstance(manifest, dict):
            raise ValueError("transitrix.yaml must contain a mapping")
        # Multiple scope files cannot be silently collapsed into one organisation.
        scopes = sorted(self.root.glob("organisations/*/SCOPE.yaml"))
        if self.scope is None and len(scopes) > 1:
            raise ValueError("multiple SCOPE.yaml files; select one with --scope")
        if self.scope is None and scopes:
            self.scope = scopes[0]
        exclusions = []
        if self.scope:
            if not self.scope.is_relative_to(self.root):
                raise ValueError("--scope must be inside --repo")
            config = self.read_yaml(self.scope)
            if not isinstance(config, dict) or not isinstance(config.get("exclude", []), list):
                raise ValueError("SCOPE.yaml must be a mapping with an optional exclude list")
            if not all(isinstance(p, str) for p in config.get("exclude", [])):
                raise ValueError("SCOPE exclude entries must be regular-expression strings")
            exclusions = [re.compile(p) for p in config.get("exclude", [])]

        def walk_error(error):
            self.failures.append({"path": Path(error.filename).relative_to(self.root).as_posix(),
                                  "reason": "directory unreadable"})

        for directory, dirs, names in os.walk(self.root, followlinks=False, onerror=walk_error):
            base = Path(directory)
            keep = []
            for name in sorted(dirs):
                p = base / name
                if (name.startswith(".") or name in ("node_modules", "__pycache__")
                        or p.is_symlink() or (p / "transitrix.yaml").exists()):
                    self.skipped.append(p.relative_to(self.root).as_posix())
                else:
                    keep.append(name)
            dirs[:] = keep
            for name in sorted(names):
                p = base / name
                if p.suffix not in (".yaml", ".yml") or name.startswith("."):
                    continue
                rel = p.relative_to(self.root).as_posix()
                if p.is_symlink():
                    self.files["out_of_scope"].append(rel)
                    self.skipped.append(rel)
                    continue
                if any(pattern.match(rel) for pattern in exclusions):
                    self.files["out_of_scope"].append(rel)
                    continue
                marker = (rel.startswith(("canon/elements/", "canon/relations/", "field/"))
                          or ".transitrix." in name or ".ttrs." in name)
                try:
                    data = self.read_yaml(p)
                except (OSError, UnicodeError, yaml.YAMLError) as error:
                    self.files["unread_marker"].append(rel)
                    self.failures.append({"path": rel, "reason": type(error).__name__})
                    continue
                marker = marker or (isinstance(data, dict) and
                                    any(k in data for k in ("notation", "element_type")))
                kind = ("element" if rel.startswith("canon/elements/") else
                        "relation" if rel.startswith("canon/relations/") else None)
                if (kind and isinstance(data, dict) and isinstance(data.get("id"), str)
                        and data["id"].strip() and isinstance(data.get("notation"), str)
                        and data["notation"].strip()):
                    self.files["read"].append(rel)
                    self.records.append({"path": rel, "kind": kind, "data": data})
                else:
                    self.files["unread_marker" if marker else "foreign"].append(rel)
        for paths in self.files.values():
            paths.sort()
        grouped = defaultdict(list)
        for record in self.records:
            grouped[record["data"]["id"]].append(record)
        duplicates = {key: [r["path"] for r in rows] for key, rows in grouped.items() if len(rows) > 1}
        unique = [rows[0] for rows in grouped.values() if len(rows) == 1]
        inventory = result("supported", "parsed canonical IDs (elements and relations), all lifecycle states",
                           len(grouped), len(self.records), duplicates=duplicates,
                           files=self.files, discovered=sum(map(len, self.files.values())),
                           collection_failures=self.failures, skipped_trees=self.skipped,
                           notation_distribution=dict(sorted(Counter(r["data"]["notation"] for r in self.records).items())))
        if not self.records:
            inventory["status"] = "not_applicable"
        if duplicates or self.failures or self.files["unread_marker"]:
            inventory["status"] = "partial"
        validity, connectedness, validator = self.validate(unique, duplicates)
        revision = git_read(self.root, "rev-parse", "HEAD")
        dirty = git_read(self.root, "status", "--porcelain", "--untracked-files=normal")
        self.report_data = {
            "context": {"rules": RULES, "collector_sha256": digest(Path(__file__).read_bytes()),
                        "python_version": sys.version.split()[0], "pyyaml_version": yaml.__version__,
                        "effective_date": self.effective_date.isoformat(),
                        "observed_at": datetime.now(timezone.utc).isoformat(),
                        "revision": revision, "working_tree_dirty": None if dirty is None else bool(dirty),
                        "scope": "single catalogue; canon/elements and canon/relations; all lifecycle states",
                        "scope_file": self.scope.relative_to(self.root).as_posix() if self.scope else None,
                        "exclusion_patterns": [p.pattern for p in exclusions],
                        "input_sha256": dict(sorted(self.hashes.items())), "validator": validator},
            "indicators": {
                "denominator": inventory,
                "validity": validity,
                "coverage": result("unavailable", "adopter-declared subjects and required relations",
                                   reason="No business-scope collector; notation distribution is inventory only"),
                "freshness": self.freshness(unique, duplicates, manifest),
                "assertion_queue": result("unavailable", "assertions with real opening/review/outcome timestamps",
                                          reason="No workflow collector or review targets supplied; no invented SLA"),
                "connectedness": connectedness,
            },
        }
        return self.report_data

    def validate(self, records, duplicates):
        # Reuse shipped rules over the explicit parsed cohort; do not run adopter code.
        validator_path = Path(__file__).resolve().parents[3] / "tools" / "lint.py"
        pop = "one batch of unique parsed canonical elements and relations"
        unavailable = lambda why: result("unavailable", pop, reason=why)
        if duplicates:
            return unavailable("duplicate IDs make the batch ambiguous"), unavailable("duplicate IDs make resolution ambiguous"), None
        if not validator_path.is_file():
            return unavailable("shipped tools/lint.py is absent"), unavailable("shipped tools/lint.py is absent"), None
        spec = importlib.util.spec_from_file_location("health_profile_lint", validator_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        engine = module.TransitrixLinter(str(self.root))
        engine.elements = {r["data"]["id"]: r["data"] for r in records if r["kind"] == "element"}
        engine.relations = {r["data"]["id"]: r["data"] for r in records if r["kind"] == "relation"}
        binding = {"version": module.__version__, "sha256": digest(validator_path.read_bytes()),
                   "checks": ["_check_atomicity", "_check_referential_integrity"]}
        def run_check(method, applicable, limit):
            engine.errors = []
            if not applicable:
                return result("not_applicable", pop, None, 0, limit=limit)
            method()
            errors = [{"path": e.file, "message": e.message} for e in engine.errors]
            return result("findings" if errors else "supported", pop, int(not errors), 1,
                          unit="batch without findings / checked batch (not record pass rate)",
                          findings=errors, limit=limit,
                          unchecked_files=self.files["unread_marker"],
                          excluded_files=self.files["out_of_scope"])
        validity = run_check(engine._check_atomicity, bool(engine.elements),
                             "Parsed YAML plus existing atomicity only; no schema/admission/full-validator pass claimed")
        ref_inputs = bool(engine.relations) or any(any(d.get(k) for k in REFERENCE_FIELDS) for d in engine.elements.values())
        connectedness = run_check(engine._check_referential_integrity, ref_inputs,
                                  "Existing from/to and parent/goals/delivers_changes/predecessors/owner_role checks only; "
                                  "no reachability, relation-opportunity ratio or requirement-verification coverage")
        # Existing linter skips non-list/non-string inline values; surface that blind spot.
        connectedness["unsupported_inline_shapes"] = [
            {"id": key, "field": field} for key, data in engine.elements.items()
            for field in REFERENCE_FIELDS if field in data and not isinstance(data[field], (str, list))]
        if connectedness["unsupported_inline_shapes"] and connectedness["status"] in ("supported", "not_applicable"):
            connectedness.update(status="partial", numerator=None)
        return validity, connectedness, binding

    def freshness(self, records, duplicates, manifest):
        policy = manifest.get("confidence_decay")
        rows = []
        excluded = []
        for record in records:
            data = record["data"]
            if record["kind"] != "element" or data.get("admission_state", "active") != "active":
                excluded.append({"id": data["id"], "reason": "not an admitted canonical element"})
                continue
            row = {"id": data["id"], "path": record["path"], "anchor": data.get("admitted_at"), "status": "unknown"}
            try:
                checks = data.get("gate_checks")
                if (data.get("zone") != "canon" or not isinstance(data.get("admitted_by"), str)
                        or not data["admitted_by"].strip() or not isinstance(checks, dict)
                        or not {"uniqueness", "consistency", "completeness"}.issubset(checks)
                        or any(v != "pass" for v in checks.values())):
                    raise ValueError("missing or incomplete admission evidence")
                anchor = iso_date(data.get("admitted_at"))
                age = (self.effective_date - anchor).days
                if age < 0:
                    raise ValueError("admission postdates effective date")
                if not isinstance(policy, dict):
                    raise ValueError("no explicit confidence_decay policy")
                defaults = policy.get("defaults", {})
                types = policy.get("by_type", {})
                override = types.get(data["notation"].upper(), {}) if isinstance(types, dict) else None
                if not isinstance(defaults, dict) or not isinstance(override, dict):
                    raise ValueError("invalid confidence_decay policy")
                rules = {**defaults, **override}
                fresh, stale, floor = (rules.get(k) for k in ("fresh_days", "stale_days", "floor"))
                if not all(type(v) in (int, float) and math.isfinite(v) for v in (fresh, stale, floor)):
                    raise ValueError("incomplete or nonnumeric confidence_decay policy")
                if not (0 <= fresh < stale and 0 <= floor <= 1):
                    raise ValueError("invalid confidence_decay bounds")
                value = 1.0 if age <= fresh else floor if age >= stale else 1 - (1 - floor) * (age - fresh) / (stale - fresh)
                row.update(status="fresh" if age <= fresh else "stale" if age >= stale else "aging",
                           age_days=age, freshness=value, policy=rules)
            except ValueError as error:
                row["reason"] = str(error)
            rows.append(row)
        rows.extend({"id": key, "paths": paths, "status": "unknown",
                     "reason": "duplicate ID prevents admission evidence binding"}
                    for key, paths in duplicates.items())
        known = [r for r in rows if r["status"] != "unknown"]
        return result("not_applicable" if not rows else "unavailable" if not known else "partial" if len(known) < len(rows) else "supported",
                      "unique parsed admitted canonical elements, all lifecycle states",
                      sum(r["status"] == "fresh" for r in known) if known else None, len(known),
                      unit="within declared fresh_days / elements with qualified date and explicit policy",
                      unknown=len(rows) - len(known), exclusions=excluded, evidence=rows,
                      limit="Admission metadata is recorded evidence, not independent proof the review occurred; "
                            "duplicate IDs stay unknown; knowledge objects and workflow reviews unsupported")

    def report(self):
        return "# Transitrix Adoption Health Profile\n\nInformational snapshot; no adoption score or build gate. " \
               "Unavailable and unknown are not success. Read means parsed, never validated.\n\n" + \
               "```json\n" + json.dumps(self.report_data, indent=2, default=str, ensure_ascii=False) + "\n```\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--out")
    parser.add_argument("--scope", help="select an existing SCOPE.yaml within the catalogue")
    parser.add_argument("--effective-date", help="YYYY-MM-DD; defaults to today's date")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()
    try:
        scanner = HealthProfileScanner(args.repo, args.effective_date, args.scope)
        data = scanner.scan()
        report = json.dumps(data, indent=2, default=str, ensure_ascii=False) + "\n" if args.format == "json" else scanner.report()
        if args.out:
            Path(args.out).write_text(report, encoding="utf-8")
        else:
            print(report, end="")
        return 0  # Health findings do not gate builds; invocation/collection errors do.
    except (OSError, ValueError, yaml.YAMLError, re.error) as error:
        print(f"Cannot collect health profile: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
