---
title: Comments and threads
description: Comment on lines of the change, reply to threads and resolve them, all on your forge.
---

You can comment on the pull request from the review page. Comments go to your forge, so the author sees them where they always do.

![Commenting on two lines and adding the comment to the review as pending](../../../media/comments-light.webm)

## Comment on a line

Hover a line of the change and click the **+** beside it. Shift-click the **+** of another line to comment on a range. You can also select code and choose **Add comment**.

Only changed lines and the three lines around each change can hold a comment, because that's all the forge accepts. Removed lines can be commented too.

Then choose how to send it:

- **Add to review** keeps the comment as pending. Nobody sees it until you [submit your review](/docs/review-artifacts/features/submitting-a-review/).
- **Add single comment** posts it at once.

## Threads

A thread shows the lines it is on, its comments and a **Reply** box. **Resolve conversation** folds it away, and **Reopen conversation** brings it back, when the forge allows it. A pending comment shows **Pending** and a **Discard** button.

Threads on code that has moved since, and threads the page can't place, appear in the **Conversation** section at the end of the review, with the file and lines they were on.

## Conversation

The **Conversation** section lists the pull request's comments and submitted reviews, oldest first, with each review's verdict. The box at its end posts a comment on the pull request itself.

Comments need a forge that supports them. A branch reviewed through local git has none.
