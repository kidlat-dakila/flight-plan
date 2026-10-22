import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { Marked, marked } from "marked"
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
  canUseSections = false,
) => {
  const onChange = vi.fn<(markdown: string) => void>()
  render(
    <TextEditor
      label="Context"
      value={value}
      errorMessage={errorMessage}
      canUseSections={canUseSections}
      renderCodeLinkDialog={renderCodeLinkDialog}
      onChange={onChange}
    />,
  )
  return { onChange, box: screen.getByRole("textbox", { name: "Context" }) }
}

const markedInstancesUsedBy = (renderEditors: () => void): ReadonlySet<unknown> => {
  const use = vi.spyOn(Marked.prototype, "use")
  renderEditors()
  const instances = new Set(use.mock.contexts)
  use.mockRestore()
  return instances
}

describe("TextEditor", () => {
  it("gives every editor a Marked of its own, so the tokenizers of a closed editor are not kept", () => {
    const instances = markedInstancesUsedBy(() => {
      render(<TextEditor label="First" value="" errorMessage={null} onChange={vi.fn()} />)
      render(<TextEditor label="Second" value="" errorMessage={null} onChange={vi.fn()} />)
      render(<TextEditor label="Third" value="" errorMessage={null} canUseSections onChange={vi.fn()} />)
      render(<TextEditor label="Fourth" value="" errorMessage={null} canUseSections onChange={vi.fn()} />)
    })

    expect(instances.size).toBe(4)
    expect(marked.defaults.extensions).toBeNull()
  })

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

  describe("tabs", () => {
    const tabbedContext = [
      "This segment adds a page.",
      "",
      ":::tabs",
      "::tab What's added",
      "- A page.",
      "::tab What's modified",
      "The router.",
      ":::",
    ].join("\n")

    const renderTabs = async (value = tabbedContext) => {
      const rendered = renderEditor(value, null, undefined, true)
      if (value !== "") await screen.findByRole("tablist")
      return rendered
    }

    const tabNames = () => within(screen.getByRole("tablist")).getAllByRole("tab").map((tab) => tab.textContent)

    const lastWritten = (onChange: Awaited<ReturnType<typeof renderTabs>>["onChange"]) => onChange.mock.lastCall?.[0] ?? ""

    const rewrite = () => {
      fireEvent.click(screen.getByRole("button", { name: "Bold" }))
      fireEvent.click(screen.getByRole("button", { name: "Bold" }))
    }

    it("shows a tabs block as tabs, with only the first tab's content shown", async () => {
      const { box } = await renderTabs()

      expect(tabNames()).toStrictEqual(["What's added", "What's modified"])
      expect(screen.getByRole("tab", { name: "What's added" }).getAttribute("aria-selected")).toBe("true")
      expect(within(box).getByText("A page.").closest("[hidden]")).toBeNull()
      expect(within(box).getByText("The router.").closest("[hidden]")).not.toBeNull()
    })

    it("writes the tabs back exactly as they were read", async () => {
      const { onChange } = await renderTabs()

      rewrite()

      expect(lastWritten(onChange).trimEnd()).toBe(tabbedContext)
    })

    it("leaves the tabs syntax as text when tabs are not allowed, even beside an editor that allows them", async () => {
      render(<TextEditor label="Notes" value={tabbedContext} errorMessage={null} canUseSections onChange={vi.fn()} />)
      await screen.findByRole("tablist")
      render(<TextEditor label="Reading" value={tabbedContext} errorMessage={null} onChange={vi.fn()} />)

      const reading = screen.getByRole("textbox", { name: "Reading" })

      expect(within(reading).queryByRole("tablist")).toBeNull()
      expect(within(screen.getByRole("toolbar", { name: "Reading formatting" })).queryByRole("button", { name: "Tabs" })).toBeNull()
      expect(reading.textContent).toContain(":::tabs")
      expect(reading.textContent).toContain("The router.")
    })

    it("opens the tab that is clicked", async () => {
      const { box } = await renderTabs()

      fireEvent.click(screen.getByRole("tab", { name: "What's modified" }))

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "What's modified" }).getAttribute("aria-selected")).toBe("true")
      })
      expect(within(box).getByText("The router.").closest("[hidden]")).toBeNull()
      expect(within(box).getByText("A page.").closest("[hidden]")).not.toBeNull()
    })

    it("adds a tab with its name open for editing, and writes the name that is entered", async () => {
      const { onChange } = await renderTabs()

      fireEvent.click(screen.getByRole("button", { name: "Add a tab" }))
      const name = await screen.findByRole("textbox", { name: "Tab name" })

      expect(document.activeElement).toBe(name)
      fireEvent.change(name, { target: { value: "What's removed" } })
      fireEvent.keyDown(name, { key: "Enter" })

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["What's added", "What's modified", "What's removed"])
      })
      expect(lastWritten(onChange)).toContain("::tab What's modified\nThe router.\n::tab What's removed\n:::")
    })

    it("renames a tab in place, keeps the old name on Escape and on an empty name", async () => {
      const { onChange } = await renderTabs()

      fireEvent.doubleClick(screen.getByRole("tab", { name: "What's added" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Tab name" }), { target: { value: "Added" } })
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Tab name" }), { key: "Enter" })

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["Added", "What's modified"])
      })
      expect(lastWritten(onChange)).toContain("::tab Added\n- A page.")

      fireEvent.keyDown(screen.getByRole("tab", { name: "Added" }), { key: "Enter" })
      fireEvent.change(await screen.findByRole("textbox", { name: "Tab name" }), { target: { value: "Gone" } })
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Tab name" }), { key: "Escape" })

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["Added", "What's modified"])
      })

      fireEvent.doubleClick(screen.getByRole("tab", { name: "Added" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Tab name" }), { target: { value: "  " } })
      fireEvent.blur(screen.getByRole("textbox", { name: "Tab name" }))

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["Added", "What's modified"])
      })
    })

    it("deletes a tab, and the whole block with its last tab", async () => {
      const { onChange } = await renderTabs()

      fireEvent.click(screen.getByRole("button", { name: "Delete the tab What's modified" }))

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["What's added"])
      })
      expect(lastWritten(onChange)).not.toContain("The router.")

      fireEvent.click(screen.getByRole("button", { name: "Delete the tab What's added" }))

      await waitFor(() => {
        expect(screen.queryByRole("tablist")).toBeNull()
      })
      expect(lastWritten(onChange).trimEnd()).toBe("This segment adds a page.")
    })

    it("moves a tab with Alt and the arrow keys, and by dragging it", async () => {
      const { onChange } = await renderTabs()

      fireEvent.keyDown(screen.getByRole("tab", { name: "What's added" }), { key: "ArrowRight", altKey: true })

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["What's modified", "What's added"])
      })
      expect(lastWritten(onChange)).toContain(":::tabs\n::tab What's modified\nThe router.\n::tab What's added\n- A page.\n:::")

      fireEvent.dragStart(screen.getByRole("tab", { name: "What's added" }), { dataTransfer: { setData: vi.fn() } })
      fireEvent.dragOver(screen.getByRole("tab", { name: "What's modified" }))
      fireEvent.drop(screen.getByRole("tab", { name: "What's modified" }))

      await waitFor(() => {
        expect(tabNames()).toStrictEqual(["What's added", "What's modified"])
      })
    })

    it("removes the tabs block and keeps each tab as a heading with its content", async () => {
      const { onChange } = await renderTabs()

      fireEvent.click(screen.getByRole("button", { name: "Remove tabs" }))

      await waitFor(() => {
        expect(screen.queryByRole("tablist")).toBeNull()
      })
      expect(lastWritten(onChange).trimEnd()).toBe("This segment adds a page.\n\n### What's added\n\n- A page.\n\n### What's modified\n\nThe router.")
    })

    it("inserts a tabs block from the toolbar with one tab whose name is open for editing", async () => {
      const { onChange } = await renderTabs("")

      fireEvent.click(screen.getByRole("button", { name: "Tabs" }))
      await screen.findByRole("tablist")

      const name = await screen.findByRole("textbox", { name: "Tab name" })

      expect(document.activeElement).toBe(name)
      expect(name).toHaveProperty("value", "New tab")
      expect(lastWritten(onChange)).toContain(":::tabs\n::tab New tab\n:::")
    })

    const placeCursorIn = (box: HTMLElement, text: string) => {
      const range = document.createRange()
      range.setStart(within(box).getByText(text).firstChild ?? box, 1)
      range.collapse(true)
      box.focus()
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      fireEvent(document, new Event("selectionchange"))
    }

    it("offers no tabs block inside a tab, since tabs do not nest", async () => {
      const { box } = await renderTabs()

      expect(screen.getByRole("button", { name: "Tabs" }).hasAttribute("disabled")).toBe(false)

      placeCursorIn(box, "A page.")

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Tabs" }).hasAttribute("disabled")).toBe(true)
      })
    })
  })

  describe("accordion", () => {
    const accordionContext = [
      "This segment adds a page.",
      "",
      ":::accordion",
      "::section What's added",
      "- A page.",
      "::section What's modified",
      "The router.",
      ":::",
    ].join("\n")

    const renderAccordion = async (value = accordionContext) => {
      const rendered = renderEditor(value, null, undefined, true)
      if (value !== "") await screen.findByRole("button", { name: "Add a section" })
      return rendered
    }

    const sectionNames = () => Array.from(document.querySelectorAll("[data-section-name]")).map((name) => name.textContent)

    const lastWritten = (onChange: Awaited<ReturnType<typeof renderAccordion>>["onChange"]) => onChange.mock.lastCall?.[0] ?? ""

    const dataTransferOf = () => {
      const setData = vi.fn<(type: string, value: string) => void>()
      const getData = (type: string) => setData.mock.calls.find(([setType]) => setType === type)?.[1] ?? ""
      return { setData, getData }
    }

    it("shows every section with its name and its text", async () => {
      const { box } = await renderAccordion()

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["What's added", "What's modified"])
      })
      expect(within(box).getByText("A page.").closest("[hidden]")).toBeNull()
      expect(within(box).getByText("The router.").closest("[hidden]")).toBeNull()
    })

    it("writes the accordion back exactly as it was read", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.click(screen.getByRole("button", { name: "Bold" }))
      fireEvent.click(screen.getByRole("button", { name: "Bold" }))

      expect(lastWritten(onChange).trimEnd()).toBe(accordionContext)
    })

    it("leaves the accordion syntax as text in an editor that does not use sections", async () => {
      render(<TextEditor label="Notes" value={accordionContext} errorMessage={null} canUseSections onChange={vi.fn()} />)
      await screen.findByRole("button", { name: "Add a section" })
      render(<TextEditor label="Reading" value={accordionContext} errorMessage={null} onChange={vi.fn()} />)

      expect(screen.getByRole("textbox", { name: "Reading" }).textContent).toContain(":::accordion")
      expect(within(screen.getByRole("toolbar", { name: "Reading formatting" })).queryByRole("button", { name: "Accordion" })).toBeNull()
    })

    it("adds a section with its name open for editing, and writes the name that is entered", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.click(screen.getByRole("button", { name: "Add a section" }))
      const name = await screen.findByRole("textbox", { name: "Section name" })

      expect(document.activeElement).toBe(name)
      fireEvent.change(name, { target: { value: "What's removed" } })
      fireEvent.keyDown(name, { key: "Enter" })

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["What's added", "What's modified", "What's removed"])
      })
      expect(lastWritten(onChange)).toContain("::section What's modified\nThe router.\n::section What's removed\n:::")
    })

    it("renames a section in place, keeps the old name on Escape and on an empty name", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.doubleClick(screen.getByRole("button", { name: "What's added" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Section name" }), { target: { value: "Added" } })
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Section name" }), { key: "Enter" })

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["Added", "What's modified"])
      })
      expect(lastWritten(onChange)).toContain("::section Added\n- A page.")

      fireEvent.keyDown(screen.getByRole("button", { name: "Added" }), { key: "Enter" })
      fireEvent.change(await screen.findByRole("textbox", { name: "Section name" }), { target: { value: "Gone" } })
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Section name" }), { key: "Escape" })

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["Added", "What's modified"])
      })

      fireEvent.doubleClick(screen.getByRole("button", { name: "Added" }))
      fireEvent.change(await screen.findByRole("textbox", { name: "Section name" }), { target: { value: "  " } })
      fireEvent.blur(screen.getByRole("textbox", { name: "Section name" }))

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["Added", "What's modified"])
      })
    })

    it("deletes a section, and the whole block with its last section", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.click(screen.getByRole("button", { name: "Delete the section What's modified" }))

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["What's added"])
      })

      fireEvent.click(screen.getByRole("button", { name: "Delete the section What's added" }))

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Add a section" })).toBeNull()
      })
      expect(lastWritten(onChange).trimEnd()).toBe("This segment adds a page.")
    })

    it("moves a section with Alt and the arrow keys, and by dragging its name", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.keyDown(screen.getByRole("button", { name: "What's added" }), { key: "ArrowDown", altKey: true })

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["What's modified", "What's added"])
      })
      expect(lastWritten(onChange)).toContain(":::accordion\n::section What's modified\nThe router.\n::section What's added\n- A page.\n:::")

      const dataTransfer = dataTransferOf()
      fireEvent.dragStart(screen.getByRole("button", { name: "What's added" }), { dataTransfer })
      fireEvent.dragOver(screen.getByRole("button", { name: "What's modified" }), { dataTransfer })
      fireEvent.drop(screen.getByRole("button", { name: "What's modified" }), { dataTransfer })

      await waitFor(() => {
        expect(sectionNames()).toStrictEqual(["What's added", "What's modified"])
      })
    })

    it("removes the accordion and keeps each section as a heading with its content", async () => {
      const { onChange } = await renderAccordion()

      fireEvent.click(screen.getByRole("button", { name: "Remove accordion" }))

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Add a section" })).toBeNull()
      })
      expect(lastWritten(onChange).trimEnd()).toBe("This segment adds a page.\n\n### What's added\n\n- A page.\n\n### What's modified\n\nThe router.")
    })

    it("inserts an accordion from the toolbar with one section whose name is open for editing", async () => {
      const { onChange } = await renderAccordion("")

      fireEvent.click(screen.getByRole("button", { name: "Accordion" }))
      const name = await screen.findByRole("textbox", { name: "Section name" })

      expect(document.activeElement).toBe(name)
      expect(name).toHaveProperty("value", "New section")
      expect(lastWritten(onChange)).toContain(":::accordion\n::section New section\n:::")
    })

    it("offers neither an accordion nor tabs inside a section", async () => {
      const { box } = await renderAccordion()
      await waitFor(() => {
        expect(sectionNames()).toHaveLength(2)
      })

      const range = document.createRange()
      range.setStart(within(box).getByText("A page.").firstChild ?? box, 1)
      range.collapse(true)
      box.focus()
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      fireEvent(document, new Event("selectionchange"))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Accordion" }).hasAttribute("disabled")).toBe(true)
      })
      expect(screen.getByRole("button", { name: "Tabs" }).hasAttribute("disabled")).toBe(true)
    })
  })
})
