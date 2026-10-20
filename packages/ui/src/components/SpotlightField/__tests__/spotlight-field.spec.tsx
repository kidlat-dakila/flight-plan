import { fireEvent, render, screen } from "@testing-library/react"
import SpotlightField from "@/components/SpotlightField"

const CHOICES = [
  { classification: "migration", label: "Migration", description: "A change to the shape of the database" },
  { classification: "api-route", label: "API route", description: "A route, a resolver or a middleware" },
  { classification: "security", label: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting" },
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
    renderField(["security"])

    expect(screen.getByRole("group", { name: "Spotlight" })).toBeTruthy()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toStrictEqual(["Migration", "API route", "Security"])
    expect(screen.getByRole("button", { name: "Security", pressed: true, description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Migration", pressed: false })).toBeTruthy()
  })

  it("adds a kind in the order of the choices and removes one already picked", () => {
    const onChange = vi.fn()
    renderField(["security"], onChange)

    fireEvent.click(screen.getByRole("button", { name: "Migration" }))
    fireEvent.click(screen.getByRole("button", { name: "Security" }))

    expect(onChange.mock.calls).toStrictEqual([[["migration", "security"]], [[]]])
  })

  it("says what an empty spotlight means only while nothing is picked", () => {
    const { rerender } = renderField([])

    expect(screen.getByText(/Nothing is in the spotlight/)).toBeTruthy()

    rerender(<SpotlightField labelledBy="spotlight" choices={CHOICES} picked={["migration"]} onChange={vi.fn()} />)

    expect(screen.queryByText(/Nothing is in the spotlight/)).toBeNull()
  })
})
