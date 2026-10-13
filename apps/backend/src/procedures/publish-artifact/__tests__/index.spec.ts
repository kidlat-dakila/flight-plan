import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, flushPromises, WITH_CLAUDE } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { publishArtifact } from "@/procedures/publish-artifact"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const UNWRITTEN_KEY = { repositoryName: "storefront", targetId: "pr-416" }
const REQUESTED_MESSAGE = "Asked your agent to publish it. The link shows under Share when it is done."

const createContext = () => createMockProcedureContext(NOW)

const createContextWithClaude = (spawner: FakeSpawner): ProcedureContext => ({
  ...createContext(),
  setupStore: new InMemorySetupStore(WITH_CLAUDE),
  configurationStore: new InMemoryConfigurationStore([]),
  conversationEnvironment: createConversationEnvironment({ spawners: { claude: spawner.spawn } }),
})

describe("publishArtifact", () => {
  it("records where the artifact was attached to the description", async () => {
    const context = createContext()

    await expect(publishArtifact({ ...KEY, destination: "description" }, context)).resolves.toStrictEqual({
      message: "Attached to the pull request description",
    })
    await expect(context.reviewStore.readPublications(KEY)).resolves.toMatchObject([{ kind: "description" }])
  })

  it("starts Claude with the request to publish the page it built, and records nothing yet", async () => {
    const spawner = new FakeSpawner()
    const context = createContextWithClaude(spawner)

    await expect(publishArtifact({ ...KEY, destination: "claude" }, context)).resolves.toStrictEqual({ message: REQUESTED_MESSAGE })

    expect(spawner.launches).toHaveLength(1)
    expect(spawner.launches[0]?.prompt).toContain("Publish this review target's Flight Plan as a Claude artifact.")
    expect(spawner.launches[0]?.prompt).toContain("`/sample-publications/storefront/pr-405`")
    expect(spawner.launches[0]?.prompt).toContain("pass no `url`")
    await expect(context.reviewStore.readPublications(KEY)).resolves.toStrictEqual([])
  })

  it("shows the Claude artifact as being published until the agent records its address or stops", async () => {
    const spawner = new FakeSpawner()
    const context = createContextWithClaude(spawner)
    const isPending = async (): Promise<boolean | null> => {
      const page = await getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)
      return page?.kind === "artifact" ? page.sharing?.options.find((option) => option.key === "claude")?.isPending ?? null : null
    }

    await expect(isPending()).resolves.toBe(false)
    await publishArtifact({ ...KEY, destination: "claude" }, context)
    await expect(isPending()).resolves.toBe(true)

    spawner.processes[0]?.exit(0)
    await flushPromises()

    await expect(isPending()).resolves.toBe(false)
  })

  it("shows nothing as being published when no agent could be asked", async () => {
    const context = createContext()

    await publishArtifact({ ...KEY, destination: "claude" }, context)

    await expect(context.reviewStore.readPublishingRequest(KEY)).resolves.toBeNull()
  })

  it("asks to update the artifact it was published to before", async () => {
    const spawner = new FakeSpawner()
    const context = createContextWithClaude(spawner)
    await context.reviewStore.writePublications(KEY, [{ kind: "claude", url: "https://claude.ai/artifact/abc", publishedAt: NOW }])

    await publishArtifact({ ...KEY, destination: "claude" }, context)

    expect(spawner.launches[0]?.prompt).toContain("pass `url` \"https://claude.ai/artifact/abc\"")
  })

  it("says why no agent could be asked", async () => {
    await expect(publishArtifact({ ...KEY, destination: "claude" }, createContext())).resolves.toStrictEqual({
      message: "No agent could be asked to publish it. Finish the Agents step of the setup so Flight Plan can start an agent.",
    })
  })

  it("says so when this build has no page to publish", async () => {
    const context: ProcedureContext = { ...createContext(), writePublishedPage: async () => await Promise.resolve(null) }

    await expect(publishArtifact({ ...KEY, destination: "claude" }, context)).resolves.toStrictEqual({
      message: "This build of Flight Plan has no page to publish.",
    })
  })

  it("reports nothing without an artifact, or for a description without a pull request", async () => {
    await expect(publishArtifact({ ...UNWRITTEN_KEY, destination: "claude" }, createContext())).resolves.toBeNull()
    await expect(
      publishArtifact({ repositoryName: "flight-plan", targetId: "branch-refactor-to-full-web", destination: "description" }, createContext()),
    ).resolves.toBeNull()
  })
})
