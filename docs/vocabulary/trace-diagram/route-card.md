# Route card

The card of a route path in a [Trace Diagram](../trace-diagram.md): the handlers a framework runs when a request reaches one path. This page holds what every route library shares, and is where to start when a library is added. What one library writes and how its routes are read is on the page of that library. The rules every card shares, its frame, its rows and its lines, are in [On the page](../trace-diagram.md#on-the-page).

| Library | Page | Registration |
|---|---|---|
| Express | [libraries/express.md](libraries/express.md) | A call on a router |
| Fastify | [libraries/fastify.md](libraries/fastify.md) | A call on an instance, in a plugin or not |
| Flask | [libraries/flask.md](libraries/flask.md) | A decorator on a function, a call naming a view |
| FastAPI | [libraries/fastapi.md](libraries/fastapi.md) | A decorator on a function |
| Django | [libraries/django.md](libraries/django.md) | A `path` in a URL list naming a view |
| Next.js | [libraries/nextjs.md](libraries/nextjs.md) | An export of a file, the path read from its folders |
| NestJS | [libraries/nestjs.md](libraries/nestjs.md) | A decorator on a method of a controller |

A route of a framework with no page here has no library file: the catalogue still recognises it with its path and its method, and each registration is a node of its own.

## What is a route card

**A route card stands for one route path, not for one block.** Every registration of a handler for the same path, such as `router.get("/api/users", …)` and `router.post("/api/users", …)`, is one node. The registrations are the blocks of the type `route`, which the [catalogue](../codegraph/catalogue.md) recognises with their path and their method, and the `card` of each says it is one.

| Field | What it holds |
|---|---|
| `id` | The path of the file of the first registration and the route path, as in `server/routes/users.ts#route@/api/users` |
| `type` | `route` |
| `codeBlocks` | The registrations of the path, in the order they are written, then the blocks the registrations hold that are no node |
| `children` | The handler of each registration, as a [function card](function-card.md) |

The head of the card names the route path, `/api/users`, with the path of the file. Its type reads Route.

**Every block a library reads is a part of the route card**, one kind of the `part` of a block's `card`:

| Part | What it is | Where it is drawn |
|---|---|---|
| `holder` | A call that registers a handler for a path and a method | None: it is the card |
| `handler` | The function a registration runs. A decorated function, or a decorated method of a controller, is its own registration and its handler. | A card inside the route card, under the heading of its method |
| `middleware` | A function that runs before a handler, or before every route of a router | A card of its own, with a line to what it runs before |
| `mount` | A call that hands a router, a plugin or an app of its own (`isAppMount`, as `mount` of FastAPI) to another router, under a prefix, or what puts a prefix before every route of an app (`isAppWide`), as `setGlobalPrefix` of NestJS | Nowhere: its prefix goes before the path of every route below it |
| `versioning` | What puts the version of a route in its path or its heading, for every route of an app, as `enableVersioning` of NestJS, with the text before the version as `groupKey` and the versions of a route that names none as `versions`. A `groupKey` of `null` versions by something other than the path. | Nowhere: the segment goes after the prefix of the app and before every other, or the version after the method in the heading |
| `controller` | A class whose decorated methods are handlers, as a controller of NestJS | Its own card, a class card whose type reads Controller, with a line to each route card of its methods |
| `page` | A page of a framework whose middleware runs before visits too, with its path as `groupKey`, as a page of Next.js | Its own card, a component card: the part only gives middleware of the whole app a page to reach |
| `server-action` | A function the browser calls with a request at an address the framework makes, with no path, as a server action of Next.js | A card of its own, with no route card around it |

## Methods and handlers

**A route card groups its handlers by method**, in this order:

```
POST · PUT · PATCH · GET · DELETE · HEAD · OPTIONS · ANY
```

A method the path has no registration of has no heading. **A registration that names several methods is under one heading that names them all**, in the order they are written, `GET · POST`, after the headings of one method and before ANY. A registration that names no method, every method, or a method with no heading of its own is under ANY. **A heading can name a version after the method**, `GET v2`, when the app versions by something other than the path: it sits after the heading of its method alone, versions in order.

**Under each heading is the handler of that method, drawn as a function card inside the route card.** The handler is the function the registration runs:

| A handler | Drawn as |
|---|---|
| Written in place, in the registration | A function card named after its signature, `(req, res) => …` |
| Named by the registration, from its own file or another | Its function card, which keeps the path of its own file |
| A decorated function, or a function a route file exports | Its function card: the function is the registration too |
| A decorated method of a controller | Its method card: the method is the registration too |
| A method of a view class the registration names | The card of each method named after a method of HTTP, under the heading of that method |
| A view class the registration names, with no method named after a method of HTTP | Its class card, under the heading of the registration |

**A registration that names no method puts a named handler under the methods the handler says it takes**, when it says any: Django's `path` names none, and a view decorated `@require_POST` sits under POST.

**A named handler is drawn inside the route card**, wherever it is declared, and has no card of its own on the board. A route comes first, as [component and route come first](../trace-diagram.md#component-and-route-come-first) says, so **a view class has no card of its own** when every method it has is drawn in a route card, a constructor that only takes its parameters aside. A view class with a method that is no route keeps its class card with that method, and has no line to its routes. **A class with a `controller` card always keeps its card**, typed Controller, holding the methods that are no route and with a line to each route card of the others, as a [NestJS controller](libraries/nestjs.md#controllers) is.

## The path of a route card

**The path of a route card is the path the route answers on.** The prefix of the router a route is registered on goes before its path, and so does the prefix of every mount above that router, outermost first, in any file of the group. `/api` mounted above `/v1` above `/users` is `/api/v1/users`. The router of a decorated method is its class. A `versioning` part of the app puts the version of a route before that, or after the method in its heading, and a `mount` of the whole app its prefix before everything, unless the mount excludes the path, and the method of the handler when the exclusion names one, in `excludedRoutePatterns`. How the mounts are found is in [The routes below a mount](../codegraph/code-blocks.md#the-routes-below-a-mount).

**A function that only registers routes has no card of its own**, as a plugin of Fastify does: its routes are route cards, and the function adds nothing to them. **Nor has a value at the root of a file that only lists routes**, as `urlpatterns` of Django: its registrations and mounts are the route cards. **Nor has a block that only hands middleware**: a call such as `Depends(verify_key)`, and a value at the root of a file whose calls only hand middleware, as `app = FastAPI(dependencies=[Depends(verify_key)])`, and a mount whose calls only hand middleware, as `app.include_router(router, dependencies=[Depends(verify_key)])`. The middleware is a card, and its line stands for them.

**The router a route is registered on comes before its route cards.** When the value a registration is called on, as `router` in `@router.get("/")` or `router.get("/users", …)`, is a card of the diagram, a line goes from it to each route card of its routes, and none from a handler back to it, as a route table leads to its pages.

## Middleware

**Middleware is a card of its own**, beside the route card, never a row or a card inside it. Where its line goes depends on what it runs before:

| Middleware | Its line |
|---|---|
| Of one registration, named in it before its handler, or in a decorator of the handler | From the middleware to the head of each handler card it runs before |
| Of a whole app or router, a controller among them | From the middleware to each route card it reaches, one line per route card, not one per handler |
| Of a whole app, by the paths it runs before, as Next.js middleware | From the middleware to each route card and each `page` whose path its patterns reach |

The routes middleware of a whole router reaches are the routes of that router and of every router mounted below it, and only those below its own path when it is mounted at one. The block of such middleware lists them in `card.routePaths`, and leaves out a path its `excludedRoutePatterns` match, one that names a method only when every handler of the path has it. Middleware of a whole app that names no router reaches every route of its library. **Only middleware of a whole app (`isAppWide`) crosses a mount of an app (`isAppMount`)**: the middleware of a mounted app reaches its own routes, and the dependencies of the outer app stop at the mount. **What a decorator hands as middleware is no row** of the card it decorates: its line stands for it.

```mermaid
flowchart LR
  session["Middleware of the app"] --> users
  session --> health
  admin["Middleware of one registration"] --> post
  subgraph users["/api/users"]
    post["POST: (req, res) => …"]
    get["GET: listUsers"]
  end
  subgraph health["/health"]
    ping["GET: ping"]
  end
```

## Child routes

**A child route is a card of its own.** `/api/users/:userId` is a route card beside `/api/users`, placed by the page like any other card, with no line from it, and drawn the same way.

```mermaid
flowchart LR
  r["Registrations"] --> path{"Same path?"}
  path -- yes --> one["One route card, a heading per method,<br/>the handler of each inside"]
  path -- "no, a child path" --> own["A route card of its own"]
  r --> mw["The middleware they name"] --> card["A card of its own, with a line to each handler it runs before"]
  app["The middleware of a whole router"] --> appCard["A card of its own, with a line to each route card it reaches"]
```

The edge from a route card to each handler inside it stays in `traceNodeEdges`, and the page leaves it out.

## Adding a route library

A route library is added in the folders of its language, one file in each, and nothing outside them changes:

| What | Where | What it holds |
|---|---|---|
| The library file | `packages/codegraph/src/code-blocks/languages/<language>/libraries/<library>.ts`, listed in `TYPESCRIPT_LIBRARIES` or `PYTHON_LIBRARIES` of that folder's `index.ts` | A `Library`: its name, specifiers and documented version, the patterns of its registrations, and `readCards: readRouteCards` from `code-blocks/libraries/route-cards.ts`, with how to name a handler written in place. A registration has a slot that `runs: "route"`, or is a decorator that does, with its `pathAt` and its `method` or `methodAt`; a slot that `runs: "middleware"` is middleware; `prefixAt` on a factory is the prefix of its router, and on a call it makes the call a mount. A library already in the catalogue moves its entry here, and leaves the catalogue. |
| Its fixtures | `packages/codegraph/src/code-blocks/languages/<language>/libraries/__tests__/` | Code each pattern matches and code it rejects, and the `card` each block gets |
| The card file | `packages/codegraph/src/trace-diagram/languages/<language>/libraries/<library>.ts`, listed in `TYPESCRIPT_CARD_RULES` or `PYTHON_CARD_RULES` of `trace-diagram/languages/<language>/index.ts` | A `LibraryCardRules` that extends the shared `route` card, with no rules of its own unless its card does something differently |
| The band | `METHOD_HEADINGS` in `packages/codegraph/src/trace/cards/route.ts` | The one order of the method headings every route library shares |
| Its page | `docs/vocabulary/trace-diagram/libraries/<library>.md`, and a row in the table at the top of this page | How the library registers routes, names handlers, mounts routers and runs middleware, an example of its code and a drawing of its card |

**Start from the page of the closest library.** A library that registers with a call on a router, as Express and Fastify do, writes a `holder`, a `handler` slot and `middleware` slots. A library that registers with a decorator, as Flask and FastAPI do, makes the decorated function the handler, and the slots of the decorator its middleware. A library that registers with a decorator on a method of a class, as NestJS does, makes the method the handler and the class its router, and writes its own `readCards`, because the path of the class goes before the path of the decorator. A library that registers with the path of a file, as Next.js does, has file patterns whose exports `runs: "route"`, and `readExportCards: readExportRouteCards` makes each function they name a `handler` of the path its folders give. What a pattern cannot say goes in a `readCards` of the library's own, built on `readRouteCards`, as Flask's marks the hooks that run before every route of the app, FastAPI's marks its HTTP middleware `isAppWide` and its `mount` `isAppMount`, and Django's makes a `path` that holds an `include` a mount, roots every path and puts the path of an `include` written in place before the paths in it.
