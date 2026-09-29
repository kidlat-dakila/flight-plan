/**
 * The TypeScript / JavaScript {@link LanguageTracer}.
 *
 * The one place that binds the grammar-specific halves — declaration extraction
 * and the call graph — to the generic seam the orchestrator drives. Everything
 * it touches lives under `typescript/`; the orchestrator sees only this
 * interface.
 */
import type { CallCandidates, LanguageTracer } from "../language"
import type { CodeRef } from "../../types"
import { refFor, typescriptCallGraph } from "./callGraph"
import { declarationsIn } from "./declarations"
import type { Repo } from "."
import { parse } from "./estree"
import { traceReach } from "./reach"
import { graphCandidates } from "./repoGraph"

/** The candidate callers: from the import graph when the repo has one, else the given search. */
const candidatesFor = (repo: Repo, search: CallCandidates): CallCandidates => {
  const graph = repo.graph
  return graph === undefined ? search : async (target) => graphCandidates(graph, target.file)
}

const readAndParse = async (repo: Repo, file: string): Promise<ReturnType<typeof parse>> => {
  const source = await repo.read(file)
  return source === null ? null : parse(file, source)
}

export const typescriptTracer: LanguageTracer<Repo> = {
  extensions: [".ts", ".mts", ".cts", ".tsx", ".jsx", ".js", ".mjs", ".cjs"],

  declarationsOf: async (repo: Repo, file: string): Promise<CodeRef[]> => {
    const parsed = repo.parsed === undefined ? await readAndParse(repo, file) : await repo.parsed.parsedOf(file, repo.read)
    return parsed === null ? [] : declarationsIn(parsed).map((local) => refFor(file, local))
  },

  callGraph: (repo, candidates) => typescriptCallGraph(repo, candidatesFor(repo, candidates)),

  reach: (repo, candidates, root) => traceReach(repo, candidatesFor(repo, candidates), root),
}
