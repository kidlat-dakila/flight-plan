import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { resolveThread } from "@/procedures/resolve-thread"

const DISCUSSED_KEY = { repositoryName: "storefront", targetId: "pr-412" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

const readThreads = async (context: ReturnType<typeof createContext>) => {
  const page = await getReview({ ...DISCUSSED_KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }, context)
  if (page?.kind !== "artifact") throw new Error("The sample review is not written.")
  return page.segments.flatMap((segment) => segment.walkthrough.files).flatMap((file) => file.threads)
}

describe("resolveThread", () => {
  it("resolves a thread and reopens it", async () => {
    const context = createContext()

    await expect(resolveThread({ ...DISCUSSED_KEY, threadId: "thread-1", isResolved: true }, context)).resolves.toStrictEqual({ kind: "done" })
    expect((await readThreads(context)).find((thread) => thread.id === "thread-1")).toMatchObject({
      statusLabel: "Resolved",
      resolution: { label: "Reopen conversation", isResolving: false },
    })

    await resolveThread({ ...DISCUSSED_KEY, threadId: "thread-1", isResolved: false }, context)
    expect((await readThreads(context)).find((thread) => thread.id === "thread-1")).toMatchObject({
      statusLabel: null,
      resolution: { label: "Resolve conversation", isResolving: true },
    })
  })

  it("passes on the refusal for a thread that is gone", async () => {
    await expect(resolveThread({ ...DISCUSSED_KEY, threadId: "thread-9", isResolved: true }, createContext())).resolves.toMatchObject({
      kind: "refused",
    })
  })
})
