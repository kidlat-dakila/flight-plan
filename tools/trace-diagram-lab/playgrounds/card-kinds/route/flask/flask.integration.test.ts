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

describe("card-kinds/route/flask", () => {
  it("Implement routes /api/pokemon and /api/pokemon/<int:pokemon_id>", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokedex/pokemon/views.py b/src/pokedex/pokemon/views.py",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pokedex/pokemon/views.py",
          "@@ -0,0 +1,47 @@",
          "+from dataclasses import asdict",
          "+",
          "+from flask import Blueprint, abort, request",
          "+from flask.views import MethodView",
          "+",
          "+from pokedex.pokemon.store import Pokemon, find_pokemon, list_pokemon, remove_pokemon, save_pokemon",
          "+from pokedex.settings import API_KEY",
          "+",
          "+bp = Blueprint(\"pokemon\", __name__, url_prefix=\"/pokemon\")",
          "+",
          "+",
          "+@bp.before_request",
          "+def require_api_key():",
          "+    if request.headers.get(\"X-Api-Key\") != API_KEY:",
          "+        abort(401)",
          "+",
          "+",
          "+@bp.route(\"/\", methods=[\"GET\", \"POST\"])",
          "+def party():",
          "+    trainer = request.headers[\"X-Trainer\"]",
          "+    if request.method == \"POST\":",
          "+        body = request.get_json()",
          "+        pokemon = Pokemon(id=len(list_pokemon(trainer)) + 1, trainer=trainer, name=body[\"name\"], level=body[\"level\"])",
          "+        return asdict(save_pokemon(pokemon)), 201",
          "+    return [asdict(pokemon) for pokemon in list_pokemon(trainer)]",
          "+",
          "+",
          "+class PokemonAPI(MethodView):",
          "+    def get(self, pokemon_id):",
          "+        pokemon = find_pokemon(pokemon_id)",
          "+        if pokemon is None:",
          "+            abort(404)",
          "+        return asdict(pokemon)",
          "+",
          "+    def patch(self, pokemon_id):",
          "+        pokemon = find_pokemon(pokemon_id)",
          "+        if pokemon is None:",
          "+            abort(404)",
          "+        level = request.get_json()[\"level\"]",
          "+        return asdict(save_pokemon(Pokemon(id=pokemon.id, trainer=pokemon.trainer, name=pokemon.name, level=level)))",
          "+",
          "+    def delete(self, pokemon_id):",
          "+        remove_pokemon(pokemon_id)",
          "+        return \"\", 204",
          "+",
          "+",
          "+bp.add_url_rule(\"/<int:pokemon_id>\", view_func=PokemonAPI.as_view(\"pokemon\"))",
        ].join("\n"),
        [
          "diff --git a/src/pokedex/app.py b/src/pokedex/app.py",
          "--- a/src/pokedex/app.py",
          "+++ b/src/pokedex/app.py",
          "@@ -3,0 +4 @@ from pokedex.health import bp as health_bp",
          "+from pokedex.pokemon.views import bp as pokemon_bp",
          "@@ -8,0 +10 @@ api.register_blueprint(health_bp)",
          "+api.register_blueprint(pokemon_bp)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
