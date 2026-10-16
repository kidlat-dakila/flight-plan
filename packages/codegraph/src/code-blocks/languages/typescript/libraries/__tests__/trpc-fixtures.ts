import type { PatternFixture } from "@/catalogue/types"

const TRPC = "tRPC"

export const trpcFixtures: readonly PatternFixture[] = [
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()",
    ],
    rejects: [
      "const initTRPC = makeLocalRegistry()\nconst t = initTRPC.create()",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*>call:query:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()\nconst list = t.procedure.query(() => listUsers())",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst list = t.procedure.query(() => listUsers())",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*>call:mutation:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()\nconst create = t.procedure.input(schema).mutation(({ input }) => createUser(input))",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst create = t.procedure.input(schema).mutation(({ input }) => createUser(input))",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*>call:subscription:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()\nconst onPostAdd = t.procedure.subscription(async function* (opts) { yield* posts(opts.signal) })",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst onPostAdd = t.procedure.subscription(async function* (opts) { yield* posts(opts.signal) })",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*>call:use:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()\nconst protectedProcedure = t.procedure.use(isAuthed)",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst protectedProcedure = t.procedure.use(isAuthed)",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:initTRPC.create:*>call:input:*",
    matches: [
      "import { initTRPC } from \"@trpc/server\"\nconst t = initTRPC.create()\nconst withInput = t.procedure.input(z.object({ name: z.string() }))",
    ],
    rejects: [
      "const t = makeLocalRegistry()\nconst withInput = t.procedure.input(z.object({ name: z.string() }))",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCClient:*",
    matches: [
      "import { createTRPCClient } from \"@trpc/client\"\nconst client = createTRPCClient({ links: [httpBatchLink({ url: \"/trpc\" })] })",
    ],
    rejects: [
      "const createTRPCClient = (...parts) => parts\nconst client = createTRPCClient({ links: [httpBatchLink({ url: \"/trpc\" })] })",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCClient:*>call:query:*",
    matches: [
      "import { createTRPCClient } from \"@trpc/client\"\nconst client = createTRPCClient({ links: [httpBatchLink({ url: \"/trpc\" })] })\nconst users = await client.user.list.query()",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst users = await client.user.list.query()",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCClient:*>call:mutate:*",
    matches: [
      "import { createTRPCClient } from \"@trpc/client\"\nconst client = createTRPCClient({ links: [httpBatchLink({ url: \"/trpc\" })] })\nawait client.user.create.mutate({ name: \"Ada\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nawait client.user.create.mutate({ name: \"Ada\" })",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCReact:*",
    matches: [
      "import { createTRPCReact } from \"@trpc/react-query\"\nconst trpc = createTRPCReact()",
    ],
    rejects: [
      "const createTRPCReact = (...parts) => parts\nconst trpc = createTRPCReact()",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCReact:*>call:useQuery:*",
    matches: [
      "import { createTRPCReact } from \"@trpc/react-query\"\nconst trpc = createTRPCReact()\nconst users = trpc.user.list.useQuery()",
    ],
    rejects: [
      "const trpc = makeLocalRegistry()\nconst users = trpc.user.list.useQuery()",
    ],
  },
  {
    library: TRPC,
    patternKey: "factory:createTRPCReact:*>call:useMutation:*",
    matches: [
      "import { createTRPCReact } from \"@trpc/react-query\"\nconst trpc = createTRPCReact()\nconst createUser = trpc.user.create.useMutation()",
    ],
    rejects: [
      "const trpc = makeLocalRegistry()\nconst createUser = trpc.user.create.useMutation()",
    ],
  },
]
