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

describe("typescript", () => {
  it("Modified function stockOf to subtract held stock", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts",
          "--- a/src/inventory/stock.ts",
          "+++ b/src/inventory/stock.ts",
          "@@ -1,0 +2 @@",
          "+const heldBySku: Record<string, number> = { \"tea-01\": 2 };",
          "@@ -4 +5 @@",
          "-  return stockBySku[sku] ?? 0;",
          "+  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })
})
