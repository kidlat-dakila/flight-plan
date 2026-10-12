import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import TextEditor, { type CodeLinkRequest } from "@/components/TextEditor"

const CONTEXT = [
  "### Why",
  "",
  "The price now counts **held** units through [`priceOf`](code:src/price.ts#priceOf) and the [cart total](code:src/cart.ts#L3-L5).",
  "",
  "- First `rates` entry",
  "- Second entry",
  "",
  "1. Step one",
  "2. Step two",
].join("\n")

const RICH_CONTEXT = [
  "An *open* [question](https://example.com/q).",
  "",
  "> Said once.",
  "",
  "```ts",
  "const held = 1",
  "```",
  "",
  "- Outer",
  "  - Inner",
].join("\n")

const renderEditor = (
  value: string,
  errorMessage: string | null = null,
  renderCodeLinkDialog?: (request: CodeLinkRequest) => ReactNode,
) => {
  const onChange = vi.fn<(markdown: string) => void>()
  render(
    <TextEditor
      label="Context"
      value={value}
      errorMessage={errorMessage}
      renderCodeLinkDialog={renderCodeLinkDialog}
      onChange={onChange}
    />,
  )
  return { onChange, box: screen.getByRole("textbox", { name: "Context" }) }
}

describe("TextEditor", () => {
  it("shows Markdown as formatted text: a heading, bold, code and both kinds of list", () => {
    const { box } = renderEditor(CONTEXT)

    expect(within(box).getByRole("heading", { name: "Why" })).toBeTruthy()
    expect(within(box).getByText("held").tagName).toBe("STRONG")
    expect(within(box).getByText("rates").tagName).toBe("CODE")
    expect(within(box).getAllByRole("list")).toHaveLength(2)
    expect(within(box).getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([
      "First rates entry",
      "Second entry",
      "Step one",
      "Step two",
    ])
  })

  it("keeps each code link as one piece that names what it points at", () => {
    const { box } = renderEditor(CONTEXT)

    expect(within(box).getByText("priceOf").getAttribute("data-code-link")).toBe("src/price.ts#priceOf")
    expect(within(box).getByText("priceOf").hasAttribute("data-code")).toBe(true)
    expect(within(box).getByText("cart total").getAttribute("data-code-link")).toBe("src/cart.ts#L3-L5")
    expect(within(box).getByText("cart total").hasAttribute("data-code")).toBe(false)
  })

  it("marks the formats of the text at the cursor as pressed", () => {
    renderEditor(CONTEXT)

    const toolbar = screen.getByRole("toolbar", { name: "Context formatting" })

    expect(within(toolbar).getByRole("button", { name: "Heading" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(toolbar).getByRole("button", { name: "Bulleted list" }).getAttribute("aria-pressed")).toBe("false")
  })

  it("reports the whole text as Markdown when a format changes, with the code links as they were written", () => {
    const { onChange } = renderEditor(CONTEXT)

    fireEvent.click(screen.getByRole("button", { name: "Heading" }))

    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining("Why\n\nThe price now counts **held** units"))
    expect(onChange).not.toHaveBeenLastCalledWith(expect.stringContaining("### Why"))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringContaining("through [`priceOf`](code:src/price.ts#priceOf) and the [cart total](code:src/cart.ts#L3-L5)."),
    )
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining("- First `rates` entry\n- Second entry\n\n1. Step one\n2. Step two"))
  })

  it("starts empty for an empty text and turns the first line into a list", () => {
    const { onChange, box } = renderEditor("")

    fireEvent.click(screen.getByRole("button", { name: "Numbered list" }))

    expect(within(box).getByRole("list").tagName).toBe("OL")
    expect(onChange).toHaveBeenCalled()
  })

  it("shows the error it is given and marks the field invalid", () => {
    const { box } = renderEditor("", "Write the context. A segment cannot be without one.")

    expect(screen.getByRole("alert").textContent).toBe("Write the context. A segment cannot be without one.")
    expect(box.closest("[aria-invalid='true']")).not.toBeNull()
  })

  it("shows italic text, a link, a quote, a code block and a list inside a list", () => {
    const { box } = renderEditor(RICH_CONTEXT)

    expect(within(box).getByText("open").tagName).toBe("EM")
    expect(within(box).getByText("question").closest("a")?.getAttribute("href")).toBe("https://example.com/q")
    expect(within(box).getByText("Said once.").closest("blockquote")).not.toBeNull()
    expect(within(box).getByText("const held = 1").closest("pre")).not.toBeNull()
    expect(within(box).getByText("Inner").closest("ul")?.parentElement?.closest("ul")).not.toBeNull()
  })

  it("writes italic text, a link, a quote, a code block and a list inside a list back as Markdown", () => {
    const { onChange } = renderEditor(RICH_CONTEXT)

    fireEvent.click(screen.getByRole("button", { name: "Bold" }))
    fireEvent.click(screen.getByRole("button", { name: "Bold" }))

    const written = onChange.mock.lastCall?.[0] ?? ""

    expect(written).toContain("An *open* [question](https://example.com/q).")
    expect(written).toContain("> Said once.")
    expect(written).toContain("```ts\nconst held = 1\n```")
    expect(written).toMatch(/- Outer\n {2}- Inner/)
  })

  it("turns the first line into a quote and into a code block from the toolbar", () => {
    const { onChange, box } = renderEditor("Said once.")

    fireEvent.click(screen.getByRole("button", { name: "Quote" }))

    expect(within(box).getByText("Said once.").closest("blockquote")).not.toBeNull()
    expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^> Said once\.\s*$/))

    fireEvent.click(screen.getByRole("button", { name: "Quote" }))
    fireEvent.click(screen.getByRole("button", { name: "Code block" }))

    expect(within(box).getByText("Said once.").closest("pre")).not.toBeNull()
  })

  it("writes a link to the address that is applied, and closes the address field", () => {
    const { onChange } = renderEditor("")

    fireEvent.click(screen.getByRole("button", { name: "Link" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Link address" }), { target: { value: "https://example.com/q" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(onChange).toHaveBeenLastCalledWith("[https://example.com/q](https://example.com/q)")
    expect(screen.queryByRole("textbox", { name: "Link address" })).toBeNull()
  })

  it("offers a code link only when it is given a dialog for one, and inserts the link the dialog reports", () => {
    const { onChange } = renderEditor("", null, ({ onInsert, onClose }) => (
      <div role="dialog" aria-label="Link to code">
        <button type="button" onClick={() => { onInsert({ linkId: "src/cart.ts#L3-5", label: "the cart total", isCode: false }) }}>
          Insert
        </button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    ))

    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Code link" }))
    fireEvent.click(screen.getByRole("button", { name: "Insert" }))

    expect(onChange).toHaveBeenLastCalledWith("[the cart total](code:src/cart.ts#L3-5)")
    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Code link" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("has no code link button without a dialog for one", () => {
    renderEditor("")

    expect(screen.queryByRole("button", { name: "Code link" })).toBeNull()
  })
})
