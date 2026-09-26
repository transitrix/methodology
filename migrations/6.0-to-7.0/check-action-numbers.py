#!/usr/bin/env python3
"""Read-only ACTION numeric boundary check for migration operators (Python + PyYAML)."""
import math
from pathlib import Path
import sys
try:
    import yaml
except ImportError:
    print("Python 3 with PyYAML is required", file=sys.stderr)
    sys.exit(2)

FIELDS = ('duration', 'duration_days', 'labor_cost', 'resources_cost', 'effort', 'score')
class Loader(yaml.SafeLoader):
    pass

def mapping(loader, node, deep=False):
    seen = set()
    for key_node, _ in node.value:
        if key_node.tag == 'tag:yaml.org,2002:merge':
            continue
        key = loader.construct_object(key_node, deep=deep)
        if key in seen:
            raise ValueError('duplicate YAML key: ' + str(key))
        seen.add(key)
    loader.flatten_mapping(node)
    return yaml.SafeLoader.construct_mapping(loader, node, deep=deep)
Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)

def main():
    root = Path(sys.argv[1]).resolve()
    manifest = yaml.load((root / 'transitrix.yaml').read_text(), Loader=Loader)
    if not isinstance(manifest, dict) or manifest.get('methodology_version') != '7.0.0':
        raise ValueError('expected methodology_version: "7.0.0"; run the documented pin migration first')
    zones = manifest.get('zones')
    if not isinstance(zones, list) or not zones or any(z not in ('canon', 'field', 'codex') for z in zones):
        raise ValueError('manifest zones must be a nonempty list of canon/field/codex')
    errors, files, actions = [], 0, 0
    roots = [root / z for z in dict.fromkeys(zones)]
    if (root / 'views').exists():
        roots.append(root / 'views')
    def check(record, label):
        nonlocal actions
        actions += 1
        if not isinstance(record, dict):
            errors.append(label + ': ACTION must be a mapping'); return
        for field in FIELDS:
            if field not in record:
                continue
            value = record[field]
            if value is None and field in ('duration', 'duration_days'):
                continue
            if type(value) not in (int, float) or not math.isfinite(value) or (field == 'score' and value != int(value)):
                errors.append(label + '.' + field + ': SCHEMA_INVALID numeric type')
            elif value < 0:
                errors.append(label + '.' + field + ': ACTION-011 negative value; author correction required')
    for zone in roots:
        if not zone.is_dir() or zone.is_symlink():
            raise ValueError('missing or symlinked scan root: ' + str(zone))
        for path in sorted(zone.rglob('*')):
            if path.is_symlink():
                raise ValueError('symlink requires explicit review: ' + str(path))
            if not path.is_file() or path.suffix.lower() not in ('.yaml', '.yml'):
                continue
            files += 1
            label = str(path.relative_to(root))
            try:
                doc = yaml.load(path.read_text(), Loader=Loader)
                if not isinstance(doc, dict):
                    raise ValueError('expected YAML mapping')
                notation = doc.get('notation')
                if notation in ('action', 'activity') and str(doc.get('id', '')).startswith(('ACTION-', 'ACTIVITY-')):
                    check(doc, label)
                if notation in ('action', 'activities', 'dgca', 'dga', 'fgca', 'fga', 'actions-tree'):
                    for key in ('actions', 'activities'):
                        if key in doc:
                            if not isinstance(doc[key], list):
                                errors.append(label + '.' + key + ': expected array')
                            else:
                                for i, action in enumerate(doc[key]):
                                    check(action, label + '.' + key + '[' + str(i) + ']')
            except (ValueError, yaml.YAMLError, OSError) as error:
                errors.append(label + ': ' + str(error))
    for error in errors:
        print(error, file=sys.stderr)
    print(f'{files} YAML files read; {actions} ACTION records checked; {len(errors)} errors.')
    print('Numeric migration checks only. Run the owning notation and whole-model validators; retain historical diagnostics.')
    return 1 if errors else 0
try:
    sys.exit(main())
except (OSError, ValueError, yaml.YAMLError) as error:
    print(str(error), file=sys.stderr); sys.exit(2)
