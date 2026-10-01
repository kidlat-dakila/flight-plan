import { fireEvent, render, screen } from "@testing-library/react"
import FilterMenu, { FilterMenuOption, FilterMenuReset } from "@/components/FilterMenu"

const renderMenu = (onToggle: () => void, onReset: () => void) =>
  render(
    <FilterMenu label="Status: 1 of 2">
      <FilterMenuOption label="Stale" countLabel="3" isSelected onToggle={onToggle} />
      <FilterMenuOption label="Merged" countLabel="0" isSelected={false} onToggle={onToggle} />
      <FilterMenuReset label="Reset" onReset={onReset} />
    </FilterMenu>,
  )

describe("FilterMenu", () => {
  it("keeps its options closed behind a button", () => {
    renderMenu(vi.fn(), vi.fn())

    expect(screen.getByRole("button", { name: "Status: 1 of 2" })).toBeTruthy()
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull()
  })

  it("shows every option with its count and whether it is ticked", async () => {
    renderMenu(vi.fn(), vi.fn())

    fireEvent.click(screen.getByRole("button", { name: "Status: 1 of 2" }))

    expect((await screen.findByRole("menuitemcheckbox", { name: "Stale 3" })).getAttribute("aria-checked")).toBe("true")
    expect(screen.getByRole("menuitemcheckbox", { name: "Merged 0" }).getAttribute("aria-checked")).toBe("false")
  })

  it("reports a toggled option and stays open for the next one", async () => {
    const onToggle = vi.fn()
    renderMenu(onToggle, vi.fn())

    fireEvent.click(screen.getByRole("button", { name: "Status: 1 of 2" }))
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Merged 0" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("menuitemcheckbox", { name: "Stale 3" })).toBeTruthy()
  })

  it("reports a reset", async () => {
    const onReset = vi.fn()
    renderMenu(vi.fn(), onReset)

    fireEvent.click(screen.getByRole("button", { name: "Status: 1 of 2" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reset" }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
