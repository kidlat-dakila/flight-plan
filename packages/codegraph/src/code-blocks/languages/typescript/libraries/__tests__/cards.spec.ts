import { codeOf, groupOf } from "@/code-blocks/__tests__/group-fixture"
import { EVERY_PATH_PATTERN, pathPatternOf } from "@/code-blocks/languages/typescript/libraries/nextjs-matcher"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"

describe("the cards Express writes", () => {
  it("makes each registration a holder of the route path, its last function the handler and those before it middleware, under its method", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf(
        "import express from \"express\"",
        "const router = express.Router()",
        "router.post(\"/api/users\", requireSession, async (req, res) => { await save(req.body) })",
        "router.route(\"/api/items\").get((req, res) => res.json([]))",
      ),
    })).toStrictEqual([
      "route: Express route holder under POST at /api/users",
      "1: Express route middleware under POST at /api/users",
      "(req, res) => …: Express route handler under POST at /api/users",
      "route: Express route holder under GET at /api/items",
      "(req, res) => …: Express route handler under GET at /api/items",
    ])
  })

  it("gives a handler named from another file the card of the registration that names it", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf("import express from \"express\"", "import { listUsers } from \"./list\"", "const router = express.Router()", "router.get(\"/api/users\", listUsers)"),
      "server/list.ts": codeOf("export const listUsers = async (req, res) => {", "  res.json(await findUsers())", "}"),
    })).toContain("listUsers: Express route handler under GET at /api/users in route")
  })
})

describe("the cards Fastify writes", () => {
  it("makes the handler and the preHandler of a route its handler and its middleware", () => {
    expect(cardsOf({
      "server/app.ts": codeOf(
        "import Fastify from \"fastify\"",
        "const app = Fastify()",
        "app.route({ method: \"PATCH\", url: \"/api/users\", preHandler: async (request) => check(request), handler: async (request) => save(request.body) })",
      ),
    })).toStrictEqual([
      "route: Fastify route holder under PATCH at /api/users",
      "(request) => …: Fastify route middleware under PATCH at /api/users",
      "(request) => …: Fastify route handler under PATCH at /api/users",
    ])
  })
})

const NEXT_MANIFEST = JSON.stringify({ dependencies: { next: "16.0.0" } })

describe("the cards Next.js writes", () => {
  it("makes each exported method of a route file a handler of the path its folders give, under its method", () => {
    expect(cardsOf({
      "package.json": NEXT_MANIFEST,
      "app/api/users/[id]/route.ts": codeOf(
        "export async function GET(request, { params }) {",
        "  return Response.json(await findUser(params.id))",
        "}",
        "export const DELETE = async (request, { params }) => {",
        "  await removeUser(params.id)",
        "}",
        "const helper = () => null",
      ),
    })).toStrictEqual([
      "GET: Next.js route handler under GET at /api/users/[id]",
      "DELETE: Next.js route handler under DELETE at /api/users/[id]",
    ])
  })

  it("puts a function exported under several methods under one heading that names them all", () => {
    expect(cardsOf({
      "package.json": NEXT_MANIFEST,
      "src/app/api/auth/route.ts": codeOf("const handler = async (request) => Response.json(await auth(request))", "export { handler as GET, handler as POST }"),
    })).toStrictEqual(["handler: Next.js route handler under GET · POST at /api/auth"])
  })

  it("makes the default export of an API page a handler under ANY, its path read from the file", () => {
    expect(cardsOf({
      "package.json": NEXT_MANIFEST,
      "pages/api/posts/[id].ts": codeOf("export default async function handler(req, res) {", "  res.json(await findPost(req.query.id))", "}"),
      "pages/api/posts/index.ts": codeOf("export default async function listPosts(req, res) {", "  res.json(await findPosts())", "}"),
    })).toStrictEqual([
      "handler: Next.js route handler under ANY at /api/posts/[id]",
      "listPosts: Next.js route handler under ANY at /api/posts",
    ])
  })

  it("makes a function a \"use server\" directive names a server action under POST, with no path", () => {
    expect(cardsOf({
      "app/actions.ts": codeOf("\"use server\"", "export async function createUser(formData) {", "  await saveUser(formData)", "}", "function helper() {}"),
      "app/posts/page.tsx": codeOf(
        "export default function PostsPage() {",
        "  async function createPost(formData) {",
        "    \"use server\"",
        "    await savePost(formData)",
        "  }",
        "  return <form action={createPost} />",
        "}",
      ),
    })).toStrictEqual([
      "createUser: Next.js route server-action under POST",
      "createPost: Next.js route server-action under POST",
    ])
  })

  it("makes the default export of a page a page of the path its folders give, and of a layout nothing", () => {
    expect(cardsOf({
      "package.json": NEXT_MANIFEST,
      "app/dashboard/page.tsx": codeOf("export default function DashboardPage() {", "  return <h1>Dashboard</h1>", "}"),
      "app/dashboard/layout.tsx": codeOf("export default function DashboardLayout({ children }) {", "  return <main>{children}</main>", "}"),
      "pages/about.tsx": codeOf("export default function About() {", "  return <h1>About</h1>", "}", "export async function getStaticProps() {", "  return { props: {} }", "}"),
    })).toStrictEqual([
      "DashboardPage: Next.js route page at /dashboard",
      "About: Next.js route page at /about",
    ])
  })

  it("makes the middleware of the app middleware of every path its matcher reaches, and of every path with no matcher", () => {
    const pathPatternsOf = (files: Readonly<Record<string, string>>): readonly string[] | undefined =>
      groupOf(files).codeBlocks.find((block) => block.card?.part === "middleware")?.card?.routePatterns?.map(({ pathPattern }) => pathPattern)

    expect(cardsOf({ "package.json": NEXT_MANIFEST, "middleware.ts": codeOf("export function middleware(request) {", "  return check(request)", "}") }))
      .toStrictEqual(["middleware: Next.js route middleware"])
    expect(pathPatternsOf({ "package.json": NEXT_MANIFEST, "middleware.ts": codeOf("export function middleware(request) {}") })).toStrictEqual([EVERY_PATH_PATTERN])
    expect(pathPatternsOf({
      "package.json": NEXT_MANIFEST,
      "middleware.ts": codeOf("export function middleware(request) {}", "export const config = { matcher: [\"/dashboard/:path*\", { source: \"/api/:path*\" }] }"),
    })).toStrictEqual([pathPatternOf("/dashboard/:path*"), pathPatternOf("/api/:path*")])
    expect(pathPatternsOf({
      "package.json": NEXT_MANIFEST,
      "proxy.ts": codeOf("export function proxy(request) {}", "export const config = { matcher: \"/{blog}\" }"),
    })).toStrictEqual([EVERY_PATH_PATTERN])
  })

  it("writes no route card without a manifest that lists Next.js", () => {
    expect(cardsOf({ "app/api/users/route.ts": codeOf("export async function GET() {", "  return Response.json([])", "}") })).toStrictEqual([])
  })
})

const NEST_CONTROLLER = codeOf(
  "import { Body, Controller, Get, Post, UseGuards, UseInterceptors, Version } from \"@nestjs/common\"",
  "@UseGuards(AuthGuard)",
  "@Controller({ path: \"users\", version: \"1\" })",
  "export class UsersController {",
  "  @UseInterceptors(LoggingInterceptor, new CacheInterceptor())",
  "  @Get()",
  "  findAll() {",
  "    return []",
  "  }",
  "  @Version(\"2\")",
  "  @Post(\":id\")",
  "  save(@Body() body) {",
  "    return body",
  "  }",
  "}",
)

describe("the cards Nest writes", () => {
  it("makes each decorated method a handler of the path its controller and its decorator give, and what its decorators hand middleware of it", () => {
    expect(cardsOf({ "src/users.controller.ts": NEST_CONTROLLER })).toStrictEqual([
      "0: Nest route middleware",
      "UsersController: Nest route controller",
      "effect: Nest route middleware under GET at /users in UsersController.findAll",
      "0: Nest route middleware under GET at /users in UsersController.findAll",
      "UsersController.findAll: Nest route handler under GET at /users",
      "UsersController.save: Nest route handler under POST at /users/:id",
    ])
  })

  it("gives a handler the version of its own decorator, or else of its controller", () => {
    const handlers = groupOf({ "src/users.controller.ts": NEST_CONTROLLER }).codeBlocks.filter((block) => block.card?.part === "handler")

    expect(handlers.map((block) => [block.name, block.card?.versions])).toStrictEqual([["UsersController.findAll", ["1"]], ["UsersController.save", ["2"]]])
  })

  it("gives a handler every version of a list, and no version for VERSION_NEUTRAL, written on the method or on its controller", () => {
    const controller = NEST_CONTROLLER
      .replace("@Controller({ path: \"users\", version: \"1\" })", "@Controller({ path: \"users\", version: VERSION_NEUTRAL })")
      .replace("@Version(\"2\")", "@Version([\"2\", \"3\"])")
    const handlers = groupOf({ "src/users.controller.ts": controller }).codeBlocks.filter((block) => block.card?.part === "handler")

    expect(handlers.map((block) => [block.name, block.card?.versions])).toStrictEqual([["UsersController.findAll", []], ["UsersController.save", ["2", "3"]]])
  })

  it("makes a version neutral in a list leave the list with the versions it names", () => {
    const controller = NEST_CONTROLLER.replace("@Version(\"2\")", "@Version([VERSION_NEUTRAL, \"2\"])")
    const save = groupOf({ "src/users.controller.ts": controller }).codeBlocks.find((block) => block.name === "UsersController.save")

    expect(save?.card?.versions).toStrictEqual(["2"])
  })

  it("makes the app's prefix and URI versioning parts of the whole app, and its global enhancers middleware of it", () => {
    expect(cardsOf({
      "src/main.ts": codeOf(
        "import { NestFactory } from \"@nestjs/core\"",
        "const app = await NestFactory.create(AppModule)",
        "app.setGlobalPrefix(\"api\", { exclude: [\"health\", { path: \"status\", method: RequestMethod.GET }] })",
        "app.enableVersioning({ type: VersioningType.URI, defaultVersion: \"1\" })",
        "app.useGlobalGuards(new RolesGuard())",
      ),
    })).toStrictEqual([
      "config: Nest route mount at api",
      "config: Nest route versioning at v",
      "auth: Nest route middleware",
    ])
  })

  it("reads the method of an exclusion written as a path and a method, and none for RequestMethod.ALL", () => {
    const [mount] = groupOf({
      "src/main.ts": codeOf(
        "import { NestFactory } from \"@nestjs/core\"",
        "const app = await NestFactory.create(AppModule)",
        "app.setGlobalPrefix(\"api\", { exclude: [\"health\", { path: \"status\", method: RequestMethod.GET }, { path: \"ping\", method: RequestMethod.ALL }] })",
      ),
    }).codeBlocks.filter((block) => block.card?.part === "mount")

    expect(mount.card?.excludedRoutePatterns).toStrictEqual([
      { pathPattern: "^/health/?$", method: null },
      { pathPattern: "^/status/?$", method: "GET" },
      { pathPattern: "^/ping/?$", method: null },
    ])
  })

  it("makes versioning by a header a part with no path prefix, holding the default versions", () => {
    const [versioning] = groupOf({
      "src/main.ts": codeOf(
        "import { NestFactory } from \"@nestjs/core\"",
        "const app = await NestFactory.create(AppModule)",
        "app.enableVersioning({ type: VersioningType.HEADER, header: \"X-API-Version\", defaultVersion: [\"1\", \"2\"] })",
      ),
    }).codeBlocks.filter((block) => block.card?.part === "versioning")

    expect([versioning.card?.groupKey, versioning.card?.versions]).toStrictEqual([null, ["1", "2"]])
  })

  it("makes the modules RouterModule names mounts under their whole path, the controllers of a module mounts of it, and an enhancer it provides middleware of every path", () => {
    expect(cardsOf({
      "src/app.module.ts": codeOf(
        "import { Module } from \"@nestjs/common\"",
        "import { RouterModule } from \"@nestjs/core\"",
        "@Module({",
        "  imports: [RouterModule.register([{ path: \"admin\", module: AdminModule, children: [{ path: \"metrics\", module: MetricsModule }] }])],",
        "  controllers: [HealthController],",
        "  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],",
        "})",
        "export class AppModule {}",
      ),
    })).toStrictEqual([
      "imports: Nest route mount",
      "module: Nest route mount at /admin",
      "module: Nest route mount at /admin/metrics",
      "controllers: Nest route mount",
      "useClass: Nest route middleware",
    ])
  })

  it("makes the imports of a module a mount on no router, and its controllers a mount on the module", () => {
    const mounts = groupOf({
      "src/app.module.ts": codeOf(
        "import { Module } from \"@nestjs/common\"",
        "@Module({ imports: [UsersModule], controllers: [HealthController] })",
        "export class AppModule {}",
      ),
    }).codeBlocks.filter((block) => block.card?.part === "mount")

    expect(mounts.map((block) => [block.name, block.card?.isOnNoRouter ?? false])).toStrictEqual([["imports", true], ["controllers", false]])
  })

  it("makes what a consumer applies middleware of the routes it is chosen for", () => {
    const [middleware] = groupOf({
      "src/app.module.ts": codeOf(
        "import { MiddlewareConsumer, Module } from \"@nestjs/common\"",
        "@Module({})",
        "export class AppModule {",
        "  configure(consumer: MiddlewareConsumer) {",
        "    consumer.apply(LoggerMiddleware).exclude(\"cats/health\").forRoutes(CatsController, \"dogs/*\")",
        "  }",
        "}",
      ),
    }).codeBlocks.filter((block) => block.card?.part === "middleware")

    expect([middleware.name, middleware.card?.routePatterns, middleware.card?.excludedRoutePatterns]).toStrictEqual([
      "0",
      [{ pathPattern: "^/dogs\\/.*/?$", method: null }],
      [{ pathPattern: "^/cats\\/health/?$", method: null }],
    ])
  })

  it("reads the method of a route a consumer chooses by path and method", () => {
    const [middleware] = groupOf({
      "src/app.module.ts": codeOf(
        "import { MiddlewareConsumer, Module } from \"@nestjs/common\"",
        "@Module({})",
        "export class AppModule {",
        "  configure(consumer: MiddlewareConsumer) {",
        "    consumer.apply(LoggerMiddleware).forRoutes({ path: \"cats\", method: RequestMethod.GET })",
        "  }",
        "}",
      ),
    }).codeBlocks.filter((block) => block.card?.part === "middleware")

    expect(middleware.card?.routePatterns).toStrictEqual([{ pathPattern: "^/cats/?$", method: "GET" }])
  })

  it("makes a GraphQL resolver a router, each method a query, a mutation, a subscription or a field resolves under its heading", () => {
    expect(cardsOf({
      "src/users.resolver.ts": codeOf(
        "import { Args, Mutation, Query, ResolveField, Resolver, Subscription } from \"@nestjs/graphql\"",
        "@Resolver(() => User)",
        "export class UsersResolver {",
        "  @Query(() => [User])",
        "  users() {",
        "    return []",
        "  }",
        "  @Mutation(() => User)",
        "  addUser(@Args(\"name\") name: string) {",
        "    return { name }",
        "  }",
        "  @Subscription(() => User)",
        "  userAdded() {",
        "    return watch()",
        "  }",
        "  @ResolveField()",
        "  posts() {",
        "    return []",
        "  }",
        "}",
      ),
    })).toStrictEqual([
      "UsersResolver: Nest router holder",
      "UsersResolver.users: Nest router procedure under QUERY",
      "UsersResolver.addUser: Nest router procedure under MUTATION",
      "UsersResolver.userAdded: Nest router procedure under SUBSCRIPTION",
      "UsersResolver.posts: Nest router procedure under FIELD",
    ])
  })
})

describe("the cards tRPC writes", () => {
  it("makes a value that holds procedures a router, each procedure a part under its type, and a procedure that adds a use a base", () => {
    expect(cardsOf({
      "server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router", "export const authed = t.procedure.use(isAuthed)"),
      "server/todo.ts": codeOf(
        "import { router, authed } from \"./trpc\"",
        "export const todoRouter = router({",
        "  list: authed.query(() => findTodos()),",
        "  add: authed.mutation(() => addTodo()),",
        "  added: authed.subscription(async function* () { yield* watch() }),",
        "})",
        "export const appRouter = router({ todo: todoRouter })",
      ),
    })).toStrictEqual([
      "authed: tRPC router middleware",
      "todoRouter: tRPC router holder",
      "resolver: tRPC router procedure under QUERY",
      "resolver: tRPC router procedure under MUTATION",
      "resolver: tRPC router procedure under SUBSCRIPTION",
      "appRouter: tRPC router holder",
    ])
  })
})

describe("the cards Zustand writes", () => {
  it("makes the value of create the store, its values its state and its functions its actions, through persist", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { persist } from \"zustand/middleware\"",
        "export const useCartStore = create(persist((set) => ({",
        "  items: [],",
        "  clear: () => set({ items: [] }),",
        "}), { name: \"cart\" }))",
        "export const selectCount = (state) => state.items.length",
      ),
      "ui/count.tsx": codeOf("import { useCartStore, selectCount } from \"../store/cart\"", "export const Count = () => {", "  const count = useCartStore(selectCount)", "  return <b>{count}</b>", "}"),
    })).toStrictEqual([
      "useCartStore: Zustand store holder",
      "items: Zustand store state under STATE",
      "clear: Zustand store action under ACTIONS",
      "selectCount: Zustand store selector under SELECTORS in useCartStore",
    ])
  })
})

describe("the cards Zustand leaves out", () => {
  it("makes nothing of a component that calls a store with a selector written in place", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf("import { create } from \"zustand\"", "export const useCartStore = create((set) => ({ items: [] }))"),
      "ui/cart.tsx": codeOf("import { useCartStore } from \"../store/cart\"", "export const Cart = () => {", "  const items = useCartStore((state) => state.items)", "  return <ul>{items}</ul>", "}"),
    })).toStrictEqual(["useCartStore: Zustand store holder", "items: Zustand store state under STATE"])
  })
})

describe("the cards Zustand writes through devtools", () => {
  it("reads the store through devtools as through persist", () => {
    expect(cardsOf({
      "store/bears.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { devtools } from \"zustand/middleware\"",
        "export const useBearStore = create(devtools((set) => ({ bears: 0, addBear: () => set((state) => ({ bears: state.bears + 1 })) })))",
      ),
    })).toStrictEqual(["useBearStore: Zustand store holder", "bears: Zustand store state under STATE", "addBear: Zustand store action under ACTIONS"])
  })
})

describe("the cards Pinia writes", () => {
  it("makes the state, the getters and the actions of an options store and of a setup store its parts", () => {
    expect(cardsOf({
      "stores/cart.ts": codeOf(
        "import { defineStore } from \"pinia\"",
        "import { ref, computed } from \"vue\"",
        "export const useCartStore = defineStore(\"cart\", {",
        "  state: () => ({ items: [] }),",
        "  getters: { count: (state) => state.items.length },",
        "  actions: { clear() { this.items = [] } },",
        "})",
        "export const useWishlistStore = defineStore(\"wishlist\", () => {",
        "  const items = ref([])",
        "  const count = computed(() => items.value.length)",
        "  function add(product) { items.value.push(product) }",
        "  return { items, count, add }",
        "})",
      ),
    })).toStrictEqual([
      "useCartStore: Pinia store holder",
      "items: Pinia store state under STATE",
      "count: Pinia store getter under GETTERS",
      "clear: Pinia store action under ACTIONS",
      "useWishlistStore: Pinia store holder",
      "items: Pinia store state under STATE",
      "count: Pinia store getter under GETTERS",
      "add: Pinia store action under ACTIONS",
    ])
  })
})

describe("the cards Redux Toolkit writes", () => {
  it("makes a slice a store keyed by its name, and links the thunk, the listener and the selectors written beside it", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf(
        "import { createSlice, createAsyncThunk, createSelector, configureStore, createListenerMiddleware } from \"@reduxjs/toolkit\"",
        "export const checkout = createAsyncThunk(\"cart/checkout\", async (items) => post(items))",
        "const cartSlice = createSlice({",
        "  name: \"cart\",",
        "  initialState: { items: [] },",
        "  reducers: { clear: (state) => { state.items = [] } },",
        "  extraReducers: (builder) => { builder.addCase(checkout.fulfilled, (state) => { state.items.splice(0) }) },",
        "})",
        "const listener = createListenerMiddleware()",
        "listener.startListening({ actionCreator: cartSlice.actions.clear, effect: () => save() })",
        "export const selectItems = (state) => state.cart.items",
        "export const selectCount = createSelector([selectItems], (items) => items.length)",
        "export const store = configureStore({ reducer: { cart: cartSlice.reducer } })",
      ),
    })).toStrictEqual([
      "checkout: Redux store thunk under THUNKS in cartSlice",
      "cartSlice: Redux store holder at cart",
      "items: Redux store state under STATE",
      "clear: Redux store reducer under REDUCERS",
      "checkout.fulfilled: Redux store extra-reducer under EXTRA REDUCERS",
      "clear listener: Redux store listener under LISTENERS in cartSlice",
      "selectItems: Redux store selector under SELECTORS in cartSlice",
      "selectCount: Redux store selector under SELECTORS in cartSlice",
      "store: Redux store holder",
    ])
  })

  it("makes the state of an entity adapter one state of the slice, a reducer it gives a reducer, and a selector it gives a selector of the slice it reads", () => {
    expect(cardsOf({
      "store/todos.ts": codeOf(
        "import { createEntityAdapter, createSlice } from \"@reduxjs/toolkit\"",
        "const todosAdapter = createEntityAdapter()",
        "export const todosSlice = createSlice({",
        "  name: \"todos\",",
        "  initialState: todosAdapter.getInitialState({ filter: \"all\" }),",
        "  reducers: { todoAdded: todosAdapter.addOne },",
        "})",
        "export const { selectAll: selectAllTodos } = todosAdapter.getSelectors((state) => state.todos)",
      ),
    })).toStrictEqual([
      "todosSlice: Redux store holder at todos",
      "todosAdapter.getInitialState(): Redux store state under STATE",
      "filter: Redux store state under STATE",
      "todoAdded: Redux store reducer under REDUCERS",
      "selectAllTodos: Redux store selector under SELECTORS in todosSlice",
    ])
  })

  it("makes the initial state of createReducer its state and each addCase a case, named after its action", () => {
    expect(cardsOf({
      "store/counter.ts": codeOf(
        "import { createReducer } from \"@reduxjs/toolkit\"",
        "export const counterReducer = createReducer({ value: 0 }, (builder) => {",
        "  builder.addCase(increment, (state) => { state.value += 1 })",
        "})",
      ),
    })).toStrictEqual([
      "counterReducer: Redux store holder",
      "value: Redux store state under STATE",
      "increment: Redux store case under CASES",
    ])
  })
})

describe("the cards RTK Query writes", () => {
  it("makes the value of createApi an API, each endpoint a part under its type, and an injected endpoint a part of the API it is injected into", () => {
    expect(cardsOf({
      "store/api.ts": codeOf(
        "import { createApi } from \"@reduxjs/toolkit/query/react\"",
        "export const api = createApi({",
        "  endpoints: (build) => ({",
        "    getTodos: build.query({ query: () => \"todos\" }),",
        "    addTodo: build.mutation({ query: (todo) => ({ url: \"todos\", method: \"POST\", body: todo }) }),",
        "  }),",
        "})",
      ),
      "store/more.ts": codeOf("import { api } from \"./api\"", "export const moreApi = api.injectEndpoints({ endpoints: (build) => ({ getDone: build.query({ query: () => \"done\" }) }) })"),
    })).toStrictEqual([
      "api: RTK Query api holder",
      "getTodos: RTK Query api endpoint under QUERY",
      "addTodo: RTK Query api endpoint under MUTATION",
      "getDone: RTK Query api endpoint under QUERY in api",
    ])
  })
})
