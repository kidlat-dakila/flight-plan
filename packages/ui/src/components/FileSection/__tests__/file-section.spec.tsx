import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import FileSection, { type WalkthroughFile } from "@/components/FileSection"
import { renderPlainEditor } from "@/lib/__tests__/plain-editor"
import { codeLine, paragraph } from "@/lib/__tests__/review-samples"
import { WriteUpAgentContext } from "@/lib/write-up-agent"

const CLAUDE = { name: "claude", label: "Claude" } as const

type FileSectionProps = ComponentProps<typeof FileSection>

const createFile = (overrides: Partial<WalkthroughFile> = {}): WalkthroughFile => ({
  anchorId: "file-price",
  path: "src/price.ts",
  title: "Price",
  isReviewed: false,
  reviewLabel: "Reviewed",
  countLabels: ["1 waypoint", "1 risk"],
  forgeLink: null,
  rows: [
    { kind: "lines", id: "lines-1", lines: [codeLine("3", "export const priceOf = () => 1", "added")], collapses: [] },
    { kind: "gap", id: "gap-1", label: "12 unchanged lines", rootBlockId: null },
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
        rangeLabel: null,
        mark: { kind: "plain", label: "Waypoint 1 of 1: priceOf" },
        lines: null,
        chip: null,
        coreChangeLabel: null,
        reading: null,
        hint: null,
        isBeingWritten: false,
        spotlight: null,
        unwrittenLabel: "Not written yet.",
        coreChange: null,
        findings: [],
        isReviewed: false,
        reviewLabel: "Reviewed",
      },
      rootBlockId: null,
    },
  ],
  rootBlocks: [],
  threads: [],
  ...overrides,
})

const createProps = (overrides: Partial<FileSectionProps> = {}): FileSectionProps => ({
  file: createFile(),
  openWaypointIds: new Set(),
  currentWaypointId: null,
  focusedWaypointId: null,
  isCollapsed: false,
  isReviewPending: false,
  composer: null,
  composingRange: null,
  isCommentPending: false,
  renderCommentEditor: renderPlainEditor,
  codeLinks: {},
  codeDefinitions: {},
  onOpenCodeLink: vi.fn(),
  onToggleWaypoint: vi.fn(),
  onCollapsedChange: vi.fn(),
  onWaypointReviewedChange: vi.fn(),
  onFileReviewedChange: vi.fn(),
  onRootBlockReviewedChange: vi.fn(),
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
        collapses: [],
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
  linesLabel: "Lines 3–4",
  mark: { kind: "open", label: "Open thread" },
  startsOpen: false,
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
      linesLabel: "Removed line 3",
      mark: { kind: "pending", label: "Pending comment" },
      startsOpen: true,
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
    const removed = screen.getByRole("region", { name: "src/price.ts 3" })

    expect(screen.queryByRole("region", { name: "src/price.ts 3 to 4" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Open thread, Lines 3–4", expanded: false }))
    const range = screen.getByRole("region", { name: "src/price.ts 3 to 4" })

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

describe("FileSection gutter", () => {
  const placedFile = (): WalkthroughFile => {
    const [, , waypointRow] = createFile().rows
    return createFile({
      rows: [
        waypointRow.kind === "waypoint"
          ? { ...waypointRow, waypoint: { ...waypointRow.waypoint, lines: { lineStart: 3, lineEnd: 4 }, rangeLabel: "Lines 3–4" } }
          : waypointRow,
        { kind: "lines", id: "lines-3", lines: [codeLine("3", "export const priceOf = () => 1", "added"), codeLine("4", "// held units", "added")], collapses: [] },
      ],
    })
  }

  it("draws a closed waypoint as a mark beside its first line, carrying its anchor, and opens it from the mark", () => {
    const onToggleWaypoint = vi.fn()
    render(<FileSection {...createProps({ file: placedFile(), onToggleWaypoint })} />)
    const mark = screen.getByRole("button", { name: "Waypoint 1 of 1: priceOf", expanded: false })

    expect(screen.queryByRole("region", { name: "priceOf" })).toBeNull()
    expect(mark.id).toBe("waypoint-w1")
    expect(mark.closest("[data-line]")).toBe(rowOf("export const priceOf = () => 1"))
    expect(mark.tabIndex).toBe(0)

    fireEvent.click(mark)

    expect(onToggleWaypoint).toHaveBeenCalledWith("w1")
  })

  it("draws a checkmark for the mark of a reviewed waypoint", () => {
    const file = placedFile()
    const reviewedFile = createFile({
      rows: file.rows.map((row) => (row.kind === "waypoint" ? { ...row, waypoint: { ...row.waypoint, isReviewed: true } } : row)),
    })
    const view = render(<FileSection {...createProps({ file })} />)

    expect(screen.getByRole("button", { name: "Waypoint 1 of 1: priceOf" }).querySelector("[data-reviewed-glyph]")).toBeNull()

    view.rerender(<FileSection {...createProps({ file: reviewedFile })} />)

    expect(screen.getByRole("button", { name: "Waypoint 1 of 1: priceOf" }).querySelector("[data-reviewed-glyph]")).not.toBeNull()
  })

  const unwrittenFile = (waypointChange: object, rootBlockId: string | null): WalkthroughFile => {
    const file = placedFile()
    return createFile({
      rows: file.rows.map((row) => (row.kind === "waypoint" ? { ...row, rootBlockId, waypoint: { ...row.waypoint, ...waypointChange } } : row)),
    })
  }

  it("draws the write-up ring for the mark of a waypoint with no write-up, spinning while it is written", () => {
    const view = render(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, null) })} />)
    const ringOf = () => screen.getByRole("button", { name: "Waypoint 1 of 1: priceOf" }).querySelector("[data-being-written]")

    expect(ringOf()?.getAttribute("data-being-written")).toBe("false")

    view.rerender(<FileSection {...createProps({ file: unwrittenFile({ isBeingWritten: true }, null) })} />)

    expect(ringOf()?.getAttribute("data-being-written")).toBe("true")
  })

  it("shows the hint in the card of a waypoint with no write-up, and asks for a write-up of the line or of its whole code block", async () => {
    const onWriteUp = vi.fn()
    render(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, "root-1"), previewVisit: { waypointId: "w1", count: 1 }, onWriteUp })} />)

    expect(await screen.findByText("Adds a function.")).toBeTruthy()
    expect(screen.getByText("This line of code is not explained or checked for issues yet.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Explain this line/ }))
    fireEvent.click(screen.getByRole("button", { name: /Explain the whole code block/ }))

    expect(onWriteUp.mock.calls).toStrictEqual([[{ kind: "waypoint", waypointId: "w1" }], [{ kind: "root-block", rootBlockId: "root-1" }]])
  })

  it("names the agent that would explain the waypoint with its mark, and that it is explaining it", async () => {
    const view = render(
      <WriteUpAgentContext value={CLAUDE}>
        <FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, null), previewVisit: { waypointId: "w1", count: 1 }, onWriteUp: vi.fn() })} />
      </WriteUpAgentContext>,
    )

    expect(await screen.findByText("Claude has not explained this line of code or checked it for issues yet.")).toBeTruthy()
    const explainButton = screen.getByRole("button", { name: "Let Claude explain" })

    expect(explainButton.querySelector("[data-agent-mark=claude] path")?.getAttribute("fill")).toBe("#D97757")
    expect(explainButton.querySelector("kbd")?.textContent).toBe("g")

    view.rerender(
      <WriteUpAgentContext value={CLAUDE}>
        <FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function.", isBeingWritten: true }, null), previewVisit: { waypointId: "w1", count: 1 }, onWriteUp: vi.fn() })} />
      </WriteUpAgentContext>,
    )

    expect(await screen.findByText("Claude is explaining this line.")).toBeTruthy()
  })

  it("draws skeleton lines in the card while the agent writes the waypoint, and offers no write-up then", async () => {
    render(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function.", isBeingWritten: true }, "root-1"), previewVisit: { waypointId: "w1", count: 1 }, onWriteUp: vi.fn() })} />)
    const card = (await screen.findByText("Adds a function.")).parentElement

    expect(card?.querySelector("[data-unwritten]")).not.toBeNull()
    expect(screen.getByText("The agent is explaining this line.")).toBeTruthy()
    expect(screen.queryByText("This line of code is not explained or checked for issues yet.")).toBeNull()
    expect(screen.queryByRole("button", { name: /Explain this line/ })).toBeNull()
  })

  it("offers no write-up where the page gives none, and none of a whole code block for a waypoint outside one", async () => {
    const view = render(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, null), previewVisit: { waypointId: "w1", count: 1 }, onWriteUp: vi.fn() })} />)

    expect(await screen.findByRole("button", { name: /Explain this line/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Explain the whole code block/ })).toBeNull()

    view.rerender(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, null), previewVisit: { waypointId: "w1", count: 1 } })} />)

    expect(screen.queryByRole("button", { name: /Explain this line/ })).toBeNull()
  })

  it("asks the author to write the description of a waypoint with none or to let the agent explain it, and draws the editor and the box actions the page gives", async () => {
    const onWriteDescription = vi.fn()
    const authoring = {
      editedWaypointId: null,
      renderEditor: (waypointId: string) => <form aria-label={`Editor of ${waypointId}`} />,
      renderActions: (waypointId: string) => <button type="button">{`Remove ${waypointId}`}</button>,
      onWriteDescription,
    }
    const file = unwrittenFile({ hint: "Adds a function." }, null)
    const view = render(<FileSection {...createProps({ file, previewVisit: { waypointId: "w1", count: 1 }, authoring, onWriteUp: vi.fn(), headerActions: <button type="button">Remove the file</button> })} />)

    expect(await screen.findByText("This waypoint does not have any description or explanation.")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Explain this line/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Write description" }).querySelector("kbd")?.textContent).toBe("c")
    expect(screen.getByRole("button", { name: "Remove the file" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Write description/ }))

    expect(onWriteDescription).toHaveBeenCalledWith("w1")

    view.rerender(<FileSection {...createProps({ file, openWaypointIds: new Set(["w1"]), authoring })} />)

    expect(screen.getByRole("button", { name: "Remove w1" })).toBeTruthy()

    view.rerender(<FileSection {...createProps({ file, authoring: { ...authoring, editedWaypointId: "w1" } })} />)

    expect(screen.getByRole("form", { name: "Editor of w1" })).toBeTruthy()
  })

  it("expands the waypoint from the button in its card", async () => {
    const onToggleWaypoint = vi.fn()
    render(<FileSection {...createProps({ file: unwrittenFile({ hint: "Adds a function." }, null), previewVisit: { waypointId: "w1", count: 1 }, onToggleWaypoint })} />)

    fireEvent.click(await screen.findByRole("button", { name: "Expand" }))

    expect(onToggleWaypoint).toHaveBeenCalledWith("w1")
  })

  it("draws an open waypoint's box above its lines, moves the anchor to the box, and keeps the mark", () => {
    render(<FileSection {...createProps({ file: placedFile(), openWaypointIds: new Set(["w1"]) })} />)
    const box = screen.getByRole("region", { name: "priceOf" })

    expect(document.getElementById("waypoint-w1")).toBe(box)
    expect(screen.getByRole("button", { name: "Waypoint 1 of 1: priceOf", expanded: true })).toBeTruthy()
  })

  it("opens and closes a thread from its mark, and shows the file's counts in its header", () => {
    render(<FileSection {...createProps({ file: discussedFile([thread()]), composer: COMPOSER })} />)
    const mark = screen.getByRole("button", { name: "Open thread, Lines 3–4" })

    expect(screen.getByText("1 risk")).toBeTruthy()
    expect(mark.closest("[data-line]")).toBe(rowOf("// held units"))
    expect(screen.queryByRole("button", { name: "Add a comment on this line 4" })).toBeNull()

    fireEvent.click(mark)

    expect(screen.getByText("Clamp it.")).toBeTruthy()

    fireEvent.click(mark)

    expect(screen.queryByText("Clamp it.")).toBeNull()
  })
})

const ROOT_BLOCK_ID = "src/price.ts#function:priceOf"

type RootBlockMarks = Pick<WalkthroughFile["rootBlocks"][number], "coreChangeLabel" | "spotlight" | "isFoldedByFilter">

const NO_ROOT_BLOCK_MARKS: RootBlockMarks = { coreChangeLabel: null, spotlight: null, isFoldedByFilter: false }

const rootBlockFile = (isReviewed: boolean, marks: Partial<RootBlockMarks> = {}): WalkthroughFile =>
  createFile({
    rootBlocks: [
      {
        id: ROOT_BLOCK_ID,
        ...NO_ROOT_BLOCK_MARKS,
        ...marks,
        isReviewed,
        reviewLabel: "Reviewed",
        reviewName: "Reviewed: Function priceOf",
        expandLabel: "Expand Function priceOf",
        collapseLabel: "Collapse Function priceOf",
      },
    ],
    rows: [
      {
        kind: "lines",
        id: "lines-1",
        lines: [codeLine("3", "export const priceOf = () => {", "added"), codeLine("4", "  return held", "added")],
        collapses: [{ rootBlockId: ROOT_BLOCK_ID, fromLine: 1, toLine: 2, hasTrigger: true }],
      },
      { kind: "gap", id: "gap-1", label: "12 unchanged lines", rootBlockId: ROOT_BLOCK_ID },
      { kind: "lines", id: "lines-2", lines: [codeLine("17", "}", "added")], collapses: [{ rootBlockId: ROOT_BLOCK_ID, fromLine: 1, toLine: 1, hasTrigger: false }] },
      { kind: "lines", id: "lines-3", lines: [codeLine("18", "export const tax = 0")], collapses: [] },
    ],
  })

describe("FileSection root blocks", () => {
  it("marks a root block as reviewed from its first line", () => {
    const onRootBlockReviewedChange = vi.fn()
    render(<FileSection {...createProps({ file: rootBlockFile(false), onRootBlockReviewedChange })} />)

    fireEvent.click(screen.getByRole("button", { name: "Reviewed: Function priceOf", pressed: false }))

    expect(onRootBlockReviewedChange).toHaveBeenCalledWith(ROOT_BLOCK_ID, true)
  })

  it("marks a root block that is a core change and in the spotlight on its first line", () => {
    const view = render(<FileSection {...createProps({ file: rootBlockFile(false) })} />)

    expect(screen.queryByText("Core change")).toBeNull()
    expect(screen.queryByText("Spotlight")).toBeNull()

    view.rerender(<FileSection {...createProps({ file: rootBlockFile(false, { coreChangeLabel: "Core change", spotlight: { label: "Spotlight", classifications: [{ key: "logic", label: "Plain logic" }] } }) })} />)

    expect(screen.getByText("Core change")).toBeTruthy()
    expect(screen.getByText("Spotlight")).toBeTruthy()
    expect(screen.getByText("Plain logic")).toBeTruthy()
  })

  it("collapses a reviewed root block to its first line, gaps included, and opens it by hand without taking the mark off", () => {
    const onRootBlockReviewedChange = vi.fn()
    render(<FileSection {...createProps({ file: rootBlockFile(true), onRootBlockReviewedChange })} />)

    expect(screen.getByText("export const priceOf = () => {")).toBeTruthy()
    expect(screen.queryByText("return held", { exact: false })).toBeNull()
    expect(screen.queryByText("12 unchanged lines")).toBeNull()
    expect(screen.queryByText("}")).toBeNull()
    expect(screen.getByText("export const tax = 0")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Expand Function priceOf" }))

    expect(screen.getByText("return held", { exact: false })).toBeTruthy()
    expect(screen.getByText("12 unchanged lines")).toBeTruthy()
    expect(screen.getByText("}")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Reviewed: Function priceOf", pressed: true })).toBeTruthy()
    expect(onRootBlockReviewedChange).not.toHaveBeenCalled()
  })

  it("collapses a root block again once it is marked reviewed after being opened", () => {
    const view = render(<FileSection {...createProps({ file: rootBlockFile(true) })} />)
    fireEvent.click(screen.getByRole("button", { name: "Expand Function priceOf" }))

    view.rerender(<FileSection {...createProps({ file: rootBlockFile(false) })} />)

    expect(screen.getByText("return held", { exact: false })).toBeTruthy()

    view.rerender(<FileSection {...createProps({ file: rootBlockFile(true) })} />)

    expect(screen.queryByText("return held", { exact: false })).toBeNull()
  })

  it("folds a root block the filter folds to its first line, opens it by hand, and unfolds it once the filter lets it through", () => {
    const view = render(<FileSection {...createProps({ file: rootBlockFile(false, { isFoldedByFilter: true }) })} />)

    expect(screen.getByText("export const priceOf = () => {")).toBeTruthy()
    expect(screen.queryByText("return held", { exact: false })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Expand Function priceOf" }))

    expect(screen.getByText("return held", { exact: false })).toBeTruthy()

    view.rerender(<FileSection {...createProps({ file: rootBlockFile(false, { isFoldedByFilter: false }) })} />)

    expect(screen.getByText("return held", { exact: false })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Collapse Function priceOf" })).toBeTruthy()
  })

  it("folds a root block by hand, and has no review toggle where the page does not track reviews", () => {
    render(<FileSection {...createProps({ file: rootBlockFile(false), onRootBlockReviewedChange: null })} />)

    expect(screen.queryByRole("button", { name: "Reviewed: Function priceOf" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Collapse Function priceOf" }))

    expect(screen.queryByText("return held", { exact: false })).toBeNull()
  })
})

describe("FileSection", () => {
  it("shows the file's title, path, code, gap and waypoint", () => {
    render(<FileSection {...createProps()} />)

    const section = screen.getByRole("article", { name: "Price" })

    expect(within(section).getByRole("heading", { level: 3, name: "Price" })).toBeTruthy()
    expect(within(section).getByText("src/price.ts")).toBeTruthy()
    expect(within(section).getByText("12 unchanged lines")).toBeTruthy()
    expect(within(section).getByRole("region", { name: "priceOf" })).toBeTruthy()
  })

  it("asks to collapse its code, and draws only its header while it is collapsed", () => {
    const onCollapsedChange = vi.fn()
    const view = render(<FileSection {...createProps({ onCollapsedChange })} />)

    fireEvent.click(screen.getByRole("button", { name: "Collapse file: src/price.ts" }))

    expect(onCollapsedChange).toHaveBeenCalledWith(true)

    view.rerender(<FileSection {...createProps({ onCollapsedChange, isCollapsed: true })} />)

    expect(screen.queryByText("12 unchanged lines")).toBeNull()
    expect(screen.queryByRole("region", { name: "priceOf" })).toBeNull()
    expect(screen.getByRole("heading", { level: 3, name: "Price" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Expand file: src/price.ts", expanded: false }))

    expect(onCollapsedChange).toHaveBeenLastCalledWith(false)
  })

  it("dims the code outside the lines of the waypoint in focus", () => {
    const file = createFile({
      rows: [
        ...createFile().rows,
        { kind: "lines", id: "lines-2", lines: [codeLine("16", "export const total = 2", "added")], collapses: [] },
        { kind: "gap", id: "gap-2", label: "4 unchanged lines", rootBlockId: null },
        { kind: "lines", id: "lines-3", lines: [codeLine("21", "export const tax = 3", "added")], collapses: [] },
      ],
    })
    const { container } = render(<FileSection {...createProps({ file, focusedWaypointId: "w1" })} />)
    const unfocusedOf = (text: string) => screen.getByText(text, { exact: false }).closest("[data-unfocused]")?.getAttribute("data-unfocused")

    expect(unfocusedOf("total")).toBe("false")
    expect(unfocusedOf("priceOf = ")).toBe("true")
    expect(unfocusedOf("tax")).toBe("true")
    expect(container.querySelectorAll("[data-waypoint-focus='w1']")).toHaveLength(2)
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

  it("gives the file one tab stop among its references, and moves between the references of every row with the arrow keys", () => {
    const declaration = { kind: "declaration" as const, pathLabel: "src/rates.ts", rangeLabel: "Line 1", description: null, lines: [], note: null, forgeLink: null }
    const file = createFile({
      rows: [
        { kind: "lines", id: "lines-1", lines: [{ ...codeLine("3", "return rates[sku]"), references: [{ fromColumn: 8, toColumn: 12, definitionId: "rates" }] }], collapses: [] },
        { kind: "gap", id: "gap-1", label: "2 unchanged lines", rootBlockId: null },
        { kind: "lines", id: "lines-2", lines: [{ ...codeLine("6", "return held"), references: [{ fromColumn: 8, toColumn: 11, definitionId: "held" }] }], collapses: [] },
      ],
    })
    render(<FileSection {...createProps({ file, codeDefinitions: { rates: declaration, held: declaration } })} />)
    const [rates, held] = [...document.querySelectorAll<HTMLElement>("[data-reference]")]

    expect([rates.textContent, rates.tabIndex, held.textContent, held.tabIndex]).toStrictEqual(["rates", 0, "held", -1])

    rates.focus()
    fireEvent.keyDown(rates, { key: "ArrowRight" })

    expect(document.activeElement).toBe(held)
  })
})
