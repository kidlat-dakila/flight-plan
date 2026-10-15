import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"
import {
  artifactPage,
  conversationReply,
  missingPage,
  modelChoiceReply,
  permissionReply,
  NO_OFFERS,
  offerOf,
  pendingComment,
  showSectionInView,
  typeInto,
  unassignedFiles,
} from "./review-page-fixture"

const REVIEW_PATH = "/pr-reviews/storefront/pr-412"

const WRITING_PROGRESS = {
  state: "writing",
  label: "Claude is writing the review",
  message: "You can read the code meanwhile.",
  isWriting: true,
  countLabel: "3 of 12 parts written",
  writtenCount: 3,
  totalCount: 12,
  prompt: null,
  permission: null,
}

const PERMISSION_REQUEST = {
  batchId: "p1",
  questionId: "p1-1",
  title: "Allow the agent to use Bash?",
  description: "The agent is waiting for your answer before it goes on writing the review.",
  detail: "pnpm test",
  allowLabel: "Allow",
  denyLabel: "Deny",
  reasonLabel: "Tell the agent why, if you deny it",
}

const ASKING_PROGRESS = { ...WRITING_PROGRESS, permission: PERMISSION_REQUEST }

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

const EMPTY_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }

const renderReview = (handlers: ProcedureHandlers, path = REVIEW_PATH) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the review page", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
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
    expect(within(band).getByRole("button", { name: "Chat" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Share" })).toBeTruthy()
    expect(within(band).getByRole("button", { name: "Submit review" })).toBeTruthy()

    fireEvent.click(within(band).getByRole("button", { name: "More actions" }))

    expect((await screen.findByRole("menuitem", { name: "View pull request" })).getAttribute("href")).toBe("https://forge.test/pull/412")
    expect(screen.getByRole("menuitem", { name: "Update the Flight Plan" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Regenerate from scratch" })).toBeTruthy()
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

  it("opens the start form in a dialog to update the Flight Plan and warns that another configuration is a total rewrite", async () => {
    const rebuild = vi.fn(() => ({ data: { kind: "rebuilt", prompt: null, message: "Review started" } }))
    const rebuildForm = vi.fn(() => ({
      data: {
        title: "Update the Flight Plan",
        description: "Flight Plan pulls the branch and builds the review again.",
        form: {
          ...missingPage.form,
          configuration: {
            ...missingPage.form.configuration,
            options: missingPage.form.configuration.options.map((option) => ({
              ...option,
              rewriteNotice: option.configurationId === "standard" ? null : "A different configuration is a total rewrite.",
            })),
          },
        },
      },
    }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.rebuildForm": rebuildForm, "review.rebuild": rebuild })

    fireEvent.click(await screen.findByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Update the Flight Plan" }))

    const dialog = await screen.findByRole("dialog", { name: "Update the Flight Plan" })
    expect(rebuildForm).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412", mode: "update" })
    expect(within(dialog).queryByText("A different configuration is a total rewrite.")).toBeNull()

    fireEvent.click(within(dialog).getByRole("button", { name: "Configuration: Standard" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Onboardee/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))

    expect(await screen.findByText("A different configuration is a total rewrite.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Start the review" }))

    expect(await screen.findByText("Review started")).toBeTruthy()
    expect(rebuild).toHaveBeenCalledWith(expect.objectContaining({
      repositoryName: "storefront",
      targetId: "pr-412",
      mode: "update",
      configurationId: "onboardee",
    }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("asks for a regeneration from scratch from the same dialog", async () => {
    const rebuild = vi.fn(() => ({ data: { kind: "rebuilt", prompt: null, message: "Review started" } }))
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "review.rebuildForm": () => ({ data: { title: "Regenerate from scratch", description: "Everything is written again.", form: missingPage.form } }),
      "review.rebuild": rebuild,
    })

    fireEvent.click(await screen.findByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Regenerate from scratch" }))
    const dialog = await screen.findByRole("dialog", { name: "Regenerate from scratch" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Start the review" }))

    await waitFor(() => {
      expect(rebuild).toHaveBeenCalledWith(expect.objectContaining({ mode: "regenerate", configurationId: "standard" }))
    })
  })

  it("deletes the review artifact and shows the page without one", async () => {
    const deleteReview = vi.fn(() => ({ data: { message: "Flight Plan deleted" } }))
    renderReview({
      "review.get": () => ({ data: deleteReview.mock.calls.length === 0 ? artifactPage : missingPage }),
      "review.delete": deleteReview,
    })

    fireEvent.click(await screen.findByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    expect(await screen.findByRole("heading", { name: "No Flight Plan Review yet" })).toBeTruthy()
    expect(deleteReview).toHaveBeenCalledWith({ repositoryName: "storefront", targetId: "pr-412" })
  })

  it("asks the backend for the review target in the address", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    renderReview({ "review.get": getReview })

    await screen.findByText("Why stock matters.")

    expect(getReview).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryName: "storefront", targetId: "pr-412", filterKeys: null, isShowingReviewed: false }),
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

  it("says a part is not written, with no skeleton, once the agent stopped", async () => {
    const stopped = { ...WRITING_PROGRESS, state: "stopped", label: "Claude stopped before the review was finished", isWriting: false }
    renderReview({ "review.get": () => ({ data: { ...withUnwrittenContext, progress: stopped } }) })

    expect(await screen.findAllByText("Claude stopped before the review was finished")).toHaveLength(1)
    expect(screen.getByText("Not written yet.")).toBeTruthy()
  })

  it("copies the prompt again while the reviewer's own agent is awaited", async () => {
    const writeText = vi.fn(async () => {
      await Promise.resolve()
    })
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const waiting = { ...WRITING_PROGRESS, state: "waiting", label: "Waiting for your agent", prompt: { label: "Copy the prompt", text: "Review pull request #412.", copiedMessage: "Prompt copied" } }
    renderReview({ "review.get": () => ({ data: { ...artifactPage, progress: waiting } }) })

    fireEvent.click(await screen.findByRole("button", { name: "Copy the prompt" }))

    expect(writeText).toHaveBeenCalledWith("Review pull request #412.")
    expect(await screen.findByText("Prompt copied")).toBeTruthy()
  })

  it("puts a navigator at the foot of the page in place of the walkthrough's controls and the Back to top button", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect(await within(navigator).findByRole("button", { name: "Next waypoint" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Back to top" })).toBeNull()
    expect(screen.getAllByRole("button", { name: "Next waypoint" })).toHaveLength(1)
  })

  it("steps through the waypoints across segments from the navigator, and opens the one it lands on", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })
    const nextButton = await within(navigator).findByRole("button", { name: "Next waypoint" })

    expect(screen.queryByText("Reading of Held units reduce the price.")).toBeNull()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()
    expect(screen.getByRole("region", { name: "Held units reduce the price" }).getAttribute("data-current")).toBe("true")
    expect(within(navigator).getByText("1 of 2")).toBeTruthy()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of The sum is rounded once.")).toBeTruthy()
    expect(screen.getByRole("region", { name: "The sum is rounded once" }).getAttribute("data-current")).toBe("true")
    expect(within(navigator).getByRole("button", { name: "Next waypoint" })).toHaveProperty("disabled", true)
  })

  it("steps with D and A", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "d" })

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()

    fireEvent.keyDown(window, { key: "d" })
    fireEvent.keyDown(window, { key: "a" })

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Held units reduce the price" }).getAttribute("data-current")).toBe("true")
    })
  })

  it("marks the current waypoint reviewed with S and moves on to the next one", async () => {
    const setReviewed = vi.fn(() => ({ data: { isReviewed: true } }))
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.setReviewed": setReviewed })
    const navigator = await screen.findByRole("toolbar", { name: "Review navigator" })

    expect(await within(navigator).findByRole("button", { name: "Mark as reviewed" })).toHaveProperty("disabled", true)

    fireEvent.keyDown(window, { key: "d" })
    await screen.findByText("Reading of Held units reduce the price.")
    fireEvent.keyDown(window, { key: "s" })

    await waitFor(() => {
      expect(setReviewed).toHaveBeenCalledWith(expect.objectContaining({ subject: { kind: "waypoint", id: "price-of" }, isReviewed: true }))
    })
    expect(screen.getByRole("region", { name: "The sum is rounded once" }).getAttribute("data-current")).toBe("true")
  })

  it("hides the waypoints with X and shows them again when stepping", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await screen.findByRole("region", { name: "Held units reduce the price" })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Hide waypoints" })

    fireEvent.keyDown(window, { key: "x" })

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Held units reduce the price" })).toBeNull()
    })
    expect(screen.getByText("export const priceOf = () => 1", { exact: false })).toBeTruthy()

    fireEvent.keyDown(window, { key: "d" })

    expect(await screen.findByRole("region", { name: "Held units reduce the price" })).toBeTruthy()
  })

  it("collapses the files of the walkthrough on screen with Q", async () => {
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Collapse all" })

    fireEvent.keyDown(window, { key: "q" })

    expect(await screen.findByRole("button", { name: "Expand file: src/price.ts" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Collapse file: src/cart.ts" })).toBeTruthy()
  })

  it("sends the chosen filter to the backend", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    showSectionInView("stock-code-walkthrough")
    renderReview({ "review.get": getReview })
    await within(await screen.findByRole("toolbar", { name: "Review navigator" })).findByRole("button", { name: "Next waypoint" })

    fireEvent.keyDown(window, { key: "f" })
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /Bug/ }))

    await waitFor(() => {
      expect(getReview).toHaveBeenCalledWith(expect.objectContaining({ filterKeys: ["bug"] }))
    })
  })

  it("stores a reviewed mark and reads the review again", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    const setReviewed = vi.fn(() => ({ data: { isReviewed: true } }))
    renderReview({ "review.get": getReview, "review.setReviewed": setReviewed })
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

  it("opens the chat panel from the band and closes it again", async () => {
    renderReview({
      "review.get": () => ({ data: artifactPage }),
      "conversation.watch": () => ({ data: conversationReply }),
      "conversation.modelChoice": () => ({ data: null }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))

    const panel = await screen.findByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByText("Agent not running")).toBeTruthy()
    expect(within(panel).getByText("Ask about this review.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the chat" }))

    expect(screen.queryByRole("complementary", { name: "Chat with the agent" })).toBeNull()
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

  it("asks in a modal whether to let the writing agent use a tool, and closes it once allowed", async () => {
    const answerQuestions = vi.fn(() => ({ data: { kind: "accepted" } }))
    const reviewGet = vi.fn()
      .mockReturnValueOnce({ data: { ...artifactPage, progress: ASKING_PROGRESS } })
      .mockReturnValue({ data: { ...artifactPage, progress: WRITING_PROGRESS } })
    renderReview({ "review.get": reviewGet, "conversation.answerQuestions": answerQuestions })

    const dialog = await screen.findByRole("dialog", { name: "Allow the agent to use Bash?" })
    expect(within(dialog).getByText("pnpm test")).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Allow" }))

    await waitFor(() => {
      expect(answerQuestions).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-412",
        batchId: "p1",
        answers: [{ questionId: "p1-1", pickedLabels: ["Allow"], text: null }],
      })
    })
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Allow the agent to use Bash?" })).toBeNull()
    })
  })

  it("denies the writing agent a tool from the modal, with the reason the reviewer gives", async () => {
    const answerQuestions = vi.fn(() => ({ data: { kind: "accepted" } }))
    renderReview({ "review.get": () => ({ data: { ...artifactPage, progress: ASKING_PROGRESS } }), "conversation.answerQuestions": answerQuestions })

    const dialog = await screen.findByRole("dialog", { name: "Allow the agent to use Bash?" })
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Tell the agent why, if you deny it" }), { target: { value: "Not on main." } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Deny" }))

    await waitFor(() => {
      expect(answerQuestions).toHaveBeenCalledWith({
        repositoryName: "storefront",
        targetId: "pr-412",
        batchId: "p1",
        answers: [{ questionId: "p1-1", pickedLabels: ["Deny"], text: "Not on main." }],
      })
    })
  })

  it("shows no permission modal while the agent writes without asking", async () => {
    renderReview({ "review.get": () => ({ data: { ...artifactPage, progress: WRITING_PROGRESS } }) })

    expect(await screen.findByText("Claude is writing the review")).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
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

    expect((await screen.findByRole("alert")).textContent).toBe("Write a summary or a comment before you submit.")
  })

  it("offers the start form for a review target that has no review, without the review actions", async () => {
    renderReview({ "review.get": () => ({ data: missingPage }) })

    expect(await screen.findByRole("heading", { name: "No Flight Plan Review yet" })).toBeTruthy()
    expect(within(screen.getByRole("banner")).getByText("10 changed files")).toBeTruthy()
    expect(within(screen.getByRole("banner")).getByText("4 TypeScript")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Configuration: Standard" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Order of the Code Walkthrough: Foundations first" })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /^Claude/ }).checked).toBe(true)
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Model for Claude" }).value).toBe("default")
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Default" }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /^Codex/ }).disabled).toBe(true)
    expect(screen.getByText(/Flight Plan cannot start Codex yet/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull()
    expect(screen.queryByRole("navigation", { name: "Review sections" })).toBeNull()
  })

  it("requests the review from the chosen agent with the chosen configuration, order and model", async () => {
    const request = vi.fn(() => ({ data: { kind: "requested", prompt: null, message: "Review requested" } }))
    renderReview({ "review.get": () => ({ data: missingPage }), "review.request": request })

    fireEvent.click(await screen.findByRole("button", { name: "Configuration: Standard" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Onboardee/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    fireEvent.click(screen.getByRole("button", { name: "Order of the Code Walkthrough: Foundations first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Risk first/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Model for Claude" }), { target: { value: "opus" } })
    fireEvent.click(screen.getByRole("radio", { name: "High" }))
    fireEvent.click(screen.getByRole("button", { name: "Start the review" }))

    expect(await screen.findByText("Review requested")).toBeTruthy()
    expect(request).toHaveBeenCalledWith({
      repositoryName: "storefront",
      targetId: "pr-412",
      configurationId: "onboardee",
      order: "risk-first",
      customOrder: "",
      writer: { kind: "agent", agent: "claude", model: "opus", effort: "high" },
    })
  })

  it("offers the efforts of the chosen model and starts again from that model's effort", async () => {
    const request = vi.fn(() => ({ data: { kind: "requested", prompt: null, message: "Review requested" } }))
    renderReview({ "review.get": () => ({ data: missingPage }), "review.request": request })

    const models = await screen.findByRole("combobox", { name: "Model for Claude" })

    expect(screen.queryByRole("radio", { name: "Extra high" })).toBeNull()

    fireEvent.change(models, { target: { value: "opus" } })
    fireEvent.click(screen.getByRole("radio", { name: "Extra high" }))
    fireEvent.change(models, { target: { value: "haiku" } })

    expect(screen.queryByRole("group", { name: "Effort for Claude" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Start the review" }))

    expect(await screen.findByText("Review requested")).toBeTruthy()
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ writer: { kind: "agent", agent: "claude", model: "haiku", effort: "default" } }),
    )
  })

  it("copies the prompt when the reviewer prompts the agent, with a custom order", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Reflect.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const request = vi.fn(() => ({
      data: { kind: "requested", prompt: "Review it, the migration first.", message: "Prompt copied" },
    }))
    renderReview({ "review.get": () => ({ data: missingPage }), "review.request": request })

    fireEvent.click(await screen.findByRole("button", { name: "Order of the Code Walkthrough: Foundations first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Custom/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Your instruction for the order" }), {
      target: { value: "The migration first." },
    })
    fireEvent.click(screen.getByRole("radio", { name: /I will prompt my agent myself/ }))

    expect(screen.queryByRole("combobox", { name: "Model for Claude" })).toBeNull()
    expect(screen.queryByRole("group", { name: "Effort for Claude" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Copy the prompt" }))

    expect(await screen.findByText("Prompt copied")).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith("Review it, the migration first.")
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ order: "custom", customOrder: "The migration first.", writer: { kind: "manual" } }),
    )
  })

  it("shows a rejection under the field it is about", async () => {
    renderReview({
      "review.get": () => ({ data: missingPage }),
      "review.request": () => ({
        data: { kind: "rejected", field: "customOrder", message: "Write how the agent orders the Code Walkthrough." },
      }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Order of the Code Walkthrough: Foundations first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Custom/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.click(screen.getByRole("button", { name: "Start the review" }))

    const alert = await screen.findByRole("alert")

    expect(alert.textContent).toBe("Write how the agent orders the Code Walkthrough.")
    expect(screen.getByRole("textbox", { name: "Your instruction for the order" }).getAttribute("aria-invalid")).toBe("true")
  })

  it("opens the review once the scaffold is built", async () => {
    const request = vi.fn(() => ({ data: { kind: "requested", prompt: null, message: "Review started" } }))
    renderReview({
      "review.get": () => ({ data: request.mock.calls.length === 0 ? missingPage : artifactPage }),
      "review.request": request,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Start the review" }))

    expect(await screen.findByRole("navigation", { name: "Review sections" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "No Flight Plan Review yet" })).toBeNull()
  })

  it("says why above the action when the change cannot be read", async () => {
    renderReview({
      "review.get": () => ({ data: missingPage }),
      "review.request": () => ({ data: { kind: "unavailable", message: "This change touches no files, so there is nothing to review." } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Start the review" }))

    expect((await screen.findByRole("alert")).textContent).toBe("This change touches no files, so there is nothing to review.")
    expect(screen.getByRole("heading", { name: "No Flight Plan Review yet" })).toBeTruthy()
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

  it("offers to generate a section the configuration left out, and reads the review again once it is generated", async () => {
    const ungeneratedPage = {
      ...artifactPage,
      segments: artifactPage.segments.map((segment) => (segment.id === "stock"
        ? { ...segment, offers: { journey: offerOf("journey", "Journey Flow Diagram"), blast: offerOf("blast", "Blast Diagram"), findings: offerOf("findings", "Findings") } }
        : segment)),
    }
    const getReview = vi.fn(() => ({ data: ungeneratedPage }))
    const generateSection = vi.fn(() => ({ data: { kind: "generated", prompt: null, message: "Writing the Blast Diagram" } }))
    renderReview({ "review.get": getReview, "review.generateSection": generateSection })
    const stock = within(await screen.findByRole("region", { name: "Segment 1: Stock check" }))
    const offer = stock.getByRole("region", { name: "Blast Diagram" })

    expect(within(offer).getByText("Blast Diagram was not generated.")).toBeTruthy()
    expect(within(stock.getByRole("region", { name: "Journey Flow Diagram" })).getByRole("button", { name: "Generate" })).toBeTruthy()
    expect(within(stock.getByRole("region", { name: "Findings" })).getByRole("button", { name: "Generate" })).toBeTruthy()
    fireEvent.click(within(offer).getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(generateSection).toHaveBeenCalledWith(expect.objectContaining({ repositoryName: "storefront", targetId: "pr-412", section: "blast" }))
    })
    expect(await screen.findByText("Writing the Blast Diagram")).toBeTruthy()
    expect(getReview.mock.calls.length).toBeGreaterThan(1)
  })

  it("shows why a section could not be generated, beside its button", async () => {
    const ungeneratedPage = {
      ...artifactPage,
      segments: artifactPage.segments.map((segment) => (segment.id === "stock"
        ? { ...segment, offers: { ...NO_OFFERS, journey: offerOf("journey", "Journey Flow Diagram") } }
        : segment)),
    }
    renderReview({
      "review.get": () => ({ data: ungeneratedPage }),
      "review.generateSection": () => ({ data: { kind: "unavailable", message: "feature/stock is not in this checkout." } }),
    })
    const stock = within(await screen.findByRole("region", { name: "Segment 1: Stock check" }))
    const offer = stock.getByRole("region", { name: "Journey Flow Diagram" })

    fireEvent.click(within(offer).getByRole("button", { name: "Generate" }))

    expect((await within(offer).findByRole("alert")).textContent).toBe("feature/stock is not in this checkout.")
  })

  it("offers no editing of the context on the reviewer's page", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const stock = await screen.findByRole("region", { name: "Segment 1: Stock check" })

    expect(within(stock).getByText("Why stock matters.")).toBeTruthy()
    expect(within(stock).queryByRole("button", { name: "Edit" })).toBeNull()
  })
})
