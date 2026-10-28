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

describe("card-kinds/class/typescript", () => {
  it("Implement class GymCamp", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/main.ts b/src/main.ts",
          "--- a/src/main.ts",
          "+++ b/src/main.ts",
          "@@ -1 +1 @@",
          "-import { TrainerRoster } from \"@/trainers/roster\"",
          "+import { GymCamp } from \"@/training/gym-camp\"",
          "@@ -3 +3 @@ import { TrainerRoster } from \"@/trainers/roster\"",
          "-const roster = new TrainerRoster()",
          "+const camp = new GymCamp()",
          "@@ -5 +5 @@ const roster = new TrainerRoster()",
          "-console.log(roster.findTrainer(1)?.name)",
          "+console.log(camp.train(1, 5))",
        ].join("\n"),
        [
          "diff --git a/src/trainers/roster.ts b/src/trainers/roster.ts",
          "--- a/src/trainers/roster.ts",
          "+++ b/src/trainers/roster.ts",
          "@@ -1 +1,2 @@",
          "-import type { Trainer } from \"./trainer\"",
          "+import { MAX_LEVEL } from \"@/config\"",
          "+import type { Pokemon, Trainer } from \"./trainer\"",
          "@@ -13,0 +15,8 @@ export class TrainerRoster {",
          "+",
          "+  levelUp(id: number, levels: number): Pokemon[] {",
          "+    const trainer = this.findTrainer(id)",
          "+    if (trainer === undefined) return []",
          "+    const team = trainer.team.map((pokemon) => ({ ...pokemon, level: Math.min(pokemon.level + levels, MAX_LEVEL) }))",
          "+    this.trainersById.set(id, { ...trainer, team })",
          "+    return team",
          "+  }",
        ].join("\n"),
        [
          "diff --git a/src/training/camp.ts b/src/training/camp.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/training/camp.ts",
          "@@ -0,0 +1,19 @@",
          "+import { TrainerRoster } from \"@/trainers/roster\"",
          "+import type { Pokemon } from \"@/trainers/trainer\"",
          "+",
          "+export class TrainingCamp {",
          "+  sessions = 0",
          "+",
          "+  constructor(private readonly roster: TrainerRoster = new TrainerRoster()) {}",
          "+",
          "+  train(trainerId: number, levels: number): string {",
          "+    const team = this.roster.levelUp(trainerId, levels)",
          "+    if (team.length === 0) return `Trainer ${trainerId} has no Pokemon to train`",
          "+    this.sessions += 1",
          "+    return this.report(team)",
          "+  }",
          "+",
          "+  report(team: Pokemon[]): string {",
          "+    return `${team.length} Pokemon trained`",
          "+  }",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/training/gym-camp.ts b/src/training/gym-camp.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/training/gym-camp.ts",
          "@@ -0,0 +1,11 @@",
          "+import type { Pokemon } from \"@/trainers/trainer\"",
          "+import { TrainingCamp } from \"./camp\"",
          "+",
          "+export class GymCamp extends TrainingCamp {",
          "+  badge = \"Boulder Badge\"",
          "+",
          "+  report(team: Pokemon[]): string {",
          "+    const strongest = Math.max(...team.map((pokemon) => pokemon.level))",
          "+    return `${team.length} Pokemon trained for the ${this.badge}, the strongest at level ${strongest}`",
          "+  }",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
