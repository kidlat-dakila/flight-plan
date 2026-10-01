import { fireEvent, render, screen } from "@testing-library/react"
import CommentThread, { CommentComposer, CommentEntry, type ThreadComment } from "@/components/CommentThread"
import { paragraph } from "@/lib/__tests__/review-samples"

const COMMENTS: readonly ThreadComment[] = [
  { id: "c1", author: { name: "amara", avatarUrl: null, monogram: "A" }, body: paragraph("Can this go negative?"), timeLabel: "2 hours ago", pendingLabel: null },
  { id: "c2", author: { name: "you", avatarUrl: null, monogram: "Y" }, body: paragraph("It can."), timeLabel: "just now", pendingLabel: "Pending" },
]

const renderThread = (onReply = vi.fn()) =>
  render(
    <CommentThread comments={COMMENTS} replyLabel="Reply, src/price.ts 13" replyPlaceholder="Reply" submitLabel="Add to review" cancelLabel="Cancel" isSubmitting={false} onReply={onReply} />,
  )

describe("CommentThread", () => {
  it("shows each comment with its author and time, and marks one that is not sent yet", () => {
    renderThread()

    expect(screen.getByText("Can this go negative?")).toBeTruthy()
    expect(screen.getByText("amara")).toBeTruthy()
    expect(screen.getByText("2 hours ago")).toBeTruthy()
    expect(screen.getByText("Pending")).toBeTruthy()
  })

  it("opens a reply box, sends the reply and closes the box", () => {
    const onReply = vi.fn()
    renderThread(onReply)

    fireEvent.click(screen.getByRole("button", { name: "Reply" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Reply, src/price.ts 13" }), { target: { value: "Clamping it." } })
    fireEvent.click(screen.getByRole("button", { name: "Add to review" }))

    expect(onReply).toHaveBeenCalledWith("Clamping it.")
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("closes the reply box without sending when cancelled", () => {
    const onReply = vi.fn()
    renderThread(onReply)

    fireEvent.click(screen.getByRole("button", { name: "Reply" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onReply).not.toHaveBeenCalled()
    expect(screen.queryByRole("textbox")).toBeNull()
  })
})

describe("CommentComposer", () => {
  it("cannot send an empty comment", () => {
    render(<CommentComposer label="Leave a comment" placeholder="Leave a comment" submitLabel="Add to review" cancelLabel={null} isSubmitting={false} onSubmit={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Add to review" })).toHaveProperty("disabled", true)
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull()
  })
})

describe("CommentEntry", () => {
  it("shows a review's verdict beside its author", () => {
    render(<CommentEntry comment={COMMENTS[0]} verdictLabel="Requested changes" />)

    expect(screen.getByText("Requested changes")).toBeTruthy()
  })
})
