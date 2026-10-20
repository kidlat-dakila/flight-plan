import { fireEvent, render, screen, within } from "@testing-library/react"
import WriteUpDialog, { type WriteUpPlan } from "@/components/WriteUpDialog"

const PLAN: WriteUpPlan = {
  agentLabel: "Claude",
  summary: [
    { label: "Write up", value: "Context, Trace Diagram and Findings" },
    { label: "Prompt configuration", value: "Standard" },
    { label: "Code Walkthrough order", value: "Bottom up" },
    { label: "Segments", value: "On" },
  ],
  sections: [
    { section: "context", label: "Context", countLabel: "1 part to write", isChosen: true },
    { section: "traceDiagram", label: "Trace Diagram", countLabel: "4 parts to write", isChosen: true },
    { section: "blastDiagram", label: "Blast Diagram", countLabel: "Nothing to write", isChosen: false },
    { section: "walkthrough", label: "Code Walkthrough", countLabel: "6 parts to write", isChosen: false },
    { section: "findings", label: "Findings", countLabel: "12 waypoints to check", isChosen: true },
  ],
  totalLabel: "5 parts to write and 12 waypoints to check",
  configurations: [{ id: "standard", label: "Standard" }, { id: "minimal", label: "Minimal" }],
  configurationId: "standard",
  walkthroughOrders: [
    { order: "imports-bottom-up", label: "Bottom up", description: "A file comes before the files that import it." },
    { order: "important-first", label: "Important changes first", description: "Core and spotlight changes come first." },
  ],
  walkthroughOrder: "imports-bottom-up",
  isSegmented: true,
}

const renderDialog = (overrides: Partial<Parameters<typeof WriteUpDialog>[0]> = {}) => {
  const props = {
    plan: PLAN,
    problem: null,
    isPending: false,
    onSectionsChange: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<WriteUpDialog {...props} />)
  return props
}

describe("WriteUpDialog", () => {
  it("asks whether the agent writes the review up, with the defaults in short and what they add up to", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog", { name: "Ask Claude to write up this review?" })

    expect(within(dialog).getByText("Context, Trace Diagram and Findings")).toBeTruthy()
    expect(within(dialog).getByText("Bottom up")).toBeTruthy()
    expect(within(dialog).getByText("5 parts to write and 12 waypoints to check")).toBeTruthy()
    expect(within(dialog).queryByRole("checkbox")).toBeNull()
  })

  it("writes up with the defaults", () => {
    const { onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Write up" }))

    expect(onSubmit).toHaveBeenCalledWith({
      sections: ["context", "traceDiagram", "findings"],
      configurationId: "standard",
      walkthroughOrder: "imports-bottom-up",
      isSegmented: true,
    })
  })

  it("shows the inputs with Configure, reports a ticked section and writes up with what was chosen", () => {
    const { onSectionsChange, onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Configure" }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Code Walkthrough/ }))

    expect(onSectionsChange).toHaveBeenCalledWith(["context", "traceDiagram", "findings", "walkthrough"])
    expect(screen.getByText("12 waypoints to check")).toBeTruthy()

    fireEvent.change(screen.getByRole("combobox", { name: "Prompt configuration" }), { target: { value: "minimal" } })
    fireEvent.click(screen.getByRole("radio", { name: /Important changes first/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Split this review into segments" }))
    fireEvent.click(screen.getByRole("button", { name: "Write up" }))

    expect(onSubmit).toHaveBeenCalledWith({
      sections: ["context", "traceDiagram", "findings"],
      configurationId: "minimal",
      walkthroughOrder: "important-first",
      isSegmented: false,
    })
  })

  it("closes with Not now", () => {
    const { onClose, onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Not now" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows a rejection under the input it is about", () => {
    renderDialog({ problem: { field: "sections", message: "Choose at least one part for the agent to write up." } })

    expect(screen.getByRole("alert").textContent).toBe("Choose at least one part for the agent to write up.")
    expect(screen.getByRole("checkbox", { name: /Context/ })).toBeTruthy()
  })

  it("says it is starting while the write-up is asked for", () => {
    renderDialog({ isPending: true })

    expect(screen.getByRole("button", { name: "Starting…" }).hasAttribute("disabled")).toBe(true)
  })
})
