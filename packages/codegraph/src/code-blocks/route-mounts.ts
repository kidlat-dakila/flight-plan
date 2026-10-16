import { joinPaths } from "@/code-blocks/libraries/route-cards"
import { groupBy } from "@/shared/group-by"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { BlockCard, CardKind, CardPart, CodeBlockType, RoutePattern } from "./types"

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
const PAGE: CardPart = "page"
const VERSIONING: CardPart = "versioning"
const CLASS: CodeBlockType = "class"
const DYNAMIC_SEGMENT_PATTERN = /\[+(?:\.{3})?([^\]]+)\]+/g
const NUMBERED_VERSION_PATTERN = /^[\d.|]+$/
const VERSION_SEPARATOR = "|"
const HEADING_VERSION_PREFIX = "v"
const HEADING_WORD_SEPARATOR = " "
const NO_VERSIONS: readonly string[] = []
const EVERY_METHOD = "*"
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

const classAroundOf = (block: StoredCodeBlock, { blockById }: RouteIndex): string | null => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent?.type === CLASS ? parent.id : null
}

const isDecoratedHandler = (block: StoredCodeBlock, index: RouteIndex): boolean => {
  const card = block.card
  return card?.kind === ROUTE && card.part === HANDLER && card.ownerId === null && (block.parentBlockId === null || classAroundOf(block, index) !== null)
}

export const isRegistration = (block: StoredCodeBlock, index: RouteIndex): boolean =>
  (block.card?.kind === ROUTE && block.card.part === HOLDER) || isDecoratedHandler(block, index)

export const registrationOf = (block: StoredCodeBlock, index: RouteIndex): StoredCodeBlock | null => {
  if (isRegistration(block, index)) return block
  const ownerId = block.card?.ownerId ?? block.parentBlockId
  const owner = ownerId === null ? undefined : index.blockById.get(ownerId)
  return owner !== undefined && isRegistration(owner, index) ? owner : null
}

const controllerOf = (registration: StoredCodeBlock, index: RouteIndex): string | null =>
  isDecoratedHandler(registration, index) ? classAroundOf(registration, index) : null

const routerIdOfRegistration = (registration: StoredCodeBlock, index: RouteIndex): string | null =>
  controllerOf(registration, index)
  ?? routerIdOf(registration)
  ?? (index.childrenById.get(registration.id) ?? [])
    .filter((chained) => isRegistration(chained, index))
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
    routerId: routerIdOf(block) ?? classAroundOf(block, index),
    prefix: block.card?.groupKey ?? null,
    targetIds: new Set([...within.flatMap(namedTargetIdsOf), ...plugins.map((plugin) => plugin.id)]),
  }
}

const isAppWide = (block: StoredCodeBlock): boolean => block.card?.isAppWide === true

export const listMounts = (blocks: readonly StoredCodeBlock[], index: RouteIndex): Mount[] =>
  blocks.filter((block) => block.card?.kind === ROUTE && block.card.part === MOUNT && !isAppWide(block)).map((block) => mountOf(block, index))

export const isMountedAt = (routerId: string, mount: Mount, { blockById }: RouteIndex): boolean => {
  const parentId = blockById.get(routerId)?.parentBlockId ?? null
  return mount.targetIds.has(routerId) || (parentId !== null && mount.targetIds.has(parentId))
}

const prefixAt = (routerId: string, mounts: readonly Mount[], index: RouteIndex, depth: number): string | null => {
  const mountedAt = depth > DEEPEST_MOUNT ? [] : mounts.filter((candidate) => candidate.targetIds.has(routerId))
  return mountedAt
    .map((mount) => joinPaths(mount.routerId === null ? null : prefixAt(mount.routerId, mounts, index, depth + 1), mount.prefix))
    .find((prefix) => prefix !== null) ?? null
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
  new Set(blocks.filter((block) => isRegistration(block, index)).flatMap((registration) => {
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

interface PathExpression {
  readonly expression: RegExp
  readonly method: string | null
}

interface Versioning {
  readonly isInPath: boolean
  readonly prefix: string
  readonly defaultVersions: readonly string[]
}

interface AppPaths {
  readonly prefix: string | null
  readonly excluded: readonly PathExpression[]
  readonly versioning: Versioning | null
}

const NO_APP_PATHS: AppPaths = { prefix: null, excluded: [], versioning: null }

const pathExpressionsOf = (patterns: readonly RoutePattern[] | undefined): PathExpression[] =>
  (patterns ?? []).map(({ pathPattern, method }) => ({ expression: new RegExp(pathPattern), method }))

const versioningOf = (card: BlockCard): Versioning => ({
  isInPath: card.groupKey !== null,
  prefix: card.groupKey ?? HEADING_VERSION_PREFIX,
  defaultVersions: card.versions ?? NO_VERSIONS,
})

const withAppPart = (paths: AppPaths, block: StoredCodeBlock): AppPaths => {
  const card = block.card
  if (card?.kind !== ROUTE || card.isAppWide !== true) return paths
  if (card.part === MOUNT) return { ...paths, prefix: card.groupKey, excluded: pathExpressionsOf(card.excludedRoutePatterns) }
  return card.part === VERSIONING ? { ...paths, versioning: versioningOf(card) } : paths
}

const appPathsByLibraryOf = (blocks: readonly StoredCodeBlock[]): ReadonlyMap<string, AppPaths> =>
  new Map([...groupBy(blocks.filter((block) => block.card?.isAppWide === true), (block) => block.card?.library ?? "")].map(([library, parts]) => [library, parts.reduce(withAppPart, NO_APP_PATHS)] as const))

const samplePathOf = (path: string): string => path.replace(DYNAMIC_SEGMENT_PATTERN, "$1")

const isExcludedFor = (method: string | null) => (excluded: PathExpression): boolean => excluded.method === null || excluded.method === method

const isExcludedPath = (path: string, method: string | null, excluded: readonly PathExpression[]): boolean =>
  excluded.filter(isExcludedFor(method)).some(({ expression }) => expression.test(samplePathOf(path)))

const versionTextOf = (versions: readonly string[], { prefix }: Versioning): string => versions.map((version) => `${prefix}${version}`).join(VERSION_SEPARATOR)

const withHeadingVersion = (block: StoredCodeBlock, versionText: string): StoredCodeBlock => {
  const { card } = block
  const heading = card?.heading ?? null
  if (card === undefined || heading === null) return block
  return { ...block, card: { ...card, heading: [heading, versionText].join(HEADING_WORD_SEPARATOR) } }
}

const withVersions = (block: StoredCodeBlock, versioning: Versioning | null, versions: readonly string[] | null): StoredCodeBlock => {
  const written = versioning === null ? NO_VERSIONS : (versions ?? versioning.defaultVersions)
  if (versioning === null || written.length === 0) return block
  const versionText = versionTextOf(written, versioning)
  return versioning.isInPath ? withPrefix(block, versionText) : withHeadingVersion(block, versionText)
}

const withAppPaths = (block: StoredCodeBlock, appPaths: AppPaths, registration: StoredCodeBlock): StoredCodeBlock => {
  const path = block.card?.groupKey ?? null
  if (path === null) return block
  const versioned = withVersions(block, appPaths.versioning, registration.card?.versions ?? null)
  const method = registration.catalogue?.method ?? null
  return appPaths.prefix === null || isExcludedPath(path, method, appPaths.excluded) ? versioned : withPrefix(versioned, appPaths.prefix)
}

interface MountContext {
  readonly mounts: readonly Mount[]
  readonly routerIds: ReadonlySet<string>
  readonly index: RouteIndex
  readonly appPathsByLibrary: ReadonlyMap<string, AppPaths>
}

const mountedBlockOf = (block: StoredCodeBlock, { mounts, routerIds, index, appPathsByLibrary }: MountContext): StoredCodeBlock => {
  if (isMountedRouter(block, routerIds, index)) return withoutCard(block)
  const registration = block.card?.kind === ROUTE && block.card.groupKey !== null ? registrationOf(block, index) : null
  if (registration === null) return block
  const routerId = routerIdOfRegistration(registration, index)
  const prefix = routerId === null ? null : prefixAt(routerId, mounts, index, FIRST_DEPTH)
  const mounted = prefix === null ? block : withPrefix(block, prefix)
  const appPaths = appPathsByLibrary.get(registration.card?.library ?? "")
  return appPaths === undefined ? mounted : withAppPaths(mounted, appPaths, registration)
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
  readonly routerId: string | null
  readonly path: string
  readonly library: string
  readonly method: string | null
}

const listRegistered = (blocks: readonly StoredCodeBlock[], index: RouteIndex): Registered[] =>
  blocks.filter((block) => isRegistration(block, index)).flatMap((registration) => {
    const path = registration.card?.groupKey ?? null
    const library = registration.card?.library ?? ""
    const method = registration.catalogue?.method ?? null
    return path === null ? [] : [{ routerId: routerIdOfRegistration(registration, index), path, library, method }]
  })

interface Coverage {
  readonly routerIds: readonly string[]
  readonly scope: string | null
}

interface RouteContext {
  readonly index: RouteIndex
  readonly mounts: readonly Mount[]
  readonly routerIds: ReadonlySet<string>
  readonly appPathsByLibrary: ReadonlyMap<string, AppPaths>
}

const coverageOfMount = (holder: StoredCodeBlock, { index, mounts, routerIds }: RouteContext): Coverage | null => {
  const mount = mounts.find((candidate) => candidate.block.id === holder.id)
  const mounted = mount === undefined ? [] : [...mount.targetIds].filter((targetId) => routerIds.has(targetId))
  if (mounted.length > 0) return { routerIds: mounted, scope: null }
  const routerId = mount?.routerId ?? null
  return routerId === null ? null : { routerIds: [routerId], scope: joinPaths(prefixAt(routerId, mounts, index, FIRST_DEPTH), mount?.prefix ?? null) }
}

const coverageOfNamedRouters = (holder: StoredCodeBlock, { routerIds }: RouteContext): Coverage | null => {
  const named = namedTargetIdsOf(holder).filter((targetId) => routerIds.has(targetId))
  return named.length === 0 ? null : { routerIds: named, scope: null }
}

const namedCoverageAt = (holder: StoredCodeBlock, context: RouteContext): Coverage | null => {
  if (holder.card?.kind === ROUTE && holder.card.part === MOUNT) return coverageOfMount(holder, context)
  if (context.routerIds.has(holder.id)) return { routerIds: [holder.id], scope: null }
  return coverageOfNamedRouters(holder, context)
}

const calledCoverageAt = (holder: StoredCodeBlock): Coverage | null => {
  const routerId = routerIdOf(holder)
  return routerId === null ? null : { routerIds: [routerId], scope: null }
}

const ancestorsOf = (block: StoredCodeBlock, index: RouteIndex): StoredCodeBlock[] => {
  const parent = parentOf(block, index)
  return parent === null ? [] : [parent, ...ancestorsOf(parent, index)]
}

const holdersOf = (middleware: StoredCodeBlock, index: RouteIndex): StoredCodeBlock[] =>
  middleware.parentBlockId === null ? [middleware] : ancestorsOf(middleware, index)

const firstCoverage = (holders: readonly StoredCodeBlock[], coverageAt: (holder: StoredCodeBlock) => Coverage | null): Coverage | null =>
  holders.map(coverageAt).find((found) => found !== null) ?? null

const namedCoverageOf = (middleware: StoredCodeBlock, context: RouteContext): Coverage | null =>
  firstCoverage(holdersOf(middleware, context.index), (holder) => namedCoverageAt(holder, context))

const coverageOfRoutersNamedAround = (middleware: StoredCodeBlock, context: RouteContext): Coverage | null =>
  firstCoverage(holdersOf(middleware, context.index), (holder) => coverageOfNamedRouters(holder, context))

const coverageOf = (middleware: StoredCodeBlock, context: RouteContext): Coverage | null => {
  const coverage = namedCoverageOf(middleware, context) ?? firstCoverage(holdersOf(middleware, context.index), calledCoverageAt)
  if (coverage === null || middleware.card?.isAppWide !== true) return coverage
  return { ...coverage, routerIds: coverage.routerIds.map((routerId) => rootRouterOf(routerId, context.mounts, context.index, FIRST_DEPTH)) }
}

const pathsCovered = (coverage: Coverage | null, registered: readonly Registered[], context: RouteContext): string[] => {
  if (coverage === null) return []
  const isCovered = (one: Registered): boolean =>
    one.routerId !== null
    && coverage.routerIds.some((routerId) => one.routerId !== null && isRouterBelow(one.routerId, routerId, context.mounts, context.index, FIRST_DEPTH))
    && isWithinPath(one.path, coverage.scope)
  return registered.filter(isCovered).map((one) => one.path)
}

const pathsOfLibrary = (library: string, registered: readonly Registered[]): string[] => registered.filter((one) => one.library === library).map((one) => one.path)

const routePathsOf = (middleware: StoredCodeBlock, registered: readonly Registered[], context: RouteContext): string[] => {
  const coverage = coverageOf(middleware, context)
  const card = middleware.card
  if (coverage === null && card?.isAppWide === true) return pathsOfLibrary(card.library, registered)
  return pathsCovered(coverage, registered, context)
}

const isPage = (block: StoredCodeBlock): boolean => block.card?.kind === ROUTE && block.card.part === PAGE

interface Reached {
  readonly path: string
  readonly method: string | null
}

const listReached = (blocks: readonly StoredCodeBlock[], index: RouteIndex): Reached[] =>
  blocks.filter((block) => isRegistration(block, index) || isPage(block)).flatMap((block) => {
    const path = block.card?.groupKey ?? null
    return path === null ? [] : [{ path, method: block.catalogue?.method ?? null }]
  })

const pathBelowPrefix = (path: string, prefix: string | null): string | null => {
  const rooted = prefix === null ? null : joinPaths(prefix, null)
  return rooted === null || !isWithinPath(path, rooted) ? null : (path.slice(rooted.length) || PATH_SEPARATOR)
}

const pathBelowVersion = (path: string | null, versionPrefix: string | null): string | null => {
  if (path === null || versionPrefix === null) return null
  const [, first = "", ...rest] = path.split(PATH_SEPARATOR)
  const version = first.startsWith(versionPrefix) ? first.slice(versionPrefix.length) : ""
  const isVersion = version !== "" && (versionPrefix !== "" || NUMBERED_VERSION_PATTERN.test(version))
  return isVersion ? `${PATH_SEPARATOR}${rest.join(PATH_SEPARATOR)}` : null
}

const versionPrefixInPath = (versioning: Versioning | null): string | null => (versioning?.isInPath === true ? versioning.prefix : null)

const writtenPathsOf = (path: string, { prefix, versioning }: AppPaths): string[] => {
  const below = pathBelowPrefix(path, prefix) ?? path
  return [path, below, pathBelowVersion(below, versionPrefixInPath(versioning))].filter((written) => written !== null)
}

const isMatchedBy = (expressions: readonly RegExp[], path: string, appPaths: AppPaths): boolean =>
  writtenPathsOf(path, appPaths).some((written) => expressions.some((expression) => expression.test(samplePathOf(written))))

const isMethodReached = (patternMethod: string | null, method: string | null): boolean =>
  patternMethod === null || method === patternMethod || method === EVERY_METHOD

const isReachedBy = (pattern: PathExpression, reached: Reached, appPaths: AppPaths): boolean =>
  isMethodReached(pattern.method, reached.method) && isMatchedBy([pattern.expression], reached.path, appPaths)

const pathsMatching = (routePatterns: readonly RoutePattern[], reached: readonly Reached[], appPaths: AppPaths): string[] => {
  const patterns = pathExpressionsOf(routePatterns)
  return reached.filter((one) => patterns.some((pattern) => isReachedBy(pattern, one, appPaths))).map((one) => one.path)
}

const isExcludedRoute = (path: string, methods: readonly (string | null)[], excluded: readonly PathExpression[], appPaths: AppPaths): boolean => {
  const matching = excluded.filter(({ expression }) => isMatchedBy([expression], path, appPaths))
  const isExcludedMethod = (method: string | null): boolean => matching.some(isExcludedFor(method))
  return methods.length === 0 ? isExcludedMethod(null) : methods.every(isExcludedMethod)
}

const withoutExcluded = (paths: readonly string[], card: BlockCard, registered: readonly Registered[], appPaths: AppPaths): string[] => {
  const excluded = pathExpressionsOf(card.excludedRoutePatterns)
  const registeredByPath = groupBy(registered, (one) => one.path)
  const methodsAt = (path: string): (string | null)[] => (registeredByPath.get(path) ?? []).map((one) => one.method)
  return [...new Set(paths)].filter((path) => !isExcludedRoute(path, methodsAt(path), excluded, appPaths))
}

const withRoutePaths = (blocks: readonly StoredCodeBlock[], context: RouteContext): StoredCodeBlock[] => {
  const registered = listRegistered(blocks, context.index)
  const reached = listReached(blocks, context.index)
  return blocks.map((block) => {
    const { card } = block
    if (card === undefined || !isRouterWideMiddleware(block, context.index)) return block
    const appPaths = context.appPathsByLibrary.get(card.library) ?? NO_APP_PATHS
    const covered = card.routePatterns === undefined
      ? routePathsOf(block, registered, context)
      : [...pathsMatching(card.routePatterns, reached, appPaths), ...pathsCovered(coverageOfRoutersNamedAround(block, context), registered, context)]
    return { ...block, card: { ...card, routePaths: withoutExcluded(covered, card, registered, appPaths) } }
  })
}

export const mountRoutes = (blocks: readonly StoredCodeBlock[]): StoredCodeBlock[] => {
  const index = routeIndexOf(blocks)
  const mounts = listMounts(blocks, index)
  const routerIds = new Set([...listRouterIds(blocks, index), ...mounts.flatMap((mount) => (mount.routerId === null ? [] : [mount.routerId]))])
  const appPathsByLibrary = appPathsByLibraryOf(blocks)
  const mounted = blocks.map((block) => mountedBlockOf(block, { mounts, routerIds, index, appPathsByLibrary }))
  return withRoutePaths(mounted, { index, mounts, routerIds, appPathsByLibrary })
}
