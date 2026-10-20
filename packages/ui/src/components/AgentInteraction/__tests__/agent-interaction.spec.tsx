import { fireEvent, render, screen } from "@testing-library/react"
import AgentInteraction from "@/components/AgentInteraction"

const TRIGGER_NAME = /How does Flight Plan interact with the agent\?/

describe("AgentInteraction", () => {
  it("starts closed", () => {
    render(<AgentInteraction />)

    expect(screen.getByRole("button", { name: TRIGGER_NAME }).getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText("What Flight Plan does")).toBeNull()
  })

  it("opens on what Flight Plan does and what the agent does", () => {
    render(<AgentInteraction />)

    fireEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }))

    expect(screen.getByRole("heading", { name: "What Flight Plan does" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "What the agent does" })).toBeTruthy()
    expect(screen.getByText(/draws the Trace Diagram and the Blast Diagram/)).toBeTruthy()
  })

  it("notes that the agent runs as a background terminal session on the user's subscription", () => {
    render(<AgentInteraction />)

    fireEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }))

    const note = screen.getByRole("note")
    expect(note.textContent).toContain("Your agent runs on your subscription")
    expect(note.textContent).toContain("claude -p")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
