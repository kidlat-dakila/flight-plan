import { generateCodeReferences } from "@/code-references"
import { astGraphFilesOf, type Repository } from "@/journey-flow-diagram/__tests__/journey-repository"

const REPOSITORY: Repository = {
  "src/tax.ts": ["export interface Rate {", "  percent: number", "}", "", "export function taxOf(rate: Rate) {", "  return rate.percent", "}"],
  "src/index.ts": ["export { taxOf } from \"./tax\""],
  "src/price.ts": [
    "import { useQuery } from \"@tanstack/react-query\"",
    "import { taxOf } from \"./index\"",
    "import type { Rate } from \"./tax\"",
    "",
    "const base = 100",
    "",
    "export function priceOf(rate: Rate) {",
    "  const data = useQuery()",
    "  return base + taxOf(rate) + data?.children.length",
    "}",
  ],
}

const describeReferences = (path: string): string[] => {
  const [file] = generateCodeReferences(astGraphFilesOf(REPOSITORY), [path])
  return file.references.map(({ line, startColumn, endColumn, path: definedIn, lines: [startLine, endLine], isLibrary }) =>
    [REPOSITORY[path][line - 1].slice(startColumn, endColumn), `@${String(line)}`, definedIn, `${String(startLine)}-${String(endLine)}`, isLibrary ? "library" : "code"].join(" "))
}

describe("generateCodeReferences", () => {
  it("leads an imported function to its declaration in the file that declares it, through a re-export", () => {
    expect(describeReferences("src/price.ts")).toContain("taxOf @9 src/tax.ts 5-7 code")
  })

  it("leads an imported type to the statement that declares it", () => {
    expect(describeReferences("src/price.ts")).toContain("Rate @7 src/tax.ts 1-3 code")
  })

  it("leads a name from a library to its import statement, and says it is a library", () => {
    expect(describeReferences("src/price.ts")).toContain("useQuery @8 src/price.ts 1-1 library")
  })

  it("leads a constant of the file to the statement that declares it", () => {
    expect(describeReferences("src/price.ts")).toContain("base @9 src/price.ts 5-5 code")
  })

  it("looks up the object of a member and not the member", () => {
    const references = describeReferences("src/price.ts")

    expect(references).toContain("data @9 src/price.ts 8-8 code")
    expect(references.some((reference) => reference.startsWith("children") || reference.startsWith("length"))).toBe(false)
  })

  it("leaves out a reference that lies on the lines of its own definition", () => {
    expect(describeReferences("src/tax.ts").some((reference) => reference.startsWith("rate @6"))).toBe(true)
    expect(describeReferences("src/tax.ts").some((reference) => reference.startsWith("Rate @5 src/tax.ts 5-7"))).toBe(false)
  })

  it("gives nothing for a path that is not a file of the group", () => {
    expect(generateCodeReferences(astGraphFilesOf(REPOSITORY), ["src/gone.ts"])).toStrictEqual([])
  })
})
