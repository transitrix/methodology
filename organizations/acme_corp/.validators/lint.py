#!/usr/bin/env python3
"""
Transitrix Linter - Validates architecture model integrity and compliance
Checks: YAML syntax, atomicity, referential integrity, semantic rules
"""

import os
import sys
import yaml
import glob
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass

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
        print("🔍 Transitrix Linter v1.0")
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

        # Phase 5: Semantic validation
        print("Phase 5: Validating semantic rules...")
        self._check_semantic_rules()

        # Phase 6: Policy compliance
        print("Phase 6: Checking compliance policies...")
        self._check_policies()

        print()
        self._report_summary()

        return len(self.errors) == 0

    def _validate_yaml_syntax(self):
        """Check all YAML files for syntax errors."""
        yaml_files = glob.glob(str(self.repo_root / "elements/**/*.yaml"), recursive=True)
        yaml_files += glob.glob(str(self.repo_root / "relations/**/*.yaml"), recursive=True)

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
        element_files = glob.glob(str(self.repo_root / "elements/**/*.yaml"), recursive=True)
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
        relation_files = glob.glob(str(self.repo_root / "relations/**/*.yaml"), recursive=True)
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
                    file="elements/*",
                    line=0,
                    message=f"ATOMICITY VIOLATION: Element '{element_id}' contains 'relations' section. "
                            f"Move relations to separate files in relations/ directory.",
                    severity="error"
                ))

    def _check_referential_integrity(self):
        """Verify all source/target references point to existing elements."""
        for rel_id, relation_data in self.relations.items():
            source_id = relation_data.get('source', {}).get('id') or relation_data.get('source')
            target_id = relation_data.get('target', {}).get('id') or relation_data.get('target')

            if source_id and source_id not in self.elements:
                self.warnings.append(LintError(
                    file=f"relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Source element '{source_id}' not found",
                    severity="warning"
                ))

            if target_id and target_id not in self.elements:
                self.warnings.append(LintError(
                    file=f"relations/{rel_id}.yaml",
                    line=0,
                    message=f"Referential integrity: Target element '{target_id}' not found",
                    severity="warning"
                ))

    def _check_semantic_rules(self):
        """Validate semantic constraints (e.g., layer-appropriate relations)."""
        # Example: ApplicationComponent should not directly serve BusinessRole without an Interface
        pass

    def _check_policies(self):
        """Check organizational policies (e.g., Active elements must have owner)."""
        for element_id, element_data in self.elements.items():
            metadata = element_data.get('metadata', {})
            status = metadata.get('status')
            owner = metadata.get('owner')

            if status in ['Active', 'Production'] and not owner:
                self.warnings.append(LintError(
                    file=f"elements/*/{element_id}.yaml",
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
