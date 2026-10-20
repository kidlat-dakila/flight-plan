import { fireEvent, render, screen, within } from "@testing-library/react"
import SpotlightField from "@/components/SpotlightField"

const SECURITY_DESCRIPTION = "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting"

const GROUPS = [
  {
    label: "Frontend",
    choices: [
      { classification: "page", label: "Page", description: "Code that renders on a visit to a path", isFeatured: true },
      { classification: "styling", label: "Styling", description: "How something looks: a stylesheet, CSS-in-JS, a theme", isFeatured: false },
    ],
  },
  {
    label: "Backend",
    choices: [
      { classification: "migration", label: "Migration", description: "A change to the shape of the database", isFeatured: false },
      { classification: "api-route", label: "API route", description: "A route, a resolver or a middleware", isFeatured: true },
      { classification: "security", label: "Security", description: SECURITY_DESCRIPTION, isFeatured: false },
    ],
  },
  {
    label: "Miscellaneous",
    choices: [
      { classification: "test", label: "Test", description: "A test or a story", isFeatured: false },
    ],
  },
]

const renderField = (picked: readonly string[], onChange = vi.fn()) =>
  render(
    <>
      <h3 id="spotlight">Spotlight</h3>
      <SpotlightField labelledBy="spotlight" groups={GROUPS} picked={picked} onChange={onChange} />
    </>,
  )

const checkboxNamesIn = (element: HTMLElement): string[] =>
  within(element).getAllByRole("checkbox").map((checkbox) => checkbox.closest("label")?.textContent ?? "")

describe("SpotlightField", () => {
  it("shows the featured kinds and the picked ones as checkboxes in their groups, each described by its description", () => {
    renderField(["security"])

    const field = screen.getByRole("group", { name: "Spotlight" })
    expect(checkboxNamesIn(within(field).getByRole("group", { name: "Frontend" }))).toStrictEqual(["Page"])
    expect(checkboxNamesIn(within(field).getByRole("group", { name: "Backend" }))).toStrictEqual(["API route", "Security"])
    expect(within(field).queryByRole("group", { name: "Miscellaneous" })).toBeNull()
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Security", description: SECURITY_DESCRIPTION }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Page" }).checked).toBe(false)
  })

  it("adds a kind in the order of the choices and removes one already picked", () => {
    const onChange = vi.fn()
    renderField(["security"], onChange)

    fireEvent.click(screen.getByRole("checkbox", { name: "API route" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Security" }))

    expect(onChange.mock.calls).toStrictEqual([[["api-route", "security"]], [[]]])
  })

  it("opens every kind of change, grouped and described, in a dialog where each one can be picked", () => {
    const onChange = vi.fn()
    renderField(["security"], onChange)

    fireEvent.click(screen.getByRole("button", { name: "Show all topics" }))

    const dialog = screen.getByRole("dialog", { name: "All topics" })
    expect(within(dialog).getAllByRole("heading").map((heading) => heading.textContent)).toStrictEqual(["All topics", "Frontend", "Backend", "Miscellaneous"])
    expect(within(dialog).getByText("A test or a story")).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Migration/ }))

    expect(onChange).toHaveBeenCalledWith(["migration", "security"])
  })
})
