import { fireEvent, render, screen } from "@testing-library/react"
import AgentsForm from "@/components/AgentsForm"

const DEFAULT_EFFORT = { effort: "default", label: "Default" }
const HIGH_EFFORT = { effort: "high", label: "High" }

const CLAUDE_MODELS = [
  { model: "default", label: "Default (recommended)", hasEffortChoice: false, effortOptions: [DEFAULT_EFFORT], selectedEffort: "default" },
  { model: "opus", label: "Opus", hasEffortChoice: true, effortOptions: [DEFAULT_EFFORT, HIGH_EFFORT], selectedEffort: "default" },
]

const AGENTS = [
  { agent: "claude" as const, label: "Claude", isPicked: true, installPath: "/Users/dev/.claude", pathHint: "The folder you saved.", unavailableReason: null, model: "opus", effort: "default", modelOptions: CLAUDE_MODELS },
  { agent: "cursor" as const, label: "Cursor", isPicked: false, installPath: "", pathHint: "Cursor was not found on this machine.", unavailableReason: "cursor-agent is not installed on this machine.", model: "default", effort: "default", modelOptions: [] },
]

const renderForm = (overrides: Partial<React.ComponentProps<typeof AgentsForm>> = {}) =>
  render(
    <AgentsForm
      agents={AGENTS}
      defaultAgent="claude"
      problem={null}
      folderBrowser={null}
      folderBrowserErrorMessage={null}
      onBrowseFolder={vi.fn()}
      onBrowseEnd={vi.fn()}
      onSubmit={vi.fn()}
      {...overrides}
    >
      <button type="submit">Save</button>
    </AgentsForm>,
  )

describe("AgentsForm", () => {
  it("opens the install folder of a picked agent and disables an agent that is unavailable", () => {
    renderForm()

    expect(screen.getByLabelText<HTMLInputElement>("Install folder for Claude").value).toBe("/Users/dev/.claude")
    expect(screen.queryByLabelText("Install folder for Cursor")).toBeNull()
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Cursor/ }).disabled).toBe(true)
    expect(screen.getByText("cursor-agent is not installed on this machine.", { exact: false })).toBeTruthy()
    expect(screen.queryByRole("radio", { name: /Manual/ })).toBeNull()
  })

  it("submits the folder and the effort the user chose", () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })

    fireEvent.change(screen.getByLabelText("Install folder for Claude"), { target: { value: "/Users/dev/.claude-work" } })
    fireEvent.click(screen.getByRole("radio", { name: "High" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude-work", model: "opus", effort: "high" },
        { agent: "cursor", isPicked: false, installPath: "", model: "default", effort: "default" },
      ],
      defaultAgent: "claude",
    })
  })

  it("shows a problem about an install folder under that folder", () => {
    renderForm({ problem: { message: "This is not Claude's folder.", field: { owner: "claude", name: "installPath" } } })

    expect(screen.getByRole("alert").textContent).toBe("This is not Claude's folder.")
    expect(screen.getByLabelText("Install folder for Claude").getAttribute("aria-invalid")).toBe("true")
  })

  it("asks to browse from the folder in the field", () => {
    const onBrowseFolder = vi.fn()
    renderForm({ onBrowseFolder })

    fireEvent.click(screen.getByRole("button", { name: "Browse for the Claude install folder" }))

    expect(onBrowseFolder).toHaveBeenCalledWith("/Users/dev/.claude")
  })
})
