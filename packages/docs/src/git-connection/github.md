---
title: GitHub
description: Connect GitHub or GitHub Enterprise through the GitHub CLI or a token.
---

Flight Plan reaches GitHub in two ways. Both have every feature: listing pull requests, filters, reviewers, comments, threads and submitted reviews.

![Connecting GitHub with a token](../../media/setup-git-forge-light.webm)

## GitHub CLI

The **GitHub CLI** option uses `gh` and its own sign-in. Flight Plan calls the GitHub API through `gh api`, so it never sees a token.

1. Install the [GitHub CLI](https://cli.github.com/).
2. Run `gh auth login` in a terminal.
3. Reload the Git integration step. The row shows **Signed in as** and your account.

The GitHub CLI option serves repositories on `github.com` only. For GitHub Enterprise, use a token.

## GitHub token

The **GitHub token** option reaches github.com or GitHub Enterprise with a token.

- **Token.** A personal access token that can read the repositories you review and their pull requests, and write comments and reviews on them. Flight Plan keeps it in your system keychain.
- **Base URL.** Leave it empty for github.com. For GitHub Enterprise, enter the address of your instance, such as `https://github.example.com`. Flight Plan calls its API at `<Base URL>/api/v3`.
