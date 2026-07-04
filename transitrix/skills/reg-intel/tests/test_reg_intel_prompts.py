#!/usr/bin/env python3
"""Bundle test for the Transitrix Reg-Intel extraction prompts (SKILL Steps 4–5).

Deterministic, no-API-key, no-network. Checks the segmentation + classification
prompts are present, their frontmatter parses, and they encode the contracts the
SKILL.md run loop depends on — in particular the CLASSIFY default rule
(positive obligation → REQUIREMENT) that the ingest contract requires.

Run:  python transitrix/skills/reg-intel/tests/test_reg_intel_prompts.py
Exit: 0 = all pass; 1 = a check failed.
"""

import os
import re
import sys

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("FAIL: PyYAML is required (pip install pyyaml).")

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)
PROMPTS = os.path.join(SKILL_DIR, "prompts")

_failures = []


def check(cond, msg):
    if not cond:
        _failures.append(msg)
    return cond


def read(path):
    return open(path, encoding="utf-8").read()


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return yaml.safe_load(m.group(1)) if m else None


# ── presence + frontmatter ───────────────────────────────────────

for name in ("segment.md", "classify.md", "README.md"):
    check(os.path.isfile(os.path.join(PROMPTS, name)), f"prompts/{name} missing")

for name, step, emits in (("segment.md", "segment", "SEGMENT"), ("classify.md", "classify", "REQUIREMENT")):
    p = os.path.join(PROMPTS, name)
    if not os.path.isfile(p):
        continue
    fm = frontmatter(read(p))
    if check(isinstance(fm, dict), f"prompts/{name} frontmatter does not parse"):
        check(fm.get("step") == step, f"prompts/{name} frontmatter step must be {step!r}")
        check("version" in fm and "status" in fm, f"prompts/{name} frontmatter missing version/status")
        check(emits in (fm.get("emits") or []), f"prompts/{name} frontmatter emits must include {emits}")

# ── SEGMENT prompt encodes the segmentation contract ─────────────

if os.path.isfile(os.path.join(PROMPTS, "segment.md")):
    seg = read(os.path.join(PROMPTS, "segment.md"))
    check('"segments"' in seg, "segment prompt must emit a segments[] result contract")
    check("locator" in seg and "text_excerpt" in seg, "segment prompt must carry locator + text_excerpt")
    for signal in ("shall", "must not", "is required to"):
        check(signal in seg, f"segment prompt must name the obligation signal {signal!r}")
    check("atomic" in seg.lower() and "self-contained" in seg.lower(),
          "segment prompt must require atomic, self-contained segments")
    check("extraction_confidence" in seg and "source_quality" in seg,
          "segment prompt must keep the two trust axes distinct")

# ── CLASSIFY prompt encodes the default rule + level mapping ─────

if os.path.isfile(os.path.join(PROMPTS, "classify.md")):
    cls = read(os.path.join(PROMPTS, "classify.md"))
    low = cls.lower()
    check("positive obligation" in low and "default" in low,
          "classify prompt must state the positive-obligation → REQUIREMENT default")
    check("REQUIREMENT" in cls and "CONSTRAINT" in cls, "classify prompt must name both kinds")
    check("DEFINITIONAL" in cls, "classify prompt must include the CONSTRAINT(DEFINITIONAL) branch")
    for level in ("SHALL", "SHALL_NOT", "SHOULD", "MAY"):
        check(level in cls, f"classify prompt must map obligation_level {level}")
    check("derived_from" in cls, "classify prompt must cite the SEGMENT via derived_from")
    check("ambiguous_alt" in cls and "low" in low,
          "classify prompt must surface ambiguity (low confidence + alternate classification), not resolve it")

# ── README encodes the default rule too ──────────────────────────

if os.path.isfile(os.path.join(PROMPTS, "README.md")):
    rd = read(os.path.join(PROMPTS, "README.md")).lower()
    check("positive obligation" in rd and "default" in rd,
          "prompts/README must document the positive-obligation → REQUIREMENT default")
    check("propose, never admit" in rd, "prompts/README must state the propose-never-admit rule")

if _failures:
    print("FAIL - Transitrix Reg-Intel extraction prompts:")
    for f in _failures:
        print(f"  - {f}")
    sys.exit(1)
print("PASS - Transitrix Reg-Intel extraction prompts: all checks passed.")
sys.exit(0)
