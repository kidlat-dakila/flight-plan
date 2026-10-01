import { fireEvent, render, screen } from "@testing-library/react"
import FindingCard from "@/components/FindingCard"
import { codeLine, createFinding } from "@/lib/__tests__/review-samples"

describe("FindingCard", () => {
  it("shows the kind, the title, the reading and the steps of the trace", () => {
    render(
      <FindingCard
        finding={createFinding({ trace: [[{ kind: "text", text: "It subtracts." }], [{ kind: "text", text: "It returns." }]] })}
        codeLinks={{}}
        onOpenCodeLink={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: /Risk\s*The total can be negative/ })).toBeTruthy()
    expect(screen.getByText("Nothing clamps it.")).toBeTruthy()
    expect(screen.getAllByRole("listitem").map((step) => step.textContent)).toStrictEqual(["It subtracts.", "It returns."])
  })

  it("keeps the fix hidden until the reviewer asks to preview it", () => {
    const solution = { showLabel: "Preview the fix", hideLabel: "Hide the fix", lines: [codeLine("", "return Math.max(0, total)", "added")] }
    render(<FindingCard finding={createFinding({ solution })} codeLinks={{}} onOpenCodeLink={vi.fn()} />)

    expect(screen.queryByText("return Math.max(0, total)")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Preview the fix" }))

    expect(screen.getByText("return Math.max(0, total)")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Hide the fix" }).getAttribute("aria-expanded")).toBe("true")
  })

  it("has no fix control for a finding without one", () => {
    render(<FindingCard finding={createFinding()} codeLinks={{}} onOpenCodeLink={vi.fn()} />)

    expect(screen.queryByRole("button")).toBeNull()
  })
})
