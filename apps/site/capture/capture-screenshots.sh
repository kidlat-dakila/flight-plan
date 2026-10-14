#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"

SCALE=2
NARROW_WIDTH=1100
WIDE_WIDTH=1440
TALL_HEIGHT=1600

capture() {
  local name="$1" scheme="$2" selector="$3" offset="$4" rect_script="$5"
  local raw="$WORK_DIR/$name-$scheme.png"
  scroll_element_to "$selector" "$offset"
  agent-browser screenshot "$raw" >/dev/null 2>&1
  crop_screenshot "$raw" "$OUT_DIR/$name-$scheme.png" "$SCALE" "$(evaluate "$rect_script")"
  echo "captured $name-$scheme.png"
}

capture_review_parts() {
  local scheme="$1"
  open_page "$NARROW_WIDTH" "$TALL_HEIGHT" "$SCALE" "$scheme" "$REVIEW_URL"
  capture context "$scheme" "#fixture-segment-1-context-heading" 140 \
    "(()=>{const heading=document.getElementById('fixture-segment-1-context-heading').getBoundingClientRect();return JSON.stringify([Math.round(heading.left)-24,Math.round(heading.top)-20,740,600])})()"
  capture journey "$scheme" "#fixture-segment-1-journey-fixture-segment-1 > div.rounded-md" 120 \
    "(()=>{const board=document.querySelector('#fixture-segment-1-journey-fixture-segment-1 > div.rounded-md').getBoundingClientRect();return JSON.stringify([Math.round(board.left),Math.round(board.top),Math.round(board.width),800])})()"
  open_page "$WIDE_WIDTH" "$TALL_HEIGHT" "$SCALE" "$scheme" "$REVIEW_URL"
  capture blast "$scheme" "#fixture-segment-1-blast-diagram" 140 \
    "(()=>{const band=document.getElementById('fixture-segment-1-blast-diagram').getBoundingClientRect();return JSON.stringify([Math.round(band.left)-24,Math.round(band.top)+12,Math.round(band.width)+48,Math.round(band.height)-12])})()"
  capture walkthrough "$scheme" "#fixture-segment-1-code-walkthrough-heading" 200 \
    "(()=>{const heading=document.getElementById('fixture-segment-1-code-walkthrough-heading').getBoundingClientRect();const band=document.getElementById('fixture-segment-1-code-walkthrough').getBoundingClientRect();return JSON.stringify([Math.round(band.left)-24,Math.round(heading.top)-16,Math.round(band.width)+48,720])})()"
}

capture_configuration() {
  local scheme="$1"
  local raw="$WORK_DIR/customize-$scheme.png"
  open_page "$WIDE_WIDTH" 900 "$SCALE" "$scheme" "$CONFIGURATION_URL"
  browse eval "(()=>{[...document.querySelectorAll('a')].find(link=>link.textContent.trim().startsWith('Waypoint reading')).click();return 1})()"
  browse wait "$SCROLL_SETTLE_MS"
  browse eval "scrollTo(0,0)"
  browse wait 400
  agent-browser screenshot "$raw" >/dev/null 2>&1
  crop_screenshot "$raw" "$OUT_DIR/customize-$scheme.png" "$SCALE" "220,330,1000,560"
  echo "captured customize-$scheme.png"
}

mkdir -p "$OUT_DIR"
for scheme in light dark; do
  capture_review_parts "$scheme"
  capture_configuration "$scheme"
done
reset_browser
