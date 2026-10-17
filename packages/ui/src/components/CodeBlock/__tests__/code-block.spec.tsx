import { fireEvent, render, screen } from "@testing-library/react"
import CodeBlock from "@/components/CodeBlock"
import { codeLine } from "@/lib/__tests__/review-samples"

const LINES = [codeLine("", "const old = 1", "removed"), codeLine("7", "const held = 2", "added"), codeLine("8", "return held")]

const referenceNamed = (name: string): HTMLElement => {
  const found = [...document.querySelectorAll<HTMLElement>("[data-reference]")].find((reference) => reference.textContent === name)
  if (found === undefined) throw new Error(`No reference named ${name}`)
  return found
}

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

  it("marks the lines it is given and leaves the rest plain", () => {
    render(<CodeBlock lines={LINES} label="price.ts" markedLines={new Set([LINES[1], LINES[2]])} />)
    const markedOf = (text: string) => screen.getByText(text).closest("[data-marked]")?.getAttribute("data-marked")

    expect([markedOf("const old = 1"), markedOf("const held = 2"), markedOf("return held")]).toStrictEqual(["false", "true", "true"])
  })

  it("colours each token by its kind", () => {
    render(
      <CodeBlock
        label="src/price.ts"
        lines={[{ numberLabel: "1", removedNumberLabel: "", mark: "context", isFocused: false, tokens: [{ text: "const", kind: "keyword" }, { text: " a", kind: "plain" }], marks: [], references: [] }]}
      />,
    )

    expect(screen.getByText("const").style.color).toBe("var(--color-syntax-keyword)")
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
    fireEvent.click(screen.getByRole("button", { name: "Add a comment on line added 7" }), { shiftKey: true })

    expect(onAddComment.mock.calls).toStrictEqual([[{ side: "new", lineLabel: "8" }, false], [{ side: "new", lineLabel: "7" }, true]])
  })

  it("numbers a removed line by its old number, offers to comment on it, and draws its threads under it", () => {
    const onAddComment = vi.fn()
    const lines = [{ ...codeLine("", "const old = 1", "removed"), removedNumberLabel: "7" }, codeLine("7", "const held = 2", "added")]
    render(
      <CodeBlock
        lines={lines}
        label="src/price.ts"
        addCommentLabel="Add a comment on line"
        commentedLineKeys={new Set(["old:7"])}
        renderLineThreads={({ side, lineLabel }) => (side === "old" ? <p>{`A thread on old ${lineLabel}`}</p> : null)}
        onAddComment={onAddComment}
      />,
    )
    const removedRow = screen.getByText("const old = 1").closest("[data-line]")

    fireEvent.click(screen.getByRole("button", { name: "Add a comment on line removed 7" }))

    expect(onAddComment).toHaveBeenCalledWith({ side: "old", lineLabel: "7" }, false)
    expect(removedRow?.textContent).toContain("7")
    expect(removedRow?.getAttribute("data-commented")).toBe("true")
    expect(screen.getByText("const held = 2").closest("[data-line]")?.getAttribute("data-commented")).toBe("false")
    expect(screen.getByText("A thread on old 7").previousElementSibling).toBe(removedRow)
  })

  it("draws what belongs under a line right after it", () => {
    render(<CodeBlock lines={LINES} label="src/price.ts" renderLineExtra={(numberLabel) => (numberLabel === "7" ? <p>A thread</p> : null)} />)

    expect(screen.getByText("A thread").previousElementSibling?.getAttribute("data-line")).toBe("7")
  })

  it("marks the columns a line names", () => {
    render(<CodeBlock label="src/price.ts" lines={[{ ...codeLine("4", "<Button onClick={save} />"), marks: [{ fromColumn: 9, toColumn: 22 }] }]} />)

    expect(document.querySelector("mark")?.textContent).toBe("onClick={save}")
  })

  it("underlines a reference whose definition is known, and shows the definition when it is hovered", async () => {
    const definitions = {
      "src/tax.ts:1:1:code": {
        kind: "declaration" as const,
        pathLabel: "src/tax.ts",
        rangeLabel: "Line 1",
        description: null,
        lines: [codeLine("1", "export const taxOf = () => 2")],
        note: "Library. The import is shown and not followed.",
        forgeLink: null,
      },
    }
    render(
      <CodeBlock
        label="src/price.ts"
        definitions={definitions}
        lines={[{ ...codeLine("8", "return taxOf(held)"), references: [{ fromColumn: 8, toColumn: 12, definitionId: "src/tax.ts:1:1:code" }] }]}
      />,
    )
    const reference = referenceNamed("taxOf")

    expect(reference.getAttribute("aria-description")).toBe("Defined in src/tax.ts, Line 1")
    expect(reference.hasAttribute("aria-label")).toBe(false)

    fireEvent.focus(reference)

    expect(await screen.findByText("export const taxOf = () => 2")).toBeTruthy()
    expect(screen.getByText("Library. The import is shown and not followed.")).toBeTruthy()
    expect(screen.getByRole("group", { name: "src/tax.ts, Line 1" }).querySelector(".whitespace-pre-wrap")).toBeNull()
  })

  it("shows the description written for a definition above its code", async () => {
    const description = [{ kind: "paragraph" as const, inlines: [{ kind: "text" as const, text: "taxOf() is a utility function that returns the tax rate." }] }]
    const definitions = {
      "src/tax.ts:1:1:code": { kind: "declaration" as const, pathLabel: "src/tax.ts", rangeLabel: "Line 1", description, lines: [codeLine("1", "export const taxOf = () => 2")], note: null, forgeLink: null },
    }
    render(
      <CodeBlock
        label="src/price.ts"
        definitions={definitions}
        renderDefinitionDescription={(blocks) => <p>{blocks.flatMap((block) => (block.kind === "paragraph" ? block.inlines.map((inline) => inline.text) : [])).join("")}</p>}
        lines={[{ ...codeLine("8", "return taxOf(held)"), references: [{ fromColumn: 8, toColumn: 12, definitionId: "src/tax.ts:1:1:code" }] }]}
      />,
    )

    fireEvent.focus(referenceNamed("taxOf"))

    const written = await screen.findByText("taxOf() is a utility function that returns the tax rate.")
    const code = screen.getByText("export const taxOf = () => 2")

    expect(written.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows a name of the language with its description and its note, and no code", async () => {
    const description = [{ kind: "paragraph" as const, inlines: [{ kind: "text" as const, text: "Promise is a value that arrives later." }] }]
    const definitions = {
      "language:Promise": { kind: "declaration" as const, pathLabel: "Promise", rangeLabel: "Language", description, lines: [], note: "Assumed to be part of the language.", forgeLink: null },
    }
    render(
      <CodeBlock
        label="src/price.ts"
        definitions={definitions}
        renderDefinitionDescription={() => <p>Promise is a value that arrives later.</p>}
        lines={[{ ...codeLine("8", "return Promise.all(prices)"), references: [{ fromColumn: 8, toColumn: 14, definitionId: "language:Promise" }] }]}
      />,
    )

    fireEvent.focus(referenceNamed("Promise"))

    expect(await screen.findByText("Promise is a value that arrives later.")).toBeTruthy()
    expect(screen.getByText("Assumed to be part of the language.")).toBeTruthy()
    expect(screen.getAllByRole("group")).toHaveLength(1)
  })

  it("leaves a reference plain when its definition is not known", () => {
    render(
      <CodeBlock
        label="src/price.ts"
        lines={[{ ...codeLine("8", "return taxOf(held)"), references: [{ fromColumn: 8, toColumn: 12, definitionId: "src/gone.ts:1:1:code" }] }]}
      />,
    )

    expect(document.querySelector("[data-reference]")).toBeNull()
    expect(screen.getByRole("group", { name: "src/price.ts" }).textContent).toContain("return taxOf(held)")
  })

  it("shows the usages of an exported name, by file, with each usage marked", async () => {
    const definitions = {
      "usages:src/tax.ts:1:3": {
        kind: "usages" as const,
        nameLabel: "taxOf",
        countLabel: "2 usages in 2 files",
        files: [
          { pathLabel: "src/price.ts", lines: [{ ...codeLine("9", "return taxOf(rate)"), marks: [{ fromColumn: 8, toColumn: 12 }] }], forgeLink: null },
          { pathLabel: "src/cart.ts", lines: [codeLine("4", "const tax = taxOf(rate)")], forgeLink: { href: "https://forge.test/src/cart.ts#L4-L4", label: "Open on the forge" } },
        ],
        note: null,
      },
    }
    render(
      <CodeBlock
        label="src/tax.ts"
        definitions={definitions}
        lines={[{ ...codeLine("1", "export function taxOf(rate: Rate) {"), references: [{ fromColumn: 17, toColumn: 21, definitionId: "usages:src/tax.ts:1:3" }] }]}
      />,
    )
    const name = referenceNamed("taxOf")

    expect(name.getAttribute("aria-description")).toBe("2 usages in 2 files")

    fireEvent.focus(name)

    expect(await screen.findByRole("region", { name: "src/price.ts" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "taxOf in src/price.ts" }).querySelector("mark")?.textContent).toBe("taxOf")
    expect(screen.getByRole("group", { name: "taxOf in src/cart.ts" }).textContent).toContain("const tax = taxOf(rate)")
  })

  it("says an exported name nobody imports has no usages", async () => {
    const definitions = {
      "usages:src/tax.ts:1:3": { kind: "usages" as const, nameLabel: "taxOf", countLabel: "No usages", files: [], note: "No file imports it." },
    }
    render(
      <CodeBlock
        label="src/tax.ts"
        definitions={definitions}
        lines={[{ ...codeLine("1", "export function taxOf(rate: Rate) {"), references: [{ fromColumn: 17, toColumn: 21, definitionId: "usages:src/tax.ts:1:3" }] }]}
      />,
    )

    fireEvent.focus(referenceNamed("taxOf"))

    expect(await screen.findByText("No file imports it.")).toBeTruthy()
    expect(screen.getByText("No usages")).toBeTruthy()
  })

  it("lets only the first reference of a block take a tab stop, and moves between references with the arrow keys", () => {
    const declaration = { kind: "declaration" as const, pathLabel: "src/tax.ts", rangeLabel: "Line 1", description: null, lines: [], note: null, forgeLink: null }
    render(
      <CodeBlock
        label="src/price.ts"
        definitions={{ tax: declaration, rate: declaration }}
        lines={[
          {
            ...codeLine("8", "return taxOf(rate)"),
            references: [{ fromColumn: 8, toColumn: 12, definitionId: "tax" }, { fromColumn: 14, toColumn: 17, definitionId: "rate" }],
          },
        ]}
      />,
    )
    const taxOf = referenceNamed("taxOf")
    const rate = referenceNamed("rate")

    expect([taxOf.tabIndex, rate.tabIndex]).toStrictEqual([0, -1])

    taxOf.focus()
    fireEvent.keyDown(taxOf, { key: "ArrowRight" })

    expect(document.activeElement).toBe(rate)

    fireEvent.keyDown(rate, { key: "ArrowRight" })

    expect(document.activeElement).toBe(rate)

    fireEvent.keyDown(rate, { key: "ArrowLeft" })

    expect(document.activeElement).toBe(taxOf)
  })
})
