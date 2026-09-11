"""Execute the shipped L1 workflow steps without publishing a release."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
SLICE = '''version: "1.0.0"
elements:
  - id: CAPABILITY-V1
    type: CAPABILITY
    name: "Payments"
    aliases: ["Settlement"]
  - id: CAPABILITY-V2
    type: CAPABILITY
    name: "Billing"
'''


def step(file, job, name):
    workflow = yaml.safe_load((ROOT / 'integration' / file).read_text())
    return next(s['run'] for s in workflow['jobs'][job]['steps'] if s.get('name') == name)


class CatalogueWorkflows(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / '.methodology').symlink_to(ROOT, target_is_directory=True)
        self.env = dict(os.environ, RELEASE_TAG='v1.0.0', RUNNER_TEMP=str(self.root))

    def run_step(self, file, job, name):
        return subprocess.run(['bash', '-e', '-c', step(file, job, name)],
                              cwd=self.root, env=self.env, text=True, capture_output=True)

    def test_publication_validates_and_passes_versioned_asset_to_gh(self):
        (self.root / 'catalogue.yaml').write_text(SLICE)
        result = self.run_step('catalogue-release-example.yaml', 'publish', 'Validate the reviewed release slice')
        self.assertEqual(result.returncode, 0, result.stderr)
        # Stub only the external publication; run the exact shipped shell step.
        bindir = self.root / 'bin'
        bindir.mkdir()
        gh = bindir / 'gh'
        gh.write_text('#!/usr/bin/env python3\nimport json, sys\nfrom pathlib import Path\nPath("gh-args.json").write_text(json.dumps(sys.argv[1:]))\n')
        gh.chmod(0o755)
        self.env['PATH'] = str(bindir) + os.pathsep + self.env['PATH']
        result = self.run_step('catalogue-release-example.yaml', 'publish', 'Publish versioned asset')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / 'catalogue-v1.0.0.yaml').read_text(), SLICE)
        args = json.loads((self.root / 'gh-args.json').read_text())
        self.assertEqual(args[:4], ['release', 'create', 'v1.0.0', 'catalogue-v1.0.0.yaml'])
        self.assertIn('--verify-tag', args)
        self.assertNotIn('--clobber', args)

    def test_publication_rejects_mismatch_extra_fields_duplicates_and_lossy_yaml(self):
        for content in (SLICE.replace('1.0.0', '2.0.0'),
                        SLICE + 'admission_record: private\n',
                        SLICE.replace('CAPABILITY-V2', 'CAPABILITY-V1'),
                        SLICE.replace('["Settlement"]', '\n      - Settlement')):
            with self.subTest(content=content):
                (self.root / 'catalogue.yaml').write_text(content)
                result = self.run_step('catalogue-release-example.yaml', 'publish', 'Validate the reviewed release slice')
                self.assertNotEqual(result.returncode, 0)

    def test_ci_reports_both_findings_without_editing_canon_and_fails_on_broken_pin(self):
        manifest = self.root / 'transitrix.yaml'
        manifest.write_text('methodology_version: "5.1.0"\n')
        result = self.run_step('ci-example.yaml', 'vocabulary', 'Report collisions and unbound matches')
        self.assertEqual((result.returncode, result.stdout), (0, ''))
        (self.root / 'vendor').mkdir()
        (self.root / 'vendor/catalogue.yaml').write_text(SLICE)
        manifest.write_text('catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n')
        canon = self.root / 'canon/elements/01_motivation'
        canon.mkdir(parents=True)
        (canon / 'bound.yaml').write_text('id: CAPABILITY-H1\nname: Payments\naliases:\n  - Billing\ncanon_id: CAPABILITY-V1\n')
        (canon / 'unbound.yaml').write_text('id: CAPABILITY-H2\nname: Settlement\n')
        before = {p: p.read_bytes() for p in self.root.rglob('*.yaml')}
        result = self.run_step('ci-example.yaml', 'vocabulary', 'Report collisions and unbound matches')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['collisions'], [{'local_id': 'CAPABILITY-H1', 'central_ids': ['CAPABILITY-V2']}])
        self.assertEqual(report['unbound_matches'], [{'local_id': 'CAPABILITY-H2', 'central_ids': ['CAPABILITY-V1']}])
        self.assertEqual(before, {p: p.read_bytes() for p in before})
        (self.root / 'vendor/catalogue.yaml').write_text(SLICE.replace('1.0.0', '2.0.0'))
        result = self.run_step('ci-example.yaml', 'vocabulary', 'Report collisions and unbound matches')
        self.assertNotEqual(result.returncode, 0)
        (self.root / 'vendor/catalogue.yaml').unlink()
        result = self.run_step('ci-example.yaml', 'vocabulary', 'Report collisions and unbound matches')
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
