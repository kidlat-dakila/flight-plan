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
- the [Trace Diagram](/docs/review-artifacts/parts/trace-diagram/) from what starts a path down to the changed code,
- the [Blast Diagram](/docs/review-artifacts/parts/blast-diagram/) of the files connected through imports,
- the [Change Overview](/docs/review-artifacts/parts/change-overview/) of the changed blocks of code,
- one [waypoint](/docs/review-artifacts/parts/code-walkthrough/) for each changed block of code,
- the [hover cards](/docs/review-artifacts/parts/context-code-blocks/) that show where each name in the code comes from.

TypeScript, JavaScript, JSX and Vue share one import reader, so a change can follow imports across them. Python has its own, so a Python file and a script file never end up in the same group of imports.

For JavaScript and Python, Flight Plan also knows common libraries for routes, pages, data access and events. That helps it classify the code and label the diagrams. The structure of the review never depends on it.

## Ignored files

Flight Plan leaves out of a review every file your [ignored files](/docs/setup/review-configuration/#advanced-options) match. To start with, they match tests in TypeScript and Python, e2e tests included: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `*.e2e.ts`, `*.e2e-spec.ts`, `test_*.py`, `*_test.py`, `conftest.py`, and anything under `__tests__/`, `e2e/` or `tests/`. Change the list under **Settings → Review configuration**.

## Files in other languages

A changed file in any other language, such as a migration, a schema, a stylesheet, JSON or a README, still appears in the review:

- it gets one waypoint for the whole file in the Code Walkthrough,
- it goes into the segment for shared code, or a segment of its own when there is none,
- it shows in the Change Overview as a **File**,
- it has no Trace Diagram and no place in the Blast Diagram.

A change that touches only types, interfaces, imports or top-level statements has no Trace Diagram either, because nothing that runs has changed.
