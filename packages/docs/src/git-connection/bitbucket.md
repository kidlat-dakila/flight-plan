---
title: Bitbucket
description: Connect Bitbucket Cloud or a Bitbucket Data Center instance with a username and a token.
---

The **Bitbucket** option reaches Bitbucket Cloud or a Bitbucket Data Center instance. The Base URL decides which one it is. It asks for:

- **Username.**
- **Token.** Flight Plan keeps it in your system keychain.
- **Base URL.** Leave it empty for Bitbucket Cloud. Enter your instance's address for Data Center.

Bitbucket has every feature except filtering pull requests by label or by review state, and requesting a review again from someone who already reviewed.

## Bitbucket Cloud

Leave the Base URL empty, or enter an address on `bitbucket.org`. Enter your Bitbucket username and a token that can read the repositories you review and their pull requests, and write comments and reviews on them. Flight Plan sends the username and the token together on each request.

Flight Plan follows team members by their Bitbucket nickname. An account with no nickname can't be tracked.

## Bitbucket Data Center

Enter your instance's address as the Base URL, such as `https://bitbucket.example.com`, and an HTTP access token. Flight Plan sends every request under `/rest`, because Data Center refuses HTTP access tokens on other paths.
