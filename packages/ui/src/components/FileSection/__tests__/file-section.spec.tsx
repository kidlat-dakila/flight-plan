import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import FileSection, { type WalkthroughFile } from "@/components/FileSection"
import { codeLine, paragraph } from "@/lib/__tests__/review-samples"

type FileSectionProps = ComponentProps<typeof FileSection>

const createFile = (overrides: Partial<WalkthroughFile> = {}): WalkthroughFile => ({
  anchorId: "file-price",
  path: "src/price.ts",
  title: "Price",
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
  composingLineLabel: null,
  isCommentPending: false,
  codeLinks: {},
  onOpenCodeLink: vi.fn(),
  onToggleWaypoint: vi.fn(),
  onWaypointReviewedChange: vi.fn(),
  onFileReviewedChange: vi.fn(),
  onStartComment: vi.fn(),
  onAddComment: vi.fn(),
  onReply: vi.fn(),
  ...overrides,
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
