# Vocabulary

The shared language of Flight Plan. When code, docs, issues or conversations use one of these terms, they mean what the entry says.

| Term | In one line |
|---|---|
| [Flight Plan Review](flight-plan-review.md) | Reading a pull request as a guided tour that Flight Plan builds from the code, with prose a coding agent writes, read in the web app |
| [Review artifact](review-artifact.md) | The document a review produces, its Context Section and Segments, and the components used throughout it: CodeLink, CodeBlock and Navigation |
| [Trace Diagram](trace-diagram.md) | How execution reaches a change: the nodes on the way to the changed code, the nodes inside a node, the trigger labels and the edges. Each kind of card, [component](trace-diagram/component-card.md), [function](trace-diagram/function-card.md), [class](trace-diagram/class-card.md), [route](trace-diagram/route-card.md), [tRPC router](trace-diagram/libraries/trpc.md) and [state](trace-diagram/state.md), has a page of its own |
| [Blast Diagram](blast-diagram.md) | The files a change is connected to through imports, and what it does to the ones it did not touch |
| [Code Walkthrough](code-walkthrough.md) | The changed code with explanations on top of it: File Section, Diff Waypoint, Findings and Filters |
| [Review Navigator](review-navigator.md) | The keyboard-first toolbar at the foot of a review: going between sections, the controls of the section on screen, stepping, marking and filtering the Code Walkthrough |
| [Codegraph](codegraph.md) | How Flight Plan derives who calls what from the code, the structure both diagrams are built from. Its mechanisms, the [import graph](codegraph/import-graph.md) and the [AST graph](codegraph/ast-graph.md), and its languages, [TypeScript](codegraph/languages/typescript.md), [JavaScript and JSX](codegraph/languages/jsx.md), [Python](codegraph/languages/python.md) and [Vue](codegraph/languages/vue.md), have pages of their own, and so have the [code blocks](codegraph/code-blocks.md) it is built on |
| [Forge](forge.md) | The service that hosts a repository's pull requests, and the adapters Flight Plan reaches it through |
| [Branch status](branch-status.md) | Where a review target stands in its review: no review, awaiting review, awaiting reply, stale, draft, closed or merged |
| [Review preferences](review-preferences.md) | How the user wants a review laid out: the spotlight, which sections the agent writes up, segments, the walkthrough order, the section order and the ignored paths. Also what a write-up and a hint are |
| [Prompt configurations](prompt-configurations.md) | How the agent writes: system instructions, preset configurations and custom configurations |
| [Agent conversation](agent-conversation.md) | How an agent and the reviewer talk about a review target: messages, question batches, and the agent sessions Flight Plan starts |
| [Data storage](data-storage.md) | Where Flight Plan keeps its data, and the file format of a stored document |
