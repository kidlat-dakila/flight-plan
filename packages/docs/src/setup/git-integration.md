---
title: Git integration
description: Connect Flight Plan to each code hosting site you use, and choose the default.
---

Your pull requests live on a code hosting site such as GitHub, GitLab or Bitbucket. In this step you connect Flight Plan to each one you use, through its command line tool or with a token, and pick the default. Local git needs no account: it reviews the branches on your computer, with fewer features.

![Connecting GitHub with a token and making it the default](../../media/setup-git-forge-light.webm)

| Option | How it connects |
|---|---|
| [Local git](/docs/git-connection/local-git/) | Reads the branches of the repository on your machine. No account. |
| [GitHub CLI](/docs/git-connection/github/) | Uses `gh` and its own sign-in. |
| [GitLab CLI](/docs/git-connection/gitlab/) | Uses `glab` and its own sign-in. |
| [GitHub token](/docs/git-connection/github/) | GitHub or GitHub Enterprise, with a token. |
| [GitLab token](/docs/git-connection/gitlab/) | GitLab or self-managed GitLab, with a token. |
| [Bitbucket](/docs/git-connection/bitbucket/) | Bitbucket Cloud or Data Center, with a username and a token. |

Local git is always on. Checking another option makes it the default. Unchecking the default makes local git the default again.

A token option asks for:

- **Token.** It goes into your system keychain and is never shown again. When a token is already saved, leave the field empty to keep it.
- **Base URL**, only for a self-hosted site, such as `https://git.example.com`. Leave it empty for the cloud.

Each repository uses the connection that serves its remote's host. See [Git connection](/docs/git-connection/) for how Flight Plan matches them.
