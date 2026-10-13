import { fireEvent, render, screen } from "@testing-library/react"
import SubmitReviewMenu, { BandButton, OptionsMenu, ShareMenu, type ReviewDraft, type Sharing } from "@/components/ReviewActions"

const DRAFT: ReviewDraft = {
  isAvailable: true,
  unavailableReason: null,
  buttonLabel: "Submit review (2)",
  heading: "Submit your review",
  pendingLabel: "2 pending comments will be sent with it.",
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
    { key: "description", label: "Attach to the pull request description", description: "Uploads the file.", actionLabel: "Attach", isAvailable: false, statusLabel: null, link: null },
    {
      key: "claude",
      label: "Publish as a Claude artifact",
      description: "Publishes it.",
      actionLabel: "Publish",
      isAvailable: true,
      statusLabel: "Published 2 minutes ago",
      link: { href: "https://claude.ai/artifact/x", label: "Open the artifact" },
    },
  ],
}

describe("SubmitReviewMenu", () => {
  it("collects a summary and a verdict, and submits them", async () => {
    const onSubmit = vi.fn()
    render(<SubmitReviewMenu draft={DRAFT} isSubmitting={false} errorMessage={null} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))
    fireEvent.change(await screen.findByRole("textbox", { name: "Leave a summary for the author" }), { target: { value: "Looks right." } })
    fireEvent.click(screen.getByRole("radio", { name: /Approve/ }))
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }))

    expect(screen.getByText("2 pending comments will be sent with it.")).toBeTruthy()
    expect(onSubmit).toHaveBeenCalledWith("approve", "Looks right.")
  })

  it("shows the backend's reason when the review is refused", async () => {
    render(<SubmitReviewMenu draft={DRAFT} isSubmitting={false} errorMessage="Write a summary or a comment before you submit." onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Submit review (2)" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Write a summary or a comment before you submit.")
  })

  it("is shown as unavailable, with the reason, where there is no review to submit", () => {
    render(
      <SubmitReviewMenu
        draft={{ ...DRAFT, isAvailable: false, unavailableReason: "A branch without a code host has no review to submit.", buttonLabel: "Submit review" }}
        isSubmitting={false}
        errorMessage={null}
        onSubmit={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Submit review" })

    expect(button).toHaveProperty("disabled", true)
    expect(button.getAttribute("title")).toBe("A branch without a code host has no review to submit.")
  })
})

describe("ShareMenu", () => {
  it("offers each way to publish, disables the one that cannot work, and links what is published", async () => {
    const onPublish = vi.fn()
    render(<ShareMenu sharing={SHARING} isPublishing={false} onPublish={onPublish} />)

    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    expect(await screen.findByRole("button", { name: "Attach" })).toHaveProperty("disabled", true)
    expect(screen.getByText("Published 2 minutes ago")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Open the artifact" }).getAttribute("href")).toBe("https://claude.ai/artifact/x")

    fireEvent.click(screen.getByRole("button", { name: "Publish" }))

    expect(onPublish).toHaveBeenCalledWith("claude")
  })
})

const ignore = (): void => undefined

describe("OptionsMenu", () => {
  it("reports which artifact action was chosen", async () => {
    const onUpdate = vi.fn()
    const onRegenerate = vi.fn()
    const onDelete = vi.fn()
    render(<OptionsMenu forgeLink={null} rebuild={{ onUpdate, onRegenerate }} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Update the Flight Plan" }))
    fireEvent.click(screen.getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Regenerate from scratch" }))
    fireEvent.click(screen.getByRole("button", { name: "More actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onRegenerate).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("links to the pull request and lists the artifact actions", async () => {
    render(<OptionsMenu forgeLink={{ href: "https://forge.test/pull/412", label: "View pull request" }} rebuild={{ onUpdate: ignore, onRegenerate: ignore }} onDelete={ignore} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))

    expect((await screen.findByRole("menuitem", { name: "View pull request" })).getAttribute("href")).toBe("https://forge.test/pull/412")
    expect(screen.getByRole("menuitem", { name: "Update the Flight Plan" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Regenerate from scratch" })).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy()
  })

  it("leaves the pull request link out where there is none", async () => {
    render(<OptionsMenu forgeLink={null} rebuild={{ onUpdate: ignore, onRegenerate: ignore }} onDelete={ignore} />)

    fireEvent.click(screen.getByRole("button", { name: "More actions" }))

    expect(await screen.findByRole("menuitem", { name: "Update the Flight Plan" })).toBeTruthy()
    expect(screen.queryByRole("menuitem", { name: "View pull request" })).toBeNull()
  })

  it("holds Delete alone where the artifact cannot be rebuilt", async () => {
    render(<OptionsMenu forgeLink={null} rebuild={null} onDelete={ignore} />)

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
