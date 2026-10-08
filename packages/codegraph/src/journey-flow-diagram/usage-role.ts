import type { ArgumentSite, AttributeSite, PageSite, SourceRange, SyntaxSite } from "@/ast-graph"
import { isSameRange } from "@/ast-graph/source-range"

export type UsageRole
  = | { readonly kind: "call" }
    | { readonly kind: "render" }
    | { readonly kind: "handler", readonly site: AttributeSite }
    | { readonly kind: "provider", readonly site: AttributeSite }
    | { readonly kind: "prop", readonly site: AttributeSite, readonly isDirect: boolean }
    | { readonly kind: "route", readonly site: ArgumentSite }
    | { readonly kind: "event-bus" }
    | { readonly kind: "listener", readonly site: ArgumentSite }
    | { readonly kind: "schedule" }
    | { readonly kind: "page", readonly site: PageSite }
    | { readonly kind: "argument", readonly site: ArgumentSite }

interface Reading {
  readonly called: SourceRange | null
  readonly isRun: boolean
  readonly isInFunction: boolean
  readonly isDirect: boolean
}

const CALL: UsageRole = { kind: "call" }
const UNREAD: Reading = { called: null, isRun: false, isInFunction: false, isDirect: true }
const MEMBER_SEPARATOR = "."
const HANDLER_ATTRIBUTE = /^on[A-Z]/u
const PROVIDER_SUFFIX = ".Provider"
const PROVIDED_ATTRIBUTE = "value"
const ROUTE_PATH_START = "/"
const ROUTE_METHODS: ReadonlySet<string> = new Set(["get", "post", "put", "patch", "delete", "head", "options", "all"])
const MIDDLEWARE_METHOD = "use"
const EVERY_METHOD_LABEL = "ALL"
const EVERY_REQUEST_LABEL = "Any request"
const SCHEDULING_CALLEES: ReadonlySet<string> = new Set(["schedule", "setInterval"])
const SUBSCRIBING_METHODS: ReadonlySet<string> = new Set(["on", "once", "addListener", "subscribe"])
const LISTENING_METHOD = "addEventListener"

const methodOf = (callee: string): string | null => {
  const names = callee.split(MEMBER_SEPARATOR)
  return names.length > 1 ? names[names.length - 1] : null
}

export const isHandlerAttribute = (attribute: string): boolean => HANDLER_ATTRIBUTE.test(attribute)

const lastNameOf = (callee: string): string => callee.slice(callee.lastIndexOf(MEMBER_SEPARATOR) + 1)

const isRouteRegistration = ({ callee, literal }: ArgumentSite): boolean => {
  const method = methodOf(callee) ?? ""
  if (method === MIDDLEWARE_METHOD) return true
  return ROUTE_METHODS.has(method) && (literal?.startsWith(ROUTE_PATH_START) ?? false)
}

const isSubscription = ({ callee }: ArgumentSite): boolean => SUBSCRIBING_METHODS.has(methodOf(callee) ?? "")

export const isListener = ({ callee }: ArgumentSite): boolean => methodOf(callee) === LISTENING_METHOD

const isSchedule = ({ callee }: ArgumentSite): boolean => SCHEDULING_CALLEES.has(lastNameOf(callee))

const isRunInPlace = ({ called, isRun, isInFunction }: Reading): boolean => isRun || (called !== null && !isInFunction)

const roleInAttribute = (site: AttributeSite, reading: Reading): UsageRole => {
  if (isRunInPlace(reading)) return CALL
  if (site.element.endsWith(PROVIDER_SUFFIX) && site.attribute === PROVIDED_ATTRIBUTE) return { kind: "provider", site }
  if (!site.isBuiltIn) return { kind: "prop", site, isDirect: reading.isDirect }
  return isHandlerAttribute(site.attribute) ? { kind: "handler", site } : CALL
}

const roleInArgument = (site: ArgumentSite, reading: Reading): UsageRole | null => {
  if (isRunInPlace(reading)) return null
  if (isRouteRegistration(site)) return { kind: "route", site }
  if (isListener(site)) return { kind: "listener", site }
  if (isSubscription(site)) return { kind: "event-bus" }
  if (isSchedule(site)) return { kind: "schedule" }
  return reading.isDirect ? { kind: "argument", site } : null
}

const readInArgument = (reading: Reading): Reading =>
  isRunInPlace(reading) ? { ...reading, called: null, isRun: true, isDirect: false } : reading

const readInFunction = (wrapped: SourceRange | null, reading: Reading): Reading => {
  const isWrapping = wrapped !== null && reading.called !== null && isSameRange(wrapped, reading.called)
  return { called: null, isRun: false, isInFunction: true, isDirect: reading.isDirect && isWrapping }
}

const findPageAround = (sites: readonly SyntaxSite[]): PageSite | null => {
  const first = sites.find((site) => site.kind === "page" || site.kind === "function")
  return first?.kind === "page" ? first : null
}

const readSites = (sites: readonly SyntaxSite[], reading: Reading): UsageRole => {
  if (sites.length === 0) return CALL
  const [site, ...outer] = sites
  if (site.kind === "element") {
    const page = findPageAround(outer)
    return page === null ? { kind: "render" } : { kind: "page", site: page }
  }
  if (site.kind === "page" && !reading.isInFunction && !isRunInPlace(reading)) return { kind: "page", site }
  if (site.kind === "attribute") return roleInAttribute(site, reading)
  if (site.kind === "argument") return roleInArgument(site, reading) ?? readSites(outer, readInArgument(reading))
  if (site.kind === "callee") return readSites(outer, { ...reading, called: site.range })
  if (site.kind === "function") return readSites(outer, readInFunction(site.wrapped, reading))
  return readSites(outer, reading)
}

export const roleOf = (sitesAt: readonly SyntaxSite[]): UsageRole => readSites(sitesAt, UNREAD)

export const listenerTargetOf = ({ callee }: ArgumentSite): string => callee.slice(0, callee.lastIndexOf(MEMBER_SEPARATOR))

export const calleeNameOf = ({ callee }: ArgumentSite): string => lastNameOf(callee)

export const routeLabelOf = ({ callee, literal }: ArgumentSite): string => {
  const method = methodOf(callee) ?? ""
  if (method !== MIDDLEWARE_METHOD) return `${method.toUpperCase()} ${literal ?? ""}`
  return literal === null ? EVERY_REQUEST_LABEL : `${EVERY_METHOD_LABEL} ${literal}`
}
