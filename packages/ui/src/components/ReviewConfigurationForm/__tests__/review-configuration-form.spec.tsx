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

const SPOTLIGHT_GROUPS = [
  {
    label: "Backend",
    choices: [
      { classification: "migration" as const, label: "Migration", description: "A change to the shape of the database", isFeatured: true },
      { classification: "security" as const, label: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting", isFeatured: true },
    ],
  },
]

const renderForm = (onSubmit = vi.fn(), problem: React.ComponentProps<typeof ReviewConfigurationForm>["problem"] = null) =>
  render(
    <ReviewConfigurationForm
      presets={PRESETS}
      selectedConfigurationId="minimal"
      preferences={PREFERENCES}
      spotlightGroups={SPOTLIGHT_GROUPS}
      problem={problem}
      onSubmit={onSubmit}
    >
      <button type="submit">Save</button>
    </ReviewConfigurationForm>,
  )

describe("ReviewConfigurationForm", () => {
  it("shows the selected prompt configuration on a button that opens every configuration with what it is best for", async () => {
    renderForm()

    const promptConfiguration = screen.getByRole("region", { name: "Which writing style should the agent use?" })
    const trigger = within(promptConfiguration).getByRole("button", { name: "Prompt configuration, Minimal" })
    expect(trigger.textContent).toContain("Best for saving tokens.")
    expect(within(promptConfiguration).getByRole("note").textContent).toContain("You can fully customize the prompt instructions")

    fireEvent.click(trigger)

    expect((await screen.findByRole<HTMLInputElement>("radio", { name: /Minimal/ })).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(false)
    expect(screen.getByText("Best for general pull requests.")).toBeTruthy()
    expect(screen.getByText("Diagrams are off by default.")).toBeTruthy()
  })

  it("puts the spotlight first, with the saved kinds of change ticked, and keeps the advanced options closed until opened", () => {
    renderForm()

    const headingsOf = (regions: HTMLElement[]) => regions.map((region) => within(region).getByRole("heading").textContent)
    expect(headingsOf(screen.getAllByRole("region"))).toStrictEqual([
      "Which topics do you care about most in a code review?",
      "Which parts should the agent write for you by default?",
      "Which writing style should the agent use?",
      "Code Walkthrough order",
    ])

    fireEvent.click(screen.getByRole("button", { name: /Advanced options/ }))

    const regions = screen.getAllByRole("region")
    expect(headingsOf(regions).slice(4)).toStrictEqual(["Review organization", "Display arrangement", "Ignored files"])
    expect(within(regions[0]).getByRole<HTMLInputElement>("checkbox", { name: "Security" }).checked).toBe(true)
    expect(within(regions[0]).getByRole<HTMLInputElement>("checkbox", { name: "Migration" }).checked).toBe(false)
  })

  it("submits the chosen configuration and the preferences with every part through the actions it is given", async () => {
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    fireEvent.click(screen.getByRole("button", { name: "Prompt configuration, Minimal" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Standard/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Migration" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Blast Diagram" }))
    fireEvent.click(screen.getByRole("button", { name: /Advanced options/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Split reviews into segments/ }))
    fireEvent.click(screen.getByRole("button", { name: "Code Walkthrough order, Building blocks first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Most important first/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))
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
