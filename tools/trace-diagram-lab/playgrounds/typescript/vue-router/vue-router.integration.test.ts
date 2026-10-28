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

describe("typescript/vue-router", () => {
  it("Implement page TrainerPage", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/views/trainers/TrainerPage.vue b/src/views/trainers/TrainerPage.vue",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/views/trainers/TrainerPage.vue",
          "@@ -0,0 +1,36 @@",
          "+<script setup lang=\"ts\">",
          "+import { computed, ref, watch } from \"vue\"",
          "+import { RouterLink, useRoute, useRouter } from \"vue-router\"",
          "+import { request } from \"@/api/client\"",
          "+import { BaseButton } from \"@/components/ui\"",
          "+import type { Trainer } from \"@/types/trainer\"",
          "+",
          "+const route = useRoute()",
          "+const router = useRouter()",
          "+const trainerId = computed(() => Number(route.params.id))",
          "+const trainer = ref<Trainer | null>(null)",
          "+",
          "+watch(",
          "+  trainerId,",
          "+  async (id) => {",
          "+    trainer.value = await request<Trainer>(`/trainers/${id}`)",
          "+  },",
          "+  { immediate: true },",
          "+)",
          "+",
          "+const openNextTrainer = () => {",
          "+  router.push(`/trainers/${trainerId.value + 1}`)",
          "+}",
          "+</script>",
          "+",
          "+<template>",
          "+  <section>",
          "+    <RouterLink to=\"/\">Back to the trainers</RouterLink>",
          "+    <p v-if=\"trainer === null\">Loading the trainer…</p>",
          "+    <template v-else>",
          "+      <h1>{{ trainer.name }}</h1>",
          "+      <p>From {{ trainer.hometown }}</p>",
          "+    </template>",
          "+    <BaseButton variant=\"ghost\" @click=\"openNextTrainer\">Next trainer</BaseButton>",
          "+  </section>",
          "+</template>",
        ].join("\n"),
        [
          "diff --git a/src/router.ts b/src/router.ts",
          "--- a/src/router.ts",
          "+++ b/src/router.ts",
          "@@ -1 +1 @@",
          "-import { createRouter, createWebHistory } from \"vue-router\"",
          "+import { createRouter, createWebHistory, type RouteLocationNormalized } from \"vue-router\"",
          "@@ -4,0 +5 @@ import RootLayout from \"@/views/RootLayout.vue\"",
          "+import TrainerPage from \"@/views/trainers/TrainerPage.vue\"",
          "@@ -8,0 +10,5 @@ const APP_NAME = \"Pokedex\"",
          "+const requireTrainerId = (to: RouteLocationNormalized) => {",
          "+  const id = Number(to.params.id)",
          "+  return Number.isInteger(id) && id > 0 ? true : \"/\"",
          "+}",
          "+",
          "@@ -16,0 +23 @@ export const router = createRouter({",
          "+        { path: \"trainers/:id\", component: TrainerPage, beforeEnter: requireTrainerId },",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
