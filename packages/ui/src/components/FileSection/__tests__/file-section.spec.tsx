import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import FileSection, { type WalkthroughFile } from "@/components/FileSection"
import { renderPlainEditor } from "@/lib/__tests__/plain-editor"
import { codeLine, paragraph } from "@/lib/__tests__/review-samples"

type FileSectionProps = ComponentProps<typeof FileSection>

const createFile = (overrides: Partial<WalkthroughFile> = {}): WalkthroughFile => ({
  anchorId: "file-price",
  path: "src/price.ts",
  title: "Price",
  isDraft: false,
  isReviewed: false,
  reviewLabel: "Reviewed",
  summary: [paragraph("Held units reduce the price.")],
  waypointCountLabel: "1 waypoint",
  forgeLink: null,
  rows: [
    { kind: "lines", id: "lines-1", lines: [codeLine("3", "export const priceOf = () => 1", "added")] },
    { kind: "gap", id: "gap-1", label: "12 unchanged lines" },
    {
      kind: "waypoint",
      id: "row-w1",
      waypoint: {
        id: "w1",
        previousId: null,
        nextId: null,
        anchorId: "waypoint-w1",
        depth: 0,
        title: "priceOf",
        isDraft: true,
        positionLabel: "1 of 1",
        chip: null,
        attentionLabel: null,
        reading: null,
        unwrittenLabel: "Not written yet.",
        needsAttention: null,
        findings: [],
        isReviewed: false,
        reviewLabel: "Reviewed",
      },
    },
  ],
  threads: [],
  ...overrides,
})

const createProps = (overrides: Partial<FileSectionProps> = {}): FileSectionProps => ({
  file: createFile(),
  openWaypointIds: new Set(),
  currentWaypointId: null,
  isReviewPending: false,
  composer: null,
  composingRange: null,
  isCommentPending: false,
  renderCommentEditor: renderPlainEditor,
  codeLinks: {},
  codeDefinitions: {},
  onOpenCodeLink: vi.fn(),
  onToggleWaypoint: vi.fn(),
  onWaypointReviewedChange: vi.fn(),
  onFileReviewedChange: vi.fn(),
  onStartComment: vi.fn(),
  onAddComment: vi.fn(),
  onPostComment: vi.fn(),
  onReply: vi.fn(),
  onResolveThread: vi.fn(),
  onDiscardComment: vi.fn(),
  ...overrides,
})

const COMPOSER = {
  addLabel: "Add a comment on this line",
  placeholder: "Leave a comment",
  replyPlaceholder: "Reply",
  submitLabel: "Add to review",
  postNowLabel: "Add single comment",
  replyLabel: "Reply",
  commentLabel: "Comment",
  cancelLabel: "Cancel",
  rangeHint: "Shift-click the + of another line to comment on a range.",
}

const removedLine = { ...codeLine("", "export const priceOf = () => 0", "removed"), removedNumberLabel: "3" }

const discussedFile = (threads: WalkthroughFile["threads"] = []): WalkthroughFile =>
  createFile({
    rows: [
      {
        kind: "lines",
        id: "lines-1",
        lines: [removedLine, codeLine("3", "export const priceOf = () => 1", "added"), codeLine("4", "// held units", "added"), codeLine("5", "export const tax = 0")],
      },
    ],
    threads,
  })

const thread = (overrides: Partial<WalkthroughFile["threads"][number]> = {}): WalkthroughFile["threads"][number] => ({
  id: "t1",
  side: "new",
  lineLabel: "4",
  startLineLabel: "3",
  rangeLabel: "Lines 3–4",
  statusLabel: null,
  resolution: { label: "Resolve conversation", isResolving: true },
  canReply: true,
  comments: [
    { id: "c1", author: { name: "amara", avatarUrl: null, monogram: "A" }, body: paragraph("Clamp it."), timeLabel: "1 hour ago", pendingLabel: null, discardLabel: null },
  ],
  ...overrides,
})

const rowOf = (text: string): HTMLElement | null => screen.getByText(text).closest("[data-line]")

describe("FileSection comments", () => {
  it("starts a comment on a new line and on a removed line, and extends it with shift", () => {
    const onStartComment = vi.fn()
    render(<FileSection {...createProps({ file: discussedFile(), composer: COMPOSER, onStartComment })} />)

    fireEvent.click(screen.getByRole("button", { name: "Add a comment on this line added 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Add a comment on this line removed 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Add a comment on this line 5" }), { shiftKey: true })

    expect(onStartComment.mock.calls).toStrictEqual([
      ["src/price.ts", { side: "new", lineLabel: "3" }, false],
      ["src/price.ts", { side: "old", lineLabel: "3" }, false],
      ["src/price.ts", { side: "new", lineLabel: "5" }, true],
    ])
  })

  it("draws the comment box under the last line of its range, marks the range, and adds the comment", () => {
    const onAddComment = vi.fn()
    const onStartComment = vi.fn()
    const composingRange = { side: "new" as const, startLineLabel: "3", lineLabel: "4" }
    render(<FileSection {...createProps({ file: discussedFile(), composer: COMPOSER, composingRange, onAddComment, onStartComment })} />)

    expect(rowOf("export const priceOf = () => 1")?.getAttribute("data-commented")).toBe("true")
    expect(rowOf("// held units")?.getAttribute("data-commented")).toBe("true")
    expect(rowOf("export const priceOf = () => 0")?.getAttribute("data-commented")).toBe("false")
    expect(rowOf("export const tax = 0")?.getAttribute("data-commented")).toBe("false")
    expect(screen.getByText("Shift-click the + of another line to comment on a range.")).toBeTruthy()

    fireEvent.change(screen.getByRole("textbox", { name: "Leave a comment, src/price.ts 3 to 4" }), { target: { value: "Clamp these." } })
    fireEvent.click(screen.getByRole("button", { name: "Add to review" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onAddComment).toHaveBeenCalledWith("src/price.ts", composingRange, "Clamp these.")
    expect(onStartComment).toHaveBeenCalledWith("src/price.ts", null, false)
  })

  it("sends a single comment at once from the comment box, without adding it to the review", () => {
    const onAddComment = vi.fn()
    const onPostComment = vi.fn()
    const composingRange = { side: "new" as const, startLineLabel: "3", lineLabel: "4" }
    render(<FileSection {...createProps({ file: discussedFile(), composer: COMPOSER, composingRange, onAddComment, onPostComment })} />)

    fireEvent.change(screen.getByRole("textbox", { name: "Leave a comment, src/price.ts 3 to 4" }), { target: { value: "Clamp these." } })
    fireEvent.click(screen.getByRole("button", { name: "Add single comment" }))

    expect(onPostComment).toHaveBeenCalledWith("src/price.ts", composingRange, "Clamp these.")
    expect(onAddComment).not.toHaveBeenCalled()
  })

  it("draws a thread under its line on the side it is on, and passes on a reply, a resolution and a discard", () => {
    const onReply = vi.fn()
    const onResolveThread = vi.fn()
    const onDiscardComment = vi.fn()
    const pending = thread({
      id: "pending-p1",
      side: "old",
      lineLabel: "3",
      startLineLabel: "3",
      rangeLabel: "Removed line 3",
      resolution: null,
      canReply: false,
      comments: [
        { id: "p1", author: { name: "you", avatarUrl: null, monogram: "Y" }, body: paragraph("Why drop it?"), timeLabel: "just now", pendingLabel: "Pending", discardLabel: "Discard" },
      ],
    })
    render(
      <FileSection
        {...createProps({ file: discussedFile([thread(), pending]), composer: COMPOSER, onReply, onResolveThread, onDiscardComment })}
      />,
    )
    const range = screen.getByRole("region", { name: "src/price.ts 3 to 4" })
    const removed = screen.getByRole("region", { name: "src/price.ts 3" })

    expect(within(range).getByText("Lines 3–4")).toBeTruthy()
    expect(within(removed).getByText("Removed line 3")).toBeTruthy()
    expect(rowOf("export const priceOf = () => 0")?.getAttribute("data-commented")).toBe("true")

    fireEvent.click(within(range).getByRole("button", { name: "Reply" }))
    fireEvent.change(within(range).getByRole("textbox"), { target: { value: "Done." } })
    fireEvent.click(within(range).getByRole("button", { name: "Reply" }))
    fireEvent.click(within(range).getByRole("button", { name: "Resolve conversation" }))
    fireEvent.click(within(removed).getByRole("button", { name: "Discard" }))

    expect(onReply).toHaveBeenCalledWith("t1", "Done.")
    expect(onResolveThread).toHaveBeenCalledWith("t1", true)
    expect(onDiscardComment).toHaveBeenCalledWith("p1")
  })

  it("has no way to comment where the page gives no composer", () => {
    render(<FileSection {...createProps({ file: discussedFile([thread()]) })} />)

    expect(screen.queryByRole("button", { name: /Add a comment/ })).toBeNull()
    expect(screen.queryByText("Clamp it.")).toBeNull()
  })
})

describe("FileSection", () => {
  it("shows the file's title, path, summary, code, gap and waypoint", () => {
    render(<FileSection {...createProps()} />)

    const section = screen.getByRole("article", { name: "Price" })

    expect(within(section).getByRole("heading", { level: 3, name: "Price" })).toBeTruthy()
    expect(within(section).getByText("src/price.ts")).toBeTruthy()
    expect(within(section).getByText("Held units reduce the price.")).toBeTruthy()
    expect(within(section).getByText("1 waypoint")).toBeTruthy()
    expect(within(section).getByText("12 unchanged lines")).toBeTruthy()
    expect(within(section).getByRole("region", { name: "priceOf" })).toBeTruthy()
  })

  it("opens a waypoint that is clicked", () => {
    const onToggleWaypoint = vi.fn()
    render(<FileSection {...createProps({ onToggleWaypoint })} />)

    fireEvent.click(within(screen.getByRole("region", { name: "priceOf" })).getByRole("button", { expanded: false }))

    expect(onToggleWaypoint).toHaveBeenCalledWith("w1")
  })

  it("marks the file as reviewed", () => {
    const onFileReviewedChange = vi.fn()
    render(<FileSection {...createProps({ onFileReviewedChange, onWaypointReviewedChange: null })} />)

    fireEvent.click(screen.getByRole("button", { name: "Reviewed" }))

    expect(onFileReviewedChange).toHaveBeenCalledWith("src/price.ts", true)
  })

  it("has no review toggle when the page does not track reviews", () => {
    render(<FileSection {...createProps({ onFileReviewedChange: null, onWaypointReviewedChange: null })} />)

    expect(screen.queryByRole("button", { name: "Reviewed" })).toBeNull()
  })
})
