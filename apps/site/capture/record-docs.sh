#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../../../packages/docs/media}"
ONLY="${2:-}"
WORK_DIR="$(mktemp -d)"
trap 'agent-browser --session "$SESSION" record stop >/dev/null 2>&1; rm -rf "$WORK_DIR"' EXIT

DEMO_URL="${DEMO_URL:-http://localhost:4400/demo/demo-react/}"
REVIEW_PATH="#/pr-reviews/pokedex-web/pr-57"
SESSION="flight-plan-docs"
WIDTH=1280
HEIGHT=800
SCALE=1.5
PAGE_SETTLE_MS=3000
STEP_MS=900
HOLD_MS=1800
CLIP_WIDTH=1280
WEBP_QUALITY=85
TARGET_ID="capture-target"

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

open_demo() {
  local scheme="$1" path="$2"
  browse set viewport "$WIDTH" "$HEIGHT" "$SCALE"
  browse set media "$scheme"
  browse open "about:blank"
  browse open "$DEMO_URL$path"
  browse wait "$PAGE_SETTLE_MS"
  browse eval "document.querySelector('.demo-exit')?.remove()"
}

mark() {
  evaluate "(()=>{document.getElementById('$TARGET_ID')?.removeAttribute('id');const element=($1);if(!element)return 0;element.id='$TARGET_ID';return 1})()"
}

click_marked() {
  local found
  found="$(mark "$1")"
  if [[ "$found" != "1" ]]; then
    echo "nothing to click for: $1" >&2
    return 1
  fi
  browse click "#$TARGET_ID" --human
  browse wait "$STEP_MS"
}

select_marked() {
  mark "$1" >/dev/null
  browse select "#$TARGET_ID" "$2"
  browse wait "$STEP_MS"
}

scroll_to() {
  local selector="$1" offset="$2"
  browse eval "(()=>{const element=document.querySelector('$selector');scrollTo({top:element.getBoundingClientRect().top+scrollY-$offset,behavior:'smooth'});return 1})()"
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

prepare_first_file() {
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

arrange_configuration_editor() {
  click_marked "document.querySelector('button[aria-label=\"Duplicate Standard\"]')"
  browse wait "$STEP_MS"
}

arrange_configuration_list() {
  arrange_configuration_editor
  click_marked "[...document.querySelectorAll('a')].find(element=>element.textContent.trim()==='All configurations')"
}

arrange_repositories() {
  click_marked "document.querySelector('button[aria-label=\"Configure pokedex-web\"]')"
}

arrange_review_top() {
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
  settle_on "document.getElementById('fixture-segment-1-context-heading')" 150
}

trace_scenario() {
  scroll_to "#fixture-segment-1-trace-diagram-heading" 80
  click_marked "[...document.querySelectorAll('#fixture-segment-1-trace-fixture-segment-1 button')].find(element=>(element.getAttribute('aria-label')||'').startsWith('Actions:'))"
}

blast_scenario() {
  scroll_to "#fixture-segment-1-blast-diagram-heading" 80
  click_marked "$(control_named "Import bound")"
  browse wait "$STEP_MS"
  click_marked "$(control_named "Export bound")"
  click_marked "[...document.querySelectorAll('#fixture-segment-1-blast-diagram button')].find(element=>element.textContent.startsWith('use-pokemon.ts'))"
}

VISIBLE="(element)=>element.getBoundingClientRect().top>0&&element.getBoundingClientRect().bottom<innerHeight"

walkthrough_scenario() {
  local step
  for step in 1 2 3; do
    click_marked "[...document.querySelectorAll('button[aria-label^=\"Next waypoint\"]')].find($VISIBLE)"
  done
  click_marked "[...document.querySelectorAll('button')].find(element=>element.textContent.trim().startsWith('Filter:')&&($VISIBLE)(element))"
  click_marked "[...document.querySelectorAll('[role=menuitemcheckbox]')].find(element=>element.textContent.trim().startsWith('Core change'))"
  browse press Escape
}

arrange_context_code_block() {
  scroll_to "#fixture-segment-1-file-2" 80
  click_marked "document.querySelector('#fixture-segment-1-file-2 [aria-label^=\"Defined in\"]')"
  browse hover "#$TARGET_ID"
  browse wait 1600
}

comments_scenario() {
  click_marked "document.querySelector('[aria-label=\"Add a comment on this line added 2\"]')"
  click_marked "document.querySelector('[aria-label=\"Add a comment on this line added 3\"]')"
  browse keyboard type "Should fetchPokemon() take an AbortSignal, so the page can cancel it?"
  browse wait "$STEP_MS"
  click_marked "$(control_named "Add to review")"
}

reviewed_scenario() {
  click_marked "[...document.querySelectorAll('#fixture-segment-1-file-1 button')].filter(element=>element.textContent.trim()==='Reviewed')[1]"
  browse wait "$STEP_MS"
  click_marked "$(control_named "File reviewed")"
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
  click_marked "$(text_box_named "Ask about this review")"
  browse keyboard type "Why does usePokemon() read the filters from the store?"
  browse press Enter
  browse wait 4000
}

arrange_share() {
  click_marked "$(control_named "Share")"
}

switcher_scenario() {
  click_marked "document.querySelector('h1 button')"
  click_marked "$(text_box_named "Search by title or author")"
  browse keyboard type "order"
  browse wait "$HOLD_MS"
  browse press Escape
}

is_selected() {
  [[ -z "$ONLY" || ",$ONLY," == *",$1,"* ]]
}

run_for_scheme() {
  local scheme="$1"
  is_selected setup-agents && record_clip setup-agents "$scheme" "#/settings/agents" agents_scenario
  is_selected setup-git-forge && record_clip setup-git-forge "$scheme" "#/settings/forges" forges_scenario
  is_selected prompt-configurations && capture_still prompt-configurations "$scheme" "#/settings/profiles" arrange_configuration_list
  is_selected configuration-editor && capture_still configuration-editor "$scheme" "#/settings/profiles" arrange_configuration_editor
  is_selected setup-repositories && capture_still setup-repositories "$scheme" "#/settings/repositories" arrange_repositories
  is_selected review-page && capture_still review-page "$scheme" "$REVIEW_PATH" arrange_review_top
  is_selected segments && capture_still segments "$scheme" "$REVIEW_PATH" arrange_segments
  is_selected context && capture_still context "$scheme" "$REVIEW_PATH" arrange_context
  is_selected trace-diagram && record_clip trace-diagram "$scheme" "$REVIEW_PATH" trace_scenario
  is_selected blast-diagram && record_clip blast-diagram "$scheme" "$REVIEW_PATH" blast_scenario
  is_selected code-walkthrough && record_clip code-walkthrough "$scheme" "$REVIEW_PATH" walkthrough_scenario prepare_walkthrough
  is_selected context-code-blocks && capture_still context-code-blocks "$scheme" "$REVIEW_PATH" arrange_context_code_block
  is_selected comments && record_clip comments "$scheme" "$REVIEW_PATH" comments_scenario prepare_first_file
  is_selected reviewed-marks && record_clip reviewed-marks "$scheme" "$REVIEW_PATH" reviewed_scenario prepare_first_file
  is_selected submit-review && record_clip submit-review "$scheme" "$REVIEW_PATH" submit_scenario
  is_selected agent-chat && record_clip agent-chat "$scheme" "$REVIEW_PATH" chat_scenario
  is_selected share && capture_still share "$scheme" "$REVIEW_PATH" arrange_share
  is_selected git-features && record_clip git-features "$scheme" "$REVIEW_PATH" switcher_scenario
  return 0
}

mkdir -p "$OUT_DIR"
agent-browser --session "$SESSION" record stop >/dev/null 2>&1 || true
for scheme in light dark; do
  run_for_scheme "$scheme"
done
agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
