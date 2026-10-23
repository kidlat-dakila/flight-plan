#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

CHANGE_OVERVIEW_HEADING="[...document.querySelectorAll('#context h3')].find(heading=>heading.textContent==='Change Overview')"
SETTLED_TOP=90
ASIDE_X=1300
ASIDE_Y=560

card_named() {
  echo "[...($CHANGE_OVERVIEW_HEADING).parentElement.querySelectorAll('button')].find(element=>element.textContent.replace(/^(Added|Modified|Deleted)/,'').startsWith('$1'))"
}

step_aside() {
  glide_pointer_to "$ASIDE_X" "$ASIDE_Y"
  browse wait "$STEP_MS"
}

settle_on_change_overview() {
  settle_on "$CHANGE_OVERVIEW_HEADING" "$SETTLED_TOP"
}

change_overview_scenario() {
  local poster="$1"
  hover_marked "$(card_named "fetchPokemonFunction")"
  browse wait "$READ_MS"
  step_aside
  hover_marked "$(card_named "usePokemonHook")"
  browse wait "$READ_MS"
  agent-browser screenshot "$poster" >/dev/null 2>&1
  browse wait "$READ_MS"
  step_aside
  hover_marked "$(card_named "PokemonPageComponent")"
  browse wait "$READ_MS"
  glide_pointer_to "$PARK_X" "$PARK_Y"
  browse wait "$READ_MS"
}

record_review_clip change-overview "$DEMO_REVIEW_URL" settle_on_change_overview change_overview_scenario
