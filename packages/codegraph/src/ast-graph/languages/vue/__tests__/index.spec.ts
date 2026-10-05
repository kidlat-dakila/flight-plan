import { VueASTGraphFile } from "@/ast-graph"
import { declarationOf, describeVariable, outlineOf, sourceOf, usesOf } from "@/ast-graph/languages/__tests__/script-files"
import { parseWithGrammar } from "@/ast-graph/parser"

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

const reviewPageFile = (): VueASTGraphFile =>
  new VueASTGraphFile({
    filePath: "src/ReviewPage.vue",
    gitSha: "head-commit",
    tree: parseWithGrammar("html", SOURCE),
    importedBy: ["src/routes.ts"],
    importsTo: ["src/SaveButton.vue", "src/reviews.ts"],
    importedFilePaths: new Map([["./SaveButton.vue", "src/SaveButton.vue"], ["./reviews", "src/reviews.ts"]]),
  })

describe("VueASTGraphFile", () => {
  it("keeps what it is told about the file", () => {
    const file = reviewPageFile()

    expect(file.filePath).toBe("src/ReviewPage.vue")
    expect(file.gitSha).toBe("head-commit")
    expect(file.importedBy).toStrictEqual(["src/routes.ts"])
    expect(file.importsTo).toStrictEqual(["src/SaveButton.vue", "src/reviews.ts"])
  })

  it("lists the setup script and the template as the component", () => {
    expect(outlineOf(reviewPageFile().listRootEncapsulations())).toStrictEqual([
      "function default 1-10",
      "  function handleSave 7-9",
      "function default 12-17",
    ])
  })

  it("lists every variable the file declares", () => {
    expect(reviewPageFile().listFileVariables().map(describeVariable)).toStrictEqual([
      "title: inline-declaration primitive value",
      "handleSave: inline-declaration function value",
      "default: anonymous primitive value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = reviewPageFile()
      .listImportVariables()
      .map(({ name, importedName, importedFilePath }) => ({ name, importedName, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "ref", importedName: "ref", importedFilePath: null },
      { name: "SaveButton", importedName: "default", importedFilePath: "src/SaveButton.vue" },
      { name: "saveReview", importedName: "saveReview", importedFilePath: "src/reviews.ts" },
    ])
  })

  it("traces a name through the script and the template", () => {
    const file = reviewPageFile()

    expect(usesOf(file, SOURCE, "title")).toStrictEqual(["saveReview(«title».value)", "<h1>{{ «title» }}</h1>"])
    expect(usesOf(file, SOURCE, "handleSave")).toStrictEqual(["<SaveButton :on-save=\"«handleSave»\" @click=\"«handleSave»()\" />"])
    expect(usesOf(file, SOURCE, "SaveButton")).toStrictEqual(["<«SaveButton» :on-save=\"handleSave\" @click=\"handleSave()\" />"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = reviewPageFile()
    const [rendered] = file.traceUsage(declarationOf(file, "SaveButton"))
    const [called] = file.traceUsage(declarationOf(file, "saveReview"))

    expect([rendered.encapsulation?.name, rendered.rootEncapsulation?.range.start.line]).toStrictEqual(["default", 12])
    expect([called.encapsulation?.name, called.rootEncapsulation?.range.start.line]).toStrictEqual(["handleSave", 1])
    expect(file.findEncapsulation([15, 15])?.name).toBe("default")
    expect(file.findEncapsulation([8, 8])?.name).toBe("handleSave")
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    const file = reviewPageFile()

    expect(file.isFileUsingSymbol({ filePath: "src/SaveButton.vue", name: "default" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "src/reviews.ts", name: "saveReview" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "src/reviews.ts", name: "loadReview" })).toBe(false)
  })
})
