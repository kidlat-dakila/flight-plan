# Code Walkthrough

## Definition

The Code Walkthrough is the section of a [review artifact](review-artifact.md) where the reviewer reads the changed code itself. It is the code, file by file, with each explanation marked in the gutter beside the line it starts on and opened as a box on top of the lines it is about. A reviewer reads down the code and meets each explanation exactly where it applies.

It opens with one line saying what the tour follows, and states how many of the change's files it covers ("12 of 14 files"). Full coverage is stated as plainly as partial coverage, so a reviewer never has to guess whether a file was left out.

## Order

Flight Plan sorts the File Sections of each segment itself, each time the page is built, by the `walkthroughOrder` of the [review preferences](review-preferences.md), until the author arranges them. The agent is not told an order and cannot write one: `update-nodes` takes no order, and the instructions tell the agent not to ask the reviewer for one.

| Order | What comes first |
|---|---|
| **Building blocks first** (`imports-bottom-up`) | A file before every file that uses it: with `a.ts` imported by `b.ts`, and `b.ts` by `c.ts`, the order is `a.ts`, `b.ts`, `c.ts`. A name is defined before it is used. The default. |
| **Entry points first** (`imports-top-down`) | A file before every file it uses: `c.ts`, `b.ts`, `a.ts`. |
| **Most important first** (`important-first`) | The files with a core change and a [spotlight](#spotlight-and-core-change) change, then those with a core change, then those in the spotlight, then the rest, each group from the bottom of the imports up. |

A file uses another when a code reference in it, other than one into a library, is defined in the other, read from the `references` of the stored source files and followed through every file the review holds, so two walkthrough files are ordered through a file between them that has no section. Files the imports do not order keep their stored order; the files of an import cycle keep their stored order too, below the files that use them. The important-first order is sorted again when the agent marks a core change.

`orderFiles` in `packages/codegraph/src/walkthrough/file-order.ts` sorts, and the backend passes the order to the codegraph in `ReviewViewContext.walkthroughOrder`. "Arrange files" lists the files in the order the page shows them.

Once the author moves a file with "Arrange files", the walkthrough is arranged (`isArranged`): its stored order is the order it shows, to the author and to every reviewer, whatever the walkthrough order. The first move starts from the order the page showed, which the page sends with it. A refresh to a new commit keeps the arranged order of a segment whose files did not change, and with segments off the joined walkthrough keeps its stored order only when every segment was arranged.

## File Section

One per changed file. A File Section holds:

- a **title**: what the reviewer is being shown in this file, written by the agent;
- the file's repository-relative path;
- a short summary: the changes the Context Section names for this file;
- its [Diff Waypoints](#diff-waypoint), in reading order.

The title is also the file's label on the section rail, where the Code Walkthrough lists one stop per file.

When Flight Plan derived the section's structure from the code, the agent fills in its waypoints by id and cannot replace the section wholesale. When the file is in a language the codegraph does not trace, the agent writes the section's waypoints itself.

## Diff Waypoint

One stop on the tour: an explanation of one piece of the change, marked beside its lines. A waypoint holds:

| Part | Content |
|---|---|
| Title | What the reviewer is being shown and why, never just the declaration's name. Until the agent writes it, the title is the declaration's name, marked as a draft. |
| Reading | The explanation: why this code runs and what goes wrong without it. |
| Code | A [CodeBlock](review-artifact.md#codeblock) reference: the range the waypoint is about, and which of the file's changes it covers. The diff marks come from those changes. |
| Code blocks | The [code blocks](codegraph/code-blocks.md) of the waypoint: the block it stops at first, then the changed blocks inside it, in the order they are written. A waypoint made of several types or statements holds each of them. Each is the same object as in the group, and as in a [Trace Diagram](trace-diagram.md) node that holds it. A waypoint in a file the codegraph does not trace has none. |
| Core change | Present only on a waypoint where the pull request does its real work, with one or two sentences saying why. |
| Findings | The [findings](#findings) about this code. |
| Children | Waypoints nested inside this one: the [changed steps](#the-steps-of-a-waypoint) of a declaration read in parts. Always two or more, never one: a single child would repeat its parent. |

### How a waypoint shows in the code

A waypoint starts closed, as a mark in the gutter at the left of the code, beside the first line it explains, the way an editor marks a breakpoint. The mark is a stop: the waypoint's most urgent finding, in the order bug, risk, Core change, question, nit; a waypoint with none is a plain ring, and a waypoint with no write-up a dashed one. A reviewed waypoint's mark is a solid blue stop with a check, whatever its findings. A waypoint in the spotlight carries four rays around its stop, and a quiet rail runs down the gutter beside the lines of every waypoint. Hovering or focusing the mark shows a preview on top of the line, or under it when the line is too near the top: the title, the findings, the lines and the position, the first paragraph of the reading and the Reviewed toggle. Clicking the mark, or Enter on it, opens the waypoint: its box sits on top of its lines, and a stem in the gutter joins it to the last of them. Stepping to a waypoint with the Review Navigator shows its preview instead, one preview at a time.

Comment threads have their own column of the gutter, beside the last line they cover: a filled speech mark for an open thread, a thin dashed one for a resolved thread, and an amber one for a comment of the reviewer's that is not sent yet. A thread opens under its line when its mark is clicked; a comment not sent yet starts open. The header of each file counts its waypoints, its findings by kind and its threads.

### The steps of a waypoint

**A changed declaration is read in parts.** The waypoint of a function, a component, a hook, a method, a class or a value at the top level of a file says what the author did across the whole declaration, and its children are the changed steps inside it. The steps are found as the [steps of a Trace Diagram node](trace-diagram.md#steps) are, from the blocks that have a change. [Steps](codegraph/steps.md) has the whole of the folding:

| A changed step | Its waypoint |
|---|---|
| A statement, with all that is written inside it | One child. A change to one property of an object is the child of the statement that holds the object. |
| Statements that follow each other and call nothing out | One child, from the first line of the first to the last line of the last |
| A condition, a switch, a loop, a `try-catch`, a `throw`, and a statement that calls out | One child each. What is written inside a condition, a switch, a loop or a `try-catch` is folded into it. |
| A function with a name, an event, an effect and a callback, when its own lines changed | One child, and the changed steps inside it are its children, found the same way |

**Only changed code has a waypoint.** A step is a child when it has a change, or when a block folded into it has one. A step a path only passes through is a row of the Trace Diagram and no waypoint.

**A step ends at a line that did not change.** Two changed statements are one child only when every line between them changed too, so no child lies on top of unchanged code.

**Markup has a child only for an expression.** Inside the markup of a component, a condition (`{isEmpty && <Empty />}`), a loop (`{items.map((item) => <Row />)}`) and an event (`onClick={() => save()}`) are each a child when anything inside them changed, and what is written inside one is folded into it. A changed element or attribute outside an expression has no child: the waypoint of the component covers it.

**One changed step is no child.** A declaration with a single changed step has its own waypoint alone. A step that would be the only child of its parent is left out, and its own children take its place.

**A short block is read whole.** A function, a component, a hook, a method, a condition, a loop, a `switch` or a `case` of fewer than six lines is one waypoint with no children, whether it is the declaration or a step inside one. What changed inside it is folded into it. One of six lines or more is read in parts as above.

**A line has one waypoint.** A step never starts on the line its parent starts on, nor on the line an earlier sibling starts on. A step on its parent's first line, such as a changed parameter, is left out and its own children take its place. Siblings that start on one line are one child, named after the first, from its first line to the last line of either. So a call and the arguments and callback written on its line are one waypoint.

| Of a child | What it is |
|---|---|
| `id` | The id of its parent and its place among the children: `w3.2`, and `w3.2.1` inside that one |
| `declaration` | The declaration of its parent and the name of the step, such as `renameUser › user, stored` or `Cart › button.onClick`. A step with no name is named after its type and its line: `renameUser › Condition :4`. |
| Code blocks | The blocks of its statements, and the changed blocks folded into them |

A type, a statement at the top level of a file and a file no language reads are read whole, and have no children.

**An import has no waypoint.** A changed import is shown in the code, marked as added, removed or changed, but nothing stops at it: the waypoint of the code that uses what it imports says why it is there. A file whose only change is to its imports has no File Section.

A waypoint holds its code blocks in three forms, as a [Trace Diagram node](trace-diagram.md#three-forms) does:

| Form | What it is for | Code blocks |
|---|---|---|
| In memory, and in a `.flightplan` file | The review artifact | `codeBlocks`, aliases of the blocks of the group. The file is written with [devalue](data-storage.md#the-flightplan-file), which keeps a block a waypoint and a node hold as one block. |
| Stored | Snapshots | `codeBlockIds` in place of the blocks |
| What an agent reads through the MCP tools | Writing the waypoint | `codeBlockIds` in place of the blocks |

The reviewer can mark a waypoint, a whole file or a root code block as reviewed. A reviewed waypoint hides, and comes back when its content changes. Reviewed marks belong to the reviewer's machine, not to the artifact: Flight Plan keeps them in a `.reviewed.json` file beside the artifact (see [data storage](data-storage.md)), and a published copy keeps them in the reader's browser (see [Flight Plan Review](flight-plan-review.md#publishing-as-a-claude-artifact)).

Each mark holds a fingerprint of what it was made on, and counts only while that is unchanged:

| Mark on | Its fingerprint | It also makes reviewed |
|---|---|---|
| A waypoint | Its title, reading, core change note, findings and lines | The waypoints nested in it |
| A file | The fingerprints of its waypoints | Every waypoint and root code block of the file |
| A root code block | Its lines and the fingerprints of the waypoints in it | Every waypoint that sits only in reviewed root code blocks |

A file is also reviewed when every waypoint in it is, and a root code block when every waypoint in it is. Taking a mark off takes off the marks that would keep it reviewed: off a waypoint, the marks of its nested waypoints, of its file and of the root code blocks it sits in; off a root code block, the marks of its file and of the waypoints in it; off a file, every mark in it.

A root code block is named by its file, its type and its name, `src/price.ts#function:priceOf`, so its mark holds when a regeneration moves it to other lines. A second root code block of the same type and name in the file is told apart by its place, `src/price.ts#function:priceOf~2`, and one with no name is named by its block id, which holds its first line.

### Folding a root code block

A reviewed root code block folds to its first line that the change does not remove, with Code Hike's collapse. Its other lines, the gaps inside it and the boxes of the waypoints that start after its first line are hidden; the lines it removes above that first line fold with it. The first line carries two controls at the right, over the end of the line: the Review Toggle of the root code block and a chevron that folds and unfolds it. They show while the pointer is on the line or a control has focus, and always while the block is folded or reviewed.

The chevron folds and unfolds any root code block by hand. Unfolding a reviewed one does not take its mark off, and it folds again the next time it is marked reviewed. Where a root code block runs across several pieces of the file, between gaps and waypoint boxes, every piece folds with it.

### Hint

A hint is one short sentence Flight Plan writes on its own, with no model, for a waypoint the agent has not written up yet: one whose reading is empty. It says what kind of code the waypoint is about and what the change does to it, read from the [classifications](codegraph/classifications.md) of the waypoint's code blocks. A hint is never stored in the artifact and never counts as a write-up; the page data carries it as `hint` on the waypoint, and `null` once the agent has written the reading.

| The waypoint's change | Hint |
|---|---|
| Every line added | "Adds a component." |
| Lines changed, and what changed is what the block is | "Changes an API route." |
| Lines changed inside a block that is something else | "Changes a database read or write inside a component." |
| Every code block deleted | "Removes a webhook." |
| No line changed: the block uses code that did | "No lines changed in a page, but it uses code that did." |

What the block is comes from the `classifications` of the waypoint's code blocks, and what changed from their `diffClassifications`: in each case the classification the hierarchy ranks highest across every code block of the waypoint, or `logic` ("plain logic") when none has one. A nested waypoint with no code blocks of its own is read by the root code blocks of the waypoint it sits in. A waypoint with no code block at all, in a file the codegraph does not trace, has no hint.

On the review page a waypoint with no write-up has a grey dotted ring for its mark, spinning while the agent writes it (`isBeingWritten`). Its card shows the hint, says the setup's agent has not explained the line or checked it for issues yet, and offers "Let Claude explain" (G), named after the setup's agent, and "Explain the whole code block" (Ctrl+G), which ask the agent for that waypoint or for every waypoint of its root code block ([write-up on demand](agent-conversation.md#write-up-on-demand)). See [the Review Navigator](review-navigator.md#writing-up-a-waypoint) for the keys.

A waypoint with no write-up can be [written up on demand](agent-conversation.md#write-up-on-demand), alone or with every waypoint of its root code block. While the agent writes it, the page data marks it `isBeingWritten`.

`hintOf(blocks, change)` in `packages/codegraph/src/code-blocks/hints.ts` writes it, and `HINT_SUBJECTS` holds the words for each classification. It takes any blocks, so a Trace Diagram card is given its hints the same way.

### Spotlight and Core change

Two marks say which parts of the change matter most. Flight Plan computes the first; the agent writes the second.

| Mark | Who decides | When it is on |
|---|---|---|
| **Spotlight** | Flight Plan, from the user's `spotlight` in the [review preferences](review-preferences.md) | What changed in the waypoint or root code block earns a classification the user chose: one of the `diffClassifications` of the waypoint's code blocks (or of the root code blocks it sits in, for a nested waypoint with none of its own) is in the spotlight |
| **Core change** | The agent | The waypoint carries the agent's `coreChange`: this is where the pull request does its real work. A root code block is a core change when a waypoint in it is. |

The page data carries them on each waypoint and each root code block of a File Section:

| Field | On | Value |
|---|---|---|
| `spotlight` | `WaypointView`, `RootBlockView` | `{ label: "Spotlight", classifications }`, the matched spotlight classifications with their labels in the order of the hierarchy, or `null` |
| `coreChangeLabel` | `WaypointView`, `RootBlockView` | "Core change", or `null` |
| `coreChange` | `WaypointView` | The agent's reason, or `null` when it gave none |

Spotlight reads what changed, not what the block is: a component in which only a database write changed is in the spotlight of a user who chose Database read/write, and not of one who chose Component. `spotlightViewOf` and `isInSpotlight` in `packages/codegraph/src/code-blocks/spotlight.ts` compute it from any blocks, and the backend passes the spotlight to the codegraph in the `ReviewViewContext`.

The page draws both side by side, Core change first: the Core change mark with its label, then the [Spotlight Mark](../DESIGN.md#spotlight-mark) with "Spotlight" and the matched classifications. A waypoint shows them in its box and its card, and a root code block on its first line. They replace the Needs Attention mark, which no view draws any more.

## Editing on the author's page

On the author's page the Code Walkthrough is edited, not reviewed. It has no Review Toggle on a file, a waypoint or a root code block, no Mark as reviewed and no Reviewed tick in the filter, and nothing is dimmed or hidden as reviewed.

- **The files are arranged.** "Arrange files" in the heading row opens a dialog that lists every File Section of the segment in the order shown, with Move up and Move down, one place per click, saved at once. From then on the walkthrough keeps that order. It shows when the walkthrough has more than one file.
- **A file is removed from the walkthrough.** The file stays among the files of its segment, and the diagrams stay as they were.
- **A file is shown as the reviewer sees it.** Each File Section shows the changed lines with the unchanged ones folded, and each waypoint as a mark in the gutter with its card and its box, as on a teammate's pull request. The open box carries the edit and remove buttons, and the file header carries the button that removes the file.
- **A waypoint with no description says so.** Its card says "This waypoint does not have any description or explanation." and offers "Write description", which opens the waypoint's form in place of its box. Write description (C) in the Review Navigator does the same for the current waypoint. The card on the author's page also offers "Let Claude explain" and "Explain the whole code block", as on a teammate's pull request.
- **A waypoint is edited.** Its form opens in place of the box, from the box's edit button or from Write description. It has the title, the reading in the text editor with CodeLink, and a "Core change" checkbox, with a line under it that says what the mark is for, that opens the reason in the text editor. The reason is optional: a mark with no reason shows its chip on the waypoint and nothing under the reading. A waypoint needs a title; its reading may be empty.
- **A waypoint is removed.** The waypoints inside it stay, in its place. Removing asks for no confirmation.

The findings of a waypoint, the title and the summary of a file and the intro of the walkthrough are not edited there.

## Findings

What the change gets wrong or leaves in doubt. A finding always lives on a waypoint, so the reviewer meets the claim and the code together. An artifact has no list of findings outside its waypoints.

| Kind | Meaning |
|---|---|
| `bug` | Broken behaviour that will cause an incident, and proven. A bug that cannot be proven is a risk. |
| `risk` | Code that works but is fragile (a race, a missing null check, a swallowed error), or that looks broken without a demonstration. An unsafe path that looks reachable and that nobody has seen fire. |
| `nit` | Anything the author may decline: style, naming, a micro-optimisation, any improvement. All of it is optional. |
| `question` | Something the agent is not sure about. A genuine question, not a suggestion in disguise. |

Kinds are listed from most to least severe, and a waypoint with several findings shows the most severe one's chip. Each finding has:

- a **title** and a **reading**;
- an optional **trace**: the steps that prove the claim, each naming its code with a CodeLink;
- a **solution**: replacement code for the waypoint's lines, so the reviewer can preview the fix in place. A finding with lines to fix carries one in a complete artifact.

A `question` has no trace and no solution: there is no claim to prove and no fix to preview.

## Filters

The reviewer can narrow the tour to the waypoints worth stopping at. The filter is a set of ticks in groups:

- The finding kinds: **Core change**, **Bug**, **Risk**, **Nit**, **Question**
- The code blocks: the primary [classification](codegraph/classifications.md) of each [root block](codegraph/code-blocks.md) the waypoints of the segment are in, the one it shows in the walkthrough, and what the change did to it, such as **Database operation** with **Added** or **Component** with **Modified**. Each reads the classification, then what happened in its colour: added in the added colour, modified in blue, deleted in the removed colour. The classifications of the user's [spotlight](#spotlight-and-core-change) come first and are always listed. Then come the four others with the most waypoints, with any that are ticked, and the rest are under **More**. Ties keep the order of the hierarchy. Imports are left out: a root block that is an import, added, modified or deleted, has no option and matches no code block filter. A code block option's key is `block:<classification>:<change>`.
- **Change type**, a submenu: **Added**, **Modified**, **Removed**

A root block is **added** when every row of it is added, with no removed lines just before it, so a rewritten block is modified. It is **deleted** when it is a `deleted` block, and it is then named by the classification of what was taken out. It is **modified** otherwise. A waypoint is in the root blocks of its code blocks, and a step is in the root blocks of its waypoint. A waypoint that covers several root blocks, such as a run of statements, matches each of them.

A waypoint is **added** when every line of it is added, **removed** when every code block of it is deleted code, and **modified** when it changes some of its lines. A waypoint on lines the change leaves alone has no change type.

Within a group, a waypoint shows when it matches any tick. With ticks in several groups, it has to match every one of those groups, so Bug and Added show the added waypoints that have a bug. A group with nothing ticked lets every waypoint through. While anything is ticked, a file shows only the root blocks that hold a waypoint the filter keeps; the rest of the file folds into gaps, short ones too unless they are only blank lines, and a gap that holds changed lines says how many lines the filter hides. Inside those root blocks, unchanged lines far from a change fold as they always do. A waypoint without code blocks keeps its own lines, and a line with a comment thread stays shown wherever it is. The Reviewed tick alone narrows nothing.

The filter belongs to its segment: each segment has its own ticks and its own Reviewed tick, and the finding kinds, Change type and Reviewed count the waypoints of that segment. The Filter button carries a badge with how many filters are ticked, one included; the Reviewed tick is not counted. The Change type and More rows name their ticks ("Added, Removed").
