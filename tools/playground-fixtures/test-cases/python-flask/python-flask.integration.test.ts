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

describe("python-flask", () => {
  it("Modified method Cart.tax to leave a cart under ten dollars untaxed", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/shop/cart.py b/shop/cart.py",
          "--- a/shop/cart.py",
          "+++ b/shop/cart.py",
          "@@ -14,0 +15,2 @@ class Cart:",
          "+        if self.subtotal() < 1000:",
          "+            return 0",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })
})
