import { MAX_QUOTE_LENGTH } from "@/procedures/build-text-reference/utils/schemas"
import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { appRouter } from "@/server/trpc/router"
import type { ReviewArtifact } from "@flightplan/configurations"

const REQUEST = { ...KEY, part: { kind: "segment", segmentId: "all" }, quote: "rounds the total once" } as const

const createCaller = async (artifact?: ReviewArtifact | null) => appRouter.createCaller(await createArtifactContext(artifact))

describe("review.textReference route", () => {
  it("delegates to the build-text-reference procedure", async () => {
    await expect((await createCaller()).review.textReference(REQUEST)).resolves.toStrictEqual({
      reference: "segment `all` of the review artifact, where it says \"rounds the total once\"",
    })
  })

  it("maps a review without an artifact to a NOT_FOUND error", async () => {
    await expect((await createCaller(null)).review.textReference(REQUEST)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("rejects a blank quote and a quote over the limit", async () => {
    const caller = await createCaller()

    await expect(caller.review.textReference({ ...REQUEST, quote: "  \n " })).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(caller.review.textReference({ ...REQUEST, quote: "a".repeat(MAX_QUOTE_LENGTH + 1) })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
