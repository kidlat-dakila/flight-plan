import { buildExecutionSteps } from "./build-execution-steps"
import { buildStackTree, ownedChanges } from "./build-stack-tree"
import { parserForPath, type LanguageParser } from "./parsers"
import type { CallCandidates, LanguageTracer, SourceReader } from "./tracer/language"
import type { CodeRef, Diagram, DiagramNode } from "./types"

export interface BuildDiagramTreeFromFileInput<C extends SourceReader> {
  path: string
  changes: [number, number][]
  tracer: LanguageTracer<C>
  repo: C
  candidates: CallCandidates
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
  const { reach: traceReach } = tracer
  const reach
    = values === true && traceReach !== undefined
      ? async (root: CodeRef) => traceReach(repo, candidates, root)
      : undefined
  const diagram = await buildStackTree({ graph, changed, locDiff: changes, reach })

  const source = await repo.read(path)
  const lines = source === null ? [] : source.split("\n")
  return Promise.all(
    diagram.map(async (root) => ({
      ...root,
      executionSteps: await executionStepsFor(root, lines, ownedChanges(root.code, changes, changed), parser),
    })),
  )
}

async function executionStepsFor(
  root: DiagramNode,
  lines: readonly string[],
  changes: readonly [number, number][],
  parser: LanguageParser,
) {
  const from = root.code.enclosingRange.start.line
  const to = root.code.enclosingRange.end.line
  const body = lines.slice(from - 1, to).join("\n")

  const offset = from - 1
  const length = to - from + 1
  const locDiff = changes
    .map(([a, b]): [number, number] => [Math.max(1, a - offset), Math.min(length, b - offset)])
    .filter(([a, b]) => a <= b)

  return buildExecutionSteps({ body, locDiff, parser })
}
