import { createArtifactContext, KEY } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { updateDocument } from "@/procedures/update-document"

describe("updateDocument", () => {
  it("stores the context section and reports what is left", async () => {
    const context = await createArtifactContext()

    const markdown = "A cart could be a cent off.\n\n## Implementation\n\n- Rounded the sum in [`subtotal()`](code:src/cart/subtotal.ts#subtotal)."

    const writing = await updateDocument({ ...KEY, context: markdown }, context)

    expect(writing).toMatchObject({ kind: "written", note: "Wrote the document.", unwritten: { total: 12 } })
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments[0]?.context).toBe(markdown)
  })

  it("returns a refusal as a rejection and stores nothing", async () => {
    const context = await createArtifactContext()

    const writing = await updateDocument({ ...KEY, order: { files: ["src/gone.ts"] } }, context)

    expect(writing).toMatchObject({ kind: "rejected" })
  })

  it("rejects a review target with no artifact", async () => {
    const context = await createArtifactContext(null)

    await expect(updateDocument({ ...KEY, context: "Why." }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
