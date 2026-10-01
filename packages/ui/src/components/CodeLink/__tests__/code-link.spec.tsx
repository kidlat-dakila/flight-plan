import { fireEvent, render, screen } from "@testing-library/react"
import CodeLink from "@/components/CodeLink"
import { CODE_LINKS } from "@/lib/__tests__/review-samples"

const TARGET = CODE_LINKS["src/price.ts#priceOf"]

describe("CodeLink", () => {
  it("opens code that has no waypoint on the forge, in a new tab", () => {
    const onOpen = vi.fn()
    render(<CodeLink target={{ ...TARGET, anchorId: null }} isCode onOpen={onOpen}>priceOf()</CodeLink>)

    const link = screen.getByRole("link", { name: "priceOf()" })

    expect(link.getAttribute("href")).toBe("https://forge.test/blob/src/price.ts#L3-L4")
    expect(link.getAttribute("target")).toBe("_blank")

    fireEvent.click(link)

    expect(onOpen).not.toHaveBeenCalled()
  })

  it("shows the code it points at when it takes focus", async () => {
    render(<CodeLink target={TARGET} isCode onOpen={vi.fn()}>priceOf()</CodeLink>)

    fireEvent.focus(screen.getByRole("link", { name: "priceOf()" }))

    expect(await screen.findByText("Lines 3 to 4, 2 lines")).toBeTruthy()
    expect(screen.getByText("export const priceOf = () => 1")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Open on GitHub" })).toBeTruthy()
  })
})
