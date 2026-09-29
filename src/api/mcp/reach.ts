import type { ChangedFile } from "../../lib/codegraph/buildDiagramTree"
import { buildMultiLanguageDiagram } from "../../lib/codegraph/buildMultiLanguageDiagram"
import type { Diagram as CodeGraph } from "../../lib/codegraph/types"
import { reviewRepo } from "../../lib/git/reviewRepo"
import type { BlastSeed } from "../../lib/schemas/diagram/blast"
import {
  buildBlastBoard,
  emptyBlastBoard,
  type BlastBoardInput,
} from "../../lib/trigger-blast/index"
import { buildDiagramBoard, type DiagramBoardInput } from "../../lib/trigger-diagram/index"
import type { Report } from "./jobs"
import { errorFields, log } from "../utils/log"
import { parserAborted, treeCache } from "../../lib/codegraph/tracer/parse"
import { countsSince, walkCounts } from "../../lib/codegraph/walkStats"

/**
 * The reach half of a scaffold: the diagram and the blast radius, from
 * `src/lib/codegraph`.
 *
 * This is the production wiring of the code graph. Both boards
 * are read from one codegraph model — `reviewRepo` reads the change from git
 * objects with **no checkout**, `buildDiagramTree` climbs the callers into the
 * inverted reach tree, and the two thin builders turn that one tree into the
 * two boards. Nothing here computes reach itself.
 *
 * Kept apart from `buildScaffold` (which now owns only the walkthrough) for one
 * reason: the diagram and blast come from git objects through `reviewRepo`,
 * while the walkthrough reads files through a reader a test can inject. Splitting them keeps
 * each testable on the substrate it belongs to.
 */

/** A scaffolded diagram board — the authored `type:"code"` board, plus the mark. */
type ScaffoldedDiagramBoard = DiagramBoardInput & { scaffolded: true }

export type ReachResult = {
  /** The diagram board, or one line saying why there is none. */
  diagram: ScaffoldedDiagramBoard | { absent: string }
  /** How far the change reaches. Always a board — a change reaches at least itself. */
  blast: BlastBoardInput
  /** The changed files in reading order — deepest change first. */
  order: string[]
}

export type BuildReachOptions = {
  root: string
  base: string | undefined
  head: string
  title?: string
  report?: Report
  /**
   * The codegraph model and its diff, injected in tests so the reach runs
   * without git. Given together with {@link files}; otherwise `reviewRepo`
   * reads them from the object database.
   */
  graph?: CodeGraph
  changed?: Record<string, readonly { from: number; to: number }[]>
  /** The changed file paths, for the empty boards and reading order. */
  files?: readonly string[]
}

/**
 * The diagram and the blast radius for a change.
 *
 * Throws when there is no base commit, when the walk fails, or when the code
 * parser died during it: boards drawn then would claim a reach nobody traced.
 */
export async function buildReach(options: BuildReachOptions): Promise<ReachResult> {
  const { root, base, head, title, report } = options
  const seed: BlastSeed = { diff: { base: base ?? head, head } }

  // One value-flow climb feeds both boards. Following the change as a *value* —
  // hooks, JSX props, collections, returns, and escape markers — is what both
  // the diagram and the blast radius now want; the diagram flips the tree and
  // the blast reads it inverted, but the reach is the same, so it is walked once.
  let graph: CodeGraph
  let changed: Record<string, readonly { from: number; to: number }[]>
  let files: readonly string[] = options.files ?? Object.keys(options.changed ?? {})

  if (options.graph !== undefined && options.changed !== undefined) {
    graph = options.graph
    changed = options.changed
  } else {
    if (base === undefined) {
      throw new Error("This walkthrough has no base commit, so nothing can say which lines changed.")
    }
    report?.({ step: "reading the change" })
    const review = await reviewRepo({ root, base, head })
    files = review.files.map((file) => file.path)
    changed = rangesByFile(review.files)
    report?.({ step: "walking the call graph", done: 0, total: 0 })
    const meter = walkMeter(review.base.files.size, files.length)
    const trees = treeCache()
    try {
      graph = await buildMultiLanguageDiagram({
        base: {
          ...review.base,
          trees,
          read: (path) => meter.read(path, () => review.base.read(path)),
          readAll: (paths) => meter.readAll(paths, () => review.base.readAll?.(paths) ?? Promise.resolve(new Map())),
        },
        files: review.files,
        candidates: (target) => meter.search(target.name, () => review.candidates(target)),
        values: true,
      })
      meter.stop("done")
    } catch (cause) {
      meter.stop("failed")
      log("error", "reach.failed", { root, files: files.length, ...errorFields(cause) })
      throw cause
    } finally {
      // The graph holds no tree node, so the walk's trees can go now.
      await trees.free()
    }
  }

  // A parser that died mid-walk makes every later file "unreadable", so an
  // empty or thin graph would be a claim about the change that is not true.
  const dead = parserAborted()
  if (dead !== null) {
    log("error", "reach.parserAborted", { root, files: files.length, error: dead })
    throw new Error(
      `The code parser ran out of memory and stopped (${dead}). Reload the VS Code window to restart the Flight Plan server.`,
    )
  }

  if (graph.length === 0) {
    const parsedNothing =
      "The changed files parsed to no traceable declaration, so no execution path could be drawn. Draw the diagram by hand or say why there is none."
    return {
      diagram: { absent: parsedNothing },
      blast: emptyBlastBoard(
        files,
        seed,
        "No reach was traced: the change touched no declaration that runs, or nothing parsed. The files are drawn; nothing here says the change affects nothing.",
      ),
      order: [...files],
    }
  }

  return {
    diagram: { ...buildDiagramBoard(graph, title), scaffolded: true },
    blast: buildBlastBoard(graph, changed, seed, title),
    order: orderFromGraph(graph, files),
  }
}

/** The diff's changed ranges, keyed by file, in the shape the builders take. */
function rangesByFile(
  files: readonly ChangedFile[],
): Record<string, readonly { from: number; to: number }[]> {
  const out: Record<string, { from: number; to: number }[]> = {}
  for (const file of files) {
    out[file.path] = file.changes.map(([from, to]) => ({ from, to }))
  }
  return out
}

/**
 * The changed files in reading order — the order a reader meets them.
 *
 * A depth-first walk of the inverted forest, roots first: the root is the
 * deepest change, so a declaration is reached before the callers that lead to
 * it. Any changed file the graph never reached (nothing callable in it) is
 * appended, so every section still has a place.
 */
function orderFromGraph(graph: CodeGraph, files: readonly string[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  const push = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    order.push(file)
  }
  const walk = (node: CodeGraph[number]): void => {
    push(node.code.file)
    for (const caller of node.callers) walk(caller)
    for (const callee of node.callees ?? []) walk(callee)
  }
  for (const root of graph) walk(root)
  for (const file of files) push(file)
  return order
}

type WalkMeter = {
  read: (path: string, go: () => Promise<string | null>) => Promise<string | null>
  /** A batch read: every file counts as read, in one span of time. */
  readAll: (paths: readonly string[], go: () => Promise<ReadonlyMap<string, string>>) => Promise<ReadonlyMap<string, string>>
  search: (name: string, go: () => Promise<string[]>) => Promise<string[]>
  /** Logs `reach.stats` and stops the progress lines. */
  stop: (outcome: "done" | "failed") => void
}

/** How often a running walk logs `reach.progress`. */
const PROGRESS_MS = 5_000

/**
 * Counts what one walk does, for the server log: `reach.progress` every
 * {@link PROGRESS_MS} while it runs, and `reach.stats` when it ends. Counts,
 * durations and sizes only; no path or name is logged.
 */
function walkMeter(repoFiles: number, changedFiles: number): WalkMeter {
  const began = performance.now()
  const counts = walkCounts()
  const cpu = process.cpuUsage()
  const readFiles = new Set<string>()
  const searchedNames = new Set<string>()
  let reads = 0
  let readMs = 0
  let batchReads = 0
  let batchReadMs = 0
  let readsOpen = 0
  let readsOpenMax = 0
  let searches = 0
  let searchMs = 0
  let searchFiles = 0
  let searchesOpen = 0
  let searchesOpenMax = 0
  let peakRssMb = 0

  const snapshot = (): Record<string, unknown> => {
    const ms = performance.now() - began
    const used = process.cpuUsage(cpu)
    const memory = process.memoryUsage()
    const mb = (bytes: number): number => Math.round(bytes / 1024 / 1024)
    peakRssMb = Math.max(peakRssMb, mb(memory.rss))
    return {
      ms: Math.round(ms),
      repoFiles,
      changedFiles,
      reads,
      readFiles: readFiles.size,
      readMs: Math.round(readMs),
      readsOpenMax,
      batchReads,
      batchReadMs: Math.round(batchReadMs),
      searches,
      searchedNames: searchedNames.size,
      searchMs: Math.round(searchMs),
      searchFiles,
      searchesOpenMax,
      ...countsSince(counts),
      cpuPct: ms > 0 ? Math.round(((used.user + used.system) / 1000 / ms) * 100) : 0,
      rssMb: mb(memory.rss),
      peakRssMb,
      heapMb: mb(memory.heapUsed),
      externalMb: mb(memory.external),
      arrayBuffersMb: mb(memory.arrayBuffers),
    }
  }

  const timer = setInterval(() => log("info", "reach.progress", snapshot()), PROGRESS_MS)
  timer.unref()

  return {
    read: async (path, go) => {
      reads++
      readFiles.add(path)
      readsOpenMax = Math.max(readsOpenMax, ++readsOpen)
      const start = performance.now()
      try {
        return await go()
      } finally {
        readMs += performance.now() - start
        readsOpen--
      }
    },
    readAll: async (paths, go) => {
      batchReads += paths.length
      for (const path of paths) readFiles.add(path)
      const start = performance.now()
      try {
        return await go()
      } finally {
        batchReadMs += performance.now() - start
      }
    },
    search: async (name, go) => {
      searches++
      searchedNames.add(name)
      searchesOpenMax = Math.max(searchesOpenMax, ++searchesOpen)
      const start = performance.now()
      try {
        const found = await go()
        searchFiles += found.length
        return found
      } finally {
        searchMs += performance.now() - start
        searchesOpen--
      }
    },
    stop: (outcome) => {
      clearInterval(timer)
      log("info", "reach.stats", { outcome, ...snapshot() })
    },
  }
}
