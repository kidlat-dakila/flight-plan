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

describe("typescript/trpc", () => {
  it("Added mutation rename to pokemonRouter", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/client/PartyList.tsx b/src/client/PartyList.tsx",
          "--- a/src/client/PartyList.tsx",
          "+++ b/src/client/PartyList.tsx",
          "@@ -1,0 +2 @@ import { api } from \"~/client/api\"",
          "+import { RenameForm } from \"~/client/RenameForm\"",
          "@@ -10,0 +12 @@ export function PartyList() {",
          "+          <RenameForm id={pokemon.id} name={pokemon.name} />",
        ].join("\n"),
        [
          "diff --git a/src/client/RenameForm.tsx b/src/client/RenameForm.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/client/RenameForm.tsx",
          "@@ -0,0 +1,23 @@",
          "+import { useState } from \"react\"",
          "+import { api } from \"~/client/api\"",
          "+",
          "+export function RenameForm({ id, name }: { id: number; name: string }) {",
          "+  const [draft, setDraft] = useState(name)",
          "+  const utils = api.useUtils()",
          "+  const rename = api.pokemon.rename.useMutation({",
          "+    onSuccess: () => utils.pokemon.list.invalidate(),",
          "+  })",
          "+  return (",
          "+    <form",
          "+      onSubmit={(event) => {",
          "+        event.preventDefault()",
          "+        rename.mutate({ id, name: draft })",
          "+      }}",
          "+    >",
          "+      <input value={draft} onChange={(event) => setDraft(event.target.value)} />",
          "+      <button type=\"submit\" disabled={rename.isPending}>",
          "+        Rename",
          "+      </button>",
          "+    </form>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/server/data/pokemon.ts b/src/server/data/pokemon.ts",
          "--- a/src/server/data/pokemon.ts",
          "+++ b/src/server/data/pokemon.ts",
          "@@ -19,0 +20,5 @@ export function readPokemon(id: number): Pokemon | undefined {",
          "+",
          "+export function renamePokemon(id: number, name: string): Pokemon | undefined {",
          "+  party = party.map((pokemon) => (pokemon.id === id ? { ...pokemon, name } : pokemon))",
          "+  return readPokemon(id)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/server/routers/pokemon.ts b/src/server/routers/pokemon.ts",
          "--- a/src/server/routers/pokemon.ts",
          "+++ b/src/server/routers/pokemon.ts",
          "@@ -0,0 +1 @@",
          "+import { TRPCError } from \"@trpc/server\"",
          "@@ -2,2 +3,2 @@ import { z } from \"zod\"",
          "-import { readParty, readPokemon } from \"~/server/data/pokemon\"",
          "-import { createTRPCRouter, publicProcedure } from \"~/server/trpc\"",
          "+import { readParty, readPokemon, renamePokemon } from \"~/server/data/pokemon\"",
          "+import { createTRPCRouter, protectedProcedure, publicProcedure } from \"~/server/trpc\"",
          "@@ -8,0 +10,7 @@ export const pokemonRouter = createTRPCRouter({",
          "+",
          "+  rename: protectedProcedure",
          "+    .input(z.object({ id: z.number(), name: z.string().min(1) }))",
          "+    .mutation(({ ctx, input }) => {",
          "+      if (readPokemon(input.id)?.trainerName !== ctx.trainerName) throw new TRPCError({ code: \"FORBIDDEN\" })",
          "+      return renamePokemon(input.id, input.name)",
          "+    }),",
        ].join("\n"),
        [
          "diff --git a/src/server/trpc.ts b/src/server/trpc.ts",
          "--- a/src/server/trpc.ts",
          "+++ b/src/server/trpc.ts",
          "@@ -1 +1 @@",
          "-import { initTRPC } from \"@trpc/server\"",
          "+import { initTRPC, TRPCError } from \"@trpc/server\"",
          "@@ -12,0 +13,5 @@ const t = initTRPC.context<Context>().create()",
          "+const requireTrainer = t.middleware(({ ctx, next }) => {",
          "+  if (ctx.trainerName === null) throw new TRPCError({ code: \"UNAUTHORIZED\" })",
          "+  return next({ ctx: { trainerName: ctx.trainerName } })",
          "+})",
          "+",
          "@@ -14,0 +20 @@ export const publicProcedure = t.procedure",
          "+export const protectedProcedure = t.procedure.use(requireTrainer)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
