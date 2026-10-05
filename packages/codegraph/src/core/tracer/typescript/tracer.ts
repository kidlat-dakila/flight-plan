import type { CallCandidates, LanguageTracer } from "@/core/tracer/language"
import type { CodeRef } from "@/core/types"
import { refFor, typescriptCallGraph } from "./call-graph"
import { declarationsIn } from "./declarations"
import { parse } from "./estree"
import { traceReach } from "./reach"
import { graphCandidates } from "./repo-graph"
import type { Repo } from "."

const candidatesFor = (repo: Repo, search: CallCandidates): CallCandidates => {
  const graph = repo.graph
  return graph === undefined ? search : async (target) => await Promise.resolve(graphCandidates(graph, target.file))
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

  reach: async (repo, candidates, root) => traceReach(repo, candidatesFor(repo, candidates), root),
}
