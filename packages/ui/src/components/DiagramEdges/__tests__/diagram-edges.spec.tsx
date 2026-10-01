import { render, screen } from "@testing-library/react"
import DiagramEdges, { DiagramEdge, EdgeLegend } from "@/components/DiagramEdges"

describe("DiagramEdges", () => {
  it("draws each edge with an arrowhead, and an assumed edge with a hollow one", () => {
    const { container } = render(
      <DiagramEdges width={100} height={100}>
        {(markers) => (
          <>
            <DiagramEdge path="M 0 0 L 0 50" kind="call" isAssumed={false} markers={markers} />
            <DiagramEdge path="M 9 0 L 9 50" kind="data" isAssumed markers={markers} />
          </>
        )}
      </DiagramEdges>,
    )
    const [call, data] = [...container.querySelectorAll("path[data-kind]")]
    const [provenMarker, assumedMarker] = [...container.querySelectorAll("marker")]

    expect(call.getAttribute("marker-end")).toBe(`url(#${provenMarker.getAttribute("id") ?? ""})`)
    expect(data.getAttribute("marker-end")).toBe(`url(#${assumedMarker.getAttribute("id") ?? ""})`)
    expect(provenMarker.querySelector("path")?.getAttribute("class")).toContain("fill-current")
    expect(assumedMarker.querySelector("path")?.getAttribute("class")).toContain("fill-background")
    expect(data.getAttribute("class")).not.toBe(call.getAttribute("class"))
  })

  it("lists what each stroke means", () => {
    render(<EdgeLegend items={[{ kind: "call", label: "Calls" }, { kind: "assumed", label: "Assumed" }]} />)

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(["Calls", "Assumed"])
  })
})
