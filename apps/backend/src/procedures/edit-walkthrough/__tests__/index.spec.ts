import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { editWalkthrough } from "@/procedures/edit-walkthrough"
import { getReview } from "@/procedures/get-review"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const SEGMENT_ID = "stock-check"
const WAYPOINT_ID = "available-units"

const createContext = (): ProcedureContext => ({ ...createMockProcedureContext(NOW), now: () => NOW })

const readWalkthrough = async (context: ProcedureContext) => {
  const page = await getReview({ ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [SEGMENT_ID] }, context)
  const segment = page?.kind === "artifact" ? page.segments.find((candidate) => candidate.id === SEGMENT_ID) : undefined
  if (segment === undefined) throw new Error("The segment is not on the page.")
  return segment.walkthrough
}

const waypointsOn = (walkthrough: Awaited<ReturnType<typeof readWalkthrough>>) =>
  walkthrough.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

describe("editWalkthrough", () => {
  it("saves a waypoint without changing the status of the artifact, and the page shows it with the text it was written from", async () => {
    const context = createContext()
    const statusBefore = (await context.reviewStore.findArtifact(KEY))?.status

    await expect(
      editWalkthrough(
        { ...KEY, segmentId: SEGMENT_ID, edit: { kind: "change-waypoint", waypointId: WAYPOINT_ID, title: "Counts the holds", reading: "It **subtracts**.", coreChange: "Can go negative." } },
        context,
      ),
    ).resolves.toStrictEqual({ kind: "saved" })

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: statusBefore })
    expect(waypointsOn(await readWalkthrough(context)).find((waypoint) => waypoint.id === WAYPOINT_ID)).toMatchObject({
      title: "Counts the holds",
      coreChangeLabel: "Core change",
      text: { title: "Counts the holds", reading: "It **subtracts**.", coreChange: "Can go negative." },
    })
  })

  it("marks a waypoint with no reason, and the page shows the mark with nothing under it", async () => {
    const context = createContext()

    await editWalkthrough(
      { ...KEY, segmentId: SEGMENT_ID, edit: { kind: "change-waypoint", waypointId: WAYPOINT_ID, title: "Counts the holds", reading: "", coreChange: "" } },
      context,
    )

    expect(waypointsOn(await readWalkthrough(context)).find((waypoint) => waypoint.id === WAYPOINT_ID)).toMatchObject({
      coreChangeLabel: "Core change",
      coreChange: null,
      text: { coreChange: "" },
    })
  })

  it("moves a file, and the page shows and lists the files in their new order", async () => {
    const context = createContext()
    const shownPaths = (await readWalkthrough(context)).fileOrder.map((file) => file.path)
    const [firstPath, secondPath] = shownPaths

    await expect(
      editWalkthrough({ ...KEY, segmentId: SEGMENT_ID, edit: { kind: "move-file", path: secondPath, direction: "up", shownPaths } }, context),
    ).resolves.toStrictEqual({ kind: "saved" })

    const { fileOrder, files } = await readWalkthrough(context)
    expect(fileOrder.slice(0, 2)).toMatchObject([
      { path: secondPath, canMoveUp: false, canMoveDown: true },
      { path: firstPath, canMoveUp: true },
    ])
    expect(files.map((file) => file.path)).toStrictEqual(fileOrder.map((file) => file.path))
  })

  it("removes a file from the walkthrough of the page", async () => {
    const context = createContext()
    const [removedPath] = (await readWalkthrough(context)).fileOrder.map((file) => file.path)

    await editWalkthrough({ ...KEY, segmentId: SEGMENT_ID, edit: { kind: "remove-file", path: removedPath } }, context)

    const after = await readWalkthrough(context)
    expect(after.fileOrder.map((file) => file.path)).not.toContain(removedPath)
    expect(after.files.map((file) => file.path)).not.toContain(removedPath)
  })

  it("removes a waypoint from the page", async () => {
    const context = createContext()

    await editWalkthrough({ ...KEY, segmentId: SEGMENT_ID, edit: { kind: "remove-waypoint", waypointId: WAYPOINT_ID } }, context)

    expect(waypointsOn(await readWalkthrough(context)).map((waypoint) => waypoint.id)).not.toContain(WAYPOINT_ID)
  })

  it("returns why an edit was not saved and leaves the artifact as it was", async () => {
    const context = createContext()
    const before = await context.reviewStore.findArtifact(KEY)

    await expect(
      editWalkthrough({ ...KEY, segmentId: SEGMENT_ID, edit: { kind: "change-waypoint", waypointId: WAYPOINT_ID, title: " ", reading: "", coreChange: null } }, context),
    ).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(before)
  })

  it("reports nothing for a review target that has no Flight Plan", async () => {
    await expect(
      editWalkthrough({ ...KEY, targetId: "pr-416", segmentId: SEGMENT_ID, edit: { kind: "remove-waypoint", waypointId: WAYPOINT_ID } }, createContext()),
    ).resolves.toBeNull()
  })
})
