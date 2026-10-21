---
title: Git integration
description: Connect Flight Plan to the code hosting sites you use, or review with local git.
---

By default, Flight Plan uses the `git` command to read and fetch your local and remote branches and their commits. That's local git. It needs no account and is always on, so you can skip this step.

![Checking GitHub token in Settings → Git integration and typing a token](../../media/setup-git-forge-light.webm)

Connecting a code hosting site, such as GitHub, GitLab or Bitbucket, lets Flight Plan do more:

- fetch the open pull requests of you and your team members,
- read the comments and reviews on a pull request,
- add comments and submit reviews,
- and use most of the other features your git provider offers.

| Option | How it connects |
|---|---|
| [GitHub CLI](/docs/git-connection/github/) | Uses `gh` and its own sign-in. |
| [GitLab CLI](/docs/git-connection/gitlab/) | Uses `glab` and its own sign-in. |
| [GitHub token](/docs/git-connection/github/) | GitHub or GitHub Enterprise, with a token. |
| [GitLab token](/docs/git-connection/gitlab/) | GitLab or self-managed GitLab, with a token. |
| [Bitbucket](/docs/git-connection/bitbucket/) | Bitbucket Cloud or Data Center, with a username and a token. |

A command line option shows **Signed in as** and your account once you have signed in with the tool. Until then it's **Unavailable**, with what to do.

A token option asks for:

- **Token.** It goes into your system keychain and is never shown again. When a token is already saved, leave the field empty to keep it.
- **Base URL**, only for a self-hosted site, such as `https://git.example.com`. Leave it empty for the cloud.

**Skip for now** keeps local git only. You can connect a site later under **Settings → Git integration**.

There is no default to choose. Each repository uses the connection that serves its remote's host, and local git when none does. See [Git connection](/docs/git-connection/) for how Flight Plan matches them.
