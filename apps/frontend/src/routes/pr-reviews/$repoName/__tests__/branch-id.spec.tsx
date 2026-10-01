import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { artifactPage, chatReply, missingPage } from "./review-page-fixture"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"

const REVIEW_PATH = "/pr-reviews/storefront/pr-412"

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
      "#segment-checkout",
      "#checkout-context",
      "#conversation",
    ])
  })

  it("says when the artifact is still being written, and when it is stale", async () => {
    renderReview({
      "review.get": () => ({
        data: {
          ...artifactPage,
          draftingNotice: { label: "Still being written", message: "The agent is still writing this review." },
          staleNotice: { message: [{ kind: "text", text: "The pull request has moved to e7a94d3 since." }], promptLabel: "Copy the update prompt", prompt: "Update it.", copiedMessage: "Prompt copied" },
        },
      }),
    })

    expect(await screen.findByText("Still being written")).toBeTruthy()
    expect(screen.getByText("The pull request has moved to e7a94d3 since.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Copy the update prompt" })).toBeTruthy()
  })

  it("steps through the waypoints across segments and opens the one it lands on", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    const [nextButton] = await screen.findAllByRole("button", { name: "Next waypoint (J)" })

    expect(screen.getAllByText("2 waypoints")).toHaveLength(2)
    expect(screen.queryByText("Reading of Held units reduce the price.")).toBeNull()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()
    expect(screen.getByRole("region", { name: "Held units reduce the price" }).getAttribute("data-current")).toBe("true")

    fireEvent.click(nextButton)

    expect(await screen.findByText("Reading of The sum is rounded once.")).toBeTruthy()
    expect(screen.getByRole("region", { name: "The sum is rounded once" }).getAttribute("data-current")).toBe("true")
    expect(nextButton).toHaveProperty("disabled", true)
  })

  it("steps with the keyboard", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })
    await screen.findByText("Why stock matters.")

    fireEvent.keyDown(window, { key: "j" })

    expect(await screen.findByText("Reading of Held units reduce the price.")).toBeTruthy()
  })

  it("sends the chosen filter to the backend", async () => {
    const getReview = vi.fn(() => ({ data: artifactPage }))
    renderReview({ "review.get": getReview })
    const [filterButton] = await screen.findAllByRole("button", { name: "Filter: all waypoints" })

    fireEvent.click(filterButton)
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

  it("shows a reviewer's comment under its line, and takes a new comment on a line", async () => {
    const addComment = vi.fn(() => ({ data: { threadId: "thread-2" } }))
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.addComment": addComment })
    const file = await screen.findByRole("article", { name: "Cart file" })

    expect(screen.getByText("Can this go negative?")).toBeTruthy()

    fireEvent.click(within(file).getByRole("button", { name: "Add a comment on this line 3" }))
    fireEvent.change(within(file).getByRole("textbox", { name: "Leave a comment, src/cart.ts 3" }), { target: { value: "Round here?" } })
    fireEvent.click(within(file).getByRole("button", { name: "Add to review" }))

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(within(file).queryByRole("textbox")).toBeNull()
    })
  })

  it("shows the pull request's conversation with each review's verdict", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }) })

    const conversation = await screen.findByRole("region", { name: "Conversation" })

    expect(within(conversation).getByText("Approved")).toBeTruthy()
    expect(within(conversation).getByText("The direction is right.")).toBeTruthy()
    expect(within(conversation).getByRole("textbox", { name: "Leave a comment" })).toBeTruthy()
  })

  it("opens the chat panel from the band and closes it again", async () => {
    renderReview({ "review.get": () => ({ data: artifactPage }), "review.chat": () => ({ data: chatReply }) })

    fireEvent.click(await screen.findByRole("button", { name: "Chat" }))

    const panel = await screen.findByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByText("Agent not running")).toBeTruthy()
    expect(within(panel).getByText("Ask about this review.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the chat" }))

    expect(screen.queryByRole("complementary", { name: "Chat with the agent" })).toBeNull()
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

  it("offers to create a review for a review target that has none, without the review actions", async () => {
    renderReview({ "review.get": () => ({ data: missingPage }) })

    expect(await screen.findByRole("heading", { name: "No Flight Plan Review yet" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Create Flight Plan" }).getAttribute("href")).toBe("/pr-reviews/storefront/create?target=pr-416")
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull()
    expect(screen.queryByRole("navigation", { name: "Review sections" })).toBeNull()
  })

  it("shows the backend's message and a way back when the review cannot be opened", async () => {
    renderReview({ "review.get": () => ({ errorMessage: "This review target is not listed in Flight Plan." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "Could not open this review" })).toBeTruthy()
    expect(within(alert).getByText("This review target is not listed in Flight Plan.")).toBeTruthy()
    expect(within(alert).getByRole("link", { name: "Go to your repositories" }).getAttribute("href")).toBe("/")
  })
})
