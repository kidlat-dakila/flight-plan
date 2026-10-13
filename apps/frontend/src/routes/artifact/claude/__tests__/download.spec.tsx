import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers } from "@/routes/__tests__/fake-backend"
import { artifactPage } from "@/routes/pr-reviews/$repoName/__tests__/review-page-fixture"
import { createTrpcClient } from "@/trpc"

const DOWNLOAD_PATH = "/artifact/claude/download?artifact=https%3A%2F%2Fclaude.ai%2Fartifact%2Fabc&repository=storefront&target=pr-412"
const IMPORT_ID = "2026-10-01T12:00:00.000Z"

const startingForm = {
  heading: "Download a Flight Plan",
  message: "Your agent fetches the Flight Plan from the Claude artifact and stores it here.",
  details: [{ label: "Repository", value: "storefront" }, { label: "Review target", value: "pr-412" }],
  warning: null,
  startsAtOnce: true,
  isImporting: false,
  isFinished: false,
  importId: null,
  submitLabel: "Download",
  pendingLabel: "Downloading…",
  reviewHref: "/pr-reviews/storefront/pr-412",
}

const importingForm = { ...startingForm, startsAtOnce: false, isImporting: true, importId: IMPORT_ID, submitLabel: null, message: "Your agent is fetching the Flight Plan." }

const finishedForm = { ...importingForm, isImporting: false, isFinished: true, message: "The Flight Plan is stored." }

const replacingForm = {
  ...startingForm,
  startsAtOnce: false,
  warning: "This review target already has a Flight Plan here. Downloading replaces it.",
  submitLabel: "Replace and download",
}

const started = { importId: IMPORT_ID, message: "Asked your agent to fetch the Flight Plan." }

const renderDownload = (handlers: ProcedureHandlers) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [DOWNLOAD_PATH] }),
    }),
  )

describe("the download page of a Claude artifact", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
  })

  it("starts the download by itself and waits for it", async () => {
    const startImport = vi.fn(() => ({ data: started }))
    renderDownload({
      "review.importForm": () => ({ data: startImport.mock.calls.length === 0 ? startingForm : importingForm }),
      "review.import": startImport,
    })

    expect((await screen.findByRole("status")).textContent).toBe("Downloading…")
    expect(startImport).toHaveBeenCalledTimes(1)
    expect(startImport).toHaveBeenCalledWith({ artifactUrl: "https://claude.ai/artifact/abc", repositoryName: "storefront", targetId: "pr-412" })
    expect(screen.queryByRole("button", { name: "Download" })).toBeNull()
  })

  it("opens the review page once the download it started is stored", async () => {
    const startImport = vi.fn(() => ({ data: started }))
    renderDownload({
      "review.importForm": () => ({ data: startImport.mock.calls.length === 0 ? startingForm : finishedForm }),
      "review.import": startImport,
      "review.get": () => ({ data: artifactPage }),
    })

    expect(await screen.findByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
  })

  it("stays on the page for a download it did not start", async () => {
    renderDownload({ "review.importForm": () => ({ data: finishedForm }) })

    expect(await screen.findByText("The Flight Plan is stored.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Open the review page" })).toBeTruthy()
  })

  it("asks before replacing a Flight Plan, and starts on the press", async () => {
    const startImport = vi.fn(() => ({ data: started }))
    renderDownload({ "review.importForm": () => ({ data: replacingForm }), "review.import": startImport })

    expect(await screen.findByText(replacingForm.warning)).toBeTruthy()
    expect(startImport).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Replace and download" }))

    await waitFor(() => {
      expect(startImport).toHaveBeenCalledTimes(1)
    })
  })

  it("says why the download could not start", async () => {
    renderDownload({
      "review.importForm": () => ({ data: startingForm }),
      "review.import": () => ({ data: { importId: null, message: "No agent could be asked to fetch it." } }),
    })

    expect((await screen.findByRole("alert")).textContent).toBe("No agent could be asked to fetch it.")
  })
})
