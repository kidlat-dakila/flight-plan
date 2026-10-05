import { idOf, keyOf, traceCallers } from "@/core/tracer/caller-tree"
import type { CallCandidates } from "@/core/tracer/language"
import type { CodeRef, DiagramNode, EscapeKind, Range } from "@/core/types"
import { pythonCallGraph, pythonResolver } from "./call-graph"
import { traceValueFlow, type Invocation } from "./value-flow"
import type { PyRepo } from "."

const escapeNode = (reason: EscapeKind, at: Range, file: string): DiagramNode => ({
  id: { file, line: at.start.line },
  code: { file, name: `escapes: ${reason}`, definedAt: at, enclosingRange: at },
  via: "value",
  escape: { reason, at },
  callers: [],
})

const invocationKey = (invocation: Invocation): string => `${keyOf(invocation.code)}:${invocation.via}`

export async function traceReach(
  repo: PyRepo,
  candidates: CallCandidates,
  root: CodeRef,
): Promise<DiagramNode> {
  const resolver = pythonResolver(repo)
  const graph = pythonCallGraph(repo, candidates)
  const flow = await traceValueFlow(resolver, candidates, root)

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

  return { id: idOf(root), code: root, callers: [...invoked, ...flow.escapes.map((esc) => escapeNode(esc.reason, esc.at, esc.file))] }
}
