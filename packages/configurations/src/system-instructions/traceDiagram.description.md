The caption of the Journey Flow Diagram, shown above its board: one short paragraph that says what the
diagram shows before the reviewer follows its lines. Five sentences at most. Required on every segment that has a diagram,
`null` on arrival, and `complete` refuses an artifact where one is missing.

Written with `update-nodes { segmentId, journeyDescription }`. Writing it
replaces the one that was there. A segment with `journey: null` has none, and
a write to it is refused.

`nodes { unfilled: true, needs: ["journey-description"] }` hands it out with
the diagram's nodes and edges. Write it after the labels of the nodes, so it
uses the same words as they do.

It is one paragraph of plain sentences. Inline code and a code link are shown.
A heading, a list and a table are not.
