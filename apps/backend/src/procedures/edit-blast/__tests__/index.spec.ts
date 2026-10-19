import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { editBlast } from "@/procedures/edit-blast"
import { getReview } from "@/procedures/get-review"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const STOCK_ROUTE_PATH = "src/api/routes/stock.ts"

const createContext = (): ProcedureContext => ({ ...createMockProcedureContext(NOW), now: () => NOW })

describe("editBlast", () => {
  it("saves the impact of a file without changing the status of the artifact, and the page shows it", async () => {
    const context = createContext()
    const statusBefore = (await context.reviewStore.findArtifact(KEY))?.status

    await expect(
      editBlast({ ...KEY, path: STOCK_ROUTE_PATH, impactType: "breaks", impactReason: "It reports a **negative** number." }, context),
    ).resolves.toStrictEqual({ kind: "saved" })

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: statusBefore })
    const page = await getReview({ ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }, context)
    const nodes = page?.kind === "artifact" ? page.segments.flatMap((segment) => segment.blastDiagram?.views[0].board.nodes ?? []) : []

    expect(nodes.find((node) => node.id === STOCK_ROUTE_PATH)).toMatchObject({
      mark: "breaks",
      markLabel: "Breaks",
      assessment: { impactType: "breaks", impactReason: "It reports a **negative** number." },
      impactReason: [
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "It reports a " },
            { kind: "strong", text: "negative" },
            { kind: "text", text: " number." },
          ],
        },
      ],
    })
  })

  it("returns why the impact was not saved and leaves the artifact as it was", async () => {
    const context = createContext()
    const before = await context.reviewStore.findArtifact(KEY)

    await expect(editBlast({ ...KEY, path: STOCK_ROUTE_PATH, impactType: "breaks", impactReason: " " }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(before)
  })

  it("reports nothing for a review target that has no Flight Plan", async () => {
    await expect(
      editBlast({ ...KEY, targetId: "pr-416", path: STOCK_ROUTE_PATH, impactType: "unaffected", impactReason: "" }, createContext()),
    ).resolves.toBeNull()
  })
})
