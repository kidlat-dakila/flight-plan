/**
 * The whole diagram for one changed file — from the file's own syntax, no SCIP.
 *
 * From a changed file and the lines the diff touched, this:
 *   1. extracts the file's function-like declarations through the language's
 *      {@link LanguageTracer}, as generic {@link Decl}s,
 *   2. climbs the callers of every declaration the diff touched into inverted
 *      trees (`buildStackTree` over the tracer's lazy {@link CallGraph}), and
 *   3. fills the `executionSteps` of each root — the changed function itself —
 *      by slicing its body and walking it (`buildExecutionSteps`).
 *
 * It names no grammar. The `tracer`, repo and candidate search are all
 * **injected**: a git-backed repo (reading objects with no checkout) and the
 * real `git grep` search are a thin adapter added on top, kept out of here so
 * the wiring is testable in memory. The repo is opaque — only its source is
 * read here (via {@link SourceReader}); everything language-specific rides
 * inside it and the tracer.
 */
import { buildExecutionSteps } from "./buildExecutionSteps"
import { buildStackTree, ownedChanges } from "./buildStackTree"
import { parserForPath, type LanguageParser } from "./parsers/index"
import type { CallCandidates, LanguageTracer, SourceReader } from "./tracer/language"
import type { CodeRef, Diagram, DiagramNode } from "./types"

export type BuildDiagramTreeFromFileInput<C extends SourceReader> = {
  /** Repository-relative path of the changed file. */
  path: string
  /** The lines the diff changed in that file, `[from, to]` inclusive, 1-based. */
  changes: [number, number][]
  /** The language tracer — how declarations and the caller graph are found. */
  tracer: LanguageTracer<C>
  /** Where files (and the language's resolution) are read — a git repo in production. */
  repo: C
  /** The candidate search: files that might call a declaration (a `git grep`). */
  candidates: CallCandidates
  /**
   * Follow the change as a *value*, not only as a call — hooks, JSX props,
   * collections, returns, and escape markers. The diagram sets this; the blast
   * radius leaves it off and climbs calls only. Requires the tracer to supply
   * {@link LanguageTracer.reach}; without it this is a no-op and the climb is
   * call-only.
   */
  values?: boolean
}

export async function buildDiagramTreeFromFile<C extends SourceReader>({
  path,
  changes,
  tracer,
  repo,
  candidates,
  values,
}: BuildDiagramTreeFromFileInput<C>): Promise<Diagram> {
  const parser = parserForPath(path)
  if (parser === null) throw new Error(`No diagram parser for ${path}`)

  const changed = await tracer.declarationsOf(repo, path)
  const graph = tracer.callGraph(repo, candidates)
  const reach =
    values === true && tracer.reach !== undefined
      ? (root: CodeRef) => (tracer.reach as NonNullable<typeof tracer.reach>)(repo, candidates, root)
      : undefined
  const diagram = await buildStackTree({ graph, changed, locDiff: changes, reach })

  const source = await repo.read(path)
  const lines = source === null ? [] : source.split("\n")
  for (const root of diagram) {
    // Only the lines this root owns: a change in a local handler is the
    // handler's steps, not a second copy under its component.
    root.executionSteps = await executionStepsFor(root, lines, ownedChanges(root.code, changes, changed), parser)
  }
  return diagram
}

/** Walk a root's body, restricted to the change. */
function executionStepsFor(
  root: DiagramNode,
  lines: readonly string[],
  changes: readonly [number, number][],
  parser: LanguageParser,
) {
  const from = root.code.enclosingRange.start.line
  const to = root.code.enclosingRange.end.line
  const body = lines.slice(from - 1, to).join("\n")

  // Diff lines are file-absolute; the body starts at `from`, so shift them and
  // keep only what lands inside the body.
  const offset = from - 1
  const length = to - from + 1
  const locDiff = changes
    .map(([a, b]): [number, number] => [Math.max(1, a - offset), Math.min(length, b - offset)])
    .filter(([a, b]) => a <= b)

  return buildExecutionSteps({ body, locDiff, parser })
}
