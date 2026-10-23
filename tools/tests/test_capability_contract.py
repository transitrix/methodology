"""Native core contracts: compatibility, schema parity and refusal cases.

Run: python -m unittest discover -s tools/tests -p test_capability_contract.py
"""
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('model_lint', ROOT / 'tools/lint.py')
lint = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lint
spec.loader.exec_module(lint)
FIXTURE = ROOT / 'tests/fixtures/capability-management-cycle'


class CapabilityContractTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        shutil.copytree(FIXTURE, self.root, dirs_exist_ok=True)

    def check(self, valid):
        model = lint.TransitrixLinter(str(self.root))
        with contextlib.redirect_stdout(io.StringIO()):
            try:
                result = model.run()
            except SystemExit as error:
                result = error.code == 0
        self.assertEqual(result, valid, '\n'.join(e.message for e in model.errors))
        return '\n'.join(e.message for e in model.errors)

    def mutate(self, pattern, operation):
        path = next(self.root.rglob(pattern))
        data = yaml.safe_load(path.read_text())
        operation(data)
        path.write_text(yaml.safe_dump(data, sort_keys=False))

    def test_complete_model(self):
        self.check(True)

    def test_legacy_omission_and_existing_fixtures(self):
        for file in self.root.rglob('*.yaml'):
            data = yaml.safe_load(file.read_text())
            def strip(node):
                if isinstance(node, dict):
                    for key in ('management_cycle_stage', 'technical_capabilities', 'view_config'):
                        node.pop(key, None)
                    for value in node.values():
                        strip(value)
                elif isinstance(node, list):
                    for value in node:
                        strip(value)
            strip(data)
            file.write_text(yaml.safe_dump(data))
        self.check(True)
        # New checks alone must not reject any existing published example.
        model = lint.TransitrixLinter(str(ROOT))
        model._check_capability_contracts()
        self.assertEqual(model.errors, [])
        for fixture in (ROOT / 'tests/fixtures').iterdir():
            if not fixture.is_dir() or fixture == FIXTURE:
                continue
            existing = lint.TransitrixLinter(str(fixture))
            existing._load_elements()
            existing._check_capability_contracts()
            self.assertEqual(existing.errors, [], str(fixture))
        for file in (ROOT / 'notations/examples').rglob('*.transitrix.yaml'):
            if file.name.startswith('management-cycle.'):
                continue
            data = yaml.safe_load(file.read_text())
            if isinstance(data, dict) and data.get('notation') == 'capability-map':
                def verify(nodes):
                    for node in nodes:
                        self.assertEqual(lint._contract_errors(node, lint.CAPABILITY_MAP_CONTRACT['$defs']['capabilityFields']), [])
                        verify(node.get('children', []))
                verify(data.get('capability_map', {}).get('capabilities', []))

    def test_stage_values_and_no_inference(self):
        for stage in [None, 'Strategic', 'Learning', 'Planning', 'Execution', 'Assurance']:
            self.mutate('CAPABILITY-V1.yaml', lambda d: d.update(management_cycle_stage=stage, tags=['MDM', 'other-subject']))
            self.check(True)
        for stage in ['Support', 'MDM', 'ESG', 'Plan', '', [], 1]:
            with self.subTest(stage=stage):
                self.mutate('CAPABILITY-V1.yaml', lambda d: d.update(management_cycle_stage=stage))
                self.assertIn('management_cycle_stage', self.check(False))

    def test_inventory_refusals(self):
        original = yaml.safe_load(next(self.root.rglob('APPLICATION-OMS-1.yaml')).read_text())
        cases = [
            lambda d: d.update(technical_capabilities={}),
            lambda d: d['technical_capabilities'].append(copy.deepcopy(d['technical_capabilities'][0])),
            lambda d: d['technical_capabilities'][0].pop('name'),
            lambda d: d['technical_capabilities'][0].update(key='  '),
            lambda d: d['technical_capabilities'][0].update(capabilities=['CAPABILITY-V99']),
            lambda d: d['technical_capabilities'][0].update(capabilities=['APPLICATION-OMS-1']),
            lambda d: d['technical_capabilities'][0].update(capabilities=['CAPABILITY-H1'] * 2),
            lambda d: d['technical_capabilities'][0].update(capabilities=[{}]),
            lambda d: d['technical_capabilities'][0].update(valid_from='2026-02-30'),
            lambda d: d['technical_capabilities'][0].update(valid_from='2026-2-01'),
            lambda d: d['technical_capabilities'][0].update(valid_from='2027-01-01', valid_to='2026-01-01'),
            lambda d: d['technical_capabilities'][0].update(valid_from='2025-01-01'),
            lambda d: d['technical_capabilities'][0].update(unknown=True),
        ]
        for index, change in enumerate(cases):
            with self.subTest(case=index):
                data = copy.deepcopy(original)
                change(data)
                next(self.root.rglob('APPLICATION-OMS-1.yaml')).write_text(yaml.safe_dump(data))
                self.assertIn('technical_capabilities', self.check(False))

    def test_local_identity_and_open_lifetimes(self):
        # Two applications may share a local key. Open ends are allowed for a live owner.
        self.mutate('APPLICATION-OMS-1.yaml', lambda d: (d['technical_capabilities'][0].pop('valid_to'), d['technical_capabilities'][0].pop('valid_from')))
        self.check(True)

    def test_lifetime_end_and_inventory_shape(self):
        self.mutate('APPLICATION-OMS-1.yaml', lambda d: d.update(valid_to='2028-01-01'))
        self.mutate('APPLICATION-OMS-1.yaml', lambda d: d['technical_capabilities'][0].update(valid_to='2029-01-01'))
        self.assertIn('lifetime must be contained', self.check(False))
        self.mutate('APPLICATION-OMS-1.yaml', lambda d: d['technical_capabilities'][0].update(valid_to='2028-01-01'))
        self.check(True)
        self.mutate('APPLICATION-OMS-1.yaml', lambda d: d.update(technical_capabilities=[None]))
        self.assertIn('expected object', self.check(False))

    def test_canonical_tag_type(self):
        self.mutate('CAPABILITY-H1.yaml', lambda d: d.update(tags='Support'))
        self.assertIn('tags', self.check(False))

    def test_settings_refusals(self):
        original = yaml.safe_load(next(self.root.rglob('cycle.capability-map.transitrix.yaml')).read_text())
        cases = [
            {'unknown': True}, {'display': {'unknown': True}}, {'display': {'depth': True}}, {'display': {'depth': 4}},
            {'systems': {'coverage': 'true'}}, {'systems': {'shape': 'convex'}},
            {'systems': {'selected': ['CAPABILITY-V1']}},
            {'systems': {'selected': ['APPLICATION-MISSING-1']}},
            {'systems': {'selected': ['APPLICATION-OMS-1'] * 2}},
            {'systems': {'highlight': 'APPLICATION-MISSING-1'}},
            {'scenario': 'CAPABILITY-V1'}, {'valid_at': '2026-02-30'},
            {'tags': {'filter': 'MDM'}},
            {'management_cycle': {'order': ['Execution', 'Planning']}},
        ]
        for config in cases:
            with self.subTest(config=config):
                data = copy.deepcopy(original)
                data['view_config'] = config
                next(self.root.rglob('cycle.capability-map.transitrix.yaml')).write_text(yaml.safe_dump(data))
                self.assertIn('view_config', self.check(False))

    def test_partial_settings_dates_and_inactive_options(self):
        for config in [{}, {'valid_at': '2000-01-01'}, {'valid_at': '2050-01-01'},
                       {'systems': {'coverage': False, 'selected': [], 'overlap': True}},
                       {'systems': {'highlight': 'APPLICATION-OMS-1'}},
                       {'tags': {'filter': ['ESG', 'custom-tag']}}]:
            self.mutate('cycle.capability-map.transitrix.yaml', lambda d: d.update(view_config=config))
            self.check(True)

    def test_schema_and_vocabulary_parity(self):
        schema = json.loads((ROOT / 'notations/schemas/capability-map-contract.schema.json').read_text())
        self.assertEqual(schema, lint.CAPABILITY_MAP_CONTRACT)
        vocabulary = yaml.safe_load((ROOT / 'notations/vocabulary.yaml').read_text())
        enum = schema['$defs']['capabilityFields']['properties']['management_cycle_stage']['enum'][1:]
        self.assertEqual(enum, vocabulary['value_vocabularies']['CAPABILITY.management_cycle_stage']['values'])
        self.assertEqual(enum, schema['$defs']['viewConfig']['properties']['management_cycle']['properties']['order']['const'])
        example = yaml.safe_load((ROOT / 'notations/examples/capability-map/management-cycle.capability-map.transitrix.yaml').read_text())
        fixture = yaml.safe_load((FIXTURE / 'views/cycle.capability-map.transitrix.yaml').read_text())
        self.assertEqual(example, fixture)


if __name__ == '__main__':
    unittest.main()
