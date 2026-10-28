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

describe("python/base", () => {
  it("Added method Team.train to level up one member", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/rules.py b/src/pokedex/rules.py",
          "--- a/src/pokedex/rules.py",
          "+++ b/src/pokedex/rules.py",
          "@@ -1,0 +2 @@ MAX_TEAM_SIZE = 6",
          "+MAX_LEVEL = 100",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/models.py b/src/pokedex/models.py",
          "--- a/src/pokedex/models.py",
          "+++ b/src/pokedex/models.py",
          "@@ -1 +1,3 @@",
          "-from dataclasses import dataclass, field",
          "+from dataclasses import dataclass, field, replace",
          "+",
          "+from .rules import MAX_LEVEL",
          "@@ -9,0 +12,3 @@ class Pokemon:",
          "+    def level_up(self) -> \"Pokemon\":",
          "+        return replace(self, level=min(self.level + 1, MAX_LEVEL))",
          "+",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/team.py b/src/pokedex/team.py",
          "--- a/src/pokedex/team.py",
          "+++ b/src/pokedex/team.py",
          "@@ -12,0 +13 @@ class Team:",
          "+        self.sessions = 0",
          "@@ -18,0 +20,7 @@ class Team:",
          "+    def train(self, slot: int) -> Pokemon:",
          "+        pokemon: Pokemon = self.members[slot]",
          "+        trained = pokemon.level_up()",
          "+        self.members[slot] = trained",
          "+        self.sessions += 1",
          "+        return trained",
          "+",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/cli.py b/src/pokedex/cli.py",
          "--- a/src/pokedex/cli.py",
          "+++ b/src/pokedex/cli.py",
          "@@ -14,0 +15 @@ def main() -> None:",
          "+    team.train(0)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
