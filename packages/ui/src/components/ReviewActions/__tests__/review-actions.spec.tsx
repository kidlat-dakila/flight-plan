import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import SubmitReviewMenu, { BandButton, BandLink, BandMenuButton, CompleteButton, OptionsMenu, ShareMenu, type ReviewDraft, type Sharing } from "@/components/ReviewActions"
import { renderPlainEditor } from "@/lib/__tests__/plain-editor"

type SubmitReviewMenuProps = ComponentProps<typeof SubmitReviewMenu>

const createSubmitProps = (overrides: Partial<SubmitReviewMenuProps> = {}): SubmitReviewMenuProps => ({
  draft: DRAFT,
  isSubmitting: false,
  isDiscarding: false,
  errorMessage: null,
  submissionCount: 0,
  renderEditor: renderPlainEditor,
  onSubmit: vi.fn(),
  onDiscard: vi.fn(),
  ...overrides,
})

const DRAFT: ReviewDraft = {
  isAvailable: true,
  unavailableReason: null,
  buttonLabel: "Submit review (2)",
  heading: "Submit your review",
  pendingLabel: "2 pending comments will be sent with it.",
  pendingComments: [
    { id: "p1", locationLabel: "src/price.ts, line 11", excerpt: "Clamp it.", staleLabel: null, discardLabel: "Discard" },
    { id: "p2", locationLabel: "src/cart.ts, removed line 4", excerpt: "Why?", staleLabel: "Written against an earlier commit.", discardLabel: "Discard" },
  ],
  bodyPlaceholder: "Leave a summary for the author",
  submitLabel: "Submit review",
  verdicts: [
    { key: "comment", label: "Comment", description: "Send your comments without a verdict." },
    { key: "approve", label: "Approve", description: "Send your comments and approve the change." },
    { key: "request-changes", label: "Request changes", description: "Ask for changes before merging." },
  ],
}

const SHARING: Sharing = {
  buttonLabel: "Share",
  options: [
    { key: "description", label: "Attach to the pull request description", description: "Uploads the file.", actionLabel: "Attach", pendingLabel: "Attaching…", isPending: false, isAvailable: false, statusLabel: null, link: null },
    {
      key: "claude",
      label: "Publish as a Claude artifact",
      description: "Publishes it.",
      actionLabel: "Publish",
      pendingLabel: "Publishing…",
      isPending: false,
      isAvailable: true,
      statusLabel: "Published 2 minutes ago",
      link: { href: "https://claude.ai/artifact/x", label: "Open the artifact" },
    },
  ],
}

describe("SubmitReviewMenu", () => {
  it("collects a summary and a verdict, and submits them", async () => {
    const onSubmit = vi.fn()
    render(<SubmitReviewMenu {...createSubmitProps({ onSubmit })} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))
    fireEvent.change(await screen.findByRole("textbox", { name: "Leave a summary for the author" }), { target: { value: "Looks right." } })
    fireEvent.click(screen.getByRole("radio", { name: /Approve/ }))
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }))

    expect(screen.getByText("2 pending comments will be sent with it.")).toBeTruthy()
    expect(onSubmit).toHaveBeenCalledWith("approve", "Looks right.")
  })

  it("shows the backend's reason when the review is refused", async () => {
    render(<SubmitReviewMenu {...createSubmitProps({ errorMessage: "Write a summary or a comment before you submit." })} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Write a summary or a comment before you submit.")
  })

  it("is shown as unavailable, with the reason, where there is no review to submit", () => {
    render(
      <SubmitReviewMenu
        {...createSubmitProps({
          draft: { ...DRAFT, isAvailable: false, unavailableReason: "A branch without a code host has no review to submit.", buttonLabel: "Submit review" },
        })}
      />,
    )

    const button = screen.getByRole("button", { name: "Submit review" })

    expect(button).toHaveProperty("disabled", true)
    expect(button.getAttribute("title")).toBe("A branch without a code host has no review to submit.")
  })
})

describe("SubmitReviewMenu pending comments", () => {
  it("lists each pending comment with where it is, marks a stale one, and discards the one chosen", async () => {
    const onDiscard = vi.fn()
    render(<SubmitReviewMenu {...createSubmitProps({ onDiscard })} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))

    expect(await screen.findByText("src/price.ts, line 11")).toBeTruthy()
    expect(screen.getByText("Clamp it.")).toBeTruthy()
    expect(screen.getByText("Written against an earlier commit.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Discard: src/cart.ts, removed line 4" }))

    expect(onDiscard).toHaveBeenCalledWith("p2")
  })

  it("submits the first verdict the code host takes when none is chosen, and offers only those", async () => {
    const onSubmit = vi.fn()
    const draft = { ...DRAFT, verdicts: DRAFT.verdicts.filter((option) => option.key !== "comment") }
    render(<SubmitReviewMenu {...createSubmitProps({ draft, onSubmit })} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))
    await screen.findByRole("radio", { name: /Approve/ })
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }))

    expect(screen.queryByRole("radio", { name: /^Comment/ })).toBeNull()
    expect(onSubmit).toHaveBeenCalledWith("approve", "")
  })
})

describe("ShareMenu", () => {
  it("offers each way to publish, disables the one that cannot work, and links what is published", async () => {
    const onPublish = vi.fn()
    render(<ShareMenu sharing={SHARING} publishingKey={null} onPublish={onPublish} />)

    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    expect(await screen.findByRole("button", { name: "Attach" })).toHaveProperty("disabled", true)
    expect(screen.getByText("Published 2 minutes ago")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Open the artifact" }).getAttribute("href")).toBe("https://claude.ai/artifact/x")

    fireEvent.click(screen.getByRole("button", { name: "Publish" }))

    expect(onPublish).toHaveBeenCalledWith("claude")
  })
})

const publishingToClaude: Sharing = {
  ...SHARING,
  options: SHARING.options.map((option) => (option.key === "claude" ? { ...option, isPending: true } : option)),
}

describe("ShareMenu while publishing", () => {
  it("shows the option the backend says is being published as busy, and lets nothing else be published", async () => {
    render(<ShareMenu sharing={publishingToClaude} publishingKey={null} onPublish={vi.fn()} />)

    const share = screen.getByRole("button", { name: "Share" })
    expect(share.getAttribute("aria-busy")).toBe("true")
    fireEvent.click(share)

    const publishing = await screen.findByRole("button", { name: "Publishing…" })
    expect(publishing.getAttribute("aria-busy")).toBe("true")
    expect(publishing).toHaveProperty("disabled", true)
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull()
  })

  it("shows the option that was just pressed as busy before the backend answers", async () => {
    render(<ShareMenu sharing={SHARING} publishingKey="claude" onPublish={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    expect((await screen.findByRole("button", { name: "Publishing…" })).getAttribute("aria-busy")).toBe("true")
    expect(screen.getByRole("button", { name: "Attach" }).getAttribute("aria-busy")).toBe("false")
  })
})

const ignore = (): void => undefined

describe("OptionsMenu", () => {
  it("reports a delete", async () => {
    const onDelete = vi.fn()
    render(<OptionsMenu forgeLink={null} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("links to the pull request above Delete", async () => {
    render(<OptionsMenu forgeLink={{ href: "https://forge.test/pull/412", label: "View pull request" }} onDelete={ignore} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))

    expect((await screen.findByRole("menuitem", { name: "View pull request" })).getAttribute("href")).toBe("https://forge.test/pull/412")
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual(["View pull request", "Delete"])
  })

  it("holds Delete alone where there is no pull request", async () => {
    render(<OptionsMenu forgeLink={null} onDelete={ignore} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))

    expect(await screen.findByRole("menuitem", { name: "Delete" })).toBeTruthy()
    expect(screen.getAllByRole("menuitem")).toHaveLength(1)
    expect(screen.queryByRole("separator")).toBeNull()
  })
})

describe("BandButton", () => {
  it("says whether it is pressed and reports a press", () => {
    const onClick = vi.fn()
    render(<BandButton label="Chat" isPressed onClick={onClick} />)

    const button = screen.getByRole("button", { name: "Chat" })

    expect(button.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe("CompleteButton", () => {
  it("reports a press, and cannot be pressed while the artifact is being completed", () => {
    const onClick = vi.fn()
    const { rerender } = render(<CompleteButton label="Mark as complete" isPending={false} onClick={onClick} />)

    fireEvent.click(screen.getByRole("button", { name: "Mark as complete" }))

    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<CompleteButton label="Mark as complete" isPending onClick={onClick} />)

    expect(screen.getByRole("button", { name: "Mark as complete" })).toHaveProperty("disabled", true)
  })
})

describe("BandMenuButton", () => {
  it("reports a press without opening anything itself", () => {
    const onClick = vi.fn()
    render(<BandMenuButton label="Share" onClick={onClick} />)

    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})

describe("BandLink", () => {
  it("opens its address in a new tab", () => {
    render(<BandLink href="http://localhost:4200/artifact/claude/download" label="Download to Flight Plan" />)

    const link = screen.getByRole("link", { name: "Download to Flight Plan" })
    expect(link.getAttribute("href")).toBe("http://localhost:4200/artifact/claude/download")
    expect(link.getAttribute("target")).toBe("_blank")
  })
})
