import { fireEvent, render, screen, within } from "@testing-library/react"
import LaunchAgentDialog, { type LaunchAgentDialogContent } from "@/components/LaunchAgentDialog"

const CONTENT: LaunchAgentDialogContent = {
  title: "Claude is not online",
  description: "Start Claude so it can answer in this review.",
  terminal: { label: "Open a terminal for me", description: "Flight Plan opens a terminal and starts Claude in it." },
  manual: {
    label: "I'll start it myself",
    description: "Run this in Claude Code in the repository's folder.",
    prompt: "/flightplan:live storefront/pr-412",
    copyLabel: "Copy the prompt",
    copiedMessage: "Prompt copied",
  },
  closeLabel: "Not now",
}

const renderDialog = (overrides: Partial<Parameters<typeof LaunchAgentDialog>[0]> = {}) => {
  const props = {
    content: CONTENT,
    isOpening: false,
    problem: null,
    onOpenTerminal: vi.fn(),
    onCopy: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<LaunchAgentDialog {...props} />)
  return props
}

describe("LaunchAgentDialog", () => {
  it("says the agent is not online and offers a terminal and the prompt to run by hand", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog", { name: "Claude is not online" })

    expect(within(dialog).getByText("Start Claude so it can answer in this review.")).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Open a terminal for me" })).toBeTruthy()
    expect(within(dialog).getByText("Flight Plan opens a terminal and starts Claude in it.")).toBeTruthy()
    expect(within(dialog).getByRole("region", { name: "I'll start it myself" })).toBeTruthy()
    expect(within(dialog).getByText("/flightplan:live storefront/pr-412")).toBeTruthy()
  })

  it("opens a terminal", () => {
    const { onOpenTerminal } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Open a terminal for me" }))

    expect(onOpenTerminal).toHaveBeenCalledTimes(1)
  })

  it("copies the prompt with its message", () => {
    const { onCopy } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Copy the prompt" }))

    expect(onCopy).toHaveBeenCalledWith("/flightplan:live storefront/pr-412", "Prompt copied")
  })

  it("shows only the prompt when no terminal can be opened", () => {
    renderDialog({ content: { ...CONTENT, terminal: null } })

    expect(screen.queryByRole("button", { name: "Open a terminal for me" })).toBeNull()
    expect(screen.getByRole("region", { name: "I'll start it myself" })).toBeTruthy()
  })

  it("holds the terminal button while the terminal opens", () => {
    renderDialog({ isOpening: true })

    const button = screen.getByRole("button", { name: "Open a terminal for me" })
    expect(button.hasAttribute("disabled")).toBe(true)
    expect(button.getAttribute("aria-busy")).toBe("true")
  })

  it("shows why the terminal did not open under its option", () => {
    renderDialog({ problem: "No terminal app was found." })

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toBe("No terminal app was found.")
    expect(alert.closest("section")).toBe(screen.getByRole("button", { name: "Open a terminal for me" }).closest("section"))
  })

  it("closes with its close button and with Escape", () => {
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Not now" }))
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })

    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
