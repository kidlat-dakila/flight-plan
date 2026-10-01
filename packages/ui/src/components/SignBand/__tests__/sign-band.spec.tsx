import { render, screen, within } from "@testing-library/react"
import BrandMark from "@/components/BrandMark"
import SignBand from "@/components/SignBand"

describe("SignBand", () => {
  it("renders the brand and its actions inside the page banner", () => {
    render(
      <SignBand brand={<a href="/"><BrandMark logoSrc="/logo.png" name="Flight Plan" /></a>}>
        <nav aria-label="Configurations">Forge</nav>
      </SignBand>,
    )

    const banner = screen.getByRole("banner")

    expect(within(banner).getByRole("link", { name: "Flight Plan" })).toBeTruthy()
    expect(within(banner).getByRole("navigation", { name: "Configurations" })).toBeTruthy()
  })
})
