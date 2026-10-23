#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"

SCALE=2
WIDE_WIDTH=1440
REVIEW_WIDTH=1200
REVIEW_HEIGHT=1000
SETTLED_TOP=160
CROP_MARGIN=24
BOX_TOP_MARGIN=10
DIALOG_MARGIN=40
CODE_LINES_BELOW=104
TARGET_ID="capture-target"
EXPLAIN_DIALOG="[...document.querySelectorAll('[role=dialog]')].find(dialog=>dialog.textContent.includes('explain this review'))"
EXPLAIN_REVIEW_ITEM="[...document.querySelectorAll('[role=menuitem]')].find(item=>item.textContent.includes('Explain this review'))"

capture_configuration() {
  local scheme="$1"
  local raw="$WORK_DIR/customize-$scheme.png"
  open_demo_page "$WIDE_WIDTH" 900 "$scheme" "$CONFIGURATION_URL"
  browse eval "(()=>{[...document.querySelectorAll('a')].find(link=>link.textContent.trim().startsWith('Waypoint reading')).click();return 1})()"
  browse wait "$SCROLL_SETTLE_MS"
  browse eval "scrollTo(0,0)"
  browse wait 400
  agent-browser screenshot "$raw" >/dev/null 2>&1
  crop_screenshot "$raw" "$OUT_DIR/customize-$scheme.png" "$SCALE" "220,330,1000,560"
  echo "captured customize-$scheme.png"
}

mark_target() {
  browse eval "(()=>{document.getElementById('$TARGET_ID')?.removeAttribute('id');($1).id='$TARGET_ID';return 1})()"
}

padded_rect() {
  local left="$1" top="$2" right="$3" bottom="$4"
  evaluate "(()=>{const box=document.getElementById('$TARGET_ID').getBoundingClientRect();return [Math.round(box.left-$left),Math.round(box.top-$top),Math.round(box.width+$left+$right),Math.round(box.height+$top+$bottom)].join(',')})()"
}

screenshot_rect() {
  local name="$1" rect="$2"
  local raw="$WORK_DIR/$name.png"
  agent-browser screenshot "$raw" >/dev/null 2>&1
  crop_screenshot "$raw" "$OUT_DIR/$name.png" "$SCALE" "$rect"
  echo "captured $name.png"
}

open_demo_page() {
  local width="$1" height="$2" scheme="$3" url="$4"
  browse open "about:blank"
  open_page "$width" "$height" "$SCALE" "$scheme" "$url"
}

open_demo_review() {
  open_demo_page "$REVIEW_WIDTH" "$REVIEW_HEIGHT" "$1" "$DEMO_REVIEW_URL"
}

capture_spotlight() {
  local scheme="$1"
  open_demo_review "$scheme"
  browse eval "$OPEN_CORE_CHANGE_WAYPOINT"
  browse wait "$SCROLL_SETTLE_MS"
  mark_target "document.getElementById('capture-waypoint')"
  scroll_element_to "#$TARGET_ID" "$SETTLED_TOP"
  screenshot_rect "spotlight-$scheme" "$(padded_rect "$CROP_MARGIN" "$BOX_TOP_MARGIN" "$CROP_MARGIN" "$CODE_LINES_BELOW")"
}

capture_explain_dialog() {
  local scheme="$1"
  open_demo_review "$scheme"
  browse eval "document.querySelector('header button[aria-label=Settings]').click()"
  browse wait 600
  browse eval "($EXPLAIN_REVIEW_ITEM).click()"
  browse wait "$SCROLL_SETTLE_MS"
  browse eval "document.activeElement?.blur()"
  mark_target "$EXPLAIN_DIALOG"
  screenshot_rect "explain-$scheme" "$(padded_rect "$DIALOG_MARGIN" "$DIALOG_MARGIN" "$DIALOG_MARGIN" "$DIALOG_MARGIN")"
}

mkdir -p "$OUT_DIR"
for scheme in light dark; do
  capture_configuration "$scheme"
  capture_spotlight "$scheme"
  capture_explain_dialog "$scheme"
done
reset_browser
