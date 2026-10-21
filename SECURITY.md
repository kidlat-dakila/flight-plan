# Security policy

## Supported versions

Security fixes go into the latest release of `@kidlat-dakila/flightplan` on npm. Update with
`npm install -g @kidlat-dakila/flightplan@latest`, or run `npx @kidlat-dakila/flightplan@latest`.

## Reporting a vulnerability

Report a vulnerability privately through GitHub's private vulnerability reporting, at
[Report a vulnerability](https://github.com/kidlat-dakila/flight-plan/security/advisories/new). It is also under the
repository's Security tab. Please don't open a public issue or pull request for it.

Include what you can of the following.

- The version of Flight Plan, from `flightplan --version`, and your operating system and Node.js version.
- What an attacker can do, and what they need first, such as a crafted repository, a pull request or access to the
  local port.
- The steps or a small repository that reproduces it.

Once the issue is confirmed, the fix goes into a new release, and the advisory is published with credit to you, unless
you would rather stay anonymous.

## Scope

Flight Plan runs on your machine. It serves its web app, API and MCP endpoint from a local server, reads your git
checkouts, and calls GitHub, GitLab or Bitbucket through their CLIs or tokens. Reports about any of these are in scope,
as are reports about the published npm package and the GitHub Actions workflows that build it.
