import { buildWriteUpPlan, type WriteUpPlanSource } from "@/procedures/get-write-up-plan/utils/build-write-up-plan"
import { listConfigurationsOf } from "@/procedures/list-configurations/utils/configuration"

const SOURCE: WriteUpPlanSource = {
  isOffered: false,
  agentLabel: "Claude",
  counts: { context: 1, traceDiagram: 4, blastDiagram: 0, walkthrough: 6, findings: 12 },
  sections: ["context", "traceDiagram", "findings"],
  configurations: listConfigurationsOf([]),
  configurationId: "minimal",
  walkthroughOrder: "imports-bottom-up",
  isSegmented: true,
}

describe("buildWriteUpPlan", () => {
  it("sums up the chosen defaults in short", () => {
    expect(buildWriteUpPlan(SOURCE).summary).toStrictEqual([
      { label: "Write up", value: "Context, Trace Diagram and Findings" },
      { label: "Prompt configuration", value: "Minimal" },
      { label: "Code Walkthrough order", value: "Bottom up" },
      { label: "Segments", value: "On" },
    ])
  })

  it("lists every section with its count, and marks the chosen ones", () => {
    expect(buildWriteUpPlan(SOURCE).sections).toStrictEqual([
      { section: "context", label: "Context", count: 1, countLabel: "1 part to write", isChosen: true },
      { section: "traceDiagram", label: "Trace Diagram", count: 4, countLabel: "4 parts to write", isChosen: true },
      { section: "blastDiagram", label: "Blast Diagram", count: 0, countLabel: "Nothing to write", isChosen: false },
      { section: "walkthrough", label: "Code Walkthrough", count: 6, countLabel: "6 parts to write", isChosen: false },
      { section: "findings", label: "Findings", count: 12, countLabel: "12 waypoints to check", isChosen: true },
    ])
  })

  it("totals the parts to write and the waypoints to check of the chosen sections", () => {
    expect(buildWriteUpPlan(SOURCE).totalLabel).toBe("5 parts to write and 12 waypoints to check")
    expect(buildWriteUpPlan({ ...SOURCE, sections: ["walkthrough"] }).totalLabel).toBe("6 parts to write")
    expect(buildWriteUpPlan({ ...SOURCE, sections: ["findings"] }).totalLabel).toBe("12 waypoints to check")
    expect(buildWriteUpPlan({ ...SOURCE, sections: ["blastDiagram"] }).totalLabel).toBe("Nothing to write")
  })

  it("offers every configuration and every walkthrough order, with the chosen ones", () => {
    const plan = buildWriteUpPlan({ ...SOURCE, walkthroughOrder: "important-first", isSegmented: false })

    expect(plan.configurations.map((configuration) => configuration.id)).toStrictEqual(["standard", "minimal", "onboardee", "unfamiliar-territory"])
    expect(plan.walkthroughOrders.map((order) => [order.order, order.label])).toStrictEqual([
      ["imports-bottom-up", "Bottom up"],
      ["imports-top-down", "Top down"],
      ["important-first", "Important changes first"],
    ])
    expect(plan).toMatchObject({ configurationId: "minimal", walkthroughOrder: "important-first", isSegmented: false })
    expect(plan.summary[3]).toStrictEqual({ label: "Segments", value: "Off" })
  })
})
