---
name: Flight Plan
description: Transit signage for code review. Every repository is a line and every review target is a stop on it.
colors:
  background: "oklch(0.975 0.004 255)"
  background-dark: "oklch(0.17 0.012 262)"
  foreground: "oklch(0.2 0.02 262)"
  foreground-dark: "oklch(0.95 0.005 255)"
  card: "oklch(1 0 0)"
  card-dark: "oklch(0.21 0.014 262)"
  primary: "oklch(0.2 0.02 262)"
  primary-dark: "oklch(0.95 0.005 255)"
  primary-foreground: "oklch(0.985 0.002 255)"
  primary-foreground-dark: "oklch(0.2 0.02 262)"
  muted: "oklch(0.945 0.006 255)"
  muted-dark: "oklch(0.235 0.014 262)"
  muted-foreground: "oklch(0.47 0.02 260)"
  muted-foreground-dark: "oklch(0.73 0.015 258)"
  border: "oklch(0.89 0.008 255)"
  border-dark: "oklch(1 0 0 / 13%)"
  input: "oklch(0.8 0.012 255)"
  input-dark: "oklch(1 0 0 / 24%)"
  ring: "oklch(0.55 0.2 262)"
  ring-dark: "oklch(0.72 0.15 262)"
  destructive: "oklch(0.53 0.21 27)"
  destructive-dark: "oklch(0.72 0.17 25)"
  sign: "oklch(0.2 0.02 262)"
  sign-dark: "oklch(0.12 0.012 262)"
  sign-foreground: "oklch(0.975 0.004 255)"
  sign-foreground-dark: "oklch(0.95 0.005 255)"
  signal: "oklch(0.68 0.155 70)"
  signal-dark: "oklch(0.79 0.16 73)"
  signal-foreground: "oklch(0.2 0.02 262)"
  signal-text: "oklch(0.49 0.115 65)"
  signal-text-dark: "oklch(0.82 0.15 76)"
  line-blue: "oklch(0.53 0.2 262)"
  line-blue-dark: "oklch(0.7 0.15 262)"
  line-green: "oklch(0.53 0.13 160)"
  line-green-dark: "oklch(0.72 0.14 160)"
  line-magenta: "oklch(0.54 0.2 0)"
  line-magenta-dark: "oklch(0.72 0.16 0)"
  line-violet: "oklch(0.51 0.2 295)"
  line-violet-dark: "oklch(0.72 0.15 295)"
  line-teal: "oklch(0.53 0.095 215)"
  line-teal-dark: "oklch(0.74 0.1 215)"
  line-lime: "oklch(0.55 0.13 125)"
  line-lime-dark: "oklch(0.78 0.15 125)"
  line-foreground: "oklch(0.99 0 0)"
  line-foreground-dark: "oklch(0.17 0.012 262)"
typography:
  headline:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "2.25rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "normal"
  brand:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    letterSpacing: "normal"
  label:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    letterSpacing: "normal"
  label-strong:
    fontFamily: "'Overpass Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
    letterSpacing: "normal"
  code:
    fontFamily: "'Overpass Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "0.94em"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  sm: "0.225rem"
  md: "0.3rem"
  lg: "0.375rem"
  full: "9999px"
spacing:
  line-weight: "4px"
  rail: "2.5rem"
  gutter: "1rem"
  gutter-wide: "1.5rem"
  band: "3.5rem"
  section-top: "1.25rem"
  section-bottom: "1.5rem"
  page-top: "2rem"
  page-bottom: "4rem"
  measure: "64rem"
components:
  sign-band:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.sign-foreground}"
    typography: "{typography.brand}"
    height: "{spacing.band}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline-sm:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "1.75rem"
  button-outline-sm-hover:
    backgroundColor: "{colors.muted}"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
  line-roundel:
    backgroundColor: "{colors.line-blue}"
    textColor: "{colors.line-foreground}"
    typography: "{typography.label-strong}"
    rounded: "{rounded.full}"
    size: "1.75rem"
  stop-ring:
    size: "1.25rem"
  stop-row-hover:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.sm}"
---

# Design System: Flight Plan

## Overview

**Creative North Star: "The Line Diagram"**

Flight Plan reads like transit signage. Every repository is a line with its own colour and a lettered roundel, and every review target is a stop on that line. The status of a review artifact is drawn in the stop's ring, so it reads before any word does. An ink sign band runs across the top of every page and carries the amber logo and the product name.

The panels below the band are cool white in light mode and near-black in dark mode, chosen by `prefers-color-scheme`. Structure comes from hairline rules and one shared column registration, not from boxes. The density is that of a timetable: compact rows, generous space between lines, nothing floating. The system replaces the sidebar, table and badge dashboard with the diagram itself.

The frontend only renders. Labels, counts, line colours, roundel letters, monograms, the status filter, the filtering itself and the order of everything come from the backend; components pick a variant from a discriminant prop and draw it.

The review page keeps the layout of the legacy review panel. The line appears there only as a gutter marker.

**Key Characteristics:**
- A 4px vertical line per repository, in that repository's colour, with stops as rings on it.
- Seven ring states, one per branch status, each a different shape.
- An ink sign band, 56px tall, sticky at the top of every page.
- Hairline rules between sections; no cards, no shadows.
- One grotesk at two weights, with its fixed-width companion for code-like text.
- Amber rationed to the logo and the two awaiting statuses.
- State changes in place at 180ms ease-out; nothing reflows.

## Colors

A cool, slightly blue neutral panel carries six saturated line colours and one rationed amber. All values are OKLCH custom properties in `packages/ui/src/styles/globals.css`; each token has a light value and a `-dark` sibling in the frontmatter, and the stylesheet switches between them by `prefers-color-scheme`.

### Primary
- **Sign Ink** (`sign`, `primary`, `foreground`): the sign band, the primary button and body text share one ink in light mode. In dark mode the band drops to a deeper ink than the panel, and the primary button inverts to the light foreground.

### Secondary
- **Signal Amber** (`signal`): the stroke of the awaiting-review and awaiting-reply rings, the half fill of the first and the centre dot of the second. It matches the amber of the logo. It is also the text selection background, with `signal-foreground` ink on it.
- **Signal Amber Text** (`signal-text`): the darker amber that carries the bold "Awaiting review" and "Awaiting reply" status labels at text contrast, and the caret.

### Tertiary
- **Line colours** (`line-blue`, `line-green`, `line-magenta`, `line-violet`, `line-teal`, `line-lime`): one per repository. They colour the roundel, the 4px line, the terminus bar and the solid ring of a merged stop. The light values sit near 53% lightness for contrast on the white panel; the dark values rise to 70 to 78%.
- **Line Foreground** (`line-foreground`): the letter inside a roundel. White in light mode, panel ink in dark mode.

### Neutral
- **Cool Panel** (`background`): the page.
- **Field White** (`card`): the fill of inputs and outline buttons only. It is a control fill, not a container.
- **Quiet Fill** (`muted`): the hover fill of a stop row, the hover of outline and ghost buttons, and skeleton shapes.
- **Secondary Ink** (`muted-foreground`): sources, details, counts, timestamps, the quiet status labels (stale, draft, closed, merged), the strokes and fills of the quiet rings and the counts in the status filter.
- **Hairline** (`border`): the 1px rule above each repository section.
- **Field Stroke** (`input`): the 1px border of inputs and outline buttons, and the scrollbar thumb.
- **Focus Blue** (`ring`): the 2px focus outline, offset 2px, on every focusable element.
- **Error Red** (`destructive`): the error message under a field and the border of an invalid field.

### Named Rules
**The Rationed Amber Rule.** Amber marks the logo and the two statuses that wait on the reviewer: awaiting review and awaiting reply. It is never a button colour, a link colour, a heading colour or decoration. Selection and caret are its only other appearances.

**The Line Variable Rule.** A component never names a line colour. The backend sends one of six keys, `LINE_COLOR_CLASSES` in `packages/ui/src/lib/line-color.ts` maps the key to a class that sets `--line`, and every part of the line (roundel, rail, terminus, merged ring) reads `--line`. A neutral context such as the status filter sets `--line` to the secondary ink.

**The Shape Before Colour Rule.** Every ring state differs in shape as well as colour: hollow, half filled, centre dot, broken, thin, barred, solid. Each state also has a text label in the row. Status never depends on hue alone.

## Typography

**Display Font:** Overpass Variable (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Overpass Variable (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** Overpass Mono Variable (with ui-monospace, 'SF Mono', Menlo, monospace)

**Character:** A wayfinding grotesk descended from highway signage, with its fixed-width companion. Both are self-hosted through `@fontsource-variable` and imported in `globals.css`. Hierarchy comes from size and from two weights, regular (400) and bold (700).

### Hierarchy
- **Headline** (700, 1.75rem, line-height 2.25rem, tracking -0.015em): the page heading, one per page.
- **Title** (700, 1.125rem, line-height 1.75rem): the repository name at the head of a line, and the heading of the empty state.
- **Brand** (700, 1.0625rem, line-height 1, tracking -0.01em): the product name in the sign band.
- **Body** (400, 1rem, line-height 1.5rem): the title of a stop and explanatory paragraphs, held to a prose measure.
- **Label** (400, 0.875rem, line-height 1.25rem): sources, details, author names, counts, timestamps, the status filter, hints and button text. Counts and timestamps use tabular figures.
- **Label Strong** (700, 0.875rem): the "Awaiting review" and "Awaiting reply" status labels, field labels, the roundel letter and the primary button.
- **Code** (Overpass Mono, 400, 0.94em of its context): branch names, forge slugs and filesystem paths, wherever they appear, including a stop title that is a branch name and the path input.

### Named Rules
**The Two Weights Rule.** Text is regular or bold. No medium, no semibold, no light, no italics for emphasis.

**The Mono Means Literal Rule.** Fixed-width type marks a string the user could paste into a terminal: a branch, a slug, a path. The backend marks each label segment as `plain` or `code`; `LabelSegments` draws it. Numbers, statuses and names stay in the grotesk.

**The Bullet Separator Rule.** Label segments are separated by "•" (U+2022), set in the grotesk with 0.5em on each side. Overpass draws "·" (U+00B7) with no space after it, so the middle dot is not used.

## Layout

One centred column with a maximum width of 64rem holds both the contents of the sign band and the page, with 1rem gutters that widen to 1.5rem from 640px. The page starts 2rem below the band and ends with 4rem of space.

Every repository section uses the same two-column grid: a 2.5rem rail column, then the content. The roundel, the 4px line, every ring and the terminus are centred in the rail column, so all lines on a page share one registration and all text shares one left edge. The line is continuous from the roundel through the last stop; the segment below the last ring is hidden.

A repository section is separated from the previous one by a hairline, with 1.25rem above its heading and 1.5rem below its last stop. The heading row carries the name and source at the left, and the count and the "Create Flight Plan" control at the right. A stop row is a single link with 0.625rem of vertical padding; from 640px it is four columns (title and details, an 8rem author column, an 8rem status column, a 7.5rem right-aligned time column). Below 640px the author, status and time move under the details on one line, and the heading row wraps so the count and control sit under the source.

A line with no stops, or with a forge problem, ends in a terminus: a short line segment closed by a 4px horizontal bar, with the message beside it.

The page heading row holds the heading, the summary label on its baseline and the primary action at the far right. The status filter button sits right-aligned in the row below and wraps under the notice on narrow screens.

## Elevation & Depth

The system is flat. There are no shadows. A menu or a dialog opens over the page with a 1px ink border and no shadow. Depth comes from two things only: the ink sign band against the panel, and hairline rules. The band is sticky and stays above the page while it scrolls. Hover is a tonal fill, not a lift.

### Named Rules
**The Hairline Rule.** Sections are divided by a 1px rule in the hairline colour. Content is never wrapped in a bordered, filled or shadowed container.

## Shapes

Two shape families. The diagram is drawn with circles and straight strokes: a 1.75rem round roundel, a 1.25rem ring with a 3px stroke, a 4px line and a 4px terminus bar. Controls are small rectangles with slightly eased corners: 0.375rem on buttons and inputs, 0.3rem on small buttons, 0.225rem on the stop row's hover fill and focus outline and on skeleton shapes. Borders are 1px. Nothing is pill-shaped except the roundel.

## Components

### Sign Band
The fixed sign at the top of every page. Full-width ink, 3.5rem tall, sticky, with its contents on the page column. It carries the brand mark at the left, linked to the homepage, and takes optional content at the right. The brand mark is the 32px logo (`logo-small.png`, the heavier small-size cut, also the favicon) and the product name in the Brand style, 0.625rem apart. `logo.png` is the faithful amber recolour for larger sizes.

### Line Roundel
A 1.75rem circle filled with the line colour, holding one bold letter in the line foreground. The letter comes from the backend. It is decorative for assistive technology; the repository name beside it is the heading.

### Stop Ring
The signature component. A 1.25rem ring centred on the line, in one state per branch status:
- **no-review**: hollow. Panel fill, 3px secondary-ink stroke.
- **awaiting-review**: half amber. Panel fill, amber stroke, the right half filled amber.
- **awaiting-reply**: amber ring with an amber centre dot.
- **stale**: broken. Panel fill, secondary-ink stroke dashed into short segments.
- **draft**: thin. Panel fill, 1.5px secondary-ink stroke.
- **closed**: solid secondary ink with a panel-coloured bar across it.
- **merged**: solid. Fill and stroke in the line colour.

A state change transitions fill, stroke, stroke width, dash pattern and the opacity of the inner marks at 180ms ease-out. The ring keeps its size and position in every state, so nothing reflows. The status filter reuses the same component at 1rem with a neutral line colour.

### Review Target Stop
One row per review target, and the whole row is one link. The title is in Body, the details in Label with bullet separators, the author as an Avatar and a name in Label, the status label in Label (bold amber text for the two awaiting statuses, foreground for no review, secondary ink for the rest) and the time in secondary ink with tabular figures.
- **Hover:** a quiet fill appears behind the row, extended 0.75rem past the row on each side, with 0.225rem corners, at 180ms ease-out.
- **Focus:** a 2px focus-blue outline on the same extended shape.

### Avatar
A 1.25rem circle with a 1px field stroke. It shows the person's picture, or their monogram in bold at 0.625rem on field white when there is no picture or the picture fails to load. The backend sends the picture URL and the monogram. It is decorative for assistive technology; the name beside it carries the meaning. A review target with no author, such as a local branch, leaves the author column empty.

### Filter Menu
A small outline button that opens a menu of tickable options. The button label, sent by the backend, says how much is selected ("Status: 4 of 7") and ends in a chevron. Each option is a row with a checkbox, an optional marker, a label and a right-aligned count. Ticking an option keeps the menu open. A reset row follows a hairline when the selection is not the default. The menu has 0.375rem corners, a 1px ink border, the popover fill and no shadow; the focused row takes the quiet fill.

The status filter is a Filter Menu whose markers are Stop Rings, so it is also the key to the rings. Draft, closed and merged are unticked by default. The selection lives in the URL. Counts always describe the whole list, and the summary and each line's count read "5 of 7 review targets" whenever some are hidden. A line whose review targets are all hidden stays listed and says how many are hidden.

The author filter is a Filter Menu whose markers are Avatars. It depends on the status filter: it lists only the authors of review targets that have a selected status, with counts for those, then "No author" for review targets without one. All are ticked by default. Its button reads "Author: all" or "Author: 3 of 5". The two filters sit side by side, status first, and combine: a review target shows when it passes both.

### New Target Prompt
A prompt at the head of a repository's line for each review target Flight Plan has newly detected. It sits in the content column on the quiet fill with 0.225rem corners, while the line passes it in the rail. It says "New pull request" or "New branch" in bold with the time beside it, then the title and the details with the author's Avatar at 1rem. At the right are a small primary "Create Flight Plan" control and a ghost "Dismiss" button. Prompts show whatever the filters hide, and a dismissed prompt does not return.

### Configuration Link
A 1.75rem square ghost control holding a gear icon, at the far right of a repository's heading row after "Create Flight Plan". It leads to that repository's configuration. Its accessible name and tooltip name the repository ("Configure storefront"). Quiet fill on hover.

### Label Segments
A row of text segments joined by the bullet separator, wrapping between segments. Each segment is plain or code. Long segments break anywhere so paths never overflow.

### Buttons
Compact and quiet. One primary action per view.
- **Shape:** eased rectangle (0.375rem), 2rem tall, 0.625rem horizontal padding, Label size.
- **Primary:** ink fill with light text in bold; hover at 85% of the fill. Used for "Add repository", "Add" and "Try again".
- **Outline, small:** field-white fill with a field stroke, 1.75rem tall, 0.8rem text; hover in quiet fill. Used for "Create Flight Plan" on each line.
- **Ghost:** no fill at rest, quiet fill on hover. Used for "Cancel".
- **Focus:** focus-blue border with a 3px ring at half strength. **Disabled:** 50% opacity, no pointer events.

### Inputs / Fields
- **Style:** field-white fill, 1px field stroke, 0.375rem corners, 2rem tall. A bold Label above, a hint in secondary ink below it, then the field. A field that takes a path is set in the mono face.
- **Focus:** focus-blue border with a 3px ring.
- **Error:** error-red border and ring on the field, and the message in error red below it, announced as an alert.

Adding a repository happens in a Dialog: the field, the error under it, and "Cancel" and "Add" at the bottom right.

### Dialog
A modal for a task that needs the user's full attention, such as adding or configuring a repository. A centred panel up to 28rem wide with 0.375rem corners, a 1px ink border, the popover fill, 1.25rem padding and no shadow. The page behind it is dimmed with the sign ink at 40%, with no blur. The title is bold at 1.125rem, the description is secondary ink, and a ghost close button sits at the top right. Actions sit at the bottom right, the primary one last. It opens and closes with a 150ms fade.

### Loading, empty and error states
The skeleton draws the page's own structure in quiet fill: a heading bar, then lines with a roundel, a rail and stop bars, under hairlines. It pulses only when motion is allowed. The empty state is a Title and a paragraph under a hairline, held to a prose measure. A route error is a Headline, the backend's message in secondary ink and a primary "Try again" button.

## Do's and Don'ts

### Do:
- **Do** draw status with a Stop Ring and a text label together.
- **Do** set `--line` through `LINE_COLOR_CLASSES` from the key the backend sends, and read `--line` everywhere a line colour is drawn.
- **Do** keep the 2.5rem rail column and the 4px line weight on every surface that shows a line, so all lines register.
- **Do** separate sections with a 1px hairline and space.
- **Do** set branch names, forge slugs and paths in Overpass Mono, and everything else in Overpass.
- **Do** join label segments with "•" (U+2022).
- **Do** centre single-line text in controls, avatars and roundels by its capital height with the `text-box-cap` utility; Overpass sits high in its line box otherwise.
- **Do** transition state in place at 180ms ease-out, and hold decorative pulsing behind the reduced-motion preference.
- **Do** render the labels, counts, colours and order the backend sends.

### Don't:
- **Don't** use amber outside the logo and the awaiting-review and awaiting-reply statuses.
- **Don't** wrap content in cards, or add shadows. Menus and dialogs are the overlays, and they are set off by a 1px ink border.
- **Don't** use a third weight, or a third typeface.
- **Don't** use "·" (U+00B7) as a separator; Overpass draws it with no space after it.
- **Don't** show status as a coloured badge or pill; the ring is the status mark.
- **Don't** change the size or position of a ring or a row when its state changes.
- **Don't** choose a line colour, compute a count or build a label in a component.
- **Don't** redraw the review page as a line diagram; there the line is a gutter marker only.
