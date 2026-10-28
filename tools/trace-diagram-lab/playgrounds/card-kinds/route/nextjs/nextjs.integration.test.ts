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

describe("card-kinds/route/nextjs", () => {
  it("Added two routes POST /api/pokemon and PUT /api/pokemon/[id]", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/app/api/pokemon/[id]/route.ts b/src/app/api/pokemon/[id]/route.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/app/api/pokemon/[id]/route.ts",
          "@@ -0,0 +1,16 @@",
          "+import { renamePokemon } from \"@/lib/pokemon\"",
          "+",
          "+function readName(body: { name?: unknown }): string | undefined {",
          "+  return typeof body.name === \"string\" && body.name.trim() !== \"\" ? body.name.trim() : undefined",
          "+}",
          "+",
          "+const rename = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {",
          "+  const { id } = await params",
          "+  const name = readName(await request.json())",
          "+  if (name === undefined) return Response.json({ error: \"A Pokemon needs a name.\" }, { status: 400 })",
          "+  const pokemon = renamePokemon(Number(id), name)",
          "+  if (pokemon === undefined) return new Response(null, { status: 404 })",
          "+  return Response.json(pokemon)",
          "+}",
          "+",
          "+export { rename as PUT, rename as PATCH }",
        ].join("\n"),
        [
          "diff --git a/src/app/api/pokemon/route.ts b/src/app/api/pokemon/route.ts",
          "--- a/src/app/api/pokemon/route.ts",
          "+++ b/src/app/api/pokemon/route.ts",
          "@@ -1 +1,5 @@",
          "-import { listPokemon } from \"@/lib/pokemon\"",
          "+import { addPokemon, listPokemon, type NewPokemon } from \"@/lib/pokemon\"",
          "+",
          "+function isNewPokemon(fields: Partial<NewPokemon>): fields is NewPokemon {",
          "+  return typeof fields.name === \"string\" && fields.name.trim() !== \"\" && Number.isInteger(fields.level)",
          "+}",
          "@@ -4 +8,8 @@ export function GET() {",
          "-  return Response.json(listPokemon())",
          "+  const party = listPokemon().toSorted((first, second) => second.level - first.level)",
          "+  return Response.json(party)",
          "+}",
          "+",
          "+export const POST = async (request: Request) => {",
          "+  const fields: Partial<NewPokemon> = await request.json()",
          "+  if (!isNewPokemon(fields)) return Response.json({ error: \"A Pokemon needs a name and a whole level.\" }, { status: 400 })",
          "+  return Response.json(addPokemon(fields), { status: 201 })",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
