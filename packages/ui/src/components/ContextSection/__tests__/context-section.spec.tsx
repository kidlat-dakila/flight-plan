import { render, screen } from "@testing-library/react"
import ContextSection from "@/components/ContextSection"

describe("ContextSection", () => {
  it("is a section named by its heading that holds the context", () => {
    render(<ContextSection anchorId="context" heading="Context"><p>Why the change exists.</p></ContextSection>)

    const section = screen.getByRole("region", { name: "Context" })
    expect(section.id).toBe("context")
    expect(section.textContent).toContain("Why the change exists.")
  })

  it("puts an action beside the heading", () => {
    render(<ContextSection anchorId="context" heading="Context" action={<button type="button">Edit</button>}>{null}</ContextSection>)

    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy()
  })
})
