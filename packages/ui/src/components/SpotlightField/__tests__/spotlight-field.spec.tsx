import { fireEvent, render, screen } from "@testing-library/react"
import SpotlightField from "@/components/SpotlightField"

const CHOICES = [
  { classification: "migration", label: "Migration", description: "A change to the shape of the database" },
  { classification: "api-route", label: "API route", description: "A route, a resolver or a middleware" },
  { classification: "auth", label: "Auth", description: "A check of who the caller is, or what they may do" },
]

const renderField = (picked: readonly string[], onChange = vi.fn()) =>
  render(
    <>
      <h3 id="spotlight">Spotlight</h3>
      <SpotlightField labelledBy="spotlight" choices={CHOICES} picked={picked} onChange={onChange} />
    </>,
  )

describe("SpotlightField", () => {
  it("draws one toggle per kind of change, named by its label and described by its description", () => {
    renderField(["auth"])

    expect(screen.getByRole("group", { name: "Spotlight" })).toBeTruthy()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toStrictEqual(["Migration", "API route", "Auth"])
    expect(screen.getByRole("button", { name: "Auth", pressed: true, description: "A check of who the caller is, or what they may do" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Migration", pressed: false })).toBeTruthy()
  })

  it("adds a kind in the order of the choices and removes one already picked", () => {
    const onChange = vi.fn()
    renderField(["auth"], onChange)

    fireEvent.click(screen.getByRole("button", { name: "Migration" }))
    fireEvent.click(screen.getByRole("button", { name: "Auth" }))

    expect(onChange.mock.calls).toStrictEqual([[["migration", "auth"]], [[]]])
  })

  it("says what an empty spotlight means only while nothing is picked", () => {
    const { rerender } = renderField([])

    expect(screen.getByText(/Nothing is in the spotlight/)).toBeTruthy()

    rerender(<SpotlightField labelledBy="spotlight" choices={CHOICES} picked={["migration"]} onChange={vi.fn()} />)

    expect(screen.queryByText(/Nothing is in the spotlight/)).toBeNull()
  })
})
