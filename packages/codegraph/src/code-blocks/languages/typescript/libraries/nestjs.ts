import { isSameNode } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import type { MatchedSlot, PatternMatch } from "@/catalogue/matching/match-sites"
import type { DecoratorPattern, MethodPattern, Slot, SlotPosition, SlotRuns } from "@/catalogue/types"
import { childrenOf, innermostAround, innermostAt, innermostCallableAround, outermostAt } from "@/code-blocks/libraries/read-blocks"
import { methodHeadingOf } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { BlockCard, CardKind, CardPart, CodeBlockType, RoutePattern } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import { EVERY_PATH_PATTERN, literalOf, readRoutePatterns, valueOfKey } from "./nestjs-paths"

const FIRST_ARGUMENT = 0

const LAST_ARGUMENT = "last"

const OTHER_ARGUMENTS = "rest"

const EVERY_METHOD = "*"

const CONTROLLER_PATH: SlotPosition = ["path", FIRST_ARGUMENT]

const ENHANCER_SLOTS: readonly Slot[] = [{ at: OTHER_ARGUMENTS, runs: "middleware" }]

const ROUTE_PATH: SlotPosition = ["0[]", FIRST_ARGUMENT]

const routeDecorator = (name: string, method: string): DecoratorPattern => ({ kind: "decorator", name, runs: "route", pathAt: ROUTE_PATH, method })

const enhancerDecorator = (name: string): DecoratorPattern => ({ kind: "decorator", name, slots: ENHANCER_SLOTS })

const appEnhancer = (name: string): MethodPattern => ({ kind: "call", name, slots: ENHANCER_SLOTS })

const FOR_ROUTES: MethodPattern = { kind: "call", name: "forRoutes", slots: [], makes: "config" }

const ROUTES_CHOSEN: readonly MethodPattern[] = [FOR_ROUTES, { kind: "factory", name: "exclude", methods: [FOR_ROUTES] }]

const NEST = "Nest"

const DECORATOR_SITE: PatternMatch["site"] = "decorator"

const ROUTE_RUNS: SlotRuns = "route"

const RESOLVER_RUNS: SlotRuns = "resolver"

const MIDDLEWARE_RUNS: SlotRuns = "middleware"

const CLASS: CodeBlockType = "class"

const METHOD: CodeBlockType = "method"

const PROPERTY: CodeBlockType = "property"

const CALL_TYPE = "call_expression"

const MEMBER_TYPE = "member_expression"

const OBJECT_TYPE = "object"

const ARRAY_TYPE = "array"

const PATH_SEPARATOR = "/"

const VERSION_DECORATOR = "Version"

const CONTROLLER_DECORATOR = "Controller"

const MODULE_DECORATOR = "Module"

const GLOBAL_PREFIX_CALL = "setGlobalPrefix"

const VERSIONING_CALL = "enableVersioning"

const ROUTER_MODULE_CALL = "RouterModule.register"

const MIDDLEWARE_APPLY_CALL = "apply"

const ROUTES_CHOSEN_CALL = "forRoutes"

const ROUTES_LEFT_OUT_CALL = "exclude"

const VERSION_KEY = "version"

const EXCLUDE_KEY = "exclude"

const TYPE_KEY = "type"

const PREFIX_KEY = "prefix"

const DEFAULT_VERSION_KEY = "defaultVersion"

const PATH_KEY = "path"

const MODULE_KEY = "module"

const CHILDREN_KEY = "children"

const CONTROLLERS_KEY = "controllers"

const PROVIDE_KEY = "provide"

const PROVIDED_CLASS_KEYS: ReadonlySet<string> = new Set(["useClass", "useExisting"])

const APP_ENHANCERS: ReadonlySet<string> = new Set(["APP_GUARD", "APP_INTERCEPTOR", "APP_PIPE", "APP_FILTER"])

const URI_VERSIONING = "URI"

const VERSION_NEUTRAL = "VERSION_NEUTRAL"

const NEUTRAL_VERSIONS: readonly string[] = []

const RESOLVER_HEADING_BY_DECORATOR: ReadonlyMap<string, string> = new Map([
  ["Query", "QUERY"],
  ["Mutation", "MUTATION"],
  ["Subscription", "SUBSCRIPTION"],
  ["ResolveField", "FIELD"],
])

const DEFAULT_VERSION_PREFIX = "v"

const NO_VERSION_PREFIX = "false"

const ROOT_PATH = "/"

const ROUTE_KIND: CardKind = "route"

const ROUTER_KIND: CardKind = "router"

const nestCardOf = (part: CardPart, card: Partial<BlockCard> = {}): BlockCard => ({
  library: NEST,
  kind: ROUTE_KIND,
  part,
  heading: null,
  groupKey: null,
  ownerId: null,
  ...card,
})

const callOf = (node: SyntaxNode): SyntaxNode | null => (node.type === CALL_TYPE ? node : (node.namedChildren.find((child) => child.type === CALL_TYPE) ?? null))

const argumentsOf = (node: SyntaxNode): SyntaxNode[] => callOf(node)?.childForFieldName("arguments")?.namedChildren ?? []

const firstArgumentOf = (node: SyntaxNode): SyntaxNode | null => argumentsOf(node)[0] ?? null

const calledMethodOf = (call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function")
  return callee?.type === MEMBER_TYPE ? (callee.childForFieldName("property")?.text ?? null) : null
}

const callsChainedAfter = (call: SyntaxNode): SyntaxNode[] => {
  const member = call.parent
  const next = member?.type === MEMBER_TYPE && isSameNode(member.childForFieldName("object"), call) ? member.parent : null
  return next?.type === CALL_TYPE ? [next, ...callsChainedAfter(next)] : []
}

const isDecoratorNamed = (name: string) => (match: PatternMatch): boolean => match.site === DECORATOR_SITE && match.name === name

const isCallNamed = (name: string) => (match: PatternMatch): boolean => match.site !== DECORATOR_SITE && match.name === name

const isRouteDecorator = (match: PatternMatch): boolean => match.site === DECORATOR_SITE && match.runs === ROUTE_RUNS

const hasMiddlewareSlots = (match: PatternMatch): boolean => match.slots.some((slot) => slot.runs === MIDDLEWARE_RUNS)

const isOfType = (type: CodeBlockType) => (block: ReadBlock): boolean => block.type === type && block.argument === undefined

const isDeclaration = (block: ReadBlock): boolean => (block.type === CLASS || block.type === METHOD) && block.argument === undefined

const isBlockOfCode = (block: ReadBlock): boolean => block.argument === undefined && block.isParameter !== true

const versionsOf = (written: SyntaxNode | null): readonly string[] | null => {
  if (written === null) return null
  if (written.type === ARRAY_TYPE) {
    const listed = written.namedChildren.map(versionsOf).filter((versions) => versions !== null)
    return listed.length === 0 ? null : listed.flat()
  }
  if (written.text.endsWith(VERSION_NEUTRAL)) return NEUTRAL_VERSIONS
  const version = literalOf(written)
  return version === null ? null : [version]
}

const versionsOfDecorator = (match: PatternMatch, { nodeAt }: CardReading): readonly string[] | null => versionsOf(firstArgumentOf(nodeAt(match.range)))

const versionsOfController = (match: PatternMatch, { nodeAt }: CardReading): readonly string[] | null => versionsOf(valueOfKey(firstArgumentOf(nodeAt(match.range)), VERSION_KEY))

type ReadVersions = (match: PatternMatch, reading: CardReading) => readonly string[] | null

const versionsByDeclaration = (reading: CardReading, name: string, versionsOfMatch: ReadVersions, type: CodeBlockType): ReadonlyMap<string, readonly string[]> =>
  new Map(reading.matches.filter(isDecoratorNamed(name)).flatMap((match) => {
    const declaration = innermostAround(reading.blocks, match.range, isOfType(type))
    const versions = versionsOfMatch(match, reading)
    return declaration === null || versions === null ? [] : [[declaration.id, versions] as const]
  }))

const rootedPath = (path: string | null): string => (path === null ? ROOT_PATH : `${PATH_SEPARATOR}${path.split(PATH_SEPARATOR).filter((part) => part !== "").join(PATH_SEPARATOR)}`)

const readHandlerSeeds = (reading: CardReading): CardSeed[] => {
  const methodVersions = versionsByDeclaration(reading, VERSION_DECORATOR, versionsOfDecorator, METHOD)
  const controllerVersions = versionsByDeclaration(reading, CONTROLLER_DECORATOR, versionsOfController, CLASS)
  return reading.matches.filter(isRouteDecorator).flatMap((match) => {
    const handler = innermostCallableAround(reading.blocks, match.range)
    if (handler?.type !== METHOD) return []
    const versions = methodVersions.get(handler.id) ?? controllerVersions.get(handler.parentId ?? "")
    const card = nestCardOf("handler", { heading: methodHeadingOf(match.method), groupKey: rootedPath(handler.catalogue?.path ?? null), ...(versions === undefined ? {} : { versions }) })
    return [{ blockId: handler.id, card }]
  })
}

const blocksOfSlot = (slot: MatchedSlot, blocks: readonly ReadBlock[]): ReadBlock[] => {
  const written = outermostAt(blocks, slot.range) ?? innermostAround(blocks, slot.range, isBlockOfCode)
  return written === null ? [] : [written]
}

const blocksOfSlots = (match: PatternMatch, blocks: readonly ReadBlock[]): ReadBlock[] =>
  match.slots.filter((slot) => slot.runs === MIDDLEWARE_RUNS).flatMap((slot) => blocksOfSlot(slot, blocks))

const enhancerCardOf = (declaration: ReadBlock, handlerCards: ReadonlyMap<string, BlockCard>): BlockCard | null => {
  const handler = handlerCards.get(declaration.id)
  if (handler !== undefined) return nestCardOf("middleware", { heading: handler.heading, groupKey: handler.groupKey, ownerId: declaration.id })
  return declaration.type === CLASS ? nestCardOf("middleware") : null
}

const readEnhancerSeeds = (reading: CardReading, handlers: readonly CardSeed[]): CardSeed[] => {
  const handlerCards = new Map(handlers.map((seed) => [seed.blockId, seed.card] as const))
  return reading.matches.filter((match) => match.site === DECORATOR_SITE && hasMiddlewareSlots(match)).flatMap((match) => {
    const declaration = innermostAround(reading.blocks, match.range, isDeclaration)
    const card = declaration === null ? null : enhancerCardOf(declaration, handlerCards)
    return card === null ? [] : blocksOfSlots(match, reading.blocks).map((slot) => ({ blockId: slot.id, card }))
  })
}

const APP_WIDE_MIDDLEWARE = nestCardOf("middleware", { isAppWide: true })

const PROVIDED_MIDDLEWARE = nestCardOf("middleware", { isAppWide: true, routePatterns: [{ pathPattern: EVERY_PATH_PATTERN, method: null }] })

const readAppEnhancerSeeds = ({ matches, blocks }: CardReading): CardSeed[] =>
  matches
    .filter((match) => match.site !== DECORATOR_SITE && match.name !== MIDDLEWARE_APPLY_CALL && hasMiddlewareSlots(match))
    .flatMap((match) => blocksOfSlots(match, blocks).map((slot) => ({ blockId: slot.id, card: APP_WIDE_MIDDLEWARE })))

const blockOfCall = (match: PatternMatch, blocks: readonly ReadBlock[]): ReadBlock | null => innermostAt(blocks, match.range)

const withRoutePatterns = (card: BlockCard, routePatterns: readonly RoutePattern[]): BlockCard => (routePatterns.length === 0 ? card : { ...card, routePatterns })

const withExcludedRoutePatterns = (card: BlockCard, excludedRoutePatterns: readonly RoutePattern[]): BlockCard =>
  excludedRoutePatterns.length === 0 ? card : { ...card, excludedRoutePatterns }

const readGlobalPrefixSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isCallNamed(GLOBAL_PREFIX_CALL)).flatMap((match) => {
    const passed = argumentsOf(reading.nodeAt(match.range))
    const block = blockOfCall(match, reading.blocks)
    const written = passed.length > 0 ? literalOf(passed[0]) : null
    if (block === null || written === null) return []
    const excluded = readRoutePatterns([valueOfKey(passed.length > 1 ? passed[1] : null, EXCLUDE_KEY)].filter((node) => node !== null))
    return [{ blockId: block.id, card: withExcludedRoutePatterns(nestCardOf("mount", { groupKey: written, isAppWide: true }), excluded) }]
  })

const isUriVersioning = (options: SyntaxNode | null): boolean => {
  const type = valueOfKey(options, TYPE_KEY)
  return type === null || type.text.endsWith(URI_VERSIONING)
}

const versionPrefixOf = (options: SyntaxNode | null): string => {
  const prefix = valueOfKey(options, PREFIX_KEY)
  if (prefix === null) return DEFAULT_VERSION_PREFIX
  return prefix.text === NO_VERSION_PREFIX ? "" : (literalOf(prefix) ?? DEFAULT_VERSION_PREFIX)
}

const readVersioningSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isCallNamed(VERSIONING_CALL)).flatMap((match) => {
    const options = firstArgumentOf(reading.nodeAt(match.range))
    const block = blockOfCall(match, reading.blocks)
    if (block === null) return []
    const versions = versionsOf(valueOfKey(options, DEFAULT_VERSION_KEY))
    const groupKey = isUriVersioning(options) ? versionPrefixOf(options) : null
    return [{ blockId: block.id, card: nestCardOf("versioning", { groupKey, isAppWide: true, ...(versions === null ? {} : { versions }) }) }]
  })

const argumentsOfChained = (apply: SyntaxNode, method: string): SyntaxNode[] =>
  callsChainedAfter(apply).filter((call) => calledMethodOf(call) === method).flatMap(argumentsOf)

const isPathWritten = (written: SyntaxNode): boolean => written.type === OBJECT_TYPE || literalOf(written) !== null

const readConsumerSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isCallNamed(MIDDLEWARE_APPLY_CALL)).flatMap((match) => {
    const apply = callOf(reading.nodeAt(match.range))
    if (apply === null) return []
    const chosen = argumentsOfChained(apply, ROUTES_CHOSEN_CALL)
    const routePatterns = readRoutePatterns(chosen.filter(isPathWritten))
    const card = withExcludedRoutePatterns(withRoutePatterns(nestCardOf("middleware"), routePatterns), readRoutePatterns(argumentsOfChained(apply, ROUTES_LEFT_OUT_CALL)))
    return blocksOfSlots(match, reading.blocks).map((slot) => ({ blockId: slot.id, card }))
  })

const isProvidingEnhancer = (property: ReadBlock, { nodeAt }: CardReading): boolean => {
  const object = property.type === PROPERTY && PROVIDED_CLASS_KEYS.has(property.name ?? "") ? nodeAt(property.ranges[0]).parent : null
  const provided = valueOfKey(object, PROVIDE_KEY)
  return provided !== null && APP_ENHANCERS.has(provided.text)
}

const readProvidedEnhancerSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.some(isDecoratorNamed(MODULE_DECORATOR))
    ? reading.blocks.filter((block) => isProvidingEnhancer(block, reading)).map((block) => ({ blockId: block.id, card: PROVIDED_MIDDLEWARE }))
    : []

interface RouterModuleEntry {
  readonly path: string | null
  readonly module: SyntaxNode
}

const joinedPath = (outer: string | null, inner: string | null): string | null => {
  const parts = [outer, inner].flatMap((part) => (part ?? "").split(PATH_SEPARATOR)).filter((part) => part !== "")
  return parts.length === 0 ? null : `${PATH_SEPARATOR}${parts.join(PATH_SEPARATOR)}`
}

const pairOfValue = (value: SyntaxNode): SyntaxNode | null => value.parent

const listRouterModuleEntries = (routes: SyntaxNode | null, outer: string | null): RouterModuleEntry[] =>
  routes?.type !== ARRAY_TYPE
    ? []
    : routes.namedChildren.flatMap((route) => {
        const path = joinedPath(outer, literalOf(valueOfKey(route, PATH_KEY)))
        const module = valueOfKey(route, MODULE_KEY)
        const pair = module === null ? null : pairOfValue(module)
        return [...(pair === null ? [] : [{ path, module: pair }]), ...listRouterModuleEntries(valueOfKey(route, CHILDREN_KEY), path)]
      })

const readRouterModuleSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isCallNamed(ROUTER_MODULE_CALL)).flatMap((match) =>
    listRouterModuleEntries(firstArgumentOf(reading.nodeAt(match.range)), null).flatMap(({ path, module }) => {
      const block = outermostAt(reading.blocks, rangeOfNode(module))
      return block === null || path === null ? [] : [{ blockId: block.id, card: nestCardOf("mount", { groupKey: path }) }]
    }))

const readModuleSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isDecoratorNamed(MODULE_DECORATOR)).flatMap((match) => {
    const module = innermostAround(reading.blocks, match.range, isOfType(CLASS))
    const controllers = module === null ? [] : childrenOf(reading.blocks, module).filter((child) => child.type === PROPERTY && child.name === CONTROLLERS_KEY)
    return controllers.map((property) => ({ blockId: property.id, card: nestCardOf("mount") }))
  })

const readControllerSeeds = (reading: CardReading): CardSeed[] =>
  reading.matches.filter(isDecoratorNamed(CONTROLLER_DECORATOR)).flatMap((match) => {
    const controller = innermostAround(reading.blocks, match.range, isOfType(CLASS))
    return controller === null ? [] : [{ blockId: controller.id, card: nestCardOf("controller") }]
  })

const resolverCardOf = (part: CardPart, heading: string | null): BlockCard => ({ library: NEST, kind: ROUTER_KIND, part, heading, groupKey: null, ownerId: null })

const isResolverDecorator = (match: PatternMatch): boolean => match.site === DECORATOR_SITE && match.runs === RESOLVER_RUNS

const readResolverSeeds = (reading: CardReading): CardSeed[] => {
  const fields = reading.matches.filter(isResolverDecorator).flatMap((match) => {
    const method = innermostCallableAround(reading.blocks, match.range)
    const heading = RESOLVER_HEADING_BY_DECORATOR.get(match.name) ?? null
    return method?.type !== METHOD || method.parentId === null || heading === null ? [] : [{ method, heading, resolverId: method.parentId }]
  })
  const resolverIds = firstOfEach(fields.map(({ resolverId }) => resolverId), (resolverId) => resolverId)
  return [
    ...fields.map(({ method, heading }) => ({ blockId: method.id, card: resolverCardOf("procedure", heading) })),
    ...resolverIds.map((resolverId) => ({ blockId: resolverId, card: resolverCardOf("holder", null) })),
  ]
}

const readNestCards = (reading: CardReading): CardSeed[] => {
  const handlers = readHandlerSeeds(reading)
  return [
    ...readControllerSeeds(reading),
    ...handlers,
    ...readEnhancerSeeds(reading, handlers),
    ...readAppEnhancerSeeds(reading),
    ...readConsumerSeeds(reading),
    ...readProvidedEnhancerSeeds(reading),
    ...readGlobalPrefixSeeds(reading),
    ...readVersioningSeeds(reading),
    ...readRouterModuleSeeds(reading),
    ...readModuleSeeds(reading),
    ...readResolverSeeds(reading),
  ]
}

export const nestLibrary: Library = {
  name: "Nest",
  specifiers: ["@nestjs/common", "@nestjs/core", "@nestjs/microservices", "@nestjs/schedule", "@nestjs/websockets", "@nestjs/event-emitter", "@nestjs/graphql"],
  documentedVersion: "11.1",
  category: "framework",
  type: "backend",
  language: "javascript",
  readCards: readNestCards,
  patterns: [
    { kind: "decorator", name: "Controller", prefixAt: CONTROLLER_PATH },
    routeDecorator("Get", "GET"),
    routeDecorator("Post", "POST"),
    routeDecorator("Put", "PUT"),
    routeDecorator("Patch", "PATCH"),
    routeDecorator("Delete", "DELETE"),
    routeDecorator("Head", "HEAD"),
    routeDecorator("Options", "OPTIONS"),
    routeDecorator("Search", "SEARCH"),
    routeDecorator("All", EVERY_METHOD),
    routeDecorator("Sse", "GET"),
    { ...enhancerDecorator("UseGuards"), makes: "auth" },
    enhancerDecorator("UseInterceptors"),
    enhancerDecorator("UsePipes"),
    enhancerDecorator("UseFilters"),
    { kind: "decorator", name: "Version", makes: "config" },
    { kind: "decorator", name: "Module", makes: "config", classifies: "app-setup" },
    { kind: "decorator", name: "MessagePattern", runs: "event", eventAt: FIRST_ARGUMENT },
    { kind: "decorator", name: "EventPattern", runs: "event", eventAt: FIRST_ARGUMENT },
    { kind: "decorator", name: "Cron", runs: "job" },
    { kind: "decorator", name: "Interval", runs: "job" },
    { kind: "decorator", name: "Timeout", runs: "job" },
    { kind: "decorator", name: "SubscribeMessage", runs: "event", eventAt: FIRST_ARGUMENT },
    { kind: "decorator", name: "OnEvent", runs: "event", eventAt: FIRST_ARGUMENT },
    { kind: "decorator", name: "Catch", runs: "event", classifies: "error-handling" },
    { kind: "decorator", name: "Query", from: "@nestjs/graphql", runs: "resolver" },
    { kind: "decorator", name: "Mutation", from: "@nestjs/graphql", runs: "resolver" },
    { kind: "decorator", name: "Subscription", from: "@nestjs/graphql", runs: "resolver" },
    { kind: "decorator", name: "ResolveField", from: "@nestjs/graphql", runs: "resolver" },
    { kind: "call", name: "RouterModule.register", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "MiddlewareConsumer",
      makesType: "MiddlewareConsumer",
      isTypeOnly: true,
      methods: [{ kind: "factory", name: "apply", slots: ENHANCER_SLOTS, methods: ROUTES_CHOSEN }],
    },
    {
      kind: "factory",
      name: "NestFactory.create",
      methods: [
        { kind: "call", name: "setGlobalPrefix", slots: [], makes: "config" },
        { kind: "call", name: "enableVersioning", slots: [], makes: "config" },
        { ...appEnhancer("useGlobalGuards"), makes: "auth" },
        appEnhancer("useGlobalInterceptors"),
        appEnhancer("useGlobalPipes"),
        appEnhancer("useGlobalFilters"),
        appEnhancer("use"),
        { kind: "call", name: "listen", slots: [{ at: LAST_ARGUMENT, runs: "event" }], classifies: "app-setup" },
      ],
    },
  ],
}
