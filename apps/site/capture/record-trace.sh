#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

TRACE_HEADING="#fixture-segment-2-trace-diagram-heading"

row_named() {
  echo "[...$BOARD.querySelectorAll('button')].find(element=>(element.getAttribute('aria-label')||'').startsWith('$1'))"
}

waypoint_named() {
  echo "[...$PANEL.querySelectorAll('[data-waypoint-mark]')].find(element=>element.getAttribute('aria-label').includes('$1'))"
}

open_trace() {
  open_board_full_screen "$TRACE_HEADING"
}

trace_scenario() {
  local poster="$1"
  click_marked "$(node_named "PokemonPage")"
  bring_into_view "PokemonPage"
  browse wait "$READ_MS"
  click_marked "$(row_named "Hooks: Gets the Pokemon that match the filters")"
  browse wait "$READ_MS"
  click_marked "$(row_named "Steps: Renders one line per Pokemon with its level and types")"
  browse wait "$READ_MS"
  bring_into_view "usePokemon"
  click_marked "$(node_named "usePokemon")"
  browse wait "$READ_MS"
  click_marked "$(row_named "Effects: Loads the Pokemon again when the trainer changes")"
  browse wait "$STEP_MS"
  click_marked "$(waypoint_named "to load the Pokemon that match the filters")"
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  browse press Escape
  browse wait "$STEP_MS"
  return_board_to_start
  park_pointer
  browse wait "$READ_MS"
}

record_review_clip trace "$DEMO_REVIEW_URL" open_trace trace_scenario
