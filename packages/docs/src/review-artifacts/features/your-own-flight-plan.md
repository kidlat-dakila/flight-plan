---
title: Your own Flight Plan
description: Shape the Flight Plan of your own pull request or branch, and hand it to your reviewers.
---

A pull request you opened, or a branch with your last commit on it, opens on the author's page. There you shape the Flight Plan for your reviewers, yourself or with your agent's explanations.

## Open it

Open it from the home page, or use **Create Flight Plan** on the repository's line and pick the pull request or branch. The page shows what the change touches and the branch it's compared with. **Create Review Artifact** builds the review from the code, as it does for any review, and the header says **Your Flight Plan**. The dialog that asks your agent to [explain the review](/docs/review-artifacts/features/explaining/) opens here too.

## Edit it

On the author's page every part can be edited:

- [Segments](/docs/review-artifacts/parts/segments/): their labels, their files and their order.
- [Context](/docs/review-artifacts/parts/context/): the text, with links to code.
- [Trace Diagram](/docs/review-artifacts/parts/trace-diagram/): its cards, lines, title and description.
- [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/): the impact of each file.
- [Code Walkthrough](/docs/review-artifacts/parts/code-walkthrough/): the waypoints, the files and their order. **Write description** (C) opens a waypoint's form, with its title, its explanation, the **Core change** mark and additional context for your reviewers.

Findings come from your agent and aren't edited here.

## Mark it as complete

**Mark as complete** finishes the Flight Plan. For a branch, Flight Plan asks which of your open pull requests it belongs to, and moves it there. **Complete without a pull request** keeps it on the branch.

Once it's complete, [Share](/docs/review-artifacts/features/sharing/) puts it in the pull request description or publishes it as a Claude artifact.
