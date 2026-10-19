# Review preferences

## Definition

The review preferences say how the user wants a review laid out and which parts the agent writes up. There is one set for every repository. Until the user saves them, Flight Plan reads the defaults below.

```ts
interface ReviewPreferences {
  spotlight: CodeBlockClassification[]
  sectionWriteUps: Record<"context" | "traceDiagram" | "blastDiagram" | "walkthrough" | "findings", "always" | "on-demand">
  isSegmented: boolean
  walkthroughOrder: "imports-bottom-up" | "imports-top-down" | "important-first"
  sectionOrder: ("context" | "traceDiagram" | "blastDiagram" | "walkthrough")[]
  ignoredPaths: string[]
}
```

| Field | What it holds | Default |
|---|---|---|
| `spotlight` | The [classifications](codegraph/classifications.md) of the changes that matter most to the user, in the order of the hierarchy, each once | None |
| `sectionWriteUps` | For each section, whether the agent always writes its write-up when it writes a review, or only when the reviewer asks | Context, Trace Diagram and Findings always; Blast Diagram and Code Walkthrough on demand |
| `isSegmented` | Whether a review is split into [segments](review-artifact.md#segments) | Yes |
| `walkthroughOrder` | How the files of a [Code Walkthrough](code-walkthrough.md) are ordered: by the [import graph](codegraph/import-graph.md) from the file others import up to the files that import it, the other way round, or the spotlight and the core changes first | From the bottom of the import graph up |
| `sectionOrder` | The order of the four sections of a segment, each once | Context, Trace Diagram, Blast Diagram, Code Walkthrough |
| `ignoredPaths` | Path patterns, in the `.gitignore` style and from the root of the repository, of the files a review leaves out | The tests of TypeScript and Python, e2e tests included |

The default `ignoredPaths` are `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `**/__tests__/**`, `**/e2e/**`, `**/*.e2e.ts`, `**/*.e2e-spec.ts`, `**/test_*.py`, `**/*_test.py`, `**/tests/**` and `**/conftest.py`.

## Write-up and hint

A **write-up** is everything the agent writes into a review: the summary, the labels, the explanations of each part of the change and the findings. A **hint** is the short text Flight Plan writes on its own, with no model, from a block's classification. A hint is never stored as a write-up.

## Saving

`reviewPreferences.save` saves the whole set. It trims each path pattern and refuses, with the row it is about, a pattern that is empty, starts with `/`, holds a backslash, or is already in the list. It refuses a section order that leaves a section out or places one twice. It stores the spotlight in the order of the hierarchy, each classification once. `reviewPreferences.get` returns the set, whether it was saved, the default [prompt configuration](prompt-configurations.md), and every classification the spotlight can hold with its label and description, from `CODE_BLOCK_CLASSIFICATION_LABELS` in `@flightplan/configurations`.

The default prompt configuration is not part of the set. It stays in its own field of the settings, as the setup page and the settings page already save it.
