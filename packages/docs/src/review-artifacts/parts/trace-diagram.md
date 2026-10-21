---
title: Trace Diagram
description: How execution reaches the changed code, from what starts it.
---

The Trace Diagram shows how execution reaches the change. It reads left to right like a debugging trace: from the code that starts a path, such as a route, a page or an event handler, to the changed code. Each path stops at its last change.

## What it shows

Each node is a card for a function, a component, a hook or another block of code. A card shows:

- the code's name and the last two folders of its file,
- its type, such as **Function**, **Component** or **Hook**, then its classification when that's different, such as **Route • API route**,
- **Added** or **Modified** when the change touched it,
- the label your agent wrote, or until it does, Flight Plan's hint, such as "Adds a component.",
- its parameters,
- rows grouped under **State**, **Hooks**, **Effects**, **Calls**, **Triggers** and **Steps**, or **Properties** and **Methods** for a class. **Calls** takes the name of the kind of call when there is one, such as **Request** or **Storage**.

Components that render each other are drawn inside one another. Above the board, your agent's description tells the diagram in words. Until it's written, Flight Plan's hint names the code the path runs through.

Flight Plan builds the nodes, the edges, the rows, the classifications and the change marks from the code. Your agent writes the description, the label and description of each node, and the labels of its rows. It can't add a node or draw an edge.

A change that touches only types, imports or top-level statements has no Trace Diagram, because nothing that runs has changed.

## Reading it

- **Zoom in**, **Zoom out** and **Full screen** sit at the top right of the board. **Full screen** is also in the Review Navigator, with the key F.
- Click a row to open the node's code in a side panel, focused on that row's lines. Click the node's head to see all its code. The panel shows your agent's description first, and the waypoints of the Code Walkthrough inside the code. A card your agent hasn't explained says **Not explained yet.**, and **Explain this card** (G) asks your agent for that card alone.
- A node's menu can **Show only the paths through this node**, or hide the nodes it leads to.
- **Collapse all** and **Expand all** (Q) fold every card.
- With segments off, each Trace Diagram has a tab of its own.

## On your own Flight Plan

On your own Flight Plan, you can draw the diagram yourself: **Add card** (C) for a code block or for lines you select, drag cards around, draw a line from a row to another card, and edit or delete cards. **Clear diagram** (K) takes every card off, and **Remove diagram** (L) takes the diagram away. Both ask you to confirm first. The three are in the Review Navigator at the foot of the page. **Edit** above the board changes the description, and **Add a diagram** starts one for a segment that has none.
