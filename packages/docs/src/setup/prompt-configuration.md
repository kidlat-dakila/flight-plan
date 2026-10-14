---
title: Prompt configuration
description: Choose the prompt configuration a new review starts with.
---

A prompt configuration is the set of instructions the agent follows when it writes a review: the tone it writes in, how it words each part, and which sections it includes. The structure of a review stays the same whichever you pick.

In this step you choose the default. Flight Plan ships four presets:

| Preset | Best for |
|---|---|
| **Standard** | General pull requests. The agent writes the full review for a reviewer who knows the codebase. This is the default. |
| **Minimal** | Saving tokens. The agent writes in fragments, with few words and no filler. Journey Flow Diagrams, the Blast Diagram and the findings are off at first, and you can generate each of them when you need it. |
| **Onboardee** | Engineers who are new to the company and the codebase. The agent adds more about how the codebase works, and hovering a name in the code shows what it is, what it does and where the codebase uses it. |
| **Unfamiliar territory** | A pull request in a language or framework you don't know well. The agent adds more about how the technology works, and hovering a name shows what it is, for the repository's code, the libraries it imports and the language itself. |

You can pick another prompt configuration each time you start a review. Later, under **Settings → Prompt configurations**, you can make your own and change the default. See [Preset profiles and customizing](/docs/presets/).
