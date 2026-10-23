#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

TRACE_HEADING="#trace-diagram-heading"
REST_X=110
REST_Y=140
REST_STEPS=12
REST_DURATION_MS=300

row_named() {
  echo "[...$BOARD.querySelectorAll('button')].find(element=>(element.getAttribute('aria-label')||'').startsWith('$1'))"
}

waypoint_named() {
  echo "[...$PANEL.querySelectorAll('[data-waypoint-mark]')].find(element=>element.getAttribute('aria-label').includes('$1'))"
}

open_trace() {
  open_board_full_screen "$TRACE_HEADING"
}

rest_pointer() {
  browse mouse move "$REST_X" "$REST_Y" --steps "$REST_STEPS" --duration "$REST_DURATION_MS"
  POINTER_X="$REST_X"
  POINTER_Y="$REST_Y"
}

click_then_rest() {
  mark "$1"
  browse click "#$TARGET_ID" --human
  rest_pointer
  browse wait "$READ_MS"
}

trace_scenario() {
  local poster="$1"
  click_then_rest "$(node_named "add_pokemon")"
  browse press Escape
  browse wait "$STEP_MS"
  click_then_rest "$(row_named "Data: Commits the insert to the database")"
  click_marked "$(waypoint_named "Added the commit of the insert")"
  rest_pointer
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  browse press Escape
  browse wait "$STEP_MS"
  park_pointer
  browse wait "$READ_MS"
}

record_review_clip trace "$FASTAPI_REVIEW_URL" open_trace trace_scenario
