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

describe("card-kinds/route/fastapi", () => {
  it("Implement routes /api/v1/pokemon and /api/v1/pokemon/{pokemon_id}", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/pokemon/schemas.py b/src/pokedex/pokemon/schemas.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/pokemon/schemas.py",
          "@@ -0,0 +1,6 @@",
          "+from pydantic import BaseModel, Field",
          "+",
          "+",
          "+class PokemonDraft(BaseModel):",
          "+    name: str = Field(min_length=1, max_length=20)",
          "+    level: int = Field(ge=1, le=100)",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/pokemon/dependencies.py b/src/pokedex/pokemon/dependencies.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/pokemon/dependencies.py",
          "@@ -0,0 +1,22 @@",
          "+import logging",
          "+from typing import Annotated",
          "+",
          "+from fastapi import Depends, Header, HTTPException, Request",
          "+",
          "+from pokedex.settings import API_KEY",
          "+",
          "+",
          "+def require_api_key(x_api_key: Annotated[str, Header()]) -> None:",
          "+    if x_api_key != API_KEY:",
          "+        raise HTTPException(status_code=401, detail=\"The API key is missing or wrong.\")",
          "+",
          "+",
          "+def log_change(request: Request) -> None:",
          "+    logging.getLogger(\"pokedex.pokemon\").info(\"%s %s\", request.method, request.url.path)",
          "+",
          "+",
          "+def current_trainer(x_trainer: Annotated[str, Header()]) -> str:",
          "+    return x_trainer.strip().lower()",
          "+",
          "+",
          "+CurrentTrainer = Annotated[str, Depends(current_trainer)]",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/pokemon/routes.py b/src/pokedex/pokemon/routes.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/pokemon/routes.py",
          "@@ -0,0 +1,36 @@",
          "+from fastapi import APIRouter, Depends, HTTPException",
          "+",
          "+from pokedex.pokemon.dependencies import CurrentTrainer, log_change, require_api_key",
          "+from pokedex.pokemon.schemas import PokemonDraft",
          "+from pokedex.pokemon.store import Pokemon, find_pokemon, list_pokemon, remove_pokemon, save_pokemon",
          "+",
          "+router = APIRouter(prefix=\"/pokemon\", dependencies=[Depends(require_api_key)])",
          "+",
          "+",
          "+@router.post(\"/\", status_code=201)",
          "+def catch_pokemon(draft: PokemonDraft, trainer: CurrentTrainer):",
          "+    pokemon = Pokemon(id=len(list_pokemon(trainer)) + 1, trainer=trainer, name=draft.name, level=draft.level)",
          "+    return save_pokemon(pokemon)",
          "+",
          "+",
          "+@router.get(\"/\")",
          "+def read_party(trainer: CurrentTrainer):",
          "+    return list_pokemon(trainer)",
          "+",
          "+",
          "+@router.get(\"/{pokemon_id}\")",
          "+def read_pokemon(pokemon_id: int):",
          "+    pokemon = find_pokemon(pokemon_id)",
          "+    if pokemon is None:",
          "+        raise HTTPException(status_code=404, detail=\"No Pokemon has this id.\")",
          "+    return pokemon",
          "+",
          "+",
          "+@router.api_route(\"/{pokemon_id}\", methods=[\"PUT\", \"PATCH\"], dependencies=[Depends(log_change)])",
          "+def train_pokemon(pokemon_id: int, draft: PokemonDraft, trainer: CurrentTrainer):",
          "+    return save_pokemon(Pokemon(id=pokemon_id, trainer=trainer, name=draft.name, level=draft.level))",
          "+",
          "+",
          "+@router.delete(\"/{pokemon_id}\", status_code=204, dependencies=[Depends(log_change)])",
          "+def release_pokemon(pokemon_id: int):",
          "+    remove_pokemon(pokemon_id)",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/main.py b/src/pokedex/main.py",
          "--- a/src/pokedex/main.py",
          "+++ b/src/pokedex/main.py",
          "@@ -3,0 +4 @@ from pokedex.health.routes import router as health_router",
          "+from pokedex.pokemon.routes import router as pokemon_router",
          "@@ -7,0 +9 @@ app.include_router(health_router)",
          "+app.include_router(pokemon_router, prefix=\"/api/v1\")",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
