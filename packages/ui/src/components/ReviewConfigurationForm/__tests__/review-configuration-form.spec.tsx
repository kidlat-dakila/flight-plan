import { fireEvent, render, screen, within } from "@testing-library/react"
import ReviewConfigurationForm from "@/components/ReviewConfigurationForm"

const PRESETS = [
  { configurationId: "standard", label: "Standard", bestFor: "Best for general pull requests.", description: "The full review.", note: null },
  { configurationId: "minimal", label: "Minimal", bestFor: "Best for saving tokens.", description: "Few words and no filler.", note: "Diagrams are off by default." },
]

const PREFERENCES = {
  spotlight: ["security" as const],
  sectionWriteUps: { context: "always", traceDiagram: "always", blastDiagram: "on-demand", walkthrough: "on-demand", findings: "always" } as const,
  isSegmented: true,
  walkthroughOrder: "imports-bottom-up" as const,
  sectionOrder: ["context" as const, "traceDiagram" as const, "blastDiagram" as const, "walkthrough" as const],
  ignoredPaths: ["**/*.spec.ts"],
}

const SPOTLIGHT_CHOICES = [
  { classification: "migration" as const, label: "Migration", description: "A change to the shape of the database" },
  { classification: "security" as const, label: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting" },
]

const renderForm = (onSubmit = vi.fn(), problem: React.ComponentProps<typeof ReviewConfigurationForm>["problem"] = null) =>
  render(
    <ReviewConfigurationForm
      presets={PRESETS}
      selectedConfigurationId="minimal"
      preferences={PREFERENCES}
      spotlightChoices={SPOTLIGHT_CHOICES}
      problem={problem}
      promptConfigurationNotes={["You can pick another prompt configuration each time you create a Flight Plan."]}
      onSubmit={onSubmit}
    >
      <button type="submit">Save</button>
    </ReviewConfigurationForm>,
  )

describe("ReviewConfigurationForm", () => {
  it("shows each prompt configuration with what it is best for and ticks the selected one", () => {
    renderForm()

    const promptConfiguration = screen.getByRole("region", { name: "Prompt configuration" })
    expect(within(promptConfiguration).getByRole<HTMLInputElement>("radio", { name: /Minimal/ }).checked).toBe(true)
    expect(within(promptConfiguration).getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(false)
    expect(within(promptConfiguration).getByText("Best for general pull requests.")).toBeTruthy()
    expect(within(promptConfiguration).getByText("Diagrams are off by default.")).toBeTruthy()
  })

  it("puts the spotlight first, with the saved kinds of change pressed", () => {
    renderForm()

    const regions = screen.getAllByRole("region")
    expect(regions.map((region) => within(region).getByRole("heading").textContent)).toStrictEqual([
      "Spotlight",
      "Write-ups",
      "Prompt configuration",
      "Review organization",
      "Display arrangement",
      "Ignored files",
    ])
    expect(within(regions[0]).getByRole("button", { name: "Security", pressed: true })).toBeTruthy()
    expect(within(regions[0]).getByRole("button", { name: "Migration", pressed: false })).toBeTruthy()
  })

  it("submits the chosen configuration and the preferences with every part through the actions it is given", () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    fireEvent.click(screen.getByRole("radio", { name: /Standard/ }))
    fireEvent.click(screen.getByRole("button", { name: "Migration" }))
    fireEvent.click(within(screen.getByRole("group", { name: "Blast Diagram" })).getByRole("radio", { name: "Always" }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Split reviews into segments/ }))
    fireEvent.click(screen.getByRole("radio", { name: /Important changes first/ }))
    fireEvent.click(screen.getByRole("button", { name: "Move Code Walkthrough up" }))
    fireEvent.click(screen.getByRole("button", { name: "Add pattern" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Path pattern 2" }), { target: { value: "**/*.stories.tsx" } })

    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledWith({
      configurationId: "standard",
      preferences: {
        ...PREFERENCES,
        spotlight: ["migration", "security"],
        sectionWriteUps: { ...PREFERENCES.sectionWriteUps, blastDiagram: "always" },
        isSegmented: false,
        walkthroughOrder: "important-first",
        sectionOrder: ["context", "traceDiagram", "walkthrough", "blastDiagram"],
        ignoredPaths: ["**/*.spec.ts", "**/*.stories.tsx"],
      },
    })
  })

  it("shows a refused path pattern under its row", () => {
    renderForm(vi.fn(), { message: "This pattern is already in the list.", field: { owner: "ignoredPaths", name: "0" } })

    const row = screen.getByRole("textbox", { name: "Path pattern 1" })
    expect(row.getAttribute("aria-invalid")).toBe("true")
    expect(within(screen.getByRole("region", { name: "Ignored files" })).getByText("This pattern is already in the list.")).toBeTruthy()
  })
})
