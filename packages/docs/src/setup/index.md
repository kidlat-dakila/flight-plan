---
title: Setup
description: The four steps Flight Plan asks for on its first run, and where to change them later.
sidebar:
  label: Overview
---

The first time you open Flight Plan, every page takes you to setup. It has four steps, and each one is saved as you go, so you can stop and pick up where you left off.

1. [Repositories](/docs/setup/repositories/): the repositories you review, and the team members you follow in each one.
2. [Git integration](/docs/setup/git-integration/): how Flight Plan reaches your pull requests. Local git is the default, and you can skip this step.
3. [Agent integration](/docs/setup/agent-integration/): the coding agent that explains your reviews.
4. [Review configuration](/docs/setup/review-configuration/): what matters to you in a review, what your agent writes by default, and how Flight Plan puts a review together.

The rail on the left lists the steps, and a saved step shows what you saved in it. A step opens only after every step before it is saved, and the name of a saved step takes you back to it. **Back** returns to the previous step, and **Save and continue** saves the step you are on. The last step ends with **Finish setup**.

## Changing it later

The ⚙ menu in the header switches between dark and light mode, and links to each page of **Settings**.

| Settings page | What it holds |
|---|---|
| **Agent integration** | Your agents. Saving installs Flight Plan into each agent again. |
| **Git integration** | Your connections to GitHub, GitLab and Bitbucket. |
| **Prompt configurations** | The presets, your own configurations, and which one is the default. See [Prompt configurations](/docs/presets/). |
| **Repositories** | The repositories you follow and the team members you track in each one. Each change is saved as you make it. |
| **Review configuration** | Your spotlight, what your agent writes by default, the default prompt configuration, the Code Walkthrough order and the advanced options. |

Agent integration, Git integration and Review configuration hold the same forms as setup, with a **Save** button.
