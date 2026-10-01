# Code Walkthrough

## Definition

The Code Walkthrough is the section of a [review artifact](review-artifact.md) where the reviewer reads the changed code itself. It is the code, file by file, with each explanation placed as a box directly on top of the lines it is about. A reviewer reads down the code and meets each explanation exactly where it applies.

It opens with one line saying what the tour follows, and states how many of the change's files it covers ("12 of 14 files"). Full coverage is stated as plainly as partial coverage, so a reviewer never has to guess whether a file was left out.

## File Section

One per changed file. A File Section holds:

- a **title**: what the reviewer is being shown in this file, written by the agent;
- the file's repository-relative path;
- a short summary: the file's items from the Context Section's implementation list;
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
| Needs attention | Present only when the agent judges the reviewer must not skim this change, and says why. |
| Findings | The [findings](#findings) about this code. |
| Children | Waypoints nested inside this one, for a large declaration read in parts. Always two or more, never one: a single child would repeat its parent. |

The reviewer can mark a waypoint, or a whole file, as reviewed. A reviewed waypoint hides, and comes back when its content changes. Reviewed marks belong to the reviewer's machine, not to the artifact.

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

The reviewer can narrow the tour to the waypoints worth stopping at. The filter is a set of ticks:

- **Needs Attention**
- **Bug**, **Risk**, **Nit**, **Question**

With several ticked, a waypoint shows when it matches any of them. With nothing ticked, every waypoint shows. Each option shows how many waypoints it matches.
