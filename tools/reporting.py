#!/usr/bin/env python3
"""Validate and query direct person reporting in a declared YAML catalogue."""
import argparse
from datetime import date, timedelta
import json
from pathlib import Path
import re

import yaml


class UniqueLoader(yaml.SafeLoader):
    """Reject duplicate keys instead of silently dropping authored evidence."""


def unique_map(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if not isinstance(key, str) or key in result:
            raise ValueError('Mapping keys must be unique strings')
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor('tag:yaml.org,2002:map', unique_map)
ID = re.compile(r'^[A-Z][A-Z0-9_]*(?:-[A-Z0-9_]+)*-[0-9]+$')
VOCAB = Path(__file__).resolve().parents[1] / 'notations' / 'vocabulary.yaml'


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def finding(code, message, record=None, field=None, severity='error', **context):
    return dict(code=code, severity=severity, message=message,
                **({'record': record} if record else {}),
                **({'field': field} if field else {}), **context)


def load_catalogue(root):
    """One explicit root, whole-file YAML in canon/elements and canon/relations."""
    root = Path(root).resolve()
    records, findings = [], []
    complete = True

    def incomplete(message, path, code='CATALOGUE_INCOMPLETE'):
        nonlocal complete
        complete = False
        findings.append(finding(code, message, severity='warning' if code == 'CAT-001' else 'error', path=str(path)))

    def read(path):
        try:
            value = yaml.load(path.read_text(encoding='utf-8'), Loader=UniqueLoader)
            if not isinstance(value, dict):
                raise ValueError('Expected one YAML mapping')
            return value
        except (OSError, UnicodeError, yaml.YAMLError, ValueError, RecursionError):
            incomplete('Unreadable or malformed YAML mapping', path.relative_to(root))
            return None

    if not (root / 'transitrix.yaml').is_file():
        incomplete('No declared catalogue manifest at root', 'transitrix.yaml', 'CAT-001')
    else:
        read(root / 'transitrix.yaml')
    for ancestor in root.parents:
        if (ancestor / 'transitrix.yaml').exists():
            incomplete('Root is inside another declared catalogue', 'transitrix.yaml', 'CAT-002')
            break

    def walk(folder):
        try:
            entries = sorted(folder.iterdir())
        except OSError:
            incomplete('Cannot enumerate catalogue directory', folder.relative_to(root))
            return
        for path in entries:
            rel = path.relative_to(root)
            if path.is_symlink():
                incomplete('Symlinks are outside the supported catalogue scope', rel)
            elif path.name == 'transitrix.yaml':
                incomplete('Nested catalogue manifest', rel, 'CAT-002')
            elif path.is_dir():
                walk(path)
            elif path.suffix in ('.yaml', '.yml'):
                value = read(path)
                if value is not None:
                    value['_path'] = str(rel)
                    records.append(value)
            elif path.name != '.gitkeep' or path.stat().st_size != 0:
                incomplete('Unsupported file in catalogue input', rel)

    # Both directories are required: absence cannot establish an empty population.
    for name in ('elements', 'relations'):
        walk(root / 'canon' / name)
    return dict(records=records, findings=findings, complete=complete)


def admitted(r):
    gates = r.get('gate_checks')
    return (r.get('admission_state', 'active') == 'active' and r.get('zone') == 'canon'
            and day(r.get('admitted_at')) and isinstance(r.get('admitted_by'), str)
            and bool(r['admitted_by'].strip()) and isinstance(gates, dict)
            and all(gates.get(k) == 'pass' for k in ('uniqueness', 'consistency', 'completeness'))
            and all(v == 'pass' for v in gates.values()))


def in_effect(r, when):
    return r['valid_from'] <= when and (r['valid_to'] is None or when <= r['valid_to'])


def analyse(catalogue, as_at=None, actor=None, direction='managers'):
    findings = list(catalogue['findings'])
    complete = catalogue['complete']
    records = catalogue['records']
    if as_at is not None and not day(as_at):
        return dict(complete=complete, valid=False, as_at=as_at, actor=actor, direction=direction,
                    pairs=[], findings=findings + [finding(
                        'SCHEMA_INVALID', 'Query date must be YYYY-MM-DD', field='as_at')])
    elements, aliases, relations, valid_windows = {}, {}, [], set()
    vocabulary = yaml.safe_load(VOCAB.read_text(encoding='utf-8'))
    kinds = vocabulary['relation_types']
    kinds = {**kinds, **{k: kinds[v['replaced_by']]
                          for k, v in vocabulary['deprecated_relation_types'].items()}}

    def emit(code, message, r, field=None, **ctx):
        findings.append(finding(code, message, r.get('id'), field, **ctx))

    for r in records:
        identity = r.get('id')
        if not isinstance(identity, str) or not ID.fullmatch(identity):
            emit('SCHEMA_INVALID', 'Expected a canonical ID', r, 'id')
            complete = False
            continue
        if identity in elements:
            emit('SCHEMA_INVALID', 'Duplicate canonical ID; catalogue is ambiguous', r, 'id')
            complete = False
            continue
        elements[identity] = r
        expected_notation = 'relation' if identity.startswith('REL-') else ('actor' if identity.startswith('ACTOR-') else None)
        if expected_notation and r.get('notation') != expected_notation:
            emit('SCHEMA_INVALID', 'Notation does not match canonical TYPE', r, 'notation')
        if identity.startswith('REL-') or r.get('notation') == 'relation':
            relations.append(r)
        state = r.get('admission_state', 'active')
        if state not in ('active', 'proposed', 'rejected'):
            emit('ADMIT-001', 'Unknown admission state', r, 'admission_state')
        elif state == 'active' and not admitted(r):
            emit('ADMIT-003', 'Incomplete canon admission or gate checks', r, 'admitted_at')
        elif state == 'proposed' and (r.get('admitted_at') or r.get('admitted_by')
                                      or not r.get('proposed_at') or not r.get('proposed_by')):
            emit('ADMIT-002', 'Proposed record must retain proposal, not admission metadata', r)
        elif state == 'rejected' and (not r.get('rejected_at') or not r.get('rejected_by')):
            emit('ADMIT-004', 'Rejected record needs rejection metadata', r)
        start, end = r.get('valid_from'), r.get('valid_to')
        good = True
        if not day(start):
            emit('LIFECYCLE-001', 'Expected quoted ISO calendar date', r, 'valid_from')
            good = False
        if 'valid_to' not in r:
            emit('SCHEMA_INVALID', 'Required field is missing', r, 'valid_to')
            good = False
        elif end is not None and not day(end):
            emit('LIFECYCLE-002', 'Expected quoted ISO calendar date or null', r, 'valid_to')
            good = False
        if good and end is not None and end < start:
            emit('LIFECYCLE-003', 'End precedes start', r, 'valid_to')
            good = False
        if good:
            valid_windows.add(identity)
        if identity.startswith('ACTOR-'):
            for field in ('manager', 'reports_to'):
                if field in r:
                    emit('REL-004', 'Author reporting as a first-class REL', r, field)

    for identity, r in elements.items():
        former = r.get('former_ids', [])
        if not isinstance(former, list) or any(not isinstance(x, str) or not ID.fullmatch(x) for x in former):
            emit('SCHEMA_INVALID', 'Expected a list of retired canonical IDs', r, 'former_ids')
            complete = False
            continue
        for old in former:
            if old in elements or (old in aliases and aliases[old] != identity):
                emit('ELEM-FORMER-ID-001', 'Retired identity collides with another identity', r, 'former_ids', reference=old)
                complete = False
            aliases[old] = identity

    def resolve(reference):
        if not isinstance(reference, str):
            return None
        return elements.get(reference) or elements.get(aliases.get(reference))

    edges = []
    for r in relations:
        before = len(findings)
        kind = r.get('type')
        if not isinstance(kind, str) or kind not in kinds:
            emit('REL-001', 'Missing or unknown relation kind', r, 'type')
            continue
        # Other known relation kinds retain their own validators and semantics.
        if kind not in ('reports_to', 'employment', 'unit_parent'):
            continue
        endpoints = {}
        for field in ('from', 'to'):
            ref = r.get(field)
            endpoint = resolve(ref)
            expected = kinds[kind][field + '_subtype'][0]
            if not isinstance(ref, str) or not ID.fullmatch(ref):
                emit('REL-002', 'Expected one canonical endpoint ID', r, field)
                if not isinstance(ref, str):
                    emit('SCHEMA_INVALID', 'Endpoint must be a scalar string', r, field)
            elif endpoint is None or not admitted(endpoint):
                emit('REL-002', 'Unresolved or unadmitted endpoint', r, field, reference=ref)
            elif (not endpoint['id'].startswith('ACTOR-') or endpoint.get('notation') != 'actor'
                  or endpoint.get('type') != expected):
                emit('REL-002', 'Resolved endpoint has wrong TYPE or subtype', r, field,
                     reference=ref, expected='ACTOR(' + expected + ')',
                     actual=endpoint['id'].split('-')[0] + '(' + str(endpoint.get('type')) + ')')
            else:
                endpoints[field] = endpoint
                if r['id'] in valid_windows and endpoint['id'] in valid_windows:
                    if (r['valid_from'] < endpoint['valid_from'] or
                        (endpoint['valid_to'] is not None and
                         (r['valid_to'] is None or r['valid_to'] > endpoint['valid_to']))):
                        emit('REL-003', 'Relation window exceeds endpoint lifecycle', r, field,
                             reference=ref, interval=[r['valid_from'], r['valid_to']],
                             endpoint_interval=[endpoint['valid_from'], endpoint['valid_to']])
                elif endpoint['id'] not in valid_windows:
                    emit('REL-002', 'Endpoint lifecycle is invalid', r, field, reference=ref)
        if (kind == 'reports_to' and len(endpoints) == 2 and
                endpoints['from']['id'] == endpoints['to']['id']):
            emit('REL-011', 'Reporting endpoints resolve to the same person', r,
                 actor=endpoints['from']['id'])
        if (kind == 'reports_to' and len(findings) == before and admitted(r)
                and r['id'] in valid_windows and len(endpoints) == 2):
            edges.append(dict(r, **{f: e['id'] for f, e in endpoints.items()}))

    edges.sort(key=lambda r: r['id'])
    # Change-point slices preserve inclusive boundaries and all evidence changes.
    points = set()
    for r in edges:
        points.add(r['valid_from'])
        if r['valid_to'] and r['valid_to'] < '9999-12-31':
            points.add((date.fromisoformat(r['valid_to']) + timedelta(days=1)).isoformat())
    points = sorted(points)
    for i, start in enumerate(points):
        end = (date.fromisoformat(points[i + 1]) - timedelta(days=1)).isoformat() if i + 1 < len(points) else None
        live = [r for r in edges if in_effect(r, start)]
        if live and all(r['valid_to'] is not None for r in live):
            finite_end = max(r['valid_to'] for r in live)
            end = min(end, finite_end) if end else finite_end
        graph = {}
        for r in live:
            graph.setdefault(r['from'], {}).setdefault(r['to'], []).append(r['id'])
        # Enumerate each simple directed cycle once, beginning at its least ID.
        for origin in sorted(graph):
            stack = [(origin, [origin], [])]
            while stack:
                current, path, evidence = stack.pop()
                for target, ids in sorted(graph.get(current, {}).items()):
                    if target == origin:
                        findings.append(finding('REL-012', 'Simultaneously effective reporting cycle',
                                                actor_path=path + [origin],
                                                relations=sorted(evidence + ids),
                                                incident_edges=[dict(from_actor=a, to_actor=b, relations=graph[a][b])
                                                                for a, b in zip(path, path[1:] + [origin])],
                                                interval=[start, end], witness=start))
                    elif target > origin and target not in path:
                        stack.append((target, path + [target], evidence + ids))
            managers = graph[origin]
            if len(managers) > 1 and (as_at is None or start <= as_at and (end is None or as_at <= end)):
                findings.append(finding('REL-013', 'Multiple distinct concurrently effective managers',
                                        severity='warning', actor=origin, managers=sorted(managers),
                                        relations=sorted(x for ids in managers.values() for x in ids),
                                        interval=[start, end], witness=as_at or start))

    subject = resolve(actor) if actor is not None else None
    if actor is not None and (subject is None or not admitted(subject) or
                              not subject['id'].startswith('ACTOR-') or subject.get('type') != 'person'):
        findings.append(finding('REL-002', 'Query subject must resolve to an admitted person', field='actor'))
    if actor is not None and as_at is None:
        findings.append(finding('SCHEMA_INVALID', 'Direct queries require an explicit date', field='as_at'))
    valid = not any(f['severity'] == 'error' for f in findings)
    pairs = {}
    if valid and complete and as_at is not None:
        for r in edges:
            if in_effect(r, as_at) and (subject is None or
                    r['from' if direction == 'managers' else 'to'] == subject['id']):
                pairs.setdefault((r['from'], r['to']), []).append(r['id'])
    return dict(complete=complete, valid=valid, as_at=as_at,
                actor=subject['id'] if subject else actor, direction=direction,
                pairs=[dict(from_actor=a, to_actor=b, relations=sorted(ids))
                       for (a, b), ids in sorted(pairs.items())], findings=findings)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--as-at')
    parser.add_argument('--actor')
    parser.add_argument('--direction', choices=('managers', 'reports'), default='managers')
    args = parser.parse_args()
    result = analyse(load_catalogue(args.root), args.as_at, args.actor, args.direction)
    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 2 if not result['complete'] else (0 if result['valid'] else 1)


if __name__ == '__main__':
    raise SystemExit(main())
