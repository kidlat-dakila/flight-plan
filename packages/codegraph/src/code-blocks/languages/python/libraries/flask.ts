import type { MethodPattern, SlotPosition } from "@/catalogue/types"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { Library } from "@/code-blocks/libraries/types"

const METHODS = "methods"

const THIRD_ARGUMENT = 2

const FLASK_RULE: SlotPosition = [0, "rule"]

const FLASK_VIEW: SlotPosition = [THIRD_ARGUMENT, "view_func"]

const FLASK_LOCATION: SlotPosition = [0, "location"]

const FLASK_PREFIX = "url_prefix"

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
  { kind: "decorator", name: "errorhandler", runs: "event" },
  { kind: "decorator", name: "command", runs: "command" },
  { kind: "call", name: "register_blueprint", slots: [], prefixAt: FLASK_PREFIX },
]

export const flaskLibrary: Library = {
  name: "Flask",
  specifiers: ["flask"],
  documentedVersion: "3.1",
  category: "framework",
  type: "backend",
  language: "python",
  readCards: readRouteCards,
  patterns: [
    { kind: "factory", name: "Flask", methods: FLASK_SCAFFOLD_METHODS },
    {
      kind: "factory",
      name: "Blueprint",
      prefixAt: FLASK_PREFIX,
      methods: [
        ...FLASK_SCAFFOLD_METHODS,
        { kind: "decorator", name: "before_app_request", runs: "middleware" },
        { kind: "decorator", name: "after_app_request", runs: "middleware" },
        { kind: "decorator", name: "app_errorhandler", runs: "event" },
      ],
    },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: FLASK_LOCATION },
  ],
}
