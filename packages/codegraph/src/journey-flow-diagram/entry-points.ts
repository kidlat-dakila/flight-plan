import type { AttributeSite, BaseASTGraphFile, Encapsulation } from "@/ast-graph"
import type { EntryPointTrigger } from "@flightplan/configurations"

export interface EntryPoint {
  readonly trigger: EntryPointTrigger
  readonly label: string
}

const COMPONENT_NAME = /^[A-Z]/u
const DEFAULT_EXPORT_NAME = "default"
const COMMAND_NAME = "main"
const HANDLER_PREFIX_LENGTH = 2
const HTTP_METHODS: ReadonlySet<string> = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
const UNNAMED_EVENT = "an event"
const ACTION_VERBS: ReadonlyMap<string, string> = new Map([
  ["onClick", "clicks"],
  ["onDoubleClick", "double-clicks"],
  ["onSubmit", "submits"],
  ["onChange", "changes"],
  ["onInput", "types in"],
  ["onBlur", "leaves"],
  ["onFocus", "focuses"],
  ["onKeyDown", "presses a key in"],
  ["onKeyUp", "presses a key in"],
])

export const PAGE_VISIT: EntryPoint = { trigger: "page-visit", label: "A user visits the page" }
export const APP_START: EntryPoint = { trigger: "app-start", label: "The app starts" }
export const UNUSED: EntryPoint = { trigger: "unused", label: "Not used yet" }
export const CONTEXT_BOUNDARY: EntryPoint = { trigger: "boundary", label: "Reached through a context" }
export const EVENT_BUS_BOUNDARY: EntryPoint = { trigger: "boundary", label: "Reached through an event bus" }

export const scheduledJobOf = (name: string): EntryPoint => ({ trigger: "command", label: `${name} runs on a schedule` })

export const pageVisitOf = (path: string): EntryPoint => ({ trigger: "page-visit", label: `A user visits ${path}` })

export const apiCallOf = (label: string): EntryPoint => ({ trigger: "api-call", label })

const actedOn = ({ element, text }: AttributeSite): string => text ?? `the ${element}`

const eventOf = (attribute: string): string => attribute.slice(HANDLER_PREFIX_LENGTH).toLowerCase()

export const userActionOf = (site: AttributeSite): EntryPoint => {
  const verb = ACTION_VERBS.get(site.attribute)
  const label = verb === undefined ? `A user triggers ${eventOf(site.attribute)} on ${actedOn(site)}` : `A user ${verb} ${actedOn(site)}`
  return { trigger: "user-action", label }
}

export const listenedEventOf = (event: string | null, target: string): EntryPoint => ({
  trigger: "user-action",
  label: `A user triggers ${event ?? UNNAMED_EVENT} on ${target}`,
})

export const isComponent = (file: BaseASTGraphFile, root: Encapsulation): boolean =>
  (COMPONENT_NAME.test(root.name) || root.name === DEFAULT_EXPORT_NAME)
  && file.listSyntaxSitesIn(root.range).some((site) => site.kind === "markup")

const namedEntryOf = (file: BaseASTGraphFile, root: Encapsulation): EntryPoint | null => {
  if (HTTP_METHODS.has(root.name)) return apiCallOf(root.name)
  if (isComponent(file, root)) return PAGE_VISIT
  return root.name === COMMAND_NAME ? { trigger: "command", label: root.name } : null
}

export const entryOfUnused = (file: BaseASTGraphFile, root: Encapsulation): EntryPoint => namedEntryOf(file, root) ?? UNUSED

export const entryOfTopLevelUse = (file: BaseASTGraphFile, root: Encapsulation): EntryPoint => namedEntryOf(file, root) ?? APP_START
