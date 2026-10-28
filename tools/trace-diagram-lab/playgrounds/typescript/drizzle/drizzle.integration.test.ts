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

describe("typescript/drizzle", () => {
  it("Implement function trainPokemon", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/db/queries/pokemon.ts b/src/db/queries/pokemon.ts",
          "--- a/src/db/queries/pokemon.ts",
          "+++ b/src/db/queries/pokemon.ts",
          "@@ -13,0 +14,9 @@ export async function insertPokemon(fields: NewPokemon): Promise<Pokemon> {",
          "+",
          "+export function findPokemonWithTrainer(id: number) {",
          "+  return db.query.pokemon.findFirst({ where: eq(pokemon.id, id), with: { trainer: true } })",
          "+}",
          "+",
          "+export async function savePokemonProgress(id: number, progress: Pick<Pokemon, \"level\" | \"experience\">): Promise<Pokemon> {",
          "+  const [saved] = await db.update(pokemon).set(progress).where(eq(pokemon.id, id)).returning()",
          "+  return saved",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/db/schema.ts b/src/db/schema.ts",
          "--- a/src/db/schema.ts",
          "+++ b/src/db/schema.ts",
          "@@ -0,0 +1 @@",
          "+import { relations } from \"drizzle-orm\"",
          "@@ -12,0 +14 @@ export const pokemon = pgTable(\"pokemon\", {",
          "+  experience: integer(\"experience\").notNull().default(0),",
          "@@ -16,0 +19,4 @@ export const pokemon = pgTable(\"pokemon\", {",
          "+export const pokemonRelations = relations(pokemon, ({ one }) => ({",
          "+  trainer: one(trainers, { fields: [pokemon.trainerId], references: [trainers.id] }),",
          "+}))",
          "+",
        ].join("\n"),
        [
          "diff --git a/src/pokemon/service.ts b/src/pokemon/service.ts",
          "--- a/src/pokemon/service.ts",
          "+++ b/src/pokemon/service.ts",
          "@@ -1 +1 @@",
          "-import { findPokemon, insertPokemon } from \"@/db/queries/pokemon\"",
          "+import { findPokemon, findPokemonWithTrainer, insertPokemon, savePokemonProgress } from \"@/db/queries/pokemon\"",
          "@@ -3,0 +4,2 @@ import type { NewPokemon, Pokemon } from \"@/db/schema\"",
          "+const EXPERIENCE_PER_LEVEL = 100",
          "+",
          "@@ -10,0 +13,10 @@ export async function showPokemon(id: number): Promise<Pokemon | undefined> {",
          "+",
          "+export async function trainPokemon(id: number, gainedExperience: number): Promise<Pokemon | undefined> {",
          "+  const trained = await findPokemonWithTrainer(id)",
          "+  if (trained?.trainer == null) return undefined",
          "+  const experience = trained.experience + gainedExperience",
          "+  return savePokemonProgress(id, {",
          "+    level: trained.level + Math.floor(experience / EXPERIENCE_PER_LEVEL),",
          "+    experience: experience % EXPERIENCE_PER_LEVEL,",
          "+  })",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
