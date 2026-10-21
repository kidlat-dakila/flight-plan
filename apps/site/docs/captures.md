# Screenshots, videos and the docs recordings

The landing page shows the real Flight Plan app: a looping video behind the hero, a looping video in the Change Overview panel and in each feature panel of the review, and a screenshot in the Spotlight, explain on demand and configurations panels. Six scripts in `apps/site/capture/` capture all of them from the site's demo, so they can be made again the same way after the app changes.

## What is captured

| Files | Where the site shows them | Made by |
|---|---|---|
| `public/media/hero-*.webm`, `hero-*.mp4`, `src/assets/screenshots/hero-poster-*.png` | The hero | `record-hero` |
| `public/media/change-overview-*`, `src/assets/screenshots/change-overview-poster-*.png` | The Change Overview panel | `record-change-overview` |
| `public/media/trace-*`, `src/assets/screenshots/trace-poster-*.png` | The Trace Diagram panel | `record-trace` |
| `public/media/blast-*`, `src/assets/screenshots/blast-poster-*.png` | The Blast Diagram panel | `record-blast` |
| `public/media/walkthrough-waypoints-*`, `src/assets/screenshots/walkthrough-waypoints-poster-*.png` | The waypoints panel | `record-walkthrough` |
| `public/media/walkthrough-filters-*`, `src/assets/screenshots/walkthrough-filters-poster-*.png` | The filters panel | `record-walkthrough` |
| `public/media/walkthrough-tooltips-*`, `src/assets/screenshots/walkthrough-tooltips-poster-*.png` | The hover cards panel | `record-walkthrough` |
| `src/assets/screenshots/spotlight-*.png` | The Spotlight panel | `capture-screenshots` |
| `src/assets/screenshots/explain-*.png` | The explain on demand panel | `capture-screenshots` |
| `src/assets/screenshots/customize-*.png` | The configurations panel | `capture-screenshots` |

Every video is an H.264 MP4 and a VP9 WebM, and every file exists in a light and a dark version; the page picks the one that matches the visitor's colour scheme. The poster is the still frame shown before a video plays, on phones for the hero, and to visitors who prefer reduced motion. `src/components/review-screenshots.ts` imports the files and holds the alt text of each poster and screenshot. `src/components/FeatureVideo.astro` shows a panel's video over its poster and starts it once the panel is in view.

## Where the pictures come from

Every picture but the trace video comes from the site's demo of the `demo-react` review, at `http://localhost:4400/demo/demo-react/#/pr-reviews/pokedex-web/pr-57`, the pull request "Implement page PokemonPage". The trace video comes from the `demo-fastapi` review, at `http://localhost:4400/demo/demo-fastapi/#/pr-reviews/pokedex-api/pr-42`, the pull request "Implement route /api/pokemon", whose segment 2 draws a larger diagram. Both are playground fixtures in `tools/playground-fixtures/test-cases/`, and each review's prose is part of its fixture, so every machine shows the same reviews. Every part of them is written, so no picture shows a hint, Not explained yet or the drafting strip.

The demo keeps everything in memory, so the captures read no data of yours, start with no reviewed marks and show the presets as they ship. Before each page, `open_page` in `browser.sh` opens the site's home page and writes `flightplan-guide-tooltips` with `isOff: true` to its local storage, so no guide tip covers the review. The trace video records segment 2 of the FastAPI review, "New route handlers, service functions and Pokemon model, modified app". The Change Overview video records the Change Overview of segment 2 of the React review, and the other videos record its segment 1. The Spotlight screenshot is the waypoint for `usePokemon()`, marked Core change and Spotlight. The explain on demand screenshot is the dialog that "Explain this review" in the ⚙ menu opens. The configurations screenshot is the demo's settings page of the Standard preset, at `#/settings/profiles/standard`, with the "Waypoint reading" field open.

## Before you capture

- Install [agent-browser](https://github.com/vercel-labs/agent-browser), `ffmpeg` with the `libx264` and `libvpx-vp9` encoders, and `python3`.
- Start the site with `nx dev site`. The scripts read the demo at `http://localhost:4400/demo/demo-react/`; set `DEMO_URL` to read it elsewhere.

## Capturing

Each target writes over the files the site uses:

| Target | Takes about |
|---|---|
| `nx run site:record-hero` | 3 minutes |
| `nx run site:record-change-overview` | 1 minute |
| `nx run site:record-trace` | 2 minutes |
| `nx run site:record-blast` | 2 minutes |
| `nx run site:record-walkthrough` | 4 minutes |
| `nx run site:capture-screenshots` | 1 minute |

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

1. It opens the demo's review in a 1440 × 900 window at 1.5 times the pixel density, removes the demo's "Other repositories" link, and opens the waypoint for `usePokemon()`.
2. It scrolls through the page once so that every part loads.
3. It stops at four places: the Context of segment 1, its Trace Diagram, its Blast Diagram and the `usePokemon()` waypoint. Between two stops it takes 36 frames along an ease-in-out curve.
4. `ffmpeg` holds each stop for 2.4 seconds, crossfades from the last frame back to the first so the loop has no jump, cuts off the app's top band and scales the frames to 1920 × 1124.
5. It writes the videos at 30 frames per second and saves the last frame as the poster.

### Panel videos

`record-change-overview.sh`, `record-trace.sh`, `record-blast.sh` and `record-walkthrough.sh` record in real time, with agent-browser's pointer drawn over the page, so the clicks, drags and hovers show. What they share is in `review-clip.sh`. For each clip it opens the review in a 1440 × 900 window at twice the pixel density, wide enough for the Review Navigator at the foot of the page to keep its labels in every section, removes the demo's "Other repositories" link, scrolls through the page once so that every part loads, and arranges the starting view. It then parks the pointer, takes the focus off the page, and records the clip's steps. Every clip ends in the view it started from, so it loops without a jump. The videos are scaled to 1600 × 1000 at 30 frames per second, and each script saves one moment of its clip as the poster.

The two diagrams are recorded in full screen. Before clicking a node that the side panel covers, or one pushed past the left edge, the script drags the board until the node is in view.

| Clip | Starts at | Steps | Poster |
|---|---|---|---|
| Change Overview | The Change Overview of segment 2 | Hovers the cards of `fetchPokemon`, `usePokemon` and `PokemonPage`, from the bottom row up, each of which shows its code, then parks the pointer. | The card of `usePokemon` with its code |
| Trace | The diagram of segment 2 of the FastAPI review, in full screen | Clicks the `add_pokemon` card, which opens its code in the side panel, and closes the panel with Escape. Clicks the row "Commits the insert to the database" of `create_pokemon`, then opens the waypoint for that line in the panel. After each click the pointer moves to an empty spot of the board, so it doesn't rest on the code in the panel. Closes the panel with Escape. | The waypoint for `session.commit()` open |
| Blast | The Blast Diagram of segment 1, in full screen | Clicks `router.tsx`, then `src/main.tsx`, the file the change reaches without changing what it does, then `use-pokemon.ts`. Closes the panel, presses Import bound to add the files the change did not touch, then presses Export bound and drags the board back to where it started. | The Import bound view |
| Waypoints | The waypoint for the trainers query in `PokemonFilters.tsx`, marked Risk | Opens it, scrolls through its finding and trace, presses Preview the fix, then Hide the fix, scrolls back and closes it. | The fix open |
| Filters | The heading of segment 1's Code Walkthrough | Opens the first waypoint, ticks Component and UI state in the Filter menu, which goes to the first waypoint the filter keeps, then unticks them, closes the first waypoint and scrolls back to the heading. | The filtered walkthrough |
| Tooltips | Line 12 of `pokemon-filters.ts` | Hovers `usePokemonFilters`, the exported store, whose card lists the files that use it, then `set`, whose card shows the line that defines it. | The card of `usePokemonFilters` |

### Screenshots

`capture-screenshots.sh` loads the page again for each screenshot and crops it with `ffmpeg`.

- Spotlight: the demo's review in a 1200 × 1000 window at twice the pixel density, with the waypoint for `usePokemon()` open and scrolled to 160 pixels below the top, cropped from 10 pixels above the waypoint to 104 pixels below it, which shows the first lines of its code.
- Explain on demand: the same window after "Explain this review" in the ⚙ menu, cropped to the dialog with a 40-pixel margin.
- Configurations: the settings page of the Standard preset in a 1440 × 900 window at twice the pixel density, opens the "Waypoint reading" field, and crops the field index and the field panel at 220, 330, 1000 × 560.

## When the app changes

The scripts find each part by its element id, such as `fixture-segment-1-blast-diagram-heading` or `fixture-segment-1-file-4`, a waypoint by a name in its label, such as `usePokemon()`, and nodes, rows, buttons and filter options by the names and labels they show. If a script stops with "nothing to click for", compare that name with the review page.

The hero lines the video up with its text through `--frame-rail` in `src/components/HeroMedia.astro`. It is the width of the review page's left column (the section rail, its gap and the gutter, 16.5rem in a 1440 window) as a share of the video's height. If that column changes width on the review page, change `--frame-rail` with it, or the video either covers the text or leaves a gap beside it.

When a capture shows different content, update its alt text in `src/components/review-screenshots.ts`.

## Docs recordings

The docs pages in `packages/docs` show clips and stills of the app. `capture/record-docs.sh` makes all of them from the site's demo, so it reads no data of yours and saves nothing. Most come from the React review, `pokedex-web/pr-57`. The Trace Diagram clip comes from segment 2 of the FastAPI review, `pokedex-api/pr-42`, which draws a larger diagram. Every part of the demo reviews is written, so no picture shows a hint, Not explained yet or the drafting strip.

```bash
nx run site:record-docs
```

It needs the site running (`nx dev site`), because it opens the demo at `http://localhost:4400`. Set `SITE_URL` to read it elsewhere. Besides agent-browser and `ffmpeg` with `libvpx-vp9`, it needs `cwebp`. It takes about ten minutes.

Before each picture the script opens the site's home page and writes `flightplan-guide-tooltips` with `isOff: true` to its local storage, so no guide tip covers the page. Writing it from inside the running demo does not work, because the app writes its own record back over it.

To record only some of them, or to look at the result first, pass an output folder and a comma-separated list of names:

```bash
bash apps/site/capture/record-docs.sh /tmp/flight-plan-docs-media comments,agent-chat
```

| Name | Kind | Page |
|---|---|---|
| `setup-agents` | Clip of Settings → Agent integration that checks Codex and picks a model and an effort for Claude | Setup → Agent integration |
| `setup-git-forge` | Clip of Settings → Git integration that checks GitHub token and types a token | Setup → Git integration, Git connection → GitHub |
| `setup-repositories` | Still of Settings → Repositories | Setup → Repositories |
| `review-configuration` | Still of Settings → Review configuration | Setup → Review configuration |
| `prompt-configurations` | Still of Settings → Prompt configurations, with a copy of Standard under Your configurations | Prompt configurations |
| `configuration-editor` | Still of the copy of Standard, open on the Waypoint reading field | Prompt configurations |
| `review-page` | Still of the top of the review | Review artifacts |
| `segments`, `context` | Stills of the heading of segment 2 and of its Context | Segments, Context |
| `change-overview` | Clip that hovers three cards of the Change Overview of segment 2 | Change Overview |
| `trace-diagram` | Clip of the FastAPI review's segment 2 in full screen, which opens a row and a node in the side panel | Trace Diagram |
| `blast-diagram` | Clip of segment 1 in full screen, which switches the bound and opens `src/main.tsx` | Blast Diagram |
| `code-walkthrough` | Clip that steps through waypoints with Next waypoint and filters them to Core change | Code Walkthrough |
| `context-code-blocks` | Still of the hover card of `usePokemonFilters` | Context code blocks |
| `findings` | Still of the Risk waypoint on the trainers query in `PokemonFilters.tsx`, with its fix previewed | Findings |
| `explain-dialog` | Still of the dialog that ⚙ Explain this review opens | Explaining a review |
| `review-navigator` | Clip that jumps to the Blast Diagram, then goes on to the Code Walkthrough and its next waypoints | Review Navigator |
| `comments`, `reviewed-marks`, `submit-review`, `agent-chat` | Clips of each feature | The page of the same name |
| `share` | Still of the Share menu | Sharing |
| `git-features` | Still of the pull request switcher | Git features |

The Settings pictures stand in for setup, because the demo's setup is already complete and the forms are the same. The demo has one pull request per repository, so the switcher lists only that one.

Each name gives `<name>-light` and `<name>-dark` files in `packages/docs/media/`: a VP9 WebM and a WebP poster for a clip, a WebP for a still. The window is 1440 × 900 at 1.5 times the pixel density, wide enough for the Review Navigator to keep its labels in every section. A clip is recorded in real time with an animated pointer, scaled to 1280 wide, and its last frame becomes the poster.

### How a page shows them

A page links the light file the way Markdown links an image:

```md
![Opening a node of the Trace Diagram](../../../media/trace-diagram-light.webm)
```

`src/markdown/theme-media.ts` turns every link to a `-light` file into a light and a dark copy, a `<video>` for a clip and an `<img>` for a still, and `src/styles/docs.css` shows the one that matches the page's theme. Clips play muted in a loop, and stop for visitors who prefer reduced motion. `site:copy-docs-media` copies the folder to `public/docs-media/` before each build and dev run.

### When the demo changes

The scenarios find controls by their accessible names, such as `Next waypoint` or `Submit review`, and the parts of the review by their element ids, such as `fixture-segment-1-file-4`. If a scenario stops with "nothing to click for", compare that name with the app.
