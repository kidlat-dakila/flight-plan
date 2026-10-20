import { render, screen } from "@testing-library/react"
import { SpotlightChip } from "@/components/SpotlightMark"

describe("SpotlightChip", () => {
  it("names the spotlight and the classifications that put the code in it, beside a decorative mark", () => {
    const { container } = render(
      <SpotlightChip spotlight={{ label: "Spotlight", classifications: [{ key: "component", label: "Component" }, { key: "api-route", label: "API route" }] }} />,
    )

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(container.textContent).toBe("SpotlightComponentAPI route")
    expect(screen.getByText("API route")).toBeTruthy()
  })
})
