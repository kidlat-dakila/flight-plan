The Context Section, the first thing a reviewer reads, before any code: one
string of Markdown. It says what the change is about and why it matters, what
changes from outside the code, and what changed inside it. How it is laid out is
the configuration's to say.

Write it with `update-document { context }`. Writing it replaces the whole
string, and a finished artifact has one that is not empty.

## The Markdown that is shown

| Written | Shown as |
|---|---|
| `## Heading` | a heading inside the section |
| a paragraph | a paragraph |
| `- item` or `1. item` | a list, one level deep |
| `**bold**` | bold text |
| `` `code` `` | inline code |
| `[label](code:path#target)` | a code link |

Nothing else is shown: a fenced code block, a table, an image, a quote and a
list inside a list are dropped or flattened. The section's own heading is
already there, so the string never opens with one.
