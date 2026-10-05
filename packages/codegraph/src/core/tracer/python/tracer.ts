import type { LanguageTracer } from "@/core/tracer/language"
import { withTree } from "@/core/tracer/parse"
import type { CodeRef } from "@/core/types"
import { refFor, pythonCallGraph } from "./call-graph"
import { declarationsIn } from "./declarations"
import { traceReach } from "./reach"
import type { PyRepo } from "."

export const pythonTracer: LanguageTracer<PyRepo> = {
  extensions: [".py", ".pyi"],

  declarationsOf: async (repo: PyRepo, file: string): Promise<CodeRef[]> => {
    const source = await repo.read(file)
    if (source === null) return []
    return withTree(file, source, (tree) => declarationsIn(tree).map((local) => refFor(file, local)), [])
  },

  callGraph: (repo, candidates) => pythonCallGraph(repo, candidates),

  reach: async (repo, candidates, root) => traceReach(repo, candidates, root),
}
