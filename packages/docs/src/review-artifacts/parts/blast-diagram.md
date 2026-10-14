---
title: Blast Diagram
description: The files connected to the change through imports, and what the change does to the ones it didn't touch.
---

The Blast Diagram shows the files the change is connected to through imports. Use it to check whether the author missed a file the change affects.

![Switching the Blast Diagram's view and opening a file](../../../media/blast-diagram-light.webm)

## Two views

- **Export bound** shows the files that use what the change changed. This is where something can break.
- **Import bound** shows the files the change uses.

The diagram opens on the export bound, or on the import bound when nothing outside the change uses it. Columns run left to right, an arrow points at the file that is imported, and files that connect to more files are drawn larger.

## What the change does to each file

For each file that uses the change without being part of it, the agent says what the change does to it:

| Impact | Meaning |
|---|---|
| **Breaks** | The file's logic no longer holds against the changed code, and the compiler won't catch it. |
| **Behaviour changes** | The file still works, but now does something different that the change doesn't mention. |
| **Unaffected** | The change reaches the file, and nothing it does is different. |

A file that breaks or changes behaviour comes with a reason of one or two sentences and a link to the code. A file the agent didn't judge is **Not assessed**. An unaffected file stops the change, so files that use the change only through it show as **Not reached by the change**.

Flight Plan finds the files and the imports between them from the code, and marks them added, modified or deleted from the diff. The agent writes only the impact and the reason.

## Reading it

Hover a file to highlight the files around it. Click it to open the diagram full screen with a side panel: its impact and reason, how many files import it and how many it imports, and **Read it in the Code Walkthrough** when the change touched it.

## On your own Flight Plan

On your own Flight Plan, **Edit impact** on a file sets its impact and its reason.
