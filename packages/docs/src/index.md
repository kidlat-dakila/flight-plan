---
title: Flight Plan docs
description: What Flight Plan does, and where to read about each part of it.
sidebar:
  label: Overview
---

Flight Plan is an offline-first code review tool that helps you understand and navigate the changes in a pull request, or in a branch with no pull request. It runs on your machine and shows the review in your browser, next to the code it describes: what changed, how it runs, what it can break and where to look.

Flight Plan builds the whole review from the code, with no model. It parses the changed code into syntax trees, finds which functions call which, and lays out the segments, the diagrams, the Change Overview and the Code Walkthrough from them. You can read a review as soon as it opens.

Your coding agent is the layer that explains it. When you ask, it writes a summary of the change, the labels of the diagrams, an explanation of each part and the findings, through Flight Plan's MCP tools. It writes into the review Flight Plan built and can't change its structure, so it can't leave a file or a caller out.

## Where to start

1. [Install Flight Plan](/docs/installation/) and run it.
2. Go through the four [setup](/docs/setup/) steps: your repositories, your git integration, your agent and your review configuration.
3. Read [how it works](/docs/how-it-works/) to see what Flight Plan builds and what your agent adds.
4. Open a review and read about [the parts of a review artifact](/docs/review-artifacts/).

## Reference

- [Supported languages](/docs/supported-languages/): the languages Flight Plan can trace calls in.
- [Prompt configurations](/docs/presets/): how the agent writes, and how to change it.
- [Git connection](/docs/git-connection/): local git, GitHub, GitLab and Bitbucket.
