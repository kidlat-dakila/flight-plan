---
title: Flight Plan docs
description: What Flight Plan does, and where to read about each part of it.
sidebar:
  label: Overview
---

Flight Plan is an offline-first code review tool that helps you understand and navigate the changes in a pull request, or in a branch with no pull request. It builds a review from the code and shows it in a web app on your machine, next to the code it describes: how the change runs, what it can affect, and where to look.

Flight Plan works out the structure of a review from the code, with no model involved. It parses the syntax trees to find which functions call which, then draws the diagrams and lays out the walkthrough from them. Connect a coding agent and it writes the prose through Flight Plan's MCP tools: why the change exists, the labels, the explanations and the findings. The agent only writes the prose, so it can't leave a caller out or invent one.

## Where to start

1. [Install Flight Plan](/docs/installation/) and run it.
2. Go through the four [setup](/docs/setup/) steps: your agents, your git connections, a default prompt configuration and your repositories.
3. Read [how it works](/docs/how-it-works/) to see what Flight Plan builds from the code and what your agent adds.
4. Open a review and read about [the parts of a review artifact](/docs/review-artifacts/).

## Reference

- [Supported languages](/docs/supported-languages/): the languages Flight Plan can trace calls in.
- [Preset profiles and customizing](/docs/presets/): how the agent writes, and how to change it.
- [Git connection](/docs/git-connection/): local git, GitHub, GitLab and Bitbucket.
