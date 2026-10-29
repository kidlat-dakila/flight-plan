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

describe("card-kinds/state/mobx", () => {
  it("Implement store bagStore", async () => {
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
          "@@ -0,0 +1 @@",
          "+import { observer } from \"mobx-react-lite\"",
          "@@ -1,0 +3 @@ import { ITEMS } from \"@/data/items\"",
          "+import { bagStore } from \"@/stores/bag-store\"",
          "@@ -3 +5 @@ import { ITEMS } from \"@/data/items\"",
          "-export function ItemsPage() {",
          "+function ItemsList() {",
          "@@ -5,7 +7,16 @@ export function ItemsPage() {",
          "-    <ul>",
          "-      {ITEMS.map((item) => (",
          "-        <li key={item.id}>",
          "-          {item.name} ₽{item.price}",
          "-        </li>",
          "-      ))}",
          "-    </ul>",
          "+    <section>",
          "+      <p>{bagStore.count} items in the bag</p>",
          "+      <button type=\"button\" onClick={() => bagStore.clear()}>",
          "+        Empty the bag",
          "+      </button>",
          "+      <ul>",
          "+        {ITEMS.map((item) => (",
          "+          <li key={item.id}>",
          "+            {item.name} ₽{item.price}",
          "+            <button type=\"button\" onClick={() => bagStore.addItem(item)}>",
          "+              Add to bag",
          "+            </button>",
          "+          </li>",
          "+        ))}",
          "+      </ul>",
          "+    </section>",
          "@@ -13,0 +25,2 @@ export function ItemsPage() {",
          "+",
          "+export const ItemsPage = observer(ItemsList)",
        ].join("\n"),
        [
          "diff --git a/src/stores/bag-store.ts b/src/stores/bag-store.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/stores/bag-store.ts",
          "@@ -0,0 +1,19 @@",
          "+import { observable } from \"mobx\"",
          "+import { addLine, type BagLine } from \"@/lib/bag-lines\"",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+export const bagStore = observable({",
          "+  lines: [] as BagLine[],",
          "+  lastAddedId: null as number | null,",
          "+  get count(): number {",
          "+    return this.lines.reduce((sum, line) => sum + line.quantity, 0)",
          "+  },",
          "+  addItem(item: Item) {",
          "+    this.lines = addLine(this.lines, item)",
          "+    this.lastAddedId = item.id",
          "+  },",
          "+  clear() {",
          "+    this.lines = []",
          "+    this.lastAddedId = null",
          "+  },",
          "+})",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
