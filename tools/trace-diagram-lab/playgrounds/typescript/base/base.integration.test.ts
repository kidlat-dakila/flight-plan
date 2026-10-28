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

describe("typescript/base", () => {
  it("Implement class TrainingCamp", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/main.ts b/src/main.ts",
          "--- a/src/main.ts",
          "+++ b/src/main.ts",
          "@@ -2,0 +3 @@ import { teamReport } from \"@/teams/team-report\"",
          "+import { TrainingCamp } from \"@/training/training-camp\"",
          "@@ -10,0 +12 @@ const roster = new TrainerRoster(TRAINERS)",
          "+const camp = new TrainingCamp(roster)",
          "@@ -12,0 +15 @@ console.log(teamReport(roster, 1))",
          "+console.log(camp.train(2, 5))",
        ].join("\n"),
        [
          "diff --git a/src/teams/levels.ts b/src/teams/levels.ts",
          "--- a/src/teams/levels.ts",
          "+++ b/src/teams/levels.ts",
          "@@ -0,0 +1 @@",
          "+import { MAX_LEVEL } from \"@/config\"",
          "@@ -7,0 +9,4 @@ export function averageLevel(team: Pokemon[]): number {",
          "+",
          "+export function clampLevel(level: number): number {",
          "+  return Math.min(Math.max(level, 1), MAX_LEVEL)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/trainers/roster.ts b/src/trainers/roster.ts",
          "--- a/src/trainers/roster.ts",
          "+++ b/src/trainers/roster.ts",
          "@@ -1,0 +2 @@ import { TEAM_SIZE } from \"@/config\"",
          "+import { clampLevel } from \"@/teams/levels\"",
          "@@ -17,0 +19,8 @@ export class TrainerRoster {",
          "+",
          "+  levelUpTeam(id: number, levels: number): Pokemon[] {",
          "+    const trainer = this.findTrainer(id)",
          "+    if (trainer === undefined) return []",
          "+    const team = trainer.team.map((pokemon) => ({ ...pokemon, level: clampLevel(pokemon.level + levels) }))",
          "+    this.trainersById.set(id, { ...trainer, team })",
          "+    return team",
          "+  }",
        ].join("\n"),
        [
          "diff --git a/src/training/training-camp.ts b/src/training/training-camp.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/training/training-camp.ts",
          "@@ -0,0 +1,13 @@",
          "+import { formatLevel } from \"@/lib/format\"",
          "+import { averageLevel } from \"@/teams/levels\"",
          "+import type { TrainerRoster } from \"@/trainers\"",
          "+",
          "+export class TrainingCamp {",
          "+  constructor(private readonly roster: TrainerRoster) {}",
          "+",
          "+  train(trainerId: number, levels: number): string {",
          "+    const team = this.roster.levelUpTeam(trainerId, levels)",
          "+    if (team.length === 0) return `Trainer ${trainerId} has no Pokemon to train.`",
          "+    return `${team.length} Pokemon trained, average ${formatLevel(averageLevel(team))}`",
          "+  }",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
