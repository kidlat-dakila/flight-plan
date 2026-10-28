import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { CASE_REF, setupTest } from "@flightplan/playground-fixtures/test-setup"
import { expectTraceSnapshot } from "@test-setup/trace-snapshot"

const REPO_PATH = join(import.meta.dirname, "repo")

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("card-kinds/route/fastify", () => {
  it("Added two routes POST /api/pokemon and PUT /api/pokemon/:pokemonId", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/index.ts b/src/index.ts",
          "--- a/src/index.ts",
          "+++ b/src/index.ts",
          "@@ -1 +1 @@",
          "-import Fastify from \"fastify\"",
          "+import Fastify, { type FastifyReply, type FastifyRequest } from \"fastify\"",
          "@@ -5,0 +6,7 @@ const PORT = 3000",
          "+const API_KEY = \"pallet-town\"",
          "+",
          "+const requireApiKey = async (request: FastifyRequest, reply: FastifyReply) => {",
          "+  if (request.headers[\"x-api-key\"] !== API_KEY) {",
          "+    return reply.code(401).send({ error: \"The API key is missing or wrong.\" })",
          "+  }",
          "+}",
          "@@ -8,0 +16 @@ const app = Fastify({ logger: true })",
          "+app.addHook(\"onRequest\", requireApiKey)",
        ].join("\n"),
        [
          "diff --git a/src/pokemon/controller.ts b/src/pokemon/controller.ts",
          "--- a/src/pokemon/controller.ts",
          "+++ b/src/pokemon/controller.ts",
          "@@ -2 +2 @@ import type { FastifyReply, FastifyRequest } from \"fastify\"",
          "-import { readParty } from \"@/pokemon/store\"",
          "+import { readParty, renamePokemon } from \"@/pokemon/store\"",
          "@@ -5 +5,8 @@ export const listPokemon = async (_request: FastifyRequest, reply: FastifyReply)",
          "-  reply.send(readParty())",
          "+  const party = readParty().toSorted((first, second) => second.level - first.level)",
          "+  reply.send(party)",
          "+}",
          "+",
          "+export const renamePokemonById = async (request: FastifyRequest<{ Params: { pokemonId: string }; Body: { name: string } }>, reply: FastifyReply) => {",
          "+  const pokemon = renamePokemon(Number(request.params.pokemonId), request.body.name)",
          "+  if (pokemon === undefined) return reply.code(404).send()",
          "+  return pokemon",
        ].join("\n"),
        [
          "diff --git a/src/pokemon/routes.ts b/src/pokemon/routes.ts",
          "--- a/src/pokemon/routes.ts",
          "+++ b/src/pokemon/routes.ts",
          "@@ -1,2 +1,15 @@",
          "-import type { FastifyInstance } from \"fastify\"",
          "-import { listPokemon } from \"@/pokemon/controller\"",
          "+import type { FastifyInstance, FastifyReply, FastifyRequest } from \"fastify\"",
          "+import { listPokemon, renamePokemonById } from \"@/pokemon/controller\"",
          "+import { addPokemon } from \"@/pokemon/store\"",
          "+",
          "+interface PokemonBody {",
          "+  name: string",
          "+  level: number",
          "+}",
          "+",
          "+const validatePokemon = async (request: FastifyRequest<{ Body: PokemonBody }>, reply: FastifyReply) => {",
          "+  const { name, level } = request.body",
          "+  if (typeof name !== \"string\" || !Number.isInteger(level)) {",
          "+    return reply.code(400).send({ error: \"A Pokemon needs a name and a whole level.\" })",
          "+  }",
          "+}",
          "@@ -5,0 +19,7 @@ export default async function pokemonRoutes(fastify: FastifyInstance) {",
          "+",
          "+  fastify.post(\"/pokemon\", { preHandler: [validatePokemon] }, async (request: FastifyRequest<{ Body: PokemonBody }>, reply: FastifyReply) => {",
          "+    const pokemon = addPokemon(request.body.name, request.body.level)",
          "+    return reply.code(201).send(pokemon)",
          "+  })",
          "+",
          "+  fastify.route({ method: [\"PUT\", \"PATCH\"], url: \"/pokemon/:pokemonId\", handler: renamePokemonById })",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
