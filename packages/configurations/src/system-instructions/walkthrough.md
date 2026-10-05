The Code Walkthrough: an object with an optional `intro` that frames the whole
tour and a `files` array, one File Section per toured file in reading order.

## Reading order

**A tour reads top to bottom, and so does the code it points at.** File Sections
in the order the reviewer asked for; inside a file, waypoints in the order the
file declares their code.

The order of the File Sections is the reviewer's choice, and it reaches you in
the request that started the review. Apply it with
`update-document { order: { files: [...] } }`, naming every File Section exactly
once. Inside one file, `update-nodes { waypoints: [{ id, position }] }` moves a
top-level waypoint among its siblings, and is rarely needed.
