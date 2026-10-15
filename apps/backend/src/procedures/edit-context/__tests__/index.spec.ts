import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { editContext } from "@/procedures/edit-context"
import { getReview } from "@/procedures/get-review"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }

const createContext = (): ProcedureContext => ({ ...createMockProcedureContext(NOW), now: () => NOW })

const firstSegmentIdOf = async (context: ProcedureContext): Promise<string> =>
  (await context.reviewStore.findArtifact(KEY))?.segments[0]?.id ?? ""

describe("editContext", () => {
  it("saves the context of a segment without changing the status of the artifact, and the page shows it", async () => {
    const context = createContext()
    const segmentId = await firstSegmentIdOf(context)
    const statusBefore = (await context.reviewStore.findArtifact(KEY))?.status

    await expect(editContext({ ...KEY, segmentId, context: "The stock check now counts **held** units." }, context)).resolves.toStrictEqual({
      kind: "saved",
    })

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: statusBefore })
    const page = await getReview({ ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }, context)

    expect(page?.kind === "artifact" ? page.segments[0]?.context : null).toMatchObject({
      markdown: "The stock check now counts **held** units.",
      isDraft: false,
      context: [
        {
          kind: "paragraph",
          inlines: [
            { kind: "text", text: "The stock check now counts " },
            { kind: "strong", text: "held" },
            { kind: "text", text: " units." },
          ],
        },
      ],
    })
  })

  it("returns why the context was not saved and leaves the artifact as it was", async () => {
    const context = createContext()
    const segmentId = await firstSegmentIdOf(context)
    const before = await context.reviewStore.findArtifact(KEY)

    await expect(editContext({ ...KEY, segmentId, context: " " }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(before)
  })

  it("reports nothing for a review target that has no Flight Plan", async () => {
    await expect(editContext({ ...KEY, targetId: "pr-416", segmentId: "all", context: "Text." }, createContext())).resolves.toBeNull()
  })
})
