import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import CommentThread, { CommentComposer, CommentEntry, type ThreadComment } from "@/components/CommentThread"
import { renderPlainEditor } from "@/lib/__tests__/plain-editor"
import { paragraph } from "@/lib/__tests__/review-samples"

type CommentThreadProps = ComponentProps<typeof CommentThread>

const COMMENTS: readonly ThreadComment[] = [
  { id: "c1", author: { name: "amara", avatarUrl: null, monogram: "A" }, body: paragraph("Can this go negative?"), timeLabel: "2 hours ago", pendingLabel: null, discardLabel: null },
  { id: "c2", author: { name: "you", avatarUrl: null, monogram: "Y" }, body: paragraph("It can."), timeLabel: "just now", pendingLabel: "Pending", discardLabel: "Discard" },
]

const createProps = (overrides: Partial<CommentThreadProps> = {}): CommentThreadProps => ({
  comments: COMMENTS,
  label: "src/price.ts 13",
  rangeLabel: null,
  statusLabel: null,
  resolution: { label: "Resolve conversation", isResolving: true },
  canReply: true,
  replyPlaceholder: "Reply",
  submitLabel: "Reply",
  cancelLabel: "Cancel",
  isSubmitting: false,
  renderEditor: renderPlainEditor,
  onReply: vi.fn(),
  onResolve: vi.fn(),
  onDiscard: vi.fn(),
  ...overrides,
})

const openReplyBox = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Reply" }))
}

describe("CommentThread", () => {
  it("shows each comment with its author and time, and marks one that is not sent yet", () => {
    render(<CommentThread {...createProps()} />)

    expect(screen.getByRole("region", { name: "src/price.ts 13" })).toBeTruthy()
    expect(screen.getByText("Can this go negative?")).toBeTruthy()
    expect(screen.getByText("amara")).toBeTruthy()
    expect(screen.getByText("2 hours ago")).toBeTruthy()
    expect(screen.getByText("Pending")).toBeTruthy()
  })

  it("opens a reply box, sends the reply and closes the box", () => {
    const onReply = vi.fn()
    render(<CommentThread {...createProps({ onReply })} />)

    openReplyBox()
    fireEvent.change(screen.getByRole("textbox", { name: "Reply, src/price.ts 13" }), { target: { value: " Clamping it. " } })
    fireEvent.click(screen.getByRole("button", { name: "Reply" }))

    expect(onReply).toHaveBeenCalledWith("Clamping it.")
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("closes the reply box without sending when cancelled", () => {
    const onReply = vi.fn()
    render(<CommentThread {...createProps({ onReply })} />)

    openReplyBox()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onReply).not.toHaveBeenCalled()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("resolves the thread, and discards a comment that is still pending", () => {
    const onResolve = vi.fn()
    const onDiscard = vi.fn()
    render(<CommentThread {...createProps({ onResolve, onDiscard })} />)

    fireEvent.click(screen.getByRole("button", { name: "Resolve conversation" }))
    fireEvent.click(screen.getByRole("button", { name: "Discard" }))

    expect(onResolve).toHaveBeenCalledWith(true)
    expect(onDiscard).toHaveBeenCalledWith("c2")
    expect(screen.getAllByRole("button", { name: "Discard" })).toHaveLength(1)
  })

  it("says which lines a range covers", () => {
    render(<CommentThread {...createProps({ rangeLabel: "Lines 11–13" })} />)

    expect(screen.getByText("Lines 11–13")).toBeTruthy()
  })

  it("folds a resolved thread away until it is shown, and can reopen it", () => {
    const onResolve = vi.fn()
    render(
      <CommentThread
        {...createProps({ statusLabel: "Resolved", resolution: { label: "Reopen conversation", isResolving: false }, onResolve })}
      />,
    )

    expect(screen.getByText("Resolved")).toBeTruthy()
    expect(screen.queryByText("Can this go negative?")).toBeNull()
    expect(screen.queryByRole("button", { name: "Reopen conversation" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show" }))

    expect(screen.getByText("Can this go negative?")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Reopen conversation" }))

    expect(onResolve).toHaveBeenCalledWith(false)
  })

  it("offers neither a reply nor a resolution where the code host takes none", () => {
    render(<CommentThread {...createProps({ canReply: false, resolution: null })} />)

    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Resolve conversation" })).toBeNull()
  })
})

describe("CommentComposer", () => {
  it("cannot send an empty comment", () => {
    render(
      <CommentComposer
        label="Leave a comment"
        submitLabel="Add to review"
        cancelLabel={null}
        isSubmitting={false}
        renderEditor={renderPlainEditor}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Add to review" })).toHaveProperty("disabled", true)
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })

  it("shows its hint, and starts over with an empty editor once a comment is sent", () => {
    const onSubmit = vi.fn()
    render(
      <CommentComposer
        label="Leave a comment"
        submitLabel="Comment"
        cancelLabel={null}
        hint="Shift-click the + of another line to comment on a range."
        isSubmitting={false}
        renderEditor={renderPlainEditor}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByRole("textbox", { name: "Leave a comment" }), { target: { value: "Thanks." } })
    fireEvent.click(screen.getByRole("button", { name: "Comment" }))

    expect(screen.getByText("Shift-click the + of another line to comment on a range.")).toBeTruthy()
    expect(onSubmit).toHaveBeenCalledWith("Thanks.")
    expect(screen.getByRole("textbox", { name: "Leave a comment" })).toHaveProperty("value", "")
    expect(screen.getByRole("button", { name: "Comment" })).toHaveProperty("disabled", true)
  })
})

describe("CommentEntry", () => {
  it("shows a review's verdict beside its author, and where a comment was made", () => {
    render(<CommentEntry comment={COMMENTS[0]} verdictLabel="Requested changes" locationLabel="src/price.ts (outdated)" />)

    expect(screen.getByText("Requested changes")).toBeTruthy()
    expect(screen.getByText("src/price.ts (outdated)")).toBeTruthy()
  })
})
