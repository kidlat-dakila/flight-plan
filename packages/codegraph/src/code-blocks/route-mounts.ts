import { joinPaths } from "@/code-blocks/libraries/route-cards"
import { groupBy } from "@/shared/group-by"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CardKind, CardPart, CodeBlockType } from "./types"

interface RouteIndex {
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly childrenById: ReadonlyMap<string, readonly StoredCodeBlock[]>
}

export interface Mount {
  readonly block: StoredCodeBlock
  readonly routerId: string | null
  readonly prefix: string | null
  readonly targetIds: ReadonlySet<string>
}

const ROUTE: CardKind = "route"
const HOLDER: CardPart = "holder"
const HANDLER: CardPart = "handler"
const MOUNT: CardPart = "mount"
const MIDDLEWARE: CardPart = "middleware"
const PATH_SEPARATOR = "/"
const CALL: StoredCodeBlockSymbol["use"] = "call"
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const PLUGIN_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method"])
const DEEPEST_MOUNT = 16
const FIRST_DEPTH = 0

const targetIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

export const routeIndexOf = (blocks: readonly StoredCodeBlock[]): RouteIndex => ({
  blockById: new Map(blocks.map((block) => [block.id, block] as const)),
  childrenById: groupBy(blocks.filter((block) => block.parentBlockId !== null), (block) => block.parentBlockId ?? ""),
})

const withinOf = (block: StoredCodeBlock, index: RouteIndex): StoredCodeBlock[] =>
  [block, ...(index.childrenById.get(block.id) ?? []).flatMap((child) => withinOf(child, index))]

export const routerIdOf = (block: StoredCodeBlock): string | null =>
  block.outerSymbols
    .filter((symbol) => symbol.use === CALL && (symbol.member?.path.length ?? 0) > 0)
    .map(targetIdOf)
    .find((targetId) => targetId !== null) ?? null

export const isRegistration = (block: StoredCodeBlock): boolean => {
  const card = block.card
  if (card?.kind !== ROUTE) return false
  return card.part === HOLDER || (card.part === HANDLER && block.parentBlockId === null && card.ownerId === null)
}

export const registrationOf = (block: StoredCodeBlock, { blockById }: RouteIndex): StoredCodeBlock | null => {
  if (isRegistration(block)) return block
  const ownerId = block.card?.ownerId ?? block.parentBlockId
  const owner = ownerId === null ? undefined : blockById.get(ownerId)
  return owner !== undefined && isRegistration(owner) ? owner : null
}

const routerIdOfRegistration = (registration: StoredCodeBlock, index: RouteIndex): string | null =>
  routerIdOf(registration)
  ?? (index.childrenById.get(registration.id) ?? [])
    .filter(isRegistration)
    .map((chained) => routerIdOfRegistration(chained, index))
    .find((routerId) => routerId !== null)
    ?? null

const namedTargetIdsOf = (block: StoredCodeBlock): string[] =>
  block.outerSymbols.flatMap((symbol) => {
    const targetId = NAMING_USES.has(symbol.use) ? targetIdOf(symbol) : null
    return targetId === null ? [] : [targetId]
  })

const mountOf = (block: StoredCodeBlock, index: RouteIndex): Mount => {
  const within = withinOf(block, index)
  const plugins = within.filter((inside) => inside.id !== block.id && PLUGIN_TYPES.has(inside.type))
  return {
    block,
    routerId: routerIdOf(block),
    prefix: block.card?.groupKey ?? null,
    targetIds: new Set([...within.flatMap(namedTargetIdsOf), ...plugins.map((plugin) => plugin.id)]),
  }
}

export const listMounts = (blocks: readonly StoredCodeBlock[], index: RouteIndex): Mount[] =>
  blocks.filter((block) => block.card?.kind === ROUTE && block.card.part === MOUNT).map((block) => mountOf(block, index))

export const isMountedAt = (routerId: string, mount: Mount, { blockById }: RouteIndex): boolean => {
  const parentId = blockById.get(routerId)?.parentBlockId ?? null
  return mount.targetIds.has(routerId) || (parentId !== null && mount.targetIds.has(parentId))
}

const prefixAt = (routerId: string, mounts: readonly Mount[], index: RouteIndex, depth: number): string | null => {
  const mount = depth > DEEPEST_MOUNT ? undefined : mounts.find((candidate) => candidate.targetIds.has(routerId))
  if (mount === undefined) return null
  const outer = mount.routerId === null ? null : prefixAt(mount.routerId, mounts, index, depth + 1)
  return joinPaths(outer, mount.prefix)
}

const withPrefix = (block: StoredCodeBlock, prefix: string): StoredCodeBlock => {
  const { card, catalogue } = block
  if (card === undefined) return block
  const path = catalogue?.path ?? null
  return {
    ...block,
    card: { ...card, groupKey: joinPaths(prefix, card.groupKey) },
    catalogue: catalogue === null || path === null ? catalogue : { ...catalogue, path: joinPaths(prefix, path) },
  }
}

const listRouterIds = (blocks: readonly StoredCodeBlock[], index: RouteIndex): ReadonlySet<string> =>
  new Set(blocks.filter(isRegistration).flatMap((registration) => {
    const routerId = routerIdOfRegistration(registration, index)
    const parentId = routerId === null ? null : (index.blockById.get(routerId)?.parentBlockId ?? null)
    return [routerId, parentId].filter((id) => id !== null)
  }))

const isMountedRouter = (block: StoredCodeBlock, routerIds: ReadonlySet<string>, index: RouteIndex): boolean => {
  const parent = block.parentBlockId === null ? undefined : index.blockById.get(block.parentBlockId)
  return parent?.card?.part === MOUNT && block.card?.part !== MOUNT && namedTargetIdsOf(block).some((targetId) => routerIds.has(targetId))
}

const withoutCard = (block: StoredCodeBlock): StoredCodeBlock => {
  const { card, ...uncarded } = block
  return card === undefined ? block : uncarded
}

const mountedBlockOf = (block: StoredCodeBlock, mounts: readonly Mount[], routerIds: ReadonlySet<string>, index: RouteIndex): StoredCodeBlock => {
  if (isMountedRouter(block, routerIds, index)) return withoutCard(block)
  const registration = block.card?.kind === ROUTE && block.card.groupKey !== null ? registrationOf(block, index) : null
  const routerId = registration === null ? null : routerIdOfRegistration(registration, index)
  const prefix = routerId === null ? null : prefixAt(routerId, mounts, index, FIRST_DEPTH)
  return prefix === null ? block : withPrefix(block, prefix)
}

const parentOf = (block: StoredCodeBlock, { blockById }: RouteIndex): StoredCodeBlock | null =>
  block.parentBlockId === null ? null : (blockById.get(block.parentBlockId) ?? null)

const isRouterWideMiddleware = (block: StoredCodeBlock, index: RouteIndex): boolean =>
  block.card?.kind === ROUTE && block.card.part === MIDDLEWARE && registrationOf(block, index) === null

const isRouterBelow = (routerId: string, aboveId: string, mounts: readonly Mount[], index: RouteIndex, depth: number): boolean =>
  routerId === aboveId
  || (depth <= DEEPEST_MOUNT && mounts.some((mount) => mount.routerId !== null && isMountedAt(routerId, mount, index) && isRouterBelow(mount.routerId, aboveId, mounts, index, depth + 1)))

const rootRouterOf = (routerId: string, mounts: readonly Mount[], index: RouteIndex, depth: number): string => {
  const mount = depth > DEEPEST_MOUNT ? undefined : mounts.find((candidate) => candidate.routerId !== null && isMountedAt(routerId, candidate, index))
  const outerId = mount?.routerId ?? null
  return outerId === null ? routerId : rootRouterOf(outerId, mounts, index, depth + 1)
}

const isWithinPath = (path: string, scope: string | null): boolean =>
  scope === null || path === scope || path.startsWith(`${scope}${PATH_SEPARATOR}`)

interface Registered {
  readonly routerId: string
  readonly path: string
}

const listRegistered = (blocks: readonly StoredCodeBlock[], index: RouteIndex): Registered[] =>
  blocks.filter(isRegistration).flatMap((registration) => {
    const routerId = routerIdOfRegistration(registration, index)
    const path = registration.card?.groupKey ?? null
    return routerId === null || path === null ? [] : [{ routerId, path }]
  })

interface Coverage {
  readonly routerIds: readonly string[]
  readonly scope: string | null
}

interface RouteContext {
  readonly index: RouteIndex
  readonly mounts: readonly Mount[]
  readonly routerIds: ReadonlySet<string>
}

const coverageOfMount = (holder: StoredCodeBlock, { index, mounts, routerIds }: RouteContext): Coverage | null => {
  const mount = mounts.find((candidate) => candidate.block.id === holder.id)
  const mounted = mount === undefined ? [] : [...mount.targetIds].filter((targetId) => routerIds.has(targetId))
  if (mounted.length > 0) return { routerIds: mounted, scope: null }
  const routerId = mount?.routerId ?? null
  return routerId === null ? null : { routerIds: [routerId], scope: joinPaths(prefixAt(routerId, mounts, index, FIRST_DEPTH), mount?.prefix ?? null) }
}

const coverageAt = (holder: StoredCodeBlock, context: RouteContext): Coverage | null => {
  if (holder.card?.kind === ROUTE && holder.card.part === MOUNT) return coverageOfMount(holder, context)
  if (context.routerIds.has(holder.id)) return { routerIds: [holder.id], scope: null }
  const routerId = routerIdOf(holder)
  return routerId === null ? null : { routerIds: [routerId], scope: null }
}

const ancestorsOf = (block: StoredCodeBlock, index: RouteIndex): StoredCodeBlock[] => {
  const parent = parentOf(block, index)
  return parent === null ? [] : [parent, ...ancestorsOf(parent, index)]
}

const coverageOf = (middleware: StoredCodeBlock, context: RouteContext): Coverage | null => {
  const holders = middleware.parentBlockId === null ? [middleware] : ancestorsOf(middleware, context.index)
  const coverage = holders.map((holder) => coverageAt(holder, context)).find((found) => found !== null) ?? null
  if (coverage === null || middleware.card?.isAppWide !== true) return coverage
  return { ...coverage, routerIds: coverage.routerIds.map((routerId) => rootRouterOf(routerId, context.mounts, context.index, FIRST_DEPTH)) }
}

const routePathsOf = (middleware: StoredCodeBlock, registered: readonly Registered[], context: RouteContext): string[] => {
  const coverage = coverageOf(middleware, context)
  if (coverage === null) return []
  const isCovered = (one: Registered): boolean =>
    coverage.routerIds.some((routerId) => isRouterBelow(one.routerId, routerId, context.mounts, context.index, FIRST_DEPTH)) && isWithinPath(one.path, coverage.scope)
  return [...new Set(registered.filter(isCovered).map((one) => one.path))]
}

const withRoutePaths = (blocks: readonly StoredCodeBlock[], context: RouteContext): StoredCodeBlock[] => {
  const registered = listRegistered(blocks, context.index)
  return blocks.map((block) => {
    const { card } = block
    return card === undefined || !isRouterWideMiddleware(block, context.index) ? block : { ...block, card: { ...card, routePaths: routePathsOf(block, registered, context) } }
  })
}

export const mountRoutes = (blocks: readonly StoredCodeBlock[]): StoredCodeBlock[] => {
  const index = routeIndexOf(blocks)
  const mounts = listMounts(blocks, index)
  const routerIds = new Set([...listRouterIds(blocks, index), ...mounts.flatMap((mount) => (mount.routerId === null ? [] : [mount.routerId]))])
  const mounted = mounts.length === 0 ? [...blocks] : blocks.map((block) => mountedBlockOf(block, mounts, routerIds, index))
  return withRoutePaths(mounted, { index, mounts, routerIds })
}
