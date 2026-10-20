import type { MethodPattern, SlotPosition } from "@/catalogue/types"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"

const METHODS = "methods[]"

const THIRD_ARGUMENT = 2

const FLASK_RULE: SlotPosition = [0, "rule"]

const FLASK_VIEW: SlotPosition = [THIRD_ARGUMENT, "view_func"]

const FLASK_LOCATION: SlotPosition = [0, "location"]

const FLASK_PREFIX = "url_prefix"

const FLASK_ERROR_HANDLER: SlotPosition = [1, "f"]

const FLASK_SCAFFOLD_METHODS: readonly MethodPattern[] = [
  { kind: "decorator", name: "route", runs: "route", pathAt: FLASK_RULE, methodAt: METHODS },
  { kind: "decorator", name: "get", runs: "route", pathAt: FLASK_RULE, method: "GET" },
  { kind: "decorator", name: "post", runs: "route", pathAt: FLASK_RULE, method: "POST" },
  { kind: "decorator", name: "put", runs: "route", pathAt: FLASK_RULE, method: "PUT" },
  { kind: "decorator", name: "delete", runs: "route", pathAt: FLASK_RULE, method: "DELETE" },
  { kind: "decorator", name: "patch", runs: "route", pathAt: FLASK_RULE, method: "PATCH" },
  { kind: "call", name: "add_url_rule", slots: [{ at: FLASK_VIEW, runs: "route" }], pathAt: FLASK_RULE, methodAt: METHODS },
  { kind: "decorator", name: "before_request", runs: "middleware" },
  { kind: "decorator", name: "after_request", runs: "middleware" },
  { kind: "decorator", name: "teardown_request", runs: "event" },
  { kind: "decorator", name: "errorhandler", runs: "event", classifies: "error-handling" },
  { kind: "call", name: "register_error_handler", slots: [{ at: FLASK_ERROR_HANDLER, runs: "event" }], classifies: "error-handling" },
  { kind: "decorator", name: "command", runs: "command" },
  { kind: "call", name: "register_blueprint", slots: [], prefixAt: FLASK_PREFIX },
]

const APP_WIDE_HOOKS: ReadonlySet<string> = new Set(["before_app_request", "after_app_request"])

const asAppWide = (seed: CardSeed): CardSeed => ({ ...seed, card: { ...seed.card, isAppWide: true } })

const readFlaskCards = (reading: CardReading): CardSeed[] => {
  const appWideIds = new Set(readRouteCards({ ...reading, matches: reading.matches.filter((match) => APP_WIDE_HOOKS.has(match.name)) }).map((seed) => seed.blockId))
  return readRouteCards(reading).map((seed) => (appWideIds.has(seed.blockId) ? asAppWide(seed) : seed))
}

export const flaskLibrary: Library = {
  name: "Flask",
  specifiers: ["flask"],
  documentedVersion: "3.1",
  category: "framework",
  type: "backend",
  language: "python",
  readCards: readFlaskCards,
  patterns: [
    { kind: "factory", name: "Flask", methods: [...FLASK_SCAFFOLD_METHODS, { kind: "call", name: "run", slots: [], classifies: "app-setup" }] },
    {
      kind: "factory",
      name: "Blueprint",
      prefixAt: FLASK_PREFIX,
      methods: [
        ...FLASK_SCAFFOLD_METHODS,
        { kind: "decorator", name: "before_app_request", runs: "middleware" },
        { kind: "decorator", name: "after_app_request", runs: "middleware" },
        { kind: "decorator", name: "app_errorhandler", runs: "event", classifies: "error-handling" },
      ],
    },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: FLASK_LOCATION },
    { kind: "call", name: "render_template", slots: [], classifies: "page" },
    { kind: "call", name: "render_template_string", slots: [], classifies: "page" },
  ],
}
