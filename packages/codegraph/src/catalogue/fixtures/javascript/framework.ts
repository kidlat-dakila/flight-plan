import type { PatternFixture } from "@/catalogue/types"

const declaringLocally = (name: string, code: string): string => `const ${name} = (...parts) => parts\n${code}`

const ADONIS = "Adonis"

export const adonisFixtures: readonly PatternFixture[] = [
  {
    library: ADONIS,
    patternKey: "call:default.get@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.get(\"/users/:id\", [UsersController, \"show\"])",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.get(\"/users/:id\", [UsersController, \"show\"])",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.post@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.post(\"/users/:id\", [UsersController, \"show\"])",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.post(\"/users/:id\", [UsersController, \"show\"])",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.put@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.put(\"/users/:id\", [UsersController, \"show\"])",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.put(\"/users/:id\", [UsersController, \"show\"])",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.patch@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.patch(\"/users/:id\", [UsersController, \"show\"])",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.patch(\"/users/:id\", [UsersController, \"show\"])",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.delete@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.delete(\"/users/:id\", [UsersController, \"show\"])",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.delete(\"/users/:id\", [UsersController, \"show\"])",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.resource@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.resource(\"posts\", PostsController)",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.resource(\"posts\", PostsController)",
    ],
  },
  {
    library: ADONIS,
    patternKey: "call:default.group@@adonisjs/core/services/router:*",
    matches: [
      "import router from \"@adonisjs/core/services/router\"\nrouter.group(() => { router.get(\"/users\", listUsers) })",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.group(() => { router.get(\"/users\", listUsers) })",
    ],
  },
  {
    library: ADONIS,
    patternKey: "class:BaseCommand@@adonisjs/core/ace:*",
    matches: [
      "import { BaseCommand } from \"@adonisjs/core/ace\"\nexport default class GreetCommand extends BaseCommand {\n  static commandName = \"greet\"\n  async run() {}\n}",
    ],
    rejects: [
      "class BaseCommand {}\nexport default class GreetCommand extends BaseCommand {\n  static commandName = \"greet\"\n  async run() {}\n}",
    ],
  },
]

const ELYSIA = "Elysia"

export const elysiaFixtures: readonly PatternFixture[] = [
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })",
    ],
    rejects: [
      "const Elysia = (...parts) => parts\nconst app = new Elysia({ prefix: \"/v1\" })",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:get:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.get(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.get(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:post:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.post(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.post(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:put:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.put(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.put(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:delete:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.delete(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.delete(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:patch:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.patch(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.patch(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:all:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.all(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.all(\"/users/:id\", ({ params }) => showUser(params.id))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:group:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.group(\"/users\", (users) => users.get(\"/\", listUsers))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.group(\"/users\", (users) => users.get(\"/\", listUsers))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:use:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.use(authPlugin)",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.use(authPlugin)",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:onBeforeHandle:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.onBeforeHandle(({ headers }) => { requireSession(headers) })",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.onBeforeHandle(({ headers }) => { requireSession(headers) })",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:onError:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.onError(({ code, error }) => report(code, error))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.onError(({ code, error }) => report(code, error))",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:ws:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.ws(\"/chat\", { message(ws, message) { ws.send(message) } })",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.ws(\"/chat\", { message(ws, message) { ws.send(message) } })",
    ],
  },
  {
    library: ELYSIA,
    patternKey: "factory:Elysia:*>call:listen:*",
    matches: [
      "import { Elysia } from \"elysia\"\nconst app = new Elysia({ prefix: \"/v1\" })\napp.listen(3000)",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.listen(3000)",
    ],
  },
]

const H3 = "H3"

export const h3Fixtures: readonly PatternFixture[] = [
  {
    library: H3,
    patternKey: "factory:H3:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()",
    ],
    rejects: [
      "const H3 = (...parts) => parts\nconst app = new H3()",
    ],
  },
  {
    library: H3,
    patternKey: "factory:H3:*>call:get:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()\napp.get(\"/hello/:name\", (event) => greet(event.context.params.name))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.get(\"/hello/:name\", (event) => greet(event.context.params.name))",
    ],
  },
  {
    library: H3,
    patternKey: "factory:H3:*>call:post:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()\napp.post(\"/hello/:name\", (event) => greet(event.context.params.name))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.post(\"/hello/:name\", (event) => greet(event.context.params.name))",
    ],
  },
  {
    library: H3,
    patternKey: "factory:H3:*>call:on:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()\napp.on(\"GET\", \"/hello\", (event) => \"world\")",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.on(\"GET\", \"/hello\", (event) => \"world\")",
    ],
  },
  {
    library: H3,
    patternKey: "factory:H3:*>call:use:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()\napp.use((event, next) => { report(event.req.url) })",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.use((event, next) => { report(event.req.url) })",
    ],
  },
  {
    library: H3,
    patternKey: "factory:H3:*>call:mount:*",
    matches: [
      "import { H3 } from \"h3\"\nconst app = new H3()\napp.mount(\"/api\", apiApp)",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.mount(\"/api\", apiApp)",
    ],
  },
  {
    library: H3,
    patternKey: "call:onRequest:*",
    matches: [
      "import { onRequest } from \"h3\"\napp.use(onRequest((event) => { report(event.req.url) }))",
    ],
    rejects: [
      "const onRequest = (...parts) => parts\napp.use(onRequest((event) => { report(event.req.url) }))",
    ],
  },
]

const HAPI = "Hapi"

export const hapiFixtures: readonly PatternFixture[] = [
  {
    library: HAPI,
    patternKey: "factory:default.server:*",
    matches: [
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })",
    ],
    rejects: [
      "const Hapi = makeLocalRegistry()\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })",
    ],
  },
  {
    library: HAPI,
    patternKey: "factory:default.server:*>call:route:*",
    matches: [
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })\nserver.route({ method: \"GET\", path: \"/users/{id}\", handler: (request, h) => showUser(request.params.id) })",
    ],
    rejects: [
      "const server = makeLocalRegistry()\nserver.route({ method: \"GET\", path: \"/users/{id}\", handler: (request, h) => showUser(request.params.id) })",
    ],
  },
  {
    library: HAPI,
    patternKey: "factory:default.server:*>call:ext:*",
    matches: [
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })\nserver.ext(\"onRequest\", (request, h) => h.continue)",
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })\nserver.ext({ type: \"onRequest\", method: function (request, h) { return h.continue } })",
    ],
    rejects: [
      "const server = makeLocalRegistry()\nserver.ext(\"onRequest\", (request, h) => h.continue)",
    ],
  },
  {
    library: HAPI,
    patternKey: "factory:default.server:*>call:register:*",
    matches: [
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })\nawait server.register(usersPlugin, { routes: { prefix: \"/users\" } })",
    ],
    rejects: [
      "const server = makeLocalRegistry()\nawait server.register(usersPlugin, { routes: { prefix: \"/users\" } })",
    ],
  },
  {
    library: HAPI,
    patternKey: "factory:default.server:*>call:strategy:*",
    matches: [
      "import Hapi from \"@hapi/hapi\"\nconst server = Hapi.server({ port: 3000, host: \"localhost\" })\nserver.auth.strategy(\"session\", \"cookie\", options)",
    ],
    rejects: [
      "const server = makeLocalRegistry()\nserver.auth.strategy(\"session\", \"cookie\", options)",
    ],
  },
]

const HONO = "Hono"

export const honoFixtures: readonly PatternFixture[] = [
  {
    library: HONO,
    patternKey: "call:serve@@hono/node-server:*",
    matches: ["import { serve } from \"@hono/node-server\"\nserve(app, (info) => console.log(info.port))"],
    rejects: ["const serve = (app) => app\nserve(app, (info) => console.log(info.port))"],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()",
    ],
    rejects: [
      "const Hono = (...parts) => parts\nconst app = new Hono()",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:get:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.get(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.get(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:post:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.post(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.post(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:put:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.put(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.put(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:delete:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.delete(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.delete(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:patch:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.patch(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.patch(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:all:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.all(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.all(\"/users/:id\", (c) => c.json(showUser(c.req.param(\"id\"))))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:on:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.on(\"PURGE\", \"/cache\", (c) => c.text(\"purged\"))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.on(\"PURGE\", \"/cache\", (c) => c.text(\"purged\"))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:use:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.use(\"/admin/*\", basicAuth({ username, password }))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.use(\"/admin/*\", basicAuth({ username, password }))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:route:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.route(\"/book\", book)",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.route(\"/book\", book)",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:basePath:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\nconst api = app.basePath(\"/api\")",
    ],
    rejects: [
      "const app = makeLocalRegistry()\nconst api = app.basePath(\"/api\")",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:notFound:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.notFound((c) => c.text(\"Not found\", 404))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.notFound((c) => c.text(\"Not found\", 404))",
    ],
  },
  {
    library: HONO,
    patternKey: "factory:Hono:*>call:onError:*",
    matches: [
      "import { Hono } from \"hono\"\nconst app = new Hono()\napp.onError((err, c) => c.text(\"Failed\", 500))",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.onError((err, c) => c.text(\"Failed\", 500))",
    ],
  },
]

const MOLECULER = "Moleculer"

export const moleculerFixtures: readonly PatternFixture[] = [
  {
    library: MOLECULER,
    patternKey: "factory:ServiceBroker:*",
    matches: [
      "import { ServiceBroker } from \"moleculer\"\nconst broker = new ServiceBroker()",
    ],
    rejects: [
      "const ServiceBroker = (...parts) => parts\nconst broker = new ServiceBroker()",
    ],
  },
  {
    library: MOLECULER,
    patternKey: "factory:ServiceBroker:*>call:call:*",
    matches: [
      "import { ServiceBroker } from \"moleculer\"\nconst broker = new ServiceBroker()\nconst sum = await broker.call(\"math.add\", { a: 5, b: 3 })",
    ],
    rejects: [
      "const broker = makeLocalRegistry()\nconst sum = await broker.call(\"math.add\", { a: 5, b: 3 })",
    ],
  },
  {
    library: MOLECULER,
    patternKey: "factory:ServiceBroker:*>call:emit:*",
    matches: [
      "import { ServiceBroker } from \"moleculer\"\nconst broker = new ServiceBroker()\nbroker.emit(\"user.created\", user)",
    ],
    rejects: [
      "const broker = makeLocalRegistry()\nbroker.emit(\"user.created\", user)",
    ],
  },
  {
    library: MOLECULER,
    patternKey: "factory:ServiceBroker:*>call:use:*",
    matches: [
      "import { ServiceBroker } from \"moleculer\"\nconst broker = new ServiceBroker()\nbroker.use(loggerMiddleware)",
    ],
    rejects: [
      "const broker = makeLocalRegistry()\nbroker.use(loggerMiddleware)",
    ],
  },
]

const REACT = "React"

const reactImporting = (name: string, code: string): string => `import { ${name} } from "react"\n${code}`

const reactCallFixture = (name: string, call: string): PatternFixture => ({
  library: REACT,
  patternKey: `call:${name}:*`,
  matches: [reactImporting(name, call), reactImporting(`${name} as renamed`, call.replace(name, "renamed"))],
  rejects: [declaringLocally(name, call)],
})

const REACT_CONTEXT_KEY = "factory:createContext:*"

const REACT_CONTEXT = reactImporting("createContext", "const ThemeContext = createContext(\"light\")")

const REACT_LOCAL_CONTEXT = "const ThemeContext = makeLocalRegistry()"

const reactContextElementFixture = (name: string, element: string): PatternFixture => ({
  library: REACT,
  patternKey: `${REACT_CONTEXT_KEY}>element:${name}:*`,
  matches: [`${REACT_CONTEXT}\n${element}`],
  rejects: [`${REACT_LOCAL_CONTEXT}\n${element}`],
})

export const reactFixtures: readonly PatternFixture[] = [
  {
    library: REACT,
    patternKey: "class:Component:*",
    matches: [
      "import { Component } from \"react\"\nclass ErrorBoundary extends Component {\n  static getDerivedStateFromError(error) {\n    return { hasError: true }\n  }\n  componentDidCatch(error, info) {\n    report(error, info.componentStack)\n  }\n}",
      "import React from \"react\"\nclass ErrorBoundary extends React.Component {\n  componentDidCatch(error, info) {\n    report(error)\n  }\n}",
    ],
    rejects: [
      "class Component {}\nclass ErrorBoundary extends Component {\n  componentDidCatch(error, info) {\n    report(error)\n  }\n}",
    ],
  },
  reactCallFixture("useState", "const [isOpen, setIsOpen] = useState(() => readDraft())"),
  reactCallFixture("useReducer", "const [cart, dispatch] = useReducer(cartReducer, savedCart, restoreCart)"),
  reactCallFixture("useActionState", "const [message, submit, isPending] = useActionState(saveProfile, null)"),
  reactCallFixture("useOptimistic", "const [optimisticTodos, addOptimisticTodo] = useOptimistic(todos, todoReducer)"),
  reactCallFixture("useSyncExternalStore", "const todos = useSyncExternalStore(todosStore.subscribe, todosStore.getSnapshot)"),
  reactCallFixture("useEffect", "useEffect(() => { track(\"viewed\") }, [])"),
  reactCallFixture("useLayoutEffect", "useLayoutEffect(() => { measure() }, [])"),
  reactCallFixture("useInsertionEffect", "useInsertionEffect(() => { insertRule(rule) }, [rule])"),
  reactCallFixture("useImperativeHandle", "useImperativeHandle(ref, () => ({ focus: focusInput }), [])"),
  reactCallFixture("useMemo", "const total = useMemo(() => totalOf(lines), [lines])"),
  reactCallFixture("useCallback", "const save = useCallback(() => saveDraft(draft), [draft])"),
  reactCallFixture("startTransition", "startTransition(async () => { await saveQuantity(quantity) })"),
  {
    library: REACT,
    patternKey: REACT_CONTEXT_KEY,
    matches: [REACT_CONTEXT, `${REACT_CONTEXT}\nconst page = <ThemeContext value={theme}><Page /></ThemeContext>`],
    rejects: [declaringLocally("createContext", "const ThemeContext = createContext(\"light\")")],
  },
  reactContextElementFixture("Provider", "const page = <ThemeContext.Provider value={theme}><Page /></ThemeContext.Provider>"),
  reactContextElementFixture("Consumer", "const button = <ThemeContext.Consumer>{(theme) => <button className={theme} />}</ThemeContext.Consumer>"),
  reactCallFixture("useContext", "const theme = useContext(ThemeContext)"),
  reactCallFixture("use", "const theme = use(ThemeContext)"),
]

const REACT_DOM = "React DOM"

export const reactDomFixtures: readonly PatternFixture[] = [
  {
    library: REACT_DOM,
    patternKey: "call:createPortal:*",
    matches: [
      "import { createPortal } from \"react-dom\"\nconst modal = createPortal(<Dialog />, document.body)",
    ],
    rejects: [
      "const createPortal = (...parts) => parts\nconst modal = createPortal(<Dialog />, document.body)",
    ],
  },
  {
    library: REACT_DOM,
    patternKey: "call:flushSync:*",
    matches: [
      "import { flushSync } from \"react-dom\"\nflushSync(() => { setCount(count + 1) })",
    ],
    rejects: [
      "const flushSync = (...parts) => parts\nflushSync(() => { setCount(count + 1) })",
    ],
  },
  {
    library: REACT_DOM,
    patternKey: "factory:createRoot:*",
    matches: [
      "import { createRoot } from \"react-dom/client\"\nconst root = createRoot(document.getElementById(\"root\"))",
    ],
    rejects: [
      "const createRoot = (...parts) => parts\nconst root = createRoot(document.getElementById(\"root\"))",
    ],
  },
  {
    library: REACT_DOM,
    patternKey: "factory:createRoot:*>call:render:*",
    matches: [
      "import { createRoot } from \"react-dom/client\"\nconst root = createRoot(document.getElementById(\"root\"))\nroot.render(<App />)",
    ],
    rejects: [
      "const root = makeLocalRegistry()\nroot.render(<App />)",
    ],
  },
  {
    library: REACT_DOM,
    patternKey: "call:hydrateRoot:*",
    matches: [
      "import { hydrateRoot } from \"react-dom/client\"\nhydrateRoot(document.getElementById(\"root\"), <App />)",
    ],
    rejects: [
      "const hydrateRoot = (...parts) => parts\nhydrateRoot(document.getElementById(\"root\"), <App />)",
    ],
  },
]

const VUE = "Vue"

const vueImporting = (name: string, code: string): string => `import { ${name} } from "vue"\n${code}`

const vueCallFixture = (name: string, call: string): PatternFixture => ({
  library: VUE,
  patternKey: `call:${name}:*`,
  matches: [vueImporting(name, call), vueImporting(`${name} as renamed`, call.replace(name, "renamed"))],
  rejects: [declaringLocally(name, call)],
})

export const vueFixtures: readonly PatternFixture[] = [
  vueCallFixture("ref", "const count = ref(0)"),
  vueCallFixture("shallowRef", "const chart = shallowRef(null)"),
  vueCallFixture("reactive", "const state = reactive({ count: 0 })"),
  vueCallFixture("shallowReactive", "const state = shallowReactive({ nested: { count: 0 } })"),
  vueCallFixture("computed", "const plusOne = computed(() => count.value + 1)"),
  vueCallFixture("watch", "watch(() => state.count, (count, prevCount) => { report(count, prevCount) })"),
  vueCallFixture("watchEffect", "watchEffect(() => { document.title = title.value })"),
  vueCallFixture("watchPostEffect", "watchPostEffect(() => { measure(list.value) })"),
  vueCallFixture("watchSyncEffect", "watchSyncEffect(() => { mirror(count.value) })"),
  vueCallFixture("onBeforeMount", "onBeforeMount(() => { prepare() })"),
  vueCallFixture("onMounted", "onMounted(() => { focusInput() })"),
  vueCallFixture("onBeforeUpdate", "onBeforeUpdate(() => { rememberScroll() })"),
  vueCallFixture("onUpdated", "onUpdated(() => { restoreScroll() })"),
  vueCallFixture("onBeforeUnmount", "onBeforeUnmount(() => { saveDraft() })"),
  vueCallFixture("onUnmounted", "onUnmounted(() => { closeSocket() })"),
  vueCallFixture("onActivated", "onActivated(() => { resume() })"),
  vueCallFixture("onDeactivated", "onDeactivated(() => { pause() })"),
  vueCallFixture("onErrorCaptured", "onErrorCaptured((error) => { report(error) })"),
  vueCallFixture("onServerPrefetch", "onServerPrefetch(async () => { data.value = await fetchOnServer() })"),
  vueCallFixture("nextTick", "nextTick(() => { scrollToBottom() })"),
  vueCallFixture("provide", "provide(\"message\", \"hello\")"),
  vueCallFixture("inject", "const message = inject(\"message\")"),
  {
    library: VUE,
    patternKey: "factory:createApp:*",
    matches: [
      "import { createApp } from \"vue\"\nconst app = createApp({})",
    ],
    rejects: [
      "const createApp = (...parts) => parts\nconst app = createApp({})",
    ],
  },
  {
    library: VUE,
    patternKey: "factory:createApp:*>assignment:config.errorHandler:*",
    matches: ["import { createApp } from \"vue\"\nconst app = createApp(App)\napp.config.errorHandler = (err, instance, info) => {\n  report(err, info)\n}"],
    rejects: ["const app = makeLocalRegistry()\napp.config.errorHandler = (err, instance, info) => {\n  report(err, info)\n}"],
  },
  {
    library: VUE,
    patternKey: "factory:createApp:*>call:provide:*",
    matches: [
      "import { createApp } from \"vue\"\nconst app = createApp({})\napp.provide(\"message\", \"hello\")",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.provide(\"message\", \"hello\")",
    ],
  },
  {
    library: VUE,
    patternKey: "call:defineComponent:*",
    matches: [
      "import { defineComponent } from \"vue\"\nexport default defineComponent({\n  props: { name: String },\n  data() {\n    return { count: 1 }\n  },\n  mounted() {\n    report(this.count)\n  }\n})",
      "<script>\nexport default {\n  data() {\n    return { count: 0 }\n  },\n  methods: {\n    increment() {\n      this.count++\n    }\n  },\n  mounted() {\n    console.log(this.count)\n  }\n}\n</script>\n\n<template>\n  <button @click=\"increment\">Count is: {{ count }}</button>\n</template>",
    ],
    rejects: [
      "const defineComponent = (...parts) => parts\nexport default defineComponent({ data() { return { count: 1 } } })",
    ],
  },
]

const KOA = "Koa"

export const koaFixtures: readonly PatternFixture[] = [
  {
    library: KOA,
    patternKey: "factory:default:*>call:listen:*",
    matches: ["const Koa = require(\"koa\")\nconst app = new Koa()\napp.listen(3000)"],
    rejects: ["const app = makeLocalRegistry()\napp.listen(3000)"],
  },
  {
    library: KOA,
    patternKey: "factory:default:*",
    matches: [
      "import Koa from \"koa\"\nconst app = new Koa()",
    ],
    rejects: [
      "const Koa = (...parts) => parts\nconst app = new Koa()",
    ],
  },
  {
    library: KOA,
    patternKey: "factory:default:*>call:use:*",
    matches: [
      "import Koa from \"koa\"\nconst app = new Koa()\napp.use(async (ctx, next) => {\n  await next()\n})",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.use(async (ctx, next) => {\n  await next()\n})",
    ],
  },
]

const KOA_ROUTER = "Koa Router"

export const koaRouterFixtures: readonly PatternFixture[] = [
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })",
    ],
    rejects: [
      "const Router = (...parts) => parts\nconst router = new Router({ prefix: \"/api\" })",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.get(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.get(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:post:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.post(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.post(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:put:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.put(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.put(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:patch:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.patch(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.patch(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:delete:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.delete(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.delete(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:del:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.del(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.del(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:head:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.head(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.head(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:options:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.options(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.options(\"/users/:id\", requireSession, (ctx) => {\n  ctx.body = ctx.params.id\n})",
    ],
  },
  {
    library: KOA_ROUTER,
    patternKey: "factory:default:*>call:use:*",
    matches: [
      "import Router from \"@koa/router\"\nconst router = new Router({ prefix: \"/api\" })\nrouter.use((ctx, next) => next())",
    ],
    rejects: [
      "const router = makeLocalRegistry()\nrouter.use((ctx, next) => next())",
    ],
  },
]
