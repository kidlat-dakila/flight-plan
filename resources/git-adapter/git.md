Flight Plan uses plain `git` and talks to no code host at all.

Everything that reads the checkout works: a file at a commit, the diff of a
branch against trunk, and any walkthrough written on this machine.

**What is unavailable**

- Listing pull requests. Nothing local knows which branches are under review, so
  the list holds only branches you add by name.
- Filtering by review state or label.
- Links into a diff on the web.

**What you can still do**

Add a branch by name and Flight Plan reads it from your checkout. If the branch
is not there yet, fetch it — the panel offers a button.

Nothing here needs installing or signing in to, which is why it is the default.
