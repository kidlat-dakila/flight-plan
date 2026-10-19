---
title: Code Walkthrough
description: The changed code, one file at a time, with an explanation on the lines it is about.
---

The Code Walkthrough is where you read the change itself. It shows the changed code one file at a time, and puts each explanation on the lines it is about.

![Stepping through waypoints with J and K, and filtering them](../../../media/code-walkthrough-light.webm)

## Files and waypoints

The walkthrough's header states its coverage, such as **All 14 changed files** or **12 of 14 changed files**, so you can see when it leaves files out.

Each file has a title the agent wrote, its path, the number of waypoints in it, an **Open on** link to the forge, and a **File reviewed** toggle. Then comes its code, with unchanged stretches folded away.

A **waypoint** is a box over a block of changed code. Flight Plan gives each changed block its own waypoint, and nests the steps inside a block when there are two or more. Open a waypoint to read:

- its title and its position, such as **3 of 12**,
- the agent's reading: what the code does now and why it changed,
- **Core change**, on the few waypoints that carry the change, with the reason,
- the [findings](/docs/review-artifacts/parts/findings/) on that code.

Flight Plan picks the files, the blocks and the lines. The agent writes the titles, the readings, the core change notes and the findings.

## The order of the files

You choose the order when you start a review: **Foundations first** (the default), **Along the path**, **Core change first**, **Risk first**, or **Custom** with your own instruction. Every changed file is covered whichever you choose.

## Moving through it

- **J** goes to the next waypoint and **K** to the previous one, across files and segments. The stepper at the top of the walkthrough does the same.
- **Filter** shows only the core changes, or the waypoints that carry a bug, a risk, a nit or a question. The filter stays in the page's address, so you can share it.
- **Show reviewed** brings back the waypoints and files you've marked [reviewed](/docs/review-artifacts/features/reviewed-marks/).

## On your own Flight Plan

On your own Flight Plan, every file shows its whole code. You can edit a waypoint's title, reading and **Core change** mark, remove a waypoint or a file, and **Arrange files** to change their order.
