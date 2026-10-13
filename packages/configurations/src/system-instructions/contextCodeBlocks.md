The context code blocks: what a reader opens by hovering a name in a code view.
Flight Plan builds the list from the change, and you never add to it or take
from it. One item per code block or per name:

| Field | Holds |
|---|---|
| `id` | What a write names the item by. |
| `kind` | `codebase`, `library` or `language`. |
| `name` | The name of the code. |
| `library` | For a `library` item, the library the name is imported from. |
| `isRequired` | Whether the configuration of this review asks for a description of items of this kind. |
| `description` | What you write. `null` until it is written. |

## Which items are listed

**`codebase`**, for every file the review shows code of:

- every code block at the top level of the file that declares something: a
  function, a component, a type, a variable;
- every code block of another file that a block of the file uses, which for a
  component includes every component of another file it renders.

Its `id` is the id of the code block.

**`library`**: every name the shown code uses that is imported from a library.
A name is listed once, however many files import it. Its `id` is
`library:<library>#<name>`, such as `library:react#useState`.

**`language`**: every name the shown code uses that its file neither imports
nor declares. Flight Plan assumes such a name belongs to the language or to
where the code runs. A name is listed once. Its `id` is `language:<name>`, such
as `language:Promise`. It has no code.

An import statement is not an item of its own.

## What you write

Only `description`, and only on an item whose `isRequired` is `true`. A
configuration requires each kind or not, so `isRequired` can be `true` on the
`codebase` items and `false` on the others. An item whose `isRequired` is
`false` is left as it is.

`nodes { unfilled: true, needs: ["context-description"] }` hands the items out:
a `codebase` item with its code, the kind of block and the code that uses it, a
`library` item with the import statement of one file, and a `language` item
with its name alone. Write them with
`update-nodes { segmentId, contextCodeBlocks: [{ id, description }] }`. The list
belongs to the whole artifact, so any `segmentId` of the artifact carries the
write.

One item has one description, and the page shows it wherever the name is
hovered, above the code where there is code.
