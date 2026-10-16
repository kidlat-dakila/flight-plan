import type { PatternFixture } from "@/catalogue/types"

const EXPRESS = "Express"

const EXPRESS_APP_KEY = "factory:default:*"

const EXPRESS_ROUTER_KEY = "factory:Router:*"

const EXPRESS_APP = "import express from \"express\"\nconst app = express()"

const EXPRESS_ROUTER = "import { Router } from \"express\"\nconst router = Router()"

const EXPRESS_ROUTER_OF_DEFAULT = "import express from \"express\"\nconst router = express.Router()"

const EXPRESS_LOCAL_APP = "const app = makeLocalRegistry()"

const EXPRESS_LOCAL_ROUTER = "const router = makeLocalRegistry()"

const EXPRESS_ROUTE_NAMES: readonly string[] = ["get", "post", "put", "patch", "delete", "head", "options", "all"]

const expressMethodFixture = (factoryKey: string, made: string, local: string, name: string, call: string): PatternFixture => ({
  library: EXPRESS,
  patternKey: `${factoryKey}>call:${name}:*`,
  matches: [`${made}\n${call}`],
  rejects: [`${local}\n${call}`],
})

const expressRouteFactoryFixtures = (factoryKey: string, made: string, local: string, receiver: string): PatternFixture[] => {
  const routeKey = `${factoryKey}>factory:route:*`
  const route = `${receiver}.route("/users/:id")`
  return [
    { library: EXPRESS, patternKey: routeKey, matches: [`${made}\n${route}`], rejects: [`${local}\n${route}`] },
    ...EXPRESS_ROUTE_NAMES.map((name) => expressMethodFixture(routeKey, made, local, name, `${route}.${name}(requireSession, showUser)`)),
  ]
}

const expressRouterMethodFixtures = (factoryKey: string, made: string, local: string, receiver: string): PatternFixture[] => [
  ...EXPRESS_ROUTE_NAMES.map((name) => expressMethodFixture(factoryKey, made, local, name, `${receiver}.${name}("/users/:id", requireSession, showUser)`)),
  ...expressRouteFactoryFixtures(factoryKey, made, local, receiver),
  {
    ...expressMethodFixture(factoryKey, made, local, "use", `${receiver}.use("/admin", requireAdmin, adminRouter)`),
    matches: [`${made}\n${receiver}.use("/admin", requireAdmin, adminRouter)`, `${made}\n${receiver}.use(logRequest)`],
  },
  expressMethodFixture(factoryKey, made, local, "param", `${receiver}.param("user", (req, res, next, id) => { next() })`),
]

export const expressFixtures: readonly PatternFixture[] = [
  { library: EXPRESS, patternKey: EXPRESS_APP_KEY, matches: [EXPRESS_APP], rejects: ["const express = () => makeLocalRegistry()\nconst app = express()"] },
  ...expressRouterMethodFixtures(EXPRESS_APP_KEY, EXPRESS_APP, EXPRESS_LOCAL_APP, "app"),
  expressMethodFixture(EXPRESS_APP_KEY, EXPRESS_APP, EXPRESS_LOCAL_APP, "listen", "app.listen(8080, \"0.0.0.0\", (error) => { report(error) })"),
  { library: EXPRESS, patternKey: EXPRESS_ROUTER_KEY, matches: [EXPRESS_ROUTER, EXPRESS_ROUTER_OF_DEFAULT], rejects: ["const Router = () => makeLocalRegistry()\nconst router = Router()"] },
  ...expressRouterMethodFixtures(EXPRESS_ROUTER_KEY, EXPRESS_ROUTER, EXPRESS_LOCAL_ROUTER, "router"),
]
