import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { SlotRuns } from "@/catalogue/types"
import { methodHeadingOf, readExportRouteCards } from "@/code-blocks/libraries/route-cards"
import type { BlockNaming, CardReading, CardSeed, ExportCardReading, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { BlockCard } from "@/code-blocks/types"
import { readMatcherPatterns } from "./nextjs-matcher"

const FIRST_ARGUMENT = 0

const EVERY_METHOD = "*"

const NEXT = "Next.js"

const ROUTE_RUNS: SlotRuns = "route"

const DIRECTIVE_SITE: PatternMatch["site"] = "directive"

const PAGE_RUNS: SlotRuns = "page"

const MIDDLEWARE_RUNS: SlotRuns = "middleware"

const DEFAULT_EXPORT = "default"

const CONFIG_EXPORT = "config"

const APP_PAGE_GLOB = "{app,src/app}/**/page.{js,jsx,ts,tsx}"

const PAGES_GLOB = "{pages,src/pages}/**/[!_]*.{js,jsx,ts,tsx}"

const PAGE_GLOBS: ReadonlySet<string> = new Set([APP_PAGE_GLOB, PAGES_GLOB])

const isActionDirective = (match: PatternMatch): boolean => match.site === DIRECTIVE_SITE && match.runs === ROUTE_RUNS

const serverActionCardOf = (method: string | null): BlockCard => ({
  library: NEXT,
  kind: "route",
  part: "server-action",
  heading: methodHeadingOf(method),
  groupKey: null,
  ownerId: null,
})

const isActionOf = (directives: ReadonlySet<string>) => ({ catalogue }: ReadBlock): boolean =>
  catalogue?.runs === ROUTE_RUNS && directives.has(catalogue.name)

const isPage = ({ catalogue, exportedNames }: BlockNaming): boolean =>
  catalogue.runs === PAGE_RUNS && catalogue.path !== null && PAGE_GLOBS.has(catalogue.name) && exportedNames.includes(DEFAULT_EXPORT)

const pageSeedOf = ({ blockId, catalogue }: BlockNaming): CardSeed => ({
  blockId,
  card: { library: NEXT, kind: "route", part: "page", heading: null, groupKey: catalogue.path, ownerId: null },
})

const isMiddleware = ({ catalogue }: BlockNaming): boolean => catalogue.runs === MIDDLEWARE_RUNS

const configNodeOf = ({ exports, nodeAt }: ExportCardReading) => {
  const config = exports.local.find((exported) => exported.exportedName === CONFIG_EXPORT)
  return config === undefined || nodeAt === null ? null : nodeAt(config.declarationRange)
}

const middlewareSeedOf = (pathPatterns: readonly string[]) => ({ blockId }: BlockNaming): CardSeed => ({
  blockId,
  card: { library: NEXT, kind: "route", part: "middleware", heading: null, groupKey: null, ownerId: null, isAppWide: true, pathPatterns },
})

const readNextExportCards = (reading: ExportCardReading): CardSeed[] => {
  const middleware = reading.namings.filter(isMiddleware)
  return [
    ...readExportRouteCards(reading),
    ...reading.namings.filter(isPage).map(pageSeedOf),
    ...(middleware.length === 0 ? [] : middleware.map(middlewareSeedOf(readMatcherPatterns(configNodeOf(reading))))),
  ]
}

const readServerActionCards = ({ matches, blocks }: CardReading): CardSeed[] => {
  const directives = new Set(matches.filter(isActionDirective).map((match) => match.name))
  return blocks.filter(isActionOf(directives)).map((block) => ({ blockId: block.id, card: serverActionCardOf(block.catalogue?.method ?? null) }))
}

const NEXT_SINCE_PROXY = ">=16"

export const nextLibrary: Library = {
  name: NEXT,
  specifiers: ["next", "next/navigation", "next/router", "next/link", "next/cache", "next/headers", "next/server"],
  documentedVersion: "16.4",
  category: "framework",
  type: "fullstack",
  language: "javascript",
  readCards: readServerActionCards,
  readExportCards: readNextExportCards,
  patterns: [
    { kind: "file", glob: APP_PAGE_GLOB, exports: [{ name: DEFAULT_EXPORT, runs: PAGE_RUNS }] },
    {
      kind: "file",
      glob: "{app,src/app}/**/{layout,template,loading,error,not-found,global-error}.{js,jsx,ts,tsx}",
      exports: [{ name: "default", runs: "page" }],
    },
    {
      kind: "file",
      glob: "{app,src/app}/**/route.{js,ts}",
      exports: [
        { name: "GET", runs: "route", method: "GET" },
        { name: "POST", runs: "route", method: "POST" },
        { name: "PUT", runs: "route", method: "PUT" },
        { name: "PATCH", runs: "route", method: "PATCH" },
        { name: "DELETE", runs: "route", method: "DELETE" },
        { name: "HEAD", runs: "route", method: "HEAD" },
        { name: "OPTIONS", runs: "route", method: "OPTIONS" },
      ],
    },
    {
      kind: "file",
      glob: "{pages,src/pages}/api/**/*.{js,ts}",
      exports: [{ name: "default", runs: "route", method: EVERY_METHOD }],
    },
    {
      kind: "file",
      glob: PAGES_GLOB,
      exports: [
        { name: "default", runs: "page" },
        { name: "getServerSideProps", runs: "page" },
        { name: "getStaticProps", runs: "page" },
        { name: "getStaticPaths", runs: "page" },
      ],
    },
    { kind: "file", glob: "{middleware,src/middleware}.{js,ts}", exports: [{ name: "middleware", runs: "middleware" }] },
    {
      kind: "file",
      glob: "{proxy,src/proxy}.{js,ts}",
      versions: NEXT_SINCE_PROXY,
      exports: [{ name: "proxy", runs: "middleware" }],
    },
    { kind: "directive", text: "use server", runs: "route", method: "POST" },
    { kind: "element", name: "default", from: "next/link", slots: [], makes: "navigation", pathAt: "href" },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
    { kind: "call", name: "permanentRedirect", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
    {
      kind: "factory",
      name: "useRouter",
      methods: [
        { kind: "call", name: "push", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
        { kind: "call", name: "replace", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
      ],
    },
    { kind: "call", name: "after", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
    { kind: "call", name: "revalidatePath", slots: [], makes: "cache" },
    { kind: "call", name: "revalidateTag", slots: [], makes: "cache" },
    { kind: "call", name: "unstable_cache", slots: [{ at: FIRST_ARGUMENT, runs: "kept" }], makes: "cache" },
    {
      kind: "factory",
      name: "cookies",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "storage" },
        { kind: "call", name: "set", slots: [], makes: "storage" },
        { kind: "call", name: "delete", slots: [], makes: "storage" },
      ],
    },
  ],
}
