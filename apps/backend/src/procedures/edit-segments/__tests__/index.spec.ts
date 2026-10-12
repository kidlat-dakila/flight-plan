import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { editSegments } from "@/procedures/edit-segments"
import { getReview } from "@/procedures/get-review"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }

const createContext = (): ProcedureContext => ({ ...createMockProcedureContext(NOW), now: () => NOW })

const readArtifact = async (context: ProcedureContext) => {
  const artifact = await context.reviewStore.findArtifact(KEY)
  if (artifact === null) throw new Error("The sample Flight Plan is missing.")
  return artifact
}

describe("editSegments", () => {
  it("saves the label of a segment without changing the status of the artifact, and the page shows it", async () => {
    const context = createContext()
    const before = await readArtifact(context)
    const [segment] = before.segments

    await expect(
      editSegments({ ...KEY, edit: { kind: "change", segmentId: segment.id, title: "Held units", paths: [...segment.changedPaths] } }, context),
    ).resolves.toStrictEqual({ kind: "saved" })

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: before.status })
    const page = await getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)

    expect(page?.kind === "artifact" ? page.segments[0]?.outline : null).toMatchObject({
      label: "Held units",
      paths: [...segment.changedPaths].sort((one, two) => one.localeCompare(two)),
    })
  })

  it("adds a segment under a new id", async () => {
    const context = createContext()
    const before = await readArtifact(context)

    await expect(
      editSegments({ ...KEY, edit: { kind: "add", title: "Everything else", paths: before.changedPaths.slice(0, 1) } }, context),
    ).resolves.toStrictEqual({ kind: "saved" })

    const after = await readArtifact(context)

    expect(after.segments).toHaveLength(before.segments.length + 1)
    expect(before.segments.map((segment) => segment.id)).not.toContain(after.segments.at(-1)?.id)
  })

  it("returns why the edit was not saved and leaves the artifact as it was", async () => {
    const context = createContext()
    const before = await readArtifact(context)

    await expect(editSegments({ ...KEY, edit: { kind: "add", title: "", paths: [] } }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(before)
  })

  it("reports nothing for a review target that has no Flight Plan", async () => {
    await expect(editSegments({ ...KEY, targetId: "pr-416", edit: { kind: "remove", segmentId: "all" } }, createContext())).resolves.toBeNull()
  })
})
