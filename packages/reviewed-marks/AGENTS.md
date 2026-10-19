# packages/reviewed-marks

What a reviewer's reviewed marks make reviewed, worked out once for both sides: the backend, through `packages/codegraph` and `set-reviewed`, and the published copy of a Flight Plan, which has no backend. Read [Code Walkthrough](../../docs/vocabulary/code-walkthrough.md) before changing anything here.

## Rules

- **Calculations over plain data only.** No I/O, no `node:` module, no browser API, no React. Everything here runs in Node and in the browser.
- **The outline arrives with its fingerprints.** A `ReviewableFile` is built by `packages/codegraph` from the artifact (`reviewableFileOf`, `reviewableSegmentFilesOf`), which hashes the content with `node:crypto`. Nothing here hashes.
- **One entry.** `src/index.ts` is the only module another project imports, as `@flightplan/reviewed-marks`. It is consumed as source and has no build step.
- **Shapes of the bands come from `packages/configurations`, as types only.** `reviewed-segment.ts` reads and returns the Code Walkthrough and Trace Diagram bands the backend built, and keeps the caller's own band type.
- **The words both sides draw live in `labels.ts`.** The Reviewed toggle, the step positions, the waypoint mark labels and the message once every file is reviewed, so the published copy and the reviewer's page cannot word them differently.

## Layout

```
src/
  index.ts              the entry
  marks.ts              ReviewedMarks, its schema, parseReviewedMarks
  reviewable-file.ts    the outline of a file: its waypoints and root code blocks, each with a fingerprint
  reviewed-subject.ts   a waypoint, a file or a root code block
  reviewed-state.ts     reviewedStateOf: what the marks make reviewed in a file
  reviewed-change.ts    applyReviewedChange: the marks after one is put on or taken off
  reviewed-segment.ts   reviewSegment, withReviewedWalkthrough, withReviewedTrace
  labels.ts             the words both sides draw
  __tests__/
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p reviewed-marks codegraph backend frontend`
