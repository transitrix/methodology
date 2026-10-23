"""Exercise portable archive extraction, reproducibility and refusing writes."""
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('skill_package', ROOT / 'scripts/package.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)

class PortablePackage(unittest.TestCase):
    def test_archive_reproducible_and_renderable_after_extraction(self):
        with tempfile.TemporaryDirectory() as work:
            work = Path(work)
            first, second = work / 'first.zip', work / 'second.zip'
            package.build(first)
            package.build(second)
            self.assertEqual(hashlib.sha256(first.read_bytes()).digest(), hashlib.sha256(second.read_bytes()).digest())
            with zipfile.ZipFile(first) as archive:
                names = archive.namelist()
                self.assertIn(ROOT.name + '/SKILL.md', names)
                self.assertIn(ROOT.name + '/README.md', names)
                self.assertFalse(any('__pycache__' in p or p.endswith('.pyc') for p in names))
                archive.extractall(work / 'unpacked')
            folder = work / 'unpacked' / ROOT.name
            subprocess.run([sys.executable, str(folder / 'scripts/render.py'), str(folder / 'assets/example.json'), str(work / 'map.svg'), '--no-backlog'], check=True, capture_output=True)
            self.assertIn('<svg', (work / 'map.svg').read_text())
            with self.assertRaises(FileExistsError):
                package.build(first)

    def test_archive_cannot_overwrite_sources(self):
        with self.assertRaises(ValueError):
            package.build(ROOT / 'SKILL.md')

if __name__ == '__main__':
    unittest.main()
