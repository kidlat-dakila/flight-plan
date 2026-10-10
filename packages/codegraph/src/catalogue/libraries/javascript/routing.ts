import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

export const naviLibrary: CatalogueLibrary = {
  name: "Navi",
  specifiers: ["navi", "react-navi"],
  documentedVersion: "0.15",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "mount", slots: [{ at: "0.*", runs: "page" }], pathAt: "0.@key" },
    { kind: "call", name: "route", slots: [{ at: "getView", runs: "kept" }, { at: "getData", runs: "kept" }] },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: 0 },
    { kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: "href" },
  ],
}

export const nuqsLibrary: CatalogueLibrary = {
  name: "nuqs",
  specifiers: ["nuqs"],
  documentedVersion: "2.10",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useQueryState", slots: [], makes: "state" },
    { kind: "call", name: "useQueryStates", slots: [], makes: "state" },
  ],
}

export const pageJsLibrary: CatalogueLibrary = {
  name: "page.js",
  specifiers: ["page"],
  documentedVersion: "1.11",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [{ at: "last", runs: "page" }, { at: "rest", runs: "middleware" }], pathAt: 0 },
    { kind: "call", name: "default.redirect", slots: [], makes: "navigation", pathAt: 0 },
    { kind: "call", name: "default.show", slots: [], makes: "navigation", pathAt: 0 },
    { kind: "call", name: "default.exit", slots: [{ at: "last", runs: "event" }], eventAt: 0 },
  ],
}

export const reachRouterLibrary: CatalogueLibrary = {
  name: "Reach Router",
  specifiers: ["@reach/router"],
  documentedVersion: "1.3",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "element", name: "Redirect", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "call", name: "navigate", slots: [], makes: "navigation", pathAt: 0 },
  ],
}

const REACT_ROUTER_ROUTE_CONFIG = "@react-router/dev/routes"

const REACT_ROUTER_ROUTE_SLOTS: readonly Slot[] = [
  { at: "0[].Component", runs: "page" },
  { at: "0[].element", runs: "page" },
  { at: "0[].loader", runs: "page" },
  { at: "0[].lazy", runs: "page" },
  { at: "0[].children[].Component", runs: "page" },
  { at: "0[].children[].element", runs: "page" },
  { at: "0[].children[].loader", runs: "page" },
  { at: "0[].children[].lazy", runs: "page" },
  { at: "0[].children[].children[].Component", runs: "page" },
  { at: "0[].children[].children[].element", runs: "page" },
  { at: "0[].children[].children[].loader", runs: "page" },
  { at: "0[].children[].children[].lazy", runs: "page" },
]

export const reactRouterLibrary: CatalogueLibrary = {
  name: "React Router",
  specifiers: ["react-router", "react-router-dom", "@react-router/dev/routes"],
  documentedVersion: "8.4",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createBrowserRouter", slots: REACT_ROUTER_ROUTE_SLOTS, pathAt: "0[].path" },
    { kind: "call", name: "route", from: REACT_ROUTER_ROUTE_CONFIG, slots: [{ at: SECOND_ARGUMENT, runs: "page" }], pathAt: FIRST_ARGUMENT },
    { kind: "call", name: "index", from: REACT_ROUTER_ROUTE_CONFIG, slots: [{ at: FIRST_ARGUMENT, runs: "page" }], pathAt: [] },
    { kind: "call", name: "layout", from: REACT_ROUTER_ROUTE_CONFIG, slots: [{ at: FIRST_ARGUMENT, runs: "page" }], pathAt: [] },
    { kind: "call", name: "prefix", from: REACT_ROUTER_ROUTE_CONFIG, slots: [], prefixAt: FIRST_ARGUMENT },
    {
      kind: "factory",
      name: "useNavigate",
      methods: [],
      called: {
        slots: [],
        makes: "navigation",
      },
    },
    { kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: 0 },
  ],
}

export const reduxFirstRouterLibrary: CatalogueLibrary = {
  name: "Redux-First Router",
  specifiers: ["redux-first-router"],
  documentedVersion: "2.1",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "connectRoutes", slots: [], makes: "state" },
    { kind: "call", name: "redirect", slots: [], makes: "navigation" },
  ],
}

export const router5Library: CatalogueLibrary = {
  name: "router5",
  specifiers: ["router5", "react-router5"],
  documentedVersion: "8.0",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "add", slots: [], makes: "navigation", pathAt: "path" },
        { kind: "call", name: "usePlugin", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "start", slots: [{ at: 0, runs: "event" }], makes: "navigation" },
      ],
    },
    { kind: "call", name: "useRoute", slots: [], makes: "state" },
  ],
}

export const tanstackRouterLibrary: CatalogueLibrary = {
  name: "TanStack Router",
  specifiers: ["@tanstack/react-router"],
  documentedVersion: "1.170",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createFileRoute",
      prefixAt: 0,
      methods: [],
      called: {
        slots: [{ at: "component", runs: "page" }, { at: "loader", runs: "page" }, { at: "beforeLoad", runs: "middleware" }],
      },
    },
    { kind: "call", name: "createRoute", slots: [{ at: "component", runs: "page" }, { at: "loader", runs: "page" }], pathAt: "path" },
    {
      kind: "factory",
      name: "useNavigate",
      methods: [],
      called: {
        slots: [],
        makes: "navigation",
      },
    },
    { kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "call", name: "redirect", slots: [], makes: "navigation", pathAt: "to" },
  ],
}

export const vueRouterLibrary: CatalogueLibrary = {
  name: "Vue Router",
  specifiers: ["vue-router"],
  documentedVersion: "5.4",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createRouter",
      methods: [
        { kind: "call", name: "beforeEach", slots: [{ at: FIRST_ARGUMENT, runs: "middleware" }] },
        { kind: "call", name: "afterEach", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
        { kind: "call", name: "push", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
        { kind: "call", name: "replace", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
      ],
    },
    {
      kind: "call",
      name: "createRouter",
      slots: [
        { at: "routes[].component", runs: "page" },
        { at: "routes[].beforeEnter", runs: "middleware" },
        { at: "routes[].children[].component", runs: "page" },
        { at: "routes[].children[].beforeEnter", runs: "middleware" },
        { at: "routes[].children[].children[].component", runs: "page" },
        { at: "routes[].children[].children[].beforeEnter", runs: "middleware" },
      ],
      pathAt: "routes[].path",
    },
    {
      kind: "factory",
      name: "useRouter",
      methods: [
        { kind: "call", name: "push", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
        { kind: "call", name: "replace", slots: [], makes: "navigation", pathAt: FIRST_ARGUMENT },
      ],
    },
    { kind: "element", name: "RouterLink", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "call", name: "onBeforeRouteLeave", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
    { kind: "call", name: "onBeforeRouteUpdate", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
  ],
}

export const wouterLibrary: CatalogueLibrary = {
  name: "Wouter",
  specifiers: ["wouter", "wouter/use-browser-location"],
  documentedVersion: "3.13",
  category: "routing",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "element", name: "Route", slots: [{ at: "component", runs: "page" }, { at: "children", runs: "page" }], pathAt: "path" },
    { kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: ["href", "to"] },
    { kind: "element", name: "Redirect", slots: [], makes: "navigation", pathAt: "to" },
    { kind: "call", name: "navigate", slots: [], makes: "navigation", pathAt: 0 },
  ],
}
