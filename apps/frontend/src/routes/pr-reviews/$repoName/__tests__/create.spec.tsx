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

  it("says why the page cannot open for a repository that is not listed", async () => {
    renderCreation({ "review.creationForm": () => ({ errorMessage: "This repository is no longer listed." }) })

    expect(await screen.findByRole("heading", { name: "Could not open this page" })).toBeTruthy()
    expect(screen.getByText("This repository is no longer listed.")).toBeTruthy()
  })
})
