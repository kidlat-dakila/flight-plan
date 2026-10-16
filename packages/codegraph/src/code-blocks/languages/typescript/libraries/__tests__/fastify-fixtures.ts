import type { PatternFixture } from "@/catalogue/types"

const FASTIFY = "Fastify"

export const fastifyFixtures: readonly PatternFixture[] = [
  {
    library: FASTIFY,
    patternKey: "factory:default:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })",
    ],
    rejects: [
      "const Fastify = (...parts) => parts\nconst fastify = Fastify({ logger: true })",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.get(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.get(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:post:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.post(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.post(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:put:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.put(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.put(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:delete:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.delete(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.delete(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:patch:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.patch(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.patch(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:head:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.head(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.head(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:options:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.options(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.options(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:all:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.all(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.all(\"/users/:id\", async (request, reply) => showUser(request.params.id))",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:route:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.route({ method: \"GET\", url: \"/users/:id\", handler: showUser })",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.route({ method: \"GET\", url: \"/users/:id\", handler: showUser })",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:addHook:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.addHook(\"preHandler\", async (request, reply) => { await authenticate(request) })",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.addHook(\"preHandler\", async (request, reply) => { await authenticate(request) })",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:register:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.register(userRoutes, { prefix: \"/v1\" })",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.register(userRoutes, { prefix: \"/v1\" })",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:setErrorHandler:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.setErrorHandler((error, request, reply) => { reply.status(500).send({ ok: false }) })",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.setErrorHandler((error, request, reply) => { reply.status(500).send({ ok: false }) })",
    ],
  },
  {
    library: FASTIFY,
    patternKey: "factory:default:*>call:listen:*",
    matches: [
      "import Fastify from \"fastify\"\nconst fastify = Fastify({ logger: true })\nfastify.listen({ port: 3000 }, (err, address) => { report(address) })",
    ],
    rejects: [
      "const fastify = makeLocalRegistry()\nfastify.listen({ port: 3000 }, (err, address) => { report(address) })",
    ],
  },
]
