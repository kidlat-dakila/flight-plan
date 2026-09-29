/**
 * trigger-blast: turns the `src/lib/codegraph` reach model into the blast-radius
 * board the renderer draws. The thin consumer, `src/lib`-only — no `src/api/mcp` reach
 * code.
 */
export { buildBlastBoard, emptyBlastBoard } from "./buildBlastBoard"
export type {
  BlastBoardInput,
  BlastEdgeInput,
  BlastNodeInput,
  ChangedRange,
} from "./buildBlastBoard"
