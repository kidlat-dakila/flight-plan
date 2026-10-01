import { createMockProcedureContext } from "@/procedures/context"
import { publishArtifact } from "@/procedures/publish-artifact"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("publishArtifact", () => {
  it("records where the artifact was published", async () => {
    const context = createContext()

    await expect(publishArtifact({ ...KEY, destination: "description" }, context)).resolves.toStrictEqual({
      message: "Attached to the pull request description",
    })
    await expect(context.reviewStore.readPublications(KEY)).resolves.toMatchObject([{ kind: "description" }])
  })

  it("reports nothing without an artifact, or for a description without a pull request", async () => {
    await expect(publishArtifact({ ...KEY, targetId: "pr-416", destination: "claude" }, createContext())).resolves.toBeNull()
    await expect(
      publishArtifact({ repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web", destination: "description" }, createContext()),
    ).resolves.toBeNull()
  })
})
