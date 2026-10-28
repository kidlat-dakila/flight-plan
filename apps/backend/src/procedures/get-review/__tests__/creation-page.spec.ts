import { getReview } from "@/procedures/get-review"
import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AGENT_SETUP, BRANCH_KEY, createCreationContext, DELIVERY_CHANGE, ESTIMATE_PATH, KEY, PAGE_INPUT, TESTED_CHANGE } from "./creation-harness"

const MINUS = "−"

describe("getReview of a target with no review artifact", () => {
  it("opens the creation page against the repository's base branch, and saves nothing", async () => {
    const context = createCreationContext()

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      kind: "creation",
      isOwn: false,
      shell: { header: { kind: "pull-request", title: "Show the gift card balance at checkout" } },
      panels: { explorer: { label: "Changed files" } },
      fileExplorer: { summary: ["1 file"], rows: [{ kind: "folder" }, { kind: "file", id: "src/delivery/estimate.ts", noteLabel: null }] },
      creation: {
        heading: "Create a new Flight Plan Review Artifact for “Show the gift card balance at checkout”",
        author: { name: "lena" },
        introduction: [
          { text: "lena wants to merge " },
          { text: "feature/gift-card-balance", kind: "code" },
          { text: " into " },
          { text: "main", kind: "code" },
          { text: " in pull request #416." },
        ],
        baseBranch: { branchName: "main", noteLabel: "Repository default" },
        facts: [
          { label: "Files", value: "1" },
          { label: "Lines added", value: "+2" },
          { label: "Lines removed", value: `${MINUS}1` },
          { label: "Added", value: "None" },
          { label: "Modified", value: "1 file" },
          { label: "Deleted", value: "None" },
        ],
        areas: { rows: [{ name: "src/delivery", isPath: true }] },
        problem: null,
      },
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
    await expect(context.reviewStore.readScaffold(KEY)).resolves.toBeNull()
    await expect(context.conversationEnvironment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
  })

  it("compares a pull request with its base branch on the forge by default", async () => {
    const context = createCreationContext({ pullRequestBase: "develop", repositoryBaseBranch: "main" })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      creation: {
        introduction: [{}, {}, {}, { text: "develop" }, {}],
        baseBranch: { branchName: "develop", noteLabel: "Pull request base" },
      },
    })
  })

  it("compares a pull request with the repository's base branch when the forge gives none", async () => {
    const context = createCreationContext({ repositoryBaseBranch: "trunk" })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      creation: { baseBranch: { branchName: "trunk", noteLabel: "Repository default" } },
    })
  })

  it("compares a branch with the repository's base branch", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, branchName: "spike/unlisted" }], repositoryBaseBranch: "develop" })

    await expect(getReview({ ...PAGE_INPUT, ...BRANCH_KEY }, context)).resolves.toMatchObject({
      kind: "creation",
      isOwn: true,
      creation: {
        author: null,
        introduction: [{ text: "Changes on " }, { text: "spike/unlisted" }, { text: " that are not on " }, { text: "develop" }, { text: "." }],
        baseBranch: { branchName: "develop", noteLabel: "Repository default" },
      },
    })
  })

  it("compares with the branch the page asks for", async () => {
    const context = createCreationContext({ pullRequestBase: "main" })

    await expect(getReview({ ...PAGE_INPUT, baseBranch: "develop" }, context)).resolves.toMatchObject({
      creation: { baseBranch: { branchName: "develop", noteLabel: null }, problem: null },
    })
  })

  it("says so when the chosen branch is not in the checkout", async () => {
    const context = createCreationContext()

    await expect(getReview({ ...PAGE_INPUT, baseBranch: "release/gone" }, context)).resolves.toMatchObject({
      kind: "creation",
      creation: {
        baseBranch: { branchName: "release/gone", noteLabel: null },
        problem: "The branch “release/gone” is not in this checkout. Fetch it or choose another branch.",
        facts: [],
        areas: { rows: [] },
      },
      fileExplorer: { rows: [] },
    })
  })

  it("says so when the branch has no commits after the chosen branch", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, revision: { headCommit: "1111111", baseCommit: "1111111" } }] })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      creation: { problem: "This branch has no commits after “main”.", facts: [] },
    })
  })

  it("says so when nothing changed against the chosen branch", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, diff: "" }] })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      creation: { problem: "Nothing changed against “main”, so there is nothing to review.", facts: [] },
    })
  })

  it("leaves out the files the review preferences ignore", async () => {
    const setup = { ...AGENT_SETUP, reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, ignoredPaths: ["**/*.test.ts"] } }
    const context = createCreationContext({ changes: [TESTED_CHANGE], setup })

    const page = await getReview(PAGE_INPUT, context)

    expect(page).toMatchObject({ kind: "creation", creation: { problem: null } })
    expect(page?.kind === "creation" ? page.creation.facts.slice(0, 3).map((fact) => fact.value) : []).toStrictEqual(["1", "+2", "−1"])
    expect(page?.kind === "creation" ? page.fileExplorer.rows.flatMap((row) => (row.kind === "file" ? [row.id] : [])) : []).toStrictEqual([ESTIMATE_PATH])
  })

  it("says so when the review preferences ignore every changed file", async () => {
    const setup = { ...AGENT_SETUP, reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, ignoredPaths: ["src/**"] } }
    const context = createCreationContext({ setup })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      creation: { problem: "Every changed file is ignored by your review preferences, so there is nothing to review.", facts: [] },
    })
  })

  it("shows the missing page when the branch of the review is not in the checkout", async () => {
    const context = createCreationContext({ changes: [{ ...DELIVERY_CHANGE, branchName: "feature/other" }] })

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      kind: "missing",
      heading: "Flight Plan could not build this review",
      message: "feature/gift-card-balance is not in this checkout. Fetch it and try again.",
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
  })
})
