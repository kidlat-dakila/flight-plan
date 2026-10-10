import { ASTGraphFile, parseVue, readVueSyntax, type LineRange } from "@/ast-graph"
import { declarationOf, describeDiffLocation, describeVariable, isUsingImport, outlineOf, sourceOf, usesOf } from "@/ast-graph/languages/__tests__/script-files"

const SOURCE = sourceOf(
  "<script setup lang=\"ts\">",
  "import { ref } from \"vue\"",
  "import SaveButton from \"./SaveButton.vue\"",
  "import { saveReview } from \"./reviews\"",
  "",
  "const title = ref(\"\")",
  "const handleSave = () => {",
  "  saveReview(title.value)",
  "}",
  "</script>",
  "",
  "<template>",
  "  <main>",
  "    <h1>{{ title }}</h1>",
  "    <SaveButton :on-save=\"handleSave\" @click=\"handleSave()\" />",
  "  </main>",
  "</template>",
)

const SYNTAX = readVueSyntax(parseVue(SOURCE), new Map([["./SaveButton.vue", "src/SaveButton.vue"], ["./reviews", "src/reviews.ts"]]))

const reviewPageFile = (diffLines: readonly LineRange[] = []): ASTGraphFile =>
  new ASTGraphFile({
    filePath: "src/ReviewPage.vue",
    diffLines,
    syntax: SYNTAX,
  })

describe("the syntax of a file read by readVueSyntax", () => {
  it("keeps what it is told about the file", () => {
    const file = reviewPageFile()

    expect(file.filePath).toBe("src/ReviewPage.vue")
  })

  it("lists the setup script and the template as one component", () => {
    expect(outlineOf(SYNTAX.rootEncapsulations)).toStrictEqual([
      "function default 1-17",
      "  function handleSave 7-9",
    ])
  })

  it("lists every variable the file declares", () => {
    expect(SYNTAX.fileVariables.map(describeVariable)).toStrictEqual([
      "title: inline-declaration primitive value",
      "handleSave: inline-declaration function value",
      "default: anonymous primitive value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = SYNTAX.importVariables.map(({ name, importedName, importedFilePath }) => ({ name, importedName, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "ref", importedName: "ref", importedFilePath: null },
      { name: "SaveButton", importedName: "default", importedFilePath: "src/SaveButton.vue" },
      { name: "saveReview", importedName: "saveReview", importedFilePath: "src/reviews.ts" },
    ])
  })

  it("traces a name through the script and the template", () => {
    expect(usesOf(SYNTAX, SOURCE, "title")).toStrictEqual(["saveReview(«title».value)", "<h1>{{ «title» }}</h1>"])
    expect(usesOf(SYNTAX, SOURCE, "handleSave")).toStrictEqual(["<SaveButton :on-save=\"«handleSave»\" @click=\"«handleSave»()\" />"])
    expect(usesOf(SYNTAX, SOURCE, "SaveButton")).toStrictEqual(["<«SaveButton» :on-save=\"handleSave\" @click=\"handleSave()\" />"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = reviewPageFile()
    const [rendered] = file.traceUsage(declarationOf(SYNTAX, "SaveButton"))
    const [called] = file.traceUsage(declarationOf(SYNTAX, "saveReview"))

    expect([rendered.encapsulation?.name, rendered.rootEncapsulation?.range.start.line]).toStrictEqual(["default", 1])
    expect([called.encapsulation?.name, called.rootEncapsulation?.range.start.line]).toStrictEqual(["handleSave", 1])
  })

  it("places changed lines in the script or the template and the nearest encapsulation", () => {
    const locations = reviewPageFile([
      [8, 8],
      [15, 15],
    ]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "8-8 default > handleSave",
      "15-15 default > default",
    ])
  })

  it("places the diff of a whole file in the component", () => {
    const locations = reviewPageFile([[1, 17]]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual(["1-17 default > default"])
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    expect(isUsingImport(SYNTAX, { filePath: "src/SaveButton.vue", name: "default" })).toBe(true)
    expect(isUsingImport(SYNTAX, { filePath: "src/reviews.ts", name: "saveReview" })).toBe(true)
    expect(isUsingImport(SYNTAX, { filePath: "src/reviews.ts", name: "loadReview" })).toBe(false)
  })
})
