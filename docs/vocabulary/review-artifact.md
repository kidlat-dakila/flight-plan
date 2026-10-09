# Review artifact

## Definition

A review artifact is the document a [Flight Plan Review](flight-plan-review.md) produces for one pull request or branch. It holds everything the reviewer reads: the context, the two diagrams and the code walkthrough with its findings. The legacy code calls it a walkthrough, which is also the name of one of its sections, so this vocabulary uses **review artifact** for the document and **Code Walkthrough** for the section.

An artifact is stored as JSON, and its format is described in [data storage](data-storage.md).

## Parts

| Part | Content | Required |
|---|---|---|
| Title | The pull request's own title, copied from the forge | Yes |
| [Context Section](#context-section) | Why the change exists, what changes from outside, and what changed inside | Yes |
| [Journey Flow Diagram](journey-flow-diagram.md) | The path the change runs through, or one line saying why the change has none | Yes |
| [Blast Diagram](blast-diagram.md) | The files the change is connected to through imports, and what it does to the ones it did not touch | No |
| [Code Walkthrough](code-walkthrough.md) | The changed files, with explanations on top of the lines they are about | Yes |
| [Segments](#segments) | A split of a large change into parts, each read on its own | Only when the reviewer splits the change |

An artifact also records where it is filed (the pull request number, or the branch name when there is no pull request), the commit it was written against, and its status.

## Status

| Status | Meaning |
|---|---|
| `drafting` | The agent is still writing. The web app shows it anyway, with an indicator, so the reviewer can start reading and does not mistake a gap for an omission. |
| `complete` | The agent said it is finished, and the artifact passed the checks a finished artifact must pass: a context and a title on every segment, a title on every File Section, a title and a reading on every waypoint, a label on every Journey Flow Diagram node, an impact type on every Blast Diagram file the change reaches, with a reason where the file breaks or changes behaviour, and a solution on every bug, risk and nit. Writing to a complete artifact makes it `drafting` again. |

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

Whether a segment has a Journey Flow Diagram or a Blast Diagram is decided by the [codegraph](codegraph.md). A segment without one stores `null` for it and no reason. The agent writes neither diagram's structure.

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
- **Waypoint stepping**: moving to the previous or next waypoint in the Code Walkthrough, across files and across segments, in reading order.
