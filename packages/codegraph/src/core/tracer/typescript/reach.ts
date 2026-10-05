import { idOf, keyOf, traceCallers, type CallGraph } from "@/core/tracer/caller-tree"
import type { CallCandidates } from "@/core/tracer/language"
import type { CodeRef, DiagramNode, EscapeKind, Range } from "@/core/types"
import { holderOf, typescriptCallGraph, typescriptResolver, type Resolver } from "./call-graph"
import { childrenFinder } from "./children"
import { traceValueFlow, type Invocation } from "./value-flow"
import type { Repo } from "."

const escapeNode = (reason: EscapeKind, at: Range, file: string): DiagramNode => ({
  id: { file, line: at.start.line },
  code: { file, name: `escapes: ${reason}`, definedAt: at, enclosingRange: at },
  via: "value",
  escape: { reason, at },
  callers: [],
})

const invocationKey = (invocation: Invocation): string => `${keyOf(invocation.code)}:${invocation.via}`

async function heldBy(resolver: Resolver, graph: CallGraph, root: CodeRef): Promise<DiagramNode[]> {
  const holder = holderOf(root, await resolver.declarationsOf(root.file))
  if (holder === undefined) return []
  return [{ ...(await traceCallers(graph, holder)), via: "value", calledAt: root.definedAt }]
}

export async function traceReach(
  repo: Repo,
  candidates: CallCandidates,
  root: CodeRef,
): Promise<DiagramNode> {
  const resolver = typescriptResolver(repo)
  const graph = typescriptCallGraph(repo, candidates)
  const flow = await traceValueFlow(resolver, candidates, root)

  const children = await childrenFinder(resolver)(root)
  const invocations = flow.invocations.filter(
    (invocation, index) => flow.invocations.findIndex((one) => invocationKey(one) === invocationKey(invocation)) === index,
  )
  const invoked = await Promise.all(
    invocations.map(async (invocation): Promise<DiagramNode> => ({
      ...(await traceCallers(graph, invocation.code)),
      via: invocation.via,
      calledAt: invocation.calledAt,
    })),
  )
  const reached = [...invoked, ...flow.escapes.map((esc) => escapeNode(esc.reason, esc.at, esc.file))]
  const callers = reached.length > 0 ? reached : await heldBy(resolver, graph, root)

  return { id: idOf(root), code: root, callers, ...(children.length > 0 ? { children } : {}) }
}
