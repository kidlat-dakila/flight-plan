---
title: Review artifacts
description: What a review artifact holds, who makes each part, and how the review page shows it.
---

A review artifact is the review Flight Plan builds for one pull request or branch, with the prose your agent adds when you ask. Flight Plan shows it on the review page next to the code it describes. It answers four questions a diff leaves open: why the change exists, how it runs, what it can affect, and where to look.

## Parts of the artifact

| Part | What it answers | Who makes it |
|---|---|---|
| [Segments](/docs/review-artifacts/parts/segments/) | How the change splits into parts you can read one at a time | Flight Plan |
| [Context](/docs/review-artifacts/parts/context/) | Why the change exists | The agent |
| [Change Overview](/docs/review-artifacts/parts/change-overview/) | Which code the change adds, modifies and deletes | Flight Plan |
| [Trace Diagram](/docs/review-artifacts/parts/trace-diagram/) | How execution reaches the changed code | Flight Plan draws it, the agent labels it |
| [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/) | What the change can affect outside itself | Flight Plan draws it, the agent assesses each file |
| [Code Walkthrough](/docs/review-artifacts/parts/code-walkthrough/) | Where to look, in what order | Flight Plan picks the files, the lines and the order, the agent explains them |
| [Findings](/docs/review-artifacts/parts/findings/) | What might be wrong | The agent |
| [Context code blocks](/docs/review-artifacts/parts/context-code-blocks/) | What a name in the code is | Flight Plan finds each name's code, the agent describes it |

Flight Plan works out the structure from the code: which files, lines, nodes and edges a review covers. You can read it before any prose is written, and until your agent explains a part, Flight Plan's hint stands in, such as "Adds a component." The agent writes only the prose, so it can't leave a file or a caller out. The Code Walkthrough states how many changed files it covers.

## Around the artifact

- [Explaining a review](/docs/review-artifacts/features/explaining/): ask your agent for the whole review or one part of it.
- [Review Navigator](/docs/review-artifacts/features/review-navigator/): the toolbar and the keys that take you through a review.
- [Comments and threads](/docs/review-artifacts/features/comments-and-threads/) on lines of the change.
- [Reviewed marks](/docs/review-artifacts/features/reviewed-marks/) that hide what you've read.
- [Submitting a review](/docs/review-artifacts/features/submitting-a-review/) with a verdict.
- [Agent chat](/docs/review-artifacts/features/agent-chat/) with your agent.
- [Sharing](/docs/review-artifacts/features/sharing/) a review in the pull request or as a Claude artifact.
- [Git features](/docs/review-artifacts/features/git-features/): branch status, switching pull requests, and keeping a review up to date.
- [Your own Flight Plan](/docs/review-artifacts/features/your-own-flight-plan/) for a pull request or branch you wrote.

## Finding your way around

The rail on the left lists each segment with its sections, in the order of your display arrangement, and every file of its Code Walkthrough. Click an entry to jump to it. The [Review Navigator](/docs/review-artifacts/features/review-navigator/) at the foot of the page does the same from the keyboard.

While your agent writes, a strip under the header shows its progress, such as **12 of 40 parts written**, and each part appears as it's written. A section your agent hasn't explained says **Not explained yet** beside its heading.
