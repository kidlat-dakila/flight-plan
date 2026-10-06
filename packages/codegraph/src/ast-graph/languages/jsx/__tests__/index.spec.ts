import { JSXASTGraphFile, type LineRange } from "@/ast-graph"
import { declarationOf, describeDiffLocation, describeVariable, JSX_READING, outlineOf, sourceOf, usesOf } from "@/ast-graph/languages/__tests__/script-files"
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

const reviewPageFile = (diffLines: readonly LineRange[] = []): JSXASTGraphFile =>
  new JSXASTGraphFile({
    filePath: "src/ReviewPage.tsx",
    gitSha: "head-commit",
    tree: parseWithGrammar("tsx", SOURCE),
    importedBy: ["src/routes.tsx"],
    importsTo: ["src/Editor.tsx", "src/reviews.ts"],
    diffLines,
    importedFilePaths: new Map([["./reviews", "src/reviews.ts"], ["./Editor", "src/Editor.tsx"]]),
  })

describe("JSXASTGraphFile", () => {
  it("keeps what it is told about the file", () => {
    const file = reviewPageFile()

    expect(file.filePath).toBe("src/ReviewPage.tsx")
    expect(file.gitSha).toBe("head-commit")
    expect(file.importedBy).toStrictEqual(["src/routes.tsx"])
    expect(file.importsTo).toStrictEqual(["src/Editor.tsx", "src/reviews.ts"])
  })

  it("lists the root encapsulations of the file with what is nested in them", () => {
    expect(outlineOf(reviewPageFile().listRootEncapsulations())).toStrictEqual(["function ReviewPage 4-11", "  function handleSave 5-5"])
  })

  it("lists every variable the file declares", () => {
    expect(reviewPageFile().listFileVariables().map(describeVariable)).toStrictEqual([
      "ReviewPage: inline-declaration function value",
      "reviewId: argument primitive value",
      "handleSave: inline-declaration function value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = reviewPageFile()
      .listImportVariables()
      .map(({ name, importedName, importedFilePath }) => ({ name, importedName, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "saveReview", importedName: "saveReview", importedFilePath: "src/reviews.ts" },
      { name: "Editor", importedName: "Editor", importedFilePath: "src/Editor.tsx" },
    ])
  })

  it("traces a component to where it is rendered and a handler to where it is handed over", () => {
    const file = reviewPageFile()

    expect(usesOf(file, SOURCE, "Editor")).toStrictEqual(["<«Editor» onSave={handleSave} />"])
    expect(usesOf(file, SOURCE, "handleSave")).toStrictEqual(["<Editor onSave={«handleSave»} />"])
    expect(usesOf(file, SOURCE, "reviewId")).toStrictEqual(["const handleSave = () => saveReview(«reviewId»)"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = reviewPageFile()
    const [rendered] = file.traceUsage(declarationOf(file, "Editor"))
    const [called] = file.traceUsage(declarationOf(file, "saveReview"))

    expect([rendered.encapsulation?.name, rendered.rootEncapsulation?.name]).toStrictEqual(["ReviewPage", "ReviewPage"])
    expect([called.encapsulation?.name, called.rootEncapsulation?.name]).toStrictEqual(["handleSave", "ReviewPage"])
    expect(file.findEncapsulation([8, 8])?.name).toBe("ReviewPage")
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
    const file = reviewPageFile()

    expect(file.isFileUsingSymbol({ filePath: "src/Editor.tsx", name: "Editor" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "src/reviews.ts", name: "saveReview" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "src/reviews.ts", name: "loadReview" })).toBe(false)
  })

  it("reads a plain JavaScript file", () => {
    const source = sourceOf("const pricing = require(\"./pricing\")", "module.exports = function checkout(cart) {", "  return pricing.priceOf(cart)", "}")
    const file = JSX_READING.fileOf(source, { "./pricing": "src/pricing.js" })

    expect(JSX_READING.usesIn(source, "pricing")).toStrictEqual(["return «pricing».priceOf(cart)"])
    expect(file.isFileUsingSymbol({ filePath: "src/pricing.js", name: "priceOf" })).toBe(true)
  })
})
