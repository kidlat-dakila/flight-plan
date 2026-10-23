import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"
import {
  artifactPage,
  blastPage,
  conversationReply,
  missingPage,
  modelChoiceReply,
  needsMigrationPage,
  permissionReply,
  pendingComment,
  showSectionInView,
  twoFilePage,
  typeInto,
  unassignedFiles,
  writeUpPlan,
  liveAgentReply,
} from "./review-page-fixture"

const REVIEW_PATH = "/pr-reviews/storefront/pr-412"

const markOf = (title: string): HTMLElement => screen.getByRole("button", { name: new RegExp(`waypoint [0-9]+ of [0-9]+: ${title}$`, "i") })

const WRITING_PROGRESS = {
  state: "writing",
  label: "Claude is writing the review",
  message: "You can read the code meanwhile.",
  isWriting: true,
  countLabel: "3 of 12 parts written",
  writtenCount: 3,
  totalCount: 12,
  prompt: null,
}

const withUnwrittenContext = {
  ...artifactPage,
  segments: artifactPage.segments.map((segment, position) =>
    (position === 0 ? { ...segment, context: { ...segment.context, context: [], isDraft: true } } : segment)),
}

const TARGET_SWITCHER = {
  heading: "Branches in storefront",
  searchPlaceholder: "Search by title or author",
  emptyLabel: null,
  currentTargetId: "pr-412",
  targets: [
    {
      id: "pr-416",
      title: { text: "Show the gift card balance at checkout", kind: "plain" },
      details: [{ text: "#416", kind: "plain" }],
      author: null,
      href: "/pr-reviews/storefront/pr-416",
      branchStatus: "no-review",
      statusLabel: "No review",
      updatedLabel: "1 hour ago",
    },
  ],
}

type ReviewPage = typeof artifactPage
type ReviewSegment = ReviewPage["segments"][number]
type FilterControls = ReviewSegment["walkthrough"]["controls"]["filter"]

const asksForBug = (input: unknown): boolean => JSON.stringify(input).includes("\"filterKeys\":[\"bug\"]")

const withBugTickedIn = (filter: FilterControls) => ({
  ...filter,
  groups: filter.groups.map((group) => ({ ...group, options: group.options.map((option) => (option.key === "bug" ? { ...option, isSelected: true } : option)) })),
})

const withBugTicked = (page: ReviewPage) => ({
  ...page,
  segments: page.segments.map((segment) => ({
    ...segment,
    walkthrough: { ...segment.walkthrough, controls: { ...segment.walkthrough.controls, filter: withBugTickedIn(segment.walkthrough.controls.filter) } },
  })),
})

const withReviewed = (page: ReviewPage, waypointIds: readonly string[]): ReviewPage => ({
  ...page,
  segments: page.segments.map((segment) => ({
    ...segment,
    walkthrough: {
      ...segment.walkthrough,
      files: segment.walkthrough.files.map((file) => ({
        ...file,
        rows: file.rows.map((row) => (row.waypoint !== undefined && waypointIds.includes(row.waypoint.id) ? { ...row, waypoint: { ...row.waypoint, isReviewed: true } } : row)),
      })),
    },
  })),
})

const EMPTY_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }

const showPage = (visibility: DocumentVisibilityState): void => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(visibility)
  fireEvent(document, new Event("visibilitychange", { bubbles: true }))
}

const renderReview = (handlers: ProcedureHandlers, path = REVIEW_PATH) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

interface ScreenPlace {
  readonly y: number
  readonly height: number
}

const placeOnScreen = (rectsByAnchorId: Readonly<Record<string, ScreenPlace>>): void => {
  const placesByAnchorId = new Map(Object.entries(rectsByAnchorId))
  Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      const place = placesByAnchorId.get(this.id)
      return DOMRect.fromRect(place === undefined ? {} : { x: 0, width: 1200, ...place })
    },
  })
}

describe("the review page", () => {
  const scrollIntoView = vi.fn()
  const scrolledAnchorIds = (): string[] =>
    scrollIntoView.mock.contexts.flatMap((element) => (element instanceof Element ? [element.id] : []))

  beforeEach(() => {
    Reflect.defineProperty(window, "matchMedia", {
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      configurable: true,
    })
    scrollIntoView.mockClear()
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true })
    Reflect.defineProperty(Element.prototype, "scrollTo", { value: vi.fn(), configurable: true })
    Reflect.defineProperty(Range.prototype, "getClientRects", { value: () => [], configurable: true })
    Reflect.defineProperty(Range.prototype, "getBoundingClientRect", { value: () => EMPTY_RECT, configurable: true })
    showSectionInView(null)
  })

  it("puts the pull request in the sign band with its reviewers and its actions", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const band = await screen.findByRole("banner")

    expect(await within(band).findByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(within(band).getByRole("list", { name: "Reviewers" })).toBeTruthy()
    expect(within(band).queryByRole("button", { name: "Chat" })).toBeNull()
    expect(within(band).getByRole("button", { name: "Share" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Submit review" })).toBeTruthy()
    expect(within(screen.getByRole("navigation", { name: "Panels" })).getByRole("button", { name: "Chat" })).toBeTruthy()

    expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1)
    expect(within(band).queryByRole("button", { name: "More actions" })).toBeNull()

    fireEvent.click(within(band).getByRole("button", { name: "Settings" }))

    expect((await screen.findByRole("menuitem", { name: "View pull request" })).getAttribute("href")).toBe("https://forge.test/pull/412")
    expect(screen.getByRole("menuitem", { name: "Switch to dark mode" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Review configuration" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Update the Flight Plan" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Regenerate from scratch" })).toBeNull()
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy()
  })

  it("switches to another branch of the repository from the title in the sign band", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    const getSwitcher = vi.fn(() => ({ data: TARGET_SWITCHER }))
    renderReview({ "review.get": getReview, "review.targetSwitcher": getSwitcher })
    const band = await screen.findByRole("banner")

    fireEvent.click(await within(band).findByRole("button", { name: "Count held units in the stock check" }))
    const list = await screen.findByRole("list", { name: "Branches in storefront" })
    fireEvent.change(screen.getByRole("searchbox", { name: "Search by title or author" }), { target: { value: "gift" } })
    await waitFor(() => {
      expect(getSwitcher).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", query: "gift" })
    })
    fireEvent.click(within(list).getByRole("button", { name: /Show the gift card balance at checkout/ }))

    expect(getSwitcher).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", query: "" })
    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ repositoryName: "storefront", targetId: "pr-416" }))
    })
  })

  it("deletes the review artifact and goes back to the repositories", async () => {
    const deleteReview = vi.fn(() => ({ data: { message: "Flight Plan deleted" } }))
    const history = createMemoryHistory({ initialEntries: [REVIEW_PATH] })
    render(
      createApp({
        queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
        trpcClient: createTrpcClient(fakeBackendLinks({ "review.get": () => ({ data: artifactPage }), "review.delete": deleteReview })),
        history,
      }),
    )

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    await waitFor(() => {
      expect(history.location.pathname).toBe("/")
    })
    expect(deleteReview).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
  })

  it("asks the backend for the review target in the address", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    renderReview({ "review.get": getReview })

    await screen.findByText("Why stock matters.")

    expect(getReview).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryName: "storefront", targetId: "pr-412", filterKeys: [], isShowingReviewed: false }),
    )
  })

  it("draws every segment on one page, each with its own context and walkthrough", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    const checkout = screen.getByRole("region", { name: "Segment 2: Checkout" })

    expect(within(stock).getByText("Why stock matters.")).toBeTruthy()
    expect(within(stock).getByRole("article", { name: "Price file" })).toBeTruthy()
    expect(within(checkout).getByText("Why checkout matters.")).toBeTruthy()
    expect(within(checkout).getByRole("article", { name: "Cart file" })).toBeTruthy()
  })

  it("lists the segments and their sections on the rail", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const rail = await screen.findByRole("navigation", { name: "Review sections" })

    expect(within(rail).getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      "#segment-stock",
      "#stock-context",
      "#stock-code-walkthrough",
      "#segment-checkout",
      "#checkout-context",
      "#checkout-code-walkthrough",
      "#conversation",
    ])
  })

  it("says when the artifact is still being written, and when it is stale", async () => {
    renderReview({
      "review.get": () => ({
        data: {
          ...artifactPage,
          progress: WRITING_PROGRESS,
          staleNotice: { message: [{ kind: "text", text: "The pull request has moved to e7a94d3 since." }], promptLabel: "Copy the update prompt", prompt: "Update it.", copiedMessage: "Prompt copied" },
        },
      }),
    })

    expect(await screen.findByText("Claude is writing the review")).toBeTruthy()
    expect(screen.getByRole("progressbar", { name: "3 of 12 parts written" })).toMatchObject({ value: 3, max: 12 })
    expect(screen.getByText("The pull request has moved to e7a94d3 since.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Copy the update prompt" })).toBeTruthy()
  })

  it("draws a part the agent has not written yet as a skeleton while the agent writes", async () => {
    renderReview({ "review.get": () => ({ data: { ...withUnwrittenContext, progress: WRITING_PROGRESS } }) })

    expect(await screen.findAllByText("Claude is writing the review")).toHaveLength(2)
    expect(screen.queryByText("Not written yet.")).toBeNull()
  })

  it("says a part is not written, with no skeleton, while the agent is offline", async () => {
    const waiting = { ...WRITING_PROGRESS, state: "waiting", label: "Waiting for Claude", isWriting: false }
    renderReview({ "review.get": () => ({ data: { ...withUnwrittenContext, progress: waiting } }) })

    expect(await screen.findAllByText("Waiting for Claude")).toHaveLength(1)
    expect(screen.getByText("Not written yet.")).toBeTruthy()
  })

  it("marks each section the agent has not written up yet, beside its heading", async () => {
    const notices = { context: "Not explained yet", traceDiagram: null, blastDiagram: null, walkthrough: "Not explained yet" }
    renderReview({
      "review.get": () => ({
        data: { ...artifactPage, segments: artifactPage.segments.map((segment, position) => (position === 0 ? { ...segment, writeUpNotices: notices } : segment)) },
      }),
    })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(within(stock).getByRole("region", { name: "Context" })).getByText("Not explained yet")).toBeTruthy()
    expect(within(within(stock).getByRole("region", { name: "Code Walkthrough" })).getByText("Not explained yet")).toBeTruthy()
    expect(within(stock).getAllByText("Not explained yet")).toHaveLength(2)
    expect(within(screen.getByRole("region", { name: "Segment 2: Checkout" })).queryByText("Not explained yet")).toBeNull()
  })

  it("draws a review without segments as one segment with no heading, and its Trace Diagrams as tabs", async () => {
    const [first] = artifactPage.segments
    const diagramOf = (anchorId: string, title: string) => ({
      anchorId,
      title,
      description: [{ kind: "paragraph", inlines: [{ kind: "text", text: `How ${title} runs.` }] }],
      descriptionMarkdown: `How ${title} runs.`,
      unwrittenLabel: "Not written yet.",
      descriptionHint: null,
      nodes: [],
      edges: [],
    })
    const unsegmented = {
      ...first,
      title: null,
      heading: null,
      detailLabel: null,
      traceDiagram: {
        ...first.traceDiagram,
        anchorId: "stock-trace-diagram",
        diagram: null,
        tabs: [
          { id: "stock", label: "Stock check", diagram: diagramOf("trace-stock", "Stock check") },
          { id: "checkout", label: "Checkout", diagram: diagramOf("trace-checkout", "Checkout") },
        ],
      },
    }
    renderReview({ "review.get": () => ({ data: { ...artifactPage, segments: [unsegmented] } }) })

    expect(await screen.findByRole("tablist", { name: "Trace Diagram" })).toBeTruthy()
    expect(screen.getByText("How Stock check runs.")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: /Segment 1/ })).toBeNull()

    fireEvent.click(screen.getByRole("tab", { name: "Checkout" }))

    expect(screen.getByText("How Checkout runs.")).toBeTruthy()
  })

  it("asks the agent to write up a Trace Diagram card from its side panel", async () => {
    const [first, second] = artifactPage.segments
    const draftCard = {
      id: "cart-line",
      type: "component",
      typeLabel: "Component",
      change: null,
      changedLabel: null,
      label: "CartLine",
      isDraft: true,
      classification: { key: "component", label: "Component" },
      hint: "Adds a component.",
      isBeingWritten: false,
      name: "CartLine",
      shortPath: "src/cart-line.tsx",
      description: null,
      codeLinkId: null,
      codeViews: [],
      parameters: [],
      blockLists: [],
      triggerLabels: [],
      rowGroups: [],
      position: null,
      children: [],
    }
    const withCard = {
      ...first,
      traceDiagram: {
        ...first.traceDiagram,
        anchorId: "stock-trace-diagram",
        diagram: { anchorId: "trace-stock", title: "Stock check", description: null, descriptionMarkdown: "", unwrittenLabel: "Not written yet.", descriptionHint: null, nodes: [draftCard], edges: [] },
      },
    }
    const requestWriteUp = vi.fn(() => ({ data: { kind: "started", prompt: null, message: "Explaining the card" } }))
    renderReview({
      "review.get": () => ({ data: { ...artifactPage, segments: [withCard, second] } }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.requestWriteUp": requestWriteUp,
    })

    expect(await screen.findByText("Adds a component.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /^CartLinesrc\/cart-line\.tsx/ }))
    const panel = await screen.findByRole("region", { name: "CartLine" })
    await waitFor(() => {
      expect(within(panel).getByRole("button", { name: /Explain this card/ })).toBeTruthy()
    })
    fireEvent.click(within(panel).getByRole("button", { name: /Explain this card/ }))

    expect(await screen.findByText("Explaining the card")).toBeTruthy()
    expect(requestWriteUp).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", target: { kind: "trace-node", segmentId: "stock", nodeId: "cart-line" } })
  })

  it("asks the agent to assess a Blast Diagram file from its side panel", async () => {
    const requestWriteUp = vi.fn(() => ({ data: { kind: "started", prompt: null, message: "Assessing the file" } }))
    renderReview({
      "review.get": () => ({ data: blastPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.requestWriteUp": requestWriteUp,
    })

    fireEvent.click(await screen.findByRole("button", { name: "report.ts" }))
    const panel = await screen.findByRole("region", { name: "src/report.ts" })
    await waitFor(() => {
      expect(within(panel).getByRole("button", { name: /Assess this file/ })).toBeTruthy()
    })
    fireEvent.click(within(panel).getByRole("button", { name: /Assess this file/ }))

    expect(await screen.findByText("Assessing the file")).toBeTruthy()
    expect(requestWriteUp).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", target: { kind: "blast-file", segmentId: "stock", path: "src/report.ts" } })
  })

  it("lists the changed code blocks under the context by classification, and opens a card's waypoint", async () => {
    const changeOverview = {
      heading: "Change Overview",
      emptyMessage: null,
      rows: [{
        classification: { key: "logic", label: "Logic" },
        cards: [{ id: "price-of", label: "priceOf", typeLabel: "Function", path: "src/price.ts", change: "modified", changeLabel: "Modified", waypointAnchorId: "waypoint-price-of", preview: null }],
      }],
    }
    renderReview({
      "review.get": () => ({
        data: {
          ...artifactPage,
          segments: artifactPage.segments.map((segment, position) => (position === 0 ? { ...segment, context: { ...segment.context, changeOverview } } : segment)),
        },
      }),
    })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })
    const overview = within(stock).getByRole("region", { name: "Change Overview" })

    expect(within(overview).getByRole("listitem", { name: "Logic" })).toBeTruthy()
    expect(screen.queryByText("Reading of Held units reduce the price.")).toBeNull()

    fireEvent.click(within(overview).getByRole("button", { name: /priceOf/ }))

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()
  })

  it("asks about the agent's write-up the first time the review opens, and remembers that the reviewer declined", async () => {
    const declineWriteUp = vi.fn(() => ({ data: { kind: "declined" } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: declineWriteUp.mock.calls.length > 0 } }),
      "review.declineWriteUp": declineWriteUp,
    })

    const dialog = await screen.findByRole("dialog", { name: "Ask Claude to explain this review?" })

    expect(within(dialog).getByText("Context and Findings")).toBeTruthy()
    expect(within(dialog).getByText("2 parts to write and 3 waypoints to check")).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("button", { name: "Not now" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    expect(declineWriteUp).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
  })

  it("opens the write-up dialog again from Explain this review in the settings menu", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }) })
    await screen.findByText("Why stock matters.")

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Settings" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Explain this review" }))

    expect(await screen.findByRole("dialog", { name: "Ask Claude to explain this review?" })).toBeTruthy()
  })

  it("leaves Explain this review out of the settings menu when no agent is set up", async () => {
    const getPlan = vi.fn(() => ({ data: { kind: "no-agent", message: "No agent is set up." } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.writeUpPlan": getPlan })
    await screen.findByText("Why stock matters.")
    await waitFor(() => {
      expect(getPlan).toHaveBeenCalled()
    })

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Settings" }))

    expect(await screen.findByRole("menuitem", { name: "Delete" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "Explain this review" })).toBeNull()
  })

  it.each([
    ["once the write-up was offered", { ...writeUpPlan, isOffered: true }],
    ["when no agent is set up", { kind: "no-agent", message: "No agent is set up." }],
  ])("asks nothing %s", async (_case, plan) => {
    const getPlan = vi.fn(() => ({ data: plan }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.writeUpPlan": getPlan })

    await screen.findByText("Why stock matters.")
    await waitFor(() => {
      expect(getPlan).toHaveBeenCalled()
    })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks the agent for the write-up, counts again what is ticked, and says the agent started", async () => {
    const getPlan = vi.fn((input: unknown) => ({ data: { ...writeUpPlan, totalLabel: JSON.stringify(input).includes("walkthrough") ? "5 parts to write and 3 waypoints to check" : writeUpPlan.totalLabel } }))
    const writeUp = vi.fn(() => ({ data: { kind: "started", prompt: null, message: "Explaining 5 parts" } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.writeUpPlan": getPlan, "review.writeUp": writeUp })

    const dialog = await screen.findByRole("dialog", { name: "Ask Claude to explain this review?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Configure" }))
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Code Walkthrough/ }))

    expect(await within(dialog).findByText("5 parts to write and 3 waypoints to check")).toBeTruthy()
    expect(getPlan).toHaveBeenCalledWith(expect.objectContaining({ sections: ["context", "findings", "walkthrough"] }))

    fireEvent.click(within(dialog).getByRole("button", { name: "Explain" }))

    expect(await screen.findByText("Explaining 5 parts")).toBeTruthy()
    expect(writeUp).toHaveBeenCalledWith({
      repositoryName: "storefront",
      targetId: "pr-412",
      sections: ["context", "findings"],
      configurationId: "standard",
      walkthroughOrder: "imports-bottom-up",
      isSegmented: true,
    })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("keeps the dialog open and shows why the write-up was refused", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: writeUpPlan }),
      "review.writeUp": () => ({ data: { kind: "rejected", field: "sections", message: "Choose at least one part for the agent to explain." } }),
    })

    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Explain" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Choose at least one part for the agent to explain.")
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("copies the prompt again while the reviewer's own agent is awaited", async () => {
    const writeText = vi.fn(async () => {
      await Promise.resolve()
    })
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const waiting = { ...WRITING_PROGRESS, state: "waiting", label: "Waiting for your agent", prompt: { label: "Copy the line", text: "Review pull request #412.", copiedMessage: "Line copied" } }
    renderReview({ "review.get": () => ({ data: { ...artifactPage, progress: waiting } }) })

    fireEvent.click(await screen.findByRole("button", { name: "Copy the line" }))

    expect(writeText).toHaveBeenCalledWith("Review pull request #412.")
    expect(await screen.findByText("Line copied")).toBeTruthy()
  })

  it("puts a navigator at the foot of the page in place of the walkthrough's controls and the Back to top button", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect(await within(navigator).findByRole("button", { name: "Next waypoint" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Back to top" })).toBeNull()
    expect(screen.getAllByRole("button", { name: "Next waypoint" })).toHaveLength(1)
  })

  it("steps through the waypoints of a segment from the navigator, and shows only the card of the one it lands on", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: twoFilePage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })
    const nextButton = await within(navigator).findByRole("button", { name: "Next waypoint" })

    expect(screen.queryByText("Reading of Held units reduce the price.")).toBeNull()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()
    expect(markOf("Held units reduce the price").getAttribute("data-current")).toBe("true")
    expect(screen.queryByRole("region", { name: "Held units reduce the price" })).toBeNull()
    expect(within(navigator).getByText("1 of 2")).toBeTruthy()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of The sum is rounded once.")).toBeTruthy()
    expect(screen.queryByText("Reading of Held units reduce the price.")).toBeNull()
    expect(markOf("The sum is rounded once").getAttribute("data-current")).toBe("true")
    expect(within(navigator).getByText("2 of 2")).toBeTruthy()
    expect(within(navigator).queryByRole("button", { name: "Next waypoint" })).toBeNull()
    expect(within(navigator).getByRole("button", { name: "Next: Segment (2/2)" })).toBeTruthy()
  })

  it("hands Previous and Next to the sections around the walkthrough at the ends of its segment", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect(await within(navigator).findByRole("button", { name: "Back: Context" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "d" })

    expect(await within(navigator).findByText("1 of 1")).toBeTruthy()
    expect(within(navigator).getByRole("button", { name: "Back: Context" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "d" })

    await waitFor(() => {
      expect(scrolledAnchorIds()).toContain("checkout-context")
    })
  })

  it("steps to the section before and after the one on screen with A and D", async () => {
    showSectionInView("checkout-context")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect(await within(navigator).findByRole("button", { name: "Back: Segment (1/2)" })).toBeTruthy()
    expect(within(navigator).getByRole("button", { name: "Next: Code Walkthrough" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "a" })
    fireEvent.keyDown(window, { key: "d" })

    expect(scrolledAnchorIds()).toStrictEqual(["stock-code-walkthrough", "checkout-code-walkthrough"])
  })

  it("makes the first waypoint of a walkthrough current when the navigator goes to that walkthrough", async () => {
    showSectionInView("stock-context")
    renderReview({ "review.get": () => ({ data: twoFilePage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })
    await within(navigator).findByRole("button", { name: "Next: Code Walkthrough" })

    fireEvent.keyDown(window, { key: "d" })

    await waitFor(() => {
      expect(markOf("Held units reduce the price").getAttribute("data-current")).toBe("true")
    })
    expect(screen.queryByRole("region", { name: "Held units reduce the price" })).toBeNull()
    expect(scrolledAnchorIds()).toStrictEqual(["stock-code-walkthrough"])
  })

  it("steps with D and A", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: twoFilePage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "d" })

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()

    fireEvent.keyDown(window, { key: "d" })
    fireEvent.keyDown(window, { key: "a" })

    await waitFor(() => {
      expect(markOf("Held units reduce the price").getAttribute("data-current")).toBe("true")
    })
  })

  it("asks the agent to write up the current waypoint with G when it has no write-up", async () => {
    const unwrittenPage = {
      ...twoFilePage,
      segments: twoFilePage.segments.map((segment) => ({
        ...segment,
        walkthrough: {
          ...segment.walkthrough,
          files: segment.walkthrough.files.map((file) => ({
            ...file,
            rows: file.rows.map((row) => (row.kind === "waypoint" ? { ...row, rootBlockId: "root-price", waypoint: { ...row.waypoint, reading: null, hint: "Changes a function." } } : row)),
          })),
        },
      })),
    }
    const requestWriteUp = vi.fn(() => ({ data: { kind: "started", prompt: null, message: "Explaining 1 waypoint" } }))
    showSectionInView("stock-code-walkthrough")
    renderReview({
      "review.get": () => ({ data: unwrittenPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.requestWriteUp": requestWriteUp,
    })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "d" })
    await within(screen.getByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: /Let Claude explain/ })
    fireEvent.keyDown(window, { key: "g", ctrlKey: true })

    expect(await screen.findByText("Explaining 1 waypoint")).toBeTruthy()
    expect(requestWriteUp).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", target: { kind: "root-block", rootBlockId: "root-price" } })

    fireEvent.keyDown(window, { key: "g" })

    await waitFor(() => {
      expect(requestWriteUp).toHaveBeenLastCalledWith({ repositoryName: "storefront", targetId: "pr-412", target: { kind: "waypoint", waypointId: "price-of" } })
    })
  })

  it("makes a waypoint current when its card opens on hover, so G asks for the write-up of the card on screen", async () => {
    const unwrittenPage = {
      ...twoFilePage,
      segments: twoFilePage.segments.map((segment) => ({
        ...segment,
        walkthrough: {
          ...segment.walkthrough,
          files: segment.walkthrough.files.map((file) => ({
            ...file,
            rows: file.rows.map((row) => (row.kind === "waypoint" ? { ...row, waypoint: { ...row.waypoint, reading: null, hint: "Changes a function." } } : row)),
          })),
        },
      })),
    }
    const requestWriteUp = vi.fn(() => ({ data: { kind: "started", prompt: null, message: "Explaining 1 waypoint" } }))
    showSectionInView("stock-code-walkthrough")
    renderReview({
      "review.get": () => ({ data: unwrittenPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.requestWriteUp": requestWriteUp,
    })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })
    await within(navigator).findByRole("button", { name: "Next waypoint" })

    fireEvent.pointerEnter(markOf("The sum is rounded once"))
    fireEvent.mouseEnter(markOf("The sum is rounded once"))

    expect(await screen.findByText("Changes a function.")).toBeTruthy()
    expect(within(navigator).getByText("2 of 2")).toBeTruthy()
    expect(markOf("The sum is rounded once").getAttribute("data-current")).toBe("true")

    fireEvent.keyDown(window, { key: "g" })

    await waitFor(() => {
      expect(requestWriteUp).toHaveBeenLastCalledWith({ repositoryName: "storefront", targetId: "pr-412", target: { kind: "waypoint", waypointId: "subtotal" } })
    })
  })

  it("says in the card of a waypoint that it is in the spotlight, after its core change", async () => {
    const spotlitPage = {
      ...twoFilePage,
      segments: twoFilePage.segments.map((segment) => ({
        ...segment,
        walkthrough: {
          ...segment.walkthrough,
          files: segment.walkthrough.files.map((file) => ({
            ...file,
            rows: file.rows.map((row) => (row.kind === "waypoint"
              ? { ...row, waypoint: { ...row.waypoint, coreChangeLabel: "Core change", spotlight: { label: "Spotlight", classifications: [{ key: "database-read", label: "Database read" }] } } }
              : row)),
          })),
        },
      })),
    }
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: spotlitPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "d" })

    expect(await screen.findByText("Database read")).toBeTruthy()
    expect(screen.getByText("Spotlight")).toBeTruthy()
  })

  it("marks the current waypoint reviewed with S and moves on to the next one", async () => {
    const setReviewed = vi.fn(() => ({ data: { isReviewed: true } }))
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: twoFilePage }), "review.setReviewed": setReviewed })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect((await within(navigator).findByRole("button", { name: "Mark as reviewed" })).getAttribute("aria-disabled")).toBe("true")

    fireEvent.keyDown(window, { key: "d" })
    await screen.findByText("Reading of Held units reduce the price.")
    fireEvent.keyDown(window, { key: "s" })

    await waitFor(() => {
      expect(setReviewed).toHaveBeenCalledWith(expect.objectContaining({ subject: { kind: "waypoint", id: "price-of" }, isReviewed: true }))
    })
    expect(markOf("The sum is rounded once").getAttribute("data-current")).toBe("true")
  })

  it("expands the current waypoint with R, as its card says, and collapses it again", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })
    await within(navigator).findByRole("button", { name: "Expand waypoint" })

    fireEvent.keyDown(window, { key: "d" })

    expect((await screen.findByRole("button", { name: "Expand" })).querySelector("kbd")?.textContent).toBe("r")

    fireEvent.keyDown(window, { key: "r" })

    expect(await screen.findByRole("region", { name: "Held units reduce the price" })).toBeTruthy()
    expect(await within(navigator).findByRole("button", { name: "Collapse waypoint" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "r" })

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Held units reduce the price" })).toBeNull()
    })
  })

  it("starts a comment on the lines of the current waypoint with C", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Add comment" })

    fireEvent.keyDown(window, { key: "d" })
    await screen.findByText("Reading of Held units reduce the price.")
    fireEvent.keyDown(window, { key: "c" })

    expect(await screen.findByRole("textbox", { name: "Leave a comment, src/price.ts 11" })).toBeTruthy()
  })

  it("collapses the files of the walkthrough on screen with Q", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Collapse all" })

    fireEvent.keyDown(window, { key: "q" })

    expect(await screen.findByRole("button", { name: "Expand file: src/price.ts" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Collapse file: src/cart.ts" })).toBeTruthy()
  })

  it("brings the head of the walkthrough back when Q collapses every file of it", async () => {
    placeOnScreen({ "stock-code-walkthrough": { y: -2000, height: 6000 }, "stock-file-1": { y: -1500, height: 4000 } })
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Collapse all" })

    fireEvent.keyDown(window, { key: "q" })

    await screen.findByRole("button", { name: "Expand file: src/price.ts" })
    expect(scrolledAnchorIds()).toStrictEqual(["stock-code-walkthrough"])
  })

  it("keeps the file being read in place when E collapses it", async () => {
    placeOnScreen({ "stock-code-walkthrough": { y: -2000, height: 6000 }, "stock-file-1": { y: -1500, height: 4000 } })
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Collapse file" })

    fireEvent.keyDown(window, { key: "e" })

    await screen.findByRole("button", { name: "Expand file: src/price.ts" })
    expect(scrolledAnchorIds()).toStrictEqual(["stock-file-1"])
  })

  it("leaves the page where it is when Q collapses the files of a walkthrough not yet read into", async () => {
    placeOnScreen({ "stock-code-walkthrough": { y: 100, height: 6000 }, "stock-file-1": { y: 180, height: 4000 } })
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Collapse all" })

    fireEvent.keyDown(window, { key: "q" })

    await screen.findByRole("button", { name: "Expand file: src/price.ts" })
    expect(scrolledAnchorIds()).toStrictEqual([])
  })

  it("sends the chosen filter to the backend for the whole review", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": getReview })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "f" })
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /Bug/ }))

    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ filterKeys: ["bug"], isShowingReviewed: false }))
    })
  })

  it("goes to the first waypoint not reviewed yet once the filtered review arrives, in whichever segment it is", async () => {
    const filtered = withBugTicked(withReviewed(artifactPage, ["price-of"]))
    const getReview = vi.fn((input: unknown) => ({ data: asksForBug(input) ? filtered : artifactPage }))
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": getReview })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "f" })
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /Bug/ }))

    await waitFor(() => {
      expect(scrolledAnchorIds()).toContain("waypoint-subtotal")
    })
    expect(scrolledAnchorIds()).not.toContain("waypoint-price-of")
  })

  it("keeps the head of the walkthrough in place when every waypoint the filter keeps is reviewed", async () => {
    const filtered = withBugTicked(withReviewed(artifactPage, ["price-of", "subtotal"]))
    const getReview = vi.fn((input: unknown) => ({ data: asksForBug(input) ? filtered : artifactPage }))
    placeOnScreen({ "stock-code-walkthrough": { y: -2000, height: 6000 }, "stock-file-1": { y: -1500, height: 4000 } })
    renderReview({ "review.get": getReview })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "f" })
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /Bug/ }))

    await waitFor(() => {
      expect(scrolledAnchorIds()).toStrictEqual(["stock-code-walkthrough"])
    })
  })

  it("stores a reviewed mark and reads the review again", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    const setReviewed = vi.fn(() => ({ data: { isReviewed: true } }))
    renderReview({ "review.get": getReview, "review.setReviewed": setReviewed })
    fireEvent.click(await screen.findByRole("button", { name: "Waypoint 1 of 2: Held units reduce the price", expanded: false }))
    const box = await screen.findByRole("region", { name: "Held units reduce the price" })

    fireEvent.click(within(box).getByRole("button", { name: "Reviewed" }))

    await waitFor(() => {
      expect(setReviewed).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(getReview.mock.calls.length).toBeGreaterThan(1)
    })
  })

  it("shows a reviewer's comment under its line, and takes a new comment on a line through the text editor", async () => {
    const addComment = vi.fn(() => ({ data: { message: null } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.addComment": addComment })
    const file = await screen.findByRole("article", { name: "Cart file" })

    expect(screen.queryByText("Can this go negative?")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Open thread, Line 11" }))

    expect(screen.getByText("Can this go negative?")).toBeTruthy()

    fireEvent.click(within(file).getByRole("button", { name: "Add a comment on this line 3" }))
    const editorBox = await within(file).findByRole("textbox", { name: "Leave a comment, src/cart.ts 3" })
    expect(within(file).getByRole("toolbar", { name: "Leave a comment, src/cart.ts 3 formatting" })).toBeTruthy()
    typeInto(editorBox, "Round here?")
    fireEvent.click(within(file).getByRole("button", { name: "Add to review" }))

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-412",
        position: { path: "src/cart.ts", side: "new", startLine: 3, endLine: 3 },
        body: "Round here?",
        shouldPostNow: false,
      })
    })
    await waitFor(() => {
      expect(within(file).queryByRole("textbox")).toBeNull()
    })
  })

  it("replies to a thread and resolves it", async () => {
    const replyToThread = vi.fn(() => ({ data: { message: null } }))
    const resolveThread = vi.fn(() => ({ data: { message: null } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.replyToThread": replyToThread, "review.resolveThread": resolveThread })
    fireEvent.click(await screen.findByRole("button", { name: "Open thread, Line 11" }))
    const thread = await screen.findByRole("region", { name: "src/price.ts 11" })

    fireEvent.click(within(thread).getByRole("button", { name: "Reply" }))
    typeInto(await within(thread).findByRole("textbox", { name: "Reply, src/price.ts 11" }), "Clamping it.")
    fireEvent.click(within(thread).getByRole("button", { name: "Reply" }))
    await waitFor(() => {
      expect(replyToThread).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", threadId: "thread-1", body: "Clamping it." })
    })

    fireEvent.click(await within(thread).findByRole("button", { name: "Resolve conversation" }))
    await waitFor(() => {
      expect(resolveThread).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", threadId: "thread-1", isResolved: true })
    })
  })

  it("shows the code host's reason when a comment is refused", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.resolveThread": () => ({ errorMessage: "Resource not accessible by integration" }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Open thread, Line 11" }))
    fireEvent.click(await screen.findByRole("button", { name: "Resolve conversation" }))

    expect(await screen.findByText("Resource not accessible by integration")).toBeTruthy()
  })

  it("shows the pull request's conversation with each review's verdict, and posts a comment on it", async () => {
    const addComment = vi.fn(() => ({ data: { message: null } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.addComment": addComment })

    const conversation = await screen.findByRole("region", { name: "Conversation" })

    expect(within(conversation).getByText("Approved")).toBeTruthy()
    expect(within(conversation).getByText("The direction is right.")).toBeTruthy()

    typeInto(await within(conversation).findByRole("textbox", { name: "Leave a comment" }), "Thanks for this.")
    fireEvent.click(within(conversation).getByRole("button", { name: "Comment" }))

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", position: null, body: "Thanks for this.", shouldPostNow: true })
    })
  })

  it("submits a review with its summary and verdict, and discards a pending comment from the panel", async () => {
    const submit = vi.fn(() => ({ data: { message: null } }))
    const discardComment = vi.fn(() => ({ data: { message: null } }))
    const withPending = {
      ...artifactPage,
      reviewDraft: { ...artifactPage.reviewDraft, buttonLabel: "Submit review (1)", pendingComments: [pendingComment] },
    }
    renderReview({ "review.get": () => ({ data: withPending }), "review.submit": submit, "review.discardComment": discardComment })

    fireEvent.click(await screen.findByRole("button", { name: "Submit review (1)" }))
    const panel = await screen.findByRole("dialog")
    fireEvent.click(within(panel).getByRole("button", { name: "Discard: src/cart.ts, line 3" }))
    await waitFor(() => {
      expect(discardComment).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", commentId: "pending-1" })
    })

    typeInto(await within(panel).findByRole("textbox", { name: "Leave a summary for the author" }), "Looks right.")
    fireEvent.click(within(panel).getByRole("button", { name: "Submit review" }))

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", verdict: "comment", body: "Looks right." })
    })
    expect(await screen.findByText("Review submitted")).toBeTruthy()
  })

  it("requests a reviewer found by a search, and asks one who answered for another review", async () => {
    const searchReviewers = vi.fn(() => ({ data: [{ login: "lena", name: "Lena Ito", detail: "@lena", avatarUrl: null, monogram: "LI" }] }))
    const requestReviewer = vi.fn(() => ({ data: { message: null } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.searchReviewers": searchReviewers, "review.requestReviewer": requestReviewer })
    const band = await screen.findByRole("banner")

    expect(searchReviewers).not.toHaveBeenCalled()

    fireEvent.click(await within(band).findByRole("button", { name: "Request a reviewer" }))
    fireEvent.click(await screen.findByRole("button", { name: "Request Lena Ito" }))
    await waitFor(() => {
      expect(requestReviewer).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", login: "lena" })
    })

    fireEvent.click(within(within(band).getByRole("list", { name: "Reviewers" })).getByRole("button", { name: /jonas/ }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Request a review from jonas again" }))
    await waitFor(() => {
      expect(requestReviewer).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", login: "jonas" })
    })
  })

  it("opens the chat panel from the activity bar and hides it again", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: null }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))

    const panel = await screen.findByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByText("Agent offline")).toBeTruthy()
    expect(within(panel).getByText("Ask about this review.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Hide chat" }))

    expect(screen.queryByRole("complementary", { name: "Chat with the agent" })).toBeNull()
    expect(screen.queryByRole("complementary", { name: "Sections" })).toBeNull()
  })

  it("lists the changed files in the explorer, each a link to its code panel", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })

    expect(within(explorer).getByText("3 files • 1 not in the walkthrough")).toBeTruthy()
    expect(within(explorer).getByRole("link", { name: /cart\.ts/ }).getAttribute("href")).toBe("#checkout-file-1")
    expect(within(explorer).getByRole("link", { name: /price\.ts/ }).getAttribute("href")).toBe("#stock-file-1")
    expect(within(explorer).queryByRole("link", { name: /package\.json/ })).toBeNull()
    expect(within(explorer).getByText("Not covered")).toBeTruthy()
    expect(within(explorer).getByRole("img", { name: "1 of 4 waypoints reviewed" })).toBeTruthy()
  })

  it("folds a folder of the explorer", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    fireEvent.click(within(explorer).getByRole("button", { name: "src" }))

    expect(within(explorer).queryByRole("link", { name: /cart\.ts/ })).toBeNull()
    expect(within(explorer).getByRole("button", { name: "src" }).getAttribute("aria-expanded")).toBe("false")
  })

  it("hides the explorer and shows it again, by its buttons and by Ctrl+E", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    fireEvent.click(within(explorer).getByRole("button", { name: "Hide changed files" }))

    expect(screen.queryByRole("complementary", { name: "Changed files" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show changed files" }))
    expect(await screen.findByRole("complementary", { name: "Changed files" })).toBeTruthy()

    fireEvent.keyDown(window, { key: "e", ctrlKey: true })
    expect(screen.queryByRole("complementary", { name: "Changed files" })).toBeNull()

    fireEvent.keyDown(window, { key: "e", ctrlKey: true })
    expect(await screen.findByRole("complementary", { name: "Changed files" })).toBeTruthy()
  })

  it("keeps the width the reviewer gives a docked panel when the page opens again", async () => {
    const first = renderReview({ "review.get": () => ({ data: artifactPage }) })
    fireEvent.keyDown(await screen.findByRole("slider", { name: "Changed files width" }), { key: "ArrowRight" })
    const chosen = screen.getByRole("complementary", { name: "Changed files" }).parentElement?.style.width ?? ""
    first.unmount()

    renderReview({ "review.get": () => ({ data: artifactPage }) })

    expect(chosen).not.toBe("296px")
    expect((await screen.findByRole("complementary", { name: "Changed files" })).parentElement?.style.width).toBe(chosen)
    expect(JSON.parse(window.localStorage.getItem("flight-plan:layout:v1") ?? "{}")).toMatchObject({ explorerWidthPx: Number.parseInt(chosen, 10) })
    window.localStorage.removeItem("flight-plan:layout:v1")
  })

  it("shows the sections or the chat in the right panel, and hides it when the open one is pressed again", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: null }),
    })

    const panels = await screen.findByRole("navigation", { name: "Panels" })
    expect(await screen.findByRole("complementary", { name: "Sections" })).toBeTruthy()
    expect(within(panels).getByRole("button", { name: "Sections" }).getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(within(panels).getByRole("button", { name: "Chat" }))

    expect(await screen.findByRole("complementary", { name: "Chat with the agent" })).toBeTruthy()
    expect(screen.queryByRole("complementary", { name: "Sections" })).toBeNull()

    fireEvent.keyDown(window, { key: "a", ctrlKey: true })

    expect(await screen.findByRole("complementary", { name: "Sections" })).toBeTruthy()
    expect(screen.queryByRole("complementary", { name: "Chat with the agent" })).toBeNull()

    fireEvent.click(within(panels).getByRole("button", { name: "Sections" }))

    expect(screen.queryByRole("complementary", { name: "Sections" })).toBeNull()
  })

  it("leaves Ctrl+C to copying while text is selected", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: null }),
    })
    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    window.getSelection()?.selectAllChildren(within(explorer).getByRole("heading", { name: "Changed files" }))

    fireEvent.keyDown(window, { key: "c", ctrlKey: true })

    expect(screen.queryByRole("complementary", { name: "Chat with the agent" })).toBeNull()

    window.getSelection()?.removeAllRanges()
    fireEvent.keyDown(window, { key: "c", ctrlKey: true })

    expect(await screen.findByRole("complementary", { name: "Chat with the agent" })).toBeTruthy()
  })

  it("filters the waypoints from the explorer's own Filter menu, with no key of its own", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    renderReview({ "review.get": getReview })

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    fireEvent.click(within(explorer).getByRole("menuitem", { name: /Filter/ }))
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /Bug/ }))

    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ filterKeys: ["bug"] }))
    })
  })

  it("clears the waypoint filter from the explorer", async () => {
    const filteredPage = {
      ...artifactPage,
      fileExplorer: { ...artifactPage.fileExplorer, filter: { label: "Filtered by", values: ["Bug"], clearLabel: "Clear" } },
    }
    const getReview = vi.fn((input: unknown) => ({ data: asksForBug(input) ? filteredPage : artifactPage }))
    renderReview({ "review.get": getReview }, `${REVIEW_PATH}?filter=%5B%22bug%22%5D`)

    const explorer = await screen.findByRole("complementary", { name: "Changed files" })
    fireEvent.click(await within(explorer).findByRole("button", { name: "Clear" }))

    await waitFor(() => {
      expect(getReview).toHaveBeenLastCalledWith(expect.objectContaining({ filterKeys: [] }))
    })
  })

  it("sends a message to the agent from the chat panel", async () => {
    const sendMessage = vi.fn(() => ({ data: { kind: "sent", messageId: "m1" } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: null }),
      "conversation.sendMessage": sendMessage,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))
    const panel = await screen.findByRole("complementary", { name: "Chat with the agent" })
    fireEvent.change(within(panel).getByRole("textbox", { name: "Ask about this review" }), { target: { value: "Why the retry?" } })
    fireEvent.click(within(panel).getByRole("button", { name: "Send" }))

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", body: "Why the retry?", reference: null })
    })
  })

  it("answers the agent's permission request from the chat panel", async () => {
    const answerQuestions = vi.fn(() => ({ data: { kind: "accepted" } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: permissionReply }),
      "conversation.modelChoice": () => ({ data: null }),
      "conversation.answerQuestions": answerQuestions,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))
    const request = await screen.findByRole("region", { name: "The agent asks for permission" })
    fireEvent.click(within(request).getByRole("radio", { name: /Deny/ }))
    fireEvent.change(within(request).getByRole("textbox", { name: "Why, for the agent (optional)" }), { target: { value: "Not on main." } })
    fireEvent.click(within(request).getByRole("button", { name: "Send" }))

    await waitFor(() => {
      expect(answerQuestions).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-412",
        batchId: "p1",
        answers: [{ questionId: "p1-1", pickedLabels: ["Deny"], text: "Not on main." }],
      })
    })
  })

  it("asks to start the agent when a review that was offered opens while it is offline, and opens a terminal for it", async () => {
    const openAgentTerminal = vi.fn(() => ({ data: { kind: "opened", message: "Claude is starting in Terminal." } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.liveAgent": () => ({ data: liveAgentReply(false) }),
      "review.openAgentTerminal": openAgentTerminal,
    })

    const dialog = await screen.findByRole("dialog", { name: "Claude is offline" })
    expect(within(dialog).getByText("/flightplan:live storefront/pr-412")).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Open a terminal for me" }))

    expect(await screen.findByText("Claude is starting in Terminal.")).toBeTruthy()
    expect(openAgentTerminal).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Claude is offline" })).toBeNull()
    })
  })

  it("keeps the Launch Agent dialog closed after Not now, and opens it again from the offline status in the top bar", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.liveAgent": () => ({ data: liveAgentReply(false) }),
    })

    const dialog = await screen.findByRole("dialog", { name: "Claude is offline" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Not now" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Claude is offline" })).toBeNull()
    })

    fireEvent.click(screen.getByRole("button", { name: "Claude offline" }))

    expect(await screen.findByRole("dialog", { name: "Claude is offline" })).toBeTruthy()
  })

  it("asks to start the agent once the reviewer asks it for the write-up", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: writeUpPlan }),
      "review.writeUp": () => ({ data: { kind: "started", prompt: null, message: "Sent to Claude" } }),
      "review.liveAgent": () => ({ data: liveAgentReply(false) }),
    })

    const writeUpDialog = await screen.findByRole("dialog", { name: "Ask Claude to explain this review?" })
    expect(screen.queryByRole("dialog", { name: "Claude is offline" })).toBeNull()
    fireEvent.click(within(writeUpDialog).getByRole("button", { name: "Explain" }))

    expect(await screen.findByRole("dialog", { name: "Claude is offline" })).toBeTruthy()
  })

  it("asks nothing while the agent is online, and says so in the top bar", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.liveAgent": () => ({ data: liveAgentReply(true) }),
    })

    expect(await screen.findByText("Claude online")).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("tells Flight Plan the reviewer is on the review only while the page is showing", async () => {
    const recordActivity = vi.fn(() => ({ data: { kind: "recorded" } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.recordActivity": recordActivity })

    await waitFor(() => {
      expect(recordActivity).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
    })
    const reportsWhileShowing = recordActivity.mock.calls.length
    showPage("hidden")
    expect(recordActivity).toHaveBeenCalledTimes(reportsWhileShowing)
    showPage("visible")

    await waitFor(() => {
      expect(recordActivity).toHaveBeenCalledTimes(reportsWhileShowing + 1)
    })
  })

  it("asks to start the agent again when the reviewer comes back to a review whose agent stopped while it sat idle", async () => {
    const liveAgent = vi.fn(() => ({ data: liveAgentReply(true) }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.writeUpPlan": () => ({ data: { ...writeUpPlan, isOffered: true } }),
      "review.liveAgent": liveAgent,
    })
    expect(await screen.findByText("Claude online")).toBeTruthy()

    showPage("hidden")
    liveAgent.mockReturnValue({ data: liveAgentReply(false, "2026-10-03T12:10:00.000Z") })
    showPage("visible")

    expect(await screen.findByRole("dialog", { name: "Claude is offline" })).toBeTruthy()
  })

  it("switches the agent's model from the chat panel", async () => {
    const chooseModel = vi.fn(() => ({ data: { kind: "chosen" } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: modelChoiceReply }),
      "conversation.chooseModel": chooseModel,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))
    fireEvent.change(await screen.findByRole("combobox", { name: "Model for Claude" }), { target: { value: "haiku" } })

    await waitFor(() => {
      expect(chooseModel).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", model: "haiku" })
    })
  })

  it("publishes the review artifact from the share menu", async () => {
    const publish = vi.fn(() => ({ data: { message: "Published as a Claude artifact" } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.publish": publish })

    fireEvent.click(await screen.findByRole("button", { name: "Share" }))
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }))

    expect(await screen.findByText("Published as a Claude artifact")).toBeTruthy()
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it("shows the backend's reason when a review is refused", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.submit": () => ({ errorMessage: "Write a summary or a comment before you submit." }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Submit review" }))
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Submit review" }))

    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("Write a summary or a comment before you submit.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Troubleshoot" })).toBeTruthy()
  })

  it("says why Flight Plan could not build the review, without the review actions", async () => {
    renderReview({ "review.get": () => ({ data: missingPage }) })

    expect(await screen.findByRole("heading", { name: "Flight Plan could not build this review" })).toBeTruthy()
    expect(screen.getByText("This change touches no files, so there is nothing to review.")).toBeTruthy()
    expect(within(screen.getByRole("banner")).getByText("10 changed files")).toBeTruthy()
    expect(within(screen.getByRole("banner")).getByText("4 TypeScript")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull()
    expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1)
    expect(screen.queryByRole("navigation", { name: "Review sections" })).toBeNull()
  })

  it("shows a Flight Plan of another version as a page to convert, and the review once it is converted", async () => {
    const migrateReview = vi.fn(() => ({ data: { message: "Flight Plan updated" } }))
    renderReview({
      "review.get": () => ({ data: migrateReview.mock.calls.length === 0 ? needsMigrationPage : artifactPage }),
      "review.migrate": migrateReview,
    })

    expect(await screen.findByRole("heading", { name: "This Flight Plan comes from a newer version" })).toBeTruthy()
    expect(screen.getByText("npm install -g @kidlat-dakila/flightplan@latest")).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "Review sections" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Convert and open" }))

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(migrateReview).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
  })

  it("shows the falling plane, the backend's message and a way back when the review cannot be opened", async () => {
    renderReview({ "review.get": () => ({ errorMessage: "This review target is not listed in Flight Plan." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "MAYDAY! MAYDAY! We couldn't open this review" })).toBeTruthy()
    expect(alert.querySelector("img[src='/server-error.svg']")).not.toBeNull()
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy()
    expect(within(alert).getByText("This review target is not listed in Flight Plan.")).toBeTruthy()
    expect(within(alert).getByRole("link", { name: "Go to your repositories" }).getAttribute("href")).toBe("/")
  })

  it("tells the reviewer about changed files that are in no segment, and lists them", async () => {
    renderReview({ "review.get": () => ({ data: { ...artifactPage, unassignedFiles } }) })

    expect(await screen.findByText("1 changed file is in no segment of this Flight Plan.")).toBeTruthy()
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: "1 file in no segment" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show the files" }))

    expect(within(await screen.findByRole("dialog", { name: "Changed files in no segment" })).getByText("src/rates.ts")).toBeTruthy()
  })

  it("warns about changed files in no segment before it publishes, and publishes once that is confirmed", async () => {
    const publish = vi.fn(() => ({ data: { message: "Published as a Claude artifact" } }))
    renderReview({ "review.get": () => ({ data: { ...artifactPage, unassignedFiles } }), "review.publish": publish })

    fireEvent.click(await screen.findByRole("button", { name: "Share" }))
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }))
    const dialog = await screen.findByRole("dialog", { name: "Changed files in no segment" })

    expect(within(dialog).getByText("1 changed file is in no segment. The reviewer is told so when they open the Flight Plan.")).toBeTruthy()
    expect(publish).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole("button", { name: "Publish anyway" }))

    expect(await screen.findByText("Published as a Claude artifact")).toBeTruthy()
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it("offers no editing of the segments on the reviewer's page", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(stock).queryByRole("button", { name: "Edit segment" })).toBeNull()
    expect(within(stock).queryByRole("button", { name: "Delete" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add a segment" })).toBeNull()
    expect(within(screen.getByRole("navigation", { name: "Review sections" })).queryByRole("button")).toBeNull()
  })

  it("renders a Flight Plan that has no segments with its sign band and nothing below it", async () => {
    const emptyPage = { ...artifactPage, rail: { groups: [], sections: [] }, segments: [] }
    renderReview({ "review.get": () => ({ data: emptyPage }) })

    const band = await screen.findByRole("banner")

    expect(await within(band).findByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(screen.queryByRole("region", { name: /Segment/ })).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("offers no editing of the context on the reviewer's page", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(stock).getByText("Why stock matters.")).toBeTruthy()
    expect(within(stock).queryByRole("button", { name: "Edit" })).toBeNull()
  })
})
