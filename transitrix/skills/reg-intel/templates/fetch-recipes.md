# Fetch recipes — per source family

How to wire the two adopter hooks in [`reg-intel-daily.sh`](reg-intel-daily.sh) — `observe_signal` (the cheap change signal for `check-signal --observed`) and `fetch_body` (the full source body for `fetch-snapshot --from`) — for the common regulatory source families. The reg-intel CLI is **network-free** by design: it does the comparison + state, you do the fetch. These recipes are starting points, not a vendored fetcher.

## The rules that apply to every family

- **Prefer APIs / feeds over HTML scraping.** Versioned, structured endpoints are far less prone to cosmetic-diff noise than rendered pages. Scraping is the fallback, not the default.
- **The cheapest signal first.** For `observe_signal`, an `ETag` / `Last-Modified` header or an API `updated` / version field is a HEAD-or-tiny-GET; only fetch the full body (`fetch_body`) when `check-signal` says the source moved.
- **JS-rendered sources.** Some portals render content via JavaScript; `fetch_body` then needs a headless browser. Record that on the codex artefact (`scan.fetch_mode: js`) so the cost is explicit — the default stays plain HTTP.
- **Never** scrape Russia-based / Russia-disinfo sources (project constraint), and never follow links outward to crawl.

## US — eCFR (Code of Federal Regulations)

- **API (preferred):** the eCFR API exposes structure + content as JSON/XML and a per-title "last amended" date.
  - `observe_signal`: read the section's `latest_amended_on` (or the API's `updated` field) → `echo "amended_date <value>"`.
  - `fetch_body`: GET the section's XML/JSON from the eCFR content endpoint to a local file → echo its path.

## US — Federal Register (Final Rules, notices)

- **API (preferred):** the Federal Register API returns documents as JSON with stable `document_number` + `publication_date`.
  - `observe_signal`: the document's `publication_date` / `document_number` → `echo "api_version <document_number>"`.
  - `fetch_body`: GET the document JSON (or the linked full-text) to a local file.
- A Final Rule is typically **static** (`monitoring_needed: false`) and points consumers at the live CFR section via `monitor_instead[]` — watch the eCFR counterpart, not the rule.

## EU — EUR-Lex / CELLAR

- **API (preferred):** the CELLAR SPARQL / REST endpoints expose CELEX-identified acts with consolidation dates and ETags.
  - `observe_signal`: the consolidation date or the HTTP `ETag` of the act's resource → `echo "etag <value>"` or `echo "amended_date <value>"`.
  - `fetch_body`: GET the consolidated text (HTML/XML) by CELEX id to a local file.

## Generic HTML page (no API, no feed)

The fallback when a source publishes only a web page.

- `observe_signal`: a `HEAD` request for `ETag` / `Last-Modified` → `echo "etag <value>"` or `echo "last_modified <value>"`. If the page exposes neither, echo nothing — the driver then calls `check-signal --accept-no-signal` and the gate degrades to "always fetch".
- `fetch_body`: `GET` the page (with a JS-render step if the content is script-rendered) to a local file. Consider hashing only the normative region (strip nav/footer) to reduce cosmetic-diff noise once content-aware diffing lands.

## Wiring summary

```sh
observe_signal() {           # echo "<method> <value>" or nothing
  case "$1" in
    REGULATION-CFR-*)   echo "amended_date $(curl -s "$ECFR_API/.../$1" | jq -r .latest_amended_on)";;
    REGULATION-EU-*)    echo "etag $(curl -sI "$EURLEX_URL_FOR_$1" | awk -F': ' '/ETag/{print $2}' | tr -d '\r')";;
    *)                  : ;;   # no cheap signal → driver uses --accept-no-signal
  esac
}

fetch_body() {               # echo a local file path
  out="$(mktemp --suffix=.xml)"
  curl -s "$(url_for "$1")" -o "$out" && echo "$out"
}
```

`method` must be one of `etag | last_modified | api_version | amended_date | fragment_hash` (the `check-signal --method` enum). Keep the per-source URLs / API keys in `operations/config/reg-intel/` (committed operational settings, [`method/06-team-operations.md`](https://raw.githubusercontent.com/transitrix/methodology/main/method/06-team-operations.md) §3.3), never hard-coded in the driver.
