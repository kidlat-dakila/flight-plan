---
title: Local git
description: Review the branches of a repository on your machine, with no account and no network.
---

Local git reviews the branches of a repository on your machine. It needs no account and no token, and it's always on.

## What it lists

A repository on local git lists only:

- the branches you add yourself, with **Add a branch** on its line on the home page, and
- the branches of the team members you track, when the main branch doesn't contain them yet.

With no team member tracked, Flight Plan lists no branch on its own, not even yours. An empty repository says **No branches yet** and offers **Add a branch**.

Flight Plan fetches in the background, at most once every five minutes, so new remote branches of the people you track show up on their own.

Flight Plan takes you to be the user in your git config: the repository's own config, or your global config when the repository sets no email.

## What it can't do

With local git only, Flight Plan can't:

- list pull requests to review,
- filter pull requests by label or by their review state,
- show the author and each reviewer's state,
- link into the forge's own diff view.

There are no comments, threads or submitted reviews either, because there is no forge to hold them. You can still read and write a whole Flight Plan for a branch. When the branch gets a pull request on a site that Flight Plan can reach, the Flight Plan can move to it.
