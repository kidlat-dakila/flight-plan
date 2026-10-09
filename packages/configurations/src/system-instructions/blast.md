The Blast Diagram: the files the change is connected to through imports. A
segment's `blast` is an object with `nodes` and `edges`, or `null` when the
segment has no diagram.

It answers a different question from the Journey Flow Diagram. The journey is a
**trace**: one path through the change, in the order the code runs. The blast is
**reach**: every file that imports a changed file, directly or through other
files, and every file a changed file imports.

It exists for one question the reviewer cannot answer from the diff: **did the
author forget something?** A file nobody touched can stop working, or start
doing something else, because of what changed under it.

## The nodes

Each node is one file, named by its `path`. Its `diffType` is `added`,
`modified` or `deleted` for a file of the change, and `null` for a file the
change did not touch. An edge goes from the file that imports (`importer`) to
the file it imports (`imported`).

You write two fields, only on a file the change did not touch:

| Field | What it says |
|---|---|
| `impactType` | What the change does to this file: `breaks`, `behaviour-changes` or `unaffected`. |
| `impactReason` | On `breaks` and `behaviour-changes` only: why, in one or two sentences a reviewer can check against the code. |

Write them with `update-nodes { segmentId, blast: [{ path, impactType, impactReason }] }`,
and an unaffected file with `update-nodes { segmentId, blast: [{ path, impactType: "unaffected" }] }`.
A file of the change takes neither: it is the change.

An unaffected file takes no reason. The page says the same sentence for every
one of them, and draws it like any other file the change did not touch.

## Which files to assess

A file needs an assessment when it imports a changed file, or imports a file
that the change gets through. `nodes { unfilled: true, needs: ["impact"] }`
hands them out, each with the files it imports that carry the change.

Read the file itself. It is not in the diff, so no tool hands you its code.

## Assess the stops, not every file

A change to something widely imported reaches many files, and most are
unaffected for one shared reason: the change stops travelling somewhere. Mark
that file `unaffected` and every file that reaches the change only through it
needs no assessment of its own.

A file the changed code imports, and nothing more, cannot be affected by it and
is never handed out.

## What the compiler already says

Do not report what a type checker reports. A call that no longer type-checks is
not a finding of this diagram. Look for what compiles and is still wrong: an
assumption about a value, an order or a default that no longer holds, an error
that is now thrown or no longer thrown, a case the author did not handle.

## What you never write

Which files exist, their `diffType` and their edges. They come from the code.
