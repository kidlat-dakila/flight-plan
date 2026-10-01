import { render } from "@testing-library/react"
import BandLine from "@/components/BandLine"
import { LINE_COLOR_CLASSES } from "@/lib/line-color"

describe("BandLine", () => {
  it("draws the rule in the colour of the given line and hides it from assistive technology", () => {
    const { container } = render(<BandLine lineColor="green" />)

    const rule = container.firstElementChild

    expect(rule?.className).toContain(LINE_COLOR_CLASSES.green)
    expect(rule?.getAttribute("aria-hidden")).toBe("true")
  })

  it("draws the rule in the primary colour for a page that belongs to no line", () => {
    const { container } = render(<BandLine lineColor="primary" />)

    expect(container.firstElementChild?.className).toContain("[--line:var(--primary)]")
  })
})
