The Code Walkthrough: an object with a `files` array, one File Section per
toured file in reading order.

## Reading order

**A tour reads top to bottom, and so does the code it points at.** Flight Plan
orders the File Sections itself, as the reviewer chose, so write no order and do
not ask the reviewer for one. Inside a file, waypoints come in the order the
file declares their code.

Inside one file, `update-nodes { segmentId, waypoints: [{ id, position }] }` moves a
top-level waypoint among its siblings, and is rarely needed.
