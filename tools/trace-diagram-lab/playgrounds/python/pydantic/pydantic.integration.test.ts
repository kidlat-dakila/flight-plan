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

describe("python/pydantic", () => {
  it("Implement schema TradeOffer", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/schemas.py b/src/pokedex/schemas.py",
          "--- a/src/pokedex/schemas.py",
          "+++ b/src/pokedex/schemas.py",
          "@@ -1 +1,3 @@",
          "-from pydantic import BaseModel, Field, field_validator",
          "+from typing import Self",
          "+",
          "+from pydantic import BaseModel, Field, field_validator, model_validator",
          "@@ -5,0 +8,5 @@ from pokedex.types import POKEMON_TYPES",
          "+class Move(BaseModel):",
          "+    name: str = Field(min_length=1, max_length=30)",
          "+    power: int = Field(ge=0, le=250)",
          "+",
          "+",
          "@@ -9,0 +17 @@ class PokemonEntry(BaseModel):",
          "+    moves: list[Move] = Field(default_factory=list, max_length=4)",
          "@@ -23,0 +32,17 @@ class Trainer(BaseModel):",
          "+",
          "+",
          "+class TradeOffer(BaseModel):",
          "+    trainer: str",
          "+    offered: PokemonEntry",
          "+    wanted: PokemonEntry",
          "+",
          "+    @field_validator(\"trainer\")",
          "+    @classmethod",
          "+    def strip_trainer(cls, trainer: str) -> str:",
          "+        return trainer.strip()",
          "+",
          "+    @model_validator(mode=\"after\")",
          "+    def check_fair_levels(self) -> Self:",
          "+        if abs(self.offered.level - self.wanted.level) > 10:",
          "+            raise ValueError(\"the levels of a fair trade differ by 10 at most\")",
          "+        return self",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/importer.py b/src/pokedex/importer.py",
          "--- a/src/pokedex/importer.py",
          "+++ b/src/pokedex/importer.py",
          "@@ -3 +3 @@ from pathlib import Path",
          "-from pokedex.schemas import Trainer",
          "+from pokedex.schemas import PokemonEntry, TradeOffer, Trainer",
          "@@ -7,0 +8,4 @@ def read_trainer(path: Path) -> Trainer:",
          "+",
          "+",
          "+def build_offer(trainer: str, offered: dict, wanted: dict) -> TradeOffer:",
          "+    return TradeOffer(trainer=trainer, offered=PokemonEntry.model_validate(offered), wanted=PokemonEntry.model_validate(wanted))",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/cli.py b/src/pokedex/cli.py",
          "--- a/src/pokedex/cli.py",
          "+++ b/src/pokedex/cli.py",
          "@@ -0,0 +1 @@",
          "+import json",
          "@@ -6 +7 @@ from pydantic import ValidationError",
          "-from pokedex.importer import read_trainer",
          "+from pokedex.importer import build_offer, read_trainer",
          "@@ -11,0 +13 @@ def main() -> None:",
          "+        offer = build_offer(trainer.name, trainer.team[0].model_dump(), json.loads(sys.argv[2]))",
          "@@ -15 +17 @@ def main() -> None:",
          "-    print(f\"{trainer.name} has {len(trainer.team)} Pokemon\")",
          "+    print(f\"{offer.trainer} offers {offer.offered.name} for {offer.wanted.name}\")",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
