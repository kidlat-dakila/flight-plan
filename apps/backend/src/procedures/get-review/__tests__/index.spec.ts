import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"

const requestFor = (repositoryName: string, targetId: string): GetReviewInput => ({
  repositoryName,
  targetId,
  filterKeysBySegment: {},
  reviewedSegmentIds: [],
})

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

type ReviewPage = Awaited<ReturnType<typeof getReview>>

const waypointCountOf = (page: ReviewPage): number =>
  page?.kind === "artifact"
    ? page.segments.flatMap((segment) => segment.walkthrough.files.flatMap((file) => file.rows.filter((row) => row.kind === "waypoint"))).length
    : 0

describe("getReview", () => {
  it("reports nothing for a repository or a review target Flight Plan does not list", async () => {
    await expect(getReview(requestFor("gone", "pr-412"), createContext())).resolves.toBeNull()
    await expect(getReview(requestFor("storefront", "pr-1"), createContext())).resolves.toBeNull()
  })

  it("offers to create a review for a review target without an artifact", async () => {
    await expect(getReview(requestFor("storefront", "pr-416"), createContext())).resolves.toMatchObject({
      kind: "missing",
      shell: { lineColor: "blue", notice: "Sample data. These repositories and pull requests are not real." },
      changedFiles: [{ text: "10 changed files" }, { text: "4 TypeScript" }, { text: "2 TSX" }, {}, {}, {}, {}],
      form: { writer: { selectedKey: "manual", agents: [] } },
    })
  })

  it("leaves the sample data notice out for a review target the review store holds no sample of", async () => {
    const context = { ...createContext(), reviewStore: new InMemoryReviewStore([]) }

    await expect(getReview(requestFor("storefront", "pr-416"), context)).resolves.toMatchObject({
      kind: "missing",
      shell: { notice: null },
      changedFiles: [{ text: "The changed files are not read yet" }],
    })
  })

  it("reads the head commit and the changed files of a review target the review store holds no sample of", async () => {
    const changeReader = new InMemoryChangeReader([
      {
        repositoryPath: "/Users/dev/projects/storefront",
        branchName: "feature/gift-card-balance",
        revision: { headCommit: "1111111", baseCommit: "0000000" },
        diff: "",
        changedPaths: ["src/a.ts", "src/b.ts", "docs/c.md"],
        texts: {},
      },
    ])
    const context = { ...createContext(), reviewStore: new InMemoryReviewStore([]), changeReader }

    await expect(getReview(requestFor("storefront", "pr-416"), context)).resolves.toMatchObject({
      kind: "missing",
      shell: { notice: null },
      changedFiles: [{ text: "3 changed files" }, { text: "2 TypeScript" }, { text: "1 Markdown" }],
    })
  })

  it("builds every segment of a segmented artifact with highlighted code and the pull request's comments", async () => {
    const page = await getReview(requestFor("storefront", "pr-412"), createContext())

    expect(page).toMatchObject({
      kind: "artifact",
      staleNotice: null,
      progress: null,
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
      conversation: { entries: [{ author: { name: "teo" } }, { verdictLabel: "Approved" }, { verdictLabel: "Requested changes" }] },
    })
    expect(waypointCountOf(page)).toBe(12)
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
      progress: { label: "Still being written" },
      staleNotice: null,
    })
    await expect(getReview(requestFor("storefront", "pr-405"), createContext())).resolves.toMatchObject({
      progress: null,
      staleNotice: { message: [{}, { kind: "code", text: "c81e220" }, {}, { kind: "code", text: "e7a94d3" }, {}] },
    })
  })

  it("shows a local branch as the viewer's own, with its repository's line colour and no forge links", async () => {
    await expect(getReview(requestFor("flight-plan", "branch-refactor-to-full-web"), createContext())).resolves.toMatchObject({
      kind: "artifact",
      isOwn: true,
      shell: { lineColor: "green", authorLabel: "Your Flight Plan", header: { kind: "branch", branch: "refactor-to-full-web" } },
      segments: [{ walkthrough: { files: [{ forgeLink: null }, { forgeLink: null }] } }],
      reviewDraft: null,
    })
  })

  it("shows a pull request as someone else's when the signed-in user is not known", async () => {
    await expect(getReview(requestFor("storefront", "pr-412"), createContext())).resolves.toMatchObject({
      isOwn: false,
      shell: { authorLabel: null },
    })
    await expect(getReview(requestFor("storefront", "pr-416"), createContext())).resolves.toMatchObject({
      kind: "missing",
      isOwn: false,
    })
  })
})
