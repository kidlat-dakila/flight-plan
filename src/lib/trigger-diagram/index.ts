/**
 * trigger-diagram: turns the `src/lib/codegraph` reach model into the diagram board
 * the renderer draws. The thin consumer, `src/lib`-only — no `src/api/mcp` reach code.
 */
export { buildDiagramBoard, sourcesForBoard } from "./buildDiagramBoard"
export type { DiagramBoardInput, BoardNodeInput, NodeSource } from "./buildDiagramBoard"
