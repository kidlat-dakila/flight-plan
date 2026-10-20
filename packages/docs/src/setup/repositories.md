---
title: Repositories
description: Add the repositories you review and choose whose work Flight Plan lists.
---

Add the repositories you want to review. Flight Plan lists the pull requests and branches of each one on your home page.

![Configuring a repository and the team members it follows](../../media/setup-repositories-light.webp)

## Add a repository

**Add repository** opens a dialog. Type the full path of a folder that holds a git repository, or search for it by name. The search needs at least three characters and looks through your home folder, skipping hidden folders, `node_modules`, `Library`, `Applications` and `AppData`. **Browse folders** lets you open folders one by one instead.

Flight Plan refuses a folder that isn't a git repository, a folder already on the list, and a second repository with the same name.

## Choose who to follow

What a repository lists depends on how Flight Plan reaches it:

- **On GitHub, GitLab or Bitbucket** you see everyone's pull requests, unless you pick specific team members.
- **With local git** you see only the branches you add, plus those of the team members you pick. See [Local git](/docs/git-connection/local-git/).

**Track branches from specific team members** picks those people. Search by name or username on a code hosting site, and by name or email with local git. The account you're signed in with on the code hosting site doesn't show up in the search.

On local git, Flight Plan takes you to be the user in your git config. It reads the repository's config first, and your global config (`git config --global user.email`) when the repository sets no email. A code hosting site already knows who you are.

**Finish setup** saves the repositories. At that moment Flight Plan matches each repository's remote to one of your connections. See [Git connection](/docs/git-connection/).

Later, **Settings → Repositories** lists them again. **Configure** changes the team members you follow. **Remove repository** takes a repository off the list and leaves its folder on disk alone.
