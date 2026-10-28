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

describe("typescript/nextjs", () => {
  it("Implement feature release Pokemon", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/app/api/pokemon/[id]/route.ts b/src/app/api/pokemon/[id]/route.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/app/api/pokemon/[id]/route.ts",
          "@@ -0,0 +1,7 @@",
          "+import { removePokemon } from \"@/lib/pokemon\"",
          "+",
          "+export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {",
          "+  const { id } = await params",
          "+  removePokemon(Number(id))",
          "+  return new Response(null, { status: 204 })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/actions.ts b/src/app/pokemon/actions.ts",
          "--- a/src/app/pokemon/actions.ts",
          "+++ b/src/app/pokemon/actions.ts",
          "@@ -2,0 +3 @@",
          "+import { revalidatePath } from \"next/cache\"",
          "@@ -4 +5 @@ import { redirect } from \"next/navigation\"",
          "-import { addPokemon, type NewPokemon } from \"@/lib/pokemon\"",
          "+import { addPokemon, removePokemon, type NewPokemon } from \"@/lib/pokemon\"",
          "@@ -17,0 +19,5 @@ export async function createPokemon(formData: FormData) {",
          "+",
          "+export async function releasePokemon(id: number) {",
          "+  removePokemon(id)",
          "+  revalidatePath(\"/pokemon\")",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/components/ReleaseButton.tsx b/src/app/pokemon/components/ReleaseButton.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/app/pokemon/components/ReleaseButton.tsx",
          "@@ -0,0 +1,19 @@",
          "+\"use client\"",
          "+",
          "+import { useTransition } from \"react\"",
          "+import { releasePokemon } from \"@/app/pokemon/actions\"",
          "+",
          "+export function ReleaseButton({ id, name }: { id: number; name: string }) {",
          "+  const [isReleasing, startRelease] = useTransition()",
          "+  return (",
          "+    <button",
          "+      type=\"button\"",
          "+      disabled={isReleasing}",
          "+      onClick={() => {",
          "+        if (window.confirm(`Release ${name}?`)) startRelease(() => releasePokemon(id))",
          "+      }}",
          "+    >",
          "+      {isReleasing ? \"Releasing…\" : \"Release\"}",
          "+    </button>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/page.tsx b/src/app/pokemon/page.tsx",
          "--- a/src/app/pokemon/page.tsx",
          "+++ b/src/app/pokemon/page.tsx",
          "@@ -1,0 +2 @@ import Link from \"next/link\"",
          "+import { ReleaseButton } from \"@/app/pokemon/components/ReleaseButton\"",
          "@@ -13,0 +15 @@ export default function PokemonPage() {",
          "+            <ReleaseButton id={pokemon.id} name={pokemon.name} />",
        ].join("\n"),
        [
          "diff --git a/src/lib/pokemon.ts b/src/lib/pokemon.ts",
          "--- a/src/lib/pokemon.ts",
          "+++ b/src/lib/pokemon.ts",
          "@@ -23,0 +24,4 @@ export function addPokemon(fields: NewPokemon): Pokemon {",
          "+",
          "+export function removePokemon(id: number): void {",
          "+  party = party.filter((pokemon) => pokemon.id !== id)",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
