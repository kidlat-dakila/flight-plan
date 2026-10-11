# packages/codegraph/src/journey-flow-diagram

The Journey Flow Diagram of a segment, drawn from the chains of its group. Read [Journey Flow Diagram](../../../../docs/vocabulary/journey-flow-diagram.md) before changing anything here. The rules of [packages/codegraph/AGENTS.md](../../AGENTS.md) hold here too.

## Rules

- **A journey is drawn from the group in memory.** `generateJourneyFlowDiagram({ group, importGraphGroup, scope })` in `index.ts` takes the `ASTCodeGroupGraph` that `linkCodeGroupGraph` made and returns one `JourneyFlowDiagram` for a segment, or `null` when no chain leads to a change in it. The diagram holds the group, the import graph and every block as the same objects it was handed.
- **A node is a root block.** `walkChains` starts at every top of `diffChains` and follows `nextBlocks`. Each block on the way belongs to the block at the top of its file (`rootBlockOf`), and `listNodes` makes one node per root block, with its `id` and its `type`. A step between two root blocks is an edge (`listEdges`), once per pair.
- **A node holds its blocks in the order they are written.** `toNode` puts the root block first, then the blocks a chain passes through and the blocks with a change inside it. `diffCodeBlocks` are those with a change, and `triggerLabels` those of the types `render-event`, `code-event` and `data-fetch`, each with a `null` label.
- **Components that render each other are nested.** `listComponentParents` finds the edges between two `component` nodes and gives each rendered component the first component that reaches it from a top. A top is a component no other renders, the ones in the highest files of the import graph first, and a loop is opened at its first component. `nestNodes` moves a child into `children` and leaves its edges in place.
- **An entry segment keeps its own paths.** With a `scope`, `reachWithin` keeps the steps that lead to a change in the files of the segment, and below a changed root block of the segment, the steps that lead to a change of the shared segment.
- **`stored.ts` holds the two other forms.** `storeJourneyFlowDiagram` replaces every block with its id and leaves the group out, `linkJourneyFlowDiagram` puts them back from a group, and `flattenJourneyNodes` gives every node at any depth as one entry with its `parentId` and no children. Snapshots read the stored form, and the MCP tools the flat one.
- **`listJourneyPaths` in `paths.ts` gives every path of a diagram as a line**, from a node nothing leads to down to its last node, for comparing two diagrams.
- **`listJourneyNodes` gives every node at any depth.** Everything that reads the nodes of a diagram as a list goes through it.
