import type { CodeId, CodeRef, DiagramNode, Range } from "@/core/types"

export const idOf = (ref: CodeRef): CodeId => ({ file: ref.file, line: ref.definedAt.start.line })

export const keyOf = (ref: CodeRef): string => `${ref.file}:${String(ref.definedAt.start.line)}`

export interface Caller {
  code: CodeRef
  calledAt: Range
}

export interface CallGraph {
  callersOf: (ref: CodeRef) => Promise<Caller[]>
}

const nodeFor = (code: CodeRef, calledAt: Range | undefined): DiagramNode => ({
  id: idOf(code),
  code,
  ...(calledAt ? { calledAt } : {}),
  callers: [],
})

export async function traceCallers(graph: CallGraph, root: CodeRef): Promise<DiagramNode> {
  const climb = async (
    code: CodeRef,
    calledAt: Range | undefined,
    seen: ReadonlySet<string>,
  ): Promise<DiagramNode> => {
    const node = nodeFor(code, calledAt)
    const key = keyOf(code)
    if (seen.has(key)) return node
    const next = new Set(seen).add(key)
    const callers = await graph.callersOf(code)
    return { ...node, callers: await Promise.all(callers.map(async (caller) => climb(caller.code, caller.calledAt, next))) }
  }
  return climb(root, undefined, new Set())
}
