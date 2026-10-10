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

describe("vue-spa-query-pinia", () => {
  it("Modified variable queryClient to retry a failed query once", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/query-client.ts b/src/lib/query-client.ts",
          "--- a/src/lib/query-client.ts",
          "+++ b/src/lib/query-client.ts",
          "@@ -6 +6 @@ export const queryClient = new QueryClient({",
          "-      retry: false,",
          "+      retry: 1,",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })

  it("Modified type Product to carry a stock count", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/types/product.ts b/src/types/product.ts",
          "--- a/src/types/product.ts",
          "+++ b/src/types/product.ts",
          "@@ -4,0 +5 @@ export interface Product {",
          "+  stockCount: number",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })

  it("Modified import BaseButton in AddToCartButton to skip the barrel", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/views/catalog/components/AddToCartButton.vue b/src/views/catalog/components/AddToCartButton.vue",
          "--- a/src/views/catalog/components/AddToCartButton.vue",
          "+++ b/src/views/catalog/components/AddToCartButton.vue",
          "@@ -2 +2 @@",
          "-import { BaseButton } from \"@/components/ui\"",
          "+import BaseButton from \"@/components/ui/BaseButton.vue\"",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })

  it("Modified module use-profile to live beside the account page", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/views/account/AccountPage.vue b/src/views/account/AccountPage.vue",
          "--- a/src/views/account/AccountPage.vue",
          "+++ b/src/views/account/AccountPage.vue",
          "@@ -2 +2 @@",
          "-import { useProfile } from \"@/composables/use-profile\"",
          "+import { useProfile } from \"@/views/account/use-profile\"",
        ].join("\n"),
        [
          "diff --git a/src/views/account/components/ProfileForm.vue b/src/views/account/components/ProfileForm.vue",
          "--- a/src/views/account/components/ProfileForm.vue",
          "+++ b/src/views/account/components/ProfileForm.vue",
          "@@ -4 +4 @@ import { BaseButton, BaseInput } from \"@/components/ui\"",
          "-import { useUpdateProfile } from \"@/composables/use-profile\"",
          "+import { useUpdateProfile } from \"@/views/account/use-profile\"",
        ].join("\n"),
        [
          "diff --git a/src/composables/use-profile.ts b/src/views/account/use-profile.ts",
          "rename from src/composables/use-profile.ts",
          "rename to src/views/account/use-profile.ts",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })

  it("Modified context theme to remember the chosen theme", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/App.vue b/src/App.vue",
          "--- a/src/App.vue",
          "+++ b/src/App.vue",
          "@@ -8 +8 @@ import { themeKey, type Theme } from \"@/components/theme\"",
          "-const theme = ref<Theme>(\"light\")",
          "+const theme = ref<Theme>(localStorage.getItem(\"theme\") === \"dark\" ? \"dark\" : \"light\")",
          "@@ -10,0 +11 @@ const toggleTheme = () => {",
          "+  localStorage.setItem(\"theme\", theme.value)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF })

    await expectCaseSnapshot(codegraph)
  })
})
