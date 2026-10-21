#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../../../packages/docs/media}"
ONLY="${2:-}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser --session "$SESSION" record stop >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT

SITE_URL="${SITE_URL:-http://localhost:4400}"
REACT_DEMO_PATH="/demo/demo-react/#"
REVIEW_PATH="$REACT_DEMO_PATH/pr-reviews/pokedex-web/pr-57"
FASTAPI_REVIEW_PATH="/demo/demo-fastapi/#/pr-reviews/pokedex-api/pr-42"
GUIDE_STORAGE_KEY="flightplan-guide-tooltips"
SESSION="flight-plan-docs"
WIDTH=1440
HEIGHT=900
SCALE=1.5
PAGE_SETTLE_MS=3000
STEP_MS=900
HOLD_MS=1800
CLIP_WIDTH=1280
WEBP_QUALITY=85
TARGET_ID="capture-target"
PARK_X=$((WIDTH - 40))
PARK_Y=140
BOARD_PARK_X=160
BOARD_PARK_Y=160

browse() {
  local output
  if ! output="$(agent-browser --session "$SESSION" "$@" 2>&1)"; then
    echo "agent-browser $1 failed: $output" >&2
    return 1
  fi
}

evaluate() {
  agent-browser --session "$SESSION" eval "$1" 2>/dev/null | tail -1 | tr -d '"'
}

turn_guide_tips_off() {
  browse open "$SITE_URL/"
  browse eval "localStorage.setItem('$GUIDE_STORAGE_KEY',JSON.stringify({state:{firstSeenAt:Date.now(),isOff:true,tooltips:{},deferredAt:{},actions:{}},version:1}))"
}

open_demo() {
  local scheme="$1" path="$2"
  browse set viewport "$WIDTH" "$HEIGHT" "$SCALE"
  browse set media "$scheme"
  turn_guide_tips_off
  browse open "$SITE_URL$path"
  browse wait "$PAGE_SETTLE_MS"
  browse eval "document.querySelector('.demo-exit')?.remove()"
}

park_pointer_at() {
  browse mouse move "$1" "$2"
  browse wait 400
}

park_pointer() {
  park_pointer_at "$PARK_X" "$PARK_Y"
}

click_then_rest_on_board() {
  mark_or_fail "$1"
  browse click "#$TARGET_ID" --human
  browse mouse move "$BOARD_PARK_X" "$BOARD_PARK_Y" --steps 12 --duration 300
}

mark() {
  evaluate "(()=>{document.getElementById('$TARGET_ID')?.removeAttribute('id');const element=($1);if(!element)return 0;element.id='$TARGET_ID';return 1})()"
}

mark_or_fail() {
  if [[ "$(mark "$1")" != "1" ]]; then
    echo "nothing to click for: $1" >&2
    return 1
  fi
}

click_marked() {
  mark_or_fail "$1"
  if ! browse click "#$TARGET_ID" --human 2>/dev/null; then
    browse wait "$STEP_MS"
    mark_or_fail "$1"
    browse click "#$TARGET_ID" --human
  fi
  browse wait "$STEP_MS"
}

select_marked() {
  mark "$1" >/dev/null
  browse select "#$TARGET_ID" "$2"
  browse wait "$STEP_MS"
}

load_whole_review() {
  browse eval "(async()=>{for(let top=0;top<document.body.scrollHeight;top+=600){scrollTo(0,top);await new Promise(done=>setTimeout(done,60))}scrollTo(0,0);return 1})()"
  browse wait "$STEP_MS"
}

prepare_walkthrough() {
  load_whole_review
  settle_on "document.getElementById('fixture-segment-1-code-walkthrough-heading')" 80
}

prepare_format_file() {
  load_whole_review
  settle_on "document.getElementById('fixture-segment-1-file-1')" 80
}

ACCESSIBLE_NAME="(element)=>(element.getAttribute('aria-label')||element.labels?.[0]?.textContent||element.closest('label')?.textContent||element.textContent||'').trim()"

text_box_named() {
  echo "[...document.querySelectorAll('textarea,input,[contenteditable=true],[role=textbox]')].find(element=>[element.getAttribute('aria-label'),element.getAttribute('placeholder'),element.getAttribute('aria-placeholder'),element.dataset.placeholder].includes('$1'))"
}

control_named() {
  echo "[...document.querySelectorAll('button,[role=radio],[role=checkbox],[role=switch],input')].find(element=>($ACCESSIBLE_NAME)(element).startsWith('$1'))"
}

encode_clip() {
  local raw="$1" name="$2"
  ffmpeg -loglevel error -y -i "$raw" -vf "scale=$CLIP_WIDTH:-2:flags=lanczos" -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -an "$OUT_DIR/$name.webm"
  ffmpeg -loglevel error -y -sseof -0.2 -i "$OUT_DIR/$name.webm" -frames:v 1 "$WORK_DIR/$name-poster.png"
  cwebp -quiet -q "$WEBP_QUALITY" "$WORK_DIR/$name-poster.png" -o "$OUT_DIR/$name.webp"
}

record_clip() {
  local name="$1" scheme="$2" path="$3" scenario="$4" prepare="${5:-}"
  local raw="$WORK_DIR/$name-$scheme.webm"
  open_demo "$scheme" "$path"
  [[ -n "$prepare" ]] && "$prepare"
  browse record start "$raw" --cursor
  browse wait 600
  "$scenario"
  browse wait "$HOLD_MS"
  browse record stop
  encode_clip "$raw" "$name-$scheme"
  echo "recorded $name-$scheme.webm"
}

capture_still() {
  local name="$1" scheme="$2" path="$3" arrange="$4"
  local raw="$WORK_DIR/$name-$scheme.png"
  open_demo "$scheme" "$path"
  park_pointer
  "$arrange"
  agent-browser --session "$SESSION" screenshot "$raw" >/dev/null 2>&1
  ffmpeg -loglevel error -y -i "$raw" -vf "scale=$((CLIP_WIDTH * 3 / 2)):-2:flags=lanczos" "$WORK_DIR/$name-$scheme-scaled.png"
  cwebp -quiet -q "$WEBP_QUALITY" "$WORK_DIR/$name-$scheme-scaled.png" -o "$OUT_DIR/$name-$scheme.webp"
  echo "captured $name-$scheme.webp"
}

agents_scenario() {
  click_marked "$(control_named "Codex")"
  select_marked "[...document.querySelectorAll('select')].find(element=>($ACCESSIBLE_NAME)(element)==='Model for Claude')" "Opus"
  click_marked "[...document.querySelectorAll('[role=radio],input[type=radio]')].find(element=>($ACCESSIBLE_NAME)(element)==='High')"
}

forges_scenario() {
  click_marked "$(control_named "GitHub token")"
  click_marked "[...document.querySelectorAll('input[type=password]')].at(-1)"
  browse keyboard type "demo-token-0000"
  browse wait "$STEP_MS"
}

duplicate_standard() {
  click_marked "document.querySelector('button[aria-label=\"Duplicate Standard\"]')"
  browse wait "$STEP_MS"
}

arrange_configuration_editor() {
  duplicate_standard
  click_marked "[...document.querySelectorAll('a')].find(element=>element.textContent.trim().startsWith('Waypoint reading'))"
  park_pointer
}

arrange_configuration_list() {
  duplicate_standard
  click_marked "[...document.querySelectorAll('a')].find(element=>element.textContent.trim()==='All configurations')"
  settle_on "[...document.querySelectorAll('h2,h3')].find(element=>element.textContent.trim()==='Presets')" 90
  park_pointer
}

arrange_page_top() {
  browse wait 300
}

settle_on() {
  local element="$1" offset="$2"
  local script="(()=>{const element=($element);scrollTo(0,element.getBoundingClientRect().top+scrollY-$offset);return 1})()"
  browse eval "$script"
  browse wait "$STEP_MS"
  browse eval "$script"
  browse wait "$STEP_MS"
}

arrange_segments() {
  load_whole_review
  settle_on "[...document.querySelectorAll('h2')].find(element=>element.textContent.startsWith('Segment 2'))" 420
}

arrange_context() {
  load_whole_review
  settle_on "document.getElementById('fixture-segment-2-context-heading')" 80
}

IN_NAVIGATOR="(element)=>element.getBoundingClientRect().top>innerHeight-60"

navigator_control() {
  echo "[...document.querySelectorAll('button')].find(element=>element.textContent.trim().startsWith('$1')&&($IN_NAVIGATOR)(element))"
}

visible_button_starting() {
  echo "[...document.querySelectorAll('button')].filter(element=>element.textContent.startsWith('$1')&&element.getBoundingClientRect().width>0).at(-1)"
}

menu_item() {
  echo "[...document.querySelectorAll('[role=menuitem]')].find(element=>element.textContent.trim().startsWith('$1'))"
}

SEGMENT_2_CHANGE_OVERVIEW="[...document.querySelectorAll('h3')].filter(element=>element.textContent.trim()==='Change Overview')[1]"

change_overview_card() {
  echo "[...($SEGMENT_2_CHANGE_OVERVIEW).parentElement.querySelectorAll('button')].find(element=>element.textContent.replace(/^(Added|Modified|Deleted)/,'').startsWith('$1'))"
}

center_of_marked() {
  evaluate "(()=>{const box=document.getElementById('$TARGET_ID').getBoundingClientRect();return Math.round(box.left+box.width/2)+' '+Math.round(box.top+box.height/2)})()"
}

glide_to_marked() {
  local x y
  mark "$1" >/dev/null
  read -r x y <<<"$(center_of_marked)"
  browse mouse move "$x" "$y" --steps 24
  browse wait "$HOLD_MS"
}

prepare_change_overview() {
  load_whole_review
  settle_on "$SEGMENT_2_CHANGE_OVERVIEW" 90
}

change_overview_scenario() {
  local name
  for name in PokemonPage usePokemon fetchPokemon; do
    glide_to_marked "$(change_overview_card "$name")"
    park_pointer
  done
  park_pointer
}

SEGMENT_2_TRACE="document.getElementById('fixture-segment-2-trace-diagram-heading').closest('section')"

trace_row() {
  echo "[...document.querySelectorAll('button')].filter(element=>element.getAttribute('aria-label')==='$1'&&element.getBoundingClientRect().width>0).at(-1)"
}

prepare_trace() {
  load_whole_review
  settle_on "document.getElementById('fixture-segment-2-trace-diagram-heading')" 80
}

trace_scenario() {
  click_marked "[...($SEGMENT_2_TRACE).querySelectorAll('button')].find(element=>element.getAttribute('aria-label')==='Full screen')"
  click_then_rest_on_board "$(trace_row "Calls: Builds the new row from the body")"
  browse wait "$HOLD_MS"
  browse press Escape
  browse wait "$STEP_MS"
  click_then_rest_on_board "$(visible_button_starting "add_pokemon")"
  browse wait "$HOLD_MS"
  browse press Escape
  browse wait "$STEP_MS"
  click_marked "$(navigator_control "Leave full screen")"
  park_pointer
}

prepare_blast() {
  load_whole_review
  settle_on "document.getElementById('fixture-segment-1-blast-diagram-heading')" 80
}

blast_scenario() {
  click_marked "[...document.querySelectorAll('#fixture-segment-1-blast-diagram button')].find(element=>element.getAttribute('aria-label')==='Full screen')"
  click_marked "$(navigator_control "Import bound")"
  browse wait "$STEP_MS"
  click_marked "$(navigator_control "Export bound")"
  click_then_rest_on_board "$(visible_button_starting "src/main.tsx")"
  browse wait "$HOLD_MS"
  browse press Escape
  browse wait "$STEP_MS"
  click_marked "$(navigator_control "Leave full screen")"
  park_pointer
}

walkthrough_scenario() {
  local step
  for step in 1 2 3; do
    click_marked "$(navigator_control "Next waypoint")"
  done
  click_marked "$(navigator_control "Filter")"
  click_marked "[...document.querySelectorAll('[role=menuitemcheckbox]')].find(element=>element.textContent.trim().startsWith('Core change'))"
  browse press Escape
  park_pointer
}

USE_POKEMON_FILTERS_DEFINITION="[...document.querySelectorAll('#fixture-segment-1-file-3 [data-line=\"12\"] [data-slot=hover-card-trigger]')].find(element=>element.textContent==='usePokemonFilters')"

arrange_context_code_block() {
  load_whole_review
  settle_on "document.querySelector('#fixture-segment-1-file-3 [data-line=\"12\"]')" 200
  mark "$USE_POKEMON_FILTERS_DEFINITION" >/dev/null
  browse hover "#$TARGET_ID"
  browse wait 1600
}

RISK_WAYPOINT="[...document.querySelectorAll('[data-waypoint-mark]')].find(element=>element.getAttribute('aria-label').startsWith('Risk waypoint'))"
RISK_BOX="[...document.querySelectorAll('section[aria-label]')].find(section=>section.getAttribute('aria-label')==='Added the query of the trainers')"

arrange_finding() {
  load_whole_review
  settle_on "$RISK_WAYPOINT" 240
  click_marked "$RISK_WAYPOINT"
  click_marked "[...($RISK_BOX).querySelectorAll('button')].find(element=>element.textContent.trim()==='Preview the fix')"
  settle_on "$RISK_BOX" 120
  park_pointer
}

arrange_explain_dialog() {
  click_marked "document.querySelector('header button[aria-label=\"Settings\"]')"
  click_marked "$(menu_item "Explain this review")"
}

prepare_navigator() {
  load_whole_review
}

navigator_scenario() {
  click_marked "$(navigator_control "Jump to")"
  click_marked "$(menu_item "Blast Diagram")"
  browse wait "$HOLD_MS"
  click_marked "$(navigator_control "Next: Code Walkthrough")"
  browse wait "$STEP_MS"
  click_marked "$(navigator_control "Next waypoint")"
  click_marked "$(navigator_control "Next waypoint")"
  park_pointer
}

comment_button_in_format_file() {
  echo "document.querySelector('#fixture-segment-1-file-1 [aria-label=\"Add a comment on this line added $1\"]')"
}

comments_scenario() {
  click_marked "$(comment_button_in_format_file 11)"
  click_marked "$(comment_button_in_format_file 12)"
  browse keyboard type "Should two types read \"fire, flying\" here, like the type filter does?"
  browse wait "$STEP_MS"
  click_marked "$(control_named "Add to review")"
}

TYPES_FILE="#fixture-segment-1-file-4"

prepare_types_file() {
  load_whole_review
  settle_on "document.querySelector('$TYPES_FILE')" 80
}

reviewed_scenario() {
  click_marked "document.querySelector('$TYPES_FILE button[aria-label=\"Reviewed: Type PokemonType\"]')"
  browse wait "$STEP_MS"
  click_marked "[...document.querySelectorAll('$TYPES_FILE button')].find(element=>element.textContent.trim()==='File reviewed')"
  park_pointer
}

submit_scenario() {
  click_marked "$(control_named "Submit review")"
  click_marked "$(text_box_named "Leave a summary for the author")"
  browse keyboard type "Reads well. The filters and the list stay in step."
  click_marked "$(control_named "Approve")"
  browse wait "$STEP_MS"
}

chat_scenario() {
  click_marked "$(control_named "Chat")"
  browse wait "$HOLD_MS"
  click_marked "$(text_box_named "Ask about this review")"
  browse keyboard type "Does the list load again when only the type changes?"
  browse wait "$STEP_MS"
}

arrange_share() {
  click_marked "$(control_named "Share")"
}

arrange_switcher() {
  click_marked "document.querySelector('h1 button')"
}

is_selected() {
  [[ -z "$ONLY" || ",$ONLY," == *",$1,"* ]]
}

run_for_scheme() {
  local scheme="$1"
  is_selected setup-agents && record_clip setup-agents "$scheme" "$REACT_DEMO_PATH/settings/agents" agents_scenario
  is_selected setup-git-forge && record_clip setup-git-forge "$scheme" "$REACT_DEMO_PATH/settings/forges" forges_scenario
  is_selected setup-repositories && capture_still setup-repositories "$scheme" "$REACT_DEMO_PATH/settings/repositories" arrange_page_top
  is_selected review-configuration && capture_still review-configuration "$scheme" "$REACT_DEMO_PATH/settings/review" arrange_page_top
  is_selected prompt-configurations && capture_still prompt-configurations "$scheme" "$REACT_DEMO_PATH/settings/profiles" arrange_configuration_list
  is_selected configuration-editor && capture_still configuration-editor "$scheme" "$REACT_DEMO_PATH/settings/profiles" arrange_configuration_editor
  is_selected review-page && capture_still review-page "$scheme" "$REVIEW_PATH" arrange_page_top
  is_selected segments && capture_still segments "$scheme" "$REVIEW_PATH" arrange_segments
  is_selected context && capture_still context "$scheme" "$REVIEW_PATH" arrange_context
  is_selected change-overview && record_clip change-overview "$scheme" "$REVIEW_PATH" change_overview_scenario prepare_change_overview
  is_selected trace-diagram && record_clip trace-diagram "$scheme" "$FASTAPI_REVIEW_PATH" trace_scenario prepare_trace
  is_selected blast-diagram && record_clip blast-diagram "$scheme" "$REVIEW_PATH" blast_scenario prepare_blast
  is_selected code-walkthrough && record_clip code-walkthrough "$scheme" "$REVIEW_PATH" walkthrough_scenario prepare_walkthrough
  is_selected context-code-blocks && capture_still context-code-blocks "$scheme" "$REVIEW_PATH" arrange_context_code_block
  is_selected findings && capture_still findings "$scheme" "$REVIEW_PATH" arrange_finding
  is_selected explain-dialog && capture_still explain-dialog "$scheme" "$REVIEW_PATH" arrange_explain_dialog
  is_selected review-navigator && record_clip review-navigator "$scheme" "$REVIEW_PATH" navigator_scenario prepare_navigator
  is_selected comments && record_clip comments "$scheme" "$REVIEW_PATH" comments_scenario prepare_format_file
  is_selected reviewed-marks && record_clip reviewed-marks "$scheme" "$REVIEW_PATH" reviewed_scenario prepare_types_file
  is_selected submit-review && record_clip submit-review "$scheme" "$REVIEW_PATH" submit_scenario
  is_selected agent-chat && record_clip agent-chat "$scheme" "$REVIEW_PATH" chat_scenario
  is_selected share && capture_still share "$scheme" "$REVIEW_PATH" arrange_share
  is_selected git-features && capture_still git-features "$scheme" "$REVIEW_PATH" arrange_switcher
  return 0
}

mkdir -p "$OUT_DIR"
agent-browser --session "$SESSION" record stop >/dev/null 2>&1 || true
for scheme in light dark; do
  run_for_scheme "$scheme"
done
agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
