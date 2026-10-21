---
title: Repositories
description: Pick the repositories you review, and choose whose work Flight Plan lists.
---

Pick the repositories you want to review. Flight Plan lists the pull requests and branches of each one on your home page.

## Recent repositories

Flight Plan looks through your home folder for the repositories where you made the last commit on `main` or `master`, and lists the ten most recent. Check a repository to follow it. It's saved at once, and unchecking it stops following it.

## Add a repository

If your repository isn't in the list, **Add repository** opens a dialog. Type the full path of a folder that holds a git repository, or search for it by name. The search needs at least three characters and looks through your home folder, skipping hidden folders, `node_modules`, `Library`, `Applications` and `AppData`. **Browse folders** lets you open folders one by one instead.

Flight Plan refuses a folder that isn't a git repository, a folder already on the list, and a second repository with the same name.

## Choose who to follow

A checked repository opens its fields under its name.

Flight Plan knows you from your git config. It reads the repository's config first, and your global config (`git config --global user.email`) when the repository sets no email. If it finds no email, it asks you to pick yourself from the people who committed to the repository.

**Track branches from specific team members** picks the people whose work you review. Search by name or email, or by username on a code hosting site. You don't need to add yourself: as soon as you track anyone, your own work is listed too.

With nobody tracked, what a repository lists depends on how Flight Plan reaches it:

- On GitHub, GitLab or Bitbucket, everyone's pull requests.
- With local git, only the branches you add yourself. See [Local git](/docs/git-connection/local-git/).

**Save and continue** waits for at least one repository. When you finish setup, Flight Plan matches each repository's remote to one of your connections. See [Git connection](/docs/git-connection/).

## Later

**Settings → Repositories** shows the same list, and each change is saved as you make it. On the home page, **Configure** beside a repository changes the team members you track in it, and **Remove repository** takes it off the list and leaves its folder on disk alone.
