# Screenshots, the hero video and the docs recordings

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

## Docs recordings

The docs pages in `packages/docs` show clips and stills of the app. `capture/record-docs.sh` makes all of them from the demo of the `demo-react` review, so it reads no data of yours and saves nothing.

```bash
nx run site:record-docs
```

It needs the site running (`nx dev site`), because it opens the demo at `http://localhost:4400/demo/demo-react/`. Set `DEMO_URL` to read it elsewhere. Besides agent-browser and `ffmpeg` with `libvpx-vp9`, it needs `cwebp`. It takes about ten minutes.

To record only some of them, or to look at the result first, pass an output folder and a comma-separated list of names:

```bash
bash apps/site/capture/record-docs.sh /tmp/flight-plan-docs-media comments,agent-chat
```

| Name | Kind | Page |
|---|---|---|
| `setup-agents` | Clip of Settings → Agent integration | Setup → Agent integration |
| `setup-git-forge` | Clip of Settings → Git integration | Setup → Git integration, Git connection → GitHub |
| `prompt-configurations` | Still of Settings → Prompt configurations, with the Default radios | Preset profiles and customizing |
| `configuration-editor` | Still of the editor of the duplicated Standard | Preset profiles and customizing |
| `setup-repositories` | Still of the Configure dialog of a repository | Setup → Repositories |
| `review-page` | Still of the top of the review | Review artifacts |
| `segments`, `context` | Stills of the review | Segments, Context |
| `journey-flow-diagram`, `blast-diagram` | Clips that open a node of each diagram | Journey Flow Diagram, Blast Diagram |
| `code-walkthrough` | Clip that steps through waypoints and filters them | Code Walkthrough |
| `context-code-blocks` | Still of a hover card | Context code blocks |
| `comments`, `reviewed-marks`, `submit-review`, `agent-chat` | Clips of each feature | The page of the same name |
| `share` | Still of the Share menu | Sharing |
| `git-features` | Clip of the pull request switcher | Git features |

The Settings clips stand in for setup, because the demo's setup is already complete and the forms are the same.

Each name gives `<name>-light` and `<name>-dark` files in `packages/docs/media/`: a VP9 WebM and a WebP poster for a clip, a WebP for a still. The window is 1280 × 800 at 1.5 times the pixel density. A clip is recorded in real time with an animated pointer, scaled to 1280 wide, and its last frame becomes the poster.

### How a page shows them

A page links the light file the way Markdown links an image:

```md
![Opening a node of the Journey Flow Diagram](../../../media/journey-flow-diagram-light.webm)
```

`src/markdown/theme-media.ts` turns every link to a `-light` file into a light and a dark copy, a `<video>` for a clip and an `<img>` for a still, and `src/styles/docs.css` shows the one that matches the page's theme. Clips play muted in a loop, and stop for visitors who prefer reduced motion. `site:copy-docs-media` copies the folder to `public/docs-media/` before each build and dev run.

### When the demo changes

The scenarios find controls by their accessible names, such as `Next waypoint` or `Submit review`, and the parts of the review by their element ids. If a scenario stops with "nothing to click for", compare that name with the app. The demo fixtures have no findings, so the Findings page has no clip.
