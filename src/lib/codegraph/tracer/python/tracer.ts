/**
 * The Python {@link LanguageTracer}.
 *
 * The one place that binds the grammar-specific halves — declaration extraction
 * and the call graph — to the generic seam the orchestrator drives. Mirrors
 * `tracer/typescript/tracer.ts` structurally; everything it touches lives
 * under `python/`, the orchestrator sees only this interface.
 */
import type { CodeRef } from "../../types"
import type { LanguageTracer } from "../language"
import { refFor, pythonCallGraph } from "./callGraph"
import { declarationsIn } from "./declarations"
import type { PyRepo } from "."
import { withTree } from "../parse"
import { traceReach } from "./reach"

export const pythonTracer: LanguageTracer<PyRepo> = {
  extensions: [".py", ".pyi"],

  declarationsOf: async (repo: PyRepo, file: string): Promise<CodeRef[]> => {
    const source = await repo.read(file)
    if (source === null) return []
    // Read once and freed at once: the tree is not needed after this.
    return withTree(file, source, (tree) => declarationsIn(tree).map((local) => refFor(file, local)), [])
  },

  callGraph: (repo, candidates) => pythonCallGraph(repo, candidates),

  reach: (repo, candidates, root) => traceReach(repo, candidates, root),
}
