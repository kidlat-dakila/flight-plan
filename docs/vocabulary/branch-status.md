# Branch status

## Definition

The branch status says where a [review target](forge.md#review-targets) stands in its review: who has to act next, or that the review is over. It is the status the index page shows on each review target and filters by.

It is not the status of a [review artifact](review-artifact.md#status). An artifact is `drafting` or `complete`, and can be stale against its pull request. The branch status describes the pull request itself.

## People

| Term | Meaning |
|---|---|
| **Author** | The person who created the pull request. |
| **Reviewers** | The people who review it. Who they are depends on who is looking, as described below. |
| **User** | The person running Flight Plan. |

The reviewers are read from the user's side of the pull request:

- When the user is **not** the author, the user is the reviewer. Only the user's own reviews and comments count.
- When the user **is** the author, the reviewers are the other engineers: the members of the repository who are assigned as reviewers or have left comments on the pull request.

## Statuses

| Status | Meaning |
|---|---|
| `no-review` | The author is asking for a review, and the reviewers have left no review and no comment yet. |
| `awaiting-review` | The author has pushed new commits since the reviewers' last review. |
| `awaiting-reply` | The author has responded to some of the reviewers' comments, and has pushed no new commits. |
| `stale` | The reviewers have reviewed the pull request, and nothing has changed since: no new commits and no responses from the author. |
| `draft` | The pull request is in draft mode. |
| `closed` | The pull request is closed. |
| `merged` | The pull request is merged. |

New commits outweigh replies: a pull request whose author has both replied and pushed commits since the last review is `awaiting-review`.

## Where the status comes from

A pull request on a forge:

- Its state decides `merged`, `closed` and `draft`, in that order.
- Otherwise the reviewers' last activity decides. A reviewer's activity is a review, an approval, or a comment, including a comment inside a review thread. The author's activity that counts is a reply in the discussion. Commits count by their commit date.
- No activity by the reviewers is `no-review`. A commit after the reviewers' last activity is `awaiting-review`. Without one, an author's reply after that activity is `awaiting-reply`, and nothing after it is `stale`.

A local branch has no forge, so it has no reviewers and no state to read. Every local branch is `no-review`. The index never looks at review artifacts.

## Filter

The index page filters review targets by branch status. Several statuses can be selected at once, and a review target shows when it has any of them. `draft`, `closed` and `merged` are unselected by default, and the other four are selected. Each option shows how many review targets have that status, counted over the whole list.
