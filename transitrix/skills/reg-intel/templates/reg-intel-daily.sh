#!/usr/bin/env bash
# reg-intel-daily.sh — example daily driver for the Transitrix reg-intel scan.
#
# ONE scheduled task, not N: this runs once a day and filters the watched codex
# sources by `scan.next_scan_due` (`list-due`); per-source cadence (`scan_frequency`)
# decides what lands in the due set on any given day. Copy this into your adopter repo
# (e.g. operations/bin/) and adapt the two hook functions marked TODO.
#
# Boundary: the deterministic + state steps run here in shell (list-due, check-signal,
# update-scan, digest). The two steps that need a real fetch and an LLM —
# observing the change signal, and segment/classify extraction — are delegated to the
# hooks below: an adopter wires them to their fetch helper and to the reg-intel SKILL
# running under Claude / Copilot. THE ONE RULE holds throughout: nothing is admitted
# to canon; the run ends at a human-gated review digest.
set -euo pipefail

ORG_ROOT="${1:-$PWD}"
CLI="npx @transitrix/reg-intel-cli"
TODAY="$(date -u +%F)"
RUN_ID="reg-intel-${TODAY}"

# --- adopter hooks -----------------------------------------------------------
# TODO: fetch the cheap change signal for $1 (a CODEX-ID) and echo "<method> <value>".
# Prefer ETag / Last-Modified / an API version field (see fetch-recipes.md). Echo
# nothing if the source exposes no cheap signal.
observe_signal() { :; }   # echo "etag W/\"abc123\""

# TODO: fetch the full source body for $1 (a CODEX-ID) to a local file and echo its
# path. Prefer APIs/feeds over HTML scraping (see fetch-recipes.md).
fetch_body() { :; }       # echo "/tmp/${1}.html"

# TODO: run the reg-intel SKILL (Claude / Copilot) to segment + classify the snapshot
# $2 for source $1, writing proposed SEGMENT/REQUIREMENT/CONSTRAINT artefacts. This is
# the LLM step; a shell driver cannot do it. Leave as a no-op to stop at snapshots and
# extract manually, or invoke your agent runner here.
run_extraction() { :; }   # e.g. claude -p "/transitrix:reg-intel segment+classify $1 $2"
# -----------------------------------------------------------------------------

echo "reg-intel daily — ${RUN_ID} — org ${ORG_ROOT}"
due_json="$($CLI list-due "$ORG_ROOT" --as-of "$TODAY" --json)"

# Iterate the due CODEX-IDs (jq optional; falls back to grep if jq is absent).
if command -v jq >/dev/null 2>&1; then
  ids="$(printf '%s' "$due_json" | jq -r '.[] | select(.monitoring_needed == true) | .id')"
else
  ids="$(printf '%s' "$due_json" | grep -oE '"id": *"[^"]+"' | sed -E 's/.*"id": *"([^"]+)".*/\1/')"
fi

for id in $ids; do
  [ -n "$id" ] || continue
  sig="$(observe_signal "$id" || true)"
  if [ -n "$sig" ]; then
    method="${sig%% *}"; value="${sig#* }"
    out="$($CLI check-signal "$id" --observed "$value" --method "$method" --today "$TODAY" --json)"
  else
    out="$($CLI check-signal "$id" --accept-no-signal --today "$TODAY" --json)"
  fi
  proceed="$(printf '%s' "$out" | grep -oE '"proceed": *(true|false)' | grep -oE '(true|false)')"
  [ "$proceed" = "true" ] || { echo "  ${id}: unchanged"; continue; }

  body="$(fetch_body "$id" || true)"
  if [ -z "$body" ]; then echo "  ${id}: fetch failed — left in the due set"; continue; fi
  snap_out="$($CLI fetch-snapshot "$id" --from "$body" --today "$TODAY" --json)"
  snap="$(printf '%s' "$snap_out" | grep -oE '"snapshot": *"[^"]+"' | sed -E 's/.*"snapshot": *"([^"]+)".*/\1/')"
  outcome="$(printf '%s' "$snap_out" | grep -oE '"outcome": *"[^"]+"' | sed -E 's/.*"outcome": *"([^"]+)".*/\1/')"
  if [ "$outcome" = "bytes_identical" ]; then echo "  ${id}: signal moved, bytes identical"; $CLI update-scan "$id" --today "$TODAY" >/dev/null; continue; fi

  run_extraction "$id" "$ORG_ROOT/$snap"   # LLM: writes segments + candidates (+ amendment on drift)
  $CLI update-scan "$id" --today "$TODAY" --change "scanned ${TODAY}; see digest" --review >/dev/null
  echo "  ${id}: ${outcome} — extracted, scan bumped"
done

# Validate everything staged, then assemble the human review digest.
$CLI validate "$ORG_ROOT" || echo "  (validate flagged items — see the digest)"
$CLI digest "$ORG_ROOT" --run-id "$RUN_ID" --as-of "$TODAY"
echo "reg-intel daily done — review _intake/processing/review-digest.yaml; a human admits."
