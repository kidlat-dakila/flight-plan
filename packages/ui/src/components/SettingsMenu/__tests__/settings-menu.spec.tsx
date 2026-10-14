import { fireEvent, render, screen } from "@testing-library/react"
import SettingsMenu, { type SettingsMenuLink, type ThemeToggle } from "@/components/SettingsMenu"

const LINKS: readonly SettingsMenuLink[] = [
  { label: "Agent integration", icon: "agents", link: <a href="/settings/agents" aria-label="Agent integration" /> },
  { label: "Repositories", icon: "repositories", link: <a href="/settings/repositories" aria-label="Repositories" /> },
]

describe("SettingsMenu", () => {
  it("offers the opposite colour theme and links to each settings section", async () => {
    const onToggle = vi.fn()
    render(<SettingsMenu links={LINKS} useThemeToggle={(): ThemeToggle => ({ theme: "dark", onToggle })} />)

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Switch to light mode" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("lists the settings sections as links", async () => {
    render(<SettingsMenu links={LINKS} useThemeToggle={() => ({ theme: "light", onToggle: vi.fn() })} />)

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))

    expect((await screen.findByRole("menuitem", { name: "Repositories" })).getAttribute("href")).toBe("/settings/repositories")
    expect(screen.getByRole("menuitem", { name: "Switch to dark mode" })).toBeTruthy()
  })
})
