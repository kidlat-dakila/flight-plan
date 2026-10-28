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

describe("card-kinds/trpc-router/nestjs", () => {
  it("Modified resolver TrainersResolver to award badges and resolve teams", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/trainers/rules.ts b/src/trainers/rules.ts",
          "--- a/src/trainers/rules.ts",
          "+++ b/src/trainers/rules.ts",
          "@@ -4,0 +5 @@ export function withBadge(trainer: Trainer, badge: string): Trainer {",
          "+  if (trainer.badges.includes(badge)) return trainer",
          "@@ -9 +10 @@ export function orderTeam(team: Pokemon[]): Pokemon[] {",
          "-  return [...team]",
          "+  return [...team].sort((left, right) => right.level - left.level)",
        ].join("\n"),
        [
          "diff --git a/src/trainers/trainers.resolver.ts b/src/trainers/trainers.resolver.ts",
          "--- a/src/trainers/trainers.resolver.ts",
          "+++ b/src/trainers/trainers.resolver.ts",
          "@@ -1 +1,3 @@",
          "-import { Query, Resolver } from \"@nestjs/graphql\"",
          "+import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from \"@nestjs/graphql\"",
          "+import { PubSub } from \"graphql-subscriptions\"",
          "+import { Pokemon } from \"@/trainers/pokemon.model\"",
          "@@ -4,0 +7,2 @@ import { TrainersService } from \"@/trainers/trainers.service\"",
          "+const pubSub = new PubSub()",
          "+",
          "@@ -10,2 +14,24 @@ export class TrainersResolver {",
          "-  trainers(): Trainer[] {",
          "-    return this.trainersService.list()",
          "+  trainers(@Args(\"hometown\", { nullable: true }) hometown?: string): Trainer[] {",
          "+    const trainers = this.trainersService.list()",
          "+    return hometown === undefined ? trainers : trainers.filter((trainer) => trainer.hometown === hometown)",
          "+  }",
          "+",
          "+  @Mutation(() => Trainer)",
          "+  async awardBadge(@Args(\"trainerId\") trainerId: number, @Args(\"badge\") badge: string): Promise<Trainer> {",
          "+    const trainer = this.trainersService.awardBadge(trainerId, this.badgeName(badge))",
          "+    await pubSub.publish(\"badgeAwarded\", { badgeAwarded: trainer })",
          "+    return trainer",
          "+  }",
          "+",
          "+  @Subscription(() => Trainer)",
          "+  badgeAwarded() {",
          "+    return pubSub.asyncIterableIterator(\"badgeAwarded\")",
          "+  }",
          "+",
          "+  @ResolveField()",
          "+  team(@Parent() trainer: Trainer): Pokemon[] {",
          "+    return this.trainersService.teamOf(trainer.id)",
          "+  }",
          "+",
          "+  badgeName(badge: string): string {",
          "+    return badge.endsWith(\" Badge\") ? badge : `${badge} Badge`",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
