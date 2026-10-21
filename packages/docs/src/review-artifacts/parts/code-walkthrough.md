---
title: Code Walkthrough
description: The changed code, one file at a time, with an explanation on the lines it is about.
---

The Code Walkthrough is where you read the change itself. It shows the changed code one file at a time, and puts each explanation on the lines it is about.

![Stepping through waypoints with Next waypoint, then filtering the walkthrough to the core changes](../../../media/code-walkthrough-light.webm)

## Files and waypoints

The walkthrough's header states its coverage, such as **All 14 changed files** or **12 of 14 changed files**, so you can see when it leaves files out.

Each file shows its path, how many waypoints it has with the findings and core changes among them, an **Open on** link to the forge, and a **File reviewed** toggle. Then comes its code, with unchanged stretches folded away.

A **waypoint** marks a block of changed code. Flight Plan gives each changed block its own waypoint, and nests the steps inside a block when there are two or more. A waypoint's card shows:

- its marks: its most severe [finding](/docs/review-artifacts/parts/findings/), **Core change**, and **Spotlight** with the topics it matches,
- its title, its lines and its position, such as **3 of 12**,
- your agent's explanation: what the code does now and why it changed.

**Expand** (R) opens the waypoint to read all of it, with its findings.

Until your agent explains a waypoint, its card shows Flight Plan's hint, such as "Changes a hook.", and says the agent hasn't explained it or checked it for issues yet. Its mark beside the code is a grey dashed ring. **Let Claude explain** (G) asks your agent for that waypoint, and **Explain the whole code block** (Ctrl+G) for every waypoint of the block it sits in. See [Explaining a review](/docs/review-artifacts/features/explaining/).

Flight Plan picks the files, the blocks, the lines and the order. Your agent writes the titles, the explanations, the core change notes and the findings.

## Spotlight and Core change

- **Spotlight** marks a waypoint whose code is one of the topics you care about, such as a page or a database read or write. Flight Plan sets it from the [spotlight](/docs/setup/review-configuration/#spotlight) of your review configuration, and draws rays around the waypoint's mark.
- **Core change** marks the few waypoints where the change does its real work, with the reason. Your agent sets it when it explains the waypoint.

## The order of the files

Flight Plan sorts the files in the order of your [review configuration](/docs/setup/review-configuration/#code-walkthrough-order): **Building blocks first** (the default), **Entry points first** or **Most important first**. You can pick another one for one review when you ask your agent to explain it. A Flight Plan its author arranged keeps the author's order. Every changed file is covered whichever you choose.

## Moving through it

- In the [Review Navigator](/docs/review-artifacts/features/review-navigator/), **Next waypoint** (D) and **Previous waypoint** (A) step through the waypoints of a segment, across its files. **Mark as reviewed** (S) marks the waypoint you're on.
- **Filter** (F) shows only the waypoints with what you tick:
  - **Core change**, **Bug**, **Risk**, **Nit** or **Question**,
  - the kinds of code the review changes, each with what the change did to it, such as **Component** with **Added**. The topics of your spotlight come first,
  - **Change type**: **Added**, **Modified** or **Removed**,
  - **Reviewed**, which brings back what you've marked [reviewed](/docs/review-artifacts/features/reviewed-marks/).

  One filter covers the whole review, so a tick narrows the walkthrough of every segment. Changing a tick takes you to the first waypoint it keeps that you haven't reviewed yet. While anything is ticked, a code block with none of the waypoints you asked for folds to its first line, and its chevron opens it again. The filter stays in the page's address, so you can share it.

## On your own Flight Plan

On your own Flight Plan, **Write description** (C) on a waypoint opens its form: its title, its explanation, the **Core change** mark and additional context for your reviewers. A waypoint you haven't described says so. You can also remove a waypoint, or a file from the walkthrough.

**Arrange files** moves a file up or down. Once you arrange the files, the walkthrough keeps your order, for you and for your reviewers, whatever Code Walkthrough order they chose.
