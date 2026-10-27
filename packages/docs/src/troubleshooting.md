---
title: Troubleshooting
description: What Flight Plan logs when something goes wrong, and how your agent helps you fix it.
---

When something goes wrong in Flight Plan, you don't have to work out what happened on your own. Flight Plan logs the error, and your agent reads it, looks it up in these docs and tells you how to fix it.

## Troubleshoot an error

Every error Flight Plan shows you comes with a **Troubleshoot** button: on a page that couldn't load, under a form that couldn't save, and in the message at the bottom of a review.

Press it, and Flight Plan shows you the error and asks what you were doing when it happened. You can leave that empty. Press **Launch Claude**, and Flight Plan opens a new tab in your [terminal app](/docs/setup/agent-integration/#terminal-app) and starts Claude with this command:

```text
/flightplan:troubleshoot <log id>
```

Claude reads the error and the docs for the version of Flight Plan you run. Then it tells you what went wrong and gives you the steps to fix it.

## Ask for help without an error

Something can look wrong without any error, like a diagram that stays empty or a review that never finishes. Press the **Troubleshoot** button in the top bar, which is on every page. Say what went wrong, and launch Claude the same way. Claude starts from what you wrote and the page you were on, and it checks the latest errors Flight Plan logged.

## Before you start

Troubleshooting runs in Claude, so Claude has to be one of your agents. You add it in Settings, under [Agents](/docs/setup/agent-integration/).

Flight Plan opens your terminal app on macOS. On other systems it shows you the command instead. Copy it and run it in a terminal.

## What Flight Plan logs

Flight Plan logs anything that goes wrong, including problems it recovers from on its own. For example:

- a forge or git call that fails, such as an expired sign-in or a branch that is gone
- an agent that can't be installed or started
- a review that can't be built
- a setting that can't be saved
- an error in the page itself

Each error is a JSON file in `~/.flightplan/logs/`, named by its log id. Before an error is saved, Flight Plan takes these out of it:

- tokens, keys and passwords, also the ones inside web addresses
- email addresses
- your user name
- your home folder, which shows as `~`

The logs stay on your computer. Flight Plan keeps 30 days of them, 500 files at most, and removes older ones when it starts. When the same error happens again in the same place within 10 minutes, it is logged once.

## Report a bug

When Claude finds that the cause is a bug in Flight Plan, it tells you, and it searches the open issues for the same problem. If someone already reported it, Claude gives you the link. If not, it passes on a short message from Darwin, who built Flight Plan, and asks whether you want to report it.

If you say yes, Claude writes the issue: a summary, your Flight Plan version, system and agent, what happened, the cause, a proposed fix and the error. None of your data goes in it, so it holds no code, no file names or paths from your repositories, no repository, branch or pull request names, no review text and nothing about you. Claude shows you the whole text first.

Once you approve it, Claude opens GitHub's new issue page with the issue filled in, and you post it from your own GitHub account. Flight Plan never posts anything for you.
