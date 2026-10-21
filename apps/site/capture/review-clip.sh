WIDTH=1200
HEIGHT=750
SCALE=2
CLIP_WIDTH=1600
STEP_MS=1100
READ_MS=2000
DRAG_STEPS=4
GLIDE_STEPS=8
POINTER_X=0
POINTER_Y=0
DRAG_BOTTOM_GAP=60
DRAG_SCAN_STEP=20
VIEW_MARGIN=48
PARK_X=12
PARK_Y=$((HEIGHT - 22))
BOARD_DRIFT=0
TARGET_ID="capture-target"
BOARD="document.querySelector('[role=dialog]')"
PANEL="$BOARD.querySelector('aside')"

mark() {
  local found
  found="$(evaluate "(()=>{document.getElementById('$TARGET_ID')?.removeAttribute('id');const element=($1);if(!element)return 0;element.id='$TARGET_ID';return 1})()")"
  if [[ "$found" != "1" ]]; then
    echo "nothing to click for: $1" >&2
    return 1
  fi
}

click_marked() {
  mark "$1"
  browse click "#$TARGET_ID" --human
  browse wait "$STEP_MS"
}

glide_pointer_to() {
  local target_x="$1" target_y="$2"
  local step
  for step in $(seq 1 "$GLIDE_STEPS"); do
    browse mouse move "$((POINTER_X + (target_x - POINTER_X) * step / GLIDE_STEPS))" "$((POINTER_Y + (target_y - POINTER_Y) * step / GLIDE_STEPS))"
  done
  POINTER_X="$target_x"
  POINTER_Y="$target_y"
}

hover_marked() {
  mark "$1"
  local centre
  centre="$(evaluate "(()=>{const box=document.getElementById('$TARGET_ID').getBoundingClientRect();return Math.round(box.left+box.width/2)+','+Math.round(box.top+box.height/2)})()")"
  glide_pointer_to "${centre%,*}" "${centre#*,}"
  browse wait "$STEP_MS"
}

park_pointer() {
  POINTER_X="$PARK_X"
  POINTER_Y="$PARK_Y"
  browse mouse move "$POINTER_X" "$POINTER_Y"
  browse wait "$STEP_MS"
}

node_named() {
  local nodes="[...$BOARD.querySelectorAll('button')]"
  echo "($nodes.find(element=>element.querySelector('[data-node-header] > span:not([title])')?.textContent==='$1')??$nodes.find(element=>element.textContent.startsWith('$1')))"
}

control_named() {
  echo "[...document.querySelectorAll('button')].find(element=>element.textContent.trim().startsWith('$1'))"
}

empty_board_point() {
  local distance="$1"
  evaluate "(()=>{const canvas=$BOARD.querySelector('[role=group]');for(let y=$HEIGHT-$DRAG_BOTTOM_GAP;y>$HEIGHT/2;y-=$DRAG_SCAN_STEP){for(let x=$VIEW_MARGIN;x<$WIDTH-$VIEW_MARGIN;x+=$DRAG_SCAN_STEP){const end=x-($distance);if(end<$VIEW_MARGIN||end>$WIDTH-$VIEW_MARGIN)continue;const element=document.elementFromPoint(x,y);if(element&&canvas.contains(element)&&!element.closest('button'))return x+','+y}}return 0})()"
}

drag_board_by() {
  local distance="$1"
  local start
  start="$(empty_board_point "$distance")"
  if [[ "$start" == "0" ]]; then
    echo "no empty spot on the board to drag $distance from" >&2
    return 1
  fi
  local start_x="${start%,*}" start_y="${start#*,}"
  browse mouse move "$start_x" "$start_y"
  browse wait 300
  browse mouse down
  local step
  for step in $(seq 1 "$DRAG_STEPS"); do
    browse mouse move "$((start_x - distance * step / DRAG_STEPS))" "$start_y"
  done
  browse mouse up
  browse wait "$STEP_MS"
  BOARD_DRIFT=$((BOARD_DRIFT + distance))
}

return_board_to_start() {
  if [[ "$BOARD_DRIFT" != "0" ]]; then
    drag_board_by "$((-BOARD_DRIFT))"
  fi
}

offset_out_of_view() {
  evaluate "(()=>{const node=($(node_named "$1")).getBoundingClientRect();const panel=$PANEL;const visibleRight=(panel&&panel.offsetWidth>0?panel.getBoundingClientRect().left:innerWidth)-$VIEW_MARGIN;if(node.right>visibleRight)return Math.round(node.right-visibleRight);if(node.left<$VIEW_MARGIN)return Math.round(node.left-$VIEW_MARGIN);return 0})()"
}

bring_into_view() {
  local distance
  distance="$(offset_out_of_view "$1")"
  if [[ "$distance" != "0" ]]; then
    drag_board_by "$distance"
  fi
}

scroll_smoothly_to() {
  local element="$1" offset="$2"
  browse eval "(()=>{const element=($element);scrollTo({top:element.getBoundingClientRect().top+scrollY-$offset,behavior:'smooth'});return 1})()"
  browse wait "$STEP_MS"
}

settle_on() {
  local element="$1" offset="$2"
  local script="(()=>{const element=($element);scrollTo(0,element.getBoundingClientRect().top+scrollY-$offset);return 1})()"
  browse eval "$script"
  browse wait "$STEP_MS"
  browse eval "$script"
  browse wait "$STEP_MS"
}

load_whole_review() {
  browse eval "(async()=>{for(let top=0;top<document.body.scrollHeight;top+=600){scrollTo(0,top);await new Promise(done=>setTimeout(done,80))}return 1})()"
  browse wait "$STEP_MS"
}

open_review() {
  local scheme="$1" url="$2"
  browse open "about:blank"
  open_page "$WIDTH" "$HEIGHT" "$SCALE" "$scheme" "$url"
  browse eval "document.querySelector('.demo-exit')?.remove()"
  load_whole_review
}

open_board_full_screen() {
  local heading="$1"
  scroll_element_to "$heading" 80
  mark "[...document.querySelectorAll('button[aria-label=\"Full screen\"]')].find(element=>element.getBoundingClientRect().top>0)"
  browse click "#$TARGET_ID"
  browse wait "$STEP_MS"
}

encode_clip() {
  local name="$1" raw="$2"
  local filter="scale=$CLIP_WIDTH:-2:flags=lanczos,fps=30,format=yuv420p"
  ffmpeg -loglevel error -y -i "$raw" -vf "$filter" \
    -c:v libx264 -preset slow -crf 26 -profile:v high -movflags +faststart -an "$MEDIA_DIR/$name.mp4"
  ffmpeg -loglevel error -y -i "$raw" -vf "$filter" \
    -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -an "$MEDIA_DIR/$name.webm"
}

encode_poster() {
  local name="$1" poster="$2"
  ffmpeg -loglevel error -y -i "$poster" -vf "scale=$CLIP_WIDTH:-2:flags=lanczos" "$POSTER_DIR/$name.png"
}

record_review_clip() {
  local name="$1" url="$2" arrange="$3" scenario="$4"
  local scheme
  mkdir -p "$MEDIA_DIR" "$POSTER_DIR"
  for scheme in light dark; do
    local raw="$WORK_DIR/$name-$scheme.webm" poster="$WORK_DIR/$name-$scheme.png"
    open_review "$scheme" "$url"
    "$arrange"
    park_pointer
    browse eval "document.activeElement?.blur()"
    browse record start "$raw" --cursor
    browse wait 1200
    "$scenario" "$poster"
    browse record stop
    encode_clip "$name-$scheme" "$raw"
    encode_poster "$name-poster-$scheme" "$poster"
    echo "recorded $name-$scheme.mp4, $name-$scheme.webm and $name-poster-$scheme.png"
  done
  reset_browser
}
