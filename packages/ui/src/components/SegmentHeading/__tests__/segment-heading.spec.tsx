import { render, screen } from "@testing-library/react"
import SegmentHeading from "@/components/SegmentHeading"

describe("SegmentHeading", () => {
  it("shows the heading, what is put beside it and the detail", () => {
    render(<SegmentHeading heading="Segment 1: Checkout" detailLabel="3 files"><button type="button">Edit segment</button></SegmentHeading>)

    expect(screen.getByRole("heading", { level: 2, name: "Segment 1: Checkout" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Edit segment" })).toBeTruthy()
    expect(screen.getByText("3 files")).toBeTruthy()
  })

  it("leaves out a detail it was not given", () => {
    render(<SegmentHeading heading="Segment 1" detailLabel={null} />)

    expect(screen.queryByRole("paragraph")).toBeNull()
  })
})
