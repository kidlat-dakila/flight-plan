---
title: Git connection
description: How Flight Plan reaches your pull requests, and how it picks a connection for each repository.
sidebar:
  label: Overview
---

Flight Plan reads your branches with local git, and reaches your pull requests through a connection to the site that hosts them. You add connections in the [Git integration](/docs/setup/git-integration/) step of setup, and change them later under **Settings → Git integration**.

| Connection | Page |
|---|---|
| Local git | [Local git](/docs/git-connection/local-git/) |
| GitHub CLI, GitHub token | [GitHub](/docs/git-connection/github/) |
| GitLab CLI, GitLab token | [GitLab](/docs/git-connection/gitlab/) |
| Bitbucket | [Bitbucket](/docs/git-connection/bitbucket/) |

Flight Plan acts on your forge as you, so it sees what you can see.

## Which connection a repository uses

Flight Plan reads each repository's remote, `origin` first, then the others, and uses the connection that serves the remote's host:

| Host | Connections that serve it |
|---|---|
| `github.com` | GitHub CLI, GitHub token |
| `gitlab.com` | GitLab CLI, GitLab token |
| `bitbucket.org` | Bitbucket |
| The host of a Base URL you entered | The token connection with that Base URL |
| Any other host | GitLab CLI |

When more than one of your connections serves the host, Flight Plan uses the first in the order the Git integration step lists them. When none does, the repository uses local git.

## What each connection can do

| | Local git | GitHub, GitLab | Bitbucket |
|---|---|---|---|
| Review a branch | Yes | Yes | Yes |
| List pull requests | No | Yes | Yes |
| Filter pull requests by label or review state | No | Yes | No |
| Show the author and each reviewer's state | No | Yes | Yes |
| Comment, reply and resolve threads | No | Yes | Yes |
| Submit a review with a verdict | No | Yes | Yes |
| Request reviewers | No | Yes | Yes |
| Link into the forge's own diff view | No | Yes | Yes |

A control that a connection can't support shows as unavailable instead of failing when you use it.

## When something goes wrong

A repository that Flight Plan can't reach shows the reason on its line. The most common ones:

- **Not signed in, no token, or the token can't see the repository.** Sign in with the command line tool again, or save a new token under **Settings → Git integration**.
- **The folder has no git remote.** Add a remote, or review it through local git.
- **The repository lists only the branches you add.** None of your connections serves its host, so it uses local git. Add a connection for that host.
