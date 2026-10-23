import { parse, stringify } from "devalue"
import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { formatStoredReview, savedVersionOf, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { migrateReview } from "@/procedures/migrate-review"
import { readArtifact } from "@/procedures/read-artifact"
import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

const SCAFFOLD: ReviewScaffold = {
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") },
}

const STOREFRONT_KEY = { repositoryName: "storefront", targetId: "pr-412" }

const newerTextOf = (scaffold: ReviewScaffold): string => {
  const stored: unknown = parse(formatStoredReview(scaffold, "0.9.0"))
  return stringify(typeof stored === "object" && stored !== null ? { ...stored, owner: "A field of a newer Flight Plan" } : stored)
}

const createNewerContext = async () => {
  const context = { ...createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")), runningVersion: "0.1.11" }
  await context.reviewStore.writeStoredText(STOREFRONT_KEY, newerTextOf(SCAFFOLD))
  return context
}

describe("migrateReview", () => {
  it("shows a Flight Plan of a newer Flight Plan as a page to convert, in place of the review", async () => {
    const context = await createNewerContext()

    await expect(getReview({ ...STOREFRONT_KEY, filterKeys: [], isShowingReviewed: false }, context)).resolves.toMatchObject({
      kind: "needs-migration",
      heading: "This Flight Plan comes from a newer version",
      message: "It was saved by Flight Plan 0.9.0, and you are running 0.1.11. Flight Plan can convert it to the shape of this version, but some parts written in the newer version may not show. Updating Flight Plan keeps everything.",
      actionLabel: "Convert and open",
    })
  })

  it("converts the Flight Plan, saves it with the running version, and opens the review after", async () => {
    const context = await createNewerContext()

    await expect(migrateReview(STOREFRONT_KEY, context)).resolves.toStrictEqual({ message: "Flight Plan updated" })

    await expect(context.reviewStore.findArtifact(STOREFRONT_KEY)).resolves.toStrictEqual(SCAFFOLD.artifact)
    await expect(getReview({ ...STOREFRONT_KEY, filterKeys: [], isShowingReviewed: false }, context)).resolves.toMatchObject({ kind: "artifact" })
  })

  it("throws for a Flight Plan it cannot convert, and leaves the file as it was", async () => {
    const context = { ...createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")), runningVersion: "0.1.11" }
    const unreadable = stringify({ schema: 9, version: "0.9.0", meta: null, artifact: null })
    await context.reviewStore.writeStoredText(STOREFRONT_KEY, unreadable)

    await expect(migrateReview(STOREFRONT_KEY, context)).rejects.toThrow("This Flight Plan could not be brought to the shape of this version of Flight Plan.")
    await expect(context.reviewStore.readStoredText(STOREFRONT_KEY)).resolves.toBe(unreadable)
  })

  it("answers nothing for a review target with no saved Flight Plan", async () => {
    await expect(migrateReview(STOREFRONT_KEY, createMockProcedureContext(new Date()))).resolves.toBeNull()
  })

  it("tells the agent to have the reviewer update a Flight Plan before it reads it", async () => {
    const context = { ...(await createArtifactContext()), runningVersion: "0.1.11" }
    await context.reviewStore.writeStoredText(KEY, newerTextOf(SCAFFOLD))

    await expect(readArtifact({ ...KEY, section: "overview" }, context)).resolves.toMatchObject({
      kind: "rejected",
      message: "This Flight Plan was saved by another version of Flight Plan and has to be updated before it can be read. Ask the reviewer to open the review in Flight Plan and update it there, then call this again.",
    })
  })

  it("names the version that saved a file", () => {
    expect(savedVersionOf(formatStoredReview(SCAFFOLD, "0.1.11"))).toBe("0.1.11")
    expect(savedVersionOf(formatStoredReview(SCAFFOLD, null))).toBeNull()
  })
})
