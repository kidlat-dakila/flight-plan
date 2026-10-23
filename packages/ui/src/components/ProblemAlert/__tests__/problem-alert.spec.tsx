import { fireEvent, render, screen, within } from "@testing-library/react"
import ProblemAlert from "@/components/ProblemAlert"

describe("ProblemAlert", () => {
  it("shows the problem with a Troubleshoot button that asks for troubleshooting", () => {
    const onTroubleshoot = vi.fn()
    render(<ProblemAlert message="The forge refused the token." onTroubleshoot={onTroubleshoot} />)

    const alert = screen.getByRole("alert")
    fireEvent.click(within(alert).getByRole("button", { name: "Troubleshoot" }))

    expect(within(alert).getByText("The forge refused the token.")).toBeTruthy()
    expect(onTroubleshoot).toHaveBeenCalledTimes(1)
  })

  it("shows only the problem when it cannot be troubleshot", () => {
    render(<ProblemAlert message="Give the configuration a name." onTroubleshoot={null} />)

    expect(screen.getByRole("alert").textContent).toBe("Give the configuration a name.")
    expect(screen.queryByRole("button", { name: "Troubleshoot" })).toBeNull()
  })

  it("gives the message the id a field is described by", () => {
    render(<ProblemAlert message="It broke." onTroubleshoot={null} messageId="model-error" />)

    expect(screen.getByText("It broke.").id).toBe("model-error")
  })
})
