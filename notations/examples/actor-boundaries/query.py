"""Query the optional example convention, not a Transitrix core validator.

Requires Python 3 and PyYAML. See README.md for scope and expected output.
"""
import argparse
from datetime import date
from pathlib import Path
import re

import yaml

SCHEME = "operational-perimeter-v1"


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("dates must be quoted YYYY-MM-DD strings")
    return date.fromisoformat(value)


def window(start, end):
    first, last = day(start), date.max if end is None else day(end)
    if first >= last:
        raise ValueError("empty or reversed interval")
    return first, last


def load(root):
    actors = {}
    for path in sorted((root / "canon/elements/02_business/actors").glob("*.yaml")):
        actor = yaml.safe_load(path.read_text(encoding="utf-8"))
        identity = actor["id"]
        if identity in actors:
            raise ValueError(f"duplicate identity: {identity}")
        if actor["notation"] != "actor" or actor["type"] not in {"person", "business_unit", "system"}:
            raise ValueError(f"invalid actor: {identity}")
        window(actor["valid_from"], actor["valid_to"])
        actors[identity] = actor
    if not actors:
        raise ValueError("no actors found")
    return actors


def check(actors):
    """Check all assessments before filtering: invalid data never becomes unknown."""
    for identity, actor in actors.items():
        extension = actor.get("extensions", {})
        boundary = extension.get("example_boundary")
        if "example_boundary" in extension:
            if not isinstance(boundary, dict):
                raise ValueError("boundary definition must be a mapping")
            if (actor["type"] != "business_unit" or boundary["scheme"] != SCHEME
                    or not isinstance(boundary["definition"], str) or not boundary["definition"].strip()):
                raise ValueError(f"invalid boundary definition: {identity}")
        membership = extension.get("example_boundary_membership")
        if "example_boundary_membership" not in extension:
            continue
        if not isinstance(membership, dict):
            raise ValueError("membership must be a mapping")
        if membership["scheme"] != SCHEME or not isinstance(membership["assessments"], list):
            raise ValueError(f"invalid membership scheme: {identity}")
        by_boundary = {}
        for row in membership["assessments"]:
            target = actors.get(row["boundary_ref"])
            if target is None or "example_boundary" not in target.get("extensions", {}):
                raise ValueError(f"unresolved boundary: {row['boundary_ref']}")
            if row["classification"] not in {"internal", "external", "unknown"}:
                raise ValueError("invalid classification")
            if not isinstance(row["basis"], str) or not row["basis"].strip():
                raise ValueError("assessment basis required")
            first, last = window(row["from_date"], row["until_date"])
            for host in (actor, target):
                host_first, host_last = window(host["valid_from"], host["valid_to"])
                if not host_first <= first < last <= host_last:
                    raise ValueError("assessment outside actor or boundary lifetime")
                if bool(actor.get("example")) != bool(target.get("example")):
                    raise ValueError("example and real records must not be mixed")
            intervals = by_boundary.setdefault(row["boundary_ref"], [])
            if any(first < prior_last and prior_first < last for prior_first, prior_last in intervals):
                raise ValueError("overlapping assessments for one actor and boundary")
            intervals.append((first, last))


def query(actors, boundary_ref, as_of):
    check(actors)
    boundary = actors.get(boundary_ref)
    if boundary is None or "example_boundary" not in boundary.get("extensions", {}):
        raise ValueError("query boundary is not defined")
    first, last = window(boundary["valid_from"], boundary["valid_to"])
    if not first <= as_of < last:
        raise ValueError("query boundary is not effective on this date")
    results = []
    for identity, actor in sorted(actors.items()):
        first, last = window(actor["valid_from"], actor["valid_to"])
        if not first <= as_of < last:
            continue
        rows = actor.get("extensions", {}).get("example_boundary_membership", {}).get("assessments", [])
        matches = [row for row in rows if row["boundary_ref"] == boundary_ref
                   and window(row["from_date"], row["until_date"])[0] <= as_of
                   < window(row["from_date"], row["until_date"])[1]]
        results.append((identity, matches[0]["classification"] if matches else "unknown",
                        "recorded" if matches else "unassessed"))
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("boundary_ref")
    parser.add_argument("as_of")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    try:
        for result in query(load(args.root), args.boundary_ref, day(args.as_of)):
            print("\t".join(result))
    except (ValueError, KeyError, TypeError, AttributeError, yaml.YAMLError) as error:
        parser.exit(1, f"Invalid example convention: {error}\n")
