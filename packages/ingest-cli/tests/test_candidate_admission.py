"""Regression contract for CLI consumers: extraction -> review -> manual promotion.

Run with Python and PyYAML; invokes the real ingest and decisions CLIs. All data is
synthetic. Manual promotion below is a fixture step, not a production endpoint.
"""

import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import yaml

REPO = Path(__file__).resolve().parents[3]
INGEST = REPO / 'packages/ingest-cli/ingest.mjs'
DECISIONS = REPO / 'packages/decisions-cli/decisions.mjs'


class CandidateAdmissionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='candidate-admission-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.processing = self.root / '_intake/processing'
        self.processing.mkdir(parents=True)
        self.candidates = self.processing / 'candidates'
        version = yaml.safe_load((REPO / 'notations/CURRENT_VERSION.yaml').read_text())
        self.write(self.root / 'transitrix.yaml', {
            'transitrix': 1, 'methodology_version': version['methodology_version'],
            'notations': [], 'zones': ['canon', 'field'], 'coverage_profile': 'full',
        })
        self.elements = [
            dict(id='STAKEHOLDER-1', name='Service users', element_type='STAKEHOLDER',
                 notation='stakeholder', spec_version='0.1', type='external',
                 actor='ACTOR-1', concern='Reliable access', interest='high', influence='medium',
                 description='Users depend on predictable service.', aliases=['Users']),
            dict(id='ACTION-2', name='Service launch milestone', element_type='ACTION',
                 notation='action', spec_version='0.1', type='Task', parent='ACTION-1',
                 goals=['GOAL-1'], delivers_changes=['CHANGE-1'], predecessors=[],
                 start_date='2026-01-02', end_date='2026-01-02', duration=0,
                 owner='ACTOR-1', owner_role='ROLE-1', scenario='SCENARIO-1',
                 stakeholders=['STAKEHOLDER-1'], labor_cost=0, resources_cost=0,
                 effort=0, score=0, sort=0, tags=['launch'], link='https://example.com/launch'),
        ]
        for element in self.elements:
            element.update(valid_from='2026-01-01', valid_to=None, extraction_confidence='medium',
                           extraction_notes='First observation',
                           extensions={'detail': {'flags': [False, 0, None], 'label': 'source'},
                                       'empty': {}, 'list': []})
        self.gate = self.processing / 'review-queue.yaml'
        # Admitted synthetic dependencies, so promotion does not introduce
        # dangling actor, hierarchy, strategy, or ownership references.
        dependencies = [
            ('02_business/actors', 'ACTOR-1', {'type': 'business_unit'}),
            ('02_business/roles', 'ROLE-1', {}),
            ('01_motivation/goals', 'GOAL-1', {}),
            ('05_implementation/changes', 'CHANGE-1', {}),
            ('05_implementation/scenarios', 'SCENARIO-1', {}),
            ('05_implementation/actions', 'ACTION-1', {'type': 'Project'}),
        ]
        self.admitted_ids = set()
        for folder, ref, fields in dependencies:
            self.write(self.root / 'canon/elements' / folder / f'{ref}.yaml', {
                'id': ref, 'name': f'Synthetic {ref}', 'notation': ref.split('-')[0].lower(),
                'spec_version': '0.1', 'zone': 'canon', 'example': True,
                'admission_state': 'active', 'admitted_at': '2026-01-01',
                'admitted_by': 'fixture-reviewer', 'reviewer_authority': 'ai_reviewed',
                'gate_checks': dict(uniqueness='pass', consistency='pass', completeness='pass'),
                'valid_from': '2026-01-01', 'valid_to': None, **fields,
            })
            self.admitted_ids.add(ref)

    def write(self, path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding='utf-8')

    def cli(self, cli, *args, ok=True):
        result = subprocess.run(['node', str(cli), *map(str, args)], cwd=self.root,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode == 0, ok, result.stdout + result.stderr)
        return result.stdout + result.stderr

    def emit(self, elements, source=1, ok=True):
        field = self.root / f'field/interviews/INTERVIEW-{source}.yaml'
        self.write(field, {
            'id': f'INTERVIEW-{source}', 'name': f'Synthetic interview {source}',
            'type': 'INTERVIEW', 'zone': 'field', 'example': True,
            'admitted_at': '2026-01-01', 'admitted_by': 'fixture-reviewer',
            'reviewer_authority': 'ai_reviewed', 'gate_checks': {'provenance': 'pass'},
            'source_quality': 'single_source',
            'provenance': {'captured_by': 'fixture-reviewer', 'captured_on': '2026-01-01',
                           'setting': 'Synthetic preservation fixture'},
            'notes': 'Service users need reliable access; the launch includes a milestone.',
        })
        result = self.processing / 'extraction.json'
        result.write_text(json.dumps({'elements': elements}))
        return self.cli(INGEST, 'emit-candidates', field, '--from', result, ok=ok)

    def read_candidate(self, element):
        return json.loads((self.candidates / f'{element["id"]}.json').read_text())

    def decision(self, ref, authority='ai_reviewed', by='fixture-reviewer'):
        self.cli(DECISIONS, 'record', self.root, '--source-gate', self.gate,
                 '--item-ref', ref, '--decision', 'accept', '--by', by,
                 '--at', '2026-01-03', '--reviewer-authority', authority)
        # The unpromoted JSON decision remains in this audit trail, so apply
        # reports a nonzero status even when the separate YAML row transitions.
        return self.cli(DECISIONS, 'apply', self.root, '--source-gate', self.gate, ok=False)

    def test_fields_survive_review_manual_promotion_and_admission(self):
        hostile = dict(kind='relation', derived_from=['INTERVIEW-999'], admitted_to='canon',
                       admission_state='active', admitted_by='source', admitted_at='2000-01-01',
                       zone='canon', gate_checks={'completeness': 'pass'},
                       reviewer_authority='expert_confirmed', approval_status='approved',
                       provenance={'source': 'forged'}, decision='accept',
                       entity_match={'proposed_existing_id': 'ACTOR-999'},
                       agreement='agreed', agreed_by='source', source_quality='authoritative')
        self.emit([{**element, **hostile} for element in self.elements])
        for element in self.elements:
            shaped = self.read_candidate(element)
            for key, value in element.items():
                self.assertEqual(shaped.get(key), value, f'shaping lost {key}')
                self.assertIn(key, shaped)
            self.assertEqual(shaped['kind'], 'element')
            self.assertEqual(shaped['admitted_to'], 'pending')
            self.assertEqual(shaped['derived_from'], ['INTERVIEW-1'])
            for key in hostile.keys() - {'kind', 'admitted_to', 'derived_from'}:
                self.assertNotIn(key, shaped)

        repeated = copy.deepcopy(self.elements)
        for element in repeated:
            element.update(hostile)
            element.update(name='Conflicting source name', valid_to='2027-01-01',
                           extraction_confidence='high', description='Later description',
                           extraction_notes='Corroborating observation',
                           extensions={'detail': {'label': 'replacement'}, 'new_key': False})
            if element['element_type'] == 'ACTION':
                element.update(type='Project', parent='ACTION-999', duration=99, effort=99)
            else:
                element.update(actor='ACTOR-999', concern='Conflicting concern')
        self.emit(repeated, source=2)
        self.emit(repeated, source=2)
        self.assertEqual(len(list(self.candidates.glob('*.json'))), 2)
        self.cli(INGEST, 'review-queue', self.candidates, '--out', self.gate)
        queue = yaml.safe_load(self.gate.read_text())
        self.assertFalse(queue['gate']['admits_to_canon'])
        self.assertEqual(len(queue['candidates']), 2)

        # Admit the stakeholder before the action that references it (ADMIT-005).
        for row in sorted(queue['candidates'], key=lambda r: 'STAKEHOLDER' not in r['ref']):
            # The queue's reference is the serialized review payload, not a second
            # copy reconstructed from extraction input.
            serialized = json.loads(Path(row['ref']).read_text())
            original = next(e for e in self.elements if e['id'] == serialized['id'])
            for key, value in original.items():
                if key not in {'extensions', 'extraction_confidence', 'extraction_notes'}:
                    self.assertEqual(serialized[key], value)
            self.assertEqual(serialized['extensions'], {**original['extensions'], 'new_key': False})
            self.assertEqual(serialized['derived_from'], ['INTERVIEW-1', 'INTERVIEW-2'])
            self.assertEqual(serialized['extraction_confidence'], 'high')
            self.assertEqual(serialized['extraction_notes'], 'First observation | Corroborating observation')
            if serialized['element_type'] == 'ACTION':
                self.assertEqual(serialized['description'], 'Later description')
            self.assertEqual(row['validation_flags'], [])
            for key in hostile.keys() - {'kind', 'admitted_to', 'derived_from'}:
                self.assertNotIn(key, serialized)
            before = Path(row['ref']).read_bytes()
            self.assertIn('not_admission_state_bearing', self.decision(row['ref']))
            self.assertEqual(Path(row['ref']).read_bytes(), before)

            # Explicit manual promotion: copy ONLY the serialized candidate's
            # domain values and trusted citations. Add the proposed envelope from
            # the synthetic reviewer, never recover fields from original input.
            promoted = {key: value for key, value in serialized.items() if key not in {
                'kind', 'element_type', 'admitted_to', 'extraction_confidence', 'extraction_notes',
            }}
            promoted.update(zone='canon', admission_state='proposed', proposed_at='2026-01-02',
                            proposed_by='fixture-reviewer', owner_to_confirm='fixture-reviewer',
                            gate_checks={'uniqueness': 'pending', 'consistency': 'pending',
                                         'completeness': 'pending'}, example=True)
            for key in ('actor', 'parent', 'owner', 'owner_role', 'scenario', 'goals',
                        'delivers_changes', 'predecessors', 'stakeholders'):
                refs = promoted.get(key, [])
                for ref in refs if isinstance(refs, list) else [refs]:
                    self.assertIn(ref, self.admitted_ids, f'unadmitted {key}: {ref}')
            if promoted['notation'] == 'stakeholder':
                self.assertIn(promoted['type'], ('internal', 'external'))
                self.assertTrue(promoted['actor'].startswith('ACTOR-'))
            else:
                self.assertEqual(promoted['type'], 'Task')
                self.assertEqual(promoted['duration'], 0)
            target = self.root / 'canon/elements' / row['placement']['folder'] / f'{serialized["id"]}.yaml'
            self.write(target, promoted)
            self.assertEqual(yaml.safe_load(target.read_text()), promoted)
            self.assertNotIn('admitted_by', promoted)
            self.assertNotIn('admitted_at', promoted)
            self.assertIn('admit_007_mismatch', self.decision(target, 'expert_confirmed'))
            self.assertEqual(yaml.safe_load(target.read_text()), promoted)
            self.assertIn(f'{target}  accept  ->  active', self.decision(target))
            admitted = yaml.safe_load(target.read_text())
            for key, value in promoted.items():
                if key not in {'admission_state', 'gate_checks'}:
                    self.assertEqual(admitted[key], value)
            self.assertEqual(admitted['admission_state'], 'active')
            self.assertEqual(admitted['reviewer_authority'], 'ai_reviewed')
            self.assertEqual(admitted['admitted_by'], 'fixture-reviewer')
            self.assertTrue(all(v == 'pass' for v in admitted['gate_checks'].values()))
            self.admitted_ids.add(admitted['id'])
            after = target.read_bytes()
            self.assertIn('not_proposed', self.cli(DECISIONS, 'apply', self.root, '--source-gate', self.gate, ok=False))
            self.assertEqual(target.read_bytes(), after)

    def test_unsupported_data_is_rejected_before_writing_candidates(self):
        for invalid in ({'custom_top_level': 0}, {'extensions': []}, {'extensions': None}):
            with self.subTest(invalid=invalid):
                output = self.emit([self.elements[0], {**self.elements[1], **invalid}], ok=False)
                self.assertIn('CONTRACT §12', output)
                self.assertFalse(self.candidates.exists())

    def test_extension_collision_is_reviewed_without_promoting_its_authority(self):
        element = {**self.elements[0], 'extensions': {'actor': 'ACTOR-999', 'admitted_by': 'source'}}
        self.emit([element])
        self.cli(INGEST, 'review-queue', self.candidates, '--out', self.gate)
        flags = yaml.safe_load(self.gate.read_text())['candidates'][0]['validation_flags']
        self.assertTrue(any('EXT-002' in flag and 'actor' in flag for flag in flags))
        candidate = self.read_candidate(element)
        self.assertEqual(candidate['actor'], 'ACTOR-1')
        self.assertNotIn('admitted_by', candidate)
        self.assertEqual(candidate['extensions'], element['extensions'])


if __name__ == '__main__':
    unittest.main()
