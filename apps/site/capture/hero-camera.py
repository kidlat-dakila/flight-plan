import json
import subprocess
import sys

from PIL import Image

OUTPUT_WIDTH = 1920
OUTPUT_HEIGHT = 1200
FRAMES_PER_SECOND = 30
MOVE_SECONDS = 1.1
MAX_ZOOM = 1.6
FRAME_PADDING = 36


def ease_in_out(progress):
    if progress < 0.5:
        return 4 * progress ** 3
    return 1 - (-2 * progress + 2) ** 3 / 2


def probe_size(path):
    report = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path],
        check=True,
        capture_output=True,
        text=True,
    )
    stream = json.loads(report.stdout)["streams"][0]
    return stream["width"], stream["height"]


def read_shots(path):
    with open(path) as log:
        rows = [line.split() for line in log if line.strip()]
    return [(float(row[0]), tuple(float(value) for value in row[1:5])) for row in rows]


def clamp(value, low, high):
    return max(low, min(high, value))


def frame_shot(rect, view_width, view_height):
    left, top, width, height = rect
    right = clamp(left + width, 0, view_width)
    bottom = clamp(top + height, 0, view_height)
    left = clamp(left, 0, view_width)
    top = clamp(top, 0, view_height)
    aspect = view_width / view_height
    shot_width = max(right - left + 2 * FRAME_PADDING, (bottom - top + 2 * FRAME_PADDING) * aspect, view_width / MAX_ZOOM)
    shot_width = min(shot_width, view_width)
    return (left + right) / 2, (top + bottom) / 2, shot_width


def keep_in_view(camera, view_width, view_height):
    centre_x, centre_y, width = camera
    height = width * view_height / view_width
    return (
        clamp(centre_x, width / 2, view_width - width / 2),
        clamp(centre_y, height / 2, view_height - height / 2),
        width,
    )


def blend(origin, target, progress):
    eased = ease_in_out(clamp(progress, 0, 1))
    width = origin[2] * (target[2] / origin[2]) ** eased
    return (
        origin[0] + (target[0] - origin[0]) * eased,
        origin[1] + (target[1] - origin[1]) * eased,
        width,
    )


def camera_path(shots, frame_count, view_width, view_height):
    wide = (view_width / 2, view_height / 2, view_width)
    targets = [(start, keep_in_view(frame_shot(rect, view_width, view_height), view_width, view_height)) for start, rect in shots]
    camera, origin, move_start, target = wide, wide, 0.0, wide
    upcoming = list(targets)
    path = []
    for frame in range(frame_count):
        time = frame / FRAMES_PER_SECOND
        while upcoming and upcoming[0][0] <= time:
            move_start, target = upcoming.pop(0)
            origin = camera
        camera = blend(origin, target, (time - move_start) / MOVE_SECONDS)
        path.append(camera)
    return path


def crop_box(camera, view_width, view_height, pixel_scale):
    centre_x, centre_y, width = keep_in_view(camera, view_width, view_height)
    height = width * view_height / view_width
    return (
        (centre_x - width / 2) * pixel_scale,
        (centre_y - height / 2) * pixel_scale,
        (centre_x + width / 2) * pixel_scale,
        (centre_y + height / 2) * pixel_scale,
    )


def frame_budget(path):
    report = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(float(report.stdout.strip()) * FRAMES_PER_SECOND) + FRAMES_PER_SECOND


def render(raw_path, shots_path, output_path, view_width, view_height):
    raw_width, raw_height = probe_size(raw_path)
    pixel_scale = raw_width / view_width
    path = camera_path(read_shots(shots_path), frame_budget(raw_path), view_width, view_height)
    decoder = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-i", raw_path, "-vf", f"fps={FRAMES_PER_SECOND}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    encoder = subprocess.Popen(
        [
            "ffmpeg", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OUTPUT_WIDTH}x{OUTPUT_HEIGHT}", "-r", str(FRAMES_PER_SECOND), "-i", "-",
            "-c:v", "libx264", "-preset", "fast", "-crf", "10", "-pix_fmt", "yuv444p", output_path,
        ],
        stdin=subprocess.PIPE,
    )
    frame_bytes = raw_width * raw_height * 3
    for camera in path:
        data = decoder.stdout.read(frame_bytes)
        if len(data) < frame_bytes:
            break
        frame = Image.frombuffer("RGB", (raw_width, raw_height), data)
        shot = frame.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), Image.Resampling.LANCZOS, box=crop_box(camera, view_width, view_height, pixel_scale))
        encoder.stdin.write(shot.tobytes())
    encoder.stdin.close()
    decoder.stdout.close()
    decoder.wait()
    encoder.wait()


render(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
