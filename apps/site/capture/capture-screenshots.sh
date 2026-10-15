#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"

SCALE=2
WIDE_WIDTH=1440

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
  capture_configuration "$scheme"
done
reset_browser
