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

describe("typescript/react", () => {
  it("Implement component HometownFilter", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/trainers.ts b/src/api/trainers.ts",
          "--- a/src/api/trainers.ts",
          "+++ b/src/api/trainers.ts",
          "@@ -4,2 +4,3 @@ import type { Trainer } from \"@/types/trainer\"",
          "-export function fetchTrainers(): Promise<Trainer[]> {",
          "-  return request<Trainer[]>(\"/trainers\")",
          "+export function fetchTrainers(hometown: string): Promise<Trainer[]> {",
          "+  const query = hometown === \"\" ? \"\" : `?hometown=${encodeURIComponent(hometown)}`",
          "+  return request<Trainer[]>(`/trainers${query}`)",
        ].join("\n"),
        [
          "diff --git a/src/hooks/use-trainers.ts b/src/hooks/use-trainers.ts",
          "--- a/src/hooks/use-trainers.ts",
          "+++ b/src/hooks/use-trainers.ts",
          "@@ -5 +5 @@ import type { Trainer } from \"@/types/trainer\"",
          "-export function useTrainers() {",
          "+export function useTrainers(hometown: string) {",
          "@@ -10 +10,2 @@ export function useTrainers() {",
          "-    fetchTrainers()",
          "+    setIsLoading(true)",
          "+    fetchTrainers(hometown)",
          "@@ -13 +14 @@ export function useTrainers() {",
          "-  }, [])",
          "+  }, [hometown])",
        ].join("\n"),
        [
          "diff --git a/src/pages/trainers/TrainersPage.tsx b/src/pages/trainers/TrainersPage.tsx",
          "--- a/src/pages/trainers/TrainersPage.tsx",
          "+++ b/src/pages/trainers/TrainersPage.tsx",
          "@@ -0,0 +1 @@",
          "+import { useState } from \"react\"",
          "@@ -1,0 +3 @@ import { useTrainers } from \"@/hooks/use-trainers\"",
          "+import { HometownFilter } from \"./components/HometownFilter\"",
          "@@ -5,2 +7,7 @@ export function TrainersPage() {",
          "-  const { trainers, isLoading } = useTrainers()",
          "-  if (isLoading) return <p>Loading the trainers…</p>",
          "+  const [hometown, setHometown] = useState(\"\")",
          "+  const { trainers, isLoading } = useTrainers(hometown)",
          "+",
          "+  const changeHometown = (value: string) => {",
          "+    setHometown(value.trim())",
          "+  }",
          "+",
          "@@ -8,7 +15,14 @@ export function TrainersPage() {",
          "-    <table>",
          "-      <tbody>",
          "-        {trainers.map((trainer) => (",
          "-          <TrainerRow key={trainer.id} trainer={trainer} />",
          "-        ))}",
          "-      </tbody>",
          "-    </table>",
          "+    <section>",
          "+      <HometownFilter hometown={hometown} onHometownChange={changeHometown} />",
          "+      {isLoading ? (",
          "+        <p>Loading the trainers…</p>",
          "+      ) : (",
          "+        <table>",
          "+          <tbody>",
          "+            {trainers.map((trainer) => (",
          "+              <TrainerRow key={trainer.id} trainer={trainer} />",
          "+            ))}",
          "+          </tbody>",
          "+        </table>",
          "+      )}",
          "+    </section>",
        ].join("\n"),
        [
          "diff --git a/src/pages/trainers/components/HometownFilter.tsx b/src/pages/trainers/components/HometownFilter.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/pages/trainers/components/HometownFilter.tsx",
          "@@ -0,0 +1,15 @@",
          "+import { Input } from \"@/components/ui\"",
          "+",
          "+interface HometownFilterProps {",
          "+  hometown: string",
          "+  onHometownChange: (hometown: string) => void",
          "+}",
          "+",
          "+export function HometownFilter({ hometown, onHometownChange }: HometownFilterProps) {",
          "+  return (",
          "+    <label>",
          "+      Hometown",
          "+      <Input value={hometown} placeholder=\"Pallet Town\" onChange={(event) => onHometownChange(event.target.value)} />",
          "+    </label>",
          "+  )",
          "+}",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
