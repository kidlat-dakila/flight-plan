import type { PatternFixture } from "@/catalogue/types"

const NAVI = "Navi"

export const naviFixtures: readonly PatternFixture[] = [
  {
    library: NAVI,
    patternKey: "call:mount:*",
    matches: [
      "import { mount } from \"navi\"\nexport default mount({ \"/\": route({ title: \"Home\", view: <Home /> }) })",
    ],
    rejects: [
      "const mount = (...parts) => parts\nexport default mount({ \"/\": route({ title: \"Home\", view: <Home /> }) })",
    ],
  },
  {
    library: NAVI,
    patternKey: "call:route:*",
    matches: [
      "import { route } from \"navi\"\nconst posts = route({ title: \"Posts\", getData: () => fetchPosts(), getView: () => import(\"./posts\") })",
    ],
    rejects: [
      "const route = (...parts) => parts\nconst posts = route({ title: \"Posts\", getData: () => fetchPosts(), getView: () => import(\"./posts\") })",
    ],
  },
  {
    library: NAVI,
    patternKey: "call:redirect:*",
    matches: [
      "import { redirect } from \"navi\"\nconst legacy = redirect(\"/posts\")",
    ],
    rejects: [
      "const redirect = (...parts) => parts\nconst legacy = redirect(\"/posts\")",
    ],
  },
  {
    library: NAVI,
    patternKey: "element:Link:*",
    matches: [
      "import { Link } from \"react-navi\"\nconst link = <Link href=\"/posts\">Posts</Link>",
    ],
    rejects: [
      "const Link = (props) => props.children\nconst link = <Link href=\"/posts\">Posts</Link>",
    ],
  },
]

const NUQS = "nuqs"

export const nuqsFixtures: readonly PatternFixture[] = [
  {
    library: NUQS,
    patternKey: "call:useQueryState:*",
    matches: [
      "import { useQueryState } from \"nuqs\"\nconst [count, setCount] = useQueryState(\"count\", parseAsInteger.withDefault(0))",
    ],
    rejects: [
      "const useQueryState = (...parts) => parts\nconst [count, setCount] = useQueryState(\"count\", parseAsInteger.withDefault(0))",
    ],
  },
  {
    library: NUQS,
    patternKey: "call:useQueryStates:*",
    matches: [
      "import { useQueryStates } from \"nuqs\"\nconst [coordinates, setCoordinates] = useQueryStates({ lat: parseAsFloat.withDefault(45.18), lng: parseAsFloat.withDefault(5.72) })",
    ],
    rejects: [
      "const useQueryStates = (...parts) => parts\nconst [coordinates, setCoordinates] = useQueryStates({ lat: parseAsFloat.withDefault(45.18), lng: parseAsFloat.withDefault(5.72) })",
    ],
  },
]

const PAGE_JS = "page.js"

export const pageJsFixtures: readonly PatternFixture[] = [
  {
    library: PAGE_JS,
    patternKey: "call:default:*",
    matches: [
      "import page from \"page\"\npage(\"/user/:user\", load, show)",
    ],
    rejects: [
      "const page = (...parts) => parts\npage(\"/user/:user\", load, show)",
    ],
  },
  {
    library: PAGE_JS,
    patternKey: "call:default.redirect:*",
    matches: [
      "import page from \"page\"\npage.redirect(\"/login\")",
    ],
    rejects: [
      "const page = makeLocalRegistry()\npage.redirect(\"/login\")",
    ],
  },
  {
    library: PAGE_JS,
    patternKey: "call:default.show:*",
    matches: [
      "import page from \"page\"\npage.show(\"/user/12\")",
    ],
    rejects: [
      "const page = makeLocalRegistry()\npage.show(\"/user/12\")",
    ],
  },
  {
    library: PAGE_JS,
    patternKey: "call:default.exit:*",
    matches: [
      "import page from \"page\"\npage.exit(\"/sidebar\", (ctx, next) => { closeSidebar(); next() })",
    ],
    rejects: [
      "const page = makeLocalRegistry()\npage.exit(\"/sidebar\", (ctx, next) => { closeSidebar(); next() })",
    ],
  },
]

const REACH_ROUTER = "Reach Router"

export const reachRouterFixtures: readonly PatternFixture[] = [
  {
    library: REACH_ROUTER,
    patternKey: "element:Link:*",
    matches: [
      "import { Link } from \"@reach/router\"\nconst link = <Link to=\"dashboard\">Dashboard</Link>",
    ],
    rejects: [
      "const Link = (props) => props.children\nconst link = <Link to=\"dashboard\">Dashboard</Link>",
    ],
  },
  {
    library: REACH_ROUTER,
    patternKey: "element:Redirect:*",
    matches: [
      "import { Redirect } from \"@reach/router\"\nconst redirect = <Redirect from=\"aboutus\" to=\"about-us\" />",
    ],
    rejects: [
      "const Redirect = (props) => props.children\nconst redirect = <Redirect from=\"aboutus\" to=\"about-us\" />",
    ],
  },
  {
    library: REACH_ROUTER,
    patternKey: "call:navigate:*",
    matches: [
      "import { navigate } from \"@reach/router\"\nnavigate(\"/invoices\")",
    ],
    rejects: [
      "const navigate = (...parts) => parts\nnavigate(\"/invoices\")",
    ],
  },
]

const REACT_ROUTER = "React Router"

export const reactRouterFixtures: readonly PatternFixture[] = [
  {
    library: REACT_ROUTER,
    patternKey: "call:createBrowserRouter:*",
    matches: [
      "import { createBrowserRouter } from \"react-router\"\nconst router = createBrowserRouter([{ path: \"/\", Component: Root, loader: loadRoot }])",
      "import { createBrowserRouter } from \"react-router\"\nconst router = createBrowserRouter([{ path: \"/\", element: <Root />, lazy: () => import(\"./root\"), children: [{ path: \"cart\", Component: Cart, element: <Cart />, loader: loadCart, lazy: () => import(\"./cart\"), children: [{ path: \":id\", Component: Line, element: <Line />, loader: loadLine, lazy: () => import(\"./line\") }] }] }])",
    ],
    rejects: [
      "const createBrowserRouter = (...parts) => parts\nconst router = createBrowserRouter([{ path: \"/\", Component: Root, loader: loadRoot }])",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "factory:useNavigate:*",
    matches: [
      "import { useNavigate } from \"react-router\"\nconst navigate = useNavigate()",
    ],
    rejects: [
      "const useNavigate = (...parts) => parts\nconst navigate = useNavigate()",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "factory:useNavigate:*>called",
    matches: [
      "import { useNavigate } from \"react-router\"\nconst navigate = useNavigate()\nnavigate(\"/logout\")",
    ],
    rejects: [
      "const navigate = makeLocalRegistry()\nnavigate(\"/logout\")",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "element:Link:*",
    matches: [
      "import { Link } from \"react-router\"\nconst link = <Link to=\"/dashboard\">Dashboard</Link>",
    ],
    rejects: [
      "const Link = (props) => props.children\nconst link = <Link to=\"/dashboard\">Dashboard</Link>",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "call:redirect:*",
    matches: [
      "import { redirect } from \"react-router\"\nexport async function loader() { return redirect(\"/login\") }",
    ],
    rejects: [
      "const redirect = (...parts) => parts\nexport async function loader() { return redirect(\"/login\") }",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "call:route@@react-router/dev/routes:*",
    matches: [
      "import { type RouteConfig, route, index, layout, prefix } from \"@react-router/dev/routes\"\nexport default [\n  index(\"./home.tsx\"),\n  route(\"about\", \"./about.tsx\"),\n  layout(\"./auth/layout.tsx\", [route(\"login\", \"./auth/login.tsx\")]),\n  ...prefix(\"concerts\", [route(\":city\", \"./concerts/city.tsx\")]),\n] satisfies RouteConfig",
    ],
    rejects: [
      "const route = (...parts) => parts\nexport default [route(\"about\", \"./about.tsx\")]",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "call:index@@react-router/dev/routes:*",
    matches: [
      "import { type RouteConfig, route, index, layout, prefix } from \"@react-router/dev/routes\"\nexport default [\n  index(\"./home.tsx\"),\n  route(\"about\", \"./about.tsx\"),\n  layout(\"./auth/layout.tsx\", [route(\"login\", \"./auth/login.tsx\")]),\n  ...prefix(\"concerts\", [route(\":city\", \"./concerts/city.tsx\")]),\n] satisfies RouteConfig",
    ],
    rejects: [
      "const index = (...parts) => parts\nexport default [index(\"about\", \"./about.tsx\")]",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "call:layout@@react-router/dev/routes:*",
    matches: [
      "import { type RouteConfig, route, index, layout, prefix } from \"@react-router/dev/routes\"\nexport default [\n  index(\"./home.tsx\"),\n  route(\"about\", \"./about.tsx\"),\n  layout(\"./auth/layout.tsx\", [route(\"login\", \"./auth/login.tsx\")]),\n  ...prefix(\"concerts\", [route(\":city\", \"./concerts/city.tsx\")]),\n] satisfies RouteConfig",
    ],
    rejects: [
      "const layout = (...parts) => parts\nexport default [layout(\"about\", \"./about.tsx\")]",
    ],
  },
  {
    library: REACT_ROUTER,
    patternKey: "call:prefix@@react-router/dev/routes:*",
    matches: [
      "import { type RouteConfig, route, index, layout, prefix } from \"@react-router/dev/routes\"\nexport default [\n  index(\"./home.tsx\"),\n  route(\"about\", \"./about.tsx\"),\n  layout(\"./auth/layout.tsx\", [route(\"login\", \"./auth/login.tsx\")]),\n  ...prefix(\"concerts\", [route(\":city\", \"./concerts/city.tsx\")]),\n] satisfies RouteConfig",
    ],
    rejects: [
      "const prefix = (...parts) => parts\nexport default [prefix(\"about\", \"./about.tsx\")]",
    ],
  },
]

const REDUX_FIRST_ROUTER = "Redux-First Router"

export const reduxFirstRouterFixtures: readonly PatternFixture[] = [
  {
    library: REDUX_FIRST_ROUTER,
    patternKey: "call:connectRoutes:*",
    matches: [
      "import { connectRoutes } from \"redux-first-router\"\nconst { reducer, middleware, enhancer } = connectRoutes({ HOME: \"/\", USER: \"/user/:id\" })",
    ],
    rejects: [
      "const connectRoutes = (...parts) => parts\nconst { reducer, middleware, enhancer } = connectRoutes({ HOME: \"/\", USER: \"/user/:id\" })",
    ],
  },
  {
    library: REDUX_FIRST_ROUTER,
    patternKey: "call:redirect:*",
    matches: [
      "import { redirect } from \"redux-first-router\"\ndispatch(redirect({ type: \"LOGIN\" }))",
    ],
    rejects: [
      "const redirect = (...parts) => parts\ndispatch(redirect({ type: \"LOGIN\" }))",
    ],
  },
]

const ROUTER5 = "router5"

export const router5Fixtures: readonly PatternFixture[] = [
  {
    library: ROUTER5,
    patternKey: "factory:default:*",
    matches: [
      "import createRouter from \"router5\"\nconst router = createRouter(routes)",
    ],
    rejects: [
      "const createRouter = (...parts) => parts\nconst router = createRouter(routes)",
    ],
  },
  {
    library: ROUTER5,
    patternKey: "factory:default:*>call:add:*",
    matches: [
      "import createRouter from \"router5\"\nconst router = createRouter(routes)\nrouter.add({ name: \"about\", path: \"/about\" })",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.add({ name: \"about\", path: \"/about\" })",
    ],
  },
  {
    library: ROUTER5,
    patternKey: "factory:default:*>call:usePlugin:*",
    matches: [
      "import createRouter from \"router5\"\nconst router = createRouter(routes)\nrouter.usePlugin(browserPlugin())",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.usePlugin(browserPlugin())",
    ],
  },
  {
    library: ROUTER5,
    patternKey: "factory:default:*>call:start:*",
    matches: [
      "import createRouter from \"router5\"\nconst router = createRouter(routes)\nrouter.start()",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.start()",
    ],
  },
  {
    library: ROUTER5,
    patternKey: "call:useRoute:*",
    matches: [
      "import { useRoute } from \"react-router5\"\nconst { route } = useRoute()",
    ],
    rejects: [
      "const useRoute = (...parts) => parts\nconst { route } = useRoute()",
    ],
  },
]

const TANSTACK_ROUTER = "TanStack Router"

export const tanstackRouterFixtures: readonly PatternFixture[] = [
  {
    library: TANSTACK_ROUTER,
    patternKey: "factory:createFileRoute:*",
    matches: [
      "import { createFileRoute } from \"@tanstack/react-router\"\nconst makeRoute = createFileRoute(\"/posts\")",
    ],
    rejects: [
      "const createFileRoute = (...parts) => parts\nconst makeRoute = createFileRoute(\"/posts\")",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "factory:createFileRoute:*>called",
    matches: [
      "import { createFileRoute } from \"@tanstack/react-router\"\nconst makeRoute = createFileRoute(\"/posts\")\nexport const Route = makeRoute({ component: PostsComponent, loader: fetchPosts })",
    ],
    rejects: [
      "const makeRoute = makeLocalRegistry()\nexport const Route = makeRoute({ component: PostsComponent, loader: fetchPosts })",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "call:createRoute:*",
    matches: [
      "import { createRoute } from \"@tanstack/react-router\"\nconst indexRoute = createRoute({ getParentRoute: () => rootRoute, path: \"/\", component: IndexComponent })",
    ],
    rejects: [
      "const createRoute = (...parts) => parts\nconst indexRoute = createRoute({ getParentRoute: () => rootRoute, path: \"/\", component: IndexComponent })",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "factory:useNavigate:*",
    matches: [
      "import { useNavigate } from \"@tanstack/react-router\"\nconst navigate = useNavigate()",
    ],
    rejects: [
      "const useNavigate = (...parts) => parts\nconst navigate = useNavigate()",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "factory:useNavigate:*>called",
    matches: [
      "import { useNavigate } from \"@tanstack/react-router\"\nconst navigate = useNavigate()\nnavigate({ to: \"/posts\" })",
    ],
    rejects: [
      "const navigate = makeLocalRegistry()\nnavigate({ to: \"/posts\" })",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "element:Link:*",
    matches: [
      "import { Link } from \"@tanstack/react-router\"\nconst link = <Link to=\"/about\">About</Link>",
    ],
    rejects: [
      "const Link = (props) => props.children\nconst link = <Link to=\"/about\">About</Link>",
    ],
  },
  {
    library: TANSTACK_ROUTER,
    patternKey: "call:redirect:*",
    matches: [
      "import { redirect } from \"@tanstack/react-router\"\nthrow redirect({ to: \"/login\" })",
    ],
    rejects: [
      "const redirect = (...parts) => parts\nthrow redirect({ to: \"/login\" })",
    ],
  },
]

const VUE_ROUTER = "Vue Router"

const VUE_ROUTER_CREATED_KEY = "factory:createRouter:*"

const VUE_ROUTER_USED_KEY = "factory:useRouter:*"

const vueRouterImporting = (name: string, code: string): string => `import { ${name} } from "vue-router"\n${code}`

const vueRouterDeclaringLocally = (name: string, code: string): string => `const ${name} = (...parts) => parts\n${code}`

const VUE_ROUTER_CREATED = vueRouterImporting("createRouter", "const router = createRouter({ history: createWebHistory(), routes })")

const VUE_ROUTER_USED = vueRouterImporting("useRouter", "const router = useRouter()")

const VUE_ROUTER_LOCAL_ROUTER = "const router = makeLocalHistory()"

const vueRouterMethodFixture = (factoryKey: string, made: string, name: string, call: string): PatternFixture => ({
  library: VUE_ROUTER,
  patternKey: `${factoryKey}>call:${name}:*`,
  matches: [`${made}\n${call}`],
  rejects: [`${VUE_ROUTER_LOCAL_ROUTER}\n${call}`],
})

const vueRouterCallFixture = (name: string, call: string): PatternFixture => ({
  library: VUE_ROUTER,
  patternKey: `call:${name}:*`,
  matches: [vueRouterImporting(name, call)],
  rejects: [vueRouterDeclaringLocally(name, call)],
})

export const vueRouterFixtures: readonly PatternFixture[] = [
  { library: VUE_ROUTER, patternKey: VUE_ROUTER_CREATED_KEY, matches: [VUE_ROUTER_CREATED], rejects: [vueRouterDeclaringLocally("createRouter", "const router = createRouter({ routes })")] },
  vueRouterMethodFixture(VUE_ROUTER_CREATED_KEY, VUE_ROUTER_CREATED, "beforeEach", "router.beforeEach((to, from) => canAccess(to))"),
  vueRouterMethodFixture(VUE_ROUTER_CREATED_KEY, VUE_ROUTER_CREATED, "afterEach", "router.afterEach((to, from, failure) => { trackPageView(to) })"),
  vueRouterMethodFixture(VUE_ROUTER_CREATED_KEY, VUE_ROUTER_CREATED, "push", "router.push(\"/users/eduardo\")"),
  vueRouterMethodFixture(VUE_ROUTER_CREATED_KEY, VUE_ROUTER_CREATED, "replace", "router.replace(\"/login\")"),
  vueRouterCallFixture(
    "createRouter",
    "const router = createRouter({ history: createWebHistory(), routes: [{ path: \"/\", component: HomeView }, { path: \"/users/:id\", component: UserDetails, beforeEnter: requireSession }] })",
  ),
  { library: VUE_ROUTER, patternKey: VUE_ROUTER_USED_KEY, matches: [VUE_ROUTER_USED], rejects: [vueRouterDeclaringLocally("useRouter", "const router = useRouter()")] },
  vueRouterMethodFixture(VUE_ROUTER_USED_KEY, VUE_ROUTER_USED, "push", "router.push({ name: \"profile\", params: { username: \"erina\" } })"),
  vueRouterMethodFixture(VUE_ROUTER_USED_KEY, VUE_ROUTER_USED, "replace", "router.replace(\"/login\")"),
  {
    library: VUE_ROUTER,
    patternKey: "element:RouterLink:*",
    matches: [
      vueRouterImporting("RouterLink", "const link = <RouterLink to=\"/about\">About</RouterLink>"),
      "<script setup>\nimport { RouterLink } from \"vue-router\"\n</script>\n\n<template>\n  <RouterLink :to=\"userPath\">User</RouterLink>\n</template>",
    ],
    rejects: ["const RouterLink = (props) => <a {...props} />\nconst link = <RouterLink to=\"/about\">About</RouterLink>"],
  },
  vueRouterCallFixture("onBeforeRouteLeave", "onBeforeRouteLeave((to, from) => confirmLeaving())"),
  vueRouterCallFixture("onBeforeRouteUpdate", "onBeforeRouteUpdate(async (to, from) => { userData.value = await fetchUser(to.params.id) })"),
]

const WOUTER = "Wouter"

export const wouterFixtures: readonly PatternFixture[] = [
  {
    library: WOUTER,
    patternKey: "element:Route:*",
    matches: [
      "import { Route } from \"wouter\"\nconst page = <Route path=\"/users/:name\" component={UserPage} />",
    ],
    rejects: [
      "const Route = (props) => props.children\nconst page = <Route path=\"/users/:name\" component={UserPage} />",
    ],
  },
  {
    library: WOUTER,
    patternKey: "element:Link:*",
    matches: [
      "import { Link } from \"wouter\"\nconst link = <Link href=\"/users/1\">Profile</Link>",
    ],
    rejects: [
      "const Link = (props) => props.children\nconst link = <Link href=\"/users/1\">Profile</Link>",
    ],
  },
  {
    library: WOUTER,
    patternKey: "element:Redirect:*",
    matches: [
      "import { Redirect } from \"wouter\"\nconst redirect = <Redirect to=\"/login\" />",
    ],
    rejects: [
      "const Redirect = (props) => props.children\nconst redirect = <Redirect to=\"/login\" />",
    ],
  },
  {
    library: WOUTER,
    patternKey: "call:navigate:*",
    matches: [
      "import { navigate } from \"wouter/use-browser-location\"\nnavigate(\"/home\", { replace: true })",
    ],
    rejects: [
      "const navigate = (...parts) => parts\nnavigate(\"/home\", { replace: true })",
    ],
  },
]
