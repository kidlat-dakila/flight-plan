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

describe("card-kinds/route/nestjs", () => {
  it("Added route POST /api/pokemon behind two guards", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokemon/pokemon.controller.ts b/src/pokemon/pokemon.controller.ts",
          "--- a/src/pokemon/pokemon.controller.ts",
          "+++ b/src/pokemon/pokemon.controller.ts",
          "@@ -1,2 +1,4 @@",
          "-import { Controller, Get, Param, ParseIntPipe, UseGuards } from \"@nestjs/common\"",
          "-import { ApiKeyGuard } from \"@/security\"",
          "+import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, UseGuards } from \"@nestjs/common\"",
          "+import { ApiKeyGuard, TrainerGuard } from \"@/security\"",
          "+import type { Pokemon } from \"@/pokemon/pokemon\"",
          "+import { CreatePokemonDto } from \"@/pokemon/pokemon.dto\"",
          "@@ -4,0 +7,2 @@ import { PokemonService } from \"@/pokemon/pokemon.service\"",
          "+const toView = ({ id, name, level }: Pokemon) => ({ id, name, level })",
          "+",
          "@@ -12 +16,7 @@ export class PokemonController {",
          "-    return this.pokemon.list()",
          "+    return this.pokemon.list().map(toView)",
          "+  }",
          "+",
          "+  @Post()",
          "+  @UseGuards(TrainerGuard)",
          "+  add(@Body() draft: CreatePokemonDto, @Headers(\"x-trainer\") trainerName: string) {",
          "+    return toView(this.pokemon.create(draft, trainerName))",
          "@@ -17 +27 @@ export class PokemonController {",
          "-    return this.pokemon.find(pokemonId)",
          "+    return toView(this.pokemon.find(pokemonId))",
        ].join("\n"),
        [
          "diff --git a/src/security.ts b/src/security.ts",
          "--- a/src/security.ts",
          "+++ b/src/security.ts",
          "@@ -1 +1 @@",
          "-import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from \"@nestjs/common\"",
          "+import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from \"@nestjs/common\"",
          "@@ -9 +9,10 @@ export class ApiKeyGuard implements CanActivate {",
          "-    if (request.header(\"x-api-key\") !== API_KEY) throw new UnauthorizedException(\"invalid API key\")",
          "+    if (request.header(\"x-api-key\") !== API_KEY) throw new UnauthorizedException(\"The API key is missing or wrong.\")",
          "+    return true",
          "+  }",
          "+}",
          "+",
          "+@Injectable()",
          "+export class TrainerGuard implements CanActivate {",
          "+  canActivate(context: ExecutionContext): boolean {",
          "+    const request = context.switchToHttp().getRequest<Request>()",
          "+    if (request.header(\"x-trainer\") === undefined) throw new ForbiddenException(\"A trainer must sign in to add a Pokemon.\")",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
