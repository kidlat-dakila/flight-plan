import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const LAST_ARGUMENT = "last"

const OTHER_ARGUMENTS = "rest"

const EVERY_METHOD = "*"

const THIRD_ARGUMENT = 2

export const adonisLibrary: CatalogueLibrary = {
  name: "Adonis",
  specifiers: ["@adonisjs/core", "@adonisjs/core/services/router", "@adonisjs/core/ace"],
  documentedVersion: "7.6",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.get", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "GET" },
    { kind: "call", name: "default.post", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "POST" },
    { kind: "call", name: "default.put", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "PUT" },
    { kind: "call", name: "default.patch", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "PATCH" },
    { kind: "call", name: "default.delete", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "DELETE" },
    { kind: "call", name: "default.resource", slots: [{ at: 1, runs: "route" }], from: "@adonisjs/core/services/router", pathAt: 0, method: "*" },
    { kind: "call", name: "default.group", slots: [{ at: 0, runs: "in-place" }], from: "@adonisjs/core/services/router" },
    {
      kind: "class",
      name: "BaseCommand",
      from: "@adonisjs/core/ace",
      members: [{ name: "run", runs: "command" }],
      methods: [],
    },
  ],
}

export const elysiaLibrary: CatalogueLibrary = {
  name: "Elysia",
  specifiers: ["elysia"],
  documentedVersion: "1.4",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Elysia",
      prefixAt: "prefix",
      methods: [
        { kind: "call", name: "get", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "POST" },
        { kind: "call", name: "put", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "PUT" },
        { kind: "call", name: "delete", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "DELETE" },
        { kind: "call", name: "patch", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "PATCH" },
        { kind: "call", name: "all", slots: [{ at: 1, runs: "route" }], pathAt: 0, method: "*" },
        { kind: "call", name: "group", slots: [{ at: "last", runs: "in-place" }], prefixAt: 0 },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "in-place" }] },
        { kind: "call", name: "onBeforeHandle", slots: [{ at: "last", runs: "middleware" }] },
        { kind: "call", name: "onError", slots: [{ at: "last", runs: "event" }] },
        { kind: "call", name: "ws", slots: [{ at: "message", runs: "route" }], pathAt: 0, method: "WEBSOCKET" },
        { kind: "call", name: "listen", slots: [{ at: "last", runs: "event" }] },
      ],
    },
  ],
}

export const h3Library: CatalogueLibrary = {
  name: "H3",
  specifiers: ["h3"],
  documentedVersion: "2.0",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "H3",
      methods: [
        { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "POST" },
        { kind: "call", name: "on", slots: [{ at: "last", runs: "route" }], pathAt: 1, methodAt: 0 },
        { kind: "call", name: "use", slots: [{ at: "rest", runs: "middleware" }], prefixAt: 0 },
        { kind: "call", name: "mount", slots: [], prefixAt: 0 },
      ],
    },
    { kind: "call", name: "onRequest", slots: [{ at: 0, runs: "middleware" }] },
  ],
}

export const hapiLibrary: CatalogueLibrary = {
  name: "Hapi",
  specifiers: ["@hapi/hapi"],
  documentedVersion: "21.4",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default.server",
      methods: [
        { kind: "call", name: "route", slots: [{ at: "handler", runs: "route" }], pathAt: "path", methodAt: "method" },
        { kind: "call", name: "ext", slots: [{ at: ["method", 1], runs: "middleware" }], eventAt: ["type", 0] },
        { kind: "call", name: "register", slots: [], prefixAt: "routes.prefix" },
        { kind: "call", name: "strategy", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const honoLibrary: CatalogueLibrary = {
  name: "Hono",
  specifiers: ["hono"],
  documentedVersion: "4.13",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Hono",
      methods: [
        { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "POST" },
        { kind: "call", name: "put", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "PUT" },
        { kind: "call", name: "delete", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "DELETE" },
        { kind: "call", name: "patch", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "PATCH" },
        { kind: "call", name: "all", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "*" },
        { kind: "call", name: "on", slots: [{ at: "last", runs: "route" }], pathAt: 1, methodAt: 0 },
        { kind: "call", name: "use", slots: [{ at: "rest", runs: "middleware" }], prefixAt: 0 },
        { kind: "call", name: "route", slots: [], prefixAt: 0 },
        { kind: "call", name: "basePath", slots: [], prefixAt: 0 },
        { kind: "call", name: "notFound", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "onError", slots: [{ at: 0, runs: "event" }] },
      ],
    },
  ],
}

export const moleculerLibrary: CatalogueLibrary = {
  name: "Moleculer",
  specifiers: ["moleculer"],
  documentedVersion: "0.15",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "ServiceBroker",
      methods: [
        { kind: "call", name: "call", slots: [], makes: "request", pathAt: 0 },
        { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "middleware" }] },
      ],
    },
  ],
}

export const nestLibrary: CatalogueLibrary = {
  name: "Nest",
  specifiers: ["@nestjs/common", "@nestjs/core", "@nestjs/microservices", "@nestjs/schedule", "@nestjs/websockets"],
  documentedVersion: "12.1",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "decorator", name: "Controller", prefixAt: 0 },
    { kind: "decorator", name: "Get", runs: "route", pathAt: 0, method: "GET" },
    { kind: "decorator", name: "Post", runs: "route", pathAt: 0, method: "POST" },
    { kind: "decorator", name: "Put", runs: "route", pathAt: 0, method: "PUT" },
    { kind: "decorator", name: "Delete", runs: "route", pathAt: 0, method: "DELETE" },
    { kind: "decorator", name: "Patch", runs: "route", pathAt: 0, method: "PATCH" },
    { kind: "decorator", name: "UseGuards", makes: "auth" },
    { kind: "decorator", name: "MessagePattern", runs: "event", eventAt: 0 },
    { kind: "decorator", name: "EventPattern", runs: "event", eventAt: 0 },
    { kind: "decorator", name: "Cron", runs: "job" },
    { kind: "decorator", name: "Interval", runs: "job" },
    { kind: "decorator", name: "SubscribeMessage", runs: "event", eventAt: 0 },
    { kind: "decorator", name: "Catch", runs: "event" },
    {
      kind: "factory",
      name: "NestFactory.create",
      methods: [
        { kind: "call", name: "useGlobalGuards", slots: [], makes: "auth" },
        { kind: "call", name: "setGlobalPrefix", slots: [], prefixAt: 0 },
        { kind: "call", name: "listen", slots: [{ at: "last", runs: "event" }] },
      ],
    },
  ],
}

const NEXT_SINCE_PROXY = ">=16"

export const nextLibrary: CatalogueLibrary = {
  name: "Next.js",
  specifiers: ["next", "next/navigation", "next/router", "next/link", "next/cache", "next/headers", "next/server"],
  documentedVersion: "16.4",
  category: "framework",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "file", glob: "{app,src/app}/**/page.{js,jsx,ts,tsx}", exports: [{ name: "default", runs: "page" }] },
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
      glob: "{pages,src/pages}/**/[!_]*.{js,jsx,ts,tsx}",
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

const REACT_CONTEXT_VALUE = "value"

const REACT_CHILDREN = "children"

export const reactLibrary: CatalogueLibrary = {
  name: "React",
  specifiers: ["react"],
  documentedVersion: "19.3",
  category: "framework",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useState", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], makes: "state" },
    {
      kind: "call",
      name: "useReducer",
      slots: [
        { at: FIRST_ARGUMENT, runs: "kept" },
        { at: THIRD_ARGUMENT, runs: "in-place" },
      ],
      makes: "state",
    },
    { kind: "call", name: "useActionState", slots: [{ at: FIRST_ARGUMENT, runs: "kept" }], makes: "state" },
    { kind: "call", name: "useOptimistic", slots: [{ at: SECOND_ARGUMENT, runs: "kept" }], makes: "state" },
    {
      kind: "call",
      name: "useSyncExternalStore",
      slots: [
        { at: FIRST_ARGUMENT, runs: "effect" },
        { at: SECOND_ARGUMENT, runs: "in-place" },
      ],
      makes: "state",
    },
    { kind: "call", name: "useEffect", slots: [{ at: FIRST_ARGUMENT, runs: "effect" }] },
    { kind: "call", name: "useLayoutEffect", slots: [{ at: FIRST_ARGUMENT, runs: "effect" }] },
    { kind: "call", name: "useInsertionEffect", slots: [{ at: FIRST_ARGUMENT, runs: "effect" }] },
    { kind: "call", name: "useImperativeHandle", slots: [{ at: SECOND_ARGUMENT, runs: "effect" }] },
    { kind: "call", name: "useMemo", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "useCallback", slots: [{ at: FIRST_ARGUMENT, runs: "kept" }] },
    { kind: "call", name: "startTransition", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }] },
    {
      kind: "factory",
      name: "createContext",
      provides: { valueAt: REACT_CONTEXT_VALUE },
      methods: [
        { kind: "element", name: "Provider", slots: [], provides: { valueAt: REACT_CONTEXT_VALUE } },
        { kind: "element", name: "Consumer", slots: [{ at: REACT_CHILDREN, runs: "in-place" }], reads: {} },
      ],
    },
    { kind: "call", name: "useContext", slots: [], reads: { keyAt: FIRST_ARGUMENT } },
    { kind: "call", name: "use", slots: [], reads: { keyAt: FIRST_ARGUMENT } },
  ],
}

export const reactDomLibrary: CatalogueLibrary = {
  name: "React DOM",
  specifiers: ["react-dom", "react-dom/client"],
  documentedVersion: "19.3",
  category: "framework",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createPortal", slots: [], makes: "config" },
    { kind: "call", name: "flushSync", slots: [{ at: 0, runs: "in-place" }] },
    {
      kind: "factory",
      name: "createRoot",
      methods: [
        { kind: "call", name: "render", slots: [], makes: "config" },
      ],
    },
    { kind: "call", name: "hydrateRoot", slots: [], makes: "config" },
  ],
}

const VUE_HOOK_SLOTS: readonly Slot[] = [{ at: FIRST_ARGUMENT, runs: "effect" }]

export const vueLibrary: CatalogueLibrary = {
  name: "Vue",
  specifiers: ["vue"],
  documentedVersion: "3.5",
  category: "framework",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "ref", slots: [], makes: "state" },
    { kind: "call", name: "shallowRef", slots: [], makes: "state" },
    { kind: "call", name: "reactive", slots: [], makes: "state" },
    { kind: "call", name: "shallowReactive", slots: [], makes: "state" },
    {
      kind: "call",
      name: "computed",
      slots: [
        { at: FIRST_ARGUMENT, runs: "in-place" },
        { at: "get", runs: "in-place" },
        { at: "set", runs: "kept" },
      ],
      makes: "derived",
    },
    {
      kind: "call",
      name: "watch",
      slots: [
        { at: FIRST_ARGUMENT, runs: "in-place" },
        { at: SECOND_ARGUMENT, runs: "effect" },
      ],
    },
    { kind: "call", name: "watchEffect", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "watchPostEffect", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "watchSyncEffect", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onBeforeMount", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onMounted", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onBeforeUpdate", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onUpdated", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onBeforeUnmount", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onUnmounted", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onActivated", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onDeactivated", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onErrorCaptured", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "onServerPrefetch", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "nextTick", slots: VUE_HOOK_SLOTS },
    { kind: "call", name: "provide", slots: [], provides: { keyAt: FIRST_ARGUMENT, valueAt: SECOND_ARGUMENT } },
    {
      kind: "factory",
      name: "createApp",
      methods: [{ kind: "call", name: "provide", slots: [], provides: { keyAt: FIRST_ARGUMENT, valueAt: SECOND_ARGUMENT } }],
    },
    {
      kind: "call",
      name: "defineComponent",
      slots: [
        { at: "data", runs: "in-place" },
        { at: "computed.*", runs: "in-place" },
        { at: "methods.*", runs: "kept" },
        { at: "watch.*", runs: "effect" },
        { at: "mounted", runs: "effect" },
      ],
    },
    { kind: "call", name: "inject", slots: [], reads: { keyAt: FIRST_ARGUMENT } },
  ],
}

export const koaLibrary: CatalogueLibrary = {
  name: "Koa",
  specifiers: ["koa"],
  documentedVersion: "3.2",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [{ kind: "call", name: "use", slots: [{ at: FIRST_ARGUMENT, runs: "middleware" }] }],
    },
  ],
}

const KOA_ROUTER_PREFIX = "prefix"

const KOA_ROUTER_HANDLERS: readonly Slot[] = [
  { at: LAST_ARGUMENT, runs: "route" },
  { at: OTHER_ARGUMENTS, runs: "middleware" },
]

export const koaRouterLibrary: CatalogueLibrary = {
  name: "Koa Router",
  specifiers: ["@koa/router"],
  documentedVersion: "15.7",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      prefixAt: KOA_ROUTER_PREFIX,
      methods: [
        { kind: "call", name: "get", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "GET" },
        { kind: "call", name: "post", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "POST" },
        { kind: "call", name: "put", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "PUT" },
        { kind: "call", name: "patch", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "PATCH" },
        { kind: "call", name: "delete", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "DELETE" },
        { kind: "call", name: "del", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "DELETE" },
        { kind: "call", name: "head", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "HEAD" },
        { kind: "call", name: "options", slots: KOA_ROUTER_HANDLERS, pathAt: FIRST_ARGUMENT, method: "OPTIONS" },
        { kind: "call", name: "use", slots: [{ at: OTHER_ARGUMENTS, runs: "middleware" }] },
      ],
    },
  ],
}
