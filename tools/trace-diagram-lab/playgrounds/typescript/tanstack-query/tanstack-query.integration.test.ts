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

describe("typescript/tanstack-query", () => {
  it("Implement mutation useAddTrainer", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/add-trainer.ts b/src/api/add-trainer.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/api/add-trainer.ts",
          "@@ -0,0 +1,8 @@",
          "+import { request } from \"@/api/client\"",
          "+import type { Trainer } from \"@/types/trainer\"",
          "+",
          "+export type TrainerDraft = Omit<Trainer, \"id\">",
          "+",
          "+export function addTrainer(draft: TrainerDraft): Promise<Trainer> {",
          "+  return request<Trainer>(\"/trainers\", { method: \"POST\", body: JSON.stringify(draft) })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/hooks/use-add-trainer.ts b/src/hooks/use-add-trainer.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/hooks/use-add-trainer.ts",
          "@@ -0,0 +1,11 @@",
          "+import { useMutation, useQueryClient } from \"@tanstack/react-query\"",
          "+import { addTrainer } from \"@/api/add-trainer\"",
          "+import { TRAINERS_QUERY_KEY } from \"@/hooks/use-trainers\"",
          "+",
          "+export function useAddTrainer() {",
          "+  const queryClient = useQueryClient()",
          "+  return useMutation({",
          "+    mutationFn: addTrainer,",
          "+    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRAINERS_QUERY_KEY }),",
          "+  })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/pages/trainers/TrainersPage.tsx b/src/pages/trainers/TrainersPage.tsx",
          "--- a/src/pages/trainers/TrainersPage.tsx",
          "+++ b/src/pages/trainers/TrainersPage.tsx",
          "@@ -1,0 +2 @@ import { useTrainers } from \"@/hooks/use-trainers\"",
          "+import { AddTrainerForm } from \"./components/AddTrainerForm\"",
          "@@ -9,7 +10,10 @@ export function TrainersPage() {",
          "-    <table>",
          "-      <tbody>",
          "-        {trainers.map((trainer) => (",
          "-          <TrainerRow key={trainer.id} trainer={trainer} />",
          "-        ))}",
          "-      </tbody>",
          "-    </table>",
          "+    <section>",
          "+      <AddTrainerForm />",
          "+      <table>",
          "+        <tbody>",
          "+          {trainers.map((trainer) => (",
          "+            <TrainerRow key={trainer.id} trainer={trainer} />",
          "+          ))}",
          "+        </tbody>",
          "+      </table>",
          "+    </section>",
        ].join("\n"),
        [
          "diff --git a/src/pages/trainers/components/AddTrainerForm.tsx b/src/pages/trainers/components/AddTrainerForm.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pages/trainers/components/AddTrainerForm.tsx",
          "@@ -0,0 +1,23 @@",
          "+import { useState, type FormEvent } from \"react\"",
          "+import { useAddTrainer } from \"@/hooks/use-add-trainer\"",
          "+",
          "+const DEFAULT_HOMETOWN = \"Pallet Town\"",
          "+",
          "+export function AddTrainerForm() {",
          "+  const [name, setName] = useState(\"\")",
          "+  const { mutate: addTrainer, isPending } = useAddTrainer()",
          "+",
          "+  const submit = (event: FormEvent<HTMLFormElement>) => {",
          "+    event.preventDefault()",
          "+    addTrainer({ name, hometown: DEFAULT_HOMETOWN }, { onSuccess: () => setName(\"\") })",
          "+  }",
          "+",
          "+  return (",
          "+    <form onSubmit={submit}>",
          "+      <input value={name} placeholder=\"Trainer name\" onChange={(event) => setName(event.target.value)} />",
          "+      <button type=\"submit\" disabled={isPending || name === \"\"}>",
          "+        Add trainer",
          "+      </button>",
          "+    </form>",
          "+  )",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
