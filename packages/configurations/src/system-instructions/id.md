The segment's id: a short unique string of eight characters, the same for as
long as the artifact lives. Flight Plan makes it when it builds the segment, and
no tool changes it.

`read` and `nodes` return it as `segmentId` with every segment, changed file and
item. Pass it as `segmentId` on every `update-nodes` call, so a write lands in
the segment it is meant for. Never write one from memory and never guess one: an
id the artifact does not have is refused.
