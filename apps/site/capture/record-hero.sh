#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA_DIR="${1:-$SCRIPT_DIR/../public/media}"
POSTER_DIR="${2:-$SCRIPT_DIR/../src/assets/screenshots}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
source "$SCRIPT_DIR/browser.sh"

SCALE=1.5
FRAME_SETTLE_MS=90
MOVE_FRAMES=36
CROSSFADE_FRAMES=24
FRAMES_PER_SECOND=30
OUTPUT_FILTER="crop=2160:1264:0:84,scale=1920:1124:flags=lanczos"

stop_offsets() {
  evaluate "(()=>{const top=(selector,offset)=>Math.round(document.querySelector(selector).getBoundingClientRect().top+scrollY-offset);return [top('#fixture-segment-1-context-heading',80),top('#fixture-segment-1-journey-fixture-segment-1 > div.rounded-md',90),top('#fixture-segment-1-blast-diagram',90),top('#capture-waypoint',300)].join(' ')})()"
}

write_timeline() {
  python3 - "$1" "$MOVE_FRAMES" <<'PY'
import sys

stops = [int(value) for value in sys.argv[1].split()]
move_frames = int(sys.argv[2])
ease = lambda t: 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2
for index, stop in enumerate(stops):
    print(stop)
    if index + 1 < len(stops):
        target = stops[index + 1]
        for frame in range(1, move_frames):
            print(round(stop + (target - stop) * ease(frame / move_frames)))
PY
}

write_playlist() {
  python3 - "$1" "$2" "$FRAMES_PER_SECOND" "$CROSSFADE_FRAMES" "$MOVE_FRAMES" <<'PY'
import sys

folder, frame_count, fps, crossfade, move = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
frame = 1 / fps
last = frame_count - 1
holds = {index: 2.4 for index in range(0, last, move)}
holds[last] = 1.0
entries = [(f"{last:04d}.png", 1.4)]
entries += [(f"crossfade_{index:02d}.png", frame) for index in range(1, crossfade + 1)]
entries += [(f"{index:04d}.png", holds.get(index, frame)) for index in range(frame_count)]
for name, duration in entries:
    print(f"file '{folder}/{name}'\nduration {duration:.4f}")
print(f"file '{folder}/{entries[-1][0]}'")
PY
}

record_frames() {
  local scheme="$1" frames="$2"
  open_page 1440 900 "$SCALE" "$scheme" "$REVIEW_URL"
  browse eval "$OPEN_NEEDS_ATTENTION_WAYPOINT"
  for warm_up in 2000 4000 6000 8000 10000 0; do
    browse eval "scrollTo(0,$warm_up)"
    browse wait 700
  done
  local index=0
  while read -r offset; do
    browse eval "scrollTo(0,$offset)"
    browse wait "$FRAME_SETTLE_MS"
    agent-browser screenshot "$frames/$(printf %04d "$index").png" >/dev/null 2>&1
    index=$((index + 1))
  done < <(write_timeline "$(stop_offsets)")
  echo "$index"
}

write_crossfade() {
  local frames="$1" last="$2"
  for index in $(seq 1 "$CROSSFADE_FRAMES"); do
    local weight
    weight="$(python3 -c "print(round($index / ($CROSSFADE_FRAMES + 1), 4))")"
    ffmpeg -loglevel error -y -i "$frames/$last" -i "$frames/0000.png" \
      -filter_complex "[0][1]blend=all_expr='A*(1-$weight)+B*$weight'" "$frames/crossfade_$(printf %02d "$index").png"
  done
}

encode() {
  local scheme="$1" frames="$2" frame_count="$3"
  local last
  last="$(printf %04d $((frame_count - 1))).png"
  write_crossfade "$frames" "$last"
  write_playlist "$frames" "$frame_count" > "$frames/playlist.txt"
  local filter="$OUTPUT_FILTER,fps=$FRAMES_PER_SECOND,format=yuv420p"
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$frames/playlist.txt" -vf "$filter" \
    -c:v libx264 -preset slow -crf 28 -profile:v high -movflags +faststart -an "$MEDIA_DIR/hero-$scheme.mp4"
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$frames/playlist.txt" -vf "$filter" \
    -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -an "$MEDIA_DIR/hero-$scheme.webm"
  ffmpeg -loglevel error -y -i "$frames/$last" -vf "$OUTPUT_FILTER" "$POSTER_DIR/hero-poster-$scheme.png"
  echo "recorded hero-$scheme.mp4, hero-$scheme.webm and hero-poster-$scheme.png"
}

mkdir -p "$MEDIA_DIR" "$POSTER_DIR"
for scheme in light dark; do
  frames="$WORK_DIR/$scheme"
  mkdir -p "$frames"
  frame_count="$(record_frames "$scheme" "$frames" | tail -1)"
  encode "$scheme" "$frames" "$frame_count"
done
reset_browser
