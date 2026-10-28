import { createReview } from "@/procedures/create-review"
import { getReview } from "@/procedures/get-review"
import {
  AGENT_SETUP,
  BRANCH_KEY,
  createCreationContext,
  DELIVERY_CHANGE,
  ESTIMATE_PATH,
  KEY,
  NOW,
  PAGE_INPUT,
  TESTED_CHANGE,
} from "@/procedures/get-review/__tests__/creation-harness"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"

const CREATE_INPUT = { ...KEY, baseBranch: "develop" }

describe("createReview", () => {
  it("builds the review artifact against the chosen branch, keeps that branch with it, and asks no agent to write it", async () => {
    const context = createCreationContext()

    await expect(createReview(CREATE_INPUT, context)).resolves.toStrictEqual({ kind: "created" })

    expect(context.openRepository.mock.lastCall?.[2]).toBe("develop")
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toMatchObject({
      baseBranch: "develop",
      artifact: { status: "complete", segments: [{ isContextRequired: false, walkthrough: { files: [{ waypoints: [{ isRequired: false }] }] } }] },
    })
    await expect(context.conversationEnvironment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      kind: "artifact",
      progress: null,
      segments: [{ walkthrough: { coverageLabel: "All 1 changed file", files: [{ path: ESTIMATE_PATH }] } }],
    })
  })

  it("refuses and writes nothing when the review already has a review artifact", async () => {
    const context = createCreationContext()
    await createReview(CREATE_INPUT, context)
    const first = await context.reviewStore.findArtifact(KEY)

    await expect(createReview({ ...KEY, baseBranch: "main" }, context)).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This review already has a review artifact.",
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBe(first)
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toMatchObject({ baseBranch: "develop" })
  })

  it("refuses a review target Flight Plan does not list", async () => {
    await expect(createReview({ ...CREATE_INPUT, targetId: "pr-1" }, createCreationContext())).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This review target is not listed in Flight Plan.",
    })
  })

  it("keeps the default prompt configuration with the stored review", async () => {
    const context = {
      ...createCreationContext({ setup: { ...AGENT_SETUP, defaultConfiguration: "terse" } }),
      configurationStore: new InMemoryConfigurationStore([{ ...shippedConfigurationOf("onboardee"), id: "terse", name: "Terse" }]),
    }

    await createReview(CREATE_INPUT, context)

    await expect(context.reviewStore.findRequest(KEY)).resolves.toStrictEqual({
      configurationId: "terse",
      preset: "onboardee",
      order: "foundations-first",
      customOrder: null,
      writer: { kind: "none" },
      requestedAt: NOW,
    })
  })

  it("falls back to the shipped default configuration when the chosen one is gone", async () => {
    const context = createCreationContext({ setup: { ...AGENT_SETUP, defaultConfiguration: "gone" } })

    await createReview(CREATE_INPUT, context)

    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({ configurationId: "standard", preset: "standard" })
  })

  it("leaves out the changed files the ignored paths of the review preferences match", async () => {
    const context = createCreationContext({ changes: [TESTED_CHANGE] })

    await createReview(CREATE_INPUT, context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      changedPaths: [ESTIMATE_PATH],
      segments: [{ changedPaths: [ESTIMATE_PATH], walkthrough: { files: [{ path: ESTIMATE_PATH }] } }],
    })
  })

  it("builds the author's own branch for the author to write", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, branchName: "spike/unlisted" }] })

    await expect(createReview({ ...BRANCH_KEY, baseBranch: "main" }, context)).resolves.toStrictEqual({ kind: "created" })

    await expect(context.reviewStore.findArtifact(BRANCH_KEY)).resolves.toMatchObject({ status: "authoring" })
    await expect(context.reviewStore.findRequest(BRANCH_KEY)).resolves.toMatchObject({ writer: { kind: "author", start: "scaffold" } })
  })

  it("says why and stores nothing when the branch is not in the repository folder", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, branchName: "feature/other" }] })

    await expect(createReview(CREATE_INPUT, context)).resolves.toStrictEqual({
      kind: "unavailable",
      message: "feature/gift-card-balance is not in this checkout. Fetch it and try again.",
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
  })

  it("says so when the repository cannot be opened", async () => {
    await expect(createReview(CREATE_INPUT, createCreationContext({ changes: [] }))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This folder is not a git repository.",
    })
  })

  it("says so when the change touches no files", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, diff: "" }] })

    await expect(createReview(CREATE_INPUT, context)).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This change touches no files, so there is nothing to review.",
    })
  })
})
