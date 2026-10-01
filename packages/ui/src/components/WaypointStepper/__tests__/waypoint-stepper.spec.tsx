import { fireEvent, render, screen } from "@testing-library/react"
import WaypointStepper from "@/components/WaypointStepper"

describe("WaypointStepper", () => {
  it("shows the position and reports a step in each direction", () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    render(
      <WaypointStepper positionLabel="4 of 12" previousLabel="Previous waypoint (K)" nextLabel="Next waypoint (J)" canStepBack canStepForward onPrevious={onPrevious} onNext={onNext} />,
    )

    expect(screen.getByText("4 of 12")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Previous waypoint (K)" }))
    fireEvent.click(screen.getByRole("button", { name: "Next waypoint (J)" }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it("disables the direction that has no waypoint left", () => {
    render(
      <WaypointStepper positionLabel="12 of 12" previousLabel="Previous" nextLabel="Next" canStepBack canStepForward={false} onPrevious={vi.fn()} onNext={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: "Next" })).toHaveProperty("disabled", true)
    expect(screen.getByRole("button", { name: "Previous" })).toHaveProperty("disabled", false)
  })
})
