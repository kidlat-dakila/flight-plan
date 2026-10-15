# Review artifact

## Definition

A review artifact is the document a [Flight Plan Review](flight-plan-review.md) produces for one pull request or branch. It holds everything the reviewer reads: the context, the two diagrams and the code walkthrough with its findings. The legacy code calls it a walkthrough, which is also the name of one of its sections, so this vocabulary uses **review artifact** for the document and **Code Walkthrough** for the section.

An artifact is stored as JSON, and its format is described in [data storage](data-storage.md).

## Parts

| Part | Content | Required |
|---|---|---|
| Title | The pull request's own title, copied from the forge | Yes |
| [Context Section](#context-section) | Why the change exists, what changes from outside, and what changed inside | Yes |
| [Journey Flow Diagram](journey-flow-diagram.md) | The path the change runs through, with a description that tells the diagram in words, or one line saying why the change has none | Yes |
| [Blast Diagram](blast-diagram.md) | The files the change is connected to through imports, and what it does to the ones it did not touch | No |
| [Code Walkthrough](code-walkthrough.md) | The changed files, with explanations on top of the lines they are about | Yes |
| [Segments](#segments) | A split of a large change into parts, each read on its own | Only when the reviewer splits the change |

An artifact also records where it is filed (the pull request number, or the branch name when there is no pull request), the commit it was written against, and its status.

## Status

| Status | Meaning |
|---|---|
| `drafting` | The agent is still writing. The web app shows it anyway, with an indicator, so the reviewer can start reading and does not mistake a gap for an omission. |
| `authoring` | The author is writing the artifact by hand. No agent writes it, and the web app shows no progress and no placeholder for a part that is not written. |
| `complete` | The author marked it as complete with "Mark as complete", which runs no check. Or the agent said it is finished, and the artifact passed the checks a finished artifact must pass: a context and a title on every segment, a title on every File Section, a title and a reading on every waypoint, a description on every Journey Flow Diagram that has a node, a label on every Journey Flow Diagram node and on each of its trigger labels, an impact type on every Blast Diagram file the change reaches, with a reason where the file breaks or changes behaviour, a solution on every bug, risk and nit, and a description on every context code block that is required. Writing to a complete artifact makes it `drafting` again. |

## Sections

An artifact records which of its optional sections it generates: the Journey Flow Diagram, the Blast Diagram, the Code Walkthrough and the findings. They start as the [section switches](prompt-configurations.md#section-switches) of the configuration the review was requested with. A section that is off is not generated: the artifact holds no structure for it, a finished artifact is not checked for it, and the page offers to generate it. Generating it switches it on in the artifact. An artifact that records no sections generates all of them.

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
| `codeBlock` | The code block, as a reference to the block the Journey Flow Diagram and the waypoints already hold, never a copy. For a library it is the import statement of one file that imports the name, and for the language there is none. |
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

How it is laid out belongs to the [prompt configuration](prompt-configurations.md). The Standard preset writes three parts:

- **An opening paragraph**: why anyone should care about this change, in five sentences at most, with no identifiers.
- **Overview**: what changes from outside, as a list of scenarios. Each scenario has a **when**, a situation in the reader's terms, and a **then**, what a person or another system can observe.
- **Implementation**: what changed inside, grouped by place. Each group has a label (a path, a directory or an area) and a list with one item per change a reader would have to notice, each starting with a verb and naming the code with a CodeLink.

## Segments

A large pull request can be split into segments, so it can be read one part at a time. Segments are parts of one artifact, not separate artifacts. Each segment is a group of its own Context Section, Journey Flow Diagram, Blast Diagram and Code Walkthrough, for the files it covers. The web app draws every segment on the one review page, one after the other, each under its title. The reviewer decides whether to split a change and how.

Every segment has an **id**, a short unique string that Flight Plan makes when it builds the segment, and a **title**, a very short text of what its context is about, which the agent writes. No tool changes an id. Every write an agent makes names the segment it writes by that id, and everything the agent reads comes back with the id of the segment it belongs to.

Whether a segment has a Journey Flow Diagram or a Blast Diagram is decided by the [codegraph](codegraph.md). A segment without one stores `null` for it and no reason. The agent writes neither diagram's structure. A Blast Diagram stores two graphs of files: the files that use the change, which carry the impact types and reasons, and under `importBound` the files the change uses, which carry nothing written. See [Blast Diagram](blast-diagram.md#two-views).

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

- **Section navigation**: a menu that jumps between the artifact's sections (Context, Journey Flow Diagram, Blast Diagram, Code Walkthrough). In a segmented artifact it lists each segment with that segment's sections under it.
- **Section stepping**: moving to the section before or after the one on screen, in the order of the section navigation, from the end of one segment into the next.
- **Waypoint stepping**: moving to the previous or next waypoint of a segment's Code Walkthrough, across its files, in reading order. A waypoint's position counts the waypoints of its segment. Past the first or the last waypoint of a segment, stepping carries on as section stepping.
