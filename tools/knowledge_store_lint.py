#!/usr/bin/env python3
"""
Transitrix Knowledge Store Linter - structural validation, referential
integrity, and duplicate detection over OKF knowledge objects.

Companion to tools/lint.py (which validates canon/ YAML elements). This
script validates the knowledge store's refinement layer instead:
_intake/processed/ (OKF source-document records), _intake/drafts/ (proposer
drafts), and knowledge/ (OKF knowledge objects), per the Quality gates in
patterns/knowledge-store.md.

This is the "proof point" reference implementation for the six quality
gates (Gates 1–4, Gate 5 open-tier consistency, Gate 6 assisted ingest): the methodology owns
the rules (documented in patterns/knowledge-store.md), this script is one
conformant enforcement of them. A different implementation (Studio, DSM, a
custom pipeline) MAY use a different shape/dedup engine as long as it
satisfies the same rules.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from datetime import datetime, date

import yaml

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)
BUNDLE_LINK_RE = re.compile(r"\]\((/knowledge/[^)\s]+\.md)\)")
CONFIDENCE_ENUM = {"observed", "inferred", "assumed"}
CONFIDENCE_RANK = {"assumed": 0, "inferred": 1, "observed": 2}
MAPPING_ENUM = {"confirms", "extends", "proposes", "conflicts"}
CANON_ID_RE = re.compile(r"^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$")
REVIEW_STATUS_ENUM = {"ready", "ambiguous", "blocked"}
DUP_TITLE_SIMILARITY_THRESHOLD = 0.85
HIGH_DEPENDENTS_THRESHOLD = 10
MEDIUM_DEPENDENTS_THRESHOLD = 2
ASSUMED_REVIEW_THRESHOLD = 3


@dataclass
class Finding:
    file: str
    code: str
    severity: str  # "error", "warning", "info"
    message: str


@dataclass
class KnowledgeObject:
    path: Path
    rel_path: str
    frontmatter: Dict
    body: str
    zone: str  # "intake", "draft", or "knowledge"


class KnowledgeStoreLinter:
    def __init__(self, root: str = "."):
        self.root = Path(root)
        self.intake_dir = self.root / "_intake" / "processed"
        self.drafts_dir = self.root / "_intake" / "drafts"
        self.knowledge_dir = self.root / "knowledge"
        self.log_path = self.root / "_intake" / "log.md"
        self.findings: List[Finding] = []
        self.objects: List[KnowledgeObject] = []
        self.freshness_thresholds = self._load_freshness_thresholds()

    def _load_freshness_thresholds(self) -> Dict[str, int]:
        manifest_path = self.root / "transitrix.yaml"
        defaults = {"fresh_days": 180, "stale_days": 730, "floor": 0.3}
        if not manifest_path.exists():
            return defaults
        try:
            manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8")) or {}
            decay = manifest.get("confidence_decay", {})
            knowledge = decay.get("knowledge")
            if knowledge:
                return {**defaults, **knowledge}
            return {**defaults, **decay.get("defaults", {})}
        except Exception:
            return defaults

    def run(self) -> bool:
        print("Transitrix Knowledge Store Linter")
        print(f"Scanning: {self.root}")
        print()

        self._load_objects()
        if not self.objects:
            print("No knowledge-store objects found under _intake/processed/, _intake/drafts/, or knowledge/ — nothing to check.")
            return True

        self._check_structural()
        self._check_referential_integrity()
        self._check_duplicates()
        self._check_freshness()
        self._check_blast_radius_and_confidence()
        self._check_consistency()
        self._check_assisted_ingest()

        self._report()
        errors = [f for f in self.findings if f.severity == "error"]
        return len(errors) == 0

    # --- loading -------------------------------------------------------

    def _load_objects(self):
        for zone, directory in (
            ("intake", self.intake_dir),
            ("draft", self.drafts_dir),
            ("knowledge", self.knowledge_dir),
        ):
            if not directory.exists():
                continue
            for path in sorted(directory.rglob("*.md")):
                if path.name in ("index.md", "log.md"):
                    continue
                rel = str(path.relative_to(self.root)).replace("\\", "/")
                text = path.read_text(encoding="utf-8")
                m = FRONTMATTER_RE.match(text)
                if not m:
                    self.findings.append(Finding(
                        file=rel, code="KS-001", severity="error",
                        message="No YAML frontmatter block found. Every OKF object requires a --- frontmatter --- header.",
                    ))
                    continue
                try:
                    fm = yaml.safe_load(m.group(1)) or {}
                except yaml.YAMLError as e:
                    self.findings.append(Finding(
                        file=rel, code="KS-001", severity="error",
                        message=f"Frontmatter is not valid YAML: {e}",
                    ))
                    continue
                self.objects.append(KnowledgeObject(
                    path=path, rel_path=rel, frontmatter=fm, body=m.group(2), zone=zone,
                ))

    # --- structural (Gate 1, Gate 4, item 5) ----------------------------

    def _check_structural(self):
        for obj in self.objects:
            fm = obj.frontmatter

            if not fm.get("type"):
                self.findings.append(Finding(
                    obj.rel_path, "KS-002", "error",
                    "Missing required field `type:`.",
                ))

            if obj.zone == "intake":
                if fm.get("type") != "source-document":
                    self.findings.append(Finding(
                        obj.rel_path, "KS-003", "error",
                        f"_intake/processed/ record must carry `type: source-document` (Gate 1 quarantine); found `{fm.get('type')!r}`.",
                    ))
                if not fm.get("source"):
                    self.findings.append(Finding(
                        obj.rel_path, "KS-004", "error",
                        "Missing `source:` — required before admission to _intake/processed/ (Gate 4).",
                    ))

            if obj.zone in ("knowledge", "draft"):
                confidence = fm.get("confidence")
                if not confidence:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-005", "error",
                        f"Missing `confidence:` — required before promotion to "
                        f"{'knowledge/' if obj.zone == 'knowledge' else '_intake/drafts/'} "
                        f"(Gate 4). No default is permitted.",
                    ))
                elif confidence not in CONFIDENCE_ENUM:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-005", "error",
                        f"`confidence: {confidence}` is not one of {sorted(CONFIDENCE_ENUM)}.",
                    ))
                if not fm.get("timestamp"):
                    self.findings.append(Finding(
                        obj.rel_path, "KS-006", "warning",
                        "Missing `timestamp:` (recommended — tracks last modification).",
                    ))
                if not fm.get("source"):
                    self.findings.append(Finding(
                        obj.rel_path, "KS-004", "error",
                        "Missing `source:` — required (Gate 4 provenance).",
                    ))

    # --- referential integrity (item 6a) --------------------------------

    def _check_referential_integrity(self):
        existing = {obj.rel_path for obj in self.objects if obj.zone == "knowledge"}
        # Bundle-relative links are rooted at the knowledge store root, e.g. /knowledge/foo.md.
        for obj in self.objects:
            for target in BUNDLE_LINK_RE.findall(obj.body):
                target_rel = target.lstrip("/")
                if target_rel not in existing:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-007", "error",
                        f"Dangling link to `{target}` — no such file under knowledge/.",
                    ))

    # --- duplicate detection (item 6b, Gate 2) --------------------------

    def _check_duplicates(self):
        promotable = [o for o in self.objects if o.zone in ("knowledge", "draft")]
        titles = []
        for obj in promotable:
            title = obj.frontmatter.get("title") or obj.path.stem
            titles.append((obj, str(title).strip().lower()))

        seen_pairs = set()
        for i, (obj_a, title_a) in enumerate(titles):
            for obj_b, title_b in titles[i + 1:]:
                pair = frozenset((obj_a.rel_path, obj_b.rel_path))
                if pair in seen_pairs:
                    continue
                ratio = SequenceMatcher(None, title_a, title_b).ratio()
                if ratio >= DUP_TITLE_SIMILARITY_THRESHOLD:
                    seen_pairs.add(pair)
                    self.findings.append(Finding(
                        obj_a.rel_path, "KS-008", "warning",
                        f"Title looks like a possible duplicate of `{obj_b.rel_path}` "
                        f"(similarity {ratio:.0%}) — confirm this Confirms/Extends an existing "
                        f"concept rather than silently minting a new one (Gate 2).",
                    ))

    # --- freshness (CONTRACT §11.3) ----------------------------------------

    def _check_freshness(self):
        today = date.today()
        stale_days = self.freshness_thresholds.get("stale_days", 730)
        for obj in self.objects:
            if obj.zone != "knowledge":
                continue
            timestamp_str = obj.frontmatter.get("timestamp")
            if not timestamp_str:
                continue
            try:
                timestamp = datetime.fromisoformat(str(timestamp_str).strip()).date()
                age_days = (today - timestamp).days
                if age_days >= stale_days:
                    self.findings.append(Finding(
                        obj.rel_path, "FRESHNESS-001", "warning",
                        f"Knowledge object is stale (timestamp: {timestamp}, age {age_days} days >= {stale_days} days). Refresh by re-curation.",
                    ))
            except (ValueError, AttributeError):
                pass

    # --- blast radius + confidence cross-check (Gate 3, Gate 4) ---------

    def _check_blast_radius_and_confidence(self):
        # Dependent count = how many other knowledge/ objects link to this one.
        dependents: Dict[str, int] = {o.rel_path: 0 for o in self.objects if o.zone == "knowledge"}
        for obj in self.objects:
            for target in BUNDLE_LINK_RE.findall(obj.body):
                target_rel = target.lstrip("/")
                if target_rel in dependents and target_rel != obj.rel_path:
                    dependents[target_rel] += 1

        for obj in self.objects:
            if obj.zone != "knowledge":
                continue
            count = dependents.get(obj.rel_path, 0)
            if count >= HIGH_DEPENDENTS_THRESHOLD:
                tier = "High"
            elif count >= MEDIUM_DEPENDENTS_THRESHOLD:
                tier = "Medium"
            else:
                tier = "Low"
            self.findings.append(Finding(
                obj.rel_path, "KS-009", "info",
                f"Blast radius: {tier} ({count} dependent object(s)). "
                f"{'Human sign-off required before promotion.' if tier == 'High' else ''}".strip(),
            ))

            confidence = obj.frontmatter.get("confidence")
            if confidence == "assumed" and count >= ASSUMED_REVIEW_THRESHOLD:
                self.findings.append(Finding(
                    obj.rel_path, "KS-010", "warning",
                    f"`confidence: assumed` with {count} dependents (>= {ASSUMED_REVIEW_THRESHOLD}) — "
                    f"MUST NOT be promoted without a review note in _intake/log.md explaining the "
                    f"assumption (Gate 4).",
                ))

    # --- scoped consistency (Gate 5 open tier) ---------------------------

    def _norm_source_path(self, source: str) -> str:
        s = str(source).strip().replace("\\", "/")
        if s.startswith("/"):
            s = s.lstrip("/")
        return s

    def _intake_by_rel(self) -> Dict[str, KnowledgeObject]:
        return {o.rel_path: o for o in self.objects if o.zone == "intake"}

    def _knowledge_by_rel(self) -> Dict[str, KnowledgeObject]:
        return {o.rel_path: o for o in self.objects if o.zone == "knowledge"}

    def _resolve_intake_source(self, source: Optional[str]) -> Optional[KnowledgeObject]:
        if not source:
            return None
        norm = self._norm_source_path(source)
        intake = self._intake_by_rel()
        if norm in intake:
            return intake[norm]
        # Also match when source omits leading path segments.
        for rel, obj in intake.items():
            if rel.endswith("/" + norm) or rel == norm:
                return obj
        return None

    def _conflicts_with_resolves(self, target: str, knowledge: Dict[str, KnowledgeObject]) -> bool:
        if not target:
            return False
        t = str(target).strip()
        if t.startswith("/"):
            t = t.lstrip("/")
        if t in knowledge:
            return True
        if CANON_ID_RE.match(t):
            return True
        return False

    def _log_text(self) -> str:
        try:
            return self.log_path.read_text(encoding="utf-8")
        except OSError:
            return ""

    def _has_conflicts_log_entry(self, obj: KnowledgeObject) -> bool:
        text = self._log_text()
        if not text:
            return False
        base = obj.path.name
        for line in text.splitlines():
            if "[conflicts]" not in line.lower():
                continue
            if base in line or obj.rel_path in line:
                return True
        return False

    def _check_consistency(self):
        knowledge = self._knowledge_by_rel()
        for obj in self.objects:
            if obj.zone not in ("knowledge", "draft"):
                continue
            fm = obj.frontmatter
            mapping = fm.get("mapping")
            if mapping is not None:
                if mapping not in MAPPING_ENUM:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-011", "error",
                        f"`mapping: {mapping}` is not one of {sorted(MAPPING_ENUM)} (Gate 5 / Gate 2 vocabulary).",
                    ))
                elif mapping == "conflicts":
                    target = fm.get("conflicts_with")
                    if not self._conflicts_with_resolves(str(target or ""), knowledge):
                        self.findings.append(Finding(
                            obj.rel_path, "KS-012", "error",
                            "`mapping: conflicts` requires a resolvable `conflicts_with:` "
                            "(`/knowledge/…` path to an existing object, or a typed canon id).",
                        ))
                    if not self._has_conflicts_log_entry(obj) and obj.zone == "knowledge":
                        self.findings.append(Finding(
                            obj.rel_path, "KS-014", "error",
                            "`mapping: conflicts` requires a `[conflicts]` hold entry in "
                            "_intake/log.md before promotion (Gate 5).",
                        ))

            src = self._resolve_intake_source(fm.get("source"))
            if src:
                obj_conf = fm.get("confidence")
                src_conf = src.frontmatter.get("confidence")
                if (
                    obj_conf in CONFIDENCE_RANK
                    and src_conf in CONFIDENCE_RANK
                    and CONFIDENCE_RANK[obj_conf] > CONFIDENCE_RANK[src_conf]
                ):
                    self.findings.append(Finding(
                        obj.rel_path, "KS-013", "warning",
                        f"`confidence: {obj_conf}` ranks higher than the cited source-document "
                        f"`{src.rel_path}` (`confidence: {src_conf}`) — epistemic ordering "
                        f"violation (Gate 5). Downgrade the object or upgrade the source assessment.",
                    ))

    # --- assisted ingest (Gate 6) ----------------------------------------

    def _check_assisted_ingest(self):
        for obj in self.objects:
            fm = obj.frontmatter
            if obj.zone == "knowledge":
                if fm.get("review_status") is not None:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-015", "error",
                        "`review_status:` is a draft-only field — remove it before promotion "
                        "to knowledge/ (Gate 6).",
                    ))
                if fm.get("ambiguity_note"):
                    self.findings.append(Finding(
                        obj.rel_path, "KS-015", "error",
                        "`ambiguity_note:` is a draft-only field — remove it before promotion "
                        "to knowledge/ (Gate 6).",
                    ))
            elif obj.zone == "draft":
                status = fm.get("review_status")
                if status not in REVIEW_STATUS_ENUM:
                    self.findings.append(Finding(
                        obj.rel_path, "KS-016", "error",
                        f"Draft requires `review_status:` one of {sorted(REVIEW_STATUS_ENUM)} "
                        f"(Gate 6); found {status!r}.",
                    ))
                elif status == "ambiguous":
                    note = fm.get("ambiguity_note")
                    if not note or not str(note).strip():
                        self.findings.append(Finding(
                            obj.rel_path, "KS-017", "error",
                            "`review_status: ambiguous` requires a non-empty `ambiguity_note:` "
                            "(Gate 6).",
                        ))

    # --- reporting -------------------------------------------------------

    def _report(self):
        errors = [f for f in self.findings if f.severity == "error"]
        warnings = [f for f in self.findings if f.severity == "warning"]
        infos = [f for f in self.findings if f.severity == "info"]

        if errors:
            print("ERRORS:\n")
            for f in errors:
                print(f"  {f.file}  [{f.code}]")
                print(f"  -> {f.message}\n")

        if warnings:
            print("WARNINGS:\n")
            for f in warnings:
                print(f"  {f.file}  [{f.code}]")
                print(f"  -> {f.message}\n")

        if infos:
            print("INFO:\n")
            for f in infos:
                print(f"  {f.file}  [{f.code}] {f.message}")
            print()

        print(f"Objects scanned: {len(self.objects)}")
        print(f"Errors: {len(errors)}  Warnings: {len(warnings)}")

        if errors:
            print("\nKnowledge store validation FAILED.")
        else:
            print("\nKnowledge store validation passed" + (" with warnings." if warnings else "."))


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    root_arg = sys.argv[1] if len(sys.argv) > 1 else os.getenv("KNOWLEDGE_STORE_ROOT", ".")
    linter = KnowledgeStoreLinter(root_arg)
    ok = linter.run()
    sys.exit(0 if ok else 1)
