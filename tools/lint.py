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



# Additive core contracts. Kept in this single-file linter so existing onboarding
# installations can still vendor tools/lint.py without a new runtime dependency.
# The published JSON Schema is checked against this value by regression tests.
CAPABILITY_MAP_CONTRACT = {'$schema': 'http://json-schema.org/draft-07/schema#',
 'title': 'Capability-map core additive field contracts',
 '$comment': 'Additive field contracts, not a complete model schema. Select a $defs entry. '
             'Referential integrity, local-key uniqueness and lifetime checks require '
             'tools/lint.py. Other fields retain their existing specifications.',
 '$defs': {'capabilityFields': {'type': 'object',
                                'properties': {'management_cycle_stage': {'enum': [None,
                                                                                   'Strategic',
                                                                                   'Learning',
                                                                                   'Planning',
                                                                                   'Execution',
                                                                                   'Assurance']},
                                               'tags': {'type': 'array',
                                                        'items': {'type': 'string',
                                                                  'minLength': 1,
                                                                  'pattern': '\\S'}}},
                                'additionalProperties': True},
           'applicationFields': {'type': 'object',
                                 'properties': {'technical_capabilities': {'type': 'array',
                                                                           'items': {'type': 'object',
                                                                                     'properties': {'key': {'type': 'string',
                                                                                                            'minLength': 1,
                                                                                                            'pattern': '\\S'},
                                                                                                    'name': {'type': 'string',
                                                                                                             'minLength': 1,
                                                                                                             'pattern': '\\S'},
                                                                                                    'capabilities': {'type': 'array',
                                                                                                                     'items': {'type': 'string',
                                                                                                                               'minLength': 1,
                                                                                                                               'pattern': '\\S'},
                                                                                                                     'uniqueItems': True},
                                                                                                    'valid_from': {'type': ['string',
                                                                                                                            'null'],
                                                                                                                   'format': 'date'},
                                                                                                    'valid_to': {'type': ['string',
                                                                                                                          'null'],
                                                                                                                 'format': 'date'}},
                                                                                     'additionalProperties': False,
                                                                                     'required': ['key',
                                                                                                  'name']}}},
                                 'additionalProperties': True},
           'viewConfig': {'type': 'object',
                          'properties': {'valid_at': {'type': ['string', 'null'],
                                                      'format': 'date',
                                                      'default': None},
                                         'scenario': {'type': ['string', 'null'],
                                                      'minLength': 1,
                                                      'default': None},
                                         'management_cycle': {'type': 'object',
                                                              'properties': {'group': {'type': 'boolean',
                                                                                       'default': False},
                                                                             'order': {'const': ['Strategic',
                                                                                                 'Learning',
                                                                                                 'Planning',
                                                                                                 'Execution',
                                                                                                 'Assurance'],
                                                                                       'default': ['Strategic',
                                                                                                   'Learning',
                                                                                                   'Planning',
                                                                                                   'Execution',
                                                                                                   'Assurance']}},
                                                              'additionalProperties': False},
                                         'tags': {'type': 'object',
                                                  'properties': {'filter': {'type': 'array',
                                                                            'items': {'type': 'string',
                                                                                      'minLength': 1,
                                                                                      'pattern': '\\S'},
                                                                            'uniqueItems': True,
                                                                            'default': []},
                                                                 'show': {'type': 'boolean',
                                                                          'default': True}},
                                                  'additionalProperties': False},
                                         'display': {'type': 'object',
                                                     'properties': {'depth': {'type': 'integer',
                                                                              'enum': [1, 2, 3],
                                                                              'default': 3},
                                                                    'backlog': {'type': 'boolean',
                                                                                'default': False},
                                                                    'maturity': {'type': 'boolean',
                                                                                 'default': False},
                                                                    'legend': {'type': 'boolean',
                                                                               'default': True}},
                                                     'additionalProperties': False},
                                         'systems': {'type': 'object',
                                                     'properties': {'highlight': {'type': ['string',
                                                                                           'null'],
                                                                                  'minLength': 1,
                                                                                  'default': None},
                                                                    'selected': {'type': 'array',
                                                                                 'items': {'type': 'string',
                                                                                           'minLength': 1,
                                                                                           'pattern': '\\S'},
                                                                                 'uniqueItems': True,
                                                                                 'default': []},
                                                                    'shape': {'enum': ['angled',
                                                                                       'rectangular'],
                                                                              'default': 'angled'},
                                                                    'labels': {'type': 'boolean',
                                                                               'default': False},
                                                                    'coverage': {'type': 'boolean',
                                                                                 'default': False},
                                                                    'rounded': {'type': 'boolean',
                                                                                'default': False},
                                                                    'overlap': {'type': 'boolean',
                                                                                'default': False}},
                                                     'additionalProperties': False}},
                          'additionalProperties': False}}}


def _contract_errors(value, schema, path=""):
    """Evaluate the bounded keywords used by CAPABILITY_MAP_CONTRACT.

    This is not a general JSON Schema engine. The published schema also works
    with ordinary draft-07 validators; semantic references are checked below.
    """
    from datetime import date
    import re
    errors = []
    types = {"object": dict, "array": list, "string": str,
             "boolean": bool, "integer": int, "null": type(None)}
    expected = schema.get("type")
    if expected:
        expected = [expected] if isinstance(expected, str) else expected
        if not any(type(value) is types[t] for t in expected):
            return [f"{path}: expected {' or '.join(expected)}"]
    if "enum" in schema and not any(type(value) is type(v) and value == v for v in schema['enum']):
        errors.append(f"{path}: unsupported value {value!r}")
    if 'const' in schema and value != schema['const']:
        errors.append(f"{path}: must equal {schema['const']!r}")
    if isinstance(value, str):
        if len(value) < schema.get('minLength', 0) or ('pattern' in schema and not re.search(schema['pattern'], value)):
            errors.append(f"{path}: expected a nonempty string")
        if schema.get('format') == 'date':
            try:
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                    raise ValueError()
                date.fromisoformat(value)
            except ValueError:
                errors.append(f"{path}: expected a quoted YYYY-MM-DD calendar date")
    if isinstance(value, dict):
        props = schema.get('properties', {})
        for key in schema.get('required', []):
            if key not in value:
                errors.append(f"{path}.{key}: required")
        for key, item in value.items():
            if key in props:
                errors.extend(_contract_errors(item, props[key], f"{path}.{key}"))
            elif schema.get('additionalProperties') is False:
                errors.append(f"{path}.{key}: unknown field")
    if isinstance(value, list):
        if schema.get('uniqueItems') and any(item in value[:i] for i, item in enumerate(value)):
            errors.append(f"{path}: duplicate values")
        if 'items' in schema:
            for i, item in enumerate(value):
                errors.extend(_contract_errors(item, schema['items'], f"{path}[{i}]"))
    return errors


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

        # Optional capability-map contracts and view selections.
        self._check_capability_contracts()

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

    def _check_capability_contracts(self):
        """Check native additive fields and capability-map view settings."""
        definitions = CAPABILITY_MAP_CONTRACT['$defs']

        def report(file, messages):
            for message in messages:
                self.errors.append(LintError(str(file), 0, "Capability contract: " + message, "error"))

        def resolve(ref, prefix, path):
            if not isinstance(ref, str):
                return []  # structural diagnostic already emitted
            if not ref.startswith(prefix + '-') or ref not in self.elements:
                return [f"{path}: unresolved or wrong-type {prefix} reference {ref!r}"]
            return []

        def application(data, path):
            errors = _contract_errors(data, definitions['applicationFields'], path)
            inventory = data.get('technical_capabilities', [])
            if not isinstance(inventory, list):
                return errors
            keys = []
            for i, ability in enumerate(inventory):
                where = f"{path}.technical_capabilities[{i}]"
                if not isinstance(ability, dict):
                    continue
                key = ability.get('key')
                if isinstance(key, str):
                    if key in keys:
                        errors.append(f"{where}.key: duplicate application-local key {key!r}")
                    keys.append(key)
                targets = ability.get('capabilities', [])
                if isinstance(targets, list):
                    for ref in targets:
                        errors.extend(resolve(ref, 'CAPABILITY', where + '.capabilities'))
                start, end = ability.get('valid_from'), ability.get('valid_to')
                # Structural errors above exclude malformed endpoints from comparisons.
                bounds = {'type': ['string', 'null'], 'format': 'date'}
                if not _contract_errors(start, bounds) and not _contract_errors(end, bounds):
                    if start and end and start > end:
                        errors.append(f"{where}: valid_to precedes valid_from")
                    for field, bound, before in [('valid_from', start, True), ('valid_to', end, False)]:
                        owner = data.get(field)
                        if isinstance(owner, str) and bound is not None and (bound < owner if before else bound > owner):
                            errors.append(f"{where}.{field}: lifetime must be contained in APPLICATION lifetime")
            return errors

        for element_id, data in self.elements.items():
            path = f"canon/elements/*/{element_id}.yaml"
            if element_id.startswith('CAPABILITY-'):
                report(path, _contract_errors(data, definitions['capabilityFields'], element_id))
            elif element_id.startswith('APPLICATION-'):
                report(path, application(data, element_id))

        def capability_tree(nodes, file):
            if not isinstance(nodes, list):
                return
            for data in nodes:
                if isinstance(data, dict):
                    report(file, _contract_errors(data, definitions['capabilityFields'], str(data.get('id', 'capability'))))
                    capability_tree(data.get('children', []), file)

        for file in sorted((self.repo_root / 'views').rglob('*.transitrix.yaml')):
            try:
                data = yaml.safe_load(file.read_text(encoding='utf-8'))
            except (OSError, yaml.YAMLError) as error:
                report(file, [f"cannot read YAML: {error}"])
                continue
            if not isinstance(data, dict):
                continue
            if data.get('notation') == 'capability-map':
                body = data.get('capability_map', {})
                if isinstance(body, dict):
                    capability_tree(body.get('capabilities', []), file)
                if 'view_config' not in data:
                    continue
                config = data['view_config']
                report(file, _contract_errors(config, definitions['viewConfig'], 'view_config'))
                if not isinstance(config, dict):
                    continue
                report(file, resolve(config.get('scenario'), 'TARGET_STATE', 'view_config.scenario'))
                systems = config.get('systems', {})
                if isinstance(systems, dict):
                    report(file, resolve(systems.get('highlight'), 'APPLICATION', 'view_config.systems.highlight'))
                    selected = systems.get('selected', [])
                    if isinstance(selected, list):
                        for ref in selected:
                            report(file, resolve(ref, 'APPLICATION', 'view_config.systems.selected'))
            elif data.get('notation') == 'applications':
                body = data.get('applications_catalogue', {})
                if isinstance(body, dict) and isinstance(body.get('applications', []), list):
                    for app in body.get('applications', []):
                        if isinstance(app, dict):
                            report(file, application(app, str(app.get('app_id', 'application'))))

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
