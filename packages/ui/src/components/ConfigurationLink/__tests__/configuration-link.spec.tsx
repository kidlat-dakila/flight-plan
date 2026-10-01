import { render, screen } from "@testing-library/react"
import ConfigurationLink from "@/components/ConfigurationLink"

describe("ConfigurationLink", () => {
  it("links to the configuration and names itself for assistive technology", () => {
    render(<ConfigurationLink href="/pr-reviews/storefront/configurations" label="Configure storefront" />)

    const link = screen.getByRole("link", { name: "Configure storefront" })

    expect(link.getAttribute("href")).toBe("/pr-reviews/storefront/configurations")
    expect(link.getAttribute("title")).toBe("Configure storefront")
  })
})
