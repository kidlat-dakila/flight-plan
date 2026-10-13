import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"
import {
  artifactPage as reviewerArtifactPage,
  ownArtifactPage as artifactPage,
  ownBlastPage as blastPage,
  ownMissingPage as missingPage,
  ownTwoFilePage as twoFilePage,
  unassignedFiles,
} from "./review-page-fixture"

const CREATE_PATH = "/pr-reviews/storefront/create"

const giftCardOption = {
  id: "pr-416",
  label: "Show the gift card balance at checkout",
  detail: "#416 • feature/gift-card-balance",
  stateLabel: null,
  isDisabled: false,
}

const returnsBranchOption = {
  id: "branch-spike/returns",
  label: "spike/returns",
  detail: "Branch • 1 hour ago",
  stateLabel: null,
  isDisabled: false,
}

const creationFormOf = (selected: typeof giftCardOption | null): ProcedureReply => ({
  data: {
    title: "Create a Flight Plan",
    description: "For a pull request or a branch of storefront.",
    target: {
      label: "Pull request or branch",
      hint: "Your open pull requests come first.",
      placeholder: "Search by title, number or branch",
      selected,
    },
    initialization: {
      legend: "How it starts",
      selectedKind: "draft",
      options: [
        { kind: "draft", label: "Let an agent draft it", description: "An agent writes every part.", authorWriting: null },
        {
          kind: "scaffold",
          label: "Generate review Flight Plan artifact only",
          description: "No agent writes it.",
          authorWriting: { start: "scaffold", submitLabel: "Start" },
        },
        {
          kind: "empty",
          label: "Start empty",
          description: "Nothing is generated.",
          authorWriting: { start: "empty", submitLabel: "Start" },
        },
      ],
    },
    form: missingPage.form,
    pendingLabel: "Starting…",
  },
})

const someTargets = { data: { options: [giftCardOption, returnsBranchOption], message: null } }

const TARGET_OPTIONS = [giftCardOption, returnsBranchOption]

const creationFormFor = (input: unknown): ProcedureReply => {
  const targetId = typeof input === "object" && input !== null && "targetId" in input ? input.targetId : null
  return creationFormOf(TARGET_OPTIONS.find((option) => option.id === targetId) ?? null)
}

const creationHandlers = (): ProcedureHandlers => ({
  "review.creationForm": creationFormFor,
  "review.searchTargets": () => someTargets,
  "review.get": () => ({ data: missingPage }),
})

const toFileLine = (text: string, index: number) => ({
  numberLabel: String(index + 1),
  mark: "context",
  isFocused: false,
  tokens: [{ text, kind: "plain" }],
  marks: [],
  references: [],
})

const AUTHOR_PATH = "/pr-reviews/storefront/pr-416"
const TWELVE_LINE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const twelveLines: ProcedureReply = {
  data: {
    path: "src/price.ts",
    lines: TWELVE_LINE_NUMBERS.map((lineNumber) => `const line${String(lineNumber)} = ${String(lineNumber)}`).map(toFileLine),
  },
}

const renderCreation = (handlers: ProcedureHandlers, path = CREATE_PATH) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

const EMPTY_RECT = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }

describe("the create Flight Plan page", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
    Reflect.defineProperty(Range.prototype, "getClientRects", { value: () => [], configurable: true })
    Reflect.defineProperty(Range.prototype, "getBoundingClientRect", { value: () => EMPTY_RECT, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("asks which pull request or branch and how the Flight Plan starts", async () => {
    const getCreationForm = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue(creationFormOf(null))
    renderCreation({ ...creationHandlers(), "review.creationForm": getCreationForm })

    expect(await screen.findByRole("heading", { name: "Create a Flight Plan", level: 1 })).toBeTruthy()
    expect(getCreationForm).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: null })
    expect(screen.getByRole("radio", { name: /Let an agent draft it/ })).toHaveProperty("checked", true)
    expect(screen.getByRole("radio", { name: /Generate review Flight Plan artifact only/ })).toHaveProperty("checked", false)
    expect(screen.getByRole("radio", { name: /Start empty/ })).toHaveProperty("checked", false)
    expect(screen.getByRole("heading", { name: "Configuration" })).toBeTruthy()

    fireEvent.focus(screen.getByRole("combobox", { name: "Pull request or branch" }))

    expect(await screen.findByRole("option", { name: /Show the gift card balance at checkout/ })).toBeTruthy()
    expect(screen.getByRole("option", { name: /spike\/returns/ })).toBeTruthy()
  })

  it("opens with the review target named in the address already chosen", async () => {
    const getCreationForm = vi.fn<(input: unknown) => ProcedureReply>(creationFormFor)
    renderCreation({ ...creationHandlers(), "review.creationForm": getCreationForm }, "/pr-reviews/storefront/pr-416")

    expect(await screen.findByRole("combobox", { name: "Pull request or branch" })).toHaveProperty(
      "value",
      "Show the gift card balance at checkout",
    )
    expect(getCreationForm).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-416" })
    expect(within(screen.getByRole("banner")).getByText("Your Flight Plan")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Create a Flight Plan" })).toBeNull()
  })

  it("moves to the address of the review target that is chosen", async () => {
    const getCreationForm = vi.fn<(input: unknown) => ProcedureReply>(creationFormFor)
    renderCreation({ ...creationHandlers(), "review.creationForm": getCreationForm })

    fireEvent.focus(await screen.findByRole("combobox", { name: "Pull request or branch" }))
    fireEvent.click(await screen.findByRole("option", { name: /spike\/returns/ }))

    await waitFor(() => {
      expect(getCreationForm).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "branch-spike/returns" })
    })
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Pull request or branch" })).toHaveProperty("value", "spike/returns")
    })
  })

  it("stays on the page after Start and shows the Flight Plan that was made", async () => {
    const requestReview = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "requested", prompt: null, message: "Flight Plan created" } })
    const getReview = vi.fn<(input: unknown) => ProcedureReply>(() => ({
      data: requestReview.mock.calls.length === 0 ? missingPage : artifactPage,
    }))
    renderCreation(
      { ...creationHandlers(), "review.request": requestReview, "review.get": getReview },
      "/pr-reviews/storefront/branch-spike%2Freturns",
    )

    fireEvent.click(await screen.findByRole("radio", { name: /Generate review Flight Plan artifact only/ }))

    expect(screen.queryByRole("heading", { name: "Configuration" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Start" }))

    await waitFor(() => {
      expect(requestReview).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "branch-spike/returns",
        preset: "standard",
        order: "foundations-first",
        customOrder: "",
        writer: { kind: "author", start: "scaffold" },
      })
    })
    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Create a Flight Plan" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Could not open this review" })).toBeNull()
  })

  it("shows the Flight Plan, not the form, for a review target that already has one", async () => {
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }) }, "/pr-reviews/storefront/pr-416")

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Pull request or branch" })).toBeNull()
  })

  it("heads the author's page with the review target and a label, without the reviewer's status and actions", async () => {
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }) }, "/pr-reviews/storefront/pr-416")

    const band = await screen.findByRole("banner")

    expect(await within(band).findByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(within(band).getByText("Your Flight Plan")).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Chat" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "More actions" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Share" })).toBeTruthy()
    expect(within(band).queryByRole("button", { name: "Mark as complete" })).toBeNull()
    expect(within(band).queryByRole("button", { name: "Submit review" })).toBeNull()
    expect(within(band).queryByRole("list", { name: "Reviewers" })).toBeNull()
    expect(within(band).queryByText("Stale")).toBeNull()
  })

  it("marks the author's Flight Plan as complete, and offers no sharing before that", async () => {
    const markComplete = vi.fn(() => ({ data: { message: "Flight Plan marked as complete", targetId: "pr-416" } }))
    const unfinished = { ...artifactPage, completeAction: { label: "Mark as complete", pullRequestChoice: null }, sharing: null }
    renderCreation({
      ...creationHandlers(),
      "review.get": () => ({ data: markComplete.mock.calls.length === 0 ? unfinished : artifactPage }),
      "review.markComplete": markComplete,
    }, AUTHOR_PATH)

    const band = await screen.findByRole("banner")

    expect(within(band).queryByRole("button", { name: "Share" })).toBeNull()

    fireEvent.click(await within(band).findByRole("button", { name: "Mark as complete" }))

    expect(await within(band).findByRole("button", { name: "Share" })).toBeTruthy()
    expect(within(band).queryByRole("button", { name: "Mark as complete" })).toBeNull()
    expect(markComplete).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-416", pullRequestTargetId: null })
  })

  it("asks which pull request a branch's Flight Plan belongs to, and moves to that pull request", async () => {
    const markComplete = vi.fn<(input: unknown) => ProcedureReply>(() => ({
      data: { message: "Flight Plan marked as complete and moved to pull request #416", targetId: "pr-416" },
    }))
    const pullRequestChoice = {
      title: "Choose the pull request",
      description: "Choose your open pull request it belongs to.",
      emptyMessage: null,
      options: [giftCardOption, { ...giftCardOption, id: "pr-420", label: "Round the totals" }],
      selectedId: null,
      confirmLabel: "Mark as complete",
      skipLabel: "Complete without a pull request",
      cancelLabel: "Cancel",
    }
    const unfinished = { ...artifactPage, completeAction: { label: "Mark as complete", pullRequestChoice }, sharing: null }
    const getReview = vi.fn<(input: unknown) => ProcedureReply>(() => ({
      data: markComplete.mock.calls.length === 0 ? unfinished : artifactPage,
    }))
    renderCreation(
      { ...creationHandlers(), "review.get": getReview, "review.markComplete": markComplete },
      "/pr-reviews/storefront/branch-spike%2Freturns",
    )

    fireEvent.click(await within(await screen.findByRole("banner")).findByRole("button", { name: "Mark as complete" }))
    const dialog = await screen.findByRole("dialog", { name: "Choose the pull request" })

    expect(within(dialog).getByRole("button", { name: "Mark as complete" })).toHaveProperty("disabled", true)
    expect(within(dialog).getByRole("button", { name: "Complete without a pull request" })).toHaveProperty("disabled", false)

    fireEvent.click(within(dialog).getByRole("radio", { name: /Show the gift card balance at checkout/ }))
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark as complete" }))

    await waitFor(() => {
      expect(markComplete).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "branch-spike/returns",
        pullRequestTargetId: "pr-416",
      })
    })
    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ targetId: "pr-416" }))
    })
    expect(screen.queryByRole("dialog", { name: "Choose the pull request" })).toBeNull()
  })

  it("completes a branch's Flight Plan where it is when no pull request is chosen", async () => {
    const markComplete = vi.fn<(input: unknown) => ProcedureReply>(() => ({
      data: { message: "Flight Plan marked as complete", targetId: "branch-spike/returns" },
    }))
    const pullRequestChoice = {
      title: "Choose the pull request",
      description: "Choose your open pull request it belongs to.",
      emptyMessage: "You have no open pull request without a Flight Plan.",
      options: [],
      selectedId: null,
      confirmLabel: "Mark as complete",
      skipLabel: "Complete without a pull request",
      cancelLabel: "Cancel",
    }
    const unfinished = { ...artifactPage, completeAction: { label: "Mark as complete", pullRequestChoice }, sharing: null }
    renderCreation(
      {
        ...creationHandlers(),
        "review.get": () => ({ data: markComplete.mock.calls.length === 0 ? unfinished : artifactPage }),
        "review.markComplete": markComplete,
      },
      "/pr-reviews/storefront/branch-spike%2Freturns",
    )

    fireEvent.click(await within(await screen.findByRole("banner")).findByRole("button", { name: "Mark as complete" }))
    const dialog = await screen.findByRole("dialog", { name: "Choose the pull request" })

    expect(within(dialog).getByText("You have no open pull request without a Flight Plan.")).toBeTruthy()
    expect(within(dialog).queryByRole("button", { name: "Mark as complete" })).toBeNull()

    fireEvent.click(within(dialog).getByRole("button", { name: "Complete without a pull request" }))

    await waitFor(() => {
      expect(markComplete).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "branch-spike/returns",
        pullRequestTargetId: null,
      })
    })
    expect(await within(screen.getByRole("banner")).findByRole("button", { name: "Share" })).toBeTruthy()
  })

  it("shows the status, the reviewers and the review beside the editing once the author's Flight Plan is uploaded", async () => {
    const uploaded = { ...artifactPage, shell: reviewerArtifactPage.shell, reviewDraft: reviewerArtifactPage.reviewDraft }
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: uploaded }) }, AUTHOR_PATH)

    const band = await screen.findByRole("banner")

    expect(await within(band).findByRole("list", { name: "Reviewers" })).toBeTruthy()
    expect(within(band).getByText("Awaiting review")).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Submit review" })).toBeTruthy()
    expect(within(band).queryByText("Your Flight Plan")).toBeNull()
    expect((await screen.findAllByRole("button", { name: "Edit segment" })).length).toBeGreaterThan(0)
  })

  it("offers Delete in the author's Options Menu, without the rebuild actions", async () => {
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }) }, "/pr-reviews/storefront/pr-416")

    fireEvent.click(within(await screen.findByRole("banner")).getByRole("button", { name: "More actions" }))

    expect(await screen.findByRole("menuitem", { name: "Delete" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Update the Flight Plan" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Regenerate from scratch" })).toBeNull()
  })

  it("stays on the author's page after Delete, with the review target still chosen", async () => {
    const deleteReview = vi.fn(() => ({ data: { message: "Flight Plan deleted" } }))
    const hasFlightPlan = (): boolean => deleteReview.mock.calls.length === 0
    renderCreation({
      ...creationHandlers(),
      "review.creationForm": (input) => (hasFlightPlan() ? creationFormOf(null) : creationFormFor(input)),
      "review.get": () => ({ data: hasFlightPlan() ? artifactPage : missingPage }),
      "review.delete": deleteReview,
    }, "/pr-reviews/storefront/pr-416")

    fireEvent.click(within(await screen.findByRole("banner")).getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    const target = await screen.findByRole("combobox", { name: "Pull request or branch" })
    await waitFor(() => {
      expect(target).toHaveProperty("value", "Show the gift card balance at checkout")
    })
    expect(screen.queryByRole("heading", { name: "No Flight Plan Review yet" })).toBeNull()
    expect(deleteReview).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-416" })
  })

  it("shows why a Flight Plan could not be created, under the field it concerns", async () => {
    const rejection = { kind: "rejected", field: "target", message: "Choose a pull request or a branch." }
    renderCreation({ ...creationHandlers(), "review.request": () => ({ data: rejection }) })

    fireEvent.click(await screen.findByRole("radio", { name: /Start empty/ }))
    fireEvent.click(screen.getByRole("button", { name: "Start" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Choose a pull request or a branch.")
    expect(screen.getByRole("combobox", { name: "Pull request or branch" }).getAttribute("aria-invalid")).toBe("true")
  })

  it("asks for notification permission when an agent drafts the Flight Plan, and not when the author writes it", async () => {
    const requestPermission = vi.fn<() => Promise<NotificationPermission>>().mockResolvedValue("granted")
    vi.stubGlobal("Notification", { permission: "default", requestPermission })
    const rejection = { kind: "rejected", field: "target", message: "Choose a pull request or a branch." }
    const requestReview = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: rejection })
    renderCreation({ ...creationHandlers(), "review.request": requestReview })

    fireEvent.click(await screen.findByRole("radio", { name: /Start empty/ }))
    fireEvent.click(screen.getByRole("button", { name: "Start" }))

    await waitFor(() => {
      expect(requestReview).toHaveBeenCalledTimes(1)
    })
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("radio", { name: /Let an agent draft it/ }))
    fireEvent.click(screen.getByRole("button", { name: "Start the review" }))

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1)
    })
  })

  it("switches the context from reading to writing with Edit, and saves what was written as Markdown", async () => {
    const editContext = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editContext": editContext },
      "/pr-reviews/storefront/pr-416",
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(stock).queryByRole("textbox", { name: "Context" })).toBeNull()

    fireEvent.click(within(stock).getByRole("button", { name: "Edit" }))
    const editor = await within(stock).findByRole("textbox", { name: "Context" })

    expect(editor.textContent).toBe("Why stock matters.")
    expect(within(stock).queryByRole("button", { name: "Edit" })).toBeNull()

    fireEvent.click(within(stock).getByRole("button", { name: "Numbered list" }))
    fireEvent.click(within(stock).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(editContext).toHaveBeenCalledWith(
        expect.objectContaining({ repositoryName: "storefront", targetId: "pr-416", segmentId: "stock" }),
      )
    })
    expect(JSON.stringify(editContext.mock.calls.at(-1))).toContain("1. Why stock matters.")
    await waitFor(() => {
      expect(within(stock).queryByRole("textbox", { name: "Context" })).toBeNull()
    })
    expect(within(stock).getByRole("button", { name: "Edit" })).toBeTruthy()
  })

  it("edits the impact of a file on the Blast Diagram, and saves the impact type with the reason as Markdown", async () => {
    const editBlast = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: blastPage }), "review.editBlast": editBlast },
      "/pr-reviews/storefront/pr-416",
    )

    fireEvent.click(await screen.findByRole("button", { name: "report.ts" }))
    const panel = await screen.findByRole("region", { name: "src/report.ts" })
    fireEvent.click(within(panel).getByRole("button", { name: "Edit impact" }))
    fireEvent.change(await within(panel).findByRole("combobox", { name: "Impact" }), { target: { value: "unaffected" } })
    fireEvent.click(within(panel).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(editBlast).toHaveBeenCalledWith(
        expect.objectContaining({ repositoryName: "storefront", targetId: "pr-416", path: "src/report.ts", impactType: "unaffected", impactReason: "" }),
      )
    })
    await waitFor(() => {
      expect(within(panel).queryByRole("combobox", { name: "Impact" })).toBeNull()
    })
    expect(within(panel).getByRole("button", { name: "Edit impact" })).toBeTruthy()
  })

  it("goes back to reading the context as it was when writing is cancelled, and shows why a save was refused", async () => {
    const rejection = { kind: "rejected", message: "Write the context. A segment cannot be without one." }
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editContext": () => ({ data: rejection }) },
      "/pr-reviews/storefront/pr-416",
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    fireEvent.click(within(stock).getByRole("button", { name: "Edit" }))
    fireEvent.click(await within(stock).findByRole("button", { name: "Save" }))

    expect((await within(stock).findByRole("alert")).textContent).toBe("Write the context. A segment cannot be without one.")

    fireEvent.click(within(stock).getByRole("button", { name: "Cancel" }))

    expect(within(stock).queryByRole("textbox", { name: "Context" })).toBeNull()
    expect(within(stock).getByText("Why stock matters.")).toBeTruthy()
  })

  it("reads a context that is not written as not written, and writes it after Edit", async () => {
    const unwritten = {
      ...artifactPage,
      segments: artifactPage.segments.map((segment) => ({
        ...segment,
        context: { ...segment.context, context: [], markdown: "", isDraft: true },
      })),
    }
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: unwritten }) }, "/pr-reviews/storefront/pr-416")

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(stock).getByText("Not written yet.")).toBeTruthy()
    expect(within(stock).queryByRole("textbox", { name: "Context" })).toBeNull()

    fireEvent.click(within(stock).getByRole("button", { name: "Edit" }))

    expect(await within(stock).findByRole("textbox", { name: "Context" })).toBeTruthy()
    expect(within(stock).queryByText("Not written yet.")).toBeNull()
  })

  it("links code from the context: picks a file, selects its lines, names the link and saves it", async () => {
    const editContext = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    const searchFiles = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ path: "src/stock/holds.ts", stateLabel: "Changed" }], message: null },
    })
    const fileCode = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { path: "src/stock/holds.ts", lines: ["const first = 1", "const second = 2", "const third = 3"].map(toFileLine) },
    })
    renderCreation(
      {
        ...creationHandlers(),
        "review.get": () => ({ data: artifactPage }),
        "review.editContext": editContext,
        "review.searchFiles": searchFiles,
        "review.fileCode": fileCode,
      },
      "/pr-reviews/storefront/pr-416",
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    fireEvent.click(within(stock).getByRole("button", { name: "Edit" }))
    fireEvent.click(await within(stock).findByRole("button", { name: "Code link" }))
    const dialog = await screen.findByRole("dialog", { name: "Link to code" })

    expect(within(dialog).getByRole("button", { name: "Insert" }).hasAttribute("disabled")).toBe(true)

    fireEvent.focus(within(dialog).getByRole("combobox", { name: "File" }))
    fireEvent.click(await within(dialog).findByRole("option", { name: /holds\.ts/ }))
    fireEvent.click(await within(dialog).findByRole("button", { name: "Select line 2" }))
    fireEvent.click(within(dialog).getByRole("button", { name: "Select line 3" }), { shiftKey: true })
    fireEvent.click(within(dialog).getByRole("button", { name: "Link these lines" }))
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Label" }), { target: { value: "the active holds" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Link to code" })).toBeNull()
    })
    expect(searchFiles).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryName: "storefront", targetId: "pr-416", scope: "flight-plan" }),
    )
    expect(fileCode).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-416", path: "src/stock/holds.ts" })

    fireEvent.click(within(stock).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(JSON.stringify(editContext.mock.calls.at(-1))).toContain("[the active holds](code:src/stock/holds.ts#L2-3)")
    })
  })

  it("edits the label and the files of a segment, and saves both", async () => {
    const editSegments = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    const searchFiles = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ path: "src/rates.ts", stateLabel: "Changed" }], message: null },
    })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editSegments": editSegments, "review.searchFiles": searchFiles },
      "/pr-reviews/storefront/pr-416",
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    fireEvent.click(within(stock).getByRole("button", { name: "Edit segment" }))
    const form = within(stock).getByRole("form", { name: "Segment 1: Stock check" })

    expect(within(form).getByRole("textbox", { name: "Label" })).toHaveProperty("value", "Stock check")
    expect(within(form).getByRole("list", { name: "Files" }).textContent).toBe("src/stock.ts")

    fireEvent.change(within(form).getByRole("textbox", { name: "Label" }), { target: { value: "Held stock" } })
    fireEvent.click(within(form).getByRole("button", { name: "Remove src/stock.ts" }))
    fireEvent.focus(within(form).getByRole("combobox", { name: "Add a file" }))
    fireEvent.click(await within(form).findByRole("option", { name: /rates\.ts/ }))
    fireEvent.click(within(form).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(editSegments).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-416",
        edit: { kind: "change", segmentId: "stock", title: "Held stock", paths: ["src/rates.ts"] },
      })
    })
    expect(searchFiles).toHaveBeenCalledWith(expect.objectContaining({ scope: "changed" }))
    await waitFor(() => {
      expect(within(stock).queryByRole("form")).toBeNull()
    })
  })

  it("opens the form of a segment from the edit icon beside it on the rail", async () => {
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.searchFiles": () => ({ data: { options: [], message: null } }) },
      "/pr-reviews/storefront/pr-416",
    )

    const rail = await screen.findByRole("navigation", { name: "Review sections" })
    fireEvent.click(within(rail).getByRole("button", { name: "Edit Checkout (2/2)" }))

    expect(within(screen.getByRole("region", { name: "Segment 2: Checkout" })).getByRole("form", { name: "Segment 2: Checkout" })).toBeTruthy()
    expect(within(screen.getByRole("region", { name: "Segment 1: Stock check" })).queryByRole("form")).toBeNull()
  })

  it("shows why a segment was not saved, in its form", async () => {
    const rejection = { kind: "rejected", message: "Write a label. A segment cannot be without one." }
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editSegments": () => ({ data: rejection }), "review.searchFiles": () => ({ data: { options: [], message: null } }) },
      "/pr-reviews/storefront/pr-416",
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    fireEvent.click(within(stock).getByRole("button", { name: "Edit segment" }))
    fireEvent.click(within(stock).getByRole("button", { name: "Save" }))

    expect((await within(stock).findByRole("alert")).textContent).toBe("Write a label. A segment cannot be without one.")

    fireEvent.click(within(stock).getByRole("button", { name: "Close" }))

    expect(within(stock).queryByRole("form")).toBeNull()
    expect(within(stock).getByRole("heading", { name: "Segment 1: Stock check" })).toBeTruthy()
  })

  it("arranges the segments from the rail, with no move past the first or the last place, and deletes a segment from its form", async () => {
    const editSegments = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editSegments": editSegments },
      "/pr-reviews/storefront/pr-416",
    )

    const rail = await screen.findByRole("navigation", { name: "Review sections" })
    const checkout = screen.getByRole("region", { name: "Segment 2: Checkout" })
    fireEvent.click(within(rail).getByRole("button", { name: "Arrange" }))
    const dialog = await screen.findByRole("dialog", { name: "Arrange segments" })

    expect(within(dialog).getByRole("button", { name: "Move Segment 1: Stock check up" }).hasAttribute("disabled")).toBe(true)
    expect(within(dialog).getByRole("button", { name: "Move Segment 2: Checkout down" }).hasAttribute("disabled")).toBe(true)

    fireEvent.click(within(dialog).getByRole("button", { name: "Move Segment 1: Stock check down" }))

    await waitFor(() => {
      expect(editSegments).toHaveBeenCalledWith(expect.objectContaining({ edit: { kind: "move", segmentId: "stock", direction: "down" } }))
    })

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Arrange segments" })).toBeNull()
    })

    fireEvent.click(within(checkout).getByRole("button", { name: "Edit segment" }))
    fireEvent.click(within(checkout).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(editSegments).toHaveBeenCalledWith(expect.objectContaining({ edit: { kind: "remove", segmentId: "checkout" } }))
    })
  })

  it("adds a segment to a Flight Plan that has none", async () => {
    const editSegments = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    const emptyPage = { ...artifactPage, rail: { groups: [], sections: [] }, segments: [] }
    renderCreation(
      {
        ...creationHandlers(),
        "review.get": () => ({ data: emptyPage }),
        "review.editSegments": editSegments,
        "review.searchFiles": () => ({ data: { options: [{ path: "src/rates.ts", stateLabel: "Changed" }], message: null } }),
      },
      "/pr-reviews/storefront/pr-416",
    )

    expect(await screen.findByText("This Flight Plan has no segments yet.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Add a segment" }))
    const form = screen.getByRole("form", { name: "New segment" })

    expect(within(form).queryByRole("button", { name: "Delete" })).toBeNull()

    fireEvent.change(within(form).getByRole("textbox", { name: "Label" }), { target: { value: "Rates" } })
    fireEvent.focus(within(form).getByRole("combobox", { name: "Add a file" }))
    fireEvent.click(await within(form).findByRole("option", { name: /rates\.ts/ }))
    fireEvent.click(within(form).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(editSegments).toHaveBeenCalledWith(
        expect.objectContaining({ edit: { kind: "add", title: "Rates", paths: ["src/rates.ts"] } }),
      )
    })
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "New segment" })).toBeNull()
    })
  })

  it("hints in the band at changed files that are in no segment, and lists them", async () => {
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: { ...artifactPage, unassignedFiles } }) },
      "/pr-reviews/storefront/pr-416",
    )

    fireEvent.click(await within(await screen.findByRole("banner")).findByRole("button", { name: "1 file in no segment" }))
    const dialog = await screen.findByRole("dialog", { name: "Changed files in no segment" })

    expect(within(dialog).getByRole("list", { name: "Changed files in no segment" }).textContent).toBe("src/rates.ts")
    expect(screen.queryByText("1 changed file is in no segment of this Flight Plan.")).toBeNull()
  })

  it("reads the author's Flight Plan without reviewed marks", async () => {
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.fileCode": () => twelveLines }, AUTHOR_PATH)

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(await within(stock).findByRole("region", { name: "Held units reduce the price" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Show reviewed/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Reviewed" })).toBeNull()
    expect(screen.queryByRole("button", { name: "File reviewed" })).toBeNull()
  })

  it("edits a waypoint under its lines in the whole file, and shows why it was not saved", async () => {
    const editWalkthrough = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { kind: "rejected", message: "Write the title. A waypoint cannot be without one." },
    })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.fileCode": () => twelveLines, "review.editWalkthrough": editWalkthrough },
      AUTHOR_PATH,
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(await within(stock).findByText("const line12 = 12")).toBeTruthy()

    fireEvent.click(within(stock).getByRole("button", { name: "Edit the waypoint: Held units reduce the price" }))
    const form = await within(stock).findByRole("form", { name: "Edit the waypoint: Held units reduce the price" })
    fireEvent.change(within(form).getByRole("textbox", { name: "Title" }), { target: { value: "Subtracts the held units" } })
    fireEvent.click(within(form).getByRole("checkbox", { name: "Needs Attention" }))

    expect(within(form).getByText("Mark this change as an important part of the code review. This helps the reviewer see where to look first.")).toBeTruthy()
    expect(within(form).getByText("Additional context (optional)")).toBeTruthy()
    expect(within(form).getByText("Say why this change is important, or what the reviewer should check in it.")).toBeTruthy()
    expect(within(form).getByText("Say what you changed in this code and what the change is for.")).toBeTruthy()

    fireEvent.click(within(form).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(editWalkthrough).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-416",
        segmentId: "stock",
        edit: {
          kind: "change-waypoint",
          waypointId: "price-of",
          title: "Subtracts the held units",
          reading: "Reading of Held units reduce the price.",
          needsAttention: "",
        },
      })
    })
    expect((await within(form).findByRole("alert")).textContent).toBe("Write the title. A waypoint cannot be without one.")

    fireEvent.click(within(form).getByRole("button", { name: "Cancel" }))

    expect(await within(stock).findByRole("region", { name: "Held units reduce the price" })).toBeTruthy()
  })

  it("removes a waypoint and a file from the Code Walkthrough", async () => {
    const editWalkthrough = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.fileCode": () => twelveLines, "review.editWalkthrough": editWalkthrough },
      AUTHOR_PATH,
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    fireEvent.click(await within(stock).findByRole("button", { name: "Remove the waypoint: Held units reduce the price" }))

    await waitFor(() => {
      expect(editWalkthrough).toHaveBeenCalledWith(
        expect.objectContaining({ segmentId: "stock", edit: { kind: "remove-waypoint", waypointId: "price-of" } }),
      )
    })

    fireEvent.click(within(stock).getByRole("button", { name: "Remove the file from the walkthrough: src/price.ts" }))

    await waitFor(() => {
      expect(editWalkthrough).toHaveBeenCalledWith(
        expect.objectContaining({ segmentId: "stock", edit: { kind: "remove-file", path: "src/price.ts" } }),
      )
    })
  })

  it("arranges the files of a Code Walkthrough, and offers no arranging for one file", async () => {
    const editWalkthrough = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved" } })
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: twoFilePage }), "review.editWalkthrough": editWalkthrough },
      AUTHOR_PATH,
    )

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(screen.getByRole("region", { name: "Segment 2: Checkout" })).queryByRole("button", { name: "Arrange files" })).toBeNull()

    fireEvent.click(within(stock).getByRole("button", { name: "Arrange files" }))
    const dialog = await screen.findByRole("dialog", { name: "Arrange files" })

    expect(within(dialog).getByRole("button", { name: "Move Price file up" }).hasAttribute("disabled")).toBe(true)

    fireEvent.click(within(dialog).getByRole("button", { name: "Move Cart file up" }))

    await waitFor(() => {
      expect(editWalkthrough).toHaveBeenCalledWith(
        expect.objectContaining({ segmentId: "stock", edit: { kind: "move-file", path: "src/cart.ts", direction: "up" } }),
      )
    })
  })

  it("says why the page cannot open for a repository that is not listed", async () => {
    renderCreation({ "review.creationForm": () => ({ errorMessage: "This repository is no longer listed." }) })

    expect(await screen.findByRole("heading", { name: "Could not open this page" })).toBeTruthy()
    expect(screen.getByText("This repository is no longer listed.")).toBeTruthy()
  })
})
