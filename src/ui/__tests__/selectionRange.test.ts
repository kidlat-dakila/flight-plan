import { describe, expect, it } from "vitest"
import { spanOfNode } from "../selectionRange"

/**
 * What a selection is in. The copy popup shows only when this answers, so a
 * prose block with no line numbers must still answer.
 */
/** Stands in for the DOM: `isHtmlElement` checks through the node's own window. */
class FakeElement {
  constructor(
    readonly dataset: Record<string, string>,
    private readonly classes: string[],
    readonly parentElement: FakeElement | null,
  ) {}
  readonly nodeType = 1
  readonly ownerDocument = { defaultView: { HTMLElement: FakeElement } }
  readonly classList = { contains: (name: string) => this.classes.includes(name) }
}

function element(classes: string[], dataset: Record<string, string>, parent: FakeElement | null = null): FakeElement {
  return new FakeElement(dataset, classes, parent)
}

describe("spanOfNode", () => {
  it("should answer for prose with no lines, so prose can be copied", () => {
    const block = element(["fp-markdown"], {})
    const paragraph = element([], {}, block)
    expect(spanOfNode(paragraph as unknown as Node)).toEqual({ from: 0, to: 0 })
  })

  it("should name the file and line for code", () => {
    const panel = element(["fp-code-panel"], { fpFile: "src/a.ts" })
    const line = element(["fp-line"], { fpFileLine: "12" }, panel)
    expect(spanOfNode(line as unknown as Node)).toEqual({ from: 12, to: 12, file: "src/a.ts" })
  })

  it("should not answer outside prose and code", () => {
    expect(spanOfNode(element([], {}) as unknown as Node)).toBeNull()
  })
})
