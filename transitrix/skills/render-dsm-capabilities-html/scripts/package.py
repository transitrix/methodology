#!/usr/bin/env python3
"""Build a reproducible, source-only portable skill ZIP (Python standard library)."""
import argparse
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def build(output):
    output = Path(output).resolve()
    if output.is_relative_to(ROOT):
        raise ValueError('Write the archive outside the source skill folder')
    sources = sorted(p for p in ROOT.rglob('*')
                     if p.is_file() and '__pycache__' not in p.parts
                     and p.suffix != '.pyc')
    with output.open('xb') as stream, zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for source in sources:
            name = ROOT.name + '/' + source.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, source.read_bytes())
    return len(sources)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    print(f'Packaged {build(args.output)} files: {args.output}')
