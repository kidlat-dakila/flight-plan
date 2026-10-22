import { fireEvent, render, screen, within } from "@testing-library/react"
import ReviewHeader, { TitleHeader, type ReviewerRequesting, type ReviewHeaderContent } from "@/components/ReviewHeader"

const PULL_REQUEST: ReviewHeaderContent = {
  kind: "pull-request",
  title: "Count held units in the stock check",
  author: { name: "mira", avatarUrl: null, monogram: "M" },
  status: "draft",
  statusLabel: "Draft",
  artifactFreshness: { label: "Updated", isOutOfDate: false },
  reviewers: [
    { name: "jonas", avatarUrl: null, monogram: "J", state: "approved", stateLabel: "jonas approved", request: null },
    { name: "amara", avatarUrl: null, monogram: "A", state: "changes-requested", stateLabel: "amara requested changes", request: null },
  ],
  reviewersEmptyLabel: null,
  reviewerRequest: null,
}

const REQUESTABLE: ReviewHeaderContent = {
  ...PULL_REQUEST,
  reviewers: [
    {
      name: "jonas",
      avatarUrl: null,
      monogram: "J",
      state: "approved",
      stateLabel: "jonas approved",
      request: { login: "jonas", label: "Request a review from jonas again", isRemoving: false },
    },
    {
      name: "teo",
      avatarUrl: null,
      monogram: "T",
      state: "pending",
      stateLabel: "teo has not reviewed yet",
      request: { login: "teo", label: "Remove the request to teo", isRemoving: true },
    },
  ],
  reviewerRequest: {
    buttonLabel: "Request a reviewer",
    heading: "Request a reviewer",
    searchPlaceholder: "Search people",
    emptyLabel: "Nobody matches.",
    requestLabel: "Request",
  },
}

const createRequesting = (overrides: Partial<ReviewerRequesting> = {}): ReviewerRequesting => ({
  query: "",
  options: [{ login: "lena", name: "Lena Ito", detail: "@lena", avatarUrl: null, monogram: "LI" }],
  isPending: false,
  onOpen: vi.fn(),
  onSearch: vi.fn(),
  onRequest: vi.fn(),
  onRemove: vi.fn(),
  ...overrides,
})

describe("ReviewHeader reviewer requests", () => {
  it("searches the people who can be asked once the control is opened, and requests the one chosen", async () => {
    const requesting = createRequesting()
    render(<ReviewHeader header={REQUESTABLE} reviewerRequesting={requesting} />)

    fireEvent.click(screen.getByRole("button", { name: "Request a reviewer" }))
    fireEvent.change(await screen.findByRole("searchbox", { name: "Search people" }), { target: { value: "le" } })
    fireEvent.click(screen.getByRole("button", { name: "Request Lena Ito" }))

    expect(requesting.onOpen).toHaveBeenCalledTimes(1)
    expect(requesting.onSearch).toHaveBeenCalledWith("le")
    expect(requesting.onRequest).toHaveBeenCalledWith("lena")
    expect(screen.getByText("@lena")).toBeTruthy()
  })

  it("says so when nobody matches", async () => {
    render(<ReviewHeader header={REQUESTABLE} reviewerRequesting={createRequesting({ options: [] })} />)

    fireEvent.click(screen.getByRole("button", { name: "Request a reviewer" }))

    expect(await screen.findByText("Nobody matches.")).toBeTruthy()
  })

  it("removes a request that is still open, and asks a reviewer who answered for another review", async () => {
    const requesting = createRequesting()
    render(<ReviewHeader header={REQUESTABLE} reviewerRequesting={requesting} />)
    const reviewers = within(screen.getByRole("list", { name: "Reviewers" }))

    fireEvent.click(reviewers.getByRole("button", { name: /teo/ }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove the request to teo" }))
    fireEvent.click(reviewers.getByRole("button", { name: /jonas/ }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Request a review from jonas again" }))

    expect(requesting.onRemove).toHaveBeenCalledWith("teo")
    expect(requesting.onRequest).toHaveBeenCalledWith("jonas")
  })

  it("offers no reviewer control where the page gives none", () => {
    render(<ReviewHeader header={REQUESTABLE} />)

    expect(screen.queryByRole("button", { name: "Request a reviewer" })).toBeNull()
    expect(within(screen.getByRole("list", { name: "Reviewers" })).queryAllByRole("button")).toStrictEqual([])
  })
})

describe("ReviewHeader", () => {
  it("shows the pull request's title, its status, the artifact's freshness and each reviewer's state", () => {
    render(<ReviewHeader header={PULL_REQUEST} actions={<button type="button">Chat</button>} />)

    expect(screen.getByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(screen.getByText("Draft")).toBeTruthy()
    expect(screen.getByText("Updated")).toBeTruthy()
    expect(within(screen.getByRole("list", { name: "Reviewers" })).getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([
      "Jjonas approved",
      "Aamara requested changes",
    ])
    expect(screen.getByRole("button", { name: "Chat" })).toBeTruthy()
  })

  it("shows the count of changed files by kind beside the status when it is given", () => {
    const changedFiles = [{ text: "10 changed files", kind: "plain" }, { text: "4 TypeScript", kind: "plain" }] as const
    const { rerender } = render(<ReviewHeader header={PULL_REQUEST} changedFiles={changedFiles} />)

    expect(screen.getByText("10 changed files")).toBeTruthy()
    expect(screen.getByText("4 TypeScript")).toBeTruthy()

    rerender(<ReviewHeader header={PULL_REQUEST} />)

    expect(screen.queryByText("10 changed files")).toBeNull()
  })

  it("says when the artifact is out of date", () => {
    render(<ReviewHeader header={{ ...PULL_REQUEST, artifactFreshness: { label: "Out of date", isOutOfDate: true } }} />)

    expect(screen.getByText("Out of date")).toBeTruthy()
  })

  it("says so when nobody is reviewing, and leaves the artifact freshness out when there is none", () => {
    render(
      <ReviewHeader
        header={{ ...PULL_REQUEST, artifactFreshness: null, reviewers: [], reviewersEmptyLabel: "No reviewers yet" }}
      />,
    )

    expect(screen.getByText("No reviewers yet")).toBeTruthy()
    expect(screen.queryByText("Updated")).toBeNull()
    expect(screen.queryByText("Out of date")).toBeNull()
  })

  it("shows a branch without a forge by its name, with a way to connect one", () => {
    render(
      <ReviewHeader
        header={{
          kind: "branch",
          branch: "refactor-to-full-web",
          forgeMessage: "Local git has no reviews to show",
          artifactFreshness: { label: "Out of date", isOutOfDate: true },
          action: { href: "/configurations/forge", label: "Connect a code host" },
        }}
      />,
    )

    expect(screen.getByRole("heading", { name: "refactor-to-full-web" })).toBeTruthy()
    expect(screen.getByText("Local git has no reviews to show")).toBeTruthy()
    expect(screen.getByText("Out of date")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Connect a code host" }).getAttribute("href")).toBe("/configurations/forge")
  })

  it("heads an author's page with the title, the author label and the actions, without the review's status", () => {
    render(<ReviewHeader header={PULL_REQUEST} authorLabel="Your Flight Plan" actions={<button type="button">Chat</button>} />)

    expect(screen.getByRole("heading", { name: "Count held units in the stock check" })).toBeTruthy()
    expect(screen.getByText("Your Flight Plan")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Chat" })).toBeTruthy()
    expect(screen.queryByText("Draft")).toBeNull()
    expect(screen.queryByText("Updated")).toBeNull()
    expect(screen.queryByRole("list", { name: "Reviewers" })).toBeNull()
  })

  it("heads an author's page for a branch with its name, without the code host prompt", () => {
    render(
      <ReviewHeader
        header={{
          kind: "branch",
          branch: "refactor-to-full-web",
          forgeMessage: "Local git has no reviews to show",
          artifactFreshness: null,
          action: { href: "/configurations/forge", label: "Connect a code host" },
        }}
        authorLabel="Your Flight Plan"
      />,
    )

    expect(screen.getByRole("heading", { name: "refactor-to-full-web" })).toBeTruthy()
    expect(screen.getByText("Your Flight Plan")).toBeTruthy()
    expect(screen.queryByText("Local git has no reviews to show")).toBeNull()
    expect(screen.queryByRole("link", { name: "Connect a code host" })).toBeNull()
  })
})

describe("ReviewHeader agent status", () => {
  it("shows an online agent as plain text before the actions", () => {
    render(
      <ReviewHeader
        header={PULL_REQUEST}
        agentStatus={{ isOnline: true, label: "Agent online", onClick: null }}
        actions={<button type="button">Chat</button>}
      />,
    )

    const status = screen.getByText("Agent online")
    expect(status.tagName).toBe("SPAN")
    expect(screen.queryByRole("button", { name: "Agent online" })).toBeNull()
    expect(status.compareDocumentPosition(screen.getByRole("button", { name: "Chat" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("offers an offline agent as a button that asks to launch it", () => {
    const onClick = vi.fn()
    render(<ReviewHeader header={PULL_REQUEST} authorLabel="Your Flight Plan" agentStatus={{ isOnline: false, label: "Agent offline", onClick }} />)

    fireEvent.click(screen.getByRole("button", { name: "Agent offline" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("shows no agent status where the page gives none", () => {
    render(<ReviewHeader header={PULL_REQUEST} agentStatus={null} />)

    expect(screen.queryByText("Agent online")).toBeNull()
    expect(screen.queryByText("Agent offline")).toBeNull()
  })
})

describe("TitleHeader", () => {
  it("heads a page with a title, a label and its actions, and nothing else", () => {
    render(<TitleHeader title="Count held units" isBranch={false} label="Published Flight Plan" actions={<button type="button">Chat</button>} />)

    expect(screen.getByRole("heading", { name: "Count held units" })).toBeTruthy()
    expect(screen.getByText("Published Flight Plan")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Chat" })).toBeTruthy()
    expect(screen.queryByRole("list", { name: "Reviewers" })).toBeNull()
  })
})
