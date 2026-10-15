import { readArtifact } from "@/procedures/read-artifact"
import {
  createArtifactContext,
  DRAFT_ARTIFACT,
  KEY,
  PRICE_PATH,
  SUBTOTAL_PATH,
  TEST_PATH,
  TWO_SEGMENT_ARTIFACT, messageOf,
} from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

describe("readArtifact", () => {
  it("rejects a section the reviewer chose not to generate, and shows its switch in the overview", async () => {
    const sections = { journey: false, blast: true, walkthrough: true, findings: false }
    const context = await createArtifactContext({ ...DRAFT_ARTIFACT, sections })

    await expect(readArtifact({ ...KEY, section: "journey" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "The reviewer chose not to generate the Journey Flow Diagram for this review. Do not write this, and do not ask the reviewer about it.",
    })
    await expect(readArtifact({ ...KEY, section: "blast" }, context)).resolves.toMatchObject({ kind: "read" })
    await expect(readArtifact({ ...KEY, section: "overview" }, context)).resolves.toMatchObject({ content: { sections } })
  })

  it("returns the skeleton, the files a code link can name and what is unwritten as the overview", async () => {
    const context = await createArtifactContext(undefined, "minimal")

    const reading = await readArtifact({ ...KEY, section: "overview" }, context)

    expect(reading).toMatchObject({
      kind: "read",
      content: {
        status: "drafting",
        configuration: "minimal",
        sources: [
          { path: PRICE_PATH, declarations: ["priceOf"] },
          { path: SUBTOTAL_PATH, declarations: ["lineTotal", "subtotal"] },
        ],
        unwritten: { total: 11 },
        segments: [{
          segmentId: "all",
          files: [
            { path: PRICE_PATH, waypoints: [{ id: "w1", declaration: "priceOf", title: null, isReadingWritten: false }] },
            { path: SUBTOTAL_PATH, waypoints: [{ id: "w2" }, { id: "w3" }] },
          ],
          journey: { isDescriptionWritten: false, nodes: [{ id: "j-subtotal", parentId: null, type: "function", label: null, isChanged: true }] },
          blast: { nodes: [{ path: "src/cart/CartPage.tsx", diffType: null }, { path: "src/cart/CartTotal.tsx" }, { path: SUBTOTAL_PATH, diffType: "modified" }] },
        }],
      },
    })
  })

  it("returns the change per file with the waypoints that cover it, and the changed paths with no File Section", async () => {
    const context = await createArtifactContext()

    const reading = await readArtifact({ ...KEY, section: "diff", limit: 1 }, context)

    expect(reading).toMatchObject({
      kind: "read",
      content: {
        total: 2,
        files: [{ path: PRICE_PATH, segmentId: "all", waypointIds: ["w1"], hunks: [" 1\texport const priceOf = (sku: string): number =>\n+2\t  PRICES[sku] ?? 0"] }],
        next: PRICE_PATH,
        unmentioned: [TEST_PATH],
      },
    })
  })

  it("continues a diff after the last file of the previous page", async () => {
    const context = await createArtifactContext()

    const reading = await readArtifact({ ...KEY, section: "diff", limit: 1, after: PRICE_PATH }, context)

    expect(reading).toMatchObject({ kind: "read", content: { files: [{ path: SUBTOTAL_PATH, waypointIds: ["w2", "w3"] }], next: null } })
  })

  it("rejects a diff page that continues after a file the change does not have", async () => {
    const context = await createArtifactContext()

    await expect(readArtifact({ ...KEY, section: "diff", after: "src/gone.ts" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })

  it("returns only the named segment's part", async () => {
    const context = await createArtifactContext(TWO_SEGMENT_ARTIFACT)

    const reading = await readArtifact({ ...KEY, section: "context", segmentId: "second" }, context)

    expect(reading).toStrictEqual({
      kind: "read",
      content: { segments: [{ segmentId: "second", context: "" }] },
    })
  })

  it("rejects a segment the artifact does not have, naming the ones it has", async () => {
    const context = await createArtifactContext(TWO_SEGMENT_ARTIFACT)

    await expect(readArtifact({ ...KEY, section: "full", segmentId: "third" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "This artifact has no segment with the id third. Its segments are: first, second.",
    })
  })

  it("tells the agent to have the reviewer start the review when there is no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(readArtifact({ ...KEY, section: "overview" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "No review artifact exists for pr-412 of storefront yet. The reviewer starts a review in Flight Plan's web app, which builds the artifact. Ask them to start it there, then call this again.",
    })
  })

  it("rejects a repository Flight Plan does not follow", async () => {
    const context = await createArtifactContext()

    expect(messageOf(await readArtifact({ repositoryName: "billing", targetId: "pr-1", section: "overview" }, context))).toContain("Flight Plan has no repository named \"billing\".")
  })
})
