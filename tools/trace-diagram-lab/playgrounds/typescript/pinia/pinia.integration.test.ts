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

describe("typescript/pinia", () => {
  it("Implement store useBagStore", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/stores/bag.ts b/src/stores/bag.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/bag.ts",
          "@@ -0,0 +1,30 @@",
          "+import { defineStore } from \"pinia\"",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+interface BagLine {",
          "+  item: Item",
          "+  quantity: number",
          "+}",
          "+",
          "+export const useBagStore = defineStore(\"bag\", {",
          "+  state: () => ({",
          "+    lines: [] as BagLine[],",
          "+  }),",
          "+  getters: {",
          "+    count: (state): number => state.lines.reduce((sum, line) => sum + line.quantity, 0),",
          "+    total: (state): number => state.lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0),",
          "+  },",
          "+  actions: {",
          "+    addItem(item: Item) {",
          "+      const line = this.lines.find((entry) => entry.item.id === item.id)",
          "+      if (line === undefined) {",
          "+        this.lines.push({ item, quantity: 1 })",
          "+        return",
          "+      }",
          "+      line.quantity += 1",
          "+    },",
          "+    clear() {",
          "+      this.lines = []",
          "+    },",
          "+  },",
          "+})",
        ].join("\n"),
        [
          "diff --git a/src/views/items/components/BagSummary.vue b/src/views/items/components/BagSummary.vue",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/views/items/components/BagSummary.vue",
          "@@ -0,0 +1,18 @@",
          "+<script setup lang=\"ts\">",
          "+import { BaseButton } from \"@/components/ui\"",
          "+import { formatPrice } from \"@/lib/format\"",
          "+",
          "+defineProps<{ count: number, total: number }>()",
          "+const emit = defineEmits<{ (event: \"clear\"): void }>()",
          "+",
          "+const askToEmpty = () => {",
          "+  emit(\"clear\")",
          "+}",
          "+</script>",
          "+",
          "+<template>",
          "+  <p>",
          "+    {{ count }} items in the bag, {{ formatPrice(total) }}",
          "+    <BaseButton variant=\"ghost\" :disabled=\"count === 0\" @click=\"askToEmpty\">Empty the bag</BaseButton>",
          "+  </p>",
          "+</template>",
        ].join("\n"),
        [
          "diff --git a/src/views/items/ItemsPage.vue b/src/views/items/ItemsPage.vue",
          "--- a/src/views/items/ItemsPage.vue",
          "+++ b/src/views/items/ItemsPage.vue",
          "@@ -1,0 +2 @@",
          "+import { BaseButton } from \"@/components/ui\"",
          "@@ -3,0 +5,2 @@ import { formatPrice } from \"@/lib/format\"",
          "+import { useBagStore } from \"@/stores/bag\"",
          "+import BagSummary from \"@/views/items/components/BagSummary.vue\"",
          "@@ -5,0 +9,5 @@ const { items, isPending } = useItems()",
          "+const bag = useBagStore()",
          "+",
          "+const emptyBag = () => {",
          "+  bag.clear()",
          "+}",
          "@@ -8,0 +17 @@ const { items, isPending } = useItems()",
          "+  <BagSummary :count=\"bag.count\" :total=\"bag.total\" @clear=\"emptyBag\" />",
          "@@ -11 +20,4 @@ const { items, isPending } = useItems()",
          "-    <li v-for=\"item in items\" :key=\"item.id\">{{ item.name }} {{ formatPrice(item.price) }}</li>",
          "+    <li v-for=\"item in items\" :key=\"item.id\">",
          "+      {{ item.name }} {{ formatPrice(item.price) }}",
          "+      <BaseButton variant=\"ghost\" @click=\"bag.addItem(item)\">Add to bag</BaseButton>",
          "+    </li>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
