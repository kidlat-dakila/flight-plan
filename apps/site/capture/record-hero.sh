#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
SCHEMES="${3:-light dark}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"
source "$SCRIPT_DIR/review-clip.sh"

CAMERA_MOVE_MS=1200
LOOP_SECONDS=1.2
CROSSFADE_SECONDS=0.8
PLAYBACK_SPEED=1.5
RECORD_START=0
SHOT_LOG=""

CHANGE_OVERVIEW_HEADING="[...document.querySelectorAll('h3')].find(heading=>heading.textContent==='Change Overview')"
TRACE_HEADING="document.getElementById('trace-diagram-heading')"
HOVER_CARD="document.querySelector('[data-slot=hover-card-content]')"
RISK_WAYPOINT="[...document.querySelectorAll('[data-waypoint-mark]')].find(element=>element.getAttribute('aria-label').startsWith('Risk waypoint'))"
RISK_BOX="[...document.querySelectorAll('section[aria-label]')].find(section=>section.getAttribute('aria-label')==='Added the query of the trainers')"
FULL_SCREEN_BUTTON="[...document.querySelectorAll('button[aria-label=\"Full screen\"]')].find(element=>element.getBoundingClientRect().top>0)"

card_named() {
  echo "[...($CHANGE_OVERVIEW_HEADING).parentElement.querySelectorAll('button')].find(element=>element.textContent.replace(/^(Added|Modified|Deleted)/,'').startsWith('$1'))"
}

name_in_view() {
  echo "[...document.querySelectorAll('[data-slot=hover-card-trigger]')].find(element=>{const box=element.getBoundingClientRect();return element.textContent==='$1'&&box.top>120&&box.bottom<innerHeight-80})"
}

button_in() {
  echo "[...($1).querySelectorAll('button')].find(element=>element.textContent.trim()==='$2')"
}

seconds_since_start() {
  python3 -c "import time;print(round(time.time()-$RECORD_START,3))"
}

aim_camera() {
  local rect
  rect="$(evaluate "(()=>{const boxes=[$1].flat().filter(Boolean).map(element=>element.getBoundingClientRect());const left=Math.min(...boxes.map(box=>box.left));const top=Math.min(...boxes.map(box=>box.top));const right=Math.max(...boxes.map(box=>box.right));const bottom=Math.max(...boxes.map(box=>box.bottom));return [left,top,right-left,bottom-top].map(Math.round).join(' ')})()")"
  if [[ "$rect" == *Infinity* ]]; then
    echo "nothing to aim the camera at: $1" >&2
    return 1
  fi
  echo "$(seconds_since_start) $rect" >>"$SHOT_LOG"
  browse wait "$CAMERA_MOVE_MS"
}

widen_camera() {
  echo "$(seconds_since_start) 0 0 $WIDTH $HEIGHT" >>"$SHOT_LOG"
  browse wait "$CAMERA_MOVE_MS"
}

settle_on_change_overview() {
  settle_on "$CHANGE_OVERVIEW_HEADING" 90
}

change_overview_shot() {
  hover_marked "$(card_named "usePokemonHook")"
  aim_camera "$(card_named "usePokemonHook"),$HOVER_CARD"
  browse wait "$READ_MS"
  widen_camera
  park_pointer
}

trace_shot() {
  scroll_smoothly_to "$TRACE_HEADING" 80
  click_marked "$FULL_SCREEN_BUTTON"
  click_marked "$(node_named "PokemonPage")"
  aim_camera "$PANEL.querySelector('[data-code-block]')"
  browse wait "$READ_MS"
  widen_camera
  browse press Escape
  browse wait "$STEP_MS"
  browse press Escape
  park_pointer
}

tooltip_shot() {
  scroll_smoothly_to "$RISK_WAYPOINT" 300
  hover_marked "$(name_in_view "usePokemonFilters")"
  aim_camera "$(name_in_view "usePokemonFilters"),$HOVER_CARD"
  browse wait "$READ_MS"
  widen_camera
  park_pointer
}

risk_shot() {
  click_marked "$RISK_WAYPOINT"
  scroll_smoothly_to "$RISK_BOX" 90
  aim_camera "$RISK_BOX"
  browse wait "$READ_MS"
  click_marked "$(button_in "$RISK_BOX" "Preview the fix")"
  aim_camera "$(button_in "$RISK_BOX" "Hide the fix"),($(button_in "$RISK_BOX" "Hide the fix")).nextElementSibling"
  browse wait "$READ_MS"
  park_pointer
  widen_camera
}

record_take() {
  local scheme="$1" raw="$2"
  SHOT_LOG="$WORK_DIR/shots-$scheme.txt"
  : >"$SHOT_LOG"
  open_review "$scheme" "$DEMO_REVIEW_URL"
  settle_on_change_overview
  park_pointer
  browse eval "document.activeElement?.blur()"
  browse record start "$raw" --cursor
  RECORD_START="$(python3 -c 'import time;print(time.time())')"
  browse wait 1400
  change_overview_shot
  trace_shot
  tooltip_shot
  risk_shot
  browse record stop
}

render_camera() {
  local raw="$1" shots="$2" moved="$3"
  uv run --quiet --with pillow python3 "$SCRIPT_DIR/hero-camera.py" "$raw" "$shots" "$moved" "$WIDTH" "$HEIGHT"
}

loop_back_to_start() {
  local moved="$1" looped="$2"
  local duration offset
  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$moved")"
  offset="$(python3 -c "print(round($duration-$LOOP_SECONDS-$CROSSFADE_SECONDS,3))")"
  ffmpeg -loglevel error -y -i "$moved" -i "$moved" -filter_complex \
    "[0]trim=start=$LOOP_SECONDS,setpts=PTS-STARTPTS[body];[1]trim=end=$LOOP_SECONDS,setpts=PTS-STARTPTS[head];[body][head]xfade=transition=fade:duration=$CROSSFADE_SECONDS:offset=$offset" \
    -c:v libx264 -preset fast -crf 10 -pix_fmt yuv444p "$looped"
}

encode_hero() {
  local scheme="$1" looped="$2"
  local filter="setpts=PTS/$PLAYBACK_SPEED,fps=30,format=yuv420p"
  ffmpeg -loglevel error -y -i "$looped" -vf "$filter" \
    -c:v libx264 -preset slow -crf 33 -profile:v high -movflags +faststart -an "$MEDIA_DIR/hero-$scheme.mp4"
  ffmpeg -loglevel error -y -i "$looped" -vf "$filter" \
    -c:v libvpx-vp9 -crf 47 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -an "$MEDIA_DIR/hero-$scheme.webm"
  ffmpeg -loglevel error -y -i "$looped" -frames:v 1 "$POSTER_DIR/hero-poster-$scheme.png"
  echo "recorded hero-$scheme.mp4, hero-$scheme.webm and hero-poster-$scheme.png"
}

mkdir -p "$MEDIA_DIR" "$POSTER_DIR"
for scheme in $SCHEMES; do
  raw="$WORK_DIR/raw-$scheme.mp4"
  moved="$WORK_DIR/moved-$scheme.mkv"
  looped="$WORK_DIR/looped-$scheme.mkv"
  record_take "$scheme" "$raw"
  render_camera "$raw" "$SHOT_LOG" "$moved"
  loop_back_to_start "$moved" "$looped"
  encode_hero "$scheme" "$looped"
done
reset_browser
