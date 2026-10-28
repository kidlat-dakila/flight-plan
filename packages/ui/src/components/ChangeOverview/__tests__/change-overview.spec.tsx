import { fireEvent, render, screen, within } from "@testing-library/react"
import ChangeOverview, { type ChangeOverviewRow } from "@/components/ChangeOverview"
import { CODE_LINKS } from "@/lib/__tests__/review-samples"

const ROWS: readonly ChangeOverviewRow[] = [
  {
    classification: { key: "component", label: "Component" },
    cards: [
      { id: "form", label: "AddTodoForm", typeLabel: "Component", path: "src/app/_components/add-todo-form.tsx", change: "added", changeLabel: "Added", waypointAnchorId: "waypoint-w1", preview: null },
      { id: "page", label: "CreatePage", typeLabel: "Component", path: "src/app/create/page.tsx", change: "modified", changeLabel: "Modified", waypointAnchorId: null, preview: null },
    ],
  },
  {
    classification: { key: "database-write", label: "Database write" },
    cards: [
      { id: "insert", label: "createTodo", typeLabel: "Function", path: "src/server/api/routers/todo.ts", change: "deleted", changeLabel: "Deleted", waypointAnchorId: "waypoint-w3", preview: null },
    ],
  },
]

describe("ChangeOverview", () => {
  it("groups the plates under their classification, each with its change, name, type and path", () => {
    render(<ChangeOverview anchorId="one-change-overview" heading="Change Overview" emptyMessage={null} rows={ROWS} onOpenWaypoint={vi.fn()} />)

    const section = screen.getByRole("region", { name: "Change Overview" })
    const components = within(section).getByRole("listitem", { name: "Component" })

    expect(within(components).getByText("AddTodoForm")).toBeTruthy()
    expect(within(components).getByText("Added")).toBeTruthy()
    expect(within(components).getByText("src/app/create/page.tsx")).toBeTruthy()
    expect(within(within(section).getByRole("listitem", { name: "Database write" })).getByText("Deleted")).toBeTruthy()
  })

  it("jumps to the first waypoint of a card that has one, and draws a card without one as no button", () => {
    const onOpenWaypoint = vi.fn()
    render(<ChangeOverview anchorId="one-change-overview" heading="Change Overview" emptyMessage={null} rows={ROWS} onOpenWaypoint={onOpenWaypoint} />)

    fireEvent.click(screen.getByRole("button", { name: /AddTodoForm/ }))

    expect(onOpenWaypoint).toHaveBeenCalledWith("waypoint-w1")
    expect(screen.queryByRole("button", { name: /CreatePage/ })).toBeNull()
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("shows the code of a block when its plate takes focus, and still opens its waypoint", async () => {
    const onOpenWaypoint = vi.fn()
    const rows: readonly ChangeOverviewRow[] = [{
      classification: { key: "logic", label: "Logic" },
      cards: [{ id: "price", label: "priceOf", typeLabel: "Function", path: "src/price.ts", change: "modified", changeLabel: "Modified", waypointAnchorId: "waypoint-w2", preview: CODE_LINKS["src/price.ts#priceOf"] }],
    }]
    render(<ChangeOverview anchorId="one-change-overview" heading="Change Overview" emptyMessage={null} rows={rows} onOpenWaypoint={onOpenWaypoint} />)

    const plate = screen.getByRole("button", { name: /priceOf/ })
    fireEvent.focus(plate)

    expect(await screen.findByText("Lines 3 to 4, 2 lines")).toBeTruthy()
    expect(screen.getByText("export const priceOf = () => 1")).toBeTruthy()

    fireEvent.click(plate)

    expect(onOpenWaypoint).toHaveBeenCalledWith("waypoint-w2")
  })

  it("says so when no code changed", () => {
    render(<ChangeOverview anchorId="one-change-overview" heading="Change Overview" emptyMessage="No code changed." rows={[]} onOpenWaypoint={vi.fn()} />)

    expect(screen.getByText("No code changed.")).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })
})
