# Review artifact

## Definition

A review artifact is the document a [Flight Plan Review](flight-plan-review.md) produces for one pull request or branch. It holds everything the reviewer reads: the context, the two diagrams and the code walkthrough with its findings. The legacy code calls it a walkthrough, which is also the name of one of its sections, so this vocabulary uses **review artifact** for the document and **Code Walkthrough** for the section.

An artifact is stored as JSON, and its format is described in [data storage](data-storage.md).

## Parts

| Part | Content | Required |
|---|---|---|
| Title | The pull request's own title, copied from the forge | Yes |
| [Context Section](#context-section) | Why the change exists, what changes from outside, and what changed inside | Yes |
| [Trace Diagram](trace-diagram.md) | The path the change runs through, with a description that tells the diagram in words, or one line saying why the change has none | Yes |
| [Blast Diagram](blast-diagram.md) | The files the change is connected to through imports, and what it does to the ones it did not touch | No |
| [Code Walkthrough](code-walkthrough.md) | The changed files, with explanations on top of the lines they are about | Yes |
| [Segments](#segments) | A split of a large change into parts, each read on its own | Only when the reviewer splits the change |

An artifact also records where it is filed (the pull request number, or the branch name when there is no pull request), the commit it was written against, and its status.

## Status

| Status | Meaning |
|---|---|
| `drafting` | The agent is still writing. The web app shows it anyway, with an indicator, so the reviewer can start reading and does not mistake a gap for an omission. |
| `authoring` | The author is writing the artifact by hand. No agent writes it, and the web app shows no progress and no placeholder for a part that is not written. |
| `complete` | The author marked it as complete with "Mark as complete", which runs no check. Or the agent said it is finished, and every [required node](#required-nodes) is written: a context and a title on a segment whose context is required, a title and a reading on a required waypoint, with a solution on each of its bugs, risks and nits when the findings are on, a label on a required Trace Diagram node and on each of its trigger labels, a description on a required Trace Diagram that has a node, an impact type on a required Blast Diagram file the change reaches, with a reason where the file breaks or changes behaviour, and a description on a required context code block. Writing to a complete artifact makes it `drafting` again. |

## Required nodes

Every node the agent writes says whether the review asks for it: `isRequired` on a waypoint, a Trace Diagram node, a Trace Diagram (its description), a Blast Diagram file and a [context code block](#context-code-blocks), and `isContextRequired` on a segment (its title and context). Flight Plan builds every node unrequired. When the review is handed to an agent, Flight Plan requires the nodes of the write-up sections it is given (`context`, `traceDiagram`, `blastDiagram`, `walkthrough`, `findings`), the context of the first segment alone when [segments are off](#segments-off), with `withRequiredSections`; a node once required stays required. The agent may write only required nodes, its unwritten work lists only them, the progress counts only them, and the artifact is complete once each of them is written. A review built without an agent, or written by its author, requires nothing.

## Sections

Every artifact has every section: the codegraph builds the Trace Diagram, the Blast Diagram and the Code Walkthrough, and the findings are written on waypoints. No configuration and no artifact switches a section off; which nodes the agent writes is what is [required](#required-nodes). An artifact stored with section switches (`sections`) is read and the field dropped.

## Context code blocks

A context code block is something a reader can open by hovering a name in a code view, with the description written for it. The artifact holds them in one list for the whole artifact, `contextCodeBlocks`, beside its segments, because one of them can be hovered from any segment. Flight Plan builds the list from the change. An item is of one of three kinds:

| Kind | One item per | Listed |
|---|---|---|
| **Code of the repository** | Code block | For every file the review shows code of: every code block at the top level of the file that declares something, such as a function, a component, a type or a variable, and every code block of another file that a block of the file uses, which for a component includes each component of another file it renders. |
| **Library** | Name imported from a library, such as `useState` of `react` | Every such name the shown code uses. A name is one item, however many files import it. |
| **Language** | Name a file neither imports nor declares, such as `Promise` or `Math` | Every such name the shown code uses. Flight Plan assumes the name belongs to the language or to where the code runs, and checks nothing more, so a name a tool or a framework provides without an import is listed as the language's. |

An import statement is not an item, and neither is a name declared inside a function or a component.

Each item holds:

| Field | Holds |
|---|---|
| `isRequired` | Whether the [configuration](prompt-configurations.md#context-code-blocks) the review was requested with asks for a description of items of this kind. |
| `kind` | `codebase`, `library` or `language`. |
| `codeBlock` | The code block, as a reference to the block the Trace Diagram and the waypoints already hold, never a copy. For a library it is the import statement of one file that imports the name, and for the language there is none. |
| `specifier`, `name` | For a library, the library and the name imported from it. For the language, the name. |
| `description` | Markdown, written by the agent, or nothing while it is not written. |

The description says what the code is and what it does, for a reader who has not seen it, and for code of the repository where the codebase uses it. It describes the code as it is, not the change.

The hover shows the description above the code. For a library that code is the import statement of the file being read, and every file that imports the name shows the same description. A name of the language is underlined only once its description is written, and its hover shows the description with a note that the name is assumed to be the language's, and no code.

An artifact that holds no list has no context code blocks.

## Staleness

Every reference in an artifact is read at the commit it was written against. When the pull request's head moves past that commit, the artifact is **stale**: the review header carries an "Out of date" label at a glance, and the page offers to update it below. When the head matches, the header says "Updated" instead. The artifact itself does not change until the agent updates it.

This is not the `stale` [branch status](branch-status.md), which describes a pull request that was reviewed and has not changed since.

## Context Section

The first thing a reviewer reads, before any code. It is stored as one string of Markdown, and the review page draws its headings, paragraphs, lists, bold text, inline code and [CodeLinks](#codelink).

The agent writes only the summary: one or two sentences, starting "This segment" ("This change" for the one Context of a review whose segments are off), that say what the change does, with no identifiers, paths or links. How it is worded belongs to the [prompt configuration](prompt-configurations.md); every preset asks for the summary alone.

### Change Overview

Under the summary, the Context band shows the **Change Overview**, which Flight Plan builds with no model: every root code block of the segment's [Code Walkthrough](code-walkthrough.md), as a card that says whether it was added, modified or deleted. It is not stored; the page data carries it as `changeOverview` on the Context band, built by `buildChangeOverview` in `packages/codegraph/src/walkthrough/change-overview.ts`.

| Part | Content |
|---|---|
| Rows | One per primary [classification](codegraph/classifications.md) of the root code blocks, the same one each root code block shows, in the order of the hierarchy. A row holds `classification` (`key`, `label`) and its `cards`. |
| Cards | In the order of the walkthrough. Each has the root code block's `id`, its name as `label`, its type as `typeLabel` ("Function", "Component"), its `path`, its `change` (`added`, `modified`, `deleted`) with `changeLabel`, `waypointAnchorId`, the anchor of the first waypoint on it, and `preview`, the root code block's code as a code link (path, line range, lines, the waypoint anchor and the forge link), or `null` when its lines cannot be found. An import is never a card. |
| `emptyMessage` | "No code changed." when there is no card, else `null` |

## Segments

A large pull request can be split into segments, so it can be read one part at a time. Segments are parts of one artifact, not separate artifacts. Each segment is a group of its own Context Section, Trace Diagram, Blast Diagram and Code Walkthrough, for the files it covers. The web app draws every segment on the one review page, one after the other, each under its title. The reviewer decides whether to split a change and how.

Every segment has an **id**, a short unique string that Flight Plan makes when it builds the segment, and a **title**, a very short text of what its context is about, which the agent writes. No tool changes an id. Every write an agent makes names the segment it writes by that id, and everything the agent reads comes back with the id of the segment it belongs to.

Whether a segment has a Trace Diagram or a Blast Diagram is decided by the [codegraph](codegraph.md). A segment without one stores `null` for it and no reason. An entry segment whose Blast Diagram is not drawn keeps it as `hiddenBlastDiagram`, which only [segments off](#segments-off) shows and the agent never reads. The agent writes neither diagram's structure. A Blast Diagram stores two graphs of files: the files that use the change, which carry the impact types and reasons, and under `importBound` the files the change uses, which carry nothing written. See [Blast Diagram](blast-diagram.md#two-views).

### Segments off

`isSegmented` on the artifact is the choice the `isSegmented` of the [review preferences](review-preferences.md) made when the artifact was built. The codegraph always cuts the change into its segments and stores them; the choice only decides how the page shows them. A review is shown in segments when it is segmented and has more than one segment (`isShownInSegments` in `apps/backend/src/procedures/get-review/utils/segmentation.ts`).

With segments off, the page shows the stored segments as one (`mergeSegments` in `merged-segment.ts`):

| Part | What the page shows |
|---|---|
| Context | The first segment's context, the one Context of the whole change. Only the first segment's context is required, and no segment needs a title. |
| Code Walkthrough | The File Sections of every segment, those of one path joined into one, sorted by the walkthrough [order](code-walkthrough.md#order) |
| Blast Diagram | The Blast Diagrams of every segment joined, the hidden ones (`hiddenBlastDiagram`) among them: each file and each import once, a file's first impact winning |
| Trace Diagram | The shared segment has none: its cards are drawn in the diagrams of the entry segments that reach them, as the codegraph built them with segments off. One tab per segment that has a Trace Diagram, in `tabs` of the Trace band, each with the segment's id, the diagram's title as its label, and the diagram. With fewer than two, `tabs` is empty and `diagram` holds the one there is. |
| Ids | The merged segment takes the first segment's id, so filters and reviewed marks are kept under it. Each tab's diagram keeps its own segment's id for the agent's writes. |

Editing the segments keeps the choice; adding a second segment to an artifact of one makes it segmented. A write-up that turns segments on or off rebuilds the artifact at its commits with the new choice, carrying over what is written, because the Trace Diagrams are drawn for it (`scaffoldSegmentedAs` in `apps/backend/src/procedures/write-up-review/utils/segmented-scaffold.ts`). When the repository cannot be read, as in the site's demo, the artifact keeps its diagrams and takes the new choice.

## General components

These components appear throughout an artifact.

### CodeLink

A link from prose to code, written in Markdown as `[label](code:path#target)`. It has two forms:

| Form | Example | Use |
|---|---|---|
| Declaration | ``[`getUser()`](code:src/auth/user.ts#getUser)`` | The form to use. It names what the sentence already says, and it survives the file being edited above the declaration. |
| Lines | `[the retry loop](code:src/auth/user.ts#L300-320)` | For code no declaration names, such as a few lines inside a function or a config entry. |

Every CodeLink is checked when the artifact is written, against the files the artifact holds: a write with a link that does not resolve is refused, so a sentence cannot describe code that is not there. Hovering a CodeLink shows the code it points at, and clicking it opens that code.

### CodeBlock

A block of the repository's code, shown in the artifact. It is always a reference to the code at the artifact's commit, never a pasted copy. It has two presentations:

- **Focus**: the block scrolls to and highlights the range it is about, with the lines around it visible for context. A focus range is given as a declaration or as lines, like a CodeLink.
- **Diff**: the block marks the lines the change added and shows the lines it removed where they used to be. The marks come from the diff, never from the agent. The agent says which of the file's changes a block is about, and Flight Plan turns that into marks.

A block usually shows both: it focuses on a declaration and marks what changed inside it.

### Navigation

Two ways of moving through an artifact:

- **Section navigation**: a menu that jumps between the artifact's sections (Context, Trace Diagram, Blast Diagram, Code Walkthrough). In a segmented artifact it lists each segment with that segment's sections under it.
- **Section stepping**: moving to the section before or after the one on screen, in the order of the section navigation, from the end of one segment into the next.
- **Waypoint stepping**: moving to the previous or next waypoint of a segment's Code Walkthrough, across its files, in reading order. A waypoint's position counts the waypoints of its segment. Past the first or the last waypoint of a segment, stepping carries on as section stepping.
