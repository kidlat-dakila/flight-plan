The Context Section, the first thing a reviewer reads, before any code: one
string of Markdown per segment. It says what the segment's change does and what
changed in the segment's files. How it is laid out is the configuration's to
say.

Write it with `update-nodes { segmentId, context }`. Writing it replaces the whole
string of that segment, and a finished artifact has one that is not empty in
every segment.

## The Markdown that is shown

| Written | Shown as |
|---|---|
| `## Heading` or `### Heading` | a heading inside the section |
| a paragraph | a paragraph |
| `- item` or `1. item` | a list, with one level of sub-items |
| `**bold**` | bold text |
| `` `code` `` | inline code |
| `[label](code:path#target)` | a code link |
| `:::accordion`, then `::section <name>` lines, then `:::` | an accordion, collapsed, one section per `::section` line, each holding the lines under it |
| `:::tabs`, then `::tab <name>` lines, then `:::` | tabs, one per `::tab` line, each holding the lines under it |

Nothing else is shown: a fenced code block, a table, an image and a quote are
dropped or flattened. A sub-item holds no list of its own, and neither a section
nor a tab holds an accordion or tabs. The section's own heading is already there, so the string never
opens with one.
