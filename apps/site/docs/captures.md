# Screenshots, videos and the docs recordings

The landing page shows the real Flight Plan app: a looping video behind the hero, a looping video in each feature panel of the review, and a screenshot in the Change Overview and configurations panels. Five scripts in `apps/site/capture/` capture all of them but the Change Overview from the running app or the site's demo, so they can be made again the same way after the app changes.

## What is captured

| Files | Where the site shows them | Made by |
|---|---|---|
| `public/media/hero-*.webm`, `hero-*.mp4`, `src/assets/screenshots/hero-poster-*.png` | The hero | `record-hero` |
| `public/media/trace-*`, `src/assets/screenshots/trace-poster-*.png` | The Trace Diagram panel | `record-trace` |
| `public/media/blast-*`, `src/assets/screenshots/blast-poster-*.png` | The Blast Diagram panel | `record-blast` |
| `public/media/walkthrough-waypoints-*`, `src/assets/screenshots/walkthrough-waypoints-poster-*.png` | The waypoints panel | `record-walkthrough` |
| `public/media/walkthrough-filters-*`, `src/assets/screenshots/walkthrough-filters-poster-*.png` | The filters panel | `record-walkthrough` |
| `public/media/walkthrough-tooltips-*`, `src/assets/screenshots/walkthrough-tooltips-poster-*.png` | The hover cards panel | `record-walkthrough` |
| `src/assets/screenshots/customize-*.png` | The configurations panel | `capture-screenshots` |
| `src/assets/screenshots/change-overview.png` | The Change Overview panel | A screenshot taken by hand in dark mode, shown in both colour schemes |

Every video is an H.264 MP4 and a VP9 WebM, and every file but the Change Overview exists in a light and a dark version; the page picks the one that matches the visitor's colour scheme. The poster is the still frame shown before a video plays, on phones for the hero, and to visitors who prefer reduced motion. `src/components/review-screenshots.ts` imports the files and holds the alt text of each poster. `src/components/FeatureVideo.astro` shows a panel's video over its poster and starts it once the panel is in view.

## Where the pictures come from

Every video comes from the review of the `demo-react` pull request, "Implement three pages ViewOrdersPage, CreateOrderPage and EditOrderPage". It is a playground fixture in `tools/playground-fixtures/test-cases/demo-react/`, and the review's prose is part of the fixture, so every machine shows the same review.

The trace video records segment 4 of it, "New ViewOrdersPage", in the app, where the development build of the backend lists the fixtures on the index page as repositories. The other videos record segment 1 in the site's demo, at `http://localhost:4400/demo/demo-react/#/pr-reviews/orders-web/pr-128`, so they read no data of yours and start with no reviewed marks.

The configurations screenshot is the settings page of the Standard preset, at `/settings/profiles/standard`, with the "Waypoint reading" field open.

## Before you capture

- Install [agent-browser](https://github.com/vercel-labs/agent-browser), `ffmpeg` with the `libx264` and `libvpx-vp9` encoders, and `python3`.
- For the hero, blast and walkthrough videos, start the site with `nx dev site`. They read the demo at `http://localhost:4400/demo/demo-react/`; set `DEMO_URL` to read it elsewhere.
- For the trace video and the configurations screenshot, start the app with `pnpm dev`. `record-trace` and `capture-screenshots` read it at `http://localhost:4200`; set `APP_URL` to read it elsewhere.
- Clear every reviewed mark in the `demo-react` review of the app. A reviewed waypoint is drawn faded, and the trace video shows it that way.
- Leave the Standard preset as it ships. The settings page shows your own changes to it, and the screenshot would show them too.

## Capturing

Each target writes over the files the site uses:

| Target | Takes about |
|---|---|
| `nx run site:record-hero` | 3 minutes |
| `nx run site:record-trace` | 2 minutes |
| `nx run site:record-blast` | 2 minutes |
| `nx run site:record-walkthrough` | 4 minutes |
| `nx run site:capture-screenshots` | 30 seconds |

To look at the result before it replaces anything, run a script with output folders of your own, the media folder first and the poster folder second:

```bash
bash apps/site/capture/record-blast.sh /tmp/flight-plan-media /tmp/flight-plan-posters
```

`record-walkthrough.sh` takes a third argument, a comma-separated list of the clips to record: `waypoints`, `filters` and `tooltips`.

```bash
bash apps/site/capture/record-walkthrough.sh /tmp/flight-plan-media /tmp/flight-plan-posters filters
```

Then rebuild the site with `nx build site` and look at the landing page with `nx dev site`.

## How each capture is made

### Hero video

`record-hero.sh` records the review one frame at a time instead of in real time, so the scrolling stays smooth whatever the machine's speed.

1. It opens the demo's review in a 1440 × 900 window at 1.5 times the pixel density, removes the demo's "Other repositories" link, and opens the waypoint for `updateOrder()`.
2. It scrolls through the page once so that every part loads.
3. It stops at four places: the Context of segment 1, its Trace Diagram, its Blast Diagram and the `updateOrder()` waypoint. Between two stops it takes 36 frames along an ease-in-out curve.
4. `ffmpeg` holds each stop for 2.4 seconds, crossfades from the last frame back to the first so the loop has no jump, cuts off the app's top band and scales the frames to 1920 × 1124.
5. It writes the videos at 30 frames per second and saves the last frame as the poster.

### Panel videos

`record-trace.sh`, `record-blast.sh` and `record-walkthrough.sh` record in real time, with agent-browser's pointer drawn over the page, so the clicks, drags and hovers show. What they share is in `review-clip.sh`. For each clip it opens the review in a 1200 × 750 window at twice the pixel density, removes the demo's "Other repositories" link, scrolls through the page once so that every part loads, and arranges the starting view. It then parks the pointer, takes the focus off the page, and records the clip's steps. Every clip ends in the view it started from, so it loops without a jump. The videos are scaled to 1600 × 1000 at 30 frames per second, and each script saves one moment of its clip as the poster.

The two diagrams are recorded in full screen. Before clicking a node that the side panel covers, or one pushed past the left edge, the script drags the board until the node is in view.

| Clip | Starts at | Steps | Poster |
|---|---|---|---|
| Trace | The diagram of segment 4, in full screen | Clicks the `ViewOrdersPage` card, then its rows "The orders loaded from the API" and "Renders one table row per order", each of which marks its lines in the side panel. Clicks the `useOrders` card and its row "The query that loads the orders", and opens the waypoint of `useOrders()` in the panel. Closes the panel with Escape and resets the view with T. | The `useOrders()` waypoint open |
| Blast | The Blast Diagram of segment 1, in full screen | Clicks `router.tsx`, then `src/main.tsx`, the file the change reaches without changing what it does, then `use-orders.ts`. Closes the panel, presses Import bound to add the files the change did not touch, then presses Export bound and resets the view with T. | The Import bound view |
| Waypoints | The waypoint for `updateOrder()`, marked Risk | Opens it, scrolls through its finding and trace, presses Preview the fix, then Hide the fix, scrolls back and closes it. | The fix open |
| Filters | The heading of segment 1's Code Walkthrough | Opens the first waypoint, ticks Component and Hook in the Filter menu, then unticks them and closes the first waypoint. | The filtered walkthrough |
| Tooltips | Line 14 of `OrderForm.tsx` | Hovers `OrderForm`, an exported function whose card lists the 2 files that use it, then `draft`, a variable whose card shows the line that defines it. | The card of `OrderForm` |

### Configurations screenshot

`capture-screenshots.sh` opens the settings page of the Standard preset in a 1440 × 900 window at twice the pixel density, opens the "Waypoint reading" field, and crops the field index and the field panel at 220, 330, 1000 × 560 with `ffmpeg`.

## When the app changes

The scripts find each part by its element id, such as `fixture-segment-1-blast-diagram-heading` or `fixture-segment-1-file-4`, a waypoint by a name in its label, such as `updateOrder()`, and nodes, rows, buttons and filter options by the names and labels they show. If a script stops with "nothing to click for", compare that name with the review page.

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
| `trace-diagram`, `blast-diagram` | Clips that open a node of each diagram | Trace Diagram, Blast Diagram |
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
![Opening a node of the Trace Diagram](../../../media/trace-diagram-light.webm)
```

`src/markdown/theme-media.ts` turns every link to a `-light` file into a light and a dark copy, a `<video>` for a clip and an `<img>` for a still, and `src/styles/docs.css` shows the one that matches the page's theme. Clips play muted in a loop, and stop for visitors who prefer reduced motion. `site:copy-docs-media` copies the folder to `public/docs-media/` before each build and dev run.

### When the demo changes

The scenarios find controls by their accessible names, such as `Next waypoint` or `Submit review`, and the parts of the review by their element ids. If a scenario stops with "nothing to click for", compare that name with the app. The demo fixtures have no findings, so the Findings page has no clip.
