import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"
import { artifactPage, missingPage } from "./review-page-fixture"

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

const renderCreation = (handlers: ProcedureHandlers, path = CREATE_PATH) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the create Flight Plan page", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
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
    renderCreation({ ...creationHandlers(), "review.creationForm": getCreationForm }, "/pr-reviews/storefront/pr-416/create")

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
      "/pr-reviews/storefront/branch-spike%2Freturns/create",
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
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }) }, "/pr-reviews/storefront/pr-416/create")

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Pull request or branch" })).toBeNull()
  })

  it("heads the author's page with the review target and a label, without the reviewer's status and actions", async () => {
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: artifactPage }) }, "/pr-reviews/storefront/pr-416/create")

    const band = await screen.findByRole("banner")

    expect(await within(band).findByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(within(band).getByText("Your Flight Plan")).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Chat" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "More actions" })).toBeTruthy()
    expect(within(band).queryByRole("button", { name: "Share" })).toBeNull()
    expect(within(band).queryByRole("button", { name: "Submit review" })).toBeNull()
    expect(within(band).queryByRole("list", { name: "Reviewers" })).toBeNull()
    expect(within(band).queryByText("Stale")).toBeNull()
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
      "/pr-reviews/storefront/pr-416/create",
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

  it("goes back to reading the context as it was when writing is cancelled, and shows why a save was refused", async () => {
    const rejection = { kind: "rejected", message: "Write the context. A segment cannot be without one." }
    renderCreation(
      { ...creationHandlers(), "review.get": () => ({ data: artifactPage }), "review.editContext": () => ({ data: rejection }) },
      "/pr-reviews/storefront/pr-416/create",
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
    renderCreation({ ...creationHandlers(), "review.get": () => ({ data: unwritten }) }, "/pr-reviews/storefront/pr-416/create")

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
      "/pr-reviews/storefront/pr-416/create",
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

  it("says why the page cannot open for a repository that is not listed", async () => {
    renderCreation({ "review.creationForm": () => ({ errorMessage: "This repository is no longer listed." }) })

    expect(await screen.findByRole("heading", { name: "Could not open this page" })).toBeTruthy()
    expect(screen.getByText("This repository is no longer listed.")).toBeTruthy()
  })
})
