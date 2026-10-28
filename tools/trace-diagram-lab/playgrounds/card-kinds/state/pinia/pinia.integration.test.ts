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

describe("card-kinds/state/pinia", () => {
  it("Implement store useBagStore", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/lib/bag-lines.ts b/src/lib/bag-lines.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/lib/bag-lines.ts",
          "@@ -0,0 +1,12 @@",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+export interface BagLine {",
          "+  item: Item",
          "+  quantity: number",
          "+}",
          "+",
          "+export function addLine(lines: BagLine[], item: Item): BagLine[] {",
          "+  const line = lines.find((entry) => entry.item.id === item.id)",
          "+  if (line === undefined) return [...lines, { item, quantity: 1 }]",
          "+  return lines.map((entry) => (entry === line ? { ...entry, quantity: entry.quantity + 1 } : entry))",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/stores/bag.ts b/src/stores/bag.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/bag.ts",
          "@@ -0,0 +1,26 @@",
          "+import { defineStore } from \"pinia\"",
          "+import { addLine, type BagLine } from \"@/lib/bag-lines\"",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+export const useBagStore = defineStore(\"bag\", {",
          "+  state: () => ({",
          "+    lines: [] as BagLine[],",
          "+    lastAddedId: null as number | null,",
          "+  }),",
          "+  getters: {",
          "+    count: (state): number => state.lines.reduce((sum, line) => sum + line.quantity, 0),",
          "+    isEmpty(): boolean {",
          "+      return this.lines.length === 0",
          "+    },",
          "+  },",
          "+  actions: {",
          "+    addItem(item: Item) {",
          "+      this.lines = addLine(this.lines, item)",
          "+      this.lastAddedId = item.id",
          "+    },",
          "+    clear() {",
          "+      this.lines = []",
          "+      this.lastAddedId = null",
          "+    },",
          "+  },",
          "+})",
        ].join("\n"),
        [
          "diff --git a/src/views/items/ItemsPage.vue b/src/views/items/ItemsPage.vue",
          "--- a/src/views/items/ItemsPage.vue",
          "+++ b/src/views/items/ItemsPage.vue",
          "@@ -2,0 +3,7 @@ import { ITEMS } from \"@/data/items\"",
          "+import { useBagStore } from \"@/stores/bag\"",
          "+",
          "+const bag = useBagStore()",
          "+",
          "+const emptyBag = () => {",
          "+  bag.clear()",
          "+}",
          "@@ -5,0 +13,4 @@ import { ITEMS } from \"@/data/items\"",
          "+  <p>",
          "+    {{ bag.count }} items in the bag",
          "+    <button type=\"button\" :disabled=\"bag.isEmpty\" @click=\"emptyBag\">Empty the bag</button>",
          "+  </p>",
          "@@ -7 +18,4 @@ import { ITEMS } from \"@/data/items\"",
          "-    <li v-for=\"item in ITEMS\" :key=\"item.id\">{{ item.name }} ₽{{ item.price }}</li>",
          "+    <li v-for=\"item in ITEMS\" :key=\"item.id\">",
          "+      {{ item.name }} ₽{{ item.price }}",
          "+      <button type=\"button\" @click=\"bag.addItem(item)\">Add to bag</button>",
          "+    </li>",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
