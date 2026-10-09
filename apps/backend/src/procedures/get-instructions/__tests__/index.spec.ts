import { getInstructions } from "@/procedures/get-instructions"
import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

describe("getInstructions", () => {
  it("returns the index for the configuration the review was requested with", async () => {
    const context = await createArtifactContext(undefined, "unfamiliar-territory")

    await expect(getInstructions(KEY, context)).resolves.toMatchObject({
      kind: "indexed",
      index: { configuration: "unfamiliar-territory", sections: { journey: true, blast: true, walkthrough: true } },
    })
  })

  it("returns how the requested configuration writes the fields asked for", async () => {
    const context = await createArtifactContext(undefined, "minimal")

    await expect(getInstructions({ ...KEY, fields: ["walkthrough.files.waypoints.reading"] }, context)).resolves.toStrictEqual({
      kind: "resolved",
      configuration: "minimal",
      fields: [{
        path: "walkthrough.files.waypoints.reading",
        kind: "editable",
        description: "What walkthrough.files.waypoints.reading is.",
        instruction: "How minimal writes walkthrough.files.waypoints.reading.",
        options: null,
      }],
    })
  })

  it("returns every field when asked for all", async () => {
    const context = await createArtifactContext()

    const instructions = await getInstructions({ ...KEY, all: true }, context)

    expect(instructions.kind === "resolved" ? instructions.fields.length : 0).toBe(28)
  })

  it("rejects an unknown field and suggests the one that ends the same way", async () => {
    const context = await createArtifactContext()

    await expect(getInstructions({ ...KEY, fields: ["waypoints.title"] }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "No field at `waypoints.title`. Did you mean `title`, `walkthrough.files.title`, `walkthrough.files.waypoints.title`, `walkthrough.files.waypoints.findings.title`? Nothing was returned.",
    })
  })

  it("rejects a review target with no artifact, because the configuration is in the artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(getInstructions(KEY, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
