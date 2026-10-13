import { createMockProcedureContext } from "@/procedures/context"
import { editJourney } from "@/procedures/edit-journey"
import { listCardBlocks } from "@/procedures/list-card-blocks"

const KEY = { repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check" }
const PATH = "src/inventory/stock-level.ts"

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("listCardBlocks", () => {
  it("lists the root code blocks of a file the Flight Plan holds, each with its type and its lines", async () => {
    const blocks = await listCardBlocks({ ...KEY, path: PATH }, createContext())

    expect(blocks?.message).toBeNull()
    expect(blocks?.blocks.map(({ name, detail, heldLabel }) => ({ name, detail, heldLabel }))).toStrictEqual([
      { name: "OutOfStockError", detail: "Class · Lines 5 to 9", heldLabel: null },
      { name: "availableUnits", detail: "Function · Lines 11 to 15", heldLabel: null },
      { name: "assertInStock", detail: "Function · Lines 17 to 20", heldLabel: null },
    ])
  })

  it("says which block already has a card", async () => {
    const context = createContext()
    const [block] = (await listCardBlocks({ ...KEY, path: PATH }, context))?.blocks ?? []
    await editJourney({ ...KEY, edit: { kind: "add-card", path: PATH, source: { kind: "block", blockId: block.id }, isPrefilled: false, hasChildComponents: false } }, context)

    expect((await listCardBlocks({ ...KEY, path: PATH }, context))?.blocks[0]).toMatchObject({ heldLabel: "Already a card" })
  })

  it("reports nothing for a file that cannot be read, a segment that is gone and a review target without a Flight Plan", async () => {
    await expect(listCardBlocks({ ...KEY, path: "src/missing.ts" }, createContext())).resolves.toBeNull()
    await expect(listCardBlocks({ ...KEY, segmentId: "gone", path: PATH }, createContext())).resolves.toBeNull()
    await expect(listCardBlocks({ ...KEY, targetId: "pr-416", path: PATH }, createContext())).resolves.toBeNull()
  })
})
