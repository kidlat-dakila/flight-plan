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

describe("card-kinds/state/zustand", () => {
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
          "diff --git a/src/pages/items/ItemsPage.tsx b/src/pages/items/ItemsPage.tsx",
          "--- a/src/pages/items/ItemsPage.tsx",
          "+++ b/src/pages/items/ItemsPage.tsx",
          "@@ -1,0 +2 @@ import { ITEMS } from \"@/data/items\"",
          "+import { selectCount, selectTotal, useBagStore } from \"@/stores/bag-store\"",
          "@@ -3,0 +5,4 @@ export function ItemsPage() {",
          "+  const count = useBagStore(selectCount)",
          "+  const total = useBagStore(selectTotal)",
          "+  const addItem = useBagStore((state) => state.addItem)",
          "+  const clear = useBagStore((state) => state.clear)",
          "@@ -5,7 +10,18 @@ export function ItemsPage() {",
          "-    <ul>",
          "-      {ITEMS.map((item) => (",
          "-        <li key={item.id}>",
          "-          {item.name} ₽{item.price}",
          "-        </li>",
          "-      ))}",
          "-    </ul>",
          "+    <section>",
          "+      <p>",
          "+        {count} items in the bag, ₽{total}",
          "+      </p>",
          "+      <button type=\"button\" onClick={clear}>",
          "+        Empty the bag",
          "+      </button>",
          "+      <ul>",
          "+        {ITEMS.map((item) => (",
          "+          <li key={item.id}>",
          "+            {item.name} ₽{item.price}",
          "+            <button type=\"button\" onClick={() => addItem(item)}>",
          "+              Add to bag",
          "+            </button>",
          "+          </li>",
          "+        ))}",
          "+      </ul>",
          "+    </section>",
        ].join("\n"),
        [
          "diff --git a/src/stores/bag-store.ts b/src/stores/bag-store.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/bag-store.ts",
          "@@ -0,0 +1,21 @@",
          "+import { create } from \"zustand\"",
          "+import { addLine, type BagLine } from \"@/lib/bag-lines\"",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+interface BagState {",
          "+  lines: BagLine[]",
          "+  lastAddedId: number | null",
          "+  addItem: (item: Item) => void",
          "+  clear: () => void",
          "+}",
          "+",
          "+export const useBagStore = create<BagState>()((set) => ({",
          "+  lines: [],",
          "+  lastAddedId: null,",
          "+  addItem: (item) => set((state) => ({ lines: addLine(state.lines, item), lastAddedId: item.id })),",
          "+  clear: () => set({ lines: [], lastAddedId: null }),",
          "+}))",
          "+",
          "+export const selectCount = (state: BagState): number => state.lines.reduce((sum, line) => sum + line.quantity, 0)",
          "+",
          "+export const selectTotal = (state: BagState): number => state.lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
