import { fireEvent, render, screen, within } from "@testing-library/react"
import IgnoredPathsField from "@/components/IgnoredPathsField"

const PATTERNS = ["**/*.spec.ts", "**/e2e/**"]

const renderField = (props: Partial<React.ComponentProps<typeof IgnoredPathsField>> = {}) =>
  render(
    <>
      <h3 id="ignored">Ignored files</h3>
      <IgnoredPathsField labelledBy="ignored" value={PATTERNS} problem={null} onChange={vi.fn()} {...props} />
    </>,
  )

describe("IgnoredPathsField", () => {
  it("shows one field per pattern, named by its row", () => {
    renderField()

    const list = screen.getByRole("list", { name: "Ignored files" })
    expect(within(list).getAllByRole<HTMLInputElement>("textbox").map((field) => field.value)).toStrictEqual(PATTERNS)
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Path pattern 2" }).value).toBe("**/e2e/**")
  })

  it("changes, removes and adds patterns", () => {
    const onChange = vi.fn()
    renderField({ onChange })

    fireEvent.change(screen.getByRole("textbox", { name: "Path pattern 1" }), { target: { value: "**/*.test.ts" } })
    fireEvent.click(screen.getByRole("button", { name: "Remove **/e2e/**" }))
    fireEvent.click(screen.getByRole("button", { name: "Add pattern" }))

    expect(onChange.mock.calls).toStrictEqual([
      [["**/*.test.ts", "**/e2e/**"]],
      [["**/*.spec.ts"]],
      [["**/*.spec.ts", "**/e2e/**", ""]],
    ])
  })

  it("focuses the row it adds", () => {
    const { rerender } = renderField()

    fireEvent.click(screen.getByRole("button", { name: "Add pattern" }))
    rerender(
      <>
        <h3 id="ignored">Ignored files</h3>
        <IgnoredPathsField labelledBy="ignored" value={[...PATTERNS, ""]} problem={null} onChange={vi.fn()} />
      </>,
    )

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Path pattern 3" }))
    expect(screen.getByRole("button", { name: "Remove Path pattern 3" })).toBeTruthy()
  })

  it("shows a refused pattern's reason under its row only", () => {
    renderField({ problem: { position: 1, message: "Use forward slashes in path patterns." } })

    const refused = screen.getByRole("textbox", { name: "Path pattern 2" })
    expect(refused.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(refused.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Use forward slashes in path patterns.")
    expect(screen.getByRole("textbox", { name: "Path pattern 1" }).getAttribute("aria-invalid")).toBe("false")
  })
})
