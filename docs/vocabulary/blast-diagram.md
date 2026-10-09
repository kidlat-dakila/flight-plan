# Blast Diagram

## Definition

The Blast Diagram shows the files a change is connected to, and what the change does to the ones it did not touch. Where the [Journey Flow Diagram](journey-flow-diagram.md) follows the paths that lead to a change and stops there, the Blast Diagram shows what lies around the change. It answers the reviewer's second question: did the author forget something?

Its files and imports are the import graph of the segment, drawn as it is. See [codegraph](codegraph.md) for how the import graph is traced.

## Nodes

A node is one file of the segment's import graph. A declaration is never a node.

| File | What it stands for |
|---|---|
| **Added file** | A file the diff added |
| **Modified file** | A file the diff modified |
| **Deleted file** | A file the diff deleted |
| **Reached file** | A file the diff did not touch that imports a changed file, directly or through other files. The change can affect it. |
| **Unreached file** | A file the diff did not touch that the change cannot affect: one the changed code imports, or one behind a file the change stops at. |

A file is drawn larger the more files of the segment it is connected to. Its label is its file name, with as many folders in front as it takes to tell it from the other files. A folder's entry file, such as `index.ts`, always carries its folder.

## Edges

An edge is one import, drawn as an arrow from the file that imports to the file that is imported. Only imports between two files of the segment are drawn.

## What a reached file says

A reached file states an **impact type**, and an **impact reason** when the change breaks it or changes what it does. A file of the change states neither: it is the change.

| Impact type | Meaning |
|---|---|
| `breaks` | The file's logic no longer holds against the changed code, and the compiler does not say so: an assumption about a value, an order or a default, an error that is now thrown or no longer thrown, a case the author did not handle. |
| `behaviour-changes` | The file still works, and now does something different that the change does not mention. |
| `unaffected` | The change reaches the file, and nothing it does is different. |

A type error is never the reason for an impact type, because a type checker reports it.

The **impact reason** is one or two sentences a reviewer can check against the code, with a [CodeLink](review-artifact.md#codelink) to the place that carries the change. It says what the author did not account for. Only a file that breaks or changes behaviour has one. An unaffected file has none: the page says the same sentence for every unaffected file.

A reached file nobody has assessed has no impact type, which is different from `unaffected`.

**An `unaffected` file stops the change.** The files that import the change only through it are unreached, and need no assessment.

## What the diagram draws

The diagram draws every file and every import of the segment's import graph. The change is at the centre:

- the files of the change are innermost, and among them a file is closer to the centre the deeper it is in the import graph: in `a.ts → b.ts → c.ts`, `c.ts` is at the centre, `b.ts` around it and `a.ts` around that;
- a file the diff did not touch is further out the more imports lie between it and the change.

The reviewer has no control over this.

Only a file of the change, a file that breaks and a file whose behaviour changes carry a mark of their own. An unaffected file, an unassessed file and an unreached file are drawn alike, as plain files, and the counts above the diagram say how many are unaffected and how many are not assessed.

Selecting a file shows which of these it is, with its impact reason or one fixed sentence for an unaffected, an unassessed or an unreached file, then the files of the segment that import it and the files of the segment it imports. A file that has a File Section in the Code Walkthrough links to it.

## Who writes what

| Part | Written by |
|---|---|
| Which files exist and how they connect | The codegraph, from the import graph |
| Which files are added, modified or deleted | The diff |
| Which files are reached | Derived from the imports and the impact types |
| Impact types and impact reasons | The agent |

A segment whose import graph is empty has no Blast Diagram.
