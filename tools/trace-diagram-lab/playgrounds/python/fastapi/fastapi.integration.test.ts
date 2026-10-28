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

describe("python/fastapi", () => {
  it("Implement route POST /api/trainers/{trainer_id}/badges", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/badges/schemas.py b/src/pokedex/badges/schemas.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/badges/schemas.py",
          "@@ -0,0 +1,11 @@",
          "+from pydantic import BaseModel, Field",
          "+",
          "+",
          "+class BadgeAward(BaseModel):",
          "+    badge: str = Field(min_length=1, max_length=30)",
          "+",
          "+",
          "+class TrainerBadges(BaseModel):",
          "+    id: int",
          "+    name: str",
          "+    badges: list[str]",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/badges/dependencies.py b/src/pokedex/badges/dependencies.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/badges/dependencies.py",
          "@@ -0,0 +1,11 @@",
          "+from typing import Annotated",
          "+",
          "+from fastapi import Header, HTTPException",
          "+",
          "+GYM_LEADERS = {\"brock\", \"misty\", \"lt-surge\"}",
          "+",
          "+",
          "+def require_gym_leader(x_gym_leader: Annotated[str, Header()]) -> str:",
          "+    if x_gym_leader not in GYM_LEADERS:",
          "+        raise HTTPException(status_code=403, detail=\"only a gym leader awards badges\")",
          "+    return x_gym_leader",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/badges/service.py b/src/pokedex/badges/service.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/badges/service.py",
          "@@ -0,0 +1,8 @@",
          "+from pokedex.trainers.schemas import TrainerRead",
          "+from pokedex.trainers.service import trainers",
          "+",
          "+",
          "+def award_badge(trainer: TrainerRead, badge: str) -> TrainerRead:",
          "+    awarded = trainer.model_copy(update={\"badges\": [*trainer.badges, badge]})",
          "+    trainers[trainer.id] = awarded",
          "+    return awarded",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/badges/routes.py b/src/pokedex/badges/routes.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/badges/routes.py",
          "@@ -0,0 +1,13 @@",
          "+from fastapi import APIRouter, Depends",
          "+",
          "+from pokedex.badges.dependencies import require_gym_leader",
          "+from pokedex.badges.schemas import BadgeAward, TrainerBadges",
          "+from pokedex.badges.service import award_badge",
          "+from pokedex.trainers.dependencies import TrainerDep",
          "+",
          "+router = APIRouter(prefix=\"/trainers/{trainer_id}/badges\", tags=[\"badges\"])",
          "+",
          "+",
          "+@router.post(\"/\", response_model=TrainerBadges, status_code=201, dependencies=[Depends(require_gym_leader)])",
          "+def add_badge(award: BadgeAward, trainer: TrainerDep):",
          "+    return award_badge(trainer, award.badge)",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/main.py b/src/pokedex/main.py",
          "--- a/src/pokedex/main.py",
          "+++ b/src/pokedex/main.py",
          "@@ -2,0 +3 @@ from fastapi import Depends, FastAPI",
          "+from pokedex.badges.routes import router as badges_router",
          "@@ -14,0 +16 @@ app.include_router(trainers_router, prefix=\"/api\", dependencies=[Depends(verify_",
          "+app.include_router(badges_router, prefix=\"/api\", dependencies=[Depends(verify_api_key)])",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
