---
title: GitLab
description: Connect GitLab or self-managed GitLab through the GitLab CLI or a token.
---

Flight Plan reaches GitLab in two ways. Both have every feature: listing merge requests, filters, reviewers, comments, threads and submitted reviews.

## GitLab CLI

The **GitLab CLI** option uses `glab` and its own sign-in. Flight Plan calls the GitLab API through `glab api`, so it never sees a token.

1. Install the [GitLab CLI](https://gitlab.com/gitlab-org/cli).
2. Run `glab auth login` in a terminal. Sign in to each self-managed instance you use as well.
3. Reload the Git integration step. The row shows **Signed in as** and your account.

The GitLab CLI serves any host other than `github.com` and `bitbucket.org`, and reaches the host of each repository's remote. It suits a self-managed instance with no Base URL to type.

## GitLab token

The **GitLab token** option reaches gitlab.com or a self-managed instance with a token.

- **Token.** A personal access token that can read the repositories you review and their merge requests, and write comments and reviews on them. Flight Plan keeps it in your system keychain.
- **Base URL.** Leave it empty for gitlab.com. For a self-managed instance, enter its address, such as `https://gitlab.example.com`. Flight Plan calls its API at `<Base URL>/api/v4`.
