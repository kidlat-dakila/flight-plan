import { join } from "node:path"
import { buildScaffold, parseHunks, type ChangeSnapshot } from "@/index"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { CASE_BRANCH } from "@test-setup/case-adapter"
import { expectCaseSnapshot } from "@test-setup/case-snapshot"
import { setupTest } from "@test-setup/setup-test"

const REPO_PATH = join(import.meta.dirname, "repo")

const HELD_STOCK_DIFF = [
  "diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts",
  "--- a/src/inventory/stock.ts",
  "+++ b/src/inventory/stock.ts",
  "@@ -1,0 +2 @@",
  "+const heldBySku: Record<string, number> = { \"tea-01\": 2 };",
  "@@ -4 +5 @@",
  "-  return stockBySku[sku] ?? 0;",
  "+  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);",
].join("\n")

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

const readChange = async (root: string, title: string): Promise<ChangeSnapshot> => {
  const gitAdapter = await openRepository(root)
  const target = { kind: "branch", name: CASE_BRANCH } as const
  const [headCommit, diff] = await Promise.all([gitAdapter.headSha(target), gitAdapter.diff(target)])
  const hunks = parseHunks(diff)
  const texts = await Promise.all(
    Object.keys(hunks).map(async (path): Promise<readonly [string, string]> => [path, await gitAdapter.blob(path, headCommit)]),
  )
  return { title, headCommit, hunks, texts: new Map(texts) }
}

describe("typescript", () => {
  it("scaffolds a change to one function", async () => {
    setupTest({ repoPath: REPO_PATH, diffs: [HELD_STOCK_DIFF] })

    const artifact = buildScaffold(await readChange(REPO_PATH, "Subtract held stock"))

    await expectCaseSnapshot(artifact)
  })
})
