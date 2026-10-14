---
title: Git features
description: Branch status, switching to another pull request, and keeping a review up to date.
---

The review page keeps track of where the pull request stands, and lets you move between pull requests and bring a review up to date.

![Switching to another pull request from the review title](../../../media/git-features-light.webm)

## Status

Each pull request and branch has a status, shown beside its title and used to filter the list on the home page:

| Status | Meaning |
|---|---|
| **No review** | The author is asking for a review, and the reviewers haven't reviewed or commented yet. |
| **Awaiting review** | The author has pushed new commits since the reviewers' last review. |
| **Awaiting reply** | The author has answered some of the reviewers' comments and pushed no new commits. |
| **Stale** | The reviewers have reviewed it, and nothing has happened since: no new commits and no replies. |
| **Draft** | The pull request is a draft. |
| **Closed** | The pull request is closed. |
| **Merged** | The pull request is merged. |

The reviewers depend on who is looking. On someone else's pull request, you are the reviewer, and only your own reviews and comments count. On your own, the reviewers are the people assigned to it or commenting on it. A branch with no forge is always **No review**.

The home page shows open work by default: no review, awaiting review, awaiting reply and stale.

## Switching pull requests

The review title is a menu. It lists the other pull requests and branches of the repository, newest first. **Search by title or author** narrows the list, and picking one opens its review.

## Keeping a review up to date

A review describes one commit. When the pull request moves past it, the header says **Out of date**, and a notice names both commits. The options menu (**More actions**) has:

- **Update the Flight Plan.** Flight Plan pulls the branch and builds the review again from its latest commit. What the agent wrote for code that hasn't changed is kept, and the agent writes the rest.
- **Regenerate from scratch.** The same, but everything the agent wrote is erased and written again.
- **Delete.** Removes the Flight Plan from your machine.

When you prompt your agent yourself, **Copy the update prompt** on the notice copies the prompt to paste.

## New pull requests

The home page tells you about new pull requests and branches from the people you follow, with **Create Flight Plan** to start a review of one.
