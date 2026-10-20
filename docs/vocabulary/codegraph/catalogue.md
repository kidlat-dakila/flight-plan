# Catalogue

## Definition

The catalogue says what a call into a library means: when a callback handed to it runs, and whether it is an entry into the app. It is how the codegraph names the top of a chain across languages and frameworks without a rule written for each.

The catalogue is data, not code. It holds patterns, and the codegraph applies them to the code of every change.

## What the catalogue decides, and what it never does

| Decided by | What |
|---|---|
| The code, always | Which block uses which, who runs what inside the repository, what is the top of a chain, and which [segment](segments.md) a file is in |
| The catalogue | What kind the top of a chain or a callback is, and its path, method or event |
| The catalogue | Whether a call is a block of a type only a library can say: `state`, `derived`, `data`, `cache`, `auth`, `request`, `navigation`, `publish`, `validation`, `config`, `feature-flag`, `storage`, `telemetry`, `transaction`, `route`, `resolver`, `middleware` |

A pattern never decides which block uses which, who runs what inside the repository, or which segment a file is in. `createUser` handed to `router.post` is the top of a chain with or without a pattern, because nothing in the repository runs it. The pattern turns its label from `unknown` into `POST /users`.

A pattern does two things beyond a label, and both only add:

- **It makes a call a block of its own.** `prisma.user.findMany()` is a `data-fetch` block with a pattern, and lines of the block around it without one. The blocks around it, their symbols and their chains are the same either way.
- **It gives a block the path, the method or the event that lets it be one half of a pair.** A `request` and a `route` with the same method and path are joined, and a chain carries on across them as an assumed step. See [Blocks that pair across a boundary](block-types.md#blocks-that-pair-across-a-boundary).

So a pattern that is wrong or missing costs a label, a block type or a join across a boundary, and never a use, a step inside the repository or a segment. A repository with no catalogue at all has correct structure and correct segments, with `unknown` where a pattern would have named the entry.

**What a match leaves behind.** A block a pattern matched keeps what the pattern said, in its `catalogue` field: the library, the name, when the callback runs, and the path and method of a route. See [What the catalogue leaves on a block](code-blocks.md#what-the-catalogue-leaves-on-a-block).

## A pattern, not a list

A pattern describes how something looks. It never lists where it is. A list of route files is out of date when the next route is added, and a pattern is not.

| Shape | Example in code | What the pattern says |
|---|---|---|
| A call | `router.post("/users", createUser)` | A call to `get`, `post`, `put`, `patch` or `delete` on a value that comes from `express`. The path is the first argument and the handler the last. |
| A call | `useMutation({ mutationFn, onSuccess })` | A call to `useMutation` from `@tanstack/react-query`. `mutationFn` runs when the result's `mutate` is called. |
| A decorator | `@Get("/users")`, `@app.get("/users")` | A decorator of that name from that library, or a method of that name on a value the library made. The path is its argument and the handler is what it decorates. |
| An element | `<Link href="/cart">`, `<ThemeContext value={theme}>` | An element of that name from that library, or of a value the library made. An attribute holds the path, or the value it provides. |
| A file convention | `app/users/page.tsx`, `pages/api/users.ts` | Files that match a glob. The default export is a page, or the exports named `GET` and `POST` are handlers, and the path comes from the path of the file. |
| A class | `class User extends Model`, `class MainHandler(RequestHandler)` | A class that extends that export of the library. The methods the class defines that the library runs, such as `get` of a request handler, and the calls on the class and on what is made from it, such as `User.findAll()`. |
| A directive | `"use server"` | A file or a function that starts with that text. Every export of the file, or the function, is what the pattern says it runs. |

A pattern matches a name through its import, never by the name alone: the specifier and the name the library exports. A name is also a member of an export, written with a dot: `cache.get` is `get` of the `cache` that `django.core.cache` exports, `transaction.atomic` is `atomic` of `transaction` from `django.db`, and `default.get` is `get` of the default export, as in `axios.get`. A local function that happens to be called `useMutation` does not match, and an alias of the real one does. See [A name the group cannot open](symbols.md#a-name-the-group-cannot-open).

## A value a library makes

Some libraries hand back a value, and the hooks are its members: `trpc.users.list.useQuery()`, `api.useGetUsersQuery()`. The callee is not an import, so it takes two patterns that belong together.

| Pattern | Says | Matches |
|---|---|---|
| A factory | A call to `createTRPCReact` from `@trpc/react-query` makes a tRPC client | `createTRPCReact<AppRouter>()` |
| A method of what the factory made | A method named `useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useSuspenseInfiniteQuery` or `useMutation`, at any depth below the client | `trpc.users.list.useQuery()` |
| A factory | A call to `createApi` from `@reduxjs/toolkit/query/react` makes an API | `createApi({ … })` |
| A method of what the factory made | A method whose name fits `use*Query`, `useLazy*Query` or `use*Mutation` | `api.useGetUsersQuery()` |

A method pattern looks at the last name of the member path, and may hold a wildcard.

A method is a call or a decorator. `app = FastAPI()` makes a value, and `@app.get("/users")` is a decorator that is a method of it:

```ts
{
  specifiers: ["fastapi"],
  patterns: [
    { kind: "factory", name: "FastAPI", methods: [
      { kind: "decorator", name: "get", runs: "route", pathAt: 0, method: "GET" },
      { kind: "decorator", name: "middleware", runs: "middleware" },
    ] },
  ],
}
```

A factory named `default` is the default export of the library, such as `express()`. A member of the default export is the export of that name: `express.Router()` is a call to `Router`.

**A factory is a call or a `new`.** `new PrismaClient()`, `new Hono()` and `FastAPI()` each make a value, and one factory pattern holds for both ways of writing it. A factory has slots when what it is handed runs later: the second argument of `new Worker("Paint", paintCar)` is a job.

**A factory names the type of the value it makes, in `makesType`,** when code writes that type instead of making the value. The `default` factory of Fastify says `makesType: "FastifyInstance"`, so the first parameter of `async function userRoutes(fastify: FastifyInstance)` is a value `Fastify()` made, and `fastify.get(…)` in it is a route, in whatever file the plugin is registered. A parameter at any position takes its type, in TypeScript and in Python: `Session` of SQLAlchemy makes `session` in `def create_pokemon(draft: PokemonCreate, session: Session)` a session, so `session.add(…)` and `session.commit()` are its methods, and `PrismaClient`, `DataSource` of TypeORM, `Sequelize`, `Kysely` and `Knex` do the same for a parameter written with them. A Python annotation is read when it is a name or a member of one, `Session` or `orm.Session`, and through `Annotated`: `session: Annotated[Session, Depends(get_session)]` is a `Session`, and so is `session: SessionDep` when `SessionDep = Annotated[Session, Depends(get_session)]` is written in that file or imported from another. **A member of `this` or `self` takes what its class declares it as.** `this.users.findOneBy(…)` in a class whose constructor says `private readonly users: Repository<User>`, or whose field says `users: Repository<User>`, is a method of a `Repository`; so is one the class assigns, `this.db = new PrismaClient()`, and in Python `self.session.add(…)` after `self.session = session` in a method whose parameter is `session: Session`, or with `session: Session` written in the class body. A type no code makes by calling is a factory that says `isTypeOnly`, as TypeORM's `Repository` and `EntityManager` and MikroORM's `EntityManager` do. **It names the types of a function that is handed the value, in `parameterOfTypes`:** Fastify lists `FastifyPluginAsync` and `FastifyPluginCallback`, so the first parameter of `const userRoutes: FastifyPluginAsync = async (fastify) => …` is such a value too. **A factory no code calls says `isTypeOnly`:** `MiddlewareConsumer` of NestJS is only ever the type of a parameter, so `consumer.apply(LoggerMiddleware)` in `configure(consumer: MiddlewareConsumer)` is its method `apply`.

**A factory says what the value it makes is when the value itself is called**, in `called`. It holds for a call and for a tagged template:

| Code | The factory | `called` says |
|---|---|---|
| ``sql`select * from users` `` | `postgres` | The value used as a tag is a `data` block |
| `useBearStore((state) => state.bears)` | `create` of `zustand` | The call reads state, and its first argument runs in place |
| `navigate("/logout")` | `useNavigate` | The call is a `navigation`, with the path first |

```ts
{
  specifiers: ["postgres"],
  patterns: [
    { kind: "factory", name: "default", methods: [
      { kind: "call", name: "begin", slots: [{ at: "last", runs: "in-place" }], makes: "transaction" },
    ], called: { slots: [], makes: "data" } },
  ],
}
```

A method is also a factory, when a call on the value makes another value: `router.route("/users/:id")` makes a route whose `get` and `post` take handlers and no path.

**A factory or a call names a prefix with `prefixAt`.** The prefix is put before the path of every route below it:

| Code | `prefixAt` is on | The routes it reaches |
|---|---|---|
| `router.route("/users/:id").get(showUser)` | The factory `route` | The routes of its methods, which have no path of their own |
| `APIRouter(prefix="/items")` | The factory `APIRouter` | Every route registered on the router |
| `app.use("/admin", adminRouter)`, `app.include_router(router, prefix="/admin")`, `app.register_blueprint(bp, url_prefix="/admin")`, `app.register(userRoutes, { prefix: "/admin" })` | The call | Every route registered on the router or in the plugin the call is handed, in any file of the group |

**A call with `prefixAt` mounts what it is handed.** Its match says `isMounting`, the library file of a route library gives its block the card part `mount` with the prefix, and the routes are reached once the group is linked, through the symbols that join the call to the router, so a router declared in one file and mounted in another takes the prefix. Mounts above mounts add up, outermost first: `/api` above `/v1` above `/users` is `/api/v1/users`. See [The routes below a mount](code-blocks.md#the-routes-below-a-mount).

A decorator names a prefix the same way, for the routes inside what it decorates: `@Controller("cats")` and `@Controller({ path: "cats" })` of NestJS are the prefix of every `@Get` in the class, whichever decorator of the class is written first. A method takes the route of its route decorator over a decorator that only hands middleware, `@UseGuards(…)`, wherever each is written, and the path of a decorated method always starts with `/`: `@Get()` in `@Controller("cats")` is `/cats`.

An argument that is a function is never a path, and only an argument written as text is a prefix, so `app.use(logRequest)` and `app.use(requireSession)` have no prefix and their argument is a slot.

## A class that extends a library

Some libraries are used by extending a class. A class pattern names the export that is extended, and says two things about every class that extends it:

| Field | Says | Such as |
|---|---|---|
| `members` | Which methods the class defines that the library runs, and what each runs as | `get` and `post` of a Tornado `RequestHandler` are routes, `run` of an oclif `Command` is a command, `execute` of a TaskFlow `Task` is a job |
| `methods` | What a call on the class, or on a value made from it, is | `User.findAll()` of a Sequelize `Model`, `Person.objects.filter()` of a Django `Model` |

```ts
{
  specifiers: ["tornado.web"],
  patterns: [
    { kind: "class", name: "RequestHandler", methods: [], members: [
      { name: "get", runs: "route", method: "GET" },
      { name: "post", runs: "route", method: "POST" },
    ] },
  ],
}

{
  specifiers: ["django.db.models"],
  patterns: [
    { kind: "class", name: "Model", makes: "data", members: [], methods: [
      { kind: "call", name: "filter", slots: [], makes: "data-fetch" },
    ] },
  ],
}
```

A member whose name ends in `*` holds for every method that starts with it: `resolve_*` of a Graphene `ObjectType` is a resolver. A route that is a member has a method and no path, because the path is where the class is registered.

**Whether a value was made by a factory is traced, never guessed from its name.** The codegraph follows the value back to where it comes from: through its declaration, through a name taken apart from it, through a prop it was handed in as, through a context it was read from. See [Where a value comes from](symbols.md#where-a-value-comes-from). A method named `useQuery` on a value whose origin is not that factory does not match.

A pattern also says which calls and elements pass a value on without the code showing it: a value is provided in one place and read in another, under the same key.

| Field | Says | Such as |
|---|---|---|
| `provides: { keyAt, valueAt }` | Where the key and the value are | `provide(key, value)` in Vue |
| `provides: { valueAt }` | Where the value is. The key is the value the factory made. | `value` of `<ThemeContext>` and of `<ThemeContext.Provider>` |
| `reads: { keyAt }` | Where the key is | `useContext(ThemeContext)`, `use(ThemeContext)`, `inject(key)` |
| `reads: {}` | The key is the value the factory made | `<ThemeContext.Consumer>` |

```ts
{
  specifiers: ["react"],
  patterns: [
    { kind: "factory", name: "createContext", provides: { valueAt: "value" }, methods: [
      { kind: "element", name: "Provider", slots: [], provides: { valueAt: "value" } },
      { kind: "element", name: "Consumer", slots: [{ at: "children", runs: "in-place" }], reads: {} },
    ] },
    { kind: "call", name: "useContext", slots: [], reads: { keyAt: 0 } },
  ],
}
```

`provides` on a factory is for the value itself written as an element, as `<ThemeContext value={theme}>`.

## A call that makes state

A pattern says when the result of a call is state: a value that is kept between runs, and that makes what reads it run again when it changes. A declaration that keeps such a result is a [`state`](block-types.md#what-counts-as-state) block.

| Library | Makes state |
|---|---|
| `react` | `useState`, `useReducer` |
| `vue` | `ref`, `reactive`, `shallowRef` |
| `zustand` | `create` |
| `jotai` | `atom` |
| `pinia` | `defineStore` |

```ts
{
  specifiers: ["react"],
  patterns: [
    { kind: "call", name: "useState", slots: [{ at: 0, runs: "in-place" }], makes: "state" },
    { kind: "call", name: "useReducer", slots: [{ at: 0, runs: "kept" }], makes: "state" },
  ],
}
```

State is one of the types of block a pattern decides, listed under "The shape of a pattern" as `BlockMade`. Without the pattern the declaration is an `external-value`: it has the same place in the tree, the same symbols and the same chains, so nothing but its type differs.

## A call that is a data, a cache or an auth block

Some calls say what a piece of code is for, without handing over any callback: a query, a cache read, a permission check. A pattern for such a call has no slots. It makes the call a block of the type [`data`, `cache` or `auth`](block-types.md#what-counts-as-data-cache-and-auth).

| What the call does | Block type | Such as |
|---|---|---|
| Writes through an ORM | `data` | `prisma.user.create(…)`, `user.save()` |
| Sends a raw SQL statement | `data` | `pool.query("select …")` |
| Reads, writes or clears a cache | `cache` | `redis.get(key)`, `cache.set(key, value)`, `queryClient.invalidateQueries(…)` |
| Wraps a function so its result is cached | `cache` | `cache(loadUser)`, `unstable_cache(loadUser, ["user"])`, `@lru_cache` |
| Checks who the caller is, or what they may do | `auth` | `getServerSession()`, `passport.authenticate("jwt")`, `@login_required` |

A pattern is written per method, because one client can do several things. A Redis client reads and writes keys, which is a cache, and subscribes to channels, which is an event:

```ts
{
  specifiers: ["ioredis"],
  patterns: [
    { kind: "factory", name: "Redis", methods: [
      { kind: "call", name: "get", slots: [], makes: "cache" },
      { kind: "call", name: "set", slots: [], makes: "cache" },
      { kind: "call", name: "del", slots: [], makes: "cache" },
      { kind: "call", name: "subscribe", slots: [{ at: "last", runs: "event" }] },
    ] },
  ],
}
```

Like state, these are types of block a pattern decides. Without the pattern the call is not a block, and the lines it is on belong to the block around it.

## A call that retrieves data

A pattern with `makes: "data-fetch"` names a call that only brings data in from a source outside the code. The call is a [`data-fetch`](block-types.md#what-counts-as-a-data-fetch) block.

| What the call does | Such as |
|---|---|
| Sends a `GET` request | `axios.get`, `ky.get`, `requests.get`, `httpx.get` |
| Runs a GraphQL query, or loads through a hook | `useQuery`, `useLazyLoadQuery`, `useSWR`, `queryOptions` |
| Reads a database | `findMany`, `findOne`, `select`, `filter`, `count`, `fetchone` |
| Reads from a service | `get_object`, `listModels`, `paginate` |

```ts
{
  specifiers: ["axios"],
  patterns: [
    { kind: "call", name: "default.get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    { kind: "call", name: "default.post", slots: [], makes: "request", pathAt: 0, method: "POST" },
  ],
}

{
  specifiers: ["@prisma/client"],
  patterns: [
    { kind: "factory", name: "PrismaClient", methods: [
      { kind: "call", name: "findMany", slots: [], makes: "data-fetch" },
      { kind: "call", name: "create", slots: [], makes: "data" },
      { kind: "call", name: "$queryRaw", slots: [], makes: "data-fetch" },
      { kind: "call", name: "$executeRaw", slots: [], makes: "data" },
    ] },
  ],
}
```

**A pattern makes a `data-fetch` only when the name of the call says it reads.** A call that sends a read and a write alike stays what it was: `pool.query` and `cursor.execute` are `data`, and `client.request` with `methodAt` is a `request`. The value a factory or a class makes, such as a client or a model, is never a `data-fetch`: each of its methods says what it does.

A `data-fetch` that is a request keeps its `pathAt` and its `method`, so it still pairs with the route it calls.

## The other blocks a pattern makes

`makes` names the type of block a matched call is. Beside state, data, data-fetch, cache and auth:

| `makes` | The call | Such as | Also says |
|---|---|---|---|
| `derived` | Computes a value from state | `useMemo`, `computed`, `createSelector` | |
| `request` | Calls a server to send something, or with a method the call names | `axios.post`, `ky.post`, `requests.request` | The method and where the path is |
| `navigation` | Sends the user to a page | `navigate`, `router.push`, `redirect`, `<Link href>` | Where the path is |
| `publish` | Emits an event or queues a job | `emitter.emit`, `queue.add`, `producer.send` | Where the name of the event is |
| `validation` | Declares or applies a schema | `z.object`, `schema.parse`, `Joi.object` | |
| `config` | Reads a configuration value | `config.get`, `env.get` | |
| `feature-flag` | Reads a feature flag | `flags.isEnabled`, `useFlag`, `client.variation` | |
| `storage` | Reads or writes what the browser keeps | `Cookies.get`, `Cookies.set` | |
| `telemetry` | Logs, tracks or reports | `logger.info`, `posthog.capture`, `Sentry.captureException` | |
| `transaction` | Runs its callback inside a transaction | `prisma.$transaction`, `db.transaction` | The slot of the callback, with `runs: "in-place"` |

```ts
{
  specifiers: ["axios"],
  patterns: [
    { kind: "call", name: "put", slots: [], makes: "request", pathAt: 0, method: "PUT" },
    { kind: "call", name: "post", slots: [], makes: "request", pathAt: 0, method: "POST" },
  ],
}

{
  specifiers: ["mitt"],
  patterns: [
    { kind: "factory", name: "default", methods: [
      { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
      { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
    ] },
  ],
}
```

A path and the name of an event are what let two blocks be a [pair](block-types.md#blocks-that-pair-across-a-boundary): a `request` or a `data-fetch` with a `route`, a `navigation` with a page, a `publish` with a `code-event`.

The globals of the platform need no pattern. `fetch`, `EventSource`, `process.env`, `import.meta.env`, `localStorage`, `sessionStorage`, `document.cookie`, `indexedDB` and `console` are named by the language, like the timers.

## A call that is a node of its own

A Trace Diagram has one node per root block, and a root block holds nodes of its own only as its card says. A library that declares several operations in one value breaks that rule: a tRPC router is one `root-variable`, and each procedure in it is called on an occasion of its own, from another page. Each procedure is drawn inside the [tRPC router card](../trace-diagram/libraries/trpc.md) of its router.

`isOwnNode: true` on a call pattern says each such call is a node of its own. The block of the call carries it in its `catalogue`, and [Nodes](../trace-diagram.md#nodes) reads it. What is written inside the call stays in that node: its callback, and the effects and callbacks inside that.

```ts
{ kind: "call", name: "query", slots: [{ at: 0, runs: "resolver" }], isOwnNode: true }
```

```ts
export const todoRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => ctx.db.query.todos.findMany()),          // a node, named list
  update: publicProcedure.input(updateTodoInput).mutation(({ input }) => save(input)), // a node, named update
})
```

A call written as the value of a key is named after that key, so the two nodes are `list` and `update`, not `query` and `mutation`. `query`, `mutation` and `subscription` of `initTRPC.create` are the only patterns that say it.

A store declares its actions in one value too, with no call to name them: they are functions written under the keys of what a callback returns. They are no nodes. `holdsActions: true` on a slot says each function written under a key of what the callback in that slot returns is an action of the store, a row under Actions of its [state card](../trace-diagram/libraries/zustand.md), named after its key. The first argument of `create`, of `createStore`, of `persist` and of `devtools` of Zustand say it.

```ts
{ kind: "factory", name: "create", slots: [{ at: 0, runs: "in-place", holdsActions: true }], makes: "state" }
```

```ts
export const useCartStore = create((set) => ({
  items: [],                                                    // a row under State of useCartStore
  addItem: (product) => set((state) => addTo(state, product)),  // a row under Actions, named addItem
}))
```

What is inside an action is folded into its row: the callback handed to `set` is part of the row `addItem`.

## What a slot is

A pattern names the slots of a call: an argument by its position, or a property of an options object by its key. A slot of an element is an attribute, by its name, and `children` is what is written inside it.

| `at` | The place |
|---|---|
| `0` | The first argument |
| `"last"` | The last argument |
| `"rest"` | Every argument no other slot of the pattern names, and that is not read as the path or the prefix |
| `"mutationFn"` | The property of that key in an options object, the argument of that name in Python, or the attribute of that name on an element |
| `"queries[].queryFn"` | `queryFn` of each element of the list under `queries` |
| `"0[].loader"`, `"1.context"` | A key path that starts at an argument: `loader` of each element of the first argument, `context` of the second |
| `"resolvers.*.*"` | Every property, two levels below `resolvers`: each resolver of each type |
| `"routes[].path"` beside `"routes[].component"` | A path and a slot in the same list are read from the same element: each route record has its own path |
| `[0, "path"]` | Any of the places listed, the first one the call has. A Python argument is written by position or by name. |
| `"0.*"` beside `"0.@key"` | The value of every property of the first argument, and the key it is written under: each page of `mount({ "/": home, "/about": about })` has its key as its path |
| `[]` | No place. An index page has no path of its own, so its pattern says `pathAt: []`. |

**A slot in a list has the path of its own record.** The key the path is under is the last key of `pathAt`. A record nested in another, as the `children` of a Vue Router route, has the path of the record around it before its own, unless its own starts with `/`.

| Code | The page | Its path |
|---|---|---|
| `{ path: "/user/:id", component: User, children: [{ path: "profile", component: UserProfile }] }` | `User` | `/user/:id` |
| | `UserProfile` | `/user/:id/profile` |

A pattern names each depth it reads: `"routes[].component"`, `"routes[].children[].component"`.

The same places serve `pathAt`, `prefixAt`, `methodAt`, `eventAt` and the `keyAt` and `valueAt` of a provided value. A `methodAt` that reads each item of a list gives every method it finds: `methodAt: "methods[]"` reads `GET` and `POST` from `@app.route("/users", methods=["GET", "POST"])`. Each slot says when what is handed to it runs. It is the name of the [`effect-callback`](block-types.md#the-types) block.

| A slot is | It runs | Example |
|---|---|---|
| A route handler | On a request, with a method and a path | `createUser` in `router.post("/users", createUser)` |
| A page | On a visit, with a path | `element` beside a `path` |
| An event | When something happens later | `onSuccess` |
| An effect | After the block around it has run | The first argument of `useEffect` |
| Run in place | While the block around it runs | The first argument of `useMemo`, `select` of `useQuery` |
| Kept | When the result of the call is called | The first argument of `useCallback`, `mutationFn` of `useMutation` |

A slot the catalogue does not name falls back to the rule of the code: a key that starts with `on` and a capital letter is an event, and anything else is a callback of an effect.

## The shape of a pattern

The catalogue is data, one file per language and category of libraries. A library is its name, the specifiers it is imported by, and its patterns.

A library has every specifier its patterns are imported from. TanStack Query is `@tanstack/react-query` and `@tanstack/vue-query`, with the same patterns for both. Next.js is `next`, `next/navigation`, `next/cache` and `next/headers`. A Python library lists each module, as `django.urls` and `django.shortcuts`. A specifier is in one library of a language only: `jose` is one library in JavaScript and another in Python. A name is the name of one library only.

A library that has a specifier says which version of its documentation the patterns were written from, in `documentedVersion`.

A library also says what it is: its category, where it runs and the language of the code that uses it. A framework is one category with three types: Vue is a `frontend` framework, NestJS a `backend` one and Next.js a `fullstack` one. `javascript` covers TypeScript, JSX and Vue files, which share one package registry. These three fields sort the catalogue; no pattern is matched by them.

```ts
interface CatalogueLibrary {
  name: string                         // "TanStack Query"
  specifiers: string[]                 // ["@tanstack/react-query", "@tanstack/vue-query"], or none for the conventions of a repository
  documentedVersion?: string           // the version of the documentation the patterns were written from
  category: string                     // what the library is for: "framework", "orm", "caching"
  type: "frontend" | "backend" | "fullstack"
  language: "javascript" | "python"
  patterns: CataloguePattern[]
  locations?: LocationSetting[]        // where the tool keeps files of a classification, read from its configuration
}

type CataloguePattern = CallPattern | FactoryPattern | DecoratorPattern | ElementPattern | AssignmentPattern | ClassPattern | FilePattern | DirectivePattern

type SlotRuns = "route" | "resolver" | "page" | "middleware" | "job" | "command" | "event" | "effect" | "in-place" | "kept"

type BlockMade =
  | "state"
  | "derived"
  | "data"
  | "data-fetch"
  | "cache"
  | "auth"
  | "request"
  | "navigation"
  | "publish"
  | "validation"
  | "config"
  | "feature-flag"
  | "storage"
  | "telemetry"
  | "transaction"

type SlotPlace = number | string       // 0, "last", "rest", "mutationFn", "queries[].queryFn", "resolvers.*.*"
type SlotPosition = SlotPlace | SlotPlace[]

interface Slot {
  at: SlotPosition
  runs: SlotRuns
  holdsActions?: boolean               // each function under a key of what the callback returns is an action of the store
}

interface ContextProvision {
  keyAt?: SlotPosition                 // absent when the key is the value the factory made
  valueAt: SlotPosition
}

interface ContextRead {
  keyAt?: SlotPosition                 // absent when the key is the value the factory made
}

interface CallPattern {
  kind: "call"
  versions?: string                    // a semver range, such as ">=5". Absent means every version.
  name: string                         // the exported name, or the name of a method, which may hold a wildcard
  from?: string                        // the one specifier of the library that exports it
  slots: Slot[]
  pathAt?: SlotPosition                // where the path of a route or of a page is
  prefixAt?: SlotPosition              // where the prefix of the routes handed to the call is
  method?: string                      // the method of a route or of a request: "POST", or "*" for every method
  methodAt?: SlotPosition              // where the method is, when the call names it
  makes?: BlockMade                    // the type of block the call, or what keeps its result, is
  classifies?: CodeBlockClassification // what the call is for, when that is not what its library's category gives
  eventAt?: SlotPosition               // where the name of an event, a channel or a queue is
  provides?: ContextProvision
  reads?: ContextRead
  isOwnNode?: boolean                  // the call is a node of its own in a Trace Diagram, wherever it is written
  returnsAt?: SlotPosition             // the call returns the value at this place, as async_to_sync(fn) returns fn wrapped
}

interface DecoratorPattern {
  kind: "decorator"
  versions?: string
  name: string                         // "Get", or the name of a method such as "get" in "@app.get"
  from?: string
  runs?: SlotRuns                      // what the decorated function is
  slots?: Slot[]                       // what is handed to the decorator and runs before the function: "dependencies[]" of FastAPI, every argument of "@UseGuards" of NestJS
  pathAt?: SlotPosition
  prefixAt?: SlotPosition              // where the prefix of the routes inside what it decorates is
  method?: string                      // "GET", or "*" for every method
  methodAt?: SlotPosition              // alone, it names the methods of a route registered elsewhere: "@api_view([\"GET\"])"
  makes?: BlockMade                    // "@lru_cache" is a cache, "@login_required" is auth
  classifies?: CodeBlockClassification
  eventAt?: SlotPosition
}

interface ElementPattern {
  kind: "element"
  versions?: string
  name: string                         // "Link", "default" for the default export, or "Provider" as a method
  from?: string
  slots: Slot[]                        // attributes, and "children"
  pathAt?: SlotPosition                // the attribute that holds the path, such as "href"
  makes?: BlockMade
  classifies?: CodeBlockClassification
  provides?: ContextProvision
  reads?: ContextRead
}

interface FactoryPattern {
  kind: "factory"
  versions?: string
  name: string                         // "createTRPCReact", or "default" for the default export
  from?: string
  methods: (CallPattern | DecoratorPattern | ElementPattern | FactoryPattern | AssignmentPattern)[]  // matched on the last name of the member path
  slots?: Slot[]                       // what is handed to the factory and runs later
  called?: {                           // what the made value is when it is called, or used as a tag
    slots: Slot[]
    makes?: BlockMade
    classifies?: CodeBlockClassification
    methods?: (CallPattern | DecoratorPattern | ElementPattern | FactoryPattern | AssignmentPattern)[]
  }
  makes?: BlockMade                    // what the factory makes
  classifies?: CodeBlockClassification
  prefixAt?: SlotPosition              // where the prefix of every route below is
  provides?: ContextProvision          // what the made value provides when it is written as an element
  makesType?: string                   // the type code writes for the made value: "FastifyInstance"
  parameterOfTypes?: string[]          // the types of a function whose first parameter is the made value: "FastifyPluginAsync"
  isTypeOnly?: boolean                 // no call makes the value, code only writes its type: "MiddlewareConsumer" of NestJS
}

interface AssignmentPattern {
  kind: "assignment"
  versions?: string
  name: string                         // the member path written to: "config.errorHandler" of a Vue app
  from?: string
  slots: Slot[]                        // 0 is the value assigned
  makes?: BlockMade
  classifies?: CodeBlockClassification
}

interface ClassPattern {
  kind: "class"
  versions?: string
  name: string                         // the export a class extends: "Model", "RequestHandler"
  from?: string
  members: { name: string; runs: SlotRuns; method?: string; classifies?: CodeBlockClassification }[]  // the methods of the class the library runs
  methods: (CallPattern | DecoratorPattern | ElementPattern | FactoryPattern | AssignmentPattern)[]  // calls on the class and on what is made from it
  makes?: BlockMade                    // what a use of the class is
  classifies?: CodeBlockClassification // "data-model" for the class an ORM's models extend
}

interface FilePattern {
  kind: "file"
  versions?: string
  glob: string                         // "{app,src/app}/**/page.{js,jsx,ts,tsx}"
  exports: { name: string; runs: SlotRuns; method?: string; classifies?: CodeBlockClassification }[]
}

interface DirectivePattern {
  kind: "directive"
  versions?: string
  text: string                         // "use server"
  runs: SlotRuns
  method?: string                      // "POST" for a server action
}
```

**`runs` is what decides what a callback is.** It is the one field that turns a slot into a kind of block and a kind of entry:

| `runs` | The callback is | It runs |
|---|---|---|
| `route` | The handler of a `route` block | On a request. What starts it is an API call, with the method and the path. |
| `resolver` | The handler of a `resolver` block | On a GraphQL operation that asks for its field. What starts it is an API call, with the field. |
| `page` | A page | On a visit. What starts it is a page visit, with the path. |
| `event` | A `code-event` block | When something happens later |
| `effect` | An `effect-callback` block | After the block around it has run |
| `in-place` | An `effect-callback` block that is a step of the chain around it | While the block around it runs |
| `kept` | An `effect-callback` block that is followed through the result of the call | When the result is called |
| `middleware` | The handler of a `middleware` block | On every request, before its route |
| `job` | A job | On a schedule, or when a queue hands it work. What starts it is that job. |
| `command` | A command | When someone runs it from a command line. What starts it is that command. |

A slot no pattern names has no `runs`, and the rule of the code decides: a key that starts with `on` and a capital letter is an `event`, and anything else an `effect`.

Three entries:

```ts
{
  specifiers: ["@tanstack/react-query", "@tanstack/vue-query"],
  patterns: [
    { kind: "call", name: "useQuery", slots: [{ at: "queryFn", runs: "effect" }, { at: "select", runs: "in-place" }] },
    { kind: "call", name: "useMutation", slots: [{ at: "mutationFn", runs: "kept" }] },
  ],
}

{
  specifiers: ["express"],
  patterns: [
    { kind: "factory", name: "Router", methods: [
      { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }, { at: "rest", runs: "middleware" }], pathAt: 0, method: "POST" },
      { kind: "call", name: "use", slots: [{ at: "rest", runs: "middleware" }], prefixAt: 0 },
    ] },
  ],
}

{
  specifiers: ["@trpc/react-query"],
  patterns: [
    { kind: "factory", name: "createTRPCReact", methods: [
      { kind: "call", name: "useQuery", slots: [] },
      { kind: "call", name: "useMutation", slots: [] },
    ] },
  ],
}
```

`onSuccess` and `onError` are in none of them. They are events by the rule of the code, so a pattern lists only the slots whose name does not say when they run.

In `router.post("/users", requireSession, createUser)` the last argument is the route, and `requireSession` is middleware through the `rest` slot.

**A route says its method.** A pattern with a route slot, a decorator that runs a route and a route export of a file each carry `method`, or `methodAt` when the call names the method itself. A route of a directive has neither a path nor a method, because the code names none: the framework calls it. There is one pattern per method: `get`, `post` and `put` of an Express router are three patterns. `"*"` is every method, as in `router.all`.

**A file pattern of a library holds where the library is declared.** Its glob is read from the folder of the manifest that declares the library, so `{app,src/app}/**/page.{js,jsx,ts,tsx}` finds the pages of a Next.js app anywhere in a repository. The path of the page or the route comes from the path of the file. When two file patterns of a library match one file, the one listed first holds: `pages/api/users.ts` is a route, not a page.

**`from` is for a name that more than one specifier of the library exports.** A pattern holds for every specifier of its library. The default export of `next/link` is not the default export of `next/image`, so the pattern of `<Link>` says `from: "next/link"`. Most patterns have no `from`.

## How a pattern is applied

A file is read once, and every call, `new`, tagged template, decorator, element and class in it is looked up: the name it uses is followed to where it comes from, and the patterns of that library are tried.

| The code | What matches |
|---|---|
| `import { useQuery as load } from "…"`, then `load(…)` | The pattern of `useQuery`. The local name does not matter. |
| `import * as lib from "…"` or a default import, then `lib.useQuery(…)` | The same pattern, as a member of the whole library |
| `const useQuery = () => …`, then `useQuery(…)` | Nothing. The name is not imported. |
| `const app = express()`, then `app.post(…)` | The method `post` of the factory |
| `const { tables } = connect()`, then `tables["users"].where(…).find()` | The method `find`: the value is followed through a name taken apart from it, a subscript and a call no pattern names |
| `export const prisma = new PrismaClient()` in one file, `prisma.user.findMany()` in another | The method `findMany`: the value is followed through the import to the file that makes it |
| `router = APIRouter(prefix="/api")` in one Python file, `from shop.api import router`, then `@router.get("/items")` in another | The method `get`, below the prefix `/api`: the same in Python, through an absolute or a relative `from … import`, and through a package whose `__init__.py` imports the value from another module |
| `prisma.$transaction((tx) => tx.user.create(…))` | The method `create` on `tx`. The first argument of a callback in a slot that runs in place is taken to be the value. This is assumed. |
| `async function userRoutes(fastify) { fastify.get(…) }`, then `app.register(userRoutes)` in the same file | The method `get` on `fastify`: a function handed by name to a slot that runs in place is read as one written there |
| The same function exported, then `app.register(userRoutes)` in another file, through `import userRoutes from "./users"`, `const userRoutes = require("./users")` or `app.register(require("./users"))` | The same: the other files of the group are asked which hand the export, or what `module.exports` holds, to a slot that runs in place, and that call is read in its own file. The prefix the call names, `{ prefix: "/v1" }`, goes before every route of the function. |
| `async function userRoutes(fastify: FastifyInstance) { fastify.get(…) }` | The method `get` on `fastify`: a parameter typed with the `makesType` of a factory is a value that factory made |
| `def delete_pokemon(pokemon_id: int, session: Session): session.delete(…)` | The method `delete` on `session`: the second parameter is typed with the `makesType` of SQLAlchemy's `Session` |
| `def add_pokemon(session: SessionDep): session.add(…)`, with `SessionDep = Annotated[Session, Depends(get_session)]` | The method `add` on `session`: `Annotated[…]` is the type it holds first |
| `constructor(private readonly users: Repository<User>) {}`, then `this.users.findOneBy(…)` | The method `findOneBy` of the type-only factory `Repository`: a member of `this` is what its class declares it as |
| `const userRoutes: FastifyPluginAsync = async (fastify) => { fastify.get(…) }` | The method `get` on `fastify`: the first parameter of a function declared with a type the factory lists in `parameterOfTypes` is a value that factory made |
| `const express = require("express")`, then `express()`, and `require("fastify")({ logger: true })` | The factory `default`: calling a whole module, bound by `require` or written in place, calls its default export |
| `program.argument("<name>").action(…)` with `program` imported | `program.action`: a call no pattern names on a member of an export leaves the member |
| `app.register(mercurius, { schema })` | The call pattern of the default export of `mercurius`, with the arguments after it as its own. An export handed to a method by name is called by that method. |
| `class User extends Model {}`, then `User.findAll()` and `new User().save()` | The class pattern, and its methods on the class and on what is made from it |
| `class Timestamped(models.Model)`, then `class Order(Timestamped)` in the same file | The class pattern of `Model` on both: a class that extends a local class takes what the local class extends |
| `const EventEmitter = require("events")`, then `class Bus extends EventEmitter {}` | The class pattern `default`: a whole module required is its default export, for a class as for a call |
| `import styled from "styled-components"`, then `` styled.li`…` `` | A pattern named `default.*`: each segment of the name of an export may hold `*`, so one pattern matches every member of one depth |
| `open("orders.csv")` in a Python file that binds no `open` | The pattern `open` of the library whose specifier is `builtins`: a name the file never binds is read as a builtin of the language |
| `this.broadcast(…)` in a method of `class ChatRoom extends Room`, `self.send(…)` in a method of `class Chat(WebsocketConsumer)` | The method of the class pattern: `this`, and the first parameter of a method that is no `@staticmethod`, are an instance of the class around them |
| `async_to_sync(self.channel_layer.group_send)("chat", …)` | The method `group_send`: a call whose pattern says `returnsAt` is followed to the value at that place, so what calls its result calls that value |
| `app.config.errorHandler = (err) => …` with `app` from `createApp` | The assignment pattern `config.errorHandler` of the factory: a member written to is matched as a method is, and the value assigned is its place 0 |
| `"use server"` as the first statement of a file or of a function | The directive pattern |

In a Vue file the script is read as JavaScript, an element of the template matches by the name the script imports, written `RouterLink` or `router-link`, and the options a script exports are read as the options of `defineComponent`. In Python a name is a member of a module at any depth: `from web.cache import cache`, `import web` and `web.cache.cache.get(…)` all lead to `cache.get` of `web.cache`.

Any other parameter, and a value that comes from a call no pattern names, has no origin, and nothing matches on it.

A file pattern is matched by the path of the file, read from the folder of the nearest manifest above it, and only when that manifest lists the library: `package.json` for JavaScript, `pyproject.toml` or a `requirements` file for Python. A manifest lists a library under the name it is imported by or under the name a registry installs it by, so `django-allauth` in a `requirements` file is the library imported as `allauth`. A file with no manifest above it matches no file pattern. What the pattern says of an export is left on the block behind that export, as the `catalogue` of a call is, so a Next.js `page.tsx` is a visit of the path its folders spell and a `route.ts` is an API call of each method it exports. A function exported under several names of one pattern, `export { handler as GET, handler as POST }`, has every method it is exported under, `GET,POST`. The path starts below the folder the glob names first: `{pages,src/pages}/api/**/*.{js,ts}` keeps `api`, so `pages/api/users.ts` is `/api/users`.

A directive is matched in any file of its language. At the start of a file it names every exported function of the file, and at the start of a function it names that function.

## A pattern for some versions only

A library changes between versions, and a pattern says which versions it holds for only when it has to.

| The difference between two versions | Needs `versions` |
|---|---|
| A slot exists in one and not in the other, such as `onSuccess` of `useQuery` | No. A slot that is not in the call does not match, so one pattern serves both. |
| Two shapes that cannot be confused, such as positional arguments in one and an options object in the other | No. Both slots are listed, and the one that is present matches. |
| The same position means something else | Yes |

```ts
{
  specifiers: ["@tanstack/react-query"],
  patterns: [
    { kind: "call", name: "useQuery", versions: "<5", slots: [{ at: 1, runs: "effect" }] },
    { kind: "call", name: "useQuery", versions: ">=5", slots: [{ at: "queryFn", runs: "effect" }] },
  ],
}
```

`useQuery(["orders"], fetchOrders)` is the call of version 4, and `useQuery({ queryKey: ["orders"], queryFn: fetchOrders })` the call of version 5. A pattern with no `versions` holds for every version, and most patterns have none.

**The version of a library is the range its nearest manifest declares.** It is read at the commit, from the `package.json` nearest above the file that imports the library, or from `pyproject.toml` or `requirements.txt` in Python. The range is enough: `^5.17.0` says the major, and a lockfile is not read.

| Situation | The version |
|---|---|
| `"@tanstack/react-query": "^5.17.0"` in the nearest `package.json` | `^5.17.0`, so the `>=5` pattern holds |
| Two packages of one repository depend on different majors | Each file reads the manifest nearest to it |
| The library is in no manifest, because another package brings it in | Unknown |

**When the version is unknown, the shape of the call decides.** Every pattern for the name is tried, the ones the call fits are kept, and the match is marked as assumed. A call with one options object fits only the `>=5` pattern above, so the shape usually settles it.

The fixture of a pattern with `versions` is code written for those versions, with code written for the others as what it must not match.

## Where a tool keeps its files

A library also says where its tool keeps files of a [classification](classifications.md#placed-by-the-project), when the project's configuration decides it: where the tests of a test runner are, where the migrations of an ORM go, where the translations of an i18n library sit. A test runner or a migration tool that has no pattern is a library for this alone.

```ts
type LocationHolds = "globs" | "paths" | "folders" | "names" | "files" | "file-folders" | "modules" | "url-globs" | "regex"

interface LocationSetting {
  classification: CodeBlockClassification   // "test", "migration", "data-model", "config", "i18n", "build-and-infrastructure"
  files: {
    glob: string                            // the configuration file, from the folder of the manifest: "vitest.config.*"
    under?: string                          // the key the configuration sits under: "jest" in package.json, "tool.pytest.ini_options"
    base?: "config" | "package"             // what a value is relative to: the folder of the file (the default) or of the manifest
    levelsUp?: number                       // folders to climb from the file's folder first: 1 for a Django settings.py
  }[]
  keys: {
    key: string                             // "test.include", "*.migrations.directory", "config(0).path", "main(config_path)"
    holds: LocationHolds                    // how a value becomes a glob
    below?: string                          // what a folder holds: "versions/**" below Alembic's script_location
    default?: string[]                      // what the tool does when the key is silent
    unlessRead?: string | string[]          // the default gives way when one of these keys is read: testMatch to testRegex
    defaultWhen?: string                    // the default holds only when this section is configured: Cypress "component"
    defaultBase?: "config" | "package"      // what the default is relative to, when not the configuration: next-intl's messages folder
    separator?: string                      // what a value is split on besides spaces: ";" in Flask-Babel's folders
    isScope?: boolean                       // a folder the other keys are read below: Jest roots, pytest testpaths
  }[]
  marks?: "file" | "folder"                 // the configuration file, or its folder, is itself the location: a Helm Chart.yaml
}
```

| `holds` | A value is |
|---|---|
| `globs` | A glob |
| `paths` | A file, a folder or a glob, told apart by its extension and its wildcards |
| `folders` | A folder, with what `below` names inside it, every file when it names nothing |
| `names` | The name of a file anywhere below: pytest's `test_*.py` |
| `files` | A file |
| `file-folders` | A file, whose folder is meant: the folder of Prisma's schema |
| `modules` | A dotted Python module, as a folder, or the module of a class: Django's `orders.apps.OrdersConfig` is `orders` |
| `url-globs` | A path the app serves, below `public`, with `{{lng}}` as a wildcard |
| `regex` | A regular expression, tested against the path from the folder of its configuration |

A key is a path of names through the configuration, `*` for any name, and `name(argument)` for the argument of a call written anywhere in the file, by position or by keyword. A configuration in JSON, TOML, INI, YAML or `.env` is read as data, one in JavaScript, TypeScript or Python is parsed, and every value that is not written out is silent. A path built from fixed parts is written out: `path.join` and `path.resolve` of the path module with text and `__dirname`, and `fileURLToPath(new URL("./src/locales", import.meta.url))`. In Python a setting may be a name at the top of the file, a key written on an object (`app.config["BABEL_TRANSLATION_DIRECTORIES"] = …`), or a name in the body of a class at the top (`class Config:`).

## Where patterns come from

| Source | Holds | Kept in |
|---|---|---|
| The built-in catalogue | The patterns of the libraries Flight Plan knows, one file of data per language and category | The codegraph package, `packages/codegraph` |
| A library file | The patterns of a library that needs handling of its own, in the same shape, with the `readCards` that says which card of the Trace Diagram each of its blocks belongs to, as [Which card a block belongs to](code-blocks.md#which-card-a-block-belongs-to) says. Express, Fastify, Next.js, NestJS, tRPC, Zustand, Pinia, Redux, RTK Query, MobX, Valtio, XState, Effector and Nano Stores are files of JavaScript, Flask, FastAPI and Django files of Python. The modules a language ships with are files of that language too: Node.js `fs`, `child_process`, `worker_threads`, `crypto`, `events` and `util`, and Python `builtins`, `pathlib`, `shutil`, `subprocess`, `multiprocessing`, `hashlib`, `hmac`, `secrets` and `functools`. A library whose routes come from the path of a file, as Next.js, also has a `readExportCards` that says the card of each block its file patterns name. A library is in the catalogue or in a file of its own, never both. | The codegraph package, one file per library in the folder of its language |
| The repository's catalogue | The patterns of what the built-in one does not cover: an uncommon framework, the repository's own event bus, where its test files and story files are | The configuration of the repository |

The repository's catalogue is written in setup. An agent reads the frameworks of the repository and proposes patterns for the gaps.

**A proposed pattern is checked before it is kept.** The codegraph applies it to the repository. A pattern that matches nothing is refused, and what each kept pattern matched is shown, such as "37 routes", so that a person can confirm it at a glance. `countPatternMatches` counts the matches of each pattern over the files of a repository, and `checkProposedLibraries` turns the counts into the patterns kept and the sentences of the ones refused.

**Every pattern has a fixture.** A pattern of the built-in catalogue or of a library file comes with a small piece of code it must match and one it must not, but a factory that `isTypeOnly`, which no code calls: its methods have their fixtures, so the catalogue can grow to any size without a pattern silently matching the wrong thing. Every fixture is run: a pattern that does not match its own code, or that matches the code it must not, fails the tests.

## What a file convention of Next.js runs as

| Code | Runs as | Why |
|---|---|---|
| `page`, `layout`, `template`, `loading`, `error` and `not-found` files of the app router | `page` | Each renders on a visit to a path under its folder, so a page visit starts it. A layout is not a page of its own, and no other kind of entry fits it better. |
| `getServerSideProps` and `getStaticProps` of the pages router | `page` | They run for a visit to their page, before it renders. Nothing in the app calls them as an API. |
| A function or a file that starts with `"use server"` | `route`, with the method `POST` and no path | A server action is called from the browser with a `POST` request, at an address Next.js makes |
| A WebSocket route | `route`, with the method `WEBSOCKET` | It starts as a request and stays open. The method is a word of its own so that it never pairs with a `GET` request. |
