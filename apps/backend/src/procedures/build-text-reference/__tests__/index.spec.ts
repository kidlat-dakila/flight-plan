import { buildTextReference } from "@/procedures/build-text-reference"
import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

const REQUEST = { ...KEY, part: { kind: "waypoint", waypointId: "w2" }, quote: "rounds\n  the total once" } as const

describe("buildTextReference", () => {
  it("names where the text is in the review artifact, with the quoted words", async () => {
    await expect(buildTextReference(REQUEST, await createArtifactContext())).resolves.toStrictEqual({
      reference: "waypoint `w2` of the review artifact, where it says \"rounds the total once\"",
    })
  })

  it("names the segment for a part the artifact no longer holds", async () => {
    const request = { ...REQUEST, part: { kind: "trace-node", segmentId: "all", nodeId: "gone" } } as const

    await expect(buildTextReference(request, await createArtifactContext())).resolves.toStrictEqual({
      reference: "segment `all` of the review artifact, where it says \"rounds the total once\"",
    })
  })

  it("reports nothing for a review without an artifact", async () => {
    await expect(buildTextReference(REQUEST, await createArtifactContext(null))).resolves.toBeNull()
  })
})
