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

describe("demo-t3", () => {
  it("Implement page EditPokemonPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/server/api/routers/pokemon.ts b/src/server/api/routers/pokemon.ts",
          "--- a/src/server/api/routers/pokemon.ts",
          "+++ b/src/server/api/routers/pokemon.ts",
          "@@ -18,0 +19,4 @@ export const pokemonRouter = createTRPCRouter({",
          "+",
          "+  update: publicProcedure.input(pokemonInput.extend({ id: z.number() })).mutation(({ ctx, input: { id, ...data } }) => {",
          "+    return ctx.db.pokemon.update({ where: { id }, data })",
          "+  }),",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/_components/PokemonForm.tsx b/src/app/pokemon/_components/PokemonForm.tsx",
          "--- a/src/app/pokemon/_components/PokemonForm.tsx",
          "+++ b/src/app/pokemon/_components/PokemonForm.tsx",
          "@@ -3 +3 @@",
          "-import type { Trainer } from \"@prisma/client\"",
          "+import type { Pokemon, Trainer } from \"@prisma/client\"",
          "@@ -10 +10 @@ const NO_TRAINER = \"\"",
          "-export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "+export function PokemonForm({ trainers, pokemon }: { trainers: Trainer[]; pokemon?: Pokemon }) {",
          "@@ -14,0 +15,3 @@ export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "+  const update = api.pokemon.update.useMutation({",
          "+    onSuccess: (updated) => router.push(`/pokemon/${updated.id}`),",
          "+  })",
          "@@ -21 +24 @@ export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "-        create.mutate({",
          "+        const fields = {",
          "@@ -26 +29,3 @@ export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "-        })",
          "+        }",
          "+        if (pokemon === undefined) create.mutate(fields)",
          "+        else update.mutate({ id: pokemon.id, ...fields })",
          "@@ -29,4 +34,4 @@ export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "-      <input name=\"name\" placeholder=\"Name\" required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "-      <input name=\"level\" type=\"number\" min={1} max={100} required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "-      <input name=\"primaryType\" placeholder=\"Type\" required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "-      <select name=\"trainerId\" className=\"rounded bg-slate-800 px-3 py-2\">",
          "+      <input name=\"name\" placeholder=\"Name\" defaultValue={pokemon?.name} required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "+      <input name=\"level\" type=\"number\" min={1} max={100} defaultValue={pokemon?.level} required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "+      <input name=\"primaryType\" placeholder=\"Type\" defaultValue={pokemon?.primaryType} required className=\"rounded bg-slate-800 px-3 py-2\" />",
          "+      <select name=\"trainerId\" defaultValue={pokemon?.trainerId ?? NO_TRAINER} className=\"rounded bg-slate-800 px-3 py-2\">",
          "@@ -40 +45 @@ export function PokemonForm({ trainers }: { trainers: Trainer[] }) {",
          "-      <SubmitButton label=\"Save\" isPending={create.isPending} />",
          "+      <SubmitButton label=\"Save\" isPending={create.isPending || update.isPending} />",
        ].join("\n"),
        [
          "diff --git a/src/app/pokemon/[id]/edit/page.tsx b/src/app/pokemon/[id]/edit/page.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/app/pokemon/[id]/edit/page.tsx",
          "@@ -0,0 +1,16 @@",
          "+import { notFound } from \"next/navigation\"",
          "+import { PokemonForm } from \"~/app/pokemon/_components/PokemonForm\"",
          "+import { api } from \"~/trpc/server\"",
          "+",
          "+export default async function EditPokemonPage({ params }: { params: Promise<{ id: string }> }) {",
          "+  const { id } = await params",
          "+  const pokemon = await api.pokemon.byId({ id: Number(id) })",
          "+  if (pokemon === null) notFound()",
          "+  const trainers = await api.trainer.list()",
          "+  return (",
          "+    <main className=\"mx-auto max-w-md p-6\">",
          "+      <h1 className=\"mb-4 text-2xl font-bold\">Edit {pokemon.name}</h1>",
          "+      <PokemonForm trainers={trainers} pokemon={pokemon} />",
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
          "@@ -13,0 +15,3 @@ export default async function PokemonPage({ params }: { params: Promise<{ id: st",
          "+      <Link href={`/pokemon/${pokemon.id}/edit`} className=\"text-indigo-400\">",
          "+        Edit",
          "+      </Link>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: false })

    await expectCaseSnapshot(codegraph)
  })
})
