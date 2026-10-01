import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"

const NO_DIAGRAM_REQUEST = { levels: null, isShowingData: null, isShowingAssumed: null }

const requestFor = (repositoryName: string, targetId: string): GetReviewInput => ({
  repositoryName,
  targetId,
  filterKeys: null,
  isShowingReviewed: false,
  journey: NO_DIAGRAM_REQUEST,
  blast: NO_DIAGRAM_REQUEST,
})

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("getReview", () => {
  it("reports nothing for a repository or a review target Flight Plan does not list", async () => {
    await expect(getReview(requestFor("gone", "pr-412"), createContext())).resolves.toBeNull()
    await expect(getReview(requestFor("storefront", "pr-1"), createContext())).resolves.toBeNull()
  })

  it("offers to create a review for a review target without an artifact", async () => {
    await expect(getReview(requestFor("storefront", "pr-416"), createContext())).resolves.toMatchObject({
      kind: "missing",
      shell: { lineColor: "blue", notice: "Sample data. These repositories and pull requests are not real." },
    })
  })

  it("builds every segment of a segmented artifact with highlighted code and the pull request's comments", async () => {
    const page = await getReview(requestFor("storefront", "pr-412"), createContext())

    expect(page).toMatchObject({
      kind: "artifact",
      staleNotice: null,
      draftingNotice: null,
      rail: { groups: [{ label: "Stock check (1/2)" }, { label: "Checkout (2/2)" }] },
      segments: [
        {
          id: "stock-check",
          walkthrough: {
            coverageLabel: "4 of 5 changed files",
            files: [{ threads: [{ lineLabel: "13" }] }, { threads: [{ lineLabel: "15" }] }, {}, {}],
          },
        },
        { id: "checkout", walkthrough: { coverageLabel: "All 3 changed files" } },
      ],
      walkthroughControls: { stepping: { idleLabel: "12 waypoints" } },
      conversation: { entries: [{ author: { name: "teo" } }, { verdictLabel: "Approved" }, { verdictLabel: "Requested changes" }] },
    })
    const tokenKinds = page?.kind === "artifact"
      ? page.segments.flatMap((segment) =>
          segment.walkthrough.files.flatMap((file) =>
            file.rows.flatMap((row) => (row.kind === "lines" ? row.lines.flatMap((line) => line.tokens.map((token) => token.kind)) : []))))
      : []

    expect(tokenKinds).toContain("keyword")
    expect(tokenKinds).toContain("string")
  })

  it("marks a drafting artifact and a stale one", async () => {
    await expect(getReview(requestFor("storefront", "pr-409"), createContext())).resolves.toMatchObject({
      draftingNotice: { label: "Still being written" },
      staleNotice: null,
    })
    await expect(getReview(requestFor("storefront", "pr-405"), createContext())).resolves.toMatchObject({
      draftingNotice: null,
      staleNotice: { message: [{}, { kind: "code", text: "c81e220" }, {}, { kind: "code", text: "e7a94d3" }, {}] },
    })
  })

  it("shows a local branch with its repository's line colour and no forge links", async () => {
    await expect(getReview(requestFor("flight-plan", "branch-refactor-to-full-web"), createContext())).resolves.toMatchObject({
      kind: "artifact",
      shell: { lineColor: "green", header: { kind: "branch", branch: "refactor-to-full-web" } },
      segments: [{ walkthrough: { files: [{ forgeLink: null }, { forgeLink: null }] } }],
      reviewDraft: { isAvailable: false },
    })
  })
})
