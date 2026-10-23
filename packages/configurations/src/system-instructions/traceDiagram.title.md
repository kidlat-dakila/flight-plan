The title of the Trace Diagram: the name of the flow it shows, in a few words.
When the segment's diagram is the only one on the page it is the heading of the
Trace Diagram section, and when there are several it is the label of the
diagram's tab. Required on every segment that has a diagram, `null` on arrival,
and `complete` refuses an artifact where one is missing.

Written with `update-nodes { segmentId, traceDiagramTitle }`. Writing it
replaces the one that was there. A segment with `trace: null` has none, and
a write to it is refused.

`nodes { unfilled: true, needs: ["trace-title"] }` hands it out with the
diagram's nodes and edges. Write it with the description, after the labels of
the nodes.

It is plain text on one line: no Markdown, no code link.
