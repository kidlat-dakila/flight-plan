import { fireEvent, render, screen, within } from "@testing-library/react"
import TroubleshootDialog, { type TroubleshootDialogContent, type TroubleshootDialogProps } from "@/components/TroubleshootDialog"

const CONTENT: TroubleshootDialogContent = {
  title: "Troubleshoot",
  intro: "Flight Plan will launch Claude in a terminal to troubleshoot this error.",
  error: { label: "The error", message: "The token for github.com was refused." },
  description: { label: "What were you doing when it happened?", placeholder: "Optional. A sentence or two helps.", isRequired: false },
  privacyNote: "The logs stay on this computer.",
  problem: null,
  launchLabel: "Launch Claude",
  cancelLabel: "Cancel",
  closeLabel: "Done",
  manual: { label: "Run this command in a terminal", copyLabel: "Copy command", copiedMessage: "Command copied" },
}

const COMMAND = "cd '/Users/dana/.flightplan/logs' && claude '/flightplan:troubleshoot 20261023-142530-000001'"

const renderDialog = (overrides: Partial<TroubleshootDialogProps> = {}) => {
  const props: TroubleshootDialogProps = {
    content: CONTENT,
    loadProblem: null,
    outcome: null,
    isLaunching: false,
    isCopied: false,
    onLaunch: vi.fn(),
    onCopy: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<TroubleshootDialog {...props} />)
  return props
}

describe("TroubleshootDialog", () => {
  it("shows the error and says the agent will be launched to troubleshoot it", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog", { name: "Troubleshoot" })

    expect(within(dialog).getByText("Flight Plan will launch Claude in a terminal to troubleshoot this error.")).toBeTruthy()
    expect(within(dialog).getByRole("region", { name: "The error" }).textContent).toContain("The token for github.com was refused.")
    expect(within(dialog).getByText("The logs stay on this computer.")).toBeTruthy()
  })

  it("launches the agent with what the user wrote", () => {
    const { onLaunch } = renderDialog()

    fireEvent.change(screen.getByRole("textbox", { name: "What were you doing when it happened?" }), { target: { value: "Saving the agents." } })
    fireEvent.click(screen.getByRole("button", { name: "Launch Claude" }))

    expect(onLaunch).toHaveBeenCalledWith("Saving the agents.")
  })

  it("marks what went wrong as required when there is no error", () => {
    renderDialog({ content: { ...CONTENT, error: null, description: { label: "What went wrong?", placeholder: "", isRequired: true } } })

    expect(screen.getByRole("textbox", { name: "What went wrong?" })).toHaveProperty("required", true)
    expect(screen.queryByRole("region", { name: "The error" })).toBeNull()
  })

  it("shows the rejection of what the user wrote under the field", () => {
    renderDialog({ outcome: { kind: "rejected", message: "Say what went wrong.", field: "description" } })

    const field = screen.getByRole("textbox", { name: "What were you doing when it happened?" })

    expect(field.getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByRole("alert").textContent).toBe("Say what went wrong.")
  })

  it("cannot launch while no agent can troubleshoot", () => {
    renderDialog({ content: { ...CONTENT, problem: "Add Claude in Settings first." } })

    expect(screen.getByRole("alert").textContent).toBe("Add Claude in Settings first.")
    expect(screen.getByRole("button", { name: "Launch Claude" })).toHaveProperty("disabled", true)
  })

  it("says the agent is starting and offers to close", () => {
    const { onClose } = renderDialog({ outcome: { kind: "opened", message: "Claude is starting in Terminal to troubleshoot." } })

    fireEvent.click(screen.getByRole("button", { name: "Done" }))

    expect(screen.getByRole("status").textContent).toBe("Claude is starting in Terminal to troubleshoot.")
    expect(screen.queryByRole("button", { name: "Launch Claude" })).toBeNull()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("gives the command to copy when no terminal could be opened", () => {
    const { onCopy } = renderDialog({ outcome: { kind: "manual", message: "Flight Plan can open a terminal on macOS only.", command: COMMAND } })

    const manual = screen.getByRole("region", { name: "Run this command in a terminal" })
    fireEvent.click(within(manual).getByRole("button", { name: "Copy command" }))

    expect(within(manual).getByText(COMMAND)).toBeTruthy()
    expect(onCopy).toHaveBeenCalledWith(COMMAND)
  })

  it("says the command was copied", () => {
    renderDialog({ outcome: { kind: "manual", message: "Copy it.", command: COMMAND }, isCopied: true })

    expect(screen.getByRole("button", { name: "Command copied" })).toBeTruthy()
  })

  it("shows that the form is loading, or why it could not load", () => {
    renderDialog({ content: null })

    expect(screen.getByRole("status").textContent).toBe("Loading")
  })

  it("says why the form could not load", () => {
    renderDialog({ content: null, loadProblem: "Flight Plan cannot be reached." })

    expect(screen.getByRole("alert").textContent).toBe("Flight Plan cannot be reached.")
  })
})
