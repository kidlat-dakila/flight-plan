import { fireEvent, render, screen, within } from "@testing-library/react"
import Prose from "@/components/Prose"
import { CODE_LINKS } from "@/lib/__tests__/review-samples"
import type { ProseBlocks, ProseListItem } from "@/lib/review-content"

const BLOCKS: ProseBlocks = [
  { kind: "heading", inlines: [{ kind: "text", text: "Overview" }] },
  {
    kind: "paragraph",
    inlines: [
      { kind: "text", text: "Reads " },
      { kind: "code", text: "held" },
      { kind: "strong", text: " first" },
      { kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" },
      { kind: "code-link", text: "gone()", isCode: true, linkId: null },
    ],
  },
  {
    kind: "list",
    isOrdered: true,
    items: [
      { inlines: [{ kind: "text", text: "First step" }], blocks: [] },
      { inlines: [{ kind: "text", text: "Second step" }], blocks: [] },
    ],
  },
]

const RICH_BLOCKS: ProseBlocks = [
  {
    kind: "paragraph",
    inlines: [
      { kind: "emphasis", text: "open" },
      { kind: "link", text: "the issue", href: "https://example.com/issues/7" },
    ],
  },
  { kind: "quote", blocks: [{ kind: "paragraph", inlines: [{ kind: "text", text: "Said once." }] }] },
  { kind: "code-block", language: "ts", text: "const held = 1" },
  {
    kind: "list",
    isOrdered: false,
    items: [
      {
        inlines: [{ kind: "text", text: "Outer" }],
        blocks: [{ kind: "list", isOrdered: true, items: [{ inlines: [{ kind: "text", text: "Inner" }], blocks: [] }] }],
      },
    ],
  },
]

describe("Prose", () => {
  it("renders headings, paragraphs, inline code, bold text and lists", () => {
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    expect(screen.getByRole("heading", { level: 3, name: "Overview" })).toBeTruthy()
    expect(screen.getByText("held").tagName).toBe("CODE")
    expect(screen.getByText("first").tagName).toBe("STRONG")
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(["First step", "Second step"])
  })

  it("links a code link it has a target for, and reports its anchor when opened", () => {
    const onOpenCodeLink = vi.fn()
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={onOpenCodeLink} />)

    const link = screen.getByRole("link", { name: "priceOf()" })

    expect(link.getAttribute("href")).toBe("#waypoint-price-of")

    fireEvent.click(link)

    expect(onOpenCodeLink).toHaveBeenCalledWith("waypoint-price-of")
  })

  it("leaves a code link without a target as plain code", () => {
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    expect(screen.queryByRole("link", { name: "gone()" })).toBeNull()
    expect(screen.getByText("gone()").tagName).toBe("CODE")
  })

  it("renders italic text, a link to a web address, a quote and a code block", () => {
    render(<Prose blocks={RICH_BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    expect(screen.getByText("open").tagName).toBe("EM")
    expect(screen.getByRole("link", { name: "the issue" }).getAttribute("href")).toBe("https://example.com/issues/7")
    expect(screen.getByText("Said once.").closest("blockquote")).not.toBeNull()
    expect(screen.getByText("const held = 1").closest("pre")?.getAttribute("data-language")).toBe("ts")
  })

  it("renders a list inside the item it belongs to", () => {
    render(<Prose blocks={RICH_BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    const [outerList, innerList] = screen.getAllByRole("list")

    expect(outerList.tagName).toBe("UL")
    expect(innerList.tagName).toBe("OL")
    expect(outerList.contains(innerList)).toBe(true)
    expect(screen.getByText("Inner").closest("li")?.parentElement).toBe(innerList)
  })

  describe("a tabs block", () => {
    const paragraphOf = (text: string) => ({ kind: "paragraph" as const, inlines: [{ kind: "text" as const, text }] })
    const tabbedBlocks: ProseBlocks = [
      {
        kind: "tabs",
        tabs: [
          { label: "What's added", blocks: [paragraphOf("A new page.")] },
          { label: "What's modified", blocks: [paragraphOf("The router.")] },
          { label: "What's removed", blocks: [paragraphOf("The dialog.")] },
        ],
      },
    ]

    const renderTabs = () => render(<Prose blocks={tabbedBlocks} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    const panelText = () => screen.getByRole("tabpanel").textContent

    it("shows a tab for each label, with the first one open", () => {
      renderTabs()

      const tabs = within(screen.getByRole("tablist")).getAllByRole("tab")

      expect(tabs.map((tab) => tab.textContent)).toStrictEqual(["What's added", "What's modified", "What's removed"])
      expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toStrictEqual(["true", "false", "false"])
      expect(panelText()).toBe("A new page.")
      expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tabs[0].id)
    })

    it("opens the tab that is clicked", () => {
      renderTabs()

      fireEvent.click(screen.getByRole("tab", { name: "What's modified" }))

      expect(screen.getByRole("tab", { name: "What's modified" }).getAttribute("aria-selected")).toBe("true")
      expect(panelText()).toBe("The router.")
    })

    it("moves between tabs with the arrow keys, Home and End, and wraps around", () => {
      renderTabs()
      const firstTab = screen.getByRole("tab", { name: "What's added" })

      fireEvent.keyDown(firstTab, { key: "ArrowLeft" })
      expect(panelText()).toBe("The dialog.")
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: "What's removed" }))

      fireEvent.keyDown(document.activeElement ?? firstTab, { key: "ArrowRight" })
      expect(panelText()).toBe("A new page.")

      fireEvent.keyDown(firstTab, { key: "End" })
      expect(panelText()).toBe("The dialog.")

      fireEvent.keyDown(screen.getByRole("tab", { name: "What's removed" }), { key: "Home" })
      expect(panelText()).toBe("A new page.")
    })

    it("lets only the open tab be reached with Tab", () => {
      renderTabs()

      expect(screen.getAllByRole("tab").map((tab) => tab.tabIndex)).toStrictEqual([0, -1, -1])
    })
  })

  describe("an accordion block", () => {
    type ItemInlines = ProseListItem["inlines"]
    const itemOf = (inlines: ItemInlines) => ({ inlines, blocks: [] })
    const linkedItemOf = (name: string, rest: string) => itemOf([
      { kind: "code-link", text: name, isCode: true, linkId: null },
      { kind: "text", text: rest },
    ])
    const listOf = (items: ReturnType<typeof itemOf>[]) => ({ kind: "list" as const, isOrdered: false, items })
    const addedNames = ["fetchOrders()", "fetchOrder()", "createOrder()", "updateOrder()", "useOrders()", "useOrder()"]
    const accordion: ProseBlocks = [
      {
        kind: "accordion",
        sections: [
          { label: "What's added", blocks: [listOf(addedNames.map((name) => linkedItemOf(name, ": added a new function.")))] },
          {
            label: "What's removed",
            blocks: [listOf([itemOf([{ kind: "code", text: "<Dialog />" }, { kind: "text", text: ": removed the component." }]), linkedItemOf("index.ts", ": modified the barrel.")])],
          },
        ],
      },
    ]

    const renderAccordion = () => render(<Prose blocks={accordion} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    const toggleOf = (sectionName: string) =>
      within(screen.getByRole("region", { name: sectionName })).getByRole("button", { name: /change details/ })

    it("starts with every section collapsed, naming its first four items and how many more", () => {
      renderAccordion()

      const added = screen.getByRole("region", { name: "What's added" })

      expect(within(added).getByText("fetchOrders(), fetchOrder(), createOrder(), updateOrder()")).toBeTruthy()
      expect(within(added).getByText("+ 2 more")).toBeTruthy()
      expect(within(added).queryByText(": added a new function.", { exact: false })).toBeNull()
      expect(toggleOf("What's added").textContent).toBe("See change details")
      expect(toggleOf("What's added").getAttribute("aria-expanded")).toBe("false")
    })

    it("names every item of a short section, a removed one by its inline code, with no count", () => {
      renderAccordion()

      const removed = screen.getByRole("region", { name: "What's removed" })

      expect(within(removed).getByText("<Dialog />, index.ts")).toBeTruthy()
      expect(within(removed).queryByText(/more$/)).toBeNull()
    })

    it("expands a section to its full list, and only that section", () => {
      renderAccordion()

      fireEvent.click(toggleOf("What's added"))

      const added = screen.getByRole("region", { name: "What's added" })

      expect(toggleOf("What's added").textContent).toBe("Hide change details")
      expect(toggleOf("What's added").getAttribute("aria-expanded")).toBe("true")
      expect(document.getElementById(toggleOf("What's added").getAttribute("aria-controls") ?? "")).not.toBeNull()
      expect(within(added).getAllByRole("listitem")).toHaveLength(6)
      expect(within(added).queryByText("+ 2 more")).toBeNull()
      expect(toggleOf("What's removed").getAttribute("aria-expanded")).toBe("false")

      fireEvent.click(toggleOf("What's added"))

      expect(toggleOf("What's added").getAttribute("aria-expanded")).toBe("false")
    })
  })
})
