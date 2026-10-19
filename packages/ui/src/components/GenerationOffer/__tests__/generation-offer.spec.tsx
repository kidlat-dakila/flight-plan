import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import GenerationOffer from "@/components/GenerationOffer"

type GenerationOfferProps = ComponentProps<typeof GenerationOffer>

const renderOffer = (overrides: Partial<GenerationOfferProps> = {}) => {
  const onGenerate = vi.fn()
  render(
    <GenerationOffer
      kind="board"
      anchorId="trace-diagram"
      heading="Trace Diagram"
      message="The Trace Diagram was not generated."
      generateLabel="Generate"
      generatingLabel="Generating"
      isGenerating={false}
      errorMessage={null}
      onGenerate={onGenerate}
      {...overrides}
    />,
  )
  return onGenerate
}

describe("GenerationOffer", () => {
  it("says the section was not generated, under its heading, and generates it on a press", () => {
    const onGenerate = renderOffer()

    expect(screen.getByRole("region", { name: "Trace Diagram" }).textContent).toContain("The Trace Diagram was not generated.")
    expect(screen.getByRole("heading", { level: 2, name: "Trace Diagram" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    expect(onGenerate).toHaveBeenCalledTimes(1)
  })

  it("disables the button and says it is generating while the request runs", () => {
    renderOffer({ isGenerating: true })

    expect(screen.getByRole("button", { name: "Generating" }).hasAttribute("disabled")).toBe(true)
  })

  it("shows why the section could not be generated", () => {
    renderOffer({ errorMessage: "The repository is not in this checkout." })

    expect(screen.getByRole("alert").textContent).toBe("The repository is not in this checkout.")
  })

  it("is a notice under a smaller heading inside another section", () => {
    renderOffer({ kind: "notice", heading: "Findings" })

    expect(screen.getByRole("heading", { level: 3, name: "Findings" })).toBeTruthy()
  })
})
