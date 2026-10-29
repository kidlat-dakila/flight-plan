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

describe("card-kinds/state/xstate", () => {
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
          "+import { useSelector } from \"@xstate/store/react\"",
          "@@ -1,0 +3 @@ import { ITEMS } from \"@/data/items\"",
          "+import { bagStore } from \"@/stores/bag-store\"",
          "@@ -3,0 +6 @@ export function ItemsPage() {",
          "+  const count = useSelector(bagStore, (snapshot) => snapshot.context.lines.reduce((sum, line) => sum + line.quantity, 0))",
          "@@ -5,7 +8,16 @@ export function ItemsPage() {",
          "-    <ul>",
          "-      {ITEMS.map((item) => (",
          "-        <li key={item.id}>",
          "-          {item.name} ₽{item.price}",
          "-        </li>",
          "-      ))}",
          "-    </ul>",
          "+    <section>",
          "+      <p>{count} items in the bag</p>",
          "+      <button type=\"button\" onClick={() => bagStore.send({ type: \"clear\" })}>",
          "+        Empty the bag",
          "+      </button>",
          "+      <ul>",
          "+        {ITEMS.map((item) => (",
          "+          <li key={item.id}>",
          "+            {item.name} ₽{item.price}",
          "+            <button type=\"button\" onClick={() => bagStore.send({ type: \"addItem\", item })}>",
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
          "@@ -0,0 +1,11 @@",
          "+import { createStore } from \"@xstate/store\"",
          "+import { addLine, type BagLine } from \"@/lib/bag-lines\"",
          "+import type { Item } from \"@/types/item\"",
          "+",
          "+export const bagStore = createStore({",
          "+  context: { lines: [] as BagLine[], lastAddedId: null as number | null },",
          "+  on: {",
          "+    addItem: (context, event: { item: Item }) => ({ lines: addLine(context.lines, event.item), lastAddedId: event.item.id }),",
          "+    clear: () => ({ lines: [], lastAddedId: null }),",
          "+  },",
          "+})",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
