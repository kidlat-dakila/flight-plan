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

describe("typescript/prisma", () => {
  it("Implement function tradePokemon", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/repositories/pokemon.ts b/src/repositories/pokemon.ts",
          "--- a/src/repositories/pokemon.ts",
          "+++ b/src/repositories/pokemon.ts",
          "@@ -10,0 +11,12 @@ export function createPokemon(data: Prisma.PokemonUncheckedCreateInput) {",
          "+",
          "+export function countPartyOf(trainerId: number) {",
          "+  return db.pokemon.count({ where: { trainerId } })",
          "+}",
          "+",
          "+export function transferPokemon(id: number, trainerId: number) {",
          "+  return db.pokemon.update({",
          "+    where: { id },",
          "+    data: { trainer: { connect: { id: trainerId } } },",
          "+    include: { trainer: true },",
          "+  })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/services/party.ts b/src/services/party.ts",
          "--- a/src/services/party.ts",
          "+++ b/src/services/party.ts",
          "@@ -1 +1,5 @@",
          "-import { createPokemon, findPartyOf } from \"~/repositories/pokemon\"",
          "+import { countPartyOf, createPokemon, findPartyOf, transferPokemon } from \"~/repositories/pokemon\"",
          "+",
          "+const PARTY_LIMIT = 6",
          "+",
          "+export class PartyFullError extends Error {}",
          "@@ -10,0 +15,6 @@ export async function strongestOf(trainerId: number) {",
          "+",
          "+export async function tradePokemon(pokemonId: number, toTrainerId: number) {",
          "+  const partySize = await countPartyOf(toTrainerId)",
          "+  if (partySize >= PARTY_LIMIT) throw new PartyFullError(`Trainer ${toTrainerId} already has ${PARTY_LIMIT} Pokemon`)",
          "+  return transferPokemon(pokemonId, toTrainerId)",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
