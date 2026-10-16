"""Consumer oracle and negative controls for the reporting command."""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from reporting import analyse, load_catalogue

ROOT = Path(__file__).resolve().parents[2]
EXAMPLE = ROOT / 'notations/examples/relations/reports-to'
A, B, C = ('ACTOR-SYN-' + x + '-1' for x in 'ABC')
R1, R2, R3 = ('REL-SYN-REPORTING-' + str(x) for x in (1, 2, 3))


class ReportingTests(unittest.TestCase):
    def setUp(self):
        self.cat = load_catalogue(EXAMPLE)
        self.records = {r['id']: r for r in self.cat['records']}

    def result(self, when='2026-06-15', actor=A, direction='managers'):
        return analyse(self.cat, when, actor, direction)

    def assert_code(self, code, field=None):
        result = self.result()
        hits = [f for f in result['findings'] if f['code'] == code and
                (field is None or f.get('field') == field)]
        self.assertTrue(hits, result)
        if hits[0]['severity'] == 'error':
            self.assertFalse(result['valid'])
            self.assertEqual(result['pairs'], [])
        return hits

    def add(self, source, identity, **fields):
        r = dict(copy.deepcopy(self.records[source]), id=identity, **fields)
        self.cat['records'].append(r)
        self.records[identity] = r
        return r

    def test_full_dated_oracle_and_reverse_evidence(self):
        rows = [('2026-05-31', [(B, R1)], False),
                ('2026-06-01', [(B, R1), (C, R2)], True),
                ('2026-06-15', [(B, R1), (C, R2)], True),
                ('2026-06-30', [(B, R1), (C, R2)], True),
                ('2026-07-01', [(C, R2)], False),
                ('2026-08-01', [(B, R3), (C, R2)], True)]
        for when, expected, warning in rows:
            with self.subTest(when=when):
                result = self.result(when)
                self.assertTrue(result['complete'] and result['valid'], result)
                self.assertEqual(result['pairs'], [dict(from_actor=A, to_actor=b, relations=[r]) for b, r in expected])
                self.assertEqual(any(f['code'] == 'REL-013' for f in result['findings']), warning)
                for manager in (B, C):
                    reverse = self.result(when, manager, 'reports')
                    self.assertEqual(reverse['pairs'], [p for p in result['pairs'] if p['to_actor'] == manager])
                    self.assertEqual(self.result(when, manager)['pairs'], [])
                self.assertEqual(self.result(when, A, 'reports')['pairs'], [])
        scan = analyse(self.cat)
        self.assertEqual([f['interval'] for f in scan['findings']],
                         [['2026-06-01', '2026-06-30'], ['2026-08-01', None]])

    def test_endpoint_matrix_both_sides(self):
        baseline = copy.deepcopy(self.cat)
        for side in ('from', 'to'):
            for subtype in ('business_unit', 'system', 'ROLE', 'unknown', 'unadmitted'):
                with self.subTest(side=side, subtype=subtype):
                    self.cat = copy.deepcopy(baseline)
                    records = {r['id']: r for r in self.cat['records']}
                    target = records[records[R1][side]]
                    if subtype == 'unknown':
                        records[R1][side] = 'ACTOR-MISSING-1'
                    elif subtype == 'unadmitted':
                        target['admission_state'] = 'proposed'
                    elif subtype == 'ROLE':
                        target['id'] = 'ROLE-SYN-1'
                        records[R1][side] = target['id']
                        target['notation'] = 'role'
                    else:
                        target['type'] = subtype
                    self.assert_code('REL-002', side)

    def test_endpoint_shapes_and_unknown_kind(self):
        for side in ('from', 'to'):
            for value in (None, [], [A, B], {}, 42, '', 'invalid'):
                with self.subTest(side=side, value=value):
                    self.setUp()
                    self.records[R1][side] = value
                    self.assert_code('REL-002', side)
            self.setUp()
            del self.records[R1][side]
            self.assert_code('REL-002', side)
        for value in (None, 'invented', []):
            self.setUp()
            self.records[R1]['type'] = value
            self.assert_code('REL-001')

    def test_identity_alias_self_duplicate_and_collisions(self):
        self.records[A]['former_ids'] = ['ACTOR-OLD-1']
        self.records[R1]['to'] = 'ACTOR-OLD-1'
        self.assert_code('REL-011')
        self.records[R1]['to'] = A
        self.assert_code('REL-011')
        self.setUp()
        self.records[B]['former_ids'] = ['ACTOR-OLD-1']
        self.add(R1, 'REL-SYN-REPORTING-4', to='ACTOR-OLD-1')
        result = self.result('2026-05-31')
        self.assertEqual(result['pairs'][0]['relations'], [R1, 'REL-SYN-REPORTING-4'])
        self.assertEqual(result['findings'], [])
        result = self.result()
        warning = [f for f in result['findings'] if f['code'] == 'REL-013'][0]
        self.assertEqual(warning['managers'], [B, C])
        self.assertEqual(len(warning['relations']), 3)
        self.assertEqual(self.result('2026-08-01')['pairs'][0]['relations'], [R3])
        self.records[C]['former_ids'] = ['ACTOR-OLD-1']
        self.assert_code('ELEM-FORMER-ID-001')
        self.assertFalse(self.result()['complete'])

    def test_temporal_two_and_three_person_cycles_and_matrix_dag(self):
        self.add(R1, 'REL-REVERSE-1', **{'from': B, 'to': A, 'valid_from': '2026-06-30'})
        hit = self.assert_code('REL-012')[0]
        self.assertEqual(hit['actor_path'], [A, B, A])
        self.assertEqual(hit['interval'], ['2026-06-30', '2026-06-30'])
        self.assertEqual(hit['relations'], ['REL-REVERSE-1', R1])
        self.setUp()
        self.add(R1, 'REL-BC-1', **{'from': B, 'to': C})
        self.assertTrue(self.result()['valid'], 'Matrix DAG must remain valid')
        self.add(R1, 'REL-CA-1', **{'from': C, 'to': A, 'valid_from': '2026-06-01'})
        cycles = self.assert_code('REL-012')
        self.assertTrue(any(f['actor_path'] == [A, B, C, A] for f in cycles))
        self.assertTrue(all(f['incident_edges'] and f['witness'] == '2026-06-01' for f in cycles))
        # Whole-history validation is independent of a query's date.
        self.assertFalse(self.result('2030-01-01')['valid'])
        self.setUp()
        self.cat['records'] = [r for r in self.cat['records'] if r['id'] not in (R2, R3)]
        self.add(R1, 'REL-REVERSE-1', **{'from': B, 'to': A, 'valid_from': '2026-07-01', 'valid_to': None})
        self.assertTrue(self.result()['valid'])

    def test_lifecycle_one_day_future_null_expired_and_bad_dates(self):
        self.cat['records'] = [r for r in self.cat['records'] if r['id'] not in (R2, R3)]
        self.records[R1].update(valid_from='2026-06-15', valid_to='2026-06-15')
        for when, count in [('2026-06-14', 0), ('2026-06-15', 1), ('2026-06-16', 0)]:
            self.assertEqual(len(self.result(when)['pairs']), count)
        self.records[R1]['valid_to'] = None
        self.assertEqual(self.result('2026-06-14')['pairs'], [])
        self.assertEqual(len(self.result('2030-01-01')['pairs']), 1)
        for field, value, code in [('valid_from', None, 'LIFECYCLE-001'),
                                    ('valid_from', '2026-02-30', 'LIFECYCLE-001'),
                                    ('valid_to', '2026-13-01', 'LIFECYCLE-002'),
                                    ('valid_to', '2025-01-01', 'LIFECYCLE-003')]:
            self.setUp()
            self.records[R1][field] = value
            self.assert_code(code, field)
        for field, code in [('valid_from', 'LIFECYCLE-001'), ('valid_to', 'SCHEMA_INVALID')]:
            self.setUp()
            del self.records[R1][field]
            self.assert_code(code, field)

    def test_containment_each_endpoint_no_clipping(self):
        for side in ('from', 'to'):
            for start, end in [('2026-01-02', None), ('2026-01-01', '2026-06-29')]:
                self.setUp()
                self.records[self.records[R1][side]].update(valid_from=start, valid_to=end)
                self.assert_code('REL-003', side)
            self.setUp()
            self.records[self.records[R2][side]]['valid_to'] = '2026-12-31'
            self.assert_code('REL-003', side)
        self.setUp()
        self.cat['records'] = [r for r in self.cat['records'] if r['id'] not in (R2, R3)]
        for identity in (A, B):
            self.records[identity]['valid_to'] = '2026-06-30'
        for when in ('2026-01-01', '2026-06-30'):
            self.assertTrue(self.result(when)['valid'])
            self.assertEqual(len(self.result(when)['pairs']), 1)
        self.assertEqual(self.result('2026-07-01')['pairs'], [])

    def test_draft_relation_independent_admission_inline_and_extensions(self):
        for r in self.cat['records']:
            if r['id'].startswith('REL-'):
                r.update(admission_state='proposed', proposed_at='2026-01-01', proposed_by='synthetic')
                del r['admitted_at'], r['admitted_by']
                r['gate_checks']['completeness'] = 'pending_review'
        self.assertEqual(self.result()['pairs'], [])
        self.assertTrue(self.result()['valid'])
        self.setUp()
        self.records[R1]['gate_checks']['consistency'] = 'fail'
        self.assert_code('ADMIT-003')
        self.setUp()
        self.records[A]['extensions'] = {'reports_to': B, 'manager': B, 'arbitrary': {'anything': True}}
        self.assertTrue(self.result()['valid'])
        for field in ('manager', 'reports_to'):
            self.records[A][field] = B
            self.assert_code('REL-004', field)
            del self.records[A][field]

    def test_employment_unit_parent_no_inferred_reporting(self):
        unit = self.add(B, 'ACTOR-UNIT-1', type='business_unit')
        self.add(B, 'ACTOR-UNIT-2', type='business_unit')
        self.cat['records'] = [r for r in self.cat['records'] if not r['id'].startswith('REL-')]
        employment = self.add(R1, 'REL-EMPLOYMENT-1', type='employment', to=unit['id'], roles=['ROLE-SYN-1'])
        parent = self.add(R1, 'REL-UNIT-1', type='unit_parent', **{'from': unit['id'], 'to': 'ACTOR-UNIT-2'})
        self.assertTrue(self.result()['valid'])
        self.assertEqual(self.result()['pairs'], [])
        employment['to'] = B
        self.assert_code('REL-002', 'to')
        employment['to'] = unit['id']
        parent['from'] = A
        self.assert_code('REL-002', 'from')

    def test_incomplete_population_and_parse_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertFalse(analyse(load_catalogue(root))['complete'])
            (root / 'transitrix.yaml').write_text('transitrix: 1\n')
            (root / 'canon/elements').mkdir(parents=True)
            (root / 'canon/relations').mkdir()
            for text in ('id: [', 'id: ACTOR-A-1\nid: ACTOR-B-1', '- scalar', 'x: 1\n---\nx: 2'):
                (root / 'canon/elements/broken.yaml').write_text(text)
                result = analyse(load_catalogue(root))
                self.assertFalse(result['complete'])
                self.assertEqual(result['pairs'], [])
            with patch.object(Path, 'read_text', side_effect=PermissionError):
                self.assertFalse(load_catalogue(root)['complete'])
            (root / 'canon/elements/broken.yaml').unlink()
            (root / 'canon/elements/transitrix.yaml').write_text('transitrix: 1\n')
            self.assertFalse(load_catalogue(root)['complete'])

    def test_fail_closed_identity_header_and_unreadable_directory(self):
        self.add(B, B)
        self.assert_code('SCHEMA_INVALID', 'id')
        self.assertFalse(self.result()['complete'])
        self.setUp()
        self.records[R1]['notation'] = 'actor'
        self.assert_code('SCHEMA_INVALID', 'notation')
        self.setUp()
        self.records[B]['aliases'] = ['Former manager']
        self.records[R1]['to'] = 'Former manager'
        self.assert_code('REL-002', 'to')
        with patch.object(Path, 'iterdir', side_effect=PermissionError):
            result = analyse(load_catalogue(EXAMPLE))
            self.assertFalse(result['complete'])
            self.assertEqual(result['pairs'], [])
        self.setUp()
        self.records[B]['former_ids'] = [A]
        self.assert_code('ELEM-FORMER-ID-001')

    def test_symlinked_catalogue_boundaries_are_incomplete(self):
        for relative in ('.', 'transitrix.yaml', 'canon', 'canon/elements',
                         'canon/relations', 'canon/relations/' + R1 + '.yaml'):
            with self.subTest(path=relative), tempfile.TemporaryDirectory() as directory:
                root = Path(directory) / 'catalogue'
                shutil.copytree(EXAMPLE, root)
                path = root / relative
                target = Path(directory) / 'target'
                path.rename(target)
                path.symlink_to(target, target_is_directory=target.is_dir())
                result = analyse(load_catalogue(root), '2026-06-15', A)
                self.assertFalse(result['complete'], result)
                self.assertEqual(result['pairs'], [])
                self.assertTrue(any(f['code'] == 'CATALOGUE_INCOMPLETE'
                                    for f in result['findings']))

    def test_metadata_errors_are_incomplete(self):
        original = Path.lstat
        for relative in ('transitrix.yaml', 'canon/relations/' + R1 + '.yaml'):
            with self.subTest(path=relative):
                def unreadable(path, *args, **kwargs):
                    if path == EXAMPLE / relative:
                        raise PermissionError('Cannot inspect file')
                    return original(path, *args, **kwargs)
                with patch.object(Path, 'lstat', unreadable):
                    result = analyse(load_catalogue(EXAMPLE), '2026-06-15', A)
                self.assertFalse(result['complete'])
                self.assertEqual(result['pairs'], [])
                self.assertTrue(any(f.get('path') == relative for f in result['findings']))

    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'Named pipes require POSIX')
    def test_nonregular_yaml_is_rejected_without_reading(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'catalogue'
            shutil.copytree(EXAMPLE, root)
            os.mkfifo(root / 'canon/relations/stream.yaml')
            result = analyse(load_catalogue(root), '2026-06-15', A)
            self.assertFalse(result['complete'])
            self.assertEqual(result['pairs'], [])
            self.assertTrue(any(f.get('path') == 'canon/relations/stream.yaml'
                                for f in result['findings']))

    def test_deterministic_order_and_cli_error_status(self):
        expected = self.result()
        self.cat['records'].reverse()
        self.assertEqual(self.result()['pairs'], expected['pairs'])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            command = [sys.executable, str(ROOT / 'tools/reporting.py'), '--root', str(root)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertFalse(json.loads(result.stdout)['complete'])
            (root / 'transitrix.yaml').write_text('transitrix: 1\n')
            (root / 'canon/elements').mkdir(parents=True)
            (root / 'canon/relations').mkdir()
            for r in self.cat['records']:
                folder = 'relations' if r['id'].startswith('REL-') else 'elements'
                value = {k: v for k, v in r.items() if k != '_path'}
                if r['id'] == R1:
                    value['to'] = A
                (root / 'canon' / folder / (r['id'] + '.yaml')).write_text(yaml.safe_dump(value))
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1, result.stderr)
            output = json.loads(result.stdout)
            self.assertTrue(output['complete'])
            self.assertTrue(any(f['code'] == 'REL-011' for f in output['findings']))

    def test_cli_and_date_requirement(self):
        result = subprocess.run([sys.executable, str(ROOT / 'tools/reporting.py'), '--root', str(EXAMPLE),
                                 '--as-at', '2026-06-15', '--actor', A], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(json.loads(result.stdout)['pairs']), 2)
        self.assertFalse(analyse(self.cat, actor=A)['valid'])
        self.assertFalse(self.result('2026-02-30')['valid'])
        self.assertFalse(self.result(actor='ACTOR-MISSING-1')['valid'])


if __name__ == '__main__':
    unittest.main()
