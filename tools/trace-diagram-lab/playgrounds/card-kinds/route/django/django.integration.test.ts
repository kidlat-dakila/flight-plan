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

describe("card-kinds/route/django", () => {
  it("Implement routes /api/pokemon and /api/pokemon/<int:pk>", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/pokedex/views.py b/pokedex/views.py",
          "--- a/pokedex/views.py",
          "+++ b/pokedex/views.py",
          "@@ -0,0 +1,2 @@",
          "+import json",
          "+",
          "@@ -2,2 +4,8 @@ from django.contrib.auth.decorators import login_required",
          "-from django.http import JsonResponse",
          "-from django.views.decorators.http import require_GET",
          "+from django.http import HttpResponse, JsonResponse",
          "+from django.shortcuts import get_object_or_404",
          "+from django.views import View",
          "+from django.views.decorators.http import require_GET, require_http_methods, require_POST",
          "+",
          "+from pokedex.models import Pokemon",
          "+",
          "+MAX_LEVEL = 100",
          "@@ -9,0 +18,34 @@ def trainer(request):",
          "+",
          "+",
          "+@login_required",
          "+@require_http_methods([\"GET\", \"POST\"])",
          "+def party(request):",
          "+    if request.method == \"POST\":",
          "+        body = json.loads(request.body)",
          "+        pokemon = Pokemon.objects.create(trainer=request.user, name=body[\"name\"], level=body[\"level\"])",
          "+        return JsonResponse(pokemon.as_dict(), status=201)",
          "+    return JsonResponse([pokemon.as_dict() for pokemon in request.user.pokemon.all()], safe=False)",
          "+",
          "+",
          "+class PokemonView(View):",
          "+    def get(self, request, pk):",
          "+        return JsonResponse(get_object_or_404(Pokemon, pk=pk).as_dict())",
          "+",
          "+    def patch(self, request, pk):",
          "+        pokemon = get_object_or_404(Pokemon, pk=pk)",
          "+        pokemon.name = json.loads(request.body)[\"name\"]",
          "+        pokemon.save()",
          "+        return JsonResponse(pokemon.as_dict())",
          "+",
          "+    def delete(self, request, pk):",
          "+        get_object_or_404(Pokemon, pk=pk).delete()",
          "+        return HttpResponse(status=204)",
          "+",
          "+",
          "+@login_required",
          "+@require_POST",
          "+def level_up(request, pk):",
          "+    pokemon = get_object_or_404(Pokemon, pk=pk, trainer=request.user)",
          "+    pokemon.level = min(pokemon.level + 1, MAX_LEVEL)",
          "+    pokemon.save()",
          "+    return JsonResponse(pokemon.as_dict())",
        ].join("\n"),
        [
          "diff --git a/pokedex/urls.py b/pokedex/urls.py",
          "--- a/pokedex/urls.py",
          "+++ b/pokedex/urls.py",
          "@@ -6,0 +7,3 @@ urlpatterns = [",
          "+    path(\"pokemon/\", views.party),",
          "+    path(\"pokemon/<int:pk>/\", views.PokemonView.as_view()),",
          "+    path(\"pokemon/<int:pk>/level-up/\", views.level_up),",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
