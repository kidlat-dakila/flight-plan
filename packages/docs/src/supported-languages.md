---
title: Supported languages
description: The languages Flight Plan traces, and what happens to files in other languages.
---

Flight Plan parses the changed code into syntax trees with tree-sitter, on your machine, to work out which functions call which. It does this for four languages:

| Language | File extensions |
|---|---|
| TypeScript | `.ts`, `.mts`, `.cts` |
| JavaScript, JSX and TSX | `.js`, `.mjs`, `.cjs`, `.jsx`, `.tsx` |
| Python | `.py`, `.pyi` |
| Vue | `.vue` (its script is read as TypeScript) |

For a file in one of these languages, Flight Plan builds every part of the review:

- the [segments](/docs/review-artifacts/parts/segments/) the change is split into,
- the [Journey Flow Diagram](/docs/review-artifacts/parts/journey-flow-diagram/) from what starts a path down to the changed code,
- the [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/) of the files connected through imports,
- one [waypoint](/docs/review-artifacts/parts/code-walkthrough/) for each changed block of code,
- the names you can hover in the code to read what they are, when the configuration asks for [context code blocks](/docs/review-artifacts/parts/context-code-blocks/).

TypeScript, JavaScript, JSX and Vue share one import reader, so a change can follow imports across them. Python has its own, so a Python file and a script file never end up in the same group of imports.

For JavaScript and Python, Flight Plan also knows common libraries for routes, pages, data access and events. That only gives the diagrams better labels. The structure of the review never depends on it.

## Tests and stories

Flight Plan leaves test and story files out of the review's structure:

- JavaScript and TypeScript: `*.test.*`, `*.spec.*`, `*.stories.*` and anything under `__tests__/`.
- Python: `test_*.py`, `*_test.py` and `conftest.py`.

## Files in other languages

A changed file in any other language, such as a migration, a schema, a stylesheet, JSON or a README, still appears in the review:

- it gets one waypoint for the whole file in the Code Walkthrough,
- it goes into the segment for shared code, or a segment of its own when there is none,
- it has no Journey Flow Diagram and no place in the Blast Diagram.

A change that touches only types, interfaces, imports or top-level statements has no Journey Flow Diagram either, because nothing that runs has changed.
