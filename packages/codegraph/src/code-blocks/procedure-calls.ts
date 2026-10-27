import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CardPart, CodeBlockType } from "./types"

interface ProcedureIndex {
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly topRouters: readonly StoredCodeBlock[]
}

interface ClientCall {
  readonly routers: readonly StoredCodeBlock[]
  readonly procedurePath: readonly string[]
}

type CalledProcedureIdsById = ReadonlyMap<string, readonly string[]>

const TRPC = "tRPC"
const CLIENT_SPECIFIERS: ReadonlySet<string> = new Set(["@trpc/client", "@trpc/react-query"])
const ROUTER_KIND = "router"
const HOLDER: CardPart = "holder"
const PROCEDURE: CardPart = "procedure"
const PROPERTY: CodeBlockType = "property"
const TYPE_DECLARATION: CodeBlockType = "type-declaration"
const CALL: StoredCodeBlockSymbol["use"] = "call"
const NAMING_A_TYPE: StoredCodeBlockSymbol["use"] = "type"
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const CLIENT_METHOD_COUNT = 1
const CALLER_PATH_LENGTH = 1
const CALLING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>([CALL])
const NO_CALLED_PROCEDURES: CalledProcedureIdsById = new Map()

const isTrpcPart = (block: StoredCodeBlock, part: CardPart): boolean => block.card?.library === TRPC && block.card.kind === ROUTER_KIND && block.card.part === part

const isRouter = (block: StoredCodeBlock): boolean => isTrpcPart(block, HOLDER)

const isProcedure = (block: StoredCodeBlock): boolean => isTrpcPart(block, PROCEDURE)

const targetOf = (symbol: StoredCodeBlockSymbol, { blockById }: Pick<ProcedureIndex, "blockById">): StoredCodeBlock | null => {
  const targetId = symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null
  return targetId === null ? null : (blockById.get(targetId) ?? null)
}

const targetsOf = (block: StoredCodeBlock, uses: ReadonlySet<StoredCodeBlockSymbol["use"]>, index: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] =>
  block.outerSymbols.flatMap((symbol) => {
    const target = uses.has(symbol.use) ? targetOf(symbol, index) : null
    return target === null ? [] : [target]
  })

const childrenOf = (block: StoredCodeBlock, { blockById }: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] =>
  block.childrenBlockIds.flatMap((childId) => {
    const child = blockById.get(childId)
    return child === undefined ? [] : [child]
  })

const listNearest = (block: StoredCodeBlock, isWanted: (block: StoredCodeBlock) => boolean, index: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] =>
  childrenOf(block, index).flatMap((child) => {
    if (isWanted(child)) return [child]
    return child.type === PROPERTY ? [] : listNearest(child, isWanted, index)
  })

const isProperty = (block: StoredCodeBlock): boolean => block.type === PROPERTY

const listRoutersNamedBy = (property: StoredCodeBlock, index: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] =>
  targetsOf(property, NAMING_USES, index).filter(isRouter)

const listJoinedRouters = (router: StoredCodeBlock, index: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] =>
  listNearest(router, isProperty, index).flatMap((property) => listRoutersNamedBy(property, index))

const listTopRouters = (blocks: readonly StoredCodeBlock[], index: Pick<ProcedureIndex, "blockById">): StoredCodeBlock[] => {
  const routers = blocks.filter(isRouter)
  const joinedIds = new Set(routers.flatMap((router) => listJoinedRouters(router, index)).map((router) => router.id))
  return routers.filter((router) => !joinedIds.has(router.id))
}

const memberCallsOf = (block: StoredCodeBlock, minPathLength: number): StoredCodeBlockSymbol[] =>
  block.outerSymbols.filter((symbol) => symbol.use === CALL && (symbol.member?.path.length ?? 0) >= minPathLength)

const hookCallsOf = (block: StoredCodeBlock, index: ProcedureIndex): ClientCall[] =>
  memberCallsOf(block, CLIENT_METHOD_COUNT + 1).flatMap((symbol) => {
    const client = targetOf(symbol, index)
    if (symbol.member === undefined || client === null) return []
    return [{ routers: listRoutersOf(client, index), procedurePath: symbol.member.path.slice(0, -CLIENT_METHOD_COUNT) }]
  })

const listRoutersCalledInto = (block: StoredCodeBlock, index: ProcedureIndex, visitedIds: ReadonlySet<string> = new Set()): StoredCodeBlock[] => {
  const named = targetsOf(block, NAMING_USES, index).filter(isRouter)
  const called = targetsOf(block, CALLING_USES, index).filter((target) => !visitedIds.has(target.id) && target.id !== block.id)
  const visited = new Set([...visitedIds, block.id, ...called.map((target) => target.id)])
  return [...named, ...called.flatMap((target) => listRoutersCalledInto(target, index, visited))]
}

const callerCallsOf = (block: StoredCodeBlock, index: ProcedureIndex): ClientCall[] =>
  memberCallsOf(block, CALLER_PATH_LENGTH).flatMap((symbol) => {
    const caller = targetOf(symbol, index)
    const routers = caller === null ? [] : listRoutersCalledInto(caller, index)
    return symbol.member === undefined || routers.length === 0 ? [] : [{ routers, procedurePath: symbol.member.path }]
  })

const clientCallsOf = (block: StoredCodeBlock, index: ProcedureIndex): ClientCall[] =>
  CLIENT_SPECIFIERS.has(block.catalogue?.specifier ?? "") ? hookCallsOf(block, index) : callerCallsOf(block, index)

const listRoutersNamedByType = (named: StoredCodeBlock, index: ProcedureIndex): StoredCodeBlock[] => {
  if (isRouter(named)) return [named]
  return named.type === TYPE_DECLARATION ? targetsOf(named, NAMING_USES, index).filter(isRouter) : []
}

const listRoutersOf = (client: StoredCodeBlock, index: ProcedureIndex): readonly StoredCodeBlock[] => {
  const typed = targetsOf(client, new Set([NAMING_A_TYPE]), index).flatMap((named) => listRoutersNamedByType(named, index))
  return typed.length > 0 ? typed : index.topRouters
}

const listProceduresAt = (scope: StoredCodeBlock, path: readonly string[], index: ProcedureIndex): StoredCodeBlock[] => {
  const [key, ...rest] = path
  return listNearest(scope, isProperty, index)
    .filter((property) => property.name === key)
    .flatMap((property) =>
      rest.length === 0
        ? listNearest(property, isProcedure, index)
        : [property, ...listRoutersNamedBy(property, index)].flatMap((next) => listProceduresAt(next, rest, index)))
}

const listCalledProcedureIdsOf = (calls: readonly ClientCall[], index: ProcedureIndex): string[] => [
  ...new Set(calls.flatMap((call) => call.routers.flatMap((router) => listProceduresAt(router, call.procedurePath, index))).map((procedure) => procedure.id)),
]

export const listRouterIds = (codeBlocks: readonly StoredCodeBlock[]): ReadonlySet<string> => new Set(codeBlocks.filter(isRouter).map((router) => router.id))

export const listCalledProcedureIds = (codeBlocks: readonly StoredCodeBlock[]): CalledProcedureIdsById => {
  if (!codeBlocks.some(isRouter)) return NO_CALLED_PROCEDURES
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const index: ProcedureIndex = { blockById, topRouters: listTopRouters(codeBlocks, { blockById }) }
  return new Map(
    codeBlocks.flatMap((block) => {
      const procedureIds = listCalledProcedureIdsOf(clientCallsOf(block, index), index)
      return procedureIds.length === 0 ? [] : [[block.id, procedureIds] as const]
    }),
  )
}
