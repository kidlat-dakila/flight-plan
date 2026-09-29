#!/usr/bin/env python3
"""
Builds the extension's icons from `resources/icon-source.png`.

The source is the mark itself: black line art at 512px, on a transparent
ground rather than a white one, which is why the pipeline drops white *and*
recolours by channel — either kind of source then works.

This script recolours it and places it, so every icon is the approved drawing
rather than a redrawing of it.

Raster in, raster out, so ImageMagick does the work. Its *vector* renderer is
not to be trusted — an earlier attempt at drawing this icon from an SVG had
every stroked path silently dropped and reported success — but compositing and
resampling PNGs is the job it is actually for.

`resources/panel-icon.png`, the editor-tab mark, is built here too, from the
same source. It is one file rather than a light and a dark one: the mark is the
accent in both themes, and two identical files are two things to keep in step.

The tab mark is the same outline, not a filled silhouette. A solid aircraft is a
different drawing, so the strokes are thickened in the source, where there are
pixels to spare, and then reduced.
"""

import os
import shutil
import subprocess
import sys

NAVY = "#161A24"
ACCENT = "#F5A524"

#: The marketplace icon, at the size the documentation asks for.
#:
#: "The path to the icon of at least 128x128 pixels (256x256 for Retina
#: screens)" — the extension manifest reference. It was 128 here, which is the
#: floor rather than the target: on the display most of this is read on, a
#: 128px icon is drawn at 128 logical pixels and upscaled, and looks soft. The
#: source is 512, so 256 is an exact halving with nothing invented.
#:
#: The format is not a choice either. Publishing requires "a PNG file of at
#: least 128x128px", and an SVG is refused outright: "The icon provided in
#: package.json may not be an SVG."
SIZE = 256

#: Both scale with the plate, so changing one size cannot leave the corners or
#: the margin behind.
RADIUS = SIZE * 7 // 32

#: How much of the plate the mark occupies. The source has generous whitespace
#: of its own, so this is trimmed art scaled into a box, not the raw 512px.
INSET = SIZE * 7 // 64

#: Stroke thickening, in source pixels of radius.
#:
#: The source is line art drawn for 512 pixels, and this is measured against
#: how the mark is *displayed*, not how many pixels it is stored in — so it did
#: not change when the plate went from 128 to 256. Compared at the size the
#: Extensions sidebar draws it, around 40 logical pixels: none is faint, 4
#: closes up the gap inside the wing, 2 keeps the drawing and survives.
DILATE = 2

#: The editor-tab mark: 16 logical pixels, so 32 real ones on most displays.
TAB_SIZE = 32

#: A pixel of margin, so the wingtips are not flush with the edge of a tab.
TAB_INSET = 1

#: More thickening, because the reduction is far greater here.
#:
#: Compared at 32: none is legible but soft, and softens further on a display
#: that is not 2x; 6 begins closing the gap inside the wing; 8 closes it. 4 is
#: the most weight the drawing takes without losing that gap.
TAB_DILATE = 4

#: The fraction of the source's height the aircraft occupies.
#:
#: The rule beneath it is dropped for the tab mark: at 16 pixels it is a grey
#: smear under a shape that needs the room. A fraction rather than a measured
#: box because `-trim` immediately afterwards absorbs whatever slack this
#: leaves; it only has to cut above the rule and below the tailplane.
TAB_CROP = 0.66


def recolour(dilate: int) -> list[str]:
    """The steps both marks share: make the line art an accent-coloured stroke."""
    return [
        # White becomes transparent and the black line art becomes the accent,
        # so the mark can sit on a dark plate or on a tab.
        "-fuzz", "25%", "-transparent", "white",
        "-fill", ACCENT, "-colorize", "100",
        # Alpha only: the art is a single colour, so the shape to grow is the
        # transparency mask.
        "-channel", "A", "-morphology", "Dilate", f"Disk:{dilate}", "+channel",
    ]


def fit(size: int, inset: int) -> list[str]:
    """Trim to the ink, then centre it in a square of `size` with a margin.

    Trimmed *before* scaling, or the source's own generous margin would be
    added to the inset and the mark would swim in its frame.
    """
    inner = size - 2 * inset
    return [
        "-trim", "+repage",
        "-resize", f"{inner}x{inner}",
        "-background", "none", "-gravity", "center",
        "-extent", f"{size}x{size}",
    ]


def main() -> int:
    magick = shutil.which("magick") or shutil.which("convert")
    if magick is None:
        print(
            "ImageMagick is required: `brew install imagemagick`.",
            file=sys.stderr,
        )
        return 1

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resources = os.path.join(root, "resources")
    source = os.path.join(resources, "icon-source.png")

    def run(name: str, steps: list[str]) -> None:
        out = os.path.join(resources, name)
        subprocess.run(
            [
                magick,
                source,
                *steps,
                # Nothing but the image.
                #
                # ImageMagick adds ancillary chunks nobody asked for, and the
                # icons of three shipped extensions — eslint, prettier and
                # GitHub Pull Requests — carry none of them. Two are worth
                # naming: `bKGD` gives a decoder a background colour to
                # composite onto, which is licence to throw the transparency
                # away, and `tIME` stamps the build so the same drawing
                # produces a different file every run.
                "-strip",
                "-define",
                "png:exclude-chunks=bKGD,tIME,tEXt,iTXt,zTXt,cHRM,date",
                # And 8-bit RGBA, explicitly. Left to itself ImageMagick picked
                # 16-bit for one of these and a palette for the other — both
                # legal PNG, neither what a consumer expects. `PNG32:` is the
                # one output format every reader agrees on.
                f"PNG32:{out}",
            ],
            check=True,
        )
        print(f"wrote {out}")

    run(
        "icon.png",
        [
            *recolour(DILATE),
            *fit(SIZE, INSET),
            # The plate, drawn underneath.
            "(",
            "-size", f"{SIZE}x{SIZE}", "xc:none",
            "-fill", NAVY,
            "-draw", f"roundrectangle 0,0 {SIZE - 1},{SIZE - 1} {RADIUS},{RADIUS}",
            ")",
            "+swap", "-composite",
        ],
    )

    # No plate: a tab has its own background, and a plate at 16 pixels would
    # spend most of the mark on its own corners.
    run(
        "panel-icon.png",
        [
            *recolour(TAB_DILATE),
            "-gravity", "north", "-crop", f"100x{int(TAB_CROP * 100)}%+0+0", "+repage",
            *fit(TAB_SIZE, TAB_INSET),
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
