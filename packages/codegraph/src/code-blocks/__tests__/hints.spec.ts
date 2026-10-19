import { HINT_CHANGES, HINT_SUBJECTS, hintOf, traceHintOf, type ClassifiedBlock } from "@/code-blocks/hints"
import { CODE_BLOCK_CLASSIFICATIONS, type CodeBlockClassification } from "@flightplan/configurations"

const classified = (
  classifications: readonly CodeBlockClassification[],
  diffClassifications: readonly CodeBlockClassification[] = [],
): ClassifiedBlock => ({ classifications, diffClassifications })

describe("hintOf", () => {
  it("says a block was added, changed or removed, by what the block is", () => {
    const component = classified(["component"], ["component"])

    expect(hintOf([component], "added")).toBe("Adds a component.")
    expect(hintOf([component], "modified")).toBe("Changes a component.")
    expect(hintOf([component], "removed")).toBe("Removes a component.")
  })

  it("names what changed inside a block when it is not what the block is", () => {
    expect(hintOf([classified(["component", "database-operation"], ["database-operation"])], "modified"))
      .toBe("Changes a database read or write inside a component.")
  })

  it("reads a changed block with no changed classification as a change to the block", () => {
    expect(hintOf([classified(["api-route"])], "modified")).toBe("Changes an API route.")
  })

  it("says a block with no changed lines uses code that changed", () => {
    expect(hintOf([classified(["page"])], "unchanged")).toBe("No lines changed in a page, but it uses code that did.")
  })

  it("takes the classification the hierarchy ranks highest across every block of a waypoint", () => {
    const blocks = [classified(["state"], ["state"]), classified(["form", "validation"], ["validation"])]

    expect(hintOf(blocks, "modified")).toBe("Changes a validation rule inside a form.")
  })

  it("reads a block with no classification as plain logic", () => {
    expect(hintOf([classified([])], "added")).toBe("Adds plain logic.")
  })

  it("gives no hint without a code block to read", () => {
    expect(hintOf([], "modified")).toBeNull()
  })

  it.each(CODE_BLOCK_CLASSIFICATIONS.flatMap((classification) => HINT_CHANGES.map((change) => [classification, change] as const)))(
    "writes one sentence for a %s block that is %s",
    (classification, change) => {
      const hint = hintOf([classified([classification], [classification])], change)

      expect(hint).toContain(HINT_SUBJECTS[classification])
      expect(hint).toMatch(/^[A-Z][^.]*\.$/u)
    },
  )
})

describe("traceHintOf", () => {
  it("names what the cards of a diagram are, each once, in their order", () => {
    expect(traceHintOf(["page", "api-route", "page", "database-operation"])).toBe("Runs through a page, an API route and a database read or write.")
    expect(traceHintOf(["component"])).toBe("Runs through a component.")
  })

  it("gives no hint to a diagram with no card", () => {
    expect(traceHintOf([])).toBeNull()
  })
})
