"""Read-only company diagram settings checker; no model/admission semantics."""
import argparse
import json
from pathlib import Path
import re

import yaml


SCHEMA = json.loads((Path(__file__).resolve().parents[1] /
                     'notations/schemas/diagram-colors.schema.json').read_text())
VERSION = SCHEMA['properties']['schema']['const']
VARIANTS = tuple(SCHEMA['properties']['variants']['properties'])


class SettingsError(ValueError):
    pass


class UniqueLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str) or key in result:
                raise SettingsError('duplicate or non-string mapping key')
            result[key] = self.construct_object(value_node, deep=deep)
        return result


def load_settings(text):
    """Single safe YAML document; aliases/tags/merge keys are not portable settings."""
    try:
        if any(isinstance(token, (yaml.AliasToken, yaml.AnchorToken, yaml.TagToken))
               for token in yaml.scan(text)):
            raise SettingsError('anchors, aliases and explicit tags are unsupported')
        return yaml.load(text, Loader=UniqueLoader)
    except yaml.YAMLError as exc:
        raise SettingsError('invalid settings YAML') from exc


def validate(document):
    """Return path-addressed settings diagnostics, separate from model rule codes."""
    errors = []

    def error(path, message):
        errors.append({'code': 'DIAGRAM-COLORS', 'path': path, 'message': message})

    def mapping(value, path, allowed=None):
        if not isinstance(value, dict):
            error(path, 'expected mapping'); return False
        if allowed is not None:
            for key in value:
                if key not in allowed: error(f'{path}/{key}', 'unknown setting')
        return True

    def color(value, path):
        if not isinstance(value, str) or not re.fullmatch(SCHEMA['$defs']['color']['pattern'], value):
            error(path, 'expected opaque #RRGGBB color')

    def palette(value, path):
        if not mapping(value, path, SCHEMA['$defs']['palette']['properties']): return
        if 'roles' in value and mapping(value['roles'], path + '/roles'):
            for key, val in value['roles'].items():
                known = key in SCHEMA['$defs']['roles']['properties']
                patterned = isinstance(key, str) and any(re.fullmatch(p, key)
                    for p in SCHEMA['$defs']['roles']['patternProperties'])
                if not known and not patterned: error(f'{path}/roles/{key}', 'unknown role')
                color(val, f'{path}/roles/{key}')
        if 'types' in value and mapping(value['types'], path + '/types'):
            for key, paint in value['types'].items():
                if not isinstance(key, str) or not any(re.fullmatch(p, key)
                        for p in SCHEMA['$defs']['types']['patternProperties']):
                    error(f'{path}/types/{key}', 'invalid type selector')
                if mapping(paint, f'{path}/types/{key}', SCHEMA['$defs']['paint']['properties']):
                    for channel, val in paint.items(): color(val, f'{path}/types/{key}/{channel}')

    if not mapping(document, '', SCHEMA['properties']): return errors
    if document.get('schema') != VERSION: error('/schema', 'unsupported or missing schema')
    if 'common' in document: palette(document['common'], '/common')
    if 'variants' in document and mapping(document['variants'], '/variants', VARIANTS):
        for variant, patch in document['variants'].items(): palette(patch, f'/variants/{variant}')
    return errors


def resolve_palette(document, variant):
    """Resolve explicit patch only. Omission is not a new product default."""
    errors = validate(document)
    if errors or variant not in VARIANTS:
        raise SettingsError('invalid palette or variant')
    result = {'roles': {}, 'types': {}}
    sources = {}
    for source, patch in [('common', document.get('common', {})),
                          (variant, document.get('variants', {}).get(variant, {}))]:
        for role, value in patch.get('roles', {}).items():
            result['roles'][role] = value
            sources[('roles', role)] = source
        for selector, paint in patch.get('types', {}).items():
            target = result['types'].setdefault(selector, {})
            for channel, value in paint.items():
                target[channel] = value
                sources[('types', selector, channel)] = source
    return result, sources


def resolve_color(document, variant, candidates, legacy):
    """Canonical specificity among eligible channels, otherwise preserve legacy.

    Candidates are tuples ('roles', role) or ('types', selector, channel).
    The consumer supplies its documented semantic binding, not arbitrary model IDs.
    """
    palette, sources = resolve_palette(document, variant)
    normalized = set()
    for candidate in candidates:
        candidate = tuple(candidate)
        if (not all(isinstance(part, str) for part in candidate)
                or not ((len(candidate) == 2 and candidate[0] == 'roles')
                        or (len(candidate) == 3 and candidate[0] == 'types'
                            and candidate[2] in ('fill', 'border', 'text')))):
            raise SettingsError('invalid consumer channel binding')
        normalized.add(candidate)

    def semantic(candidate):
        return candidate[0] == 'roles' and (
            candidate[1].startswith(('status.', 'maturity.')) or candidate[1] in {
                'selection', 'selection_text', 'focus', 'drop_target', 'virtual_fill',
                'virtual_border', 'critical_fill', 'critical_border', 'milestone_fill'})

    if any(semantic(c) for c in normalized) and not all(semantic(c) for c in normalized):
        raise SettingsError('semantic and ordinary channels must not be mixed')

    def priority(candidate):
        if candidate[0] == 'types': return 0
        for rank, prefix in enumerate(('goal_level.', 'tree_level.', 'layer.'), 1):
            if candidate[1].startswith(prefix): return rank
        return 4

    priorities = [priority(c) for c in normalized]
    if len(priorities) != len(set(priorities)):
        raise SettingsError('ambiguous consumer bindings at equal specificity')
    for candidate in sorted(normalized, key=priority):
        if candidate in sources:
            value = palette[candidate[0]][candidate[1]]
            if len(candidate) == 3: value = value[candidate[2]]
            return value, sources[candidate]
    return legacy, 'legacy'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    if not args.file.exists():
        print(json.dumps({'valid': True, 'present': False, 'errors': []})); return 0
    try:
        errors = validate(load_settings(args.file.read_text(encoding='utf-8')))
    except (OSError, UnicodeError, SettingsError) as exc:
        errors = [{'code': 'DIAGRAM-COLORS', 'path': '', 'message': str(exc)}]
    print(json.dumps({'valid': not errors, 'present': True, 'errors': errors}))
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
