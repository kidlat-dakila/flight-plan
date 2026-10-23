# Review Navigator

## Definition

The Review Navigator is the toolbar band fixed to the foot of a [Flight Plan Review](flight-plan-review.md), across the full width of the page. It is on the reviewer's page, the author's page and a published Flight Plan, and it stays on screen while the reader scrolls. It holds the controls of the section the reader is looking at, and every control has a key. The keys are the main way to use it: a reader can go through a whole review without leaving the keyboard.

## The section on screen

The navigator always works on one section of the [review artifact](review-artifact.md): the Context, the [Trace Diagram](trace-diagram.md), the [Blast Diagram](blast-diagram.md) or the [Code Walkthrough](code-walkthrough.md) of a segment, or the Conversation. It is the section that fills most of the screen. A short section that is wholly in view counts as filling the screen, so a short Context still gets its own controls.

When the section on screen changes, the navigator changes with it: the controls of the new section fade in and the navigator settles to its new width.

## Always there

Three controls are on every section.

| Control | Key | What it does |
|---|---|---|
| **Jump to** | W | Opens a menu of the sections of the segment on screen, with the one on screen marked "Here", then the other segments, each opening on its own sections, then the sections outside every segment, such as the Conversation. The arrow keys move through it and Enter jumps. |
| **Back** | A | Goes to the section before the one on screen. |
| **Next** | D | Goes to the section after the one on screen. |

Back and Next follow the order of the section rail and carry on from the end of one segment into the next. The sections of every segment come in the `sectionOrder` of the [review preferences](review-preferences.md), by default Context, Trace Diagram, Code Walkthrough, Blast Diagram: the page data carries it as `sectionOrder` on each segment, the backend builds the rail in that order, and the page and the navigator draw what they receive, with no order of their own. Each names where it goes: "Back: Context", "Next: Blast Diagram". When it goes into another segment it names that segment by its place: "Next: Segment (2/3)". The first section has no Back and the last has no Next.

## The controls of each section

| Section | Controls |
|---|---|
| Context | **Expand all** or **Collapse all** (Q), for the accordion sections of the context |
| Trace Diagram | **Collapse all** or **Expand all** nodes (Q), then for the author of the Flight Plan **Add card** (C), **Clear diagram** (K) and **Remove diagram** (L), then **Full screen** (F) |
| Blast Diagram | **Export bound** (E) and **Import bound** (Q) when it has both views, **Full screen** (F) |
| Code Walkthrough | **Previous waypoint** (A), the position, **Next waypoint** (D), **Mark as reviewed** (S), **Add comment** (C), **Filter** (F), **Collapse all** or **Expand all** files (Q), **Collapse file** or **Expand file** (E), **Expand waypoint** or **Collapse waypoint** (R) |

A control that is on, such as Full screen or Reviewed, is drawn pressed. Pressing a key flashes its control, so the reader sees what the key did.

## Reading the Code Walkthrough

The Code Walkthrough is where the navigator does the most.

### Stepping through waypoints

Previous waypoint and Next waypoint take the place of Back and Next. They step through the waypoints of the segment on screen, across its files, in reading order. Stepping to a waypoint makes it the **current waypoint**, shows its preview card and dims the rest of its file's code, so the lines it is about stand out. Only one card shows at a time: stepping on, or hovering another mark, closes it. The dimming ends when the reader scrolls away; the waypoint stays current.

**Expand waypoint** (R) opens the current waypoint's box above its lines and scrolls to it, and **Collapse waypoint** (R) closes it again and brings back its card. The card of every waypoint has an "Expand" button with the R keycap that does the same. With no current waypoint the button is dimmed and says to pick one first.

The position between the two buttons counts the waypoints of the segment: "4 of 8". Each segment counts on its own.

At the ends of a segment, stepping carries on through the sections. From the first waypoint, Previous waypoint becomes Back to the section before the walkthrough, such as "Back: Blast Diagram". From the last, Next waypoint becomes Next into the following segment, such as "Next: Segment (2/3)".

With no current waypoint in the segment, the reader's place on the page decides: Next waypoint goes to the first waypoint below where they are reading, and Previous waypoint to the last one above.

Going to a Code Walkthrough with Back, Next or Jump to makes its first waypoint current and opens it, so the reader can mark it reviewed straight away.

### Marking reviewed

Mark as reviewed (S) marks the current waypoint reviewed. It is the one button in the navigator drawn in the primary colour. Once the waypoint is reviewed it reads "Reviewed", drawn pressed, and pressing it again takes the mark off. When reviewed waypoints are hidden, marking one moves on to the next waypoint first, so the reader is not left on a waypoint that has just disappeared.

When there is nothing to mark, the button is dimmed. Clicking it, pressing S or resting on it shows a tooltip that says what to do next: "Pick a waypoint first: press D to step to the next one."

### Commenting on a waypoint

Add comment (C), to the right of Mark as reviewed, opens the comment composer on the current waypoint's lines. The lines are marked as the comment's range, as when the reader picks them by hand, and the composer opens under the last of them with the keyboard in it. With no current waypoint it is dimmed and says to pick one first; on a waypoint whose lines are not on the page it says there is nothing to comment on.

### Writing up a waypoint

While the current waypoint has no write-up and an agent is set up, Let Claude explain (G), named after the setup's agent, and Explain the whole code block (Ctrl+G) follow Add comment. G asks the agent for the waypoint (`review.requestWriteUp` with `{ kind: "waypoint" }`), and Ctrl+G for every waypoint of the root code block it sits in (`{ kind: "root-block" }`); a waypoint outside a root code block has only G. Ctrl+G is Control and G on every system, macOS included, where Cmd+G stays the browser's Find next. The waypoint's card offers the same two buttons, and its mark spins while the agent writes it. The Trace Diagram and the Blast Diagram use G for the node in their side panel, through the same keydown listener.

The author's page has no Mark as reviewed, since the author does not review their own Flight Plan. In place of Add comment it has Write description (C), which opens the current waypoint's form in place of its box, with or without a description written. On a published Flight Plan, Mark as reviewed, Add comment and the filter say that they are only available in Flight Plan.

### Filtering

Filter (F) opens a menu of ticks that narrows the walkthroughs to the waypoints worth stopping at. It holds:

- the finding kinds: Core change, Bug, Risk, Nit and Question;
- the code blocks of the review, each the classification of a root block with what the change did to it, such as "Database read/write" with "Added" or "Component" with "Modified". The classifications of the user's spotlight come first and are always listed, then the four others with the most waypoints, and the rest are under **More**. Imports are left out;
- **Change type**, a submenu of Added, Modified and Removed;
- **Reviewed**, which brings back the waypoints already marked reviewed.

Within one group a waypoint shows when it matches any tick, and with ticks in several groups it has to match each of them. While anything is ticked, a root code block that holds none of the waypoints the filter keeps folds to its first line, and the rest of the file outside the root code blocks folds away. The Filter button carries a badge with how many filters are ticked.

The filter covers the whole review: the menu is the same in every segment's walkthrough, a tick narrows every segment at once, and the counts in the menu are the waypoints of the whole review. The Reviewed tick is one for the whole review too.

Ticking or unticking a finding kind, a code block or a change type goes to the first waypoint the filter keeps that is not reviewed yet, in page order, in whichever segment it is. It becomes the current waypoint with its card shown, as Next waypoint does, so S marks it straight away. Clearing the last tick goes to the first waypoint of the review not reviewed yet. When every waypoint the filter keeps is reviewed, the reader's place is kept. [Code Walkthrough](code-walkthrough.md#filters) describes each filter in full.

### Arranging the files

- **Collapse all** or **Expand all** (Q) folds or opens every file of the walkthrough.
- **Collapse file** or **Expand file** (E) folds or opens the file being read.

A file folded by hand opens again when stepping reaches a waypoint inside it.

### Keeping the reader's place

Collapsing files and filtering can take away the code the reader was reading. When that happens the walkthrough stays on screen instead of the page sliding on to the next segment: collapsing or expanding every file, the Reviewed tick, and a filter tick that leaves no waypoint to go to, bring the head of the walkthrough back to the top of the page. Folding one file keeps that file where it was.

## Full screen

A diagram in full screen keeps the navigator, inside the full-screen view, with the diagram's own controls. Jump to, Back and Next still work from there: they leave full screen and go to the section.

Zooming is not a control of the navigator. Zoom in and Zoom out are buttons at the top right of the diagram's board, beside a Full screen button that does what F does and reads Leave full screen while the diagram fills the window.

## Fitting the screen

The navigator runs across the whole window, under the panels at both edges of the review page, which end above it. Its controls sit centred on the window. When centring would push them past an edge, they move in from that edge.

When it is still too wide for the space, it gets more compact until it fits:

1. Back and Next drop the name of the section they go to, and read "Back" and "Next".
2. Every control shows only its key. Its name stays as a tooltip, and screen readers still read it.

When the space grows again, or the reader moves to another section, it goes back to the fullest form that fits.

## When the keys do nothing

The keys belong to the reader's typing first. They do nothing while the reader types in a field, such as a comment or the chat, while a dialog is open, or while Cmd or Alt is held. With Ctrl held, only a control that asks for that chord, such as Ctrl+G, runs; every other key is left to the browser. A key of a control that is not on the section on screen does nothing either.
