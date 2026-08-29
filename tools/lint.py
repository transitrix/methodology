#!/usr/bin/env python3
"""
Transitrix Linter - Validates architecture model integrity and compliance
Checks: YAML syntax, atomicity, referential integrity, semantic rules
"""

import os
import sys
import yaml
import glob
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

__version__ = "4.2.0"

def _get_version() -> str:
    """Get linter version, attempting to read from git tag if in a repo."""
    try:
        repo_root = os.getenv("REPO_ROOT", ".")
        result = subprocess.run(
            ["git", "-C", repo_root, "describe", "--tags", "--abbrev=0"],
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0:
            tag = result.stdout.strip()
            # Strip 'v' prefix if present (e.g. v4.2.0 -> 4.2.0)
            return tag.lstrip('v')
    except (subprocess.TimeoutExpired, Exception):
        pass
    return __version__

def _ensure_utf8_stdio() -> None:
    # A legacy Windows console code page (e.g. cp1252) can't encode the status
    # glyphs printed below, crashing the linter mid-report with a
    # UnicodeEncodeError regardless of whether the repo itself is clean.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


_ensure_utf8_stdio()


@dataclass
class LintError:
    file: str
    line: int
    message: str
    severity: str  # "error", "warning"

class TransitrixLinter:
    def __init__(self, repo_root: str = "."):
        self.repo_root = Path(repo_root)
        self.errors: List[LintError] = []
        self.warnings: List[LintError] = []
        self.elements: Dict[str, Dict] = {}
        self.relations: Dict[str, Dict] = {}

    def run(self) -> bool:
        """Run all validation checks. Returns True if no errors found."""
        version = _get_version()
        print(f"🔍 Transitrix Linter v{version}")
        print(f"📂 Scanning: {self.repo_root}")
        print()

        # Phase 1: Load and validate YAML syntax
        print("Phase 1: Validating YAML syntax...")
        self._validate_yaml_syntax()

        if self.errors:
            self._report_errors()
            return False

        print(f"  ✓ All YAML files are valid")
        print()

        # Phase 2: Load elements and relations
        print("Phase 2: Loading architecture elements...")
        self._load_elements()
        self._load_relations()
        print(f"  ✓ Loaded {len(self.elements)} elements, {len(self.relations)} relations")
        print()

        # Phase 3: Atomicity check - no relations inside elements
        print("Phase 3: Checking atomicity (no relations in element files)...")
        self._check_atomicity()

        # Phase 4: Referential integrity
        print("Phase 4: Validating referential integrity...")
        self._check_referential_integrity()

        # Phase 5: Policy compliance
        print("Phase 5: Checking compliance policies...")
        self._check_policies()

        print()
        self._report_summary()

        return len(self.errors) == 0

    def _validate_yaml_syntax(self):
        """Check all YAML files for syntax errors."""
        yaml_files = glob.glob(str(self.repo_root / "canon/elements/**/*.yaml"), recursive=True)
        yaml_files += glob.glob(str(self.repo_root / "canon/relations/**/*.yaml"), recursive=True)

        for file_path in yaml_files:
            if "/.templates/" in file_path or "/.validators/" in file_path:
                continue
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                self.errors.append(LintError(
                    file=file_path,
                    line=e.problem_mark.line if hasattr(e, 'problem_mark') else 0,
                    message=f"YAML syntax error: {e.problem}",
                    severity="error"
                ))
            except Exception as e:
                self.errors.append(LintError(
                    file=file_path,
                    line=0,
                    message=f"Error reading file: {str(e)}",
                    severity="error"
                ))

    def _load_elements(self):
        """Load all element files."""
        element_files = glob.glob(str(self.repo_root / "canon/elements/**/*.yaml"), recursive=True)
        element_files = [f for f in element_files if "/.templates/" not in f]

        for file_path in element_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    if data and 'id' in data:
                        self.elements[data['id']] = data
            except Exception:
                pass

    def _load_relations(self):
        """Load all relation files."""
        relation_files = glob.glob(str(self.repo_root / "canon/relations/**/*.yaml"), recursive=True)
        relation_files = [f for f in relation_files if "/.templates/" not in f]

        for file_path in relation_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    if data and 'id' in data:
                        self.relations[data['id']] = data
            except Exception:
                pass

    def _check_atomicity(self):
        """Ensure relations are not defined inside element files."""
        for element_id, element_data in self.elements.items():
            if 'relations' in element_data:
                self.errors.append(LintError(
                    file="canon/elements/*",
                    line=0,
                    message=f"ATOMICITY VIOLATION: Element '{element_id}' contains 'relations' section. "
                            f"Move relations to separate files in canon/relations/ directory.",
                    severity="error"
                ))

    def _check_referential_integrity(self):
        """Verify element and relation references point to existing elements."""
        # Check relation from/to references
        for rel_id, relation_data in self.relations.items():
            from_id = relation_data.get('from')
            to_id = relation_data.get('to')

            if from_id is None:
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Relation missing required 'from' field",
                    severity="error"
                ))
            elif not isinstance(from_id, str):
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: 'from' field must be a string ID, not {type(from_id).__name__}",
                    severity="error"
                ))
            elif from_id not in self.elements:
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Source element '{from_id}' not found",
                    severity="error"
                ))

            if to_id is None:
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Relation missing required 'to' field",
                    severity="error"
                ))
            elif not isinstance(to_id, str):
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: 'to' field must be a string ID, not {type(to_id).__name__}",
                    severity="error"
                ))
            elif to_id not in self.elements:
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Target element '{to_id}' not found",
                    severity="error"
                ))

            if 'source' in relation_data or 'target' in relation_data:
                self.errors.append(LintError(
                    file=f"canon/relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Relation uses deprecated 'source'/'target' fields (use 'from' and 'to')",
                    severity="error"
                ))

        # Check inline element field references
        inline_ref_fields = ['parent', 'goals', 'delivers_changes', 'predecessors', 'owner_role']
        for element_id, element_data in self.elements.items():
            for field in inline_ref_fields:
                if field not in element_data:
                    continue

                ref_value = element_data[field]
                # Handle both single ID strings and lists of IDs
                ref_ids = [ref_value] if isinstance(ref_value, str) else (ref_value if isinstance(ref_value, list) else [])

                for ref_id in ref_ids:
                    if not isinstance(ref_id, str):
                        self.errors.append(LintError(
                            file=f"canon/elements/*/{element_id}.yaml",
                            line=0,
                            message=f"Referential integrity: Element '{element_id}' field '{field}' contains non-string ID: {type(ref_id).__name__}",
                            severity="error"
                        ))
                    elif ref_id not in self.elements:
                        self.errors.append(LintError(
                            file=f"canon/elements/*/{element_id}.yaml",
                            line=0,
                            message=f"Referential integrity: Element '{element_id}' field '{field}' references non-existent element '{ref_id}'",
                            severity="error"
                        ))

    def _check_policies(self):
        """Check organizational policies (e.g., Active elements must have owner)."""
        for element_id, element_data in self.elements.items():
            metadata = element_data.get('metadata', {})
            status = metadata.get('status')
            owner = metadata.get('owner')

            if status in ['Active', 'Production'] and not owner:
                self.warnings.append(LintError(
                    file=f"canon/elements/*/{element_id}.yaml",
                    line=0,
                    message=f"POLICY: Element '{element_id}' has status '{status}' but no owner assigned",
                    severity="warning"
                ))

    def _report_errors(self):
        """Print error report."""
        if self.errors:
            print("\n❌ ERRORS FOUND:\n")
            for error in self.errors:
                print(f"  {error.file}:{error.line}")
                print(f"  → {error.message}\n")

    def _report_warnings(self):
        """Print warning report."""
        if self.warnings:
            print("\n⚠️  WARNINGS:\n")
            for warning in self.warnings:
                print(f"  {warning.file}:{warning.line}")
                print(f"  → {warning.message}\n")

    def _report_summary(self):
        """Print summary statistics."""
        print(f"📊 Results:")
        print(f"  Errors:   {len(self.errors)}")
        print(f"  Warnings: {len(self.warnings)}")

        if self.errors:
            self._report_errors()
            print("\n❌ Validation FAILED")
            sys.exit(1)
        elif self.warnings:
            print("\n⚠️  Validation passed with warnings")
            self._report_warnings()
            sys.exit(0)
        else:
            print("\n✅ Validation PASSED - Architecture model is consistent")
            sys.exit(0)

if __name__ == "__main__":
    repo_root = os.getenv("REPO_ROOT", ".")
    linter = TransitrixLinter(repo_root)
    success = linter.run()
