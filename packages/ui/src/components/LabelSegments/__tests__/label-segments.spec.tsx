import { render, screen } from "@testing-library/react"
import LabelSegments from "@/components/LabelSegments"

describe("LabelSegments", () => {
  it("renders every segment in order", () => {
    const { container } = render(
      <LabelSegments
        segments={[
          { text: "#412", kind: "plain" },
          { text: "feature/held-stock", kind: "code" },
          { text: "mira", kind: "plain" },
        ]}
      />,
    )

    expect(container.textContent).toBe("#412feature/held-stockmira")
  })

  it("sets a code segment in the fixed-width face and a plain one in the text face", () => {
    render(
      <LabelSegments
        segments={[
          { text: "GitHub", kind: "plain" },
          { text: "acme/storefront", kind: "code" },
        ]}
      />,
    )

    expect(screen.getByText("acme/storefront").className).toContain("font-mono")
    expect(screen.getByText("GitHub").className).not.toContain("font-mono")
  })
})
