APP_URL="${APP_URL:-http://localhost:4200}"
REVIEW_URL="$APP_URL/pr-reviews/react-demo/implement-three-pages-vieworderspage-createorderpage-and-editorderpage"
CONFIGURATION_URL="$APP_URL/settings/profiles/standard"
PAGE_SETTLE_MS=3500
SCROLL_SETTLE_MS=1200
SIGN_BAND_HEIGHT=56
OPEN_NEEDS_ATTENTION_WAYPOINT="(()=>{const waypoint=[...document.querySelectorAll('section[aria-label]')].find(section=>section.getAttribute('aria-label').includes('updateOrder()'));const toggle=waypoint.querySelector('button[aria-expanded]');if(toggle.getAttribute('aria-expanded')==='false'){toggle.click()};waypoint.id='capture-waypoint';return 1})()"

browse() {
  agent-browser "$@" >/dev/null 2>&1
}

evaluate() {
  agent-browser eval "$1" 2>/dev/null | tail -1 | tr -d '"[]'
}

open_page() {
  local width="$1" height="$2" scale="$3" scheme="$4" url="$5"
  browse set viewport "$width" "$height" "$scale"
  browse set media "$scheme"
  browse open "$url"
  browse wait "$PAGE_SETTLE_MS"
}

scroll_element_to() {
  local selector="$1" offset="$2"
  local script="(()=>{const element=document.querySelector('$selector');scrollTo(0,element.getBoundingClientRect().top+scrollY-$offset);return 1})()"
  browse eval "$script"
  browse wait "$SCROLL_SETTLE_MS"
  browse eval "$script"
  browse wait "$SCROLL_SETTLE_MS"
}

crop_screenshot() {
  local raw="$1" out="$2" scale="$3" rect="$4"
  local x y width height
  IFS=, read -r x y width height <<<"$rect"
  ffmpeg -loglevel error -y -i "$raw" -vf "crop=$((width * scale)):$((height * scale)):$((x * scale)):$((y * scale))" "$out"
}

reset_browser() {
  browse set media light
  browse set viewport 1440 900 1
}
