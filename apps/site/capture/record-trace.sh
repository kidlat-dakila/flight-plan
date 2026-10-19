#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

JOURNEY_HEADING="#fixture-segment-4-journey-flow-diagram-heading"

row_named() {
  echo "[...$BOARD.querySelectorAll('button')].find(element=>(element.getAttribute('aria-label')||'').startsWith('$1'))"
}

waypoint_named() {
  echo "[...$PANEL.querySelectorAll('button[aria-expanded]')].find(element=>element.textContent.includes('$1'))"
}

open_journey() {
  open_board_full_screen "$JOURNEY_HEADING"
}

journey_scenario() {
  local poster="$1"
  click_marked "$(node_named "ViewOrdersPage")"
  bring_into_view "ViewOrdersPage"
  browse wait "$READ_MS"
  click_marked "$(row_named "Hooks: The orders loaded from the API")"
  browse wait "$READ_MS"
  click_marked "$(row_named "Steps: Renders one table row per order")"
  browse wait "$READ_MS"
  bring_into_view "useOrders"
  click_marked "$(node_named "useOrders")"
  browse wait "$READ_MS"
  click_marked "$(row_named "Effects: The query that loads the orders")"
  browse wait "$STEP_MS"
  click_marked "$(waypoint_named "to load every order")"
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  browse press Escape
  browse wait "$STEP_MS"
  browse press t
  browse wait "$READ_MS"
}

record_review_clip journey "$REVIEW_URL" open_journey journey_scenario
