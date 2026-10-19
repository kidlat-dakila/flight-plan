import { fireEvent, render, screen, within } from "@testing-library/react"
import { readPublishedReview } from "@/published/published-review"
import PublishedReviewPage from "@/published/review-page"
import { artifactPage, showSectionInView, unassignedFiles } from "@/routes/pr-reviews/$repoName/__tests__/review-page-fixture"

const UNAVAILABLE_TITLE = "Only available in Flight Plan"
const UNAVAILABLE_DESCRIPTION = "Open the review in Flight Plan to use this."
const STORAGE_KEY = "flight-plan:reviewed-marks:storefront:pr-412"

const publishedReview = {
  documentTitle: "Count held units • storefront",
  header: { title: "Count held units in the stock check", isBranch: false, label: "Published Flight Plan" },
  actions: { shareLabel: "Share", submitLabel: "Submit review" },
  unavailableFeature: {
    title: UNAVAILABLE_TITLE,
    description: UNAVAILABLE_DESCRIPTION,
    closeLabel: "OK",
    install: {
      intro: "Start it from a terminal:",
      commands: [
        { label: "Run it without installing", command: "npx @kidlat-dakila/flightplan" },
        { label: "Or install it once", command: "npm install -g @kidlat-dakila/flightplan" },
      ],
      copyLabel: "Copy command",
      copiedLabel: "Copied",
    },
  },
  importLink: null,
  unassignedFiles: null,
  rail: artifactPage.rail,
  segments: artifactPage.segments,
  composer: artifactPage.composer,
  codeLinks: {},
  codeDefinitions: {},
  reviewed: {
    storageKey: STORAGE_KEY,
    segments: [
      {
        segmentId: "stock",
        files: [{ path: "src/price.ts", fingerprint: "price-file", waypoints: [{ id: "price-of", fingerprint: "price-of-1", depth: 0, rootBlockIds: [] }], rootBlocks: [] }],
      },
      {
        segmentId: "checkout",
        files: [{ path: "src/cart.ts", fingerprint: "cart-file", waypoints: [{ id: "subtotal", fingerprint: "subtotal-1", depth: 0, rootBlockIds: [] }], rootBlocks: [] }],
      },
    ],
  },
}

const renderPublished = (overrides: Record<string, unknown> = {}) => {
  Reflect.defineProperty(window, "flightPlanReview", { value: { ...publishedReview, ...overrides }, configurable: true })
  const review = readPublishedReview()
  if (review === null) throw new Error("The published review was not set.")
  return render(<PublishedReviewPage review={review} logoSrc="logo.png" />)
}

const closeUnavailableDialog = async (): Promise<string | null> => {
  const dialog = await screen.findByRole("dialog", { name: UNAVAILABLE_TITLE })
  const text = dialog.textContent
  fireEvent.click(within(dialog).getByRole("button", { name: "OK" }))
  return text
}

describe("the published review page", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it("shows the Flight Plan under its title, with nothing from the forge", () => {
    renderPublished()

    const band = screen.getByRole("banner")

    expect(within(band).getByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(within(band).getByText("Published Flight Plan")).toBeTruthy()
    expect(within(band).queryByRole("list", { name: "Reviewers" })).toBeNull()
    expect(within(band).queryByRole("button", { name: "Chat" })).toBeNull()
    expect(screen.getByText("Why stock matters.")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Price file" })).toBeTruthy()
    expect(screen.queryByText("The direction is right.")).toBeNull()
  })

  it("steps through the waypoints from the data it holds", async () => {
    showSectionInView("stock-code-walkthrough")
    renderPublished()

    fireEvent.click(await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" }))

    expect((await screen.findAllByText("1 of 1")).length).toBeGreaterThan(0)
    expect(screen.queryByRole("dialog")).toBeNull()
    showSectionInView(null)
  })

  it("says a band action is only available in Flight Plan", async () => {
    renderPublished()
    const band = screen.getByRole("banner")

    fireEvent.click(within(band).getByRole("button", { name: "Share" }))
    await expect(closeUnavailableDialog()).resolves.toContain(UNAVAILABLE_DESCRIPTION)
    fireEvent.click(within(band).getByRole("button", { name: "Submit review" }))
    await expect(closeUnavailableDialog()).resolves.toContain(UNAVAILABLE_DESCRIPTION)
  })

  it("says how to start Flight Plan in the dialog", async () => {
    renderPublished()

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Share" }))
    const dialog = await screen.findByRole("dialog", { name: UNAVAILABLE_TITLE })

    expect(within(dialog).getByText("Start it from a terminal:")).toBeTruthy()
    expect(within(dialog).getByText("Run it without installing")).toBeTruthy()
    expect(within(dialog).getByText("npx @kidlat-dakila/flightplan")).toBeTruthy()
    expect(within(dialog).getByText("Or install it once")).toBeTruthy()
    expect(within(dialog).getByText("npm install -g @kidlat-dakila/flightplan")).toBeTruthy()
  })

  it("copies a command to the clipboard and says it was copied", async () => {
    const writeText = vi.fn(async () => {
      await Promise.resolve()
    })
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    renderPublished()

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Share" }))
    const dialog = await screen.findByRole("dialog", { name: UNAVAILABLE_TITLE })
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Copy command" })[0] ?? document.body)

    expect(writeText).toHaveBeenCalledWith("npx @kidlat-dakila/flightplan")
    expect(await within(dialog).findByRole("button", { name: "Copied" })).toBeTruthy()
    expect(within(dialog).getAllByRole("button", { name: "Copy command" })).toHaveLength(1)
  })

  it("says so for an action of the options menu", async () => {
    renderPublished()

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    await expect(closeUnavailableDialog()).resolves.toContain(UNAVAILABLE_DESCRIPTION)
  })

  it("keeps a file marked as reviewed in the browser, so it stays hidden after a reload", () => {
    const { unmount } = renderPublished()

    fireEvent.click(screen.getAllByRole("button", { name: "File reviewed" })[0] ?? document.body)

    expect(screen.queryByRole("heading", { level: 3, name: "Price file" })).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ files: { "src/price.ts": "price-file" } })

    unmount()
    renderPublished()

    expect(screen.queryByRole("heading", { level: 3, name: "Price file" })).toBeNull()
    expect(screen.getByRole("heading", { level: 3, name: "Cart file" })).toBeTruthy()
  })

  it("reads no marks when the browser's storage cannot be read", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json")
    renderPublished()

    expect(screen.getByRole("heading", { level: 3, name: "Price file" })).toBeTruthy()
  })

  it("lists the changed files that are in no segment from its own data", async () => {
    renderPublished({ unassignedFiles })

    fireEvent.click(screen.getByRole("button", { name: unassignedFiles.actionLabel }))

    const dialog = await screen.findByRole("dialog", { name: unassignedFiles.title })
    expect(within(dialog).getByText(unassignedFiles.paths[0] ?? "")).toBeTruthy()
  })

  it("links to the download page of Flight Plan when the review has the link", () => {
    const importLink = { href: "http://localhost:4200/artifact/claude/download?artifact=x", label: "Download to Flight Plan" }
    const { unmount } = renderPublished({ importLink })

    expect(screen.getByRole("link", { name: "Download to Flight Plan" }).getAttribute("href")).toBe(importLink.href)

    unmount()
    renderPublished()

    expect(screen.queryByRole("link", { name: "Download to Flight Plan" })).toBeNull()
  })
})
