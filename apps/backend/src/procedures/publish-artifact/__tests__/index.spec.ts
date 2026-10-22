import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { WITH_CLAUDE } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { publishArtifact } from "@/procedures/publish-artifact"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-405" }
const UNWRITTEN_KEY = { repositoryName: "storefront", targetId: "pr-416" }
const REQUESTED_MESSAGE = "Asked your agent to publish it. The link shows under Share when it is done."

const createContext = () => createMockProcedureContext(NOW)

const createContextWithClaude = (): ProcedureContext => ({
  ...createContext(),
  setupStore: new InMemorySetupStore(WITH_CLAUDE),
  configurationStore: new InMemoryConfigurationStore([]),
})

const lastRequestOf = async (context: ProcedureContext): Promise<string> => {
  const { journal } = await context.conversationEnvironment.store.read(KEY)
  const event = journal.at(-1)?.event
  return event?.kind === "reviewer-message" ? event.body : ""
}

describe("publishArtifact", () => {
  it("records where the artifact was attached to the description", async () => {
    const context = createContext()

    await expect(publishArtifact({ ...KEY, destination: "description" }, context)).resolves.toStrictEqual({
      message: "Attached to the pull request description",
    })
    await expect(context.reviewStore.readPublications(KEY)).resolves.toMatchObject([{ kind: "description" }])
  })

  it("leaves the live agent the request to publish the page it built, and records nothing yet", async () => {
    const context = createContextWithClaude()

    await expect(publishArtifact({ ...KEY, destination: "claude" }, context)).resolves.toStrictEqual({ message: REQUESTED_MESSAGE })

    const request = await lastRequestOf(context)
    expect(request).toContain("Publish this review target's Flight Plan as a Claude artifact.")
    expect(request).toContain("`/sample-publications/storefront/pr-405`")
    expect(request).toContain("pass no `url`")
    await expect(context.reviewStore.readPublications(KEY)).resolves.toStrictEqual([])
  })

  it("shows the Claude artifact as being published while the agent is online and has not recorded its address", async () => {
    const context = createContextWithClaude()
    const isPending = async (): Promise<boolean | null> => {
      const page = await getReview({ ...KEY, filterKeys: [], isShowingReviewed: false }, context)
      return page?.kind === "artifact" ? page.sharing?.options.find((option) => option.key === "claude")?.isPending ?? null : null
    }

    await expect(isPending()).resolves.toBe(false)
    await publishArtifact({ ...KEY, destination: "claude" }, context)
    await expect(isPending()).resolves.toBe(false)

    context.conversationEnvironment.presence.openStream(KEY)
    await expect(isPending()).resolves.toBe(true)
  })

  it("asks to update the artifact it was published to before", async () => {
    const context = createContextWithClaude()
    await context.reviewStore.writePublications(KEY, [{ kind: "claude", url: "https://claude.ai/artifact/abc", publishedAt: NOW }])

    await publishArtifact({ ...KEY, destination: "claude" }, context)

    await expect(lastRequestOf(context)).resolves.toContain("pass `url` \"https://claude.ai/artifact/abc\"")
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
