import { fireEvent, render, screen } from "@testing-library/react"
import Avatar from "@/components/Avatar"

describe("Avatar", () => {
  it("shows the picture when there is one", () => {
    const { container } = render(<Avatar imageUrl="https://forge.test/mira.png" monogram="M" />)

    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://forge.test/mira.png")
    expect(screen.queryByText("M")).toBeNull()
  })

  it("shows the monogram when there is no picture", () => {
    const { container } = render(<Avatar imageUrl={null} monogram="MK" />)

    expect(screen.getByText("MK")).toBeTruthy()
    expect(container.querySelector("img")).toBeNull()
  })

  it("falls back to the monogram when the picture cannot be loaded", () => {
    const { container } = render(<Avatar imageUrl="https://forge.test/missing.png" monogram="J" />)

    fireEvent.error(container.querySelector("img") ?? container)

    expect(screen.getByText("J")).toBeTruthy()
    expect(container.querySelector("img")).toBeNull()
  })
})
