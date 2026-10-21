---
title: Change Overview
description: Every changed block of code in a segment, sorted by the kind of code it is.
---

The Change Overview sits at the end of the Context. It shows every block of code the segment adds, modifies or deletes, so you can spot the new server action, the schema change or the validation rule before you open a file. Flight Plan builds it from the code, with no agent.

## What it shows

Each row is one classification, such as Page, Component, Server action, Schema / data model or Validation, in the same order as the topics of the [spotlight](/docs/setup/review-configuration/#spotlight). Each card in a row is one changed block of code, with its name, its type and its path. It's tinted by what the change did to it and marked **Added**, **Modified** or **Deleted**.

Imports never get a card. A segment that changes no code says **No code changed.**

## Reading it

Hover a card, or focus it with the keyboard, to preview the block's code. Click a card to open its waypoint in the [Code Walkthrough](/docs/review-artifacts/parts/code-walkthrough/). A block with no waypoint has a card you can't click.
