import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory, type RouterHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"
import { artifactPage, creationPage, reviewBranches, showSectionInView } from "./review-page-fixture"

const REVIEW_PATH = "/pr-reviews/storefront/pr-412"
const REVIEW_KEY = { repositoryName: "storefront", targetId: "pr-412" }
const CREATE_LABEL = "Create Review Artifact"
const BRANCH_FIELD_LABEL = "Branch to compare with"
const REFRESH_WAIT_MS = 12_000

const renderReview = (handlers: ProcedureHandlers, history: RouterHistory = createMemoryHistory({ initialEntries: [REVIEW_PATH] })) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history,
    }),
  )

const comparedWith = (branchName: string) => ({
  ...creationPage,
  creation: { ...creationPage.creation, baseBranch: { branchName, noteLabel: null } },
})

const pageComparedWith = (input: unknown): ProcedureReply => {
  const baseBranch: unknown = typeof input === "object" && input !== null ? Reflect.get(input, "baseBranch") : null
  return { data: typeof baseBranch === "string" ? comparedWith(baseBranch) : creationPage }
}

describe("the review creation page", () => {
  beforeEach(() => {
    Reflect.defineProperty(window, "matchMedia", {
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      configurable: true,
    })
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
    Reflect.defineProperty(Element.prototype, "scrollTo", { value: vi.fn(), configurable: true })
    showSectionInView(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the change, the changed files and the button, with no review panels and only the settings in the band", async () => {
    renderReview({ "review.get": () => ({ data: creationPage }) })

    expect(await screen.findByRole("heading", { name: "Create a new Flight Plan Review Artifact for “Count held units in the stock check”" })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("combobox", { name: BRANCH_FIELD_LABEL }).value).toBe("main")
    expect(screen.getByText("Pull request base")).toBeTruthy()
    expect(screen.getByRole("button", { name: CREATE_LABEL })).toBeTruthy()
    const explorer = screen.getByRole("complementary", { name: "Changed files" })
    expect(within(explorer).getByText("cart.ts")).toBeTruthy()
    expect(within(explorer).queryByRole("link")).toBeNull()
    expect(screen.getByRole("slider", { name: "Changed files width" })).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "Review sections" })).toBeNull()
    expect(screen.queryByRole("navigation", { name: "Panels" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull()
    expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1)

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Settings" }))

    expect(await screen.findByRole("menuitem", { name: "Switch to dark mode" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull()
  })

  it("hides and shows the changed files", async () => {
    renderReview({ "review.get": () => ({ data: creationPage }) })

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    fireEvent.click(within(explorer).getByRole("button", { name: "Hide changed files" }))

    expect(screen.queryByRole("complementary", { name: "Changed files" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show changed files" }))

    expect(await screen.findByRole("complementary", { name: "Changed files" })).toBeTruthy()
  })

  it("asks for the page against the repository's branch when the address names none", async () => {
    const getReview = vi.fn(() => ({ data: creationPage }))
    renderReview({ "review.get": getReview })

    await screen.findByRole("button", { name: CREATE_LABEL })

    expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ ...REVIEW_KEY, baseBranch: null }))
  })

  it("does not ask for the page again while it waits on the reviewer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const getReview = vi.fn(() => ({ data: creationPage }))
    renderReview({ "review.get": getReview })

    await screen.findByRole("button", { name: CREATE_LABEL })
    const requestCount = getReview.mock.calls.length
    await vi.advanceTimersByTimeAsync(REFRESH_WAIT_MS)

    expect(getReview).toHaveBeenCalledTimes(requestCount)
  })

  it("asks for the page against the branch named in the address", async () => {
    const getReview = vi.fn(pageComparedWith)
    renderReview({ "review.get": getReview }, createMemoryHistory({ initialEntries: [`${REVIEW_PATH}?compare=develop`] }))

    await screen.findByRole("button", { name: CREATE_LABEL })

    expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ ...REVIEW_KEY, baseBranch: "develop" }))
    expect(screen.getByRole<HTMLInputElement>("combobox", { name: BRANCH_FIELD_LABEL }).value).toBe("develop")
  })

  it("puts the chosen branch in the address and asks for the page against it", async () => {
    const getReview = vi.fn(pageComparedWith)
    const searchBaseBranches = vi.fn(() => ({ data: reviewBranches }))
    const history = createMemoryHistory({ initialEntries: [REVIEW_PATH] })
    renderReview({ "review.get": getReview, "review.searchBaseBranches": searchBaseBranches }, history)

    fireEvent.focus(await screen.findByRole("combobox", { name: BRANCH_FIELD_LABEL }))
    fireEvent.click(await screen.findByRole("option", { name: /^develop/ }))

    await waitFor(() => {
      expect(history.location.search).toContain("compare=develop")
    })
    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ ...REVIEW_KEY, baseBranch: "develop" }))
    })
    expect(searchBaseBranches).toHaveBeenCalledWith({ repositoryName: "storefront", query: "" })
    expect(await screen.findByDisplayValue("develop")).toBeTruthy()
  })

  it("creates the review artifact against the branch shown, then opens it", async () => {
    const createReview = vi.fn(() => ({ data: { kind: "created" } }))
    renderReview({
      "review.get": () => ({ data: createReview.mock.calls.length === 0 ? creationPage : artifactPage }),
      "review.create": createReview,
    })

    fireEvent.click(await screen.findByRole("button", { name: CREATE_LABEL }))

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(createReview).toHaveBeenCalledWith({ ...REVIEW_KEY, baseBranch: "main" })
    expect(screen.queryByRole("button", { name: CREATE_LABEL })).toBeNull()
  })

  it("clears the branch from the address once the artifact is created", async () => {
    const createReview = vi.fn(() => ({ data: { kind: "created" } }))
    const history = createMemoryHistory({ initialEntries: [`${REVIEW_PATH}?compare=develop`] })
    renderReview({
      "review.get": (input) => (createReview.mock.calls.length === 0 ? pageComparedWith(input) : { data: artifactPage }),
      "review.create": createReview,
    }, history)

    fireEvent.click(await screen.findByRole("button", { name: CREATE_LABEL }))

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(createReview).toHaveBeenCalledWith({ ...REVIEW_KEY, baseBranch: "develop" })
    await waitFor(() => {
      expect(history.location.search).not.toContain("compare")
    })
  })

  it("says why the artifact could not be created", async () => {
    renderReview({
      "review.get": () => ({ data: creationPage }),
      "review.create": () => ({ data: { kind: "unavailable", message: "This review already has an artifact." } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: CREATE_LABEL }))

    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("This review already has an artifact.")).toBeTruthy()
    expect(within(alert).queryByRole("button", { name: "Troubleshoot" })).toBeNull()
  })

  it("shows a failed creation with a way to troubleshoot it, and drops it when another branch is chosen", async () => {
    renderReview({
      "review.get": pageComparedWith,
      "review.create": () => ({ errorMessage: "The checkout could not be read." }),
      "review.searchBaseBranches": () => ({ data: reviewBranches }),
    })

    fireEvent.click(await screen.findByRole("button", { name: CREATE_LABEL }))

    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("The checkout could not be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Troubleshoot" })).toBeTruthy()

    fireEvent.focus(screen.getByRole("combobox", { name: BRANCH_FIELD_LABEL }))
    fireEvent.click(await screen.findByRole("option", { name: /^develop/ }))

    await waitFor(() => {
      expect(screen.queryByText("The checkout could not be read.")).toBeNull()
    })
  })
})
