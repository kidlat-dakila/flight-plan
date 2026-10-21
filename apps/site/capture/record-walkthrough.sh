#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
ONLY="${3:-}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

WALKTHROUGH_HEADING="document.getElementById('fixture-segment-1-code-walkthrough-heading')"
FORM_FILE="#fixture-segment-1-file-3"
RISK_WAYPOINT="[...document.querySelectorAll('[data-waypoint-mark]')].find(element=>element.getAttribute('aria-label').startsWith('Risk waypoint'))"
RISK_BOX="[...document.querySelectorAll('section[aria-label]')].find(section=>section.getAttribute('aria-label')==='Added the query of the trainers')"
FIRST_WAYPOINT="document.querySelector('#fixture-segment-1-code-walkthrough [data-waypoint-mark]')"

toggle_of() {
  echo "($1).querySelector('button[aria-expanded]')"
}

button_in() {
  echo "[...($1).querySelectorAll('button')].find(element=>element.textContent.trim()==='$2')"
}

filter_option() {
  echo "[...document.querySelectorAll('[role=menuitemcheckbox]')].find(element=>element.textContent.trim().startsWith('$1'))"
}

name_in_form() {
  echo "[...document.querySelectorAll('$FORM_FILE [data-line=\"$1\"] [data-slot=hover-card-trigger]')].find(element=>element.textContent==='$2')"
}

form_line() {
  echo "document.querySelector('$FORM_FILE [data-line=\"$1\"]')"
}

settle_on_risk_waypoint() {
  settle_on "$RISK_WAYPOINT" 240
}

waypoints_scenario() {
  local poster="$1"
  click_marked "$RISK_WAYPOINT"
  browse wait "$READ_MS"
  scroll_smoothly_to "$(button_in "$RISK_BOX" "Preview the fix")" 420
  browse wait "$READ_MS"
  click_marked "$(button_in "$RISK_BOX" "Preview the fix")"
  scroll_smoothly_to "$(button_in "$RISK_BOX" "Hide the fix")" 200
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  click_marked "$(button_in "$RISK_BOX" "Hide the fix")"
  scroll_smoothly_to "$RISK_BOX" 240
  click_marked "$(toggle_of "$RISK_BOX")"
  park_pointer
}

settle_on_walkthrough() {
  settle_on "$WALKTHROUGH_HEADING" 80
}

set_component_and_state_filter() {
  click_marked "$(control_named "Filter")"
  click_marked "$(filter_option "Component")"
  click_marked "$(filter_option "UI state")"
  browse press Escape
  browse wait "$STEP_MS"
}

filters_scenario() {
  local poster="$1"
  click_marked "$FIRST_WAYPOINT"
  browse wait "$READ_MS"
  set_component_and_state_filter
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  set_component_and_state_filter
  click_marked "$FIRST_WAYPOINT"
  settle_on_walkthrough
  park_pointer
}

settle_on_form() {
  settle_on "$(form_line 12)" 200
}

tooltips_scenario() {
  local poster="$1"
  hover_marked "$(name_in_form 12 "usePokemonFilters")"
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  glide_pointer_to 120 "$((HEIGHT - 260))"
  browse wait "$STEP_MS"
  hover_marked "$(name_in_form 16 "set")"
  browse wait "$READ_MS"
  browse wait "$READ_MS"
  glide_pointer_to "$PARK_X" "$PARK_Y"
  browse wait "$READ_MS"
}

is_selected() {
  [[ -z "$ONLY" || ",$ONLY," == *",$1,"* ]]
}

is_selected waypoints && record_review_clip walkthrough-waypoints "$DEMO_REVIEW_URL" settle_on_risk_waypoint waypoints_scenario
is_selected filters && record_review_clip walkthrough-filters "$DEMO_REVIEW_URL" settle_on_walkthrough filters_scenario
is_selected tooltips && record_review_clip walkthrough-tooltips "$DEMO_REVIEW_URL" settle_on_form tooltips_scenario
exit 0
