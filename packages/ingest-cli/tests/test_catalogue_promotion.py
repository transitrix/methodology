"""Drive promotion, a simulated human admission, and local binding through the CLI.

Run: python packages/ingest-cli/tests/test_catalogue_promotion.py
Requires Node.js and PyYAML. No network or central repository writes.
"""

import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import yaml


REPO = Path(__file__).resolve().parents[3]
CLI = REPO / 'packages/ingest-cli/ingest.mjs'


class CataloguePromotionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalogue-promotion-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        version = yaml.safe_load((REPO / 'notations/CURRENT_VERSION.yaml').read_text())
        self.manifest = self.root / 'transitrix.yaml'
        self.manifest.write_text(yaml.safe_dump({
            'transitrix': 1,
            'methodology_version': version['methodology_version'],
            'notations': [],
            'zones': ['canon'],
        }))
        self.element = self.root / 'canon/elements/02_business/terms/TERM-9.yaml'
        self.element.parent.mkdir(parents=True)
        self.element.write_text(yaml.safe_dump({
            'id': 'TERM-9', 'name': 'Capacity', 'aliases': ['Available capacity'],
            'description': 'The amount of work a team can take on.',
            'zone': 'canon', 'admitted_at': '2026-08-01', 'admitted_by': 'reviewer',
            'gate_checks': {'uniqueness': True, 'consistency': True, 'completeness': True},
        }, sort_keys=False, indent=2).replace('- Available capacity', '  - Available capacity'))

    def cli(self, *args, ok=True):
        result = subprocess.run(
            ['node', str(CLI), *map(str, args)], cwd=self.root,
            capture_output=True, text=True, timeout=30,
        )
        if ok:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def check(self):
        return yaml.safe_load(self.cli('repo-check', self.root).stdout)

    def test_promotion_returned_binding_and_repeat_validation_preserve_local_identity(self):
        before = self.element.read_bytes()
        out = self.root / 'promotion.yaml'
        self.cli('catalogue-promote', 'TERM-9', self.root,
                 '--repository', 'acme/adopter', '--out', out)
        first = out.read_bytes()
        doc = yaml.safe_load(first)
        self.assertEqual(doc['gate'], {'admits_to_canon': False})
        proposal = doc['proposal']
        self.assertEqual(proposal, {
            'local_id': 'TERM-9', 'type': 'TERM', 'name': 'Capacity',
            'aliases': ['Available capacity'],
            'description': 'The amount of work a team can take on.',
            'origin': {'repository': 'acme/adopter', 'id': 'TERM-9'},
        })
        self.assertEqual(self.element.read_bytes(), before)
        self.cli('catalogue-promote', 'TERM-9', self.root,
                 '--repository', 'acme/adopter', '--out', out)
        self.assertEqual(out.read_bytes(), first)
        self.cli('catalogue-bind', 'TERM-9', 'TERM-42', self.root, ok=False)
        self.assertEqual(self.element.read_bytes(), before)

        # Fixture for the human gate's returned, published catalogue entry.
        # Central admission retains origin; the published slice carries only
        # the catalogue fields specified in releases and propagation §6.4.1.
        central = {**proposal, 'id': 'TERM-42'}
        del central['local_id']
        slice_path = self.root / 'vendor/catalogue.yaml'
        slice_path.parent.mkdir()
        fields = ('id', 'type', 'name', 'aliases', 'description')
        slice_path.write_text('version: "1.0.0"\nelements:\n  - ' + '\n    '.join(
            f'{k}: {json.dumps(central[k])}' for k in fields
        ) + '\n')
        self.cli('catalogue-pin', 'acme/architecture', '1.0.0',
                 'vendor/catalogue.yaml', self.root)
        self.cli('catalogue-bind', 'TERM-9', 'TERM-999', self.root, ok=False)
        self.assertEqual(self.element.read_bytes(), before)
        self.cli('catalogue-bind', 'TERM-9', 'TERM-42', self.root)
        bound = self.element.read_bytes()
        expected = yaml.safe_load(before)
        expected['canon_id'] = 'TERM-42'
        self.assertEqual(yaml.safe_load(bound), expected)
        self.assertNotIn('origin', yaml.safe_load(bound))

        snapshot = {p: p.read_bytes() for p in self.root.rglob('*.yaml')}
        self.cli('catalogue-bind', 'TERM-9', 'TERM-42', self.root)
        self.cli('catalogue-bind', 'TERM-9', 'TERM-999', self.root, ok=False)
        report = self.check()
        self.assertEqual(report['integrity']['red_flags'], [])
        self.assertEqual(self.check(), report)
        self.cli('check-placement', self.root)
        self.assertEqual(snapshot, {p: p.read_bytes() for p in snapshot})

        recognized = self.root / 'recognition.yaml'
        self.cli('catalogue-recognize', self.root, '--out', recognized)
        self.assertEqual(yaml.safe_load(recognized.read_text())['proposals'], [])
        self.cli('catalogue-promote', 'TERM-9', self.root,
                 '--repository', 'acme/adopter', '--out', out, ok=False)
        self.assertEqual(out.read_bytes(), first)
        self.assertEqual(self.element.read_bytes(), bound)


if __name__ == '__main__':
    unittest.main()
