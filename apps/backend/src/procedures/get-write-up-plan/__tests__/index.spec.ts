import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { getWriteUpPlan } from "@/procedures/get-write-up-plan"
import { createArtifactContext, KEY, WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

const INPUT = { ...KEY, sections: null }

describe("getWriteUpPlan", () => {
  it("chooses the sections the review preferences always write up, and the setup's agent", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)

    const plan = await getWriteUpPlan(INPUT, context)

    expect(plan).toMatchObject({
      kind: "plan",
      agentLabel: "Claude",
      configurationId: "standard",
      walkthroughOrder: "imports-bottom-up",
      totalLabel: "1 part to write and 3 waypoints to check",
    })
    expect(plan?.kind === "plan" ? plan.sections.filter((option) => option.isChosen).map((option) => option.section) : []).toStrictEqual(["context", "traceDiagram", "findings"])
  })

  it("counts the sections the dialog asks about", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)

    await expect(getWriteUpPlan({ ...KEY, sections: ["walkthrough"] }, context)).resolves.toMatchObject({ totalLabel: "3 parts to write" })
  })

  it("follows the walkthrough order of the review preferences", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    await context.setupStore.write({ ...(await context.setupStore.read()), reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, walkthroughOrder: "important-first" } })

    await expect(getWriteUpPlan(INPUT, context)).resolves.toMatchObject({ walkthroughOrder: "important-first" })
  })

  it("offers the write-up until the reviewer declines it or asks for one, or an agent already writes the review", async () => {
    const context = await createArtifactContext(WALKTHROUGH_ONLY_ARTIFACT)
    const scaffold = await context.reviewStore.readScaffold(KEY)
    const withRequest = async (request: object): Promise<void> => {
      if (scaffold !== null) await context.reviewStore.writeScaffold(KEY, { ...scaffold, request: { ...scaffold.request, ...request } })
    }

    await expect(getWriteUpPlan(INPUT, context)).resolves.toMatchObject({ isOffered: false })

    await withRequest({ isWriteUpDeclined: true })
    await expect(getWriteUpPlan(INPUT, context)).resolves.toMatchObject({ isOffered: true })

    await withRequest({ isWriteUpDeclined: undefined, writeUp: { sections: ["context"], walkthroughOrder: "imports-bottom-up" } })
    await expect(getWriteUpPlan(INPUT, context)).resolves.toMatchObject({ isOffered: true })

    await withRequest({ writeUp: undefined, writer: { kind: "external", agent: "codex" } })
    await expect(getWriteUpPlan(INPUT, context)).resolves.toMatchObject({ isOffered: true })
  })

  it("says so when no agent is set up", async () => {
    const context = { ...(await createArtifactContext()), setupStore: new InMemorySetupStore(EMPTY_SETUP) }

    await expect(getWriteUpPlan(INPUT, context)).resolves.toStrictEqual({
      kind: "no-agent",
      message: "No agent is set up, so no agent can write this review up. Set one up in the settings.",
    })
  })

  it("finds nothing for a review target with no review artifact", async () => {
    await expect(getWriteUpPlan(INPUT, await createArtifactContext(null))).resolves.toBeNull()
  })
})
