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

describe("typescript/typeorm", () => {
  it("Implement function catchPokemon", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokemon/pokemon.entity.ts b/src/pokemon/pokemon.entity.ts",
          "--- a/src/pokemon/pokemon.entity.ts",
          "+++ b/src/pokemon/pokemon.entity.ts",
          "@@ -1 +1 @@",
          "-import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from \"typeorm\"",
          "+import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from \"typeorm\"",
          "@@ -14,0 +15,3 @@ export class Pokemon {",
          "+  @CreateDateColumn()",
          "+  caughtAt!: Date",
          "+",
        ].join("\n"),
        [
          "diff --git a/src/trainers/trainer.entity.ts b/src/trainers/trainer.entity.ts",
          "--- a/src/trainers/trainer.entity.ts",
          "+++ b/src/trainers/trainer.entity.ts",
          "@@ -3,0 +4,2 @@ import { Pokemon } from \"@/pokemon/pokemon.entity\"",
          "+const TEAM_SIZE = 6",
          "+",
          "@@ -16,0 +19,4 @@ export class Trainer {",
          "+",
          "+  hasRoomInTeam(): boolean {",
          "+    return this.team.length < TEAM_SIZE",
          "+  }",
        ].join("\n"),
        [
          "diff --git a/src/errors.ts b/src/errors.ts",
          "--- a/src/errors.ts",
          "+++ b/src/errors.ts",
          "@@ -8,0 +9,6 @@ export class NotFoundError extends Error {",
          "+",
          "+export class TeamFullError extends Error {",
          "+  constructor(readonly trainerName: string) {",
          "+    super(`${trainerName} already carries six Pokemon`)",
          "+  }",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/trainers/team.ts b/src/trainers/team.ts",
          "--- a/src/trainers/team.ts",
          "+++ b/src/trainers/team.ts",
          "@@ -2,2 +2,2 @@ import { dataSource } from \"@/data-source\"",
          "-import { NotFoundError } from \"@/errors\"",
          "-import type { Pokemon } from \"@/pokemon/pokemon.entity\"",
          "+import { NotFoundError, TeamFullError } from \"@/errors\"",
          "+import { Pokemon } from \"@/pokemon/pokemon.entity\"",
          "@@ -6,0 +7 @@ const trainers = dataSource.getRepository(Trainer)",
          "+const pokemon = dataSource.getRepository(Pokemon)",
          "@@ -12,0 +14,7 @@ export const readTeam = async (trainerId: number): Promise<Pokemon[]> => {",
          "+",
          "+export const catchPokemon = async (trainerId: number, species: string): Promise<Pokemon> => {",
          "+  const trainer: Trainer | null = await trainers.findOne({ where: { id: trainerId }, relations: { team: true } })",
          "+  if (trainer === null) throw new NotFoundError(\"trainer\", trainerId)",
          "+  if (!trainer.hasRoomInTeam()) throw new TeamFullError(trainer.name)",
          "+  return pokemon.save(pokemon.create({ species, trainer }))",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/scripts/catch-pokemon.ts b/src/scripts/catch-pokemon.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/scripts/catch-pokemon.ts",
          "@@ -0,0 +1,11 @@",
          "+import { dataSource } from \"@/data-source\"",
          "+import { catchPokemon } from \"@/trainers/team\"",
          "+",
          "+const catchOne = async (trainerId: number, species: string) => {",
          "+  await dataSource.initialize()",
          "+  const pokemon = await catchPokemon(trainerId, species)",
          "+  console.log(`${pokemon.trainer.name} caught ${pokemon.species} at ${pokemon.caughtAt.toISOString()}`)",
          "+  await dataSource.destroy()",
          "+}",
          "+",
          "+void catchOne(Number(process.argv[2]), process.argv[3])",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
