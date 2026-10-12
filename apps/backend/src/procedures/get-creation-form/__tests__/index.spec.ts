import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { getCreationForm } from "@/procedures/get-creation-form"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const SPIKE_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "spike/returns",
  revision: { headCommit: "1111111", baseCommit: "0000000" },
  diff: "",
  changedPaths: [],
  texts: {},
}

const createContext = (overrides: Partial<ProcedureContext> = {}): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader([SPIKE_CHANGE]),
  now: () => NOW,
  ...overrides,
})

describe("getCreationForm", () => {
  it("offers the three ways a Flight Plan starts, with the agent draft chosen", async () => {
    const form = await getCreationForm({ repositoryName: "storefront", targetId: null }, createContext())

    expect(form).toMatchObject({
      title: "Create a Flight Plan",
      description: "For a pull request or a branch of storefront.",
      target: { label: "Pull request or branch", selected: null },
      initialization: {
        selectedKind: "draft",
        options: [
          { kind: "draft", label: "Let an agent draft it", authorWriting: null },
          { kind: "scaffold", label: "Generate review Flight Plan artifact only", authorWriting: { start: "scaffold", submitLabel: "Start" } },
          { kind: "empty", authorWriting: { start: "empty", submitLabel: "Start" } },
        ],
      },
      form: {
        configuration: { heading: "Configuration" },
        writer: { heading: "Agent", manual: { submitLabel: "Start" } },
      },
      pendingLabel: "Starting…",
    })
  })

  it("selects the review target the form was opened for, listed or not", async () => {
    const context = createContext()

    await expect(getCreationForm({ repositoryName: "storefront", targetId: "pr-416" }, context)).resolves.toMatchObject({
      target: { selected: { id: "pr-416", label: "Show the gift card balance at checkout", isDisabled: false } },
    })
    await expect(getCreationForm({ repositoryName: "storefront", targetId: "branch-spike/returns" }, context)).resolves.toMatchObject({
      target: { selected: { id: "branch-spike/returns", label: "spike/returns" } },
    })
  })

  it("selects nothing for a review target that is unknown or already has a Flight Plan", async () => {
    const sampleReviews = createContext({ reviewStore: createMockProcedureContext(NOW).reviewStore })

    await expect(getCreationForm({ repositoryName: "storefront", targetId: "pr-1" }, createContext())).resolves.toMatchObject({
      target: { selected: null },
    })
    await expect(getCreationForm({ repositoryName: "storefront", targetId: "pr-412" }, sampleReviews)).resolves.toMatchObject({
      target: { selected: null },
    })
  })

  it("reports nothing for a repository that is not listed", async () => {
    await expect(getCreationForm({ repositoryName: "gone", targetId: null }, createContext())).resolves.toBeNull()
  })
})
