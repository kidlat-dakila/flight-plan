import { act, fireEvent, render, screen, within } from "@testing-library/react"
import WriteUpDialog, { type WriteUpPlan } from "@/components/WriteUpDialog"

const PLAN: WriteUpPlan = {
  agentLabel: "Claude",
  summary: [
    { label: "Parts to explain", value: "Context, Trace Diagram and Findings" },
    { label: "Prompt configuration", value: "Standard" },
    { label: "Code Walkthrough order", value: "Building blocks first" },
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
  configurations: [
    { configurationId: "standard", label: "Standard", bestFor: "Best for general pull requests.", description: "The agent writes the full review.", note: null },
    { configurationId: "minimal", label: "Minimal", bestFor: "Best for saving tokens.", description: "The agent writes in fragments.", note: null },
  ],
  configurationId: "standard",
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
  const { rerender } = render(<WriteUpDialog {...props} />)
  return { ...props, rerender }
}

describe("WriteUpDialog", () => {
  it("asks whether the agent writes the review up, with the defaults in short and what they add up to", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog", { name: "Ask Claude to explain this review?" })

    expect(within(dialog).getByText("Context, Trace Diagram and Findings")).toBeTruthy()
    expect(within(dialog).getByText("Building blocks first")).toBeTruthy()
    expect(within(dialog).getByText("Total").nextElementSibling?.textContent).toBe("5 parts to write and 12 waypoints to check")
    expect(within(dialog).queryByRole("checkbox")).toBeNull()
  })

  it("writes up with the defaults", () => {
    const { onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Explain" }))

    expect(onSubmit).toHaveBeenCalledWith({
      sections: ["context", "traceDiagram", "findings"],
      configurationId: "standard",
      walkthroughOrder: "imports-bottom-up",
      isSegmented: true,
    })
  })

  it("shows the inputs with Configure, reports a ticked section and writes up with what was chosen", async () => {
    const { onSectionsChange, onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Configure" }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Code Walkthrough/ }))

    expect(onSectionsChange).toHaveBeenCalledWith(["context", "traceDiagram", "findings", "walkthrough"])
    expect(screen.getByText("12 waypoints to check")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Prompt configuration, Standard" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Minimal/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.click(screen.getByRole("button", { name: "Code Walkthrough order, Building blocks first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Most important first/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Split this review into segments" }))
    fireEvent.click(screen.getByRole("button", { name: "Explain" }))

    expect(onSubmit).toHaveBeenCalledWith({
      sections: ["context", "traceDiagram", "findings"],
      configurationId: "minimal",
      walkthroughOrder: "important-first",
      isSegmented: false,
    })
  })

  it("keeps the sections ticked since the inputs showed after Explain", async () => {
    const { rerender, ...props } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Configure" }))
    const withWalkthrough = { ...PLAN, sections: PLAN.sections.map((option) => ({ ...option, isChosen: option.isChosen || option.section === "walkthrough" })) }
    rerender(<WriteUpDialog {...props} plan={withWalkthrough} />)

    fireEvent.click(screen.getByRole("button", { name: "Explain" }))
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Code Walkthrough/ }).checked).toBe(true)
  })

  it("closes with Not now", () => {
    const { onClose, onSubmit } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Not now" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows a rejection under the input it is about", () => {
    renderDialog({ problem: { field: "sections", message: "Choose at least one part for the agent to explain." } })

    expect(screen.getByRole("alert").textContent).toBe("Choose at least one part for the agent to explain.")
    expect(screen.getByRole("checkbox", { name: /Context/ })).toBeTruthy()
  })

  it("shows a refused prompt configuration under its field", () => {
    renderDialog({ problem: { field: "configuration", message: "This prompt configuration no longer exists." } })

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toBe("This prompt configuration no longer exists.")
    expect(alert.previousElementSibling).toBe(screen.getByRole("button", { name: "Prompt configuration, Standard" }))
  })

  it("says it is starting while the write-up is asked for", () => {
    renderDialog({ isPending: true })

    expect(screen.getByRole("button", { name: "Starting…" }).hasAttribute("disabled")).toBe(true)
  })
})
