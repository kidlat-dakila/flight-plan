import { render, screen } from "@testing-library/react"
import OutwardLink from "@/components/OutwardLink"

describe("OutwardLink", () => {
  it("opens its address in a new tab without handing over the opener", () => {
    render(<OutwardLink href="https://forge.test/blob/a.ts" label="Open on GitHub" />)

    const link = screen.getByRole("link", { name: "Open on GitHub" })

    expect(link.getAttribute("href")).toBe("https://forge.test/blob/a.ts")
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noreferrer")
  })
})
