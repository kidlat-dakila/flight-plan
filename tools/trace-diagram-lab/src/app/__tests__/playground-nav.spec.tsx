import { fireEvent, render, screen, within } from "@testing-library/react"
import PlaygroundNav from "@/app/playground-nav"

const playgroundOf = (language: string, framework: string) => ({ id: `${language}/${framework}`, language, framework })

const PLAYGROUNDS = [playgroundOf("python", "base"), playgroundOf("python", "fastapi"), playgroundOf("typescript", "base"), playgroundOf("typescript", "react")]

const renderNav = (currentId: string | null = "typescript/react") => {
  const onNavigate = vi.fn()
  render(<PlaygroundNav playgrounds={PLAYGROUNDS} currentId={currentId} onNavigate={onNavigate} />)
  return onNavigate
}

describe("PlaygroundNav", () => {
  it("lists the playgrounds of each language as links to their pages", () => {
    renderNav()
    const nav = screen.getByRole("navigation", { name: "Playgrounds" })
    const linksOf = (language: string) =>
      within(within(nav).getByRole("list", { name: language })).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])

    expect(linksOf("python")).toStrictEqual([["base", "/playground/python/base"], ["fastapi", "/playground/python/fastapi"]])
    expect(linksOf("typescript")).toStrictEqual([["base", "/playground/typescript/base"], ["react", "/playground/typescript/react"]])
  })

  it("marks the current playground and no other", () => {
    renderNav()

    expect(screen.getAllByRole("link", { current: "page" }).map((link) => link.getAttribute("href"))).toStrictEqual(["/playground/typescript/react"])
  })

  it("links back to the fixture lab", () => {
    renderNav()

    expect(screen.getByRole("link", { name: "Fixture lab" }).getAttribute("href")).toBe("/")
  })

  it("navigates in the page on a plain click", () => {
    const onNavigate = renderNav()
    const link = within(screen.getByRole("list", { name: "python" })).getByRole("link", { name: "fastapi" })

    expect(fireEvent.click(link)).toBe(false)
    expect(onNavigate).toHaveBeenCalledWith("/playground/python/fastapi")
  })

  it("leaves a click with a modifier key to the browser", () => {
    const onNavigate = renderNav()
    const link = within(screen.getByRole("list", { name: "python" })).getByRole("link", { name: "fastapi" })

    fireEvent.click(link, { metaKey: true })
    fireEvent.click(link, { ctrlKey: true })
    fireEvent.click(link, { shiftKey: true })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("marks nothing when no playground is shown", () => {
    renderNav(null)

    expect(screen.queryAllByRole("link", { current: "page" })).toStrictEqual([])
  })
})
