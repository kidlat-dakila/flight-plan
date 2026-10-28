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

describe("card-kinds/class/python", () => {
  it("Implement class GymCamp", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/cli.py b/src/pokedex/cli.py",
          "--- a/src/pokedex/cli.py",
          "+++ b/src/pokedex/cli.py",
          "@@ -1 +1 @@",
          "-from .trainers.roster import TrainerRoster",
          "+from .trainers.gym_camp import GymCamp",
          "@@ -5,2 +5,2 @@ def main() -> None:",
          "-    roster = TrainerRoster()",
          "-    print(roster.find_trainer(1))",
          "+    camp = GymCamp()",
          "+    print(camp.train(1, 5))",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/trainers/camp.py b/src/pokedex/trainers/camp.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/trainers/camp.py",
          "@@ -0,0 +1,18 @@",
          "+from .models import Pokemon",
          "+from .roster import TrainerRoster",
          "+",
          "+",
          "+class TrainingCamp:",
          "+    def __init__(self) -> None:",
          "+        self.roster: TrainerRoster = TrainerRoster()",
          "+        self.sessions = 0",
          "+",
          "+    def train(self, trainer_id: int, levels: int) -> str:",
          "+        team = self.roster.level_up(trainer_id, levels)",
          "+        if not team:",
          "+            return f\"Trainer {trainer_id} has no Pokemon to train\"",
          "+        self.sessions += 1",
          "+        return self.report(team)",
          "+",
          "+    def report(self, team: list[Pokemon]) -> str:",
          "+        return f\"{len(team)} Pokemon trained\"",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/trainers/gym_camp.py b/src/pokedex/trainers/gym_camp.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/trainers/gym_camp.py",
          "@@ -0,0 +1,10 @@",
          "+from .models import Pokemon",
          "+from .camp import TrainingCamp",
          "+",
          "+",
          "+class GymCamp(TrainingCamp):",
          "+    badge = \"Boulder Badge\"",
          "+",
          "+    def report(self, team: list[Pokemon]) -> str:",
          "+        strongest = max(pokemon.level for pokemon in team)",
          "+        return f\"{len(team)} Pokemon trained for the {self.badge}, the strongest at level {strongest}\"",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/trainers/roster.py b/src/pokedex/trainers/roster.py",
          "--- a/src/pokedex/trainers/roster.py",
          "+++ b/src/pokedex/trainers/roster.py",
          "@@ -0,0 +1,3 @@",
          "+from dataclasses import replace",
          "+",
          "+from ..config import MAX_LEVEL",
          "@@ -14,0 +18,8 @@ class TrainerRoster:",
          "+",
          "+    def level_up(self, trainer_id: int, levels: int) -> list[Pokemon]:",
          "+        trainer = self.find_trainer(trainer_id)",
          "+        if trainer is None:",
          "+            return []",
          "+        team = [replace(pokemon, level=min(pokemon.level + levels, MAX_LEVEL)) for pokemon in trainer.team]",
          "+        self.trainers_by_id[trainer_id] = replace(trainer, team=team)",
          "+        return team",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
