The context code blocks: the code a reader opens by hovering a name in a code
view. Flight Plan builds the list from the change, and you never add to it or
take from it. One item per code block:

| Field | Holds |
|---|---|
| `id` | The id of the code block. A write names the item by it. |
| `isRequired` | Whether the configuration of this review asks for a description of this block. |
| `description` | What you write. `null` until it is written. |

## Which blocks are listed

For every file the review shows code of:

- every code block at the top level of the file that declares something: a
  function, a component, a type, a variable;
- every code block of another file that a block of the file uses, which for a
  component includes every component of another file it renders.

A library is not listed, and neither is anything of the language itself. An
import statement is not listed.

## What you write

Only `description`, and only on an item whose `isRequired` is `true`. An item
whose `isRequired` is `false` is left as it is.

`nodes { unfilled: true, needs: ["context-description"] }` hands the items out
with their code, the kind of block and the code that uses each. Write them with
`update-nodes { segmentId, contextCodeBlocks: [{ id, description }] }`. The list
belongs to the whole artifact, so any `segmentId` of the artifact carries the
write.

One block has one description, and the page shows it wherever the block's name
is hovered, above the code of the block.
