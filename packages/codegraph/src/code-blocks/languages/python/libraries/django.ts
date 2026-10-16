import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { SlotPosition } from "@/catalogue/types"
import { joinPaths, readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import { containsRange } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"

const EVERY_METHOD = "*"

const DJANGO_ROUTE: SlotPosition = [0, "route"]

const DJANGO_VIEW: SlotPosition = [1, "view"]

const DJANGO_REDIRECT_TARGET: SlotPosition = [0, "to"]

const DJANGO_SIGNAL: SlotPosition = [0, "signal"]

const DJANGO_ALLOWED_METHODS = "0[]"

const ROUTE_PATTERN_NAMES: ReadonlySet<string> = new Set(["path", "re_path"])

const INCLUDE = "include"

const CALL_TYPE = "call"

const TEXT_TYPE = "string"

const TEXT_CONTENT_TYPE = "string_content"

const PAIR_TYPES: ReadonlySet<string> = new Set(["tuple", "parenthesized_expression"])

const ROOT_PATH = "/"

const PATTERN_START = /^\^/

const PATTERN_END = /\$$/

const MOUNT = "mount"

interface Include {
  readonly match: PatternMatch
  readonly listRange: SourceRange
  readonly module: string | null
}

const rootedPathOf = (written: string | null): string | null =>
  written === null ? null : joinPaths(ROOT_PATH, written.replace(PATTERN_START, "").replace(PATTERN_END, ""))

const textOf = (written: SyntaxNode | null | undefined): string | null =>
  written?.type === TEXT_TYPE ? written.namedChildren.filter((part) => part.type === TEXT_CONTENT_TYPE).map((part) => part.text).join("") : null

const moduleOf = (include: SyntaxNode): string | null => {
  const first = include.childForFieldName("arguments")?.namedChildren[0]
  return PAIR_TYPES.has(first?.type ?? "") ? textOf(first?.namedChildren[0]) : textOf(first)
}

const isInclude = (written: SyntaxNode): boolean => written.type === CALL_TYPE && written.childForFieldName("function")?.text === INCLUDE

const includeOf = (match: PatternMatch, nodeAt: CardReading["nodeAt"]): Include | null => {
  if (!ROUTE_PATTERN_NAMES.has(match.name)) return null
  const view = match.slots.find((slot) => slot.runs === "route")
  const written = view === undefined ? null : nodeAt(view.range)
  return view === undefined || written === null || !isInclude(written) ? null : { match, listRange: view.range, module: moduleOf(written) }
}

const innermostIncludeAround = (range: SourceRange, includes: readonly Include[]): Include | null =>
  includes
    .filter((include) => include.match.range !== range && containsRange(include.listRange, range))
    .reduce<Include | null>((innermost, include) => (innermost === null || containsRange(innermost.listRange, include.listRange) ? include : innermost), null)

const prefixAround = (range: SourceRange, includes: readonly Include[]): string | null => {
  const around = innermostIncludeAround(range, includes)
  return around === null ? null : joinPaths(prefixAround(around.match.range, includes), rootedPathOf(around.match.path))
}

const asRegistration = (match: PatternMatch, includes: readonly Include[]): PatternMatch =>
  ROUTE_PATTERN_NAMES.has(match.name) ? { ...match, path: rootedPathOf(match.path), prefix: prefixAround(match.range, includes) } : match

const asMount = ({ match }: Include, includes: readonly Include[]): PatternMatch => ({
  ...match,
  slots: [],
  path: null,
  prefix: joinPaths(prefixAround(match.range, includes), rootedPathOf(match.path)),
  isMounting: true,
})

const withModule = (seed: CardSeed, module: string | null): CardSeed =>
  module === null || seed.card.part !== MOUNT ? seed : { ...seed, card: { ...seed.card, mountedModule: module } }

const readDjangoCards = (reading: CardReading): CardSeed[] => {
  const includes = reading.matches.flatMap((match) => includeOf(match, reading.nodeAt) ?? [])
  const included = new Set(includes.map((include) => include.match))
  const others = reading.matches.filter((match) => !included.has(match)).map((match) => asRegistration(match, includes))
  return [
    ...readRouteCards({ ...reading, matches: others }),
    ...includes.flatMap((include) => readRouteCards({ ...reading, matches: [asMount(include, includes)] }).map((seed) => withModule(seed, include.module))),
  ]
}

export const djangoLibrary: Library = {
  name: "Django",
  specifiers: [
    "django",
    "django.urls",
    "django.shortcuts",
    "django.contrib.auth",
    "django.contrib.auth.decorators",
    "django.views.decorators.cache",
    "django.views.decorators.http",
    "django.core.cache",
    "django.db",
    "django.dispatch",
  ],
  documentedVersion: "6.1",
  category: "framework",
  type: "backend",
  language: "python",
  readCards: readDjangoCards,
  patterns: [
    { kind: "call", name: "path", slots: [{ at: DJANGO_VIEW, runs: "route" }], pathAt: DJANGO_ROUTE, method: EVERY_METHOD },
    { kind: "call", name: "re_path", slots: [{ at: DJANGO_VIEW, runs: "route" }], pathAt: DJANGO_ROUTE, method: EVERY_METHOD },
    { kind: "file", glob: "**/management/commands/[!_]*.py", exports: [{ name: "Command", runs: "command" }] },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: DJANGO_REDIRECT_TARGET },
    { kind: "call", name: "get_object_or_404", slots: [], makes: "data-fetch" },
    { kind: "call", name: "get_list_or_404", slots: [], makes: "data-fetch" },
    { kind: "call", name: "authenticate", slots: [], makes: "auth" },
    { kind: "call", name: "login", slots: [], makes: "auth" },
    { kind: "call", name: "logout", slots: [], makes: "auth" },
    { kind: "decorator", name: "login_required", makes: "auth" },
    { kind: "decorator", name: "permission_required", makes: "auth" },
    { kind: "decorator", name: "user_passes_test", makes: "auth" },
    { kind: "decorator", name: "cache_page", makes: "cache" },
    { kind: "decorator", name: "require_http_methods", methodAt: DJANGO_ALLOWED_METHODS },
    { kind: "decorator", name: "require_GET", method: "GET" },
    { kind: "decorator", name: "require_POST", method: "POST" },
    { kind: "decorator", name: "require_safe", method: "GET,HEAD" },
    { kind: "call", name: "cache.get", slots: [], makes: "cache" },
    { kind: "call", name: "cache.set", slots: [], makes: "cache" },
    { kind: "call", name: "cache.get_or_set", slots: [], makes: "cache" },
    { kind: "call", name: "cache.delete", slots: [], makes: "cache" },
    { kind: "decorator", name: "transaction.atomic", makes: "transaction" },
    { kind: "call", name: "transaction.atomic", slots: [], makes: "transaction" },
    { kind: "decorator", name: "receiver", runs: "event", eventAt: DJANGO_SIGNAL },
  ],
}
