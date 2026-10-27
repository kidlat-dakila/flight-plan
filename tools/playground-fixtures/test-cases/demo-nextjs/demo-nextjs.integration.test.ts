import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter, type TargetRef } from "@flightplan/git-forge"
import { CASE_BRANCH } from "@test-setup/case-adapter"
import { expectCaseSnapshot } from "@test-setup/case-snapshot"
import { setupTest } from "@test-setup/setup-test"

const REPO_PATH = join(import.meta.dirname, "repo")
const CASE_REF: TargetRef = { kind: "branch", name: CASE_BRANCH }

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("demo-nextjs", () => {
  it("Implement page EditPokemonPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/db/queries/pokemon.ts b/src/db/queries/pokemon.ts",
          "--- a/src/db/queries/pokemon.ts",
          "+++ b/src/db/queries/pokemon.ts",
          "@@ -13,0 +14,4 @@ export async function insertPokemon(fields: NewPokemon): Promise<Pokemon> {",
          "+",
          "+export async function savePokemon(id: number, fields: NewPokemon): Promise<void> {",
          "+  await db.update(pokemon).set(fields).where(eq(pokemon.id, id))",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/actions.ts b/src/app/pokemon/actions.ts",
          "--- a/src/app/pokemon/actions.ts",
          "+++ b/src/app/pokemon/actions.ts",
          "@@ -2,0 +3 @@",
          "+import { revalidatePath } from \"next/cache\"",
          "@@ -4 +5 @@ import { redirect } from \"next/navigation\"",
          "-import { insertPokemon } from \"@/db/queries/pokemon\"",
          "+import { insertPokemon, savePokemon } from \"@/db/queries/pokemon\"",
          "@@ -22,0 +24,6 @@ export async function createPokemon(formData: FormData) {",
          "+",
          "+export async function updatePokemon(id: number, formData: FormData) {",
          "+  await savePokemon(id, readPokemonFields(formData))",
          "+  revalidatePath(`/pokemon/${id}`)",
          "+  redirect(`/pokemon/${id}`)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/components/PokemonForm.tsx b/src/app/pokemon/components/PokemonForm.tsx",
          "--- a/src/app/pokemon/components/PokemonForm.tsx",
          "+++ b/src/app/pokemon/components/PokemonForm.tsx",
          "@@ -2 +2 @@ import { SubmitButton } from \"@/components/ui/SubmitButton\"",
          "-import type { Trainer } from \"@/db/schema\"",
          "+import type { Pokemon, Trainer } from \"@/db/schema\"",
          "@@ -6,0 +7 @@ interface PokemonFormProps {",
          "+  pokemon?: Pokemon",
          "@@ -9 +10 @@ interface PokemonFormProps {",
          "-export function PokemonForm({ action, trainers }: PokemonFormProps) {",
          "+export function PokemonForm({ action, trainers, pokemon }: PokemonFormProps) {",
          "@@ -12,4 +13,4 @@ export function PokemonForm({ action, trainers }: PokemonFormProps) {",
          "-      <input name=\"name\" placeholder=\"Name\" required />",
          "-      <input name=\"level\" type=\"number\" min={1} max={100} required />",
          "-      <input name=\"primaryType\" placeholder=\"Type\" required />",
          "-      <select name=\"trainerId\">",
          "+      <input name=\"name\" placeholder=\"Name\" defaultValue={pokemon?.name} required />",
          "+      <input name=\"level\" type=\"number\" min={1} max={100} defaultValue={pokemon?.level} required />",
          "+      <input name=\"primaryType\" placeholder=\"Type\" defaultValue={pokemon?.primaryType} required />",
          "+      <select name=\"trainerId\" defaultValue={pokemon?.trainerId ?? \"\"}>",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/[id]/edit/page.tsx b/src/app/pokemon/[id]/edit/page.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/app/pokemon/[id]/edit/page.tsx",
          "@@ -0,0 +1,18 @@",
          "+import { notFound } from \"next/navigation\"",
          "+import { updatePokemon } from \"@/app/pokemon/actions\"",
          "+import { PokemonForm } from \"@/app/pokemon/components/PokemonForm\"",
          "+import { findPokemon } from \"@/db/queries/pokemon\"",
          "+import { findTrainers } from \"@/db/queries/trainers\"",
          "+",
          "+export default async function EditPokemonPage({ params }: { params: Promise<{ id: string }> }) {",
          "+  const { id } = await params",
          "+  const pokemon = await findPokemon(Number(id))",
          "+  if (pokemon === undefined) notFound()",
          "+  const trainers = await findTrainers()",
          "+  return (",
          "+    <main>",
          "+      <h1>Edit {pokemon.name}</h1>",
          "+      <PokemonForm action={updatePokemon.bind(null, pokemon.id)} trainers={trainers} pokemon={pokemon} />",
          "+    </main>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/[id]/page.tsx b/src/app/pokemon/[id]/page.tsx",
          "--- a/src/app/pokemon/[id]/page.tsx",
          "+++ b/src/app/pokemon/[id]/page.tsx",
          "@@ -0,0 +1 @@",
          "+import Link from \"next/link\"",
          "@@ -13,0 +15 @@ export default async function PokemonPage({ params }: { params: Promise<{ id: st",
          "+      <Link href={`/pokemon/${pokemon.id}/edit`}>Edit</Link>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: false })

    await expectCaseSnapshot(codegraph)
  })
})
