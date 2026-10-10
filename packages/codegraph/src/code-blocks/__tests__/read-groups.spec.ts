import { readCodeGroupGraphs } from "@/code-blocks/read-groups"
import { storeCodeGroupGraph } from "@/code-blocks/store-group"
import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeChange } from "@/import-graph/__tests__/fake-git-adapter"
import { codeOf, spanOf } from "./group-fixture"

const groupsOf = async (change: FakeChange): Promise<StoredCodeGroupGraph[]> => {
  const groups = await readCodeGroupGraphs({ gitAdapter: createFakeGitAdapter(change), baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return groups.map(storeCodeGroupGraph)
}

const PRICING = codeOf("export function priceOf(item) {", "  return item.price", "}")
const CART = codeOf("import { priceOf } from \"./pricing\"", "", "export const totalOf = (items) => items.map(priceOf)")
const CART_SPEC = codeOf("import { totalOf } from \"./cart\"", "import { log } from \"./logger\"", "", "it(\"adds\", () => log(totalOf([])))")
const LOGGER = codeOf("export const log = (message) => {", "  console.log(message)", "}")

const CHANGE: FakeChange = {
  base: { "src/pricing.ts": PRICING, "src/cart.ts": CART, "src/cart.spec.ts": CART_SPEC, "src/logger.ts": LOGGER, "schema.sql": "create table a;", "old.sql": "drop table b;" },
  head: {
    "src/pricing.ts": codeOf("export function priceOf(item) {", "  return item.price * 2", "}"),
    "src/cart.ts": CART,
    "src/cart.spec.ts": codeOf(CART_SPEC, "it(\"adds more\", () => 1)"),
    "src/logger.ts": codeOf("export const log = (message) => {", "  console.info(message)", "}"),
    "schema.sql": "create table orders;",
  },
}

describe("readCodeGroupGraphs", () => {
  it("builds one group per set of connected files, and one for each changed file nothing reads", async () => {
    const groups = await groupsOf(CHANGE)

    expect(groups.map((group) => group.astGraphs.map((astGraph) => astGraph.filePath))).toStrictEqual([["src/cart.ts", "src/pricing.ts"], ["src/logger.ts"], ["schema.sql"]])
  })

  it("leaves a test out of every group, changed or not, and does not join two files through it", async () => {
    const groups = await groupsOf(CHANGE)

    expect(groups.flatMap((group) => group.codeBlocks).filter((block) => block.filePath.includes(".spec."))).toStrictEqual([])
    expect(groups.map((group) => group.rootASTGraphFilePaths)).toStrictEqual([["src/cart.ts"], ["src/logger.ts"], ["schema.sql"]])
  })

  it("places the changes of the patch of each file, with their columns", async () => {
    const groups = await groupsOf(CHANGE)
    const changed = groups.flatMap((group) => group.codeBlocks).filter((block) => block.lineOfCodeDiffs !== null)

    expect(changed.map((block) => [block.id, block.lineOfCodeDiffs?.map(spanOf)])).toStrictEqual([
      ["src/pricing.ts#function@1:1", ["2:20-2:24"]],
      ["src/logger.ts#telemetry@2:3", ["2:11-2:15"]],
      ["schema.sql#file@1:1", ["1:14-1:20"]],
    ])
    expect(groups.map((group) => group.diffContains)).toStrictEqual([["logic"], ["logic"], ["file"]])
  })

  it("leaves a deleted file that no language reads out of every group", async () => {
    const groups = await groupsOf(CHANGE)

    expect(groups.flatMap((group) => group.astGraphs).filter((astGraph) => astGraph.filePath === "old.sql")).toStrictEqual([])
  })
})
