import { fireEvent, render, screen, within } from "@testing-library/react"
import ChangeOverview, { type ChangeOverviewRow } from "@/components/ChangeOverview"

const ROWS: readonly ChangeOverviewRow[] = [
  {
    classification: { key: "component", label: "Component" },
    cards: [
      { id: "form", label: "AddTodoForm", typeLabel: "Component", path: "src/app/_components/add-todo-form.tsx", change: "added", changeLabel: "Added", waypointAnchorId: "waypoint-w1" },
      { id: "page", label: "CreatePage", typeLabel: "Component", path: "src/app/create/page.tsx", change: "modified", changeLabel: "Modified", waypointAnchorId: null },
    ],
  },
  {
    classification: { key: "database-write", label: "Database write" },
    cards: [
      { id: "insert", label: "createTodo", typeLabel: "Function", path: "src/server/api/routers/todo.ts", change: "deleted", changeLabel: "Deleted", waypointAnchorId: "waypoint-w3" },
    ],
  },
]

describe("ChangeOverview", () => {
  it("lists a row per classification, each card with its change, name, type and path", () => {
    render(<ChangeOverview heading="Change Overview" emptyMessage={null} rows={ROWS} onOpenWaypoint={vi.fn()} />)

    const section = screen.getByRole("region", { name: "Change Overview" })
    const components = within(section).getByRole("listitem", { name: "Component" })

    expect(within(components).getByText("AddTodoForm")).toBeTruthy()
    expect(within(components).getByText("Added")).toBeTruthy()
    expect(within(components).getByText("src/app/create/page.tsx")).toBeTruthy()
    expect(within(within(section).getByRole("listitem", { name: "Database write" })).getByText("Deleted")).toBeTruthy()
  })

  it("jumps to the first waypoint of a card that has one, and draws a card without one as no button", () => {
    const onOpenWaypoint = vi.fn()
    render(<ChangeOverview heading="Change Overview" emptyMessage={null} rows={ROWS} onOpenWaypoint={onOpenWaypoint} />)

    fireEvent.click(screen.getByRole("button", { name: /AddTodoForm/ }))

    expect(onOpenWaypoint).toHaveBeenCalledWith("waypoint-w1")
    expect(screen.queryByRole("button", { name: /CreatePage/ })).toBeNull()
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("says so when no code changed", () => {
    render(<ChangeOverview heading="Change Overview" emptyMessage="No code changed." rows={[]} onOpenWaypoint={vi.fn()} />)

    expect(screen.getByText("No code changed.")).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })
})
