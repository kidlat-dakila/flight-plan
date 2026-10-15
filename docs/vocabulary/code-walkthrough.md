# Code Walkthrough

## Definition

The Code Walkthrough is the section of a [review artifact](review-artifact.md) where the reviewer reads the changed code itself. It is the code, file by file, with each explanation placed as a box directly on top of the lines it is about. A reviewer reads down the code and meets each explanation exactly where it applies.

It opens with one line saying what the tour follows, and states how many of the change's files it covers ("12 of 14 files"). Full coverage is stated as plainly as partial coverage, so a reviewer never has to guess whether a file was left out.

## Order

The order of the File Sections is chosen by the reviewer in the [review request](flight-plan-review.md#review-request), before the agent starts.

| Order | What comes first |
|---|---|
| **Foundations first** | The deepest changed code, then the code that calls it, then the wiring and configuration. A name is defined before it is used. The default. |
| **Along the path** | The file where control arrives first, then each file the change reaches in turn, as the [Journey Flow Diagram](journey-flow-diagram.md) reads. |
| **Core change first** | The files that are the point of the change, then the code that supports them, then the callers that had to follow. |
| **Risk first** | The files whose waypoints need the most attention, down to the ones that are safe to skim. |
| **Custom** | The reviewer's own instruction for the order, passed to the agent as written. |

## File Section

One per changed file. A File Section holds:

- a **title**: what the reviewer is being shown in this file, written by the agent;
- the file's repository-relative path;
- a short summary: the changes the Context Section names for this file;
- its [Diff Waypoints](#diff-waypoint), in reading order.

The title is also the file's label on the section rail, where the Code Walkthrough lists one stop per file.

When Flight Plan derived the section's structure from the code, the agent fills in its waypoints by id and cannot replace the section wholesale. When the file is in a language the codegraph does not trace, the agent writes the section's waypoints itself.

## Diff Waypoint

One stop on the tour: an explanation of one piece of the change, placed on top of its lines. A waypoint holds:

| Part | Content |
|---|---|
| Title | What the reviewer is being shown and why, never just the declaration's name. Until the agent writes it, the title is the declaration's name, marked as a draft. |
| Reading | The explanation: why this code runs and what goes wrong without it. |
| Code | A [CodeBlock](review-artifact.md#codeblock) reference: the range the waypoint is about, and which of the file's changes it covers. The diff marks come from those changes. |
| Code blocks | The [code blocks](codegraph/code-blocks.md) of the waypoint: the block it stops at first, then the changed blocks inside it, in the order they are written. A waypoint made of several imports, types or statements holds each of them. Each is the same object as in the group, and as in a [Journey Flow Diagram](journey-flow-diagram.md) node that holds it. A waypoint in a file the codegraph does not trace has none. |
| Needs attention | Present only when the agent judges the reviewer must not skim this change, and says why. |
| Findings | The [findings](#findings) about this code. |
| Children | Waypoints nested inside this one: the [changed steps](#the-steps-of-a-waypoint) of a declaration read in parts. Always two or more, never one: a single child would repeat its parent. |

### The steps of a waypoint

**A changed declaration is read in parts.** The waypoint of a function, a component, a hook, a method, a class or a value at the top level of a file says what the author did across the whole declaration, and its children are the changed steps inside it. The steps are found as the [steps of a Journey Flow Diagram node](journey-flow-diagram.md#steps) are, from the blocks that have a change. [Steps](codegraph/steps.md) has the whole of the folding:

| A changed step | Its waypoint |
|---|---|
| A statement, with all that is written inside it | One child. A change to one property of an object is the child of the statement that holds the object. |
| Statements that follow each other and call nothing out | One child, from the first line of the first to the last line of the last |
| A condition, a switch, a loop, a `try-catch`, a `throw`, and a statement that calls out | One child each. What is written inside a condition, a switch, a loop or a `try-catch` is folded into it. |
| A function with a name, an event, an effect and a callback, when its own lines changed | One child, and the changed steps inside it are its children, found the same way |

**Only changed code has a waypoint.** A step is a child when it has a change, or when a block folded into it has one. A step a path only passes through is a row of the Journey Flow Diagram and no waypoint.

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

An import, a type, a statement at the top level of a file and a file no language reads are read whole, and have no children.

A waypoint holds its code blocks in three forms, as a [Journey Flow Diagram node](journey-flow-diagram.md#three-forms) does:

| Form | What it is for | Code blocks |
|---|---|---|
| In memory, and in a `.flightplan` file | The review artifact | `codeBlocks`, aliases of the blocks of the group. The file is written with [devalue](data-storage.md#the-flightplan-file), which keeps a block a waypoint and a node hold as one block. |
| Stored | Snapshots | `codeBlockIds` in place of the blocks |
| What an agent reads through the MCP tools | Writing the waypoint | `codeBlockIds` in place of the blocks |

The reviewer can mark a waypoint, or a whole file, as reviewed. A reviewed waypoint hides, and comes back when its content changes. Reviewed marks belong to the reviewer's machine, not to the artifact.

## Editing on the author's page

On the author's page the Code Walkthrough is edited, not reviewed. It has no Review Toggle on a file or a waypoint, no Mark as reviewed and no Reviewed tick in the filter, and nothing is dimmed or hidden as reviewed.

- **The files are arranged.** "Arrange files" in the heading row opens a dialog that lists every File Section of the segment with Move up and Move down, one place per click, saved at once. It shows when the walkthrough has more than one file.
- **A file is removed from the walkthrough.** The file stays among the files of its segment, and the diagrams stay as they were.
- **A file is shown whole.** Each File Section shows the file's whole code, with every waypoint set under its last line. A waypoint whose lines are not in the file is set above the code.
- **A waypoint is edited.** Its form has the title, the reading in the text editor with CodeLink, and a "Needs Attention" checkbox, with a line under it that says what the mark is for, that opens the reason in the text editor. The reason is optional: a mark with no reason shows its chip on the waypoint and nothing under the reading. A waypoint needs a title; its reading may be empty.
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

- The finding kinds: **Needs Attention**, **Bug**, **Risk**, **Nit**, **Question**
- The code blocks: the type of each [root block](codegraph/code-blocks.md) the waypoints of the segment are in, and what the change did to it, such as **Function** with **Added** or **Component** with **Modified**. Each reads the type, then what happened in its colour: added in the added colour, modified in blue, deleted in the removed colour. The four with the most waypoints are listed, with any that are ticked, and the others are under **More**. Imports are left out: a root block that is an import, added, modified or deleted, has no option and matches no code block filter.
- **Change type**, a submenu: **Added**, **Modified**, **Removed**

A root block is **added** when every row of it is added, with no removed lines just before it, so a rewritten block is modified. It is **deleted** when it is a `deleted` block, and it is then named by the type of what was taken out, or "Code" when that type is not known. It is **modified** otherwise. A waypoint is in the root blocks of its code blocks, and a step is in the root blocks of its waypoint. A waypoint that covers several root blocks, such as a run of imports, matches each of them.

A waypoint is **added** when every line of it is added, **removed** when every code block of it is deleted code, and **modified** when it changes some of its lines. A waypoint on lines the change leaves alone has no change type.

Within a group, a waypoint shows when it matches any tick. With ticks in several groups, it has to match every one of those groups, so Bug and Added show the added waypoints that have a bug. A group with nothing ticked lets every waypoint through. While anything is ticked, a file shows only the root blocks that hold a waypoint the filter keeps; the rest of the file folds into gaps, short ones too unless they are only blank lines, and a gap that holds changed lines says how many lines the filter hides. Inside those root blocks, unchanged lines far from a change fold as they always do. A waypoint without code blocks keeps its own lines, and a line with a comment thread stays shown wherever it is. The Reviewed tick alone narrows nothing.

The filter belongs to its segment: each segment has its own ticks and its own Reviewed tick, and the finding kinds, Change type and Reviewed count the waypoints of that segment. The Filter button carries a badge with how many filters are ticked, one included; the Reviewed tick is not counted. The Change type and More rows name their ticks ("Added, Removed").
