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

describe("card-kinds/route/express", () => {
  it("Added route POST /api/pokemon behind an API key", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/pokemon/controller.ts b/src/pokemon/controller.ts",
          "--- a/src/pokemon/controller.ts",
          "+++ b/src/pokemon/controller.ts",
          "@@ -5 +5,2 @@ export const listPokemon = (_req: Request, res: Response) => {",
          "-  res.json(readParty())",
          "+  const party = readParty().toSorted((first, second) => second.level - first.level)",
          "+  res.json(party)",
        ].join("\n"),
        [
          "diff --git a/src/pokemon/routes.ts b/src/pokemon/routes.ts",
          "--- a/src/pokemon/routes.ts",
          "+++ b/src/pokemon/routes.ts",
          "@@ -1 +1 @@",
          "-import { Router } from \"express\"",
          "+import { Router, type NextFunction, type Request, type Response } from \"express\"",
          "@@ -3 +3,3 @@ import { listPokemon } from \"@/pokemon/controller\"",
          "-import { readPokemon } from \"@/pokemon/store\"",
          "+import { addPokemon, readPokemon } from \"@/pokemon/store\"",
          "+",
          "+const API_KEY = \"pallet-town\"",
          "@@ -6,0 +9,19 @@ export const pokemonRouter = Router()",
          "+const requireApiKey = (req: Request, res: Response, next: NextFunction) => {",
          "+  if (req.header(\"x-api-key\") !== API_KEY) {",
          "+    res.status(401).json({ error: \"The API key is missing or wrong.\" })",
          "+    return",
          "+  }",
          "+  next()",
          "+}",
          "+",
          "+const validatePokemon = (req: Request, res: Response, next: NextFunction) => {",
          "+  const { name, level } = req.body",
          "+  if (typeof name !== \"string\" || !Number.isInteger(level)) {",
          "+    res.status(400).json({ error: \"A Pokemon needs a name and a whole level.\" })",
          "+    return",
          "+  }",
          "+  next()",
          "+}",
          "+",
          "+pokemonRouter.use(requireApiKey)",
          "+",
          "@@ -8,0 +30,5 @@ pokemonRouter.get(\"/pokemon\", listPokemon)",
          "+pokemonRouter.post(\"/pokemon\", validatePokemon, (req, res) => {",
          "+  const pokemon = addPokemon(req.body.name, req.body.level)",
          "+  res.status(201).json(pokemon)",
          "+})",
          "+",
          "@@ -10 +36,6 @@ pokemonRouter.get(\"/pokemon/:pokemonId\", (req, res) => {",
          "-  res.json(readPokemon(Number(req.params.pokemonId)))",
          "+  const pokemon = readPokemon(Number(req.params.pokemonId))",
          "+  if (pokemon === undefined) {",
          "+    res.status(404).end()",
          "+    return",
          "+  }",
          "+  res.json(pokemon)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
