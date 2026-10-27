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

const MANIFEST = JSON.stringify({ devDependencies: { vitest: "4.1.6" } })

const CHANGE: FakeChange = {
  base: { "package.json": MANIFEST, "src/pricing.ts": PRICING, "src/cart.ts": CART, "src/cart.spec.ts": CART_SPEC, "src/logger.ts": LOGGER, "schema.sql": "create table a;", "old.sql": "drop table b;" },
  head: {
    "package.json": MANIFEST,
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

    expect(groups.map((group) => group.astGraphs.map((astGraph) => astGraph.filePath))).toStrictEqual([
      ["src/cart.ts", "src/pricing.ts"],
      ["src/logger.ts"],
      ["src/cart.spec.ts"],
      ["schema.sql"],
    ])
  })

  it("keeps a changed test as one unread file block classified test, and does not join two files through it", async () => {
    const groups = await groupsOf(CHANGE)
    const testBlocks = groups.flatMap((group) => group.codeBlocks).filter((block) => block.filePath.includes(".spec."))

    expect(testBlocks.map(({ id, type, classifications, diffClassifications }) => ({ id, type, classifications, diffClassifications }))).toStrictEqual([
      { id: "src/cart.spec.ts#file@1:1", type: "file", classifications: ["test"], diffClassifications: ["test"] },
    ])
    expect(groups.map((group) => group.rootASTGraphFilePaths)).toStrictEqual([["src/cart.ts"], ["src/logger.ts"], ["src/cart.spec.ts"], ["schema.sql"]])
  })

  it("reads a test as code when no test runner the repository installs names it", async () => {
    const groups = await groupsOf({ base: CHANGE.base, head: { ...CHANGE.head, "package.json": JSON.stringify({ devDependencies: {} }) } })
    const testBlocks = groups.flatMap((group) => group.codeBlocks).filter((block) => block.filePath.includes(".spec."))

    expect(testBlocks.some((block) => block.type !== "file")).toBe(true)
  })

  it("leaves out a test that a configuration named by a script of package.json places", async () => {
    const manifest = JSON.stringify({ scripts: { "test:e2e": "jest --config ./test/jest-e2e.json" }, devDependencies: { jest: "29.7.0" } })
    const e2eConfig = JSON.stringify({ rootDir: ".", testEnvironment: "node", testRegex: ".e2e-spec.ts$" })
    const e2eSpec = codeOf("import { priceOf } from \"../src/pricing\"", "", "it(\"prices\", () => priceOf({ price: 1 }))")
    const files = { "package.json": manifest, "test/jest-e2e.json": e2eConfig, "src/pricing.ts": PRICING }
    const groups = await groupsOf({
      base: { ...files, "test/pricing.e2e-spec.ts": e2eSpec },
      head: { ...files, "src/pricing.ts": CHANGE.head["src/pricing.ts"], "test/pricing.e2e-spec.ts": codeOf(e2eSpec, "it(\"prices more\", () => 1)") },
    })
    const e2eBlocks = groups.flatMap((group) => group.codeBlocks).filter((block) => block.filePath === "test/pricing.e2e-spec.ts")

    expect(groups.map((group) => group.astGraphs.map((astGraph) => astGraph.filePath))).toStrictEqual([["src/pricing.ts"], ["test/pricing.e2e-spec.ts"]])
    expect(e2eBlocks.map(({ type, classifications }) => ({ type, classifications }))).toStrictEqual([{ type: "file", classifications: ["test"] }])
  })

  it("places the changes of the patch of each file, with their columns", async () => {
    const groups = await groupsOf(CHANGE)
    const changed = groups.flatMap((group) => group.codeBlocks).filter((block) => block.lineOfCodeDiffs !== null)

    expect(changed.map((block) => [block.id, block.lineOfCodeDiffs?.map(spanOf)])).toStrictEqual([
      ["src/pricing.ts#function@1:1", ["2:20-2:24"]],
      ["src/logger.ts#telemetry@2:3", ["2:11-2:15"]],
      ["src/cart.spec.ts#file@1:1", ["5:1-5:25"]],
      ["schema.sql#file@1:1", ["1:14-1:20"]],
    ])
    expect(groups.map((group) => group.diffContains)).toStrictEqual([["logic"], ["logic"], ["logic"], ["file"]])
  })

  it("keeps each change of a block as a diff with its type and its range", async () => {
    const blocks = (await groupsOf(CHANGE)).flatMap((group) => group.codeBlocks)
    const changesOf = (block: (typeof blocks)[number]) => block.diffs.filter((diff) => diff.type !== "affected")

    expect(blocks.filter((block) => changesOf(block).length > 0).map((block) => [block.id, changesOf(block).map((diff) => [diff.type, spanOf(diff.range)])])).toStrictEqual([
      ["src/pricing.ts#function@1:1", [["modified", "2:20-2:24"]]],
      ["src/logger.ts#telemetry@2:3", [["modified", "2:11-2:15"]]],
      ["src/cart.spec.ts#file@1:1", [["added", "5:1-5:25"]]],
      ["schema.sql#file@1:1", [["modified", "1:14-1:20"]]],
    ])
    expect(blocks.every((block) => (block.lineOfCodeDiffs ?? []).length === changesOf(block).length)).toBe(true)
  })

  it("leaves a deleted file that no language reads out of every group", async () => {
    const groups = await groupsOf(CHANGE)

    expect(groups.flatMap((group) => group.astGraphs).filter((astGraph) => astGraph.filePath === "old.sql")).toStrictEqual([])
  })
})
