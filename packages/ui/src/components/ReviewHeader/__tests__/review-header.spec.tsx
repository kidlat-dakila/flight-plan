import { render, screen, within } from "@testing-library/react"
import ReviewHeader, { type ReviewHeaderContent } from "@/components/ReviewHeader"

const PULL_REQUEST: ReviewHeaderContent = {
  kind: "pull-request",
  title: "Count held units in the stock check",
  author: { name: "mira", avatarUrl: null, monogram: "M" },
  status: "draft",
  statusLabel: "Draft",
  artifactFreshness: { label: "Updated", isOutOfDate: false },
  reviewers: [
    { name: "jonas", avatarUrl: null, monogram: "J", state: "approved", stateLabel: "jonas approved" },
    { name: "amara", avatarUrl: null, monogram: "A", state: "changes-requested", stateLabel: "amara requested changes" },
  ],
  reviewersEmptyLabel: null,
}

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
