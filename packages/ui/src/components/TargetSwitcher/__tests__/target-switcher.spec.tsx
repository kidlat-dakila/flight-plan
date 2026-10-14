import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import TargetSwitcher, { type TargetSwitcherContent, type TargetSwitching } from "@/components/TargetSwitcher"

const SWITCHER: TargetSwitcherContent = {
  heading: "Branches in storefront",
  searchPlaceholder: "Search by title or author",
  emptyLabel: null,
  currentTargetId: "pr-412",
  targets: [
    {
      id: "pr-416",
      title: { text: "Show the gift card balance at checkout", kind: "plain" },
      details: [{ text: "#416", kind: "plain" }, { text: "feature/gift-card-balance", kind: "code" }],
      author: { name: "lena", avatarUrl: null, monogram: "L" },
      branchStatus: "no-review",
      statusLabel: "No review",
    },
    {
      id: "pr-412",
      title: { text: "Count held units in the stock check", kind: "plain" },
      details: [{ text: "#412", kind: "plain" }],
      author: { name: "mira", avatarUrl: null, monogram: "M" },
      branchStatus: "stale",
      statusLabel: "Stale",
    },
  ],
}

const createSwitching = (overrides: Partial<TargetSwitching> = {}): TargetSwitching => ({
  switcher: SWITCHER,
  placeholder: "Loading the branches…",
  query: "",
  onOpen: vi.fn(),
  onSearch: vi.fn(),
  onSwitch: vi.fn(),
  ...overrides,
})

const TITLE = "Count held units in the stock check"

describe("TargetSwitcher", () => {
  it("lists the repository's branches with their authors once opened, searches them, and switches to the one chosen", async () => {
    const switching = createSwitching()
    render(<TargetSwitcher title={TITLE} className="" switching={switching} />)

    expect(screen.getByRole("heading", { name: TITLE })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: TITLE }))
    const list = await screen.findByRole("list", { name: "Branches in storefront" })
    expect(within(list).getByText("lena")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search by title or author" }), { target: { value: "lena" } })
    fireEvent.click(within(list).getByRole("button", { name: /Show the gift card balance at checkout/ }))

    expect(switching.onOpen).toHaveBeenCalledTimes(1)
    expect(switching.onSearch).toHaveBeenCalledWith("lena")
    expect(switching.onSwitch).toHaveBeenCalledWith("pr-416")
    await waitFor(() => {
      expect(screen.queryByRole("list", { name: "Branches in storefront" })).toBeNull()
    })
  })

  it("stays on the branch under review when it is chosen again", async () => {
    const switching = createSwitching()
    render(<TargetSwitcher title={TITLE} className="" switching={switching} />)

    fireEvent.click(screen.getByRole("button", { name: TITLE }))
    const current = await screen.findByRole("button", { name: /#412/ })
    fireEvent.click(current)

    expect(current.getAttribute("aria-current")).toBe("page")
    expect(switching.onSwitch).not.toHaveBeenCalled()
  })

  it("shows the placeholder until the list arrives, and the empty label when nothing is listed", async () => {
    const { rerender } = render(<TargetSwitcher title={TITLE} className="" switching={createSwitching({ switcher: null })} />)

    fireEvent.click(screen.getByRole("button", { name: TITLE }))
    expect(await screen.findByText("Loading the branches…")).toBeTruthy()

    rerender(
      <TargetSwitcher
        title={TITLE}
        className=""
        switching={createSwitching({ switcher: { ...SWITCHER, targets: [], emptyLabel: "No other branches are listed in this repository." } })}
      />,
    )

    expect(await screen.findByText("No other branches are listed in this repository.")).toBeTruthy()
  })

  it("is a plain heading where the page gives no switching", () => {
    render(<TargetSwitcher title={TITLE} className="" switching={null} />)

    expect(screen.getByRole("heading", { name: TITLE })).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
