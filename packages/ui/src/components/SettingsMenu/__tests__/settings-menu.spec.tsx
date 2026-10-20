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

  it("puts the review's actions above the theme and the settings on the review page", async () => {
    const onWriteUp = vi.fn()
    const onDelete = vi.fn()
    render(
      <SettingsMenu
        links={LINKS}
        useThemeToggle={() => ({ theme: "light", onToggle: vi.fn() })}
        reviewActions={{ forgeLink: { href: "https://forge.test/pull/412", label: "View pull request" }, onWriteUp, onDelete }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))

    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toStrictEqual([
      "View pull request",
      "Generate write-up",
      "Delete",
      "Switch to dark mode",
      "Agent integration",
      "Repositories",
    ])

    fireEvent.click(screen.getByRole("menuitem", { name: "Generate write-up" }))

    expect(onWriteUp).toHaveBeenCalledTimes(1)
  })

  it("leaves out Generate write-up when no agent can write, and View pull request for a branch", async () => {
    const onDelete = vi.fn()
    render(<SettingsMenu links={LINKS} useThemeToggle={() => ({ theme: "light", onToggle: vi.fn() })} reviewActions={{ forgeLink: null, onWriteUp: null, onDelete }} />)

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    expect(screen.queryByRole("menuitem", { name: "Generate write-up" })).toBeNull()
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
