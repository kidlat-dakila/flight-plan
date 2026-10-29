---
title: Trace Diagram
description: How execution reaches the changed code, from what starts it.
---

The Trace Diagram shows how execution reaches the change. It reads left to right like a debugging trace: from the code that starts a path, such as a route, a page or an event handler, to the changed code. Each path stops at its last change.

![Opening a Trace Diagram full screen, clicking a row to read the node's code in the side panel, then opening another node](../../../media/trace-diagram-light.webm)

## What it shows

Each node is a card for a function, a component, a hook or another block of code. A card shows:

- the code's name and the last two folders of its file,
- its type, such as **Function**, **Component** or **Hook**, then its classification when that's different, such as **Route • API route**,
- **Added** or **Modified** when the change touched it,
- the label your agent wrote, or until it does, Flight Plan's hint, such as "Adds a component.",
- rows grouped under **Arguments**, **External calls**, **Triggers** and **Returns and raises** for a function, **Props**, **State**, **External calls**, **Memos**, **Effects**, **Triggers** and **Renders** for a component, and **Properties** and **Methods** for a class. **External calls** holds a small card for each function, hook, class or store of your code it calls, tRPC procedures and RTK Query APIs included, with one row per call and a line from each row to the card it calls. Calls into libraries get no row.

A component's **Renders** has one group per `return`, in code order. Inside a group, a row stands for markup that shows only sometimes, a list, a child component or markup that a function of your code draws. Plain elements and library components get no row. A child component is drawn inside the row that renders it.

Each effect and memo of a component, such as `useEffect`, `watch`, `useMemo` or `computed`, has its own card beside the component. That card lists its dependencies, the variables it reads from outside and its calls, and for an effect the cleanup it returns. Your agent gives the diagram a title that names the flow it shows, such as "Submit order flow diagram". With one Trace Diagram on the page, the title is the section's heading. With several, each title labels its diagram's tab. Above the board, your agent's description tells the diagram in words. Until it's written, Flight Plan's hint names the code the path runs through.

Flight Plan builds the nodes, the edges, the rows, the classifications and the change marks from the code. Your agent writes the title and the description, the label and description of each node, and the labels of its rows. On a function, those are its calls, its returns and its raises. On a component, they are its calls, its memos, its effects and what each `return` renders. It can't add a node or draw an edge.

A change that touches only types, imports or top-level statements has no Trace Diagram, because nothing that runs has changed.

## Reading it

- **Zoom in**, **Zoom out** and **Full screen** sit at the top right of the board. **Full screen** is also in the Review Navigator, with the key F.
- Click a row to open the node's code in a side panel, focused on that row's lines. Click the node's head to see all its code. The panel shows your agent's description first, and the waypoints of the Code Walkthrough inside the code. A card your agent hasn't explained says **Not explained yet.**, and **Explain this card** (G) asks your agent for that card alone.
- A node's menu can **Show only the paths through this node**, or hide the nodes it leads to.
- **Collapse all** and **Expand all** (Q) fold every card.
- With segments off, the code several paths share is drawn in the diagram of each path that reaches it. When the change has several paths, each diagram has a tab of its own.

## On your own Flight Plan

On your own Flight Plan, you can draw the diagram yourself: **Add card** (C) for a code block or for lines you select, drag cards around, drag the right edge of a card to make it wider, draw a line from a row to another card, and edit or delete cards. **Clear diagram** (K) takes every card off, and **Remove diagram** (L) takes the diagram away. Both ask you to confirm first. The three are in the Review Navigator at the foot of the page. **Edit** above the board changes the description, and **Add a diagram** starts one for a segment that has none.
