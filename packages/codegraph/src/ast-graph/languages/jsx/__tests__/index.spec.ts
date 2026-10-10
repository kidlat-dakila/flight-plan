import { ASTGraphFile, readJsxSyntax, type LineRange } from "@/ast-graph"
import { declarationOf, describeDiffLocation, describeVariable, isUsingImport, JSX_READING, outlineOf, sourceOf, usesOf } from "@/ast-graph/languages/__tests__/script-files"
import { parseWithGrammar } from "@/ast-graph/parser"

const SOURCE = sourceOf(
  "import { saveReview } from \"./reviews\"",
  "import { Editor } from \"./Editor\"",
  "",
  "export function ReviewPage({ reviewId }: Props) {",
  "  const handleSave = () => saveReview(reviewId)",
  "  return (",
  "    <main>",
  "      <Editor onSave={handleSave} />",
  "    </main>",
  "  )",
  "}",
)

const SYNTAX = readJsxSyntax(parseWithGrammar("tsx", SOURCE), new Map([["./reviews", "src/reviews.ts"], ["./Editor", "src/Editor.tsx"]]))

const reviewPageFile = (diffLines: readonly LineRange[] = []): ASTGraphFile =>
  new ASTGraphFile({
    filePath: "src/ReviewPage.tsx",
    diffLines,
    syntax: SYNTAX,
  })

describe("the syntax of a file read by readJsxSyntax", () => {
  it("keeps what it is told about the file", () => {
    const file = reviewPageFile()

    expect(file.filePath).toBe("src/ReviewPage.tsx")
  })

  it("lists the root encapsulations of the file with what is nested in them", () => {
    expect(outlineOf(SYNTAX.rootEncapsulations)).toStrictEqual(["function ReviewPage 4-11", "  function handleSave 5-5"])
  })

  it("lists every variable the file declares", () => {
    expect(SYNTAX.fileVariables.map(describeVariable)).toStrictEqual([
      "ReviewPage: inline-declaration function value",
      "reviewId: argument primitive value",
      "handleSave: inline-declaration function value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = SYNTAX.importVariables.map(({ name, importedName, importedFilePath }) => ({ name, importedName, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "saveReview", importedName: "saveReview", importedFilePath: "src/reviews.ts" },
      { name: "Editor", importedName: "Editor", importedFilePath: "src/Editor.tsx" },
    ])
  })

  it("traces a component to where it is rendered and a handler to where it is handed over", () => {
    expect(usesOf(SYNTAX, SOURCE, "Editor")).toStrictEqual(["<«Editor» onSave={handleSave} />"])
    expect(usesOf(SYNTAX, SOURCE, "handleSave")).toStrictEqual(["<Editor onSave={«handleSave»} />"])
    expect(usesOf(SYNTAX, SOURCE, "reviewId")).toStrictEqual(["const handleSave = () => saveReview(«reviewId»)"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = reviewPageFile()
    const [rendered] = file.traceUsage(declarationOf(SYNTAX, "Editor"))
    const [called] = file.traceUsage(declarationOf(SYNTAX, "saveReview"))

    expect([rendered.encapsulation?.name, rendered.rootEncapsulation?.name]).toStrictEqual(["ReviewPage", "ReviewPage"])
    expect([called.encapsulation?.name, called.rootEncapsulation?.name]).toStrictEqual(["handleSave", "ReviewPage"])
  })

  it("places changed lines in the component and the nearest encapsulation", () => {
    const locations = reviewPageFile([
      [5, 5],
      [8, 8],
    ]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "5-5 ReviewPage > handleSave",
      "8-8 ReviewPage > ReviewPage",
    ])
  })

  it("splits the diff of a whole file into one location per root encapsulation", () => {
    const locations = reviewPageFile([[1, 11]]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "4-11 ReviewPage > ReviewPage",
    ])
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    expect(isUsingImport(SYNTAX, { filePath: "src/Editor.tsx", name: "Editor" })).toBe(true)
    expect(isUsingImport(SYNTAX, { filePath: "src/reviews.ts", name: "saveReview" })).toBe(true)
    expect(isUsingImport(SYNTAX, { filePath: "src/reviews.ts", name: "loadReview" })).toBe(false)
  })

  it("reads a plain JavaScript file", () => {
    const source = sourceOf("const pricing = require(\"./pricing\")", "module.exports = function checkout(cart) {", "  return pricing.priceOf(cart)", "}")

    expect(JSX_READING.usesIn(source, "pricing")).toStrictEqual(["return «pricing».priceOf(cart)"])
    expect(JSX_READING.isUsing(source, { filePath: "src/pricing.js", name: "priceOf" }, { "./pricing": "src/pricing.js" })).toBe(true)
  })
})
