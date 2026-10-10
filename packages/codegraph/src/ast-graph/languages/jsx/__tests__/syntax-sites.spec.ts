import type { SourceRange, SyntaxSite } from "@/ast-graph"
import { JSX_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const WHOLE_FILE: SourceRange = { start: { line: 1, column: 0 }, end: { line: 99, column: 0 } }

const isOfKind = <Kind extends SyntaxSite["kind"]>(kind: Kind) => (site: SyntaxSite): site is Extract<SyntaxSite, { kind: Kind }> => site.kind === kind

const sitesIn = <Kind extends SyntaxSite["kind"]>(source: string, kind: Kind): Extract<SyntaxSite, { kind: Kind }>[] =>
  JSX_READING.fileOf(source).listSyntaxSitesIn(WHOLE_FILE).filter(isOfKind(kind))

const PAGE = sourceOf(
  "const Page = () => (",
  "  <main>",
  "    <Form.Field label=\"Name\" onChange={rename} />",
  "    <SaveContext.Provider value={save}>",
  "      <button onClick={save}>Save now</button>",
  "    </SaveContext.Provider>",
  "    <button onClick={discard}><Icon /> Discard</button>",
  "    <input onChange={rename} />",
  "  </main>",
  ")",
)

describe("the syntax sites JSXASTGraphFile reads in elements", () => {
  it("finds each attribute with its element and whether the element is built in", () => {
    const attributes = sitesIn(PAGE, "attribute").map((site) => [site.element, site.attribute, site.isBuiltIn])

    expect(attributes).toStrictEqual([
      ["Form.Field", "label", false],
      ["Form.Field", "onChange", false],
      ["SaveContext.Provider", "value", false],
      ["button", "onClick", true],
      ["button", "onClick", true],
      ["input", "onChange", true],
    ])
  })

  it("names the component of an attribute by the name its element starts with", () => {
    expect(sitesIn(PAGE, "attribute").map((site) => site.elementName?.name ?? null)).toStrictEqual(["Form", "Form", "SaveContext", null, null, null])
  })

  it("reads the words written inside the element of an attribute", () => {
    expect(sitesIn(PAGE, "attribute").map((site) => site.text)).toStrictEqual([null, null, null, "Save now", "Discard", null])
  })

  it("finds the name of every rendered component and of no built-in element", () => {
    const lines = PAGE.split("\n")
    const names = sitesIn(PAGE, "element").map(({ range }) => lines[range.start.line - 1].slice(range.start.column, range.end.column))

    expect(names).toStrictEqual(["Form.Field", "SaveContext.Provider", "Icon"])
  })

  it("finds every element as markup", () => {
    expect(sitesIn(PAGE, "markup")).toHaveLength(7)
  })

  it("reads the same calls, members and functions as a TypeScript file", () => {
    const source = "const Row = ({ user }) => <li onClick={() => select(user.id)} />"

    expect(sitesIn(source, "callee")).toHaveLength(1)
    expect(sitesIn(source, "member").map((site) => site.property)).toStrictEqual(["id"])
    expect(sitesIn(source, "function").map((site) => site.wrapped !== null)).toStrictEqual([false, true])
  })

  it("nests the elements of a component as statements, each under the element that holds it", () => {
    const file = JSX_READING.fileOf(PAGE)
    const [page] = JSX_READING.syntaxOf(PAGE).rootEncapsulations
    const outline = (statements: ReturnType<typeof file.listStatements>, indent = ""): string[] =>
      statements.flatMap((statement) => [`${indent}${statement.type} ${statement.text}`, ...outline(statement.statements, `${indent}  `)])

    expect(outline(file.listStatements(page))).toStrictEqual([
      "return (",
      "  markup <main>",
      "    markup <Form.Field label=\"Name\" onChange={rename} />",
      "    markup <SaveContext.Provider value={save}>",
      "      markup <button onClick={save}>Save now</button>",
      "    markup <button onClick={discard}><Icon /> Discard</button>",
      "      markup <Icon />",
      "    markup <input onChange={rename} />",
    ])
  })
})
