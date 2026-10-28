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

describe("typescript/react-router", () => {
  it("Implement page TrainerPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/api/trainers.ts b/src/api/trainers.ts",
          "--- a/src/api/trainers.ts",
          "+++ b/src/api/trainers.ts",
          "@@ -6,0 +7,4 @@ export function fetchTrainers(): Promise<Trainer[]> {",
          "+",
          "+export function fetchTrainer(id: number): Promise<Trainer> {",
          "+  return request<Trainer>(`/trainers/${id}`)",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/router.tsx b/src/router.tsx",
          "--- a/src/router.tsx",
          "+++ b/src/router.tsx",
          "@@ -4,0 +5,2 @@ import { RootLayout } from \"@/routes/root-layout\"",
          "+import { TrainerPage } from \"@/routes/trainer\"",
          "+import { trainerLoader } from \"@/routes/trainer/loader\"",
          "@@ -13,0 +16 @@ export const router = createBrowserRouter([",
          "+      { path: \"trainers/:trainerId\", element: <TrainerPage />, loader: trainerLoader },",
        ].join("\n"),
        [
          "diff --git a/src/routes/trainer/index.tsx b/src/routes/trainer/index.tsx",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/routes/trainer/index.tsx",
          "@@ -0,0 +1,21 @@",
          "+import { useLoaderData, useNavigate } from \"react-router\"",
          "+import type { trainerLoader } from \"./loader\"",
          "+",
          "+export function TrainerPage() {",
          "+  const trainer = useLoaderData<typeof trainerLoader>()",
          "+  const navigate = useNavigate()",
          "+",
          "+  const goBack = () => {",
          "+    navigate(\"/\")",
          "+  }",
          "+",
          "+  return (",
          "+    <article>",
          "+      <h1>{trainer.name}</h1>",
          "+      <p>From {trainer.hometown}</p>",
          "+      <button type=\"button\" onClick={goBack}>",
          "+        Back to the trainers",
          "+      </button>",
          "+    </article>",
          "+  )",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/routes/trainer/loader.ts b/src/routes/trainer/loader.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/routes/trainer/loader.ts",
          "@@ -0,0 +1,6 @@",
          "+import type { LoaderFunctionArgs } from \"react-router\"",
          "+import { fetchTrainer } from \"@/api/trainers\"",
          "+",
          "+export async function trainerLoader({ params }: LoaderFunctionArgs) {",
          "+  return await fetchTrainer(Number(params.trainerId))",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/routes/trainers/components/TrainerRow.tsx b/src/routes/trainers/components/TrainerRow.tsx",
          "--- a/src/routes/trainers/components/TrainerRow.tsx",
          "+++ b/src/routes/trainers/components/TrainerRow.tsx",
          "@@ -0,0 +1 @@",
          "+import { Link } from \"react-router\"",
          "@@ -6 +7,3 @@ export function TrainerRow({ trainer }: { trainer: Trainer }) {",
          "-      <td>{trainer.name}</td>",
          "+      <td>",
          "+        <Link to={`/trainers/${trainer.id}`}>{trainer.name}</Link>",
          "+      </td>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
