---
title: Submitting a review
description: Send your pending comments to the forge with a summary and a verdict.
---

When you're done reading, **Submit review** sends your review to the forge. The button shows how many pending comments you have, such as **Submit review (3)**.

![Submitting a review with a summary and a verdict](../../../media/submit-review-light.webm)

## Submit your review

The panel asks for:

- **A summary** for the author.
- **A verdict:**
  - **Comment** sends your comments without a verdict.
  - **Approve** sends your comments and approves the change.
  - **Request changes** sends your comments and asks for changes before merging.

  Only the verdicts your forge accepts are listed.

Below them it lists the pending comments that go with it, each with a **Discard** button. You need a summary or at least one comment to submit.

A pending comment written against an earlier commit can't be sent. Discard it, and comment again on the current code.

## Reviewers

The review header shows the pull request's reviewers and whether each one has reviewed, commented, approved or requested changes. **Request a reviewer** searches for people and asks them for a review. A reviewer's menu removes the request, or asks for a review again.

A branch reviewed through local git has no review to submit.
