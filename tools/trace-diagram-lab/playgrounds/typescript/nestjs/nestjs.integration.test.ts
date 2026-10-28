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

describe("typescript/nestjs", () => {
  it("Implement route POST /api/trainers/:trainerId/badges", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/settings.ts b/src/settings.ts",
          "--- a/src/settings.ts",
          "+++ b/src/settings.ts",
          "@@ -1,0 +2 @@ export const API_KEY = process.env.POKEDEX_API_KEY ?? \"dev-key\"",
          "+export const GYM_LEADER_KEY = process.env.POKEDEX_GYM_LEADER_KEY ?? \"dev-gym-leader-key\"",
        ].join("\n"),
        [
          "diff --git a/src/security.ts b/src/security.ts",
          "--- a/src/security.ts",
          "+++ b/src/security.ts",
          "@@ -1 +1 @@",
          "-import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from \"@nestjs/common\"",
          "+import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from \"@nestjs/common\"",
          "@@ -3 +3 @@ import type { Request } from \"express\"",
          "-import { API_KEY } from \"@/settings\"",
          "+import { API_KEY, GYM_LEADER_KEY } from \"@/settings\"",
          "@@ -12,0 +13,9 @@ export class ApiKeyGuard implements CanActivate {",
          "+",
          "+@Injectable()",
          "+export class GymLeaderGuard implements CanActivate {",
          "+  canActivate(context: ExecutionContext): boolean {",
          "+    const request = context.switchToHttp().getRequest<Request>()",
          "+    if (request.header(\"x-gym-leader-key\") !== GYM_LEADER_KEY) throw new ForbiddenException(\"only a gym leader can award a badge\")",
          "+    return true",
          "+  }",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/trainers/trainer.dto.ts b/src/trainers/trainer.dto.ts",
          "--- a/src/trainers/trainer.dto.ts",
          "+++ b/src/trainers/trainer.dto.ts",
          "@@ -1 +1,3 @@",
          "-import { IsString, Length } from \"class-validator\"",
          "+import { IsIn, IsString, Length } from \"class-validator\"",
          "+",
          "+export const BADGES = [\"boulder\", \"cascade\", \"thunder\", \"rainbow\", \"soul\", \"marsh\", \"volcano\", \"earth\"] as const",
          "@@ -11,0 +14,5 @@ export class CreateTrainerDto {",
          "+",
          "+export class AwardBadgeDto {",
          "+  @IsIn(BADGES)",
          "+  badge!: string",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/trainers/trainers.service.ts b/src/trainers/trainers.service.ts",
          "--- a/src/trainers/trainers.service.ts",
          "+++ b/src/trainers/trainers.service.ts",
          "@@ -1 +1 @@",
          "-import { Injectable, NotFoundException } from \"@nestjs/common\"",
          "+import { ConflictException, Injectable, NotFoundException } from \"@nestjs/common\"",
          "@@ -24,0 +25,8 @@ export class TrainersService {",
          "+",
          "+  awardBadge(trainerId: number, badge: string): Trainer {",
          "+    const trainer = this.find(trainerId)",
          "+    if (trainer.badges.includes(badge)) throw new ConflictException(`${trainer.name} already has the ${badge} badge`)",
          "+    const awarded: Trainer = { ...trainer, badges: [...trainer.badges, badge] }",
          "+    this.trainers.set(awarded.id, awarded)",
          "+    return awarded",
          "+  }",
        ].join("\n"),
        [
          "diff --git a/src/trainers/trainers.controller.ts b/src/trainers/trainers.controller.ts",
          "--- a/src/trainers/trainers.controller.ts",
          "+++ b/src/trainers/trainers.controller.ts",
          "@@ -2,2 +2,2 @@ import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from \"@ne",
          "-import { ApiKeyGuard } from \"@/security\"",
          "-import { CreateTrainerDto } from \"@/trainers/trainer.dto\"",
          "+import { ApiKeyGuard, GymLeaderGuard } from \"@/security\"",
          "+import { AwardBadgeDto, CreateTrainerDto } from \"@/trainers/trainer.dto\"",
          "@@ -24,0 +25,6 @@ export class TrainersController {",
          "+",
          "+  @Post(\":trainerId/badges\")",
          "+  @UseGuards(GymLeaderGuard)",
          "+  award(@Param(\"trainerId\", ParseIntPipe) trainerId: number, @Body() award: AwardBadgeDto) {",
          "+    return this.trainers.awardBadge(trainerId, award.badge)",
          "+  }",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
