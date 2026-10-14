---
title: Journey Flow Diagram
description: How execution reaches the changed code, from what starts it.
---

The Journey Flow Diagram shows how execution reaches the change. It reads left to right like a debugging trace: from the code that starts a path, such as a route, a page or an event handler, to the changed code. Each path stops at its last change.

![Opening a node of the Journey Flow Diagram and reading its code](../../../media/journey-flow-diagram-light.webm)

## What it shows

Each node is a card for a function, a component, a hook or another block of code. A card shows:

- the code's name and the last two folders of its file,
- its type, such as **Function**, **Component** or **Hook**,
- **Added** or **Modified** when the change touched it,
- a label the agent wrote,
- rows grouped under **Args**, **State**, **Hooks**, **Effects**, **Calls**, **Triggers** and **Steps**.

Components that render each other are drawn inside one another. Above the board, the agent's description tells the diagram in words.

Flight Plan builds the nodes, the edges, the rows and the change marks from the code. The agent writes the description, the label and description of each node, and the labels of its rows. It can't add a node or draw an edge.

A change that touches only types, imports or top-level statements has no Journey Flow Diagram, because nothing that runs has changed.

## Reading it

- **Zoom in**, **Zoom out**, **Reset view** and **Full screen** sit in the corner of the board.
- Click a row to open the node's code in a side panel, focused on that row's lines. Click the node's head to see all its code. The panel shows the agent's description first, and the waypoints of the Code Walkthrough inside the code.
- A node's menu can **Show only the paths through this node**, or hide the nodes it leads to.
- **Collapse all** and **Expand all** fold every card.

## On your own Flight Plan

On your own Flight Plan, you can draw the diagram yourself: **Add a card** for a code block or for lines you select, drag cards around, draw a line from a row to another card, and edit or delete cards. **Edit** above the board changes the description.
