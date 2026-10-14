---
title: Flight Plan docs
description: What Flight Plan does, and where to read about each part of it.
sidebar:
  label: Overview
---

Flight Plan turns a pull request, or a branch with no pull request, into a guided review. Your coding agent writes a review artifact through Flight Plan's MCP tools, and a web app on your machine shows it next to the code it describes. A review answers four questions a diff leaves open: why the change exists, how it runs, what it can affect, and where to look.

Flight Plan works out the structure of a review from the code. It parses the syntax trees to find which functions call which, so the agent can't leave a caller out or invent one. The agent only writes the prose.

## Where to start

1. [Install Flight Plan](/docs/installation/) and run it.
2. Go through the four [setup](/docs/setup/) steps: your agents, your git connections, a default prompt configuration and your repositories.
3. Read [how it works](/docs/how-it-works/) to see what Flight Plan builds and what your agent writes.
4. Open a review and read about [the parts of a review artifact](/docs/review-artifacts/).

## Reference

- [Supported languages](/docs/supported-languages/): the languages Flight Plan can trace calls in.
- [Preset profiles and customizing](/docs/presets/): how the agent writes, and how to change it.
- [Git connection](/docs/git-connection/): local git, GitHub, GitLab and Bitbucket.
