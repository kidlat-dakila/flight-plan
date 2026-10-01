import { fireEvent, render, screen } from "@testing-library/react"
import CodeBlock from "@/components/CodeBlock"
import { codeLine } from "@/lib/__tests__/review-samples"

const LINES = [codeLine("", "const old = 1", "removed"), codeLine("7", "const held = 2", "added"), codeLine("8", "return held")]

describe("CodeBlock", () => {
  it("draws each line with its number and says whether it was added or removed", () => {
    render(<CodeBlock lines={LINES} label="src/price.ts" />)

    const block = screen.getByRole("group", { name: "src/price.ts" })

    expect(block.querySelectorAll("[data-line]")).toHaveLength(3)
    expect(block.querySelector("[data-mark=added]")?.textContent).toContain("7")
    expect(block.querySelector("[data-mark=added]")?.textContent).toContain("added")
    expect(block.querySelector("[data-mark=removed]")?.textContent).toContain("removed")
    expect(block.textContent).toContain("const held = 2")
  })

  it("colours each token by its kind", () => {
    render(
      <CodeBlock
        label="src/price.ts"
        lines={[{ numberLabel: "1", mark: "context", isFocused: false, tokens: [{ text: "const", kind: "keyword" }, { text: " a", kind: "plain" }] }]}
      />,
    )

    expect(screen.getByText("const").className).toContain("text-syntax-keyword")
  })

  it("carries its path and marks the focused lines", () => {
    render(<CodeBlock lines={[codeLine("3", "a", "context", true)]} label="src/price.ts" path="src/price.ts" />)

    const block = screen.getByRole("group", { name: "src/price.ts" })

    expect(block.getAttribute("data-path")).toBe("src/price.ts")
    expect(block.querySelector("[data-focused=true]")).not.toBeNull()
  })

  it("offers to comment on a line that still exists, and reports which", () => {
    const onAddComment = vi.fn()
    render(<CodeBlock lines={LINES} label="src/price.ts" addCommentLabel="Add a comment on line" onAddComment={onAddComment} />)

    expect(screen.getAllByRole("button")).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "Add a comment on line 8" }))

    expect(onAddComment).toHaveBeenCalledWith("8")
  })

  it("draws what belongs under a line right after it", () => {
    render(<CodeBlock lines={LINES} label="src/price.ts" renderLineExtra={(numberLabel) => (numberLabel === "7" ? <p>A thread</p> : null)} />)

    expect(screen.getByText("A thread").previousElementSibling?.getAttribute("data-line")).toBe("7")
  })
})
