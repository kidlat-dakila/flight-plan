#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

BLAST_HEADING="#fixture-segment-1-blast-diagram-heading"

open_blast() {
  open_board_full_screen "$BLAST_HEADING"
}

blast_scenario() {
  local poster="$1"
  click_marked "$(node_named "router.tsx")"
  browse wait "$READ_MS"
  bring_into_view "src/main.tsx"
  click_marked "$(node_named "src/main.tsx")"
  browse wait "$READ_MS"
  bring_into_view "use-pokemon.ts"
  click_marked "$(node_named "use-pokemon.ts")"
  browse wait "$READ_MS"
  browse press Escape
  browse wait "$STEP_MS"
  click_marked "$(control_named "Import bound")"
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  click_marked "$(control_named "Export bound")"
  browse press t
  browse wait "$READ_MS"
}

record_review_clip blast "$DEMO_REVIEW_URL" open_blast blast_scenario
