# Screenshots and the hero video

The landing page shows the real Flight Plan app: a looping video behind the hero, and one screenshot for each feature panel. Two scripts in `apps/site/capture/` capture all of them from the running app, so they can be made again the same way after the app changes.

## What is captured

| File | Where the site shows it | Made by |
|---|---|---|
| `public/media/hero-light.webm`, `hero-light.mp4`, `hero-dark.webm`, `hero-dark.mp4` | The hero video, light and dark | `record-hero` |
| `src/assets/screenshots/hero-poster-light.png`, `hero-poster-dark.png` | The still frame shown before the video plays, on phones, and under reduced motion | `record-hero` |
| `src/assets/screenshots/context-*.png` | The Context panel | `capture-screenshots` |
| `src/assets/screenshots/journey-*.png` | The Journey Flow Diagram panel | `capture-screenshots` |
| `src/assets/screenshots/blast-*.png` | The Blast Diagram panel | `capture-screenshots` |
| `src/assets/screenshots/walkthrough-*.png` | The Code Walkthrough panel | `capture-screenshots` |
| `src/assets/screenshots/customize-*.png` | The configurations panel | `capture-screenshots` |

Every file exists in a light and a dark version, and the page picks the one that matches the visitor's colour scheme. `src/components/review-screenshots.ts` imports them and holds the alt text of each one.

## Where the pictures come from

Everything except the configurations screenshot comes from the review of the `demo-react` pull request, "Implement three pages ViewOrdersPage, CreateOrderPage and EditOrderPage". It is a playground fixture in `tools/playground-fixtures/test-cases/demo-react/`, and the development build of the backend lists the fixtures on the index page as repositories. The review's prose is part of the fixture, so every machine shows the same review.

The configurations screenshot is the settings page of the Standard preset, at `/settings/profiles/standard`, with the "Waypoint reading" field open.

## Before you capture

- Install [agent-browser](https://github.com/vercel-labs/agent-browser), `ffmpeg` with the `libx264` and `libvpx-vp9` encoders, and `python3`.
- Start the app with `pnpm dev`. The scripts read it at `http://localhost:4200`; set `APP_URL` to read it elsewhere.
- Leave the Standard preset as it ships. The settings page shows your own changes to it, and the screenshot would show them too.
- Clear every reviewed mark in the `demo-react` review. A reviewed waypoint or file is drawn faded, and the captures show it that way.

The scripts drive agent-browser's own browser. They open pages, scroll and open one waypoint, and they save nothing in the app.

## Capturing

```bash
nx run site:capture-screenshots
```

```bash
nx run site:record-hero
```

Each target writes over the files the site uses. `capture-screenshots` takes about a minute and `record-hero` about three. To look at the result before it replaces anything, run a script with output folders of your own:

```bash
bash apps/site/capture/capture-screenshots.sh /tmp/flight-plan-screenshots
```

```bash
bash apps/site/capture/record-hero.sh /tmp/flight-plan-media /tmp/flight-plan-posters
```

Then rebuild the site with `nx build site` and look at the landing page with `nx dev site`.

## How each capture is made

### Feature screenshots

`capture-screenshots.sh` opens the review in a tall window at twice the pixel density, scrolls each part into place, takes a screenshot and crops it with `ffmpeg`. The crop is measured from the page, so it follows the part when the layout moves.

| Screenshot | Window | Crop |
|---|---|---|
| Context | 1100 × 1600 | From the Context heading of segment 1: 740 × 600 |
| Journey Flow Diagram | 1100 × 1600 | The diagram board of segment 1: its full width, 800 high |
| Blast Diagram | 1440 × 1600 | The Blast Diagram band of segment 1, from just below its top edge |
| Code Walkthrough | 1440 × 1600 | From the Code Walkthrough heading of segment 1: the band's full width, 720 high |
| Configurations | 1440 × 900 | The field index and the field panel of "Waypoint reading", at 220, 330, 1000 × 560 |

The Blast Diagram and the Code Walkthrough use the wider window because their headers cut text short at 1100.

### Hero video

`record-hero.sh` records the review one frame at a time instead of in real time, so the scrolling stays smooth whatever the machine's speed.

1. It opens the review in a 1440 × 900 window at 1.5 times the pixel density and opens the waypoint for `updateOrder()`, the one with the Needs Attention note.
2. It scrolls through the page once so that every part loads.
3. It stops at four places: the Context of segment 1, its Journey Flow Diagram, its Blast Diagram and the `updateOrder()` waypoint. Between two stops it takes 36 frames along an ease-in-out curve.
4. `ffmpeg` holds each stop for 2.4 seconds, crossfades from the last frame back to the first so the loop has no jump, cuts off the app's top band and scales the frames to 1920 × 1124.
5. It writes an H.264 MP4 and a VP9 WebM at 30 frames per second, and saves the last frame as the poster.

## When the app changes

The scripts find each part by its element id, such as `fixture-segment-1-context-heading` or `fixture-segment-1-blast-diagram`, and the waypoint by the `updateOrder()` in its label. If a capture comes out empty or shows the wrong part, those ids are the first thing to compare with the review page.

The hero lines the video up with its text through `--frame-rail` in `src/components/HeroMedia.astro`. It is the width of the review page's left column (the section rail, its gap and the gutter, 16.5rem in a 1440 window) as a share of the video's height. If that column changes width on the review page, change `--frame-rail` with it, or the video either covers the text or leaves a gap beside it.

When a capture shows different content, update its alt text in `src/components/review-screenshots.ts`.
